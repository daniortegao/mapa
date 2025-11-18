import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import ReactDOM from 'react-dom/client';
import { createCustomIcon } from '../utils/iconHelpers';
import { guardarCoordenadaCorregida } from '../services/apiService';
import TrendChart from '../components/TrendChart';
import '../styles/iconMarkersLayer.css';
import '../styles/clusterMarkers.css';

const ClusteredIconMarkersLayer = ({ 
  markers, 
  markersForMercado = null, 
  selectedRegion, 
  baseCompData = [] 
}) => {
  const map = useMap();
  const clusterGroupRef = useRef(null);
  const markersRef = useRef({});
  const guerraMarkersRef = useRef({});
  const competenciaMarkersRef = useRef([]);
  const polylineRef = useRef([]);

  const [showingAssociated, setShowingAssociated] = useState(false);
  const [activeMercadoPbl, setActiveMercadoPbl] = useState(null);
  const [modoCorreccion, setModoCorreccion] = useState(null);

  // Funciones de utilidad
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

  const clearCompetenciaMarkers = useCallback(() => {
    competenciaMarkersRef.current.forEach(marker => {
      try {
        if (map && map.hasLayer(marker)) {
          map.removeLayer(marker);
        }
      } catch (e) {
        console.error('Error limpiando competencia:', e);
      }
    });
    competenciaMarkersRef.current = [];
  }, [map]);

  const clearPolylines = useCallback(() => {
    polylineRef.current.forEach(line => {
      try {
        if (map && map.hasLayer(line)) {
          map.removeLayer(line);
        }
      } catch (e) {
        console.error('Error limpiando polyline:', e);
      }
    });
    polylineRef.current = [];
  }, [map]);

  const clearGuerraMarkers = useCallback(() => {
    Object.values(guerraMarkersRef.current).forEach(marker => {
      try {
        if (map && map.hasLayer(marker)) {
          map.removeLayer(marker);
        }
      } catch (e) {
        console.error('Error limpiando guerra markers:', e);
      }
    });
    guerraMarkersRef.current = {};
  }, [map]);

  // Genera HTML de tabla de precios
  const generarTablaPrecios = useCallback((datos, variant = 'primary') => {
    if (!datos || datos.length === 0) {
      return '<div style="padding: 12px; text-align: center; font-size: 12px; color: #999; font-style: italic;">Sin datos disponibles</div>';
    }
    const variantClass = variant === 'primary' ? '' : 'secondary';
    let html = `<div class="popup-table-wrapper ${variantClass}">
      <table class="popup-table ${variantClass}">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>G93</th>
            <th>G95</th>
            <th>G97</th>
            <th>Diesel</th>
            <th>Kero</th>
          </tr>
        </thead>
        <tbody>`;
    datos.forEach((fila) => {
      html += `
        <tr>
          <td>${fila.fecha}</td>
          <td>${fila.g93}</td>
          <td>${fila.g95}</td>
          <td>${fila.g97}</td>
          <td>${fila.diesel}</td>
          <td>${fila.kero}</td>
        </tr>`;
    });
    html += `</tbody></table></div>`;
    return html;
  }, []);

  // Normaliza histórico del marker
  const obtenerHistoricoMarker = useCallback((markerId, dataArray) => {
    const datos = dataArray.filter(m => m.id === markerId);
    return datos
      .sort((a, b) => {
        const fechaA = a.fecha_aplicacion ? new Date(a.fecha_aplicacion) : new Date(0);
        const fechaB = b.fecha_aplicacion ? new Date(b.fecha_aplicacion) : new Date(0);
        return fechaB - fechaA;
      })
      .map(item => ({
        fecha: item.fecha_aplicacion || 'S/F',
        g93: item.precio_g93 || '-',
        g95: item.precio_g95 || '-',
        g97: item.precio_g97 || '-',
        diesel: item.precio_diesel || '-',
        kero: item.precio_kero || '-'
      }));
  }, []);

  // Popup HTML con pestañas
  const generarPopupContent = useCallback((marker, datosTabla, tablaPreciosHtml, variant = 'primary') => {
    const logoUrl = marker.logo
      ? (marker.logo.startsWith('http') ? marker.logo : `https://api.bencinaenlinea.cl${marker.logo}`)
      : '';
    return `
      <div class="icon-markers-popup-content">
        <div class="popup-info-header">
          ${logoUrl ? `<img src="${logoUrl}" alt="Logo ${marker.Marca}" class="popup-logo" onerror="this.style.display='none';"/>` : ''}
          <div class="popup-info-row"><span class="popup-label">PBL:</span><span class="popup-value">${marker.pbl || '-'}</span></div>
          <div class="popup-info-row"><span class="popup-label">Estación:</span><span class="popup-value">${marker.eds || '-'}</span></div>
          <div class="popup-info-row"><span class="popup-label">Jefe Zona:</span><span class="popup-value">${marker.nombre || '-'}</span></div>
          <div class="popup-info-row"><span class="popup-label">Operación:</span><span class="popup-value">${marker.operacion || 'Comisionista'}</span></div>
        </div>

        <div class="popup-tabs-container">
          <div class="popup-tabs-header">
            <button class="popup-tab-button active" data-tab="precios">Precios</button>
            <button class="popup-tab-button" data-tab="tendencias">Tendencias</button>
            <button class="popup-tab-button" data-tab="coordenadas">Coordenadas</button>
            <button class="popup-tab-button" data-tab="informacion">Información</button>
          </div>

          <div class="popup-tabs-content">
            <div class="popup-tab-pane active" data-tab="precios">${tablaPreciosHtml}</div>

            <div class="popup-tab-pane" data-tab="tendencias">
             <div id="trend-root-${marker.id}" style="width:100%;min-height:160px;padding-top:6px;"></div>
            </div>

            <div class="popup-tab-pane" data-tab="coordenadas">
              <div class="popup-info-box">
                <p><strong>Lat corregida:</strong> <span id="lat-actual-${marker.pbl || marker.id}">${marker.lat.toFixed(6)}</span></p>
                <p><strong>Lon corregida:</strong> <span id="lon-actual-${marker.pbl || marker.id}">${marker.lng.toFixed(6)}</span></p>
                <hr style="margin: 8px 0; border: none; border-top: 1px solid #dee2e6;">
                <p><strong>Región:</strong> ${marker.Region || '-'}</p>
                <p><strong>Comuna:</strong> ${marker.Comuna || '-'}</p>
              </div>
              <div style="display: flex; gap: 8px; margin-top: 10px;">
                <button id="activar-coord-${marker.pbl || marker.id}" style="flex: 1; padding: 8px; background: #17a2b8; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600;" onclick="window.activarCorreccionCoordenadas('${marker.pbl || ''}', '${marker.id || ''}', '${marker.eds}', '${marker.Marca}')">Activar Coord</button>
                <button id="guardar-coord-${marker.pbl || marker.id}" style="flex: 1; padding: 8px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600; opacity: 0.5;" onclick="window.guardarCorreccionCoordenadas('${marker.pbl || ''}', '${marker.id || ''}', '${marker.eds}', '${marker.Marca}')" disabled>Guardar</button>
              </div>
            </div>

            <div class="popup-tab-pane" data-tab="informacion">
              <div class="popup-info-box">
                <p><strong>Dirección:</strong> ${marker.direccion || '-'}</p>
                <p><strong>Surtidores PES:</strong> ${marker.Surtidores_Autoservicio || '-'}</p>
                <p><strong>Posición Surtidor:</strong> ${marker.Posicion_Surtidor || '-'}</p>
                <p><strong>Tipo Isla:</strong> ${marker.Tipo_Isla || '-'}</p>
                ${marker.Guerra_Precio === 'Si' ? `<hr style="margin: 8px 0; border: none; border-top: 1px solid #dee2e6;"><p><strong style="color: #d9534f;">⚠️ Guerra de Precio Activa</strong></p>` : ''}
              </div>
            </div>
          </div>
        </div>

        ${marker.pbl && (marker.Marca === 'Aramco' || marker.Marca === 'Petrobras')
        ? `<button class="popup-button-mercado" onclick="window.showAssociatedIds && window.showAssociatedIds(${marker.pbl}, ${marker.lat}, ${marker.lng}, '${marker.id}')">Mercado</button>`
        : ''
      }
      </div>
    `;
  }, []);

    // Crear grip en el wrapper del popup (mismo código que tenías)
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

  // Crear marcador con popup y eventos
  const createMarkerWithPopup = useCallback((marker, allMarkers, variant = 'primary') => {
    const lat = parseFloat(marker.lat);
    const lng = parseFloat(marker.lng);
    if (isNaN(lat) || isNaN(lng)) return null;

    const iconUrl = createCustomIcon(marker.Marca);
    const leafletMarker = L.marker([lat, lng], { icon: iconUrl });

    // Datos de tabla/histórico
    const datosTabla = obtenerHistoricoMarker(marker.id, allMarkers);
    const tablaPreciosHtml = generarTablaPrecios(datosTabla, variant);
    const popupContent = generarPopupContent(marker, datosTabla, tablaPreciosHtml, variant);

    const popup = L.popup({
      autoClose: false,
      closeOnClick: false,
      keepInView: true,
      autoPan: false,
      maxWidth: 450,
      className: 'custom-popup'
    }).setContent(popupContent);

    leafletMarker.bindPopup(popup);

    // Evento popupopen con listener GLOBAL
    leafletMarker.on('popupopen', (e) => {
      makeDraggable(popup);
      setTimeout(() => {
        const popupContainer = e.popup._container;
        if (!popupContainer) return;
        
        crearGripEnWrapper(popupContainer);

        // Listener GLOBAL para tabs
        const handleGlobalClick = (event) => {
          if (!popupContainer.contains(event.target)) return;
          
          const btn = event.target.closest('.popup-tab-button');
          if (!btn) return;

          event.stopPropagation();
          event.preventDefault();
          
          const tabName = btn.getAttribute('data-tab');
          if (!tabName) return;

          popupContainer.querySelectorAll('.popup-tab-button').forEach(b => b.classList.remove('active'));
          popupContainer.querySelectorAll('.popup-tab-pane').forEach(pane => pane.classList.remove('active'));
          
          btn.classList.add('active');
          const targetPane = popupContainer.querySelector(`.popup-tab-pane[data-tab="${tabName}"]`);
          if (targetPane) {
            targetPane.classList.add('active');
          }

          if (tabName === 'tendencias') {
            const el = popupContainer.querySelector(`#trend-root-${marker.id}`);
            if (el && !el.__mounted) {
              const root = ReactDOM.createRoot(el);
              root.render(React.createElement(TrendChart, {
                dataRows: datosTabla,
                maxPoints: 7,
                height: 170,
                compact: true
              }));
              el.__mounted = true;
              el.__root = root;
            }
          }
        };

        if (popupContainer.__globalClickHandler) {
          document.removeEventListener('click', popupContainer.__globalClickHandler, true);
        }

        document.addEventListener('click', handleGlobalClick, true);
        popupContainer.__globalClickHandler = handleGlobalClick;
      }, 50);
    });

    // Limpieza al cerrar popup
    leafletMarker.on('popupclose', (e) => {
      const container = e.popup?._container;
      if (!container) return;
      
      const el = container.querySelector(`#trend-root-${marker.id}`);
      if (el && el.__root) {
        el.__root.unmount();
        el.__mounted = false;
        el.__root = null;
      }
      
      if (container.__globalClickHandler) {
        document.removeEventListener('click', container.__globalClickHandler, true);
        container.__globalClickHandler = null;
      }
      
      const wrapper = container.querySelector('.leaflet-popup-content-wrapper');
      const grip = wrapper?.querySelector('.popup-resize-grip');
      if (grip && grip._cleanup) {
        grip._cleanup();
      }
    });

    leafletMarker.on('click', () => {
      leafletMarker.openPopup();
    });

    // Agregar info de guerra para el cluster
    leafletMarker.hasGuerra = marker.Guerra_Precio === 'Si';

    return leafletMarker;
  }, [makeDraggable, obtenerHistoricoMarker, generarTablaPrecios, generarPopupContent, crearGripEnWrapper]);

  // Mostrar IDs asociados (Mercado)
  const showAssociatedIds = useCallback((pbl, lat, lng, originalMarkerId) => {
    const searchArray = markersForMercado && markersForMercado.length > 0 ? markersForMercado : markers;

    if (showingAssociated && activeMercadoPbl === pbl) {
      clearCompetenciaMarkers();
      clearPolylines();
      setShowingAssociated(false);
      setActiveMercadoPbl(null);
      
      // Recargar todos los marcadores
      if (clusterGroupRef.current) {
        clusterGroupRef.current.clearLayers();
        
        markers.forEach(marker => {
          const leafletMarker = createMarkerWithPopup(marker, markers, 'primary');
          if (leafletMarker) {
            clusterGroupRef.current.addLayer(leafletMarker);
            
            // Overlay de guerra
            if (marker.Guerra_Precio === 'Si') {
              const guerraIcon = L.icon({
                iconUrl: `${process.env.PUBLIC_URL}/iconos/calavera.jpg`,
                iconSize: [15, 15],
                iconAnchor: [7.5, 7.5],
                className: 'icono-guerra'
              });
              const guerraMarker = L.marker([marker.lat, marker.lng], { icon: guerraIcon, interactive: false });
              clusterGroupRef.current.addLayer(guerraMarker);
            }
          }
        });
      }
      return;
    }

    clearCompetenciaMarkers();
    clearPolylines();

    const associatedData = baseCompData.filter(item => String(item.pbl).trim() === String(pbl).trim());
    if (associatedData.length === 0) return;

    const ids = associatedData.map(item => item.id);

    if (clusterGroupRef.current) {
      clusterGroupRef.current.clearLayers();

      // Marcador original
      const originalMarker = markers.find(m => m.id === originalMarkerId);
      if (originalMarker) {
        const leafletMarker = createMarkerWithPopup(originalMarker, markers, 'primary');
        if (leafletMarker) {
          clusterGroupRef.current.addLayer(leafletMarker);
          
          if (originalMarker.Guerra_Precio === 'Si') {
            const guerraIcon = L.icon({
              iconUrl: `${process.env.PUBLIC_URL}/iconos/calavera.jpg`,
              iconSize: [15, 15],
              iconAnchor: [7.5, 7.5],
              className: 'icono-guerra'
            });
            const guerraMarker = L.marker([originalMarker.lat, originalMarker.lng], { icon: guerraIcon, interactive: false });
            clusterGroupRef.current.addLayer(guerraMarker);
          }
        }
      }

      // Marcadores asociados
      const associatedMarkers = searchArray.filter(item => ids.includes(item.id));
      associatedMarkers.forEach(marker => {
        const leafletMarker = createMarkerWithPopup(marker, baseCompData, 'secondary');
        if (leafletMarker) {
          clusterGroupRef.current.addLayer(leafletMarker);
          
          if (marker.Guerra_Precio === 'Si') {
            const guerraIcon = L.icon({
              iconUrl: `${process.env.PUBLIC_URL}/iconos/calavera.jpg`,
              iconSize: [15, 15],
              iconAnchor: [7.5, 7.5],
              className: 'icono-guerra'
            });
            const guerraMarker = L.marker([marker.lat, marker.lng], { icon: guerraIcon, interactive: false });
            clusterGroupRef.current.addLayer(guerraMarker);
          }
          
          competenciaMarkersRef.current.push(leafletMarker);
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

        const currentLat = parseFloat(lat);
        const currentLng = parseFloat(lng);

        const polyline = L.polyline(
          [[currentLat, currentLng], [mainLat, mainLng]],
          { color: '#FF6B6B', weight: 3, opacity: 0.8, dashArray: '5, 5' }
        ).addTo(map);

        polylineRef.current.push(polyline);
      });

      setShowingAssociated(true);
      setActiveMercadoPbl(pbl);
    }
  }, [baseCompData, markers, markersForMercado, map, showingAssociated, activeMercadoPbl, clearCompetenciaMarkers, clearPolylines, createMarkerWithPopup]);

  useEffect(() => {
    window.showAssociatedIds = showAssociatedIds;
  }, [showAssociatedIds]);

  // Renderizar marcadores iniciales con clustering
// Renderizar marcadores iniciales con clustering
useEffect(() => {
  if (!map || !markers || markers.length === 0) return;

  console.log('🔄 Renderizando marcadores:', markers.length);

  clearCompetenciaMarkers();
  clearPolylines();
  setShowingAssociated(false);
  setActiveMercadoPbl(null);

  // Crear cluster group
  if (!clusterGroupRef.current) {
 clusterGroupRef.current = L.markerClusterGroup({
  chunkedLoading: true,
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false,
  zoomToBoundsOnClick: true,
  maxClusterRadius: 50,  // ← Aumentado de 60 a 80 para agrupar más
  disableClusteringAtZoom: 15, // ← Cambiado de 16 a 17 (más zoom antes de desagrupar)
  animate: true,
  animateAddingMarkers: false,
  removeOutsideVisibleBounds: true,
  spiderfyDistanceMultiplier: 2, // ← NUEVO: Más separación al expandir
  iconCreateFunction: (cluster) => {
    const count = cluster.getChildCount();
    const childMarkers = cluster.getAllChildMarkers();
    const hasGuerra = childMarkers.some(m => m.hasGuerra);
    
    let size = 'small';
    if (count > 100) size = 'large';
    else if (count > 50) size = 'medium';
    
    const className = hasGuerra 
      ? `marker-cluster marker-cluster-${size} marker-cluster-guerra`
      : `marker-cluster marker-cluster-${size}`;
    
    return L.divIcon({
      html: `<div><span>${count}</span></div>`,
      className: className,
      iconSize: L.point(40, 40)
    });
  }
});

    
    map.addLayer(clusterGroupRef.current);
    console.log('✅ Cluster group creado');
  } else {
    clusterGroupRef.current.clearLayers();
    console.log('🗑️ Cluster limpiado');
  }

  // ← DEDUPLICACIÓN: Filtrar marcadores únicos por ID
  const uniqueMarkers = [];
  const seenIds = new Set();
  
  markers.forEach(marker => {
    const uniqueKey = `${marker.id}_${marker.lat}_${marker.lng}`;
    if (!seenIds.has(uniqueKey)) {
      seenIds.add(uniqueKey);
      uniqueMarkers.push(marker);
    } else {
      console.warn('⚠️ Marcador duplicado ignorado:', marker.id, marker.eds);
    }
  });

  console.log(`📍 Marcadores únicos: ${uniqueMarkers.length} de ${markers.length}`);

  // Agregar todos los marcadores ÚNICOS al cluster
  let addedCount = 0;
  uniqueMarkers.forEach(marker => {
    const leafletMarker = createMarkerWithPopup(marker, markers, 'primary');
    if (leafletMarker) {
      clusterGroupRef.current.addLayer(leafletMarker);
      addedCount++;
      
      // Overlay de guerra - SOLO SI NO existe ya
      if (marker.Guerra_Precio === 'Si') {
        const guerraKey = `guerra_${marker.id}`;
        if (!guerraMarkersRef.current[guerraKey]) {
          const guerraIcon = L.icon({
            iconUrl: `${process.env.PUBLIC_URL}/iconos/calavera.jpg`,
            iconSize: [15, 15],
            iconAnchor: [7.5, 7.5],
            className: 'icono-guerra'
          });
          const guerraMarker = L.marker([marker.lat, marker.lng], { 
            icon: guerraIcon, 
            interactive: false 
          });
          clusterGroupRef.current.addLayer(guerraMarker);
          guerraMarkersRef.current[guerraKey] = guerraMarker;
        }
      }
    }
  });

  console.log(`✅ ${addedCount} marcadores agregados al cluster`);

}, [map, markers, selectedRegion, clearCompetenciaMarkers, clearPolylines, createMarkerWithPopup]);


  // Modo corrección de coordenadas (mismo código que tenías)
  useEffect(() => {
    window.activarCorreccionCoordenadas = (pbl, id, eds, marca) => {
      const identifier = pbl || id;
      if (map) map.getContainer().style.cursor = 'crosshair';
      setModoCorreccion({ pbl, id, eds, marca, lat: null, lng: null });

      const btnGuardar = document.getElementById(`guardar-coord-${identifier}`);
      if (btnGuardar) { btnGuardar.disabled = true; btnGuardar.style.opacity = '0.5'; }

      const btnActivar = document.getElementById(`activar-coord-${identifier}`);
      if (btnActivar) { btnActivar.textContent = 'Click en mapa...'; btnActivar.style.background = '#ffc107'; }
    };

    window.guardarCorreccionCoordenadas = async (pbl, id, eds, marca) => {
      if (!modoCorreccion || !modoCorreccion.lat || !modoCorreccion.lng) {
        alert('⚠️ Primero selecciona una ubicación');
        return;
      }

      const identifier = pbl || id;

      let marker = null;
      if (pbl) {
        marker = markers.find(m => m.pbl === pbl) || markersForMercado?.find(m => m.pbl === pbl) || baseCompData?.find(m => m.pbl === pbl);
      }
      if (!marker && id) {
        marker = markers.find(m => m.id === id) || markersForMercado?.find(m => m.id === id) || baseCompData?.find(m => m.id === id);
      }
      if (!marker) {
        alert('❌ Error: No se encontró el marcador');
        return;
      }

      try {
        const coordenada = {
          id: id || marker.id || pbl,
          pbl: pbl || marker.pbl || id,
          eds: eds || marker.eds || '',
          marca: marca || marker.Marca || '',
          comuna: marker.Comuna || '',
          lat_corregida: modoCorreccion.lat,
          lon_corregida: modoCorreccion.lng
        };

        await guardarCoordenadaCorregida(coordenada);

        marker.lat = modoCorreccion.lat;
        marker.lng = modoCorreccion.lng;

        // Actualizar en el cluster
        if (clusterGroupRef.current) {
          clusterGroupRef.current.clearLayers();
          markers.forEach(m => {
            const leafletMarker = createMarkerWithPopup(m, markers, 'primary');
            if (leafletMarker) {
              clusterGroupRef.current.addLayer(leafletMarker);
              
              if (m.Guerra_Precio === 'Si') {
                const guerraIcon = L.icon({
                  iconUrl: `${process.env.PUBLIC_URL}/iconos/calavera.jpg`,
                  iconSize: [15, 15],
                  iconAnchor: [7.5, 7.5],
                  className: 'icono-guerra'
                });
                const guerraMarker = L.marker([m.lat, m.lng], { icon: guerraIcon, interactive: false });
                clusterGroupRef.current.addLayer(guerraMarker);
              }
            }
          });
        }

        map.setView([modoCorreccion.lat, modoCorreccion.lng], map.getZoom());
        setModoCorreccion(null);
        if (map) map.getContainer().style.cursor = '';
      } catch (error) {
        alert('❌ Error al guardar: ' + error.message);
      }
    };

    return () => {
      delete window.activarCorreccionCoordenadas;
      delete window.guardarCorreccionCoordenadas;
    };
  }, [map, modoCorreccion, markers, markersForMercado, baseCompData, createMarkerWithPopup]);

  useEffect(() => {
    if (!map || !modoCorreccion) return;

    const handleMapClick = (e) => {
      const { lat, lng } = e.latlng;
      setModoCorreccion(prev => ({ ...prev, lat, lng }));

      const identifier = modoCorreccion.pbl || modoCorreccion.id;
      const latSpan = document.getElementById(`lat-actual-${identifier}`);
      const lngSpan = document.getElementById(`lon-actual-${identifier}`);
      if (latSpan) latSpan.textContent = lat.toFixed(6);
      if (lngSpan) lngSpan.textContent = lng.toFixed(6);

      const btnGuardar = document.getElementById(`guardar-coord-${identifier}`);
      if (btnGuardar) { btnGuardar.disabled = false; btnGuardar.style.opacity = '1'; }

      const btnActivar = document.getElementById(`activar-coord-${identifier}`);
      if (btnActivar) { btnActivar.textContent = 'Coord. Seleccionada ✓'; btnActivar.style.background = '#28a745'; }

      map.getContainer().style.cursor = '';
    };

    map.on('click', handleMapClick);
    return () => { map.off('click', handleMapClick); };
  }, [map, modoCorreccion]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (clusterGroupRef.current && map) {
        map.removeLayer(clusterGroupRef.current);
        clusterGroupRef.current = null;
      }
    };
  }, [map]);

  return null;
};

export default ClusteredIconMarkersLayer;
