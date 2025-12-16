import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import ReactDOM from 'react-dom/client';
import { createCustomIcon } from '../utils/iconHelpers';
import { guardarCoordenadaCorregida } from '../services/apiService';
import MapPopup from './MapPopup';
import '../styles/iconMarkersLayer.css';

const IconMarkersLayer = ({ markers, markersForMercado = null, selectedRegion, baseCompData = [], nivel2EnNivel1Stations = [], onToggleNivel2EnNivel1 }) => {
  const map = useMap();
  const markersRef = useRef({});
  const guerraMarkersRef = useRef({});
  const competenciaMarkersRef = useRef([]);
  const polylineRef = useRef([]);

  console.log('🎯 IconMarkersLayer RENDER:', {
    markersCount: markers?.length,
    markersRefCount: Object.keys(markersRef.current).length,
    selectedRegion,
    firstMarkerComuna: markers?.[0]?.Comuna,
    uniqueComunas: [...new Set((markers || []).map(m => m.Comuna))]
  });

  const [showingAssociated, setShowingAssociated] = useState(false);
  const [activeMercadoPbl, setActiveMercadoPbl] = useState(null);
  const [modoCorreccion, setModoCorreccion] = useState(null);

  // --- Helpers de UI (Draggable & Resize) ---
  const makeDraggable = useCallback((popup) => {
    if (!map || !popup || !popup._container) return;
    try {
      const pos = map.latLngToLayerPoint(popup.getLatLng());
      L.DomUtil.setPosition(popup._wrapper.parentNode, pos);
      const draggable = new L.Draggable(popup._container, popup._wrapper);
      draggable.enable();
    } catch (error) {
      console.error('Error draggable:', error);
    }
  }, [map]);

  const crearGripEnWrapper = useCallback((popupContainer) => {
    const wrapper = popupContainer.querySelector('.leaflet-popup-content-wrapper');
    const content = popupContainer.querySelector('.leaflet-popup-content');
    if (!wrapper || !content) return;

    content?.querySelectorAll('.popup-resize-grip').forEach(n => n.remove());

    const handleWheel = (e) => {
      e.preventDefault();
      const scrollSpeed = 0.5;
      const scrollAmount = e.deltaY * scrollSpeed;
      content.scrollTop += scrollAmount;
    };

    content.addEventListener('wheel', handleWheel, { passive: false });

    let grip = wrapper.querySelector('.popup-resize-grip');
    if (!grip) {
      grip = document.createElement('div');
      grip.className = 'popup-resize-grip';
      wrapper.appendChild(grip);

      let isResizing = false;

      const doResize = (e) => {
        if (!isResizing) return;

        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);

        const gripRect = grip.getBoundingClientRect();
        const gripCenterX = gripRect.left + gripRect.width / 2;
        const gripCenterY = gripRect.top + gripRect.height / 2;

        const deltaX = clientX - gripCenterX;
        const deltaY = clientY - gripCenterY;

        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
          const currentRect = content.getBoundingClientRect();
          const newWidth = Math.max(240, currentRect.width + deltaX);
          const newHeight = Math.max(180, currentRect.height + deltaY);

          content.style.width = newWidth + 'px';
          content.style.height = newHeight + 'px';
        }

        e.preventDefault();
      };

      const stopResize = () => {
        if (!isResizing) return;
        isResizing = false;
        document.body.classList.remove('is-resizing-popup');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';

        // Remove listeners when resize stops
        document.removeEventListener('mousemove', doResize);
        document.removeEventListener('mouseup', stopResize);
        document.removeEventListener('touchmove', doResize);
        document.removeEventListener('touchend', stopResize);
      };

      const startResize = (e) => {
        isResizing = true;
        document.body.classList.add('is-resizing-popup');
        document.body.style.cursor = 'nwse-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
        e.stopPropagation();

        // Add listeners only when resize starts
        document.addEventListener('mousemove', doResize);
        document.addEventListener('mouseup', stopResize);
        document.addEventListener('touchmove', doResize, { passive: false });
        document.addEventListener('touchend', stopResize);
      };

      // Only add mousedown/touchstart listeners to the grip
      grip.addEventListener('mousedown', startResize);
      grip.addEventListener('touchstart', startResize, { passive: false });

      const cleanup = () => {
        content.removeEventListener('wheel', handleWheel);
        grip.removeEventListener('mousedown', startResize);
        grip.removeEventListener('touchstart', startResize);
        // Clean up any active resize listeners
        document.removeEventListener('mousemove', doResize);
        document.removeEventListener('mouseup', stopResize);
        document.removeEventListener('touchmove', doResize);
        document.removeEventListener('touchend', stopResize);
        document.body.classList.remove('is-resizing-popup');
      };

      grip._cleanup = cleanup;
    }
  }, []);

  // --- Helpers de limpieza ---
  const clearCompetenciaMarkers = useCallback(() => {
    competenciaMarkersRef.current.forEach(marker => {
      try { if (map && map.hasLayer(marker)) map.removeLayer(marker); } catch (e) { }
    });
    competenciaMarkersRef.current = [];
  }, [map]);

  const clearPolylines = useCallback(() => {
    polylineRef.current.forEach(line => {
      try { if (map && map.hasLayer(line)) map.removeLayer(line); } catch (e) { }
    });
    polylineRef.current = [];
  }, [map]);

  const clearGuerraMarkers = useCallback(() => {
    Object.values(guerraMarkersRef.current).forEach(marker => {
      try { if (map && map.hasLayer(marker)) map.removeLayer(marker); } catch (e) { }
    });
    guerraMarkersRef.current = {};
  }, [map]);

  // --- Handlers ---
  const handleActivateCoords = useCallback((marker) => {
    if (modoCorreccion && (modoCorreccion.id === marker.id || modoCorreccion.pbl === marker.pbl)) {
      // Si ya está activo para este marcador, lo desactivamos (cancelar)
      setModoCorreccion(null);
      if (map) map.getContainer().style.cursor = '';
      return;
    }

    if (map) map.getContainer().style.cursor = 'crosshair';
    setModoCorreccion({
      pbl: marker.pbl,
      id: marker.id,
      eds: marker.eds,
      marca: marker.Marca,
      lat: null,
      lng: null
    });
  }, [map, modoCorreccion]);

  const handleSaveCoords = useCallback(async (marker) => {
    if (!modoCorreccion || !modoCorreccion.lat || !modoCorreccion.lng) return;

    try {
      const coordenada = {
        id: marker.id || marker.pbl,
        pbl: marker.pbl || marker.id,
        eds: marker.eds || '',
        marca: marker.Marca || '',
        comuna: marker.Comuna || '',
        lat_corregida: modoCorreccion.lat,
        lon_corregida: modoCorreccion.lng
      };
      await guardarCoordenadaCorregida(coordenada);

      // Actualizar marcador localmente
      marker.lat = modoCorreccion.lat;
      marker.lng = modoCorreccion.lng;

      // Resetear modo corrección
      setModoCorreccion(null);
      if (map) map.getContainer().style.cursor = '';

      // Actualizar marcador en el mapa
      const leafletMarker = markersRef.current[marker.id];
      if (leafletMarker) {
        const newLatLng = new L.LatLng(modoCorreccion.lat, modoCorreccion.lng);
        leafletMarker.setLatLng(newLatLng);
      }

    } catch (error) {
      console.error("Error guardando coordenadas:", error);
    }
  }, [modoCorreccion, map, clearGuerraMarkers]);

  // --- Refs para romper ciclo de dependencias ---
  const showAssociatedIdsRef = useRef(null);
  const handleActivateCoordsRef = useRef(handleActivateCoords);
  const handleSaveCoordsRef = useRef(handleSaveCoords);
  const modoCorreccionRef = useRef(modoCorreccion);
  const nivel2EnNivel1StationsRef = useRef(nivel2EnNivel1Stations);
  const onToggleNivel2EnNivel1Ref = useRef(onToggleNivel2EnNivel1);

  useEffect(() => {
    handleActivateCoordsRef.current = handleActivateCoords;
    handleSaveCoordsRef.current = handleSaveCoords;
    modoCorreccionRef.current = modoCorreccion;
    nivel2EnNivel1StationsRef.current = nivel2EnNivel1Stations;
    onToggleNivel2EnNivel1Ref.current = onToggleNivel2EnNivel1;
  });

  // Helper para Guerra Marker
  const addGuerraMarker = useCallback((marker) => {
    if (marker.Guerra_Precio === 'Si') {
      const guerraIcon = L.icon({
        iconUrl: `${process.env.PUBLIC_URL}/iconos/calavera.jpg`,
        iconSize: [15, 15],
        iconAnchor: [7.5, 7.5],
        className: 'icono-guerra'
      });
      const guerraMarker = L.marker([marker.lat, marker.lng], {
        icon: guerraIcon,
        interactive: false,
        isAppMarker: true // Tag for cleanup
      });
      map.addLayer(guerraMarker);
      guerraMarkersRef.current[marker.id] = guerraMarker;
    }
  }, [map]);

  // --- Crear Marcador con Popup React ---
  const createMarkerWithPopup = useCallback((marker, allMarkers, variant = 'primary') => {
    const lat = parseFloat(marker.lat);
    const lng = parseFloat(marker.lng);
    if (isNaN(lat) || isNaN(lng)) return null;

    const iconUrl = createCustomIcon(marker.Marca);
    const leafletMarker = L.marker([lat, lng], {
      icon: iconUrl,
      isAppMarker: true // Tag for cleanup
    });

    // Popup vacío inicial
    const popup = L.popup({
      autoClose: false,
      closeOnClick: false,
      keepInView: true,
      autoPan: false,
      maxWidth: 450,
      className: 'custom-popup'
    }).setContent('<div id="popup-root-' + marker.id + '"></div>');

    leafletMarker.bindPopup(popup);

    leafletMarker.on('popupopen', (e) => {
      makeDraggable(popup);
      const container = e.popup._contentNode;
      const wrapperContainer = e.popup._container;
      if (wrapperContainer) {
        crearGripEnWrapper(wrapperContainer);
      }

      setTimeout(() => {
        const rootDiv = document.getElementById('popup-root-' + marker.id);
        if (rootDiv && !rootDiv._reactRoot) {
          const root = ReactDOM.createRoot(rootDiv);
          rootDiv._reactRoot = root;
          root.render(
            <MapPopup
              marker={marker}
              allMarkers={allMarkers}
              onShowAssociated={(...args) => showAssociatedIdsRef.current && showAssociatedIdsRef.current(...args)}
              onActivateCoords={(...args) => handleActivateCoordsRef.current && handleActivateCoordsRef.current(...args)}
              onSaveCoords={(...args) => handleSaveCoordsRef.current && handleSaveCoordsRef.current(...args)}
              modoCorreccion={modoCorreccionRef.current}
              variant={variant}
              nivel2EnNivel1Stations={nivel2EnNivel1StationsRef.current}
              onToggleNivel2EnNivel1={(...args) => onToggleNivel2EnNivel1Ref.current && onToggleNivel2EnNivel1Ref.current(...args)}
            />
          );
        }
      }, 0);
    });

    leafletMarker.on('popupclose', (e) => {
      const container = e.popup?._container;
      if (container) {
        const wrapper = container.querySelector('.leaflet-popup-content-wrapper');
        const grip = wrapper?.querySelector('.popup-resize-grip');
        if (grip && grip._cleanup) {
          grip._cleanup();
        }
      }

      const rootDiv = document.getElementById('popup-root-' + marker.id);
      if (rootDiv && rootDiv._reactRoot) {
        setTimeout(() => {
          if (rootDiv._reactRoot) {
            rootDiv._reactRoot.unmount();
            rootDiv._reactRoot = null;
          }
        }, 0);
      }
    });

    return leafletMarker;
  }, [makeDraggable, crearGripEnWrapper]);

  // --- Lógica de Mercado (Show Associated) ---
  const showAssociatedIds = useCallback((pbl, lat, lng, originalMarkerId) => {
    const searchArray = markersForMercado && markersForMercado.length > 0 ? markersForMercado : markers;

    console.log('🔍 MERCADO BUTTON CLICKED:', {
      pbl,
      searchArrayLength: searchArray.length,
      markersForMercadoLength: markersForMercado?.length,
      markersLength: markers.length,
      baseCompDataLength: baseCompData.length
    });

    // Toggle ON (o cambio de PBL)
    // Definir associatedData aquí
    const associatedData = baseCompData.filter(item => String(item.pbl).trim() === String(pbl).trim());

    console.log('📊 ASSOCIATED DATA:', {
      pbl,
      associatedDataLength: associatedData.length,
      associatedIds: associatedData.map(item => item.id),
      sampleAssociatedData: associatedData.slice(0, 3)
    });

    if (showingAssociated && activeMercadoPbl === pbl) {
      // Toggle OFF
      clearCompetenciaMarkers();
      clearPolylines();
      setShowingAssociated(false);
      setActiveMercadoPbl(null);

      // Restaurar marcadores originales
      Object.values(markersRef.current).forEach(marker => {
        try { if (map && map.hasLayer(marker)) map.removeLayer(marker); } catch (e) { }
      });
      markersRef.current = {};

      // Re-crear todos
      markers.forEach(marker => {
        const leafletMarker = createMarkerWithPopup(marker, markersForMercado || markers, 'primary');
        if (leafletMarker) {
          map.addLayer(leafletMarker);
          markersRef.current[marker.id] = leafletMarker;
          addGuerraMarker(marker);
        }
      });
      return;
    }

    // Si no hay datos asociados, no hacemos nada
    if (associatedData.length === 0) {
      console.warn('⚠️ NO ASSOCIATED DATA FOUND for PBL:', pbl);
      return;
    }

    // Toggle ON

    // 1. Limpiar TODOS los marcadores actuales del mapa
    Object.values(markersRef.current).forEach(marker => {
      try { if (map && map.hasLayer(marker)) map.removeLayer(marker); } catch (e) { }
    });
    markersRef.current = {}; // Reiniciar referencia de marcadores

    // Limpiar otros elementos
    clearCompetenciaMarkers();
    clearPolylines();
    Object.values(guerraMarkersRef.current).forEach(marker => {
      try { if (map && map.hasLayer(marker)) map.removeLayer(marker); } catch (e) { }
    });
    guerraMarkersRef.current = {};

    const ids = associatedData.map(item => item.id);

    // Get unique IDs from associatedData
    const uniqueIds = [...new Set(ids)];

    // Encontrar estación principal y competencia
    const mainStation = searchArray.find(m => String(m.pbl).trim() === String(pbl).trim());
    const associatedMarkers = searchArray.filter(item => ids.includes(item.id));

    console.log('🎯 MERCADO MODE ACTIVATED:', {
      mainStation: mainStation ? mainStation.id : 'Not Found',
      competitorsFound: associatedMarkers.length,
      uniqueCompetitorsIds: uniqueIds
    });

    // Lista final de marcadores a mostrar (Principal + Competencia)
    const markersToShow = [];
    const seenIds = new Set();

    // Agregar estación principal primero (si existe)
    if (mainStation) {
      markersToShow.push({ ...mainStation, isMain: true });
      seenIds.add(mainStation.id);
    }

    // Agregar competencia
    associatedMarkers.forEach(marker => {
      if (!seenIds.has(marker.id)) {
        seenIds.add(marker.id);
        markersToShow.push({ ...marker, isMain: false });
      }
    });

    // Renderizar los marcadores filtrados
    markersToShow.forEach(marker => {
      // Usar 'primary' para la principal, 'secondary' para competencia
      const variant = marker.isMain ? 'primary' : 'secondary';
      // Usar markersForMercado o baseCompData como fuente de datos para el popup
      const dataSource = markersForMercado || baseCompData;

      const leafletMarker = createMarkerWithPopup(marker, dataSource, variant);

      if (leafletMarker) {
        map.addLayer(leafletMarker);
        // Guardar en markersRef para que funcionen como marcadores normales (popup, drag, etc)
        markersRef.current[marker.id] = leafletMarker;

        // Agregar marcador de guerra si corresponde
        addGuerraMarker(marker);
      }
    });

    // Polylines (Líneas de conexión)
    const mainMarkersData = associatedData.filter(m => m.Marcador_Principal === 'Si');
    mainMarkersData.forEach(mainMarker => {
      const markerWithCoords = searchArray.find(m => m.id === mainMarker.id);
      if (!markerWithCoords) return;
      const mainLat = parseFloat(markerWithCoords.lat);
      const mainLng = parseFloat(markerWithCoords.lng);
      if (isNaN(mainLat) || isNaN(mainLng)) return;

      const polyline = L.polyline(
        [[parseFloat(lat), parseFloat(lng)], [mainLat, mainLng]],
        { color: '#FF6B6B', weight: 3, opacity: 0.8, dashArray: '5, 5' }
      ).addTo(map);
      polylineRef.current.push(polyline);
    });

    setShowingAssociated(true);
    setActiveMercadoPbl(pbl);

  }, [baseCompData, markers, markersForMercado, map, showingAssociated, activeMercadoPbl, clearCompetenciaMarkers, clearPolylines, clearGuerraMarkers, createMarkerWithPopup, addGuerraMarker]);

  useEffect(() => {
    showAssociatedIdsRef.current = showAssociatedIds;
  }, [showAssociatedIds]);

  // --- Efecto Principal de Renderizado ---
  useEffect(() => {
    if (!map || !markers || markers.length === 0) return;

    // Robust Cleanup: Remove ALL markers tagged as isAppMarker
    // This ensures we don't leave zombie markers if refs are lost
    map.eachLayer(layer => {
      if (layer.options && layer.options.isAppMarker) {
        map.removeLayer(layer);
      }
    });

    // Reset refs
    markersRef.current = {};
    guerraMarkersRef.current = {};
    competenciaMarkersRef.current = [];
    polylineRef.current = []; // Polylines might need tagging too if they persist, but let's clear them via ref for now or tag them

    clearCompetenciaMarkers();
    clearPolylines();
    setShowingAssociated(false);
    setActiveMercadoPbl(null);

    markers.forEach(marker => {
      const leafletMarker = createMarkerWithPopup(
        marker,
        markersForMercado || markers,
        'primary'
      );
      if (leafletMarker) {
        map.addLayer(leafletMarker);
        markersRef.current[marker.id] = leafletMarker;
        addGuerraMarker(marker);
      }
    });

    if (markers.length === 1 && markersRef.current[markers[0].id]) {
      markersRef.current[markers[0].id].openPopup();
    }

  }, [map, markers, markersForMercado, selectedRegion, clearCompetenciaMarkers, clearPolylines, clearGuerraMarkers, createMarkerWithPopup, addGuerraMarker]);


  // --- Efecto para Click en Mapa (Corrección Coordenadas) ---
  useEffect(() => {
    if (!map || !modoCorreccion) return;

    const handleMapClick = (e) => {
      const { lat, lng } = e.latlng;
      setModoCorreccion(prev => ({ ...prev, lat, lng }));
    };

    map.on('click', handleMapClick);
    return () => { map.off('click', handleMapClick); };
  }, [map, modoCorreccion]);

  // --- Efecto para Actualizar Popups cuando cambia modoCorreccion ---
  useEffect(() => {
    if (!map) return;

    // Iterar sobre los popups abiertos y re-renderizarlos con el nuevo estado
    map.eachLayer(layer => {
      if (layer.getPopup && layer.getPopup() && layer.getPopup().isOpen()) {
        const markerId = Object.keys(markersRef.current).find(key => markersRef.current[key] === layer);
        if (markerId) {
          const marker = markers.find(m => m.id === markerId) || (markersForMercado || []).find(m => m.id === markerId);
          if (marker) {
            const rootDiv = document.getElementById('popup-root-' + marker.id);
            if (rootDiv && rootDiv._reactRoot) {
              rootDiv._reactRoot.render(
                <MapPopup
                  marker={marker}
                  allMarkers={markersForMercado || markers}
                  onShowAssociated={(...args) => showAssociatedIdsRef.current && showAssociatedIdsRef.current(...args)}
                  onActivateCoords={(...args) => handleActivateCoordsRef.current && handleActivateCoordsRef.current(...args)}
                  onSaveCoords={(...args) => handleSaveCoordsRef.current && handleSaveCoordsRef.current(...args)}
                  modoCorreccion={modoCorreccion} // Usamos el valor actual del estado
                  variant={markersForMercado && markersForMercado.includes(marker) ? 'secondary' : 'primary'}
                  nivel2EnNivel1Stations={nivel2EnNivel1Stations} // En el efecto usamos el valor directo porque el efecto depende de él
                  onToggleNivel2EnNivel1={onToggleNivel2EnNivel1}
                />
              );
            }
          }
        }
      }
    });
  }, [modoCorreccion, map, markers, markersForMercado, nivel2EnNivel1Stations, onToggleNivel2EnNivel1]);

  // Re-render open popups when markers data updates (auto-refresh)
  useEffect(() => {
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.Marker && layer.getPopup && layer.getPopup()) {
        const popup = layer.getPopup();
        if (popup.isOpen()) {
          const markerData = layer.options.markerData;
          if (markerData && markerData.pbl) {
            // Find updated marker data
            const updatedMarker = markers.find(m => m.pbl === markerData.pbl);
            if (updatedMarker) {
              const rootDiv = popup.getElement()?.querySelector('.popup-root');
              if (rootDiv && rootDiv._reactRoot) {
                // Re-render with updated data
                rootDiv._reactRoot.render(
                  <MapPopup
                    marker={updatedMarker}
                    allMarkers={markersForMercado || markers}
                    onShowAssociated={(...args) => showAssociatedIdsRef.current && showAssociatedIdsRef.current(...args)}
                    onActivateCoords={(...args) => handleActivateCoordsRef.current && handleActivateCoordsRef.current(...args)}
                    onSaveCoords={(...args) => handleSaveCoordsRef.current && handleSaveCoordsRef.current(...args)}
                    modoCorreccion={modoCorreccion}
                    variant={markersForMercado && markersForMercado.includes(updatedMarker) ? 'secondary' : 'primary'}
                    nivel2EnNivel1Stations={nivel2EnNivel1Stations} // En el efecto usamos el valor directo
                    onToggleNivel2EnNivel1={onToggleNivel2EnNivel1}
                  />
                );
              }
            }
          }
        }
      }
    });
  }, [markers, map, markersForMercado, modoCorreccion, nivel2EnNivel1Stations, onToggleNivel2EnNivel1]);


  return null;
};

export default IconMarkersLayer;
