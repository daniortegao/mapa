import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import ReactDOM from 'react-dom/client';
import { createCustomIcon } from '../utils/iconHelpers';
import { guardarCoordenadaCorregida } from '../services/apiService';
import MapPopup from './MapPopup';
import '../styles/iconMarkersLayer.css';

const IconMarkersLayer = ({ markers, markersForMercado = null, selectedRegion, baseCompData = [] }) => {
  const map = useMap();
  const markersRef = useRef({});
  const guerraMarkersRef = useRef({});
  const competenciaMarkersRef = useRef([]);
  const polylineRef = useRef([]);

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

      const startResize = (e) => {
        isResizing = true;
        document.body.classList.add('is-resizing-popup');
        document.body.style.cursor = 'nwse-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
        e.stopPropagation();
      };

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
      };

      grip.addEventListener('mousedown', startResize);
      document.addEventListener('mousemove', doResize);
      document.addEventListener('mouseup', stopResize);

      grip.addEventListener('touchstart', startResize, { passive: false });
      document.addEventListener('touchmove', doResize, { passive: false });
      document.addEventListener('touchend', stopResize);

      const cleanup = () => {
        content.removeEventListener('wheel', handleWheel);
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

      // Re-renderizar marcadores (esto forzará un update del efecto principal)
      // Nota: En una app real, deberíamos actualizar el estado 'markers' en el padre
      // pero aquí simulamos el refresco limpiando y dejando que el efecto corra.
      // Para simplificar, forzamos un re-render limpiando refs (el efecto lo notará si markers cambia, 
      // pero como mutamos el objeto, necesitamos forzar update o confiar en que el padre refresque).
      // Aquí asumimos que el padre refrescará o que el efecto de abajo se encargará si cambiamos algo.
      // Como mutamos 'marker', React no detecta cambio de prop 'markers' si es el mismo array.

      // ACTUALIZACIÓN OPTIMIZADA: No borrar todo. Solo mover el marcador.
      const leafletMarker = markersRef.current[marker.id];
      if (leafletMarker) {
        const newLatLng = new L.LatLng(modoCorreccion.lat, modoCorreccion.lng);
        leafletMarker.setLatLng(newLatLng);

        // Si el popup está abierto, Leaflet lo mueve con el marcador automáticamente.
        // Pero necesitamos actualizar el contenido del popup para que refleje que ya no estamos en modo corrección
        // y muestre las nuevas coordenadas fijas.
        // Esto se hace abajo con el re-render manual de popups.
      }

      // No borramos markersRef.current ni clearGuerraMarkers() para evitar parpadeo/cierre.
      // Solo limpiamos si fuera necesario por lógica de negocio estricta, pero el usuario quiere que se mantenga.

      // Disparamos un evento custom o callback si fuera necesario, 
      // por ahora confiamos en que el usuario recargue o que el efecto se dispare si cambiamos algo de estado.
      // Un truco es setear un estado dummy para forzar re-render, pero mejor dejemos que el flujo siga.

    } catch (error) {
      console.error("Error guardando coordenadas:", error);
    }
  }, [modoCorreccion, map, clearGuerraMarkers]);

  // --- Refs para romper ciclo de dependencias ---
  const showAssociatedIdsRef = useRef(null);
  const handleActivateCoordsRef = useRef(handleActivateCoords);
  const handleSaveCoordsRef = useRef(handleSaveCoords);
  const modoCorreccionRef = useRef(modoCorreccion);

  useEffect(() => {
    handleActivateCoordsRef.current = handleActivateCoords;
    handleSaveCoordsRef.current = handleSaveCoords;
    modoCorreccionRef.current = modoCorreccion;
  });


  // --- Lógica de Mercado (Show Associated) ---
  const showAssociatedIds = useCallback((pbl, lat, lng, originalMarkerId) => {
    const searchArray = markersForMercado && markersForMercado.length > 0 ? markersForMercado : markers;

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

    // Toggle ON (o cambio de PBL)
    clearCompetenciaMarkers();
    clearPolylines();

    const associatedData = baseCompData.filter(item => String(item.pbl).trim() === String(pbl).trim());
    if (associatedData.length === 0) return;

    const ids = associatedData.map(item => item.id);

    // Limpiar actuales
    Object.values(markersRef.current).forEach(marker => {
      try { if (map && map.hasLayer(marker)) map.removeLayer(marker); } catch (e) { }
    });
    markersRef.current = {};
    clearGuerraMarkers();

    // Mostrar original
    const originalMarker = markers.find(m => m.id === originalMarkerId);
    if (originalMarker) {
      const leafletMarker = createMarkerWithPopup(originalMarker, markersForMercado || markers, 'primary');
      if (leafletMarker) {
        map.addLayer(leafletMarker);
        markersRef.current[originalMarker.id] = leafletMarker;
        addGuerraMarker(originalMarker);
      }
    }

    // Mostrar competencia
    const associatedMarkers = searchArray.filter(item => ids.includes(item.id));
    const uniqueAssociatedMarkers = [];
    const seenIds = new Set();
    associatedMarkers.forEach(marker => {
      if (!seenIds.has(marker.id)) {
        seenIds.add(marker.id);
        uniqueAssociatedMarkers.push(marker);
      }
    });

    uniqueAssociatedMarkers.forEach(marker => {
      const leafletMarker = createMarkerWithPopup(marker, markersForMercado || baseCompData, 'secondary');
      if (leafletMarker) {
        map.addLayer(leafletMarker);
        competenciaMarkersRef.current.push(leafletMarker);
        if (marker.Guerra_Precio === 'Si') {
          // Guerra marker logic for secondary
          const guerraIcon = L.icon({
            iconUrl: `${process.env.PUBLIC_URL}/iconos/calavera.jpg`,
            iconSize: [15, 15],
            iconAnchor: [7.5, 7.5],
            className: 'icono-guerra'
          });
          const guerraMarker = L.marker([marker.lat, marker.lng], { icon: guerraIcon, interactive: false });
          map.addLayer(guerraMarker);
          // No lo guardamos en ref global para no borrarlo accidentalmente con clearGuerraMarkers si solo queremos borrar los principales, 
          // aunque aquí borramos todo al cambiar de vista.
          // Para simplificar, los agregamos a competenciaMarkersRef si queremos limpiarlos con eso, o los dejamos sueltos (pero hay que limpiarlos).
          // Mejor los metemos en competenciaMarkersRef también (aunque sean markers distintos).
          competenciaMarkersRef.current.push(guerraMarker);
        }
      }
    });

    // Polylines
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

  }, [baseCompData, markers, markersForMercado, map, showingAssociated, activeMercadoPbl, clearCompetenciaMarkers, clearPolylines, clearGuerraMarkers]);

  useEffect(() => {
    showAssociatedIdsRef.current = showAssociatedIds;
  }, [showAssociatedIds]);

  // Helper para Guerra Marker
  const addGuerraMarker = (marker) => {
    if (marker.Guerra_Precio === 'Si') {
      const guerraIcon = L.icon({
        iconUrl: `${process.env.PUBLIC_URL}/iconos/calavera.jpg`,
        iconSize: [15, 15],
        iconAnchor: [7.5, 7.5],
        className: 'icono-guerra'
      });
      const guerraMarker = L.marker([marker.lat, marker.lng], { icon: guerraIcon, interactive: false });
      map.addLayer(guerraMarker);
      guerraMarkersRef.current[marker.id] = guerraMarker;
    }
  };

  // --- Crear Marcador con Popup React ---
  const createMarkerWithPopup = useCallback((marker, allMarkers, variant = 'primary') => {
    const lat = parseFloat(marker.lat);
    const lng = parseFloat(marker.lng);
    if (isNaN(lat) || isNaN(lng)) return null;

    const iconUrl = createCustomIcon(marker.Marca);
    const leafletMarker = L.marker([lat, lng], { icon: iconUrl });

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


  // --- Efecto Principal de Renderizado ---
  useEffect(() => {
    if (!map || !markers || markers.length === 0) return;

    // Si estamos mostrando asociados, no refrescamos todo (a menos que cambien los filtros drásticamente, 
    // pero aquí asumimos que si 'markers' cambia, reseteamos vista).
    // Para simplificar: si markers cambia, reseteamos todo.

    clearCompetenciaMarkers();
    clearPolylines();
    setShowingAssociated(false);
    setActiveMercadoPbl(null);

    Object.values(markersRef.current).forEach(marker => {
      try { if (map && map.hasLayer(marker)) map.removeLayer(marker); } catch (e) { }
    });
    markersRef.current = {};
    clearGuerraMarkers();

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

  }, [map, markers, markersForMercado, selectedRegion, clearCompetenciaMarkers, clearPolylines, clearGuerraMarkers, createMarkerWithPopup]);


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
                />
              );
            }
          }
        }
      }
    });
  }, [modoCorreccion, map, markers, markersForMercado]);

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
                  />
                );
              }
            }
          }
        }
      }
    });
  }, [markers, map, markersForMercado, modoCorreccion]);


  return null;
};

export default IconMarkersLayer;
