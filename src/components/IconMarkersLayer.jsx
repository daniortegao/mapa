import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import ReactDOM from 'react-dom/client';
import { createCustomIcon } from '../utils/iconHelpers';
import { guardarCoordenadaCorregida } from '../services/apiService';
import TrendChart from '../components/TrendChart';
import '../styles/iconMarkersLayer.css';

// --- Utilidad para obtener la última fila por nivel ---
function obtenerUltimaFilaPorNivel(nivel, data) {
  const filas = data
    .filter(f => f.nivel && f.nivel.toString().toLowerCase() === nivel.toLowerCase())
    .sort((a, b) => new Date(b.fecha_aplicacion || b.Fecha) - new Date(a.fecha_aplicacion || a.Fecha));
  return filas[0] || null;
}




const IconMarkersLayer = ({ markers, markersForMercado = null, selectedRegion, baseCompData = [] }) => {
  const map = useMap();
  const markersRef = useRef({});
  const guerraMarkersRef = useRef({});
  const cacheRef = useRef({});
  const updateInProgressRef = useRef(false);
  const zoomUpdateRef = useRef(null);

  const [showingAssociated, setShowingAssociated] = useState(false);
  const [originalPopupMarker, setOriginalPopupMarker] = useState(null);
  const [activeMercadoPbl, setActiveMercadoPbl] = useState(null);

  const competenciaMarkersRef = useRef([]);
  const polylineRef = useRef([]);

  const [debugTable, setDebugTable] = useState(null);
  const [maxHeight, setMaxHeight] = useState(500);
  const [activeTab, setActiveTab] = useState('precios');
  const [modoCorreccion, setModoCorreccion] = useState(null);

// --- Esto se pone DENTRO de IconMarkersLayer pero FUERA de cualquier función ---
/*
 * baseHistorico: tu arreglo de datos históricos filtrado (usas markersForMercado || markers, por ejemplo)
 * marker: el marcador que se está usando para el popup actual
 */
function obtenerDiferenciasNiveles(marker, baseHistorico) {
  const filaNivel1 = obtenerUltimaFilaPorNivel('Nivel 1', baseHistorico.filter(m => m.id === marker.id));
  const filaNivel2 = obtenerUltimaFilaPorNivel('Nivel 2', baseHistorico.filter(m => m.id === marker.id));
  if (!filaNivel1 || !filaNivel2) return null;
  return {
    g93: filaNivel2.g93 - filaNivel1.g93,
    g95: filaNivel2.g95 - filaNivel1.g95,
    g97: filaNivel2.g97 - filaNivel1.g97,
    diesel: filaNivel2.diesel - filaNivel1.diesel,
    kero: filaNivel2.kero - filaNivel1.kero
  };
}





  // Hacer popup draggable
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

  // Normaliza histórico del marker con filtro de nivel
  const obtenerHistoricoMarker = useCallback((markerId, dataArray, nivel = "Nivel 1") => {
    const datos = dataArray.filter(m => 
      m.id === markerId && 
      m.nivel && 
      m.nivel.toLowerCase() === nivel.toLowerCase()
    );
    
    return datos
      .sort((a, b) => {
        const fechaA = a.fecha_aplicacion ? new Date(a.fecha_aplicacion) : new Date(0);
        const fechaB = b.fecha_aplicacion ? new Date(b.fecha_aplicacion) : new Date(0);
        return fechaB - fechaA;
      })
      .map(item => ({
        fecha: item.fecha_aplicacion || item.Fecha || 'S/F',
        g93: item.precio_g93 || item.G93 || '-',
        g95: item.precio_g95 || item.G95 || '-',
        g97: item.precio_g97 || item.G97 || '-',
        diesel: item.precio_diesel || item.Diesel || '-',
        kero: item.precio_kero || item.Kero || '-'
      }));
  }, []);

   // Popup HTML con pestañas y botones de nivel
  const generarPopupContent = useCallback((marker, datosTabla, tablaPreciosHtml, variant = 'primary') => {
    const logoUrl = marker.logo
      ? (marker.logo.startsWith('http') ? marker.logo : `https://api.bencinaenlinea.cl${marker.logo}`)
      : '';
    return `
      <div class="icon-markers-popup-content">
        <div class="popup-info-header">
          ${logoUrl ? `<img src="${logoUrl}" alt="Logo ${marker.Marca}" class="popup-logo" onerror="this.style.display='none';"/>` : ''}
          <div class="popup-info-row"><span class="popup-label">PBL: </span><span class="popup-value-alerta">${marker.pbl || '-'}</span></div>
          <div class="popup-info-row"><span class="popup-label">EESS: </span><span class="popup-value">${marker.eds || '-'}</span></div><br>
          <div class="popup-info-row"><span class="popup-label">JZ: </span><span class="popup-value">${marker.nombre || '-'}</span></div>
          <div class="popup-info-row"><span class="popup-label">OP: </span><span class="popup-value">${marker.operacion || '-'}</span></div>
        </div>

        <div class="popup-tabs-container">
          <div class="popup-tabs-header">
            <button class="popup-tab-button active" data-tab="precios">Precios</button>
            <button class="popup-tab-button" data-tab="tendencias">Tendencias</button>
            <button class="popup-tab-button" data-tab="coordenadas">Coordenadas</button>
            <button class="popup-tab-button" data-tab="informacion">Información</button>
          </div>

          <div class="popup-tabs-content">
            <div class="popup-tab-pane active" data-tab="precios">
              <div class="nivel-toggle-container" >
                <button class="nivel-toggle-btn active" data-nivel="Nivel 1" data-marker-id="${marker.id}">
                  Nivel 1
                </button>
                <button class="nivel-toggle-btn" data-nivel="Nivel 2" data-marker-id="${marker.id}">
                  Nivel 2
                </button>
              </div>
              <div id="tabla-precios-${marker.id}">
                ${tablaPreciosHtml}
              </div>
            </div>
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

   // Crear grip en el wrapper del popup
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

  // Listener toggle niveles
  const setupNivelToggle = useCallback((popupContainer, marker, allMarkers, variant) => {
    const nivelButtons = popupContainer.querySelectorAll('.nivel-toggle-btn');
    if (nivelButtons.length === 0) return;
    
    nivelButtons.forEach(btn => {
      btn.addEventListener('click', function(event) {
        event.stopPropagation();
        event.preventDefault();
        
        const nivel = this.getAttribute('data-nivel');
        const markerId = this.getAttribute('data-marker-id');
        
        popupContainer.querySelectorAll('.nivel-toggle-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        const datosTabla = obtenerHistoricoMarker(marker.id, allMarkers, nivel);
        const nuevaTablaHtml = generarTablaPrecios(datosTabla, variant);
        
        const tablaContainer = popupContainer.querySelector(`#tabla-precios-${markerId}`);
        if (tablaContainer) {
          tablaContainer.innerHTML = nuevaTablaHtml;
        }
      });
    });
  }, [obtenerHistoricoMarker, generarTablaPrecios]);

  // Tabs popup 
  const setupTabsListener = useCallback((popupContainer, marker, datosTabla) => {
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
  }, []);

  const setupPopupListeners = useCallback((popup, popupContainer, marker, allMarkers, variant) => {
    crearGripEnWrapper(popupContainer);
    const datosTabla = obtenerHistoricoMarker(marker.id, allMarkers, "Nivel 1");
    setupTabsListener(popupContainer, marker, datosTabla);
    setupNivelToggle(popupContainer, marker, allMarkers, variant);
  }, [crearGripEnWrapper, obtenerHistoricoMarker, setupTabsListener, setupNivelToggle]);

  // Crear marcador con popup y eventos
  const createMarkerWithPopup = useCallback((marker, allMarkers, variant = 'primary') => {
    const lat = parseFloat(marker.lat);
    const lng = parseFloat(marker.lng);
    if (isNaN(lat) || isNaN(lng)) return null;

    const iconUrl = createCustomIcon(marker.Marca);
    const leafletMarker = L.marker([lat, lng], { icon: iconUrl });

    const datosTabla = obtenerHistoricoMarker(marker.id, allMarkers, "Nivel 1");
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

    leafletMarker.on('popupopen', (e) => {
      makeDraggable(popup);
      setTimeout(() => {
        const popupContainer = e.popup._container;
        if (!popupContainer) return;
        setupPopupListeners(popup, popupContainer, marker, allMarkers, variant);
      }, 50);
    });

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

    return leafletMarker;
  }, [makeDraggable, obtenerHistoricoMarker, generarTablaPrecios, generarPopupContent, setupPopupListeners]);

  // Renderizar marcadores principales (histórico completo)
 useEffect(() => {
  if (!map || !markers || markers.length === 0) return;
  clearCompetenciaMarkers();
  clearPolylines();
  setShowingAssociated(false);
  setActiveMercadoPbl(null);

  Object.values(markersRef.current).forEach(marker => {
    try { if (map && map.hasLayer(marker)) map.removeLayer(marker); } catch (e) { }
  });
  markersRef.current = {};
  clearGuerraMarkers();

  // CAMBIO: usando markersForMercado || markers
  markers.forEach(marker => {
    const leafletMarker = createMarkerWithPopup(
      marker,
      markersForMercado || markers,
      'primary'
    );
    if (leafletMarker) {
      map.addLayer(leafletMarker);
      markersRef.current[marker.id] = leafletMarker;
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
    }
  });

  // MEJORA AGREGADA: abrir popup automáticamente si solo hay una estación
  if (markers.length === 1 && markersRef.current[markers[0].id]) {
    markersRef.current[markers[0].id].openPopup();
  }

}, [map, markers, markersForMercado, selectedRegion, clearCompetenciaMarkers, clearPolylines, clearGuerraMarkers, createMarkerWithPopup]);

  const showAssociatedIds = useCallback((pbl, lat, lng, originalMarkerId) => {
  const searchArray = markersForMercado && markersForMercado.length > 0 ? markersForMercado : markers;

  if (showingAssociated && activeMercadoPbl === pbl) {
    clearCompetenciaMarkers();
    clearPolylines();
    setShowingAssociated(false);
    setActiveMercadoPbl(null);

    Object.values(markersRef.current).forEach(marker => {
      try {
        if (map && map.hasLayer(marker)) {
          map.removeLayer(marker);
        }
      } catch (e) {
        console.error('Error removiendo marcador:', e);
      }
    });
    markersRef.current = {};

    markers.forEach(marker => {
      const leafletMarker = createMarkerWithPopup(
        marker,
        markersForMercado || markers,
        'primary'
      );
      if (leafletMarker) {
        map.addLayer(leafletMarker);
        markersRef.current[marker.id] = leafletMarker;

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
      }
    });
    return;
  }

  clearCompetenciaMarkers();
  clearPolylines();

  const associatedData = baseCompData.filter(item => String(item.pbl).trim() === String(pbl).trim());
  if (associatedData.length === 0) return;

  const ids = associatedData.map(item => item.id);

  Object.values(markersRef.current).forEach(marker => {
    try {
      if (map && map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    } catch (e) {
      console.error('Error removiendo marcador:', e);
    }
  });
  markersRef.current = {};
  clearGuerraMarkers();

  const originalMarker = markers.find(m => m.id === originalMarkerId);
  if (originalMarker) {
    const leafletMarker = createMarkerWithPopup(
      originalMarker,
      markersForMercado || markers,
      'primary'
    );
    if (leafletMarker) {
      map.addLayer(leafletMarker);
      markersRef.current[originalMarker.id] = leafletMarker;

      if (originalMarker.Guerra_Precio === 'Si') {
        const guerraIcon = L.icon({
          iconUrl: `${process.env.PUBLIC_URL}/iconos/calavera.jpg`,
          iconSize: [15, 15],
          iconAnchor: [7.5, 7.5],
          className: 'icono-guerra'
        });
        const guerraMarker = L.marker([originalMarker.lat, originalMarker.lng], { icon: guerraIcon, interactive: false });
        map.addLayer(guerraMarker);
        guerraMarkersRef.current[originalMarker.id] = guerraMarker;
      }
    }
  }

  // DEDUPLICAR marcadores de competencia
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
    const leafletMarker = createMarkerWithPopup(
      marker,
      markersForMercado || baseCompData,
      'secondary'
    );
    if (leafletMarker) {
      map.addLayer(leafletMarker);
      competenciaMarkersRef.current.push(leafletMarker);

      if (marker.Guerra_Precio === 'Si') {
        const guerraIcon = L.icon({
          iconUrl: `${process.env.PUBLIC_URL}/iconos/calavera.jpg`,
          iconSize: [15, 15],
          iconAnchor: [7.5, 7.5],
          className: 'icono-guerra'
        });
        const guerraMarker = L.marker([marker.lat, marker.lng], { icon: guerraIcon, interactive: false });
        map.addLayer(guerraMarker);
      }
    }
  });

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
}, [baseCompData, markers, markersForMercado, map, showingAssociated, activeMercadoPbl, clearCompetenciaMarkers, clearPolylines, clearGuerraMarkers, createMarkerWithPopup]);

  useEffect(() => {
    window.showAssociatedIds = showAssociatedIds;
  }, [showAssociatedIds]);

  useEffect(() => {
    window.activarCorreccionCoordenadas = (pbl, id, eds, marca) => {
      const identifier = pbl || id;
      if (map) map.getContainer().style.cursor = 'crosshair';
      setModoCorreccion({ pbl, id, eds, marca, lat: null, lng: null });
    };

    window.guardarCorreccionCoordenadas = async (pbl, id, eds, marca) => {
      if (!modoCorreccion || !modoCorreccion.lat || !modoCorreccion.lng) return;
      let marker = markers.find(m => m.pbl === pbl) || markersForMercado?.find(m => m.pbl === pbl) || baseCompData?.find(m => m.pbl === pbl);
      if (!marker && id) marker = markers.find(m => m.id === id) || markersForMercado?.find(m => m.id === id) || baseCompData?.find(m => m.id === id);
      if (!marker) return;

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

        Object.values(markersRef.current).forEach(m => {
          if (map.hasLayer(m)) map.removeLayer(m);
        });
        markersRef.current = {};
        clearGuerraMarkers();

        // CAMBIO aquí
        markers.forEach(m => {
          const leafletMarker = createMarkerWithPopup(
            m,
            markersForMercado || markers,
            'primary'
          );
          if (leafletMarker) {
            map.addLayer(leafletMarker);
            markersRef.current[m.id] = leafletMarker;
          }
        });
      } catch (error) {}
    };
    return () => {
      delete window.activarCorreccionCoordenadas;
      delete window.guardarCorreccionCoordenadas;
    };
  }, [map, modoCorreccion, markers, markersForMercado, baseCompData, clearGuerraMarkers, createMarkerWithPopup]);

  useEffect(() => {
    if (!map || !modoCorreccion) return;
    const handleMapClick = (e) => {
      const { lat, lng } = e.latlng;
      setModoCorreccion(prev => ({ ...prev, lat, lng }));
      // ...el resto de lógica de coordenadas...
    };
    map.on('click', handleMapClick);
    return () => { map.off('click', handleMapClick); };
  }, [map, modoCorreccion]);

  return null;
};

export default IconMarkersLayer;



