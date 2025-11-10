import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { createCustomIcon, createBrandLogo } from '../utils/iconHelpers';
import { guardarCoordenadaCorregida } from '../services/apiService';
import '../styles/iconMarkersLayer.css';

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

 const generarPopupContent = useCallback((marker, datosTabla, tablaPreciosHtml, variant = 'primary') => {
  const isSecondary = variant === 'secondary';
  
  const logoUrl = marker.logo 
    ? (marker.logo.startsWith('http') 
        ? marker.logo 
        : `https://api.bencinaenlinea.cl${marker.logo}`)
    : '';

  let content = `
    <div class="icon-markers-popup-content">
      <div class="popup-info-header">
        ${logoUrl ? `
          <img 
            src="${logoUrl}" 
            alt="Logo ${marker.Marca}" 
            class="popup-logo"
            onerror="this.style.display='none';"
          />
        ` : ''}
        
        <div class="popup-info-row">
          <span class="popup-label">PBL:</span>
          <span class="popup-value">${marker.pbl || '-'}</span>
        </div>
        <div class="popup-info-row">
          <span class="popup-label">Estación:</span>
          <span class="popup-value">${marker.eds || '-'}</span>
        </div>
        <div class="popup-info-row">
          <span class="popup-label">Jefe Zona:</span>
          <span class="popup-value">${marker.nombre || '-'}</span>
        </div>
        <div class="popup-info-row">
          <span class="popup-label">Operación:</span>
          <span class="popup-value">${marker.operacion || 'Comisionista'}</span>
        </div>
      </div>

      <div class="popup-tabs-container">
        <div class="popup-tabs-header">
          <button class="popup-tab-button active" data-tab="precios">Precios</button>
          <button class="popup-tab-button" data-tab="coordenadas">Coordenadas</button>
          <button class="popup-tab-button" data-tab="informacion">Información</button>
        </div>

        <div class="popup-tabs-content">
          <div class="popup-tab-pane active" data-tab="precios">
            ${tablaPreciosHtml}
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
              <button 
                id="activar-coord-${marker.pbl || marker.id}"
                style="flex: 1; padding: 8px; background: #17a2b8; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600;"
                onclick="window.activarCorreccionCoordenadas('${marker.pbl || ''}', '${marker.id || ''}', '${marker.eds}', '${marker.Marca}')"
              >
                Activar Coord
              </button>
              
              <button 
                id="guardar-coord-${marker.pbl || marker.id}"
                style="flex: 1; padding: 8px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 600; opacity: 0.5;"
                onclick="window.guardarCorreccionCoordenadas('${marker.pbl || ''}', '${marker.id || ''}', '${marker.eds}', '${marker.Marca}')"
                disabled
              >
                Guardar
              </button>
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
    </div>
  `;

  if (marker.pbl && (marker.Marca === 'Aramco' || marker.Marca === 'Petrobras')) {
    content += `<button class="popup-button-mercado" onclick="window.showAssociatedIds && window.showAssociatedIds(${marker.pbl}, ${marker.lat}, ${marker.lng}, '${marker.id}')">Mercado</button>`;
  }

  return content;
}, []);


  const updateIconsInViewport = useCallback((allMarkers, clearFirst = true) => {
    if (!map || updateInProgressRef.current) return;

    updateInProgressRef.current = true;
    const bounds = map.getBounds();
    const visibleMarkers = allMarkers.filter(marker => {
      return bounds.contains([marker.lat, marker.lng]);
    });

    if (clearFirst) {
      Object.values(markersRef.current).forEach(marker => {
        try {
          if (map.hasLayer(marker)) {
            map.removeLayer(marker);
          }
        } catch (error) {
          console.error('Error removiendo:', error);
        }
      });
      markersRef.current = {};
      clearGuerraMarkers();

      map.eachLayer((layer) => {
        if (layer instanceof L.Marker && !map.hasLayer(layer)) {
          try {
            map.removeLayer(layer);
          } catch (e) { }
        }
      });
    }

    if (visibleMarkers.length === 0) {
      updateInProgressRef.current = false;
      return;
    }

    const markersByBrand = {};
    visibleMarkers.forEach(marker => {
      if (!markersByBrand[marker.Marca]) {
        markersByBrand[marker.Marca] = [];
      }
      markersByBrand[marker.Marca].push(marker);
    });

    const brandOrder = ['Aramco', 'Petrobras', 'Copec', 'Shell', 'Blanco', 'Gulf', 'Petroprix'];
    let delayOffset = 0;
    const cacheKey = selectedRegion;
    let totalBrands = brandOrder.filter(b => markersByBrand[b]).length;
    let brandsProcessed = 0;

    brandOrder.forEach((brand) => {
      if (!markersByBrand[brand] || markersByBrand[brand].length === 0) return;

      const brandMarkers = markersByBrand[brand];

      setTimeout(() => {
        brandMarkers.forEach((marker) => {
          try {
            const markerId = `${cacheKey}-${marker.id}`;

            if (markersRef.current[markerId]) {
              return;
            }

            const lat = parseFloat(marker.lat);
            const lng = parseFloat(marker.lng);

            if (!isNaN(lat) && !isNaN(lng)) {
              // ✅ CREAR MARCADOR NORMAL
              const iconUrl = createCustomIcon(marker.Marca);
              const leafletMarker = L.marker([lat, lng], { icon: iconUrl }).addTo(map);

              // ✅ SI TIENE GUERRA, CREAR MARCADOR SEPARADO CON LA CALAVERA
            // ✅ SI TIENE GUERRA, CREAR MARCADOR SEPARADO CON LA CALAVERA
const tieneGuerra = marker.Guerra_Precio === 'Si' || marker.guerraPrecios === true;
if (tieneGuerra) {
  const guerraIcon = L.icon({
    iconUrl: `${process.env.PUBLIC_URL}/iconos/calavera.jpg`,
    iconSize: [15, 15],
    iconAnchor: [7.5, 7.5],
    className: 'icono-guerra'
  });
  const guerraMarker = L.marker([lat, lng], { icon: guerraIcon, interactive: false }).addTo(map);
  guerraMarkersRef.current[markerId] = guerraMarker;
}


              const datosTabla = obtenerHistoricoMarker(marker.id, allMarkers);
              const tablaPreciosHtml = generarTablaPrecios(datosTabla, 'primary');

              leafletMarker.on('popupopen', () => {
                setDebugTable({
                  titulo: `${marker.Marca} - ${marker.nombre}`,
                  registros: datosTabla.length,
                  html: tablaPreciosHtml
                });
                setActiveTab('precios');
              });

              const popupContent = generarPopupContent(marker, datosTabla, tablaPreciosHtml, 'primary');

              const popup = L.popup({
                autoClose: false,
                closeOnClick: false,
                keepInView: true,
                autoPan: false,
                maxWidth: 450,
                className: 'custom-popup'
              }).setContent(popupContent);

              leafletMarker.bindPopup(popup);

              leafletMarker.on('popupopen', () => {
                makeDraggable(popup);
                setTimeout(() => {
                  const tabButtons = document.querySelectorAll('.popup-tab-button');
                  tabButtons.forEach(btn => {
                    btn.addEventListener('click', function (e) {
                      const tabName = this.getAttribute('data-tab');

                      tabButtons.forEach(b => b.classList.remove('active'));
                      document.querySelectorAll('.popup-tab-pane').forEach(pane => {
                        pane.classList.remove('active');
                      });

                      this.classList.add('active');
                      document.querySelector(`.popup-tab-pane[data-tab="${tabName}"]`).classList.add('active');
                    });
                  });
                }, 0);
              });

              leafletMarker.on('click', () => {
                leafletMarker.openPopup();
              });

              markersRef.current[markerId] = leafletMarker;

              cacheRef.current[markerId] = {
                lat: marker.lat,
                lng: marker.lng,
                marca: marker.Marca,
                nombre: marker.nombre,
                region: marker.Region
              };
            }
          } catch (error) {
            console.error(`Error:`, error);
          }
        });

        brandsProcessed++;
        localStorage.setItem('markersCache', JSON.stringify(cacheRef.current));

        if (brandsProcessed === totalBrands) {
          updateInProgressRef.current = false;
        }

      }, delayOffset);

      delayOffset += 60;
    });
  }, [map, makeDraggable, selectedRegion, generarTablaPrecios, obtenerHistoricoMarker, generarPopupContent, clearGuerraMarkers]);

  const showAssociatedIds = useCallback((pbl, lat, lng, originalMarkerId) => {
    const searchArray = markersForMercado && markersForMercado.length > 0 ? markersForMercado : markers;

    if (showingAssociated && activeMercadoPbl === pbl) {
      clearCompetenciaMarkers();
      clearPolylines();
      clearGuerraMarkers();

      Object.values(markersRef.current).forEach(marker => {
        try {
          if (map.hasLayer(marker)) {
            map.removeLayer(marker);
          }
        } catch (error) {
          console.error('Error removiendo:', error);
        }
      });
      markersRef.current = {};

      setShowingAssociated(false);
      setActiveMercadoPbl(null);
      setOriginalPopupMarker(null);

      const markersToShow = markersForMercado && markersForMercado.length > 0 ? markersForMercado : markers;

      if (map && markersToShow && markersToShow.length > 0) {
        updateIconsInViewport(markersToShow, true);
      }

      return;
    }

    clearCompetenciaMarkers();
    clearPolylines();

    const associatedData = baseCompData.filter(item =>
      String(item.pbl).trim() === String(pbl).trim()
    );

    if (associatedData.length === 0) {
      return;
    }

    const ids = associatedData.map(item => item.id);

    if (map) {
      let openPopup = null;
      map.eachLayer((layer) => {
        if (layer instanceof L.Marker && layer._popup && layer._popup.isOpen()) {
          openPopup = layer._popup;
        }
      });

      map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          const mLatLng = layer.getLatLng();

          const shouldKeep = ids.some(id => {
            const marker = searchArray.find(m => m.id === id);
            return marker && marker.lat === mLatLng.lat && marker.lng === mLatLng.lng;
          }) || (mLatLng.lat === lat && mLatLng.lng === lng);

          if (!shouldKeep) {
            map.removeLayer(layer);
          }
        }
      });

      Object.values(markersRef.current).forEach(marker => {
        const mLatLng = marker.getLatLng();
        const shouldKeep = ids.some(id => {
          const m = searchArray.find(x => x.id === id);
          return m && m.lat === mLatLng.lat && m.lng === mLatLng.lng;
        }) || (mLatLng.lat === lat && mLatLng.lng === lng);

        if (!shouldKeep) {
          try {
            if (map.hasLayer(marker)) {
              map.removeLayer(marker);
            }
          } catch (error) {
            console.error('Error:', error);
          }
        }
      });

      const associatedMarkers = searchArray.filter(item => ids.includes(item.id));
      associatedMarkers.forEach(marker => {
        const markerLat = parseFloat(marker.lat);
        const markerLng = parseFloat(marker.lng);

        if (!isNaN(markerLat) && !isNaN(markerLng)) {
          let exists = false;
          map.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
              const mLatLng = layer.getLatLng();
              if (mLatLng.lat === markerLat && mLatLng.lng === markerLng) {
                exists = true;
              }
            }
          });

          if (!exists) {
            // ✅ CREAR MARCADOR NORMAL
            const iconUrl = createCustomIcon(marker.Marca);
            const leafletMarker = L.marker([markerLat, markerLng], { icon: iconUrl }).addTo(map);

         
            // ✅ SI TIENE GUERRA, CREAR MARCADOR SEPARADO CON LA CALAVERA
const tieneGuerra = marker.Guerra_Precio === 'Si' || marker.guerraPrecios === true;
if (tieneGuerra) {
  const guerraIcon = L.icon({
    iconUrl: `${process.env.PUBLIC_URL}/iconos/calavera.jpg`,
    iconSize: [15, 15],
    iconAnchor: [7.5, 7.5],
    className: 'icono-guerra'
  });
  L.marker([markerLat, markerLng], { icon: guerraIcon, interactive: false }).addTo(map);
}


            competenciaMarkersRef.current.push(leafletMarker);

            const datosTabla = obtenerHistoricoMarker(marker.id, baseCompData);
            const tablaPreciosHtml = generarTablaPrecios(datosTabla, 'secondary');

            leafletMarker.on('popupopen', () => {
              setDebugTable({
                titulo: `${marker.Marca} - ${marker.nombre}`,
                registros: datosTabla.length,
                html: tablaPreciosHtml
              });
              setActiveTab('precios');
            });

            const popupContent = generarPopupContent(marker, datosTabla, tablaPreciosHtml, 'secondary');

            const popup = L.popup({
              autoClose: false,
              closeOnClick: false,
              keepInView: true,
              autoPan: false,
              maxWidth: 450,
              className: 'custom-popup'
            }).setContent(popupContent);

            leafletMarker.bindPopup(popup);

            leafletMarker.on('popupopen', () => {
              makeDraggable(popup);
              setTimeout(() => {
                const tabButtons = document.querySelectorAll('.popup-tab-button');
                tabButtons.forEach(btn => {
                  btn.addEventListener('click', function (e) {
                    const tabName = this.getAttribute('data-tab');

                    tabButtons.forEach(b => b.classList.remove('active'));
                    document.querySelectorAll('.popup-tab-pane').forEach(pane => {
                      pane.classList.remove('active');
                    });

                    this.classList.add('active');
                    document.querySelector(`.popup-tab-pane[data-tab="${tabName}"]`).classList.add('active');
                  });
                });
              }, 0);
            });

            leafletMarker.on('click', () => leafletMarker.openPopup());
          }
        }
      });

      const mainMarkersData = associatedData.filter(m => m.Marcador_Principal === 'Si');
      mainMarkersData.forEach(mainMarker => {
        const markerWithCoords = searchArray.find(m => m.id === mainMarker.id);

        if (markerWithCoords) {
          const mainLat = parseFloat(markerWithCoords.lat);
          const mainLng = parseFloat(markerWithCoords.lng);

          if (!isNaN(mainLat) && !isNaN(mainLng)) {
            const currentLat = parseFloat(lat);
            const currentLng = parseFloat(lng);

            const polyline = L.polyline(
              [
                [currentLat, currentLng],
                [mainLat, mainLng]
              ],
              {
                color: '#FF6B6B',
                weight: 3,
                opacity: 0.8,
                dashArray: '5, 5'
              }
            ).addTo(map);

            polylineRef.current.push(polyline);
          }
        }
      });

      if (openPopup) {
        setTimeout(() => {
          try {
            openPopup._map = map;
            openPopup.update();
          } catch (e) {
            console.log('Popup actualizado');
          }
        }, 50);
      }

      setShowingAssociated(true);
      setActiveMercadoPbl(pbl);
    }
  }, [baseCompData, markers, markersForMercado, map, makeDraggable, showingAssociated, activeMercadoPbl, updateIconsInViewport, clearCompetenciaMarkers, clearPolylines, clearGuerraMarkers, generarTablaPrecios, obtenerHistoricoMarker, generarPopupContent]);

  useEffect(() => {
    window.showAssociatedIds = showAssociatedIds;
  }, [showAssociatedIds]);

  useEffect(() => {
    if (!map || !markers || markers.length === 0) return;

    clearCompetenciaMarkers();
    clearPolylines();
    clearGuerraMarkers();
    setShowingAssociated(false);
    setActiveMercadoPbl(null);
    setOriginalPopupMarker(null);

    updateIconsInViewport(markers, true);

  }, [map, markers, selectedRegion, updateIconsInViewport, clearCompetenciaMarkers, clearPolylines, clearGuerraMarkers]);

  useEffect(() => {
    if (!map) return;

    const handleZoomEnd = () => {
      if (zoomUpdateRef.current) clearTimeout(zoomUpdateRef.current);

      zoomUpdateRef.current = setTimeout(() => {
        if (showingAssociated) {
          console.log('🔍 Zoom en modo competencia - manteniendo filtro');
        } else if (markers && markers.length > 0) {
          updateIconsInViewport(markers, false);
        }
      }, 400);
    };

    map.on('zoomend', handleZoomEnd);

    return () => {
      map.off('zoomend', handleZoomEnd);
    };
  }, [map, markers, updateIconsInViewport, showingAssociated]);

  useEffect(() => {
    window.activarCorreccionCoordenadas = (pbl, id, eds, marca) => {
      const identifier = pbl || id;
      console.log('🎯 Activado para:', { pbl, id, identifier, marca });
      
      if (map) map.getContainer().style.cursor = 'crosshair';
      setModoCorreccion({ pbl, id, eds, marca, lat: null, lng: null });
      
      const btnGuardar = document.getElementById(`guardar-coord-${identifier}`);
      if (btnGuardar) {
        btnGuardar.disabled = true;
        btnGuardar.style.opacity = '0.5';
      }
      
      const btnActivar = document.getElementById(`activar-coord-${identifier}`);
      if (btnActivar) {
        btnActivar.textContent = 'Click en mapa...';
        btnActivar.style.background = '#ffc107';
      }
    };

    window.guardarCorreccionCoordenadas = async (pbl, id, eds, marca) => {
      if (!modoCorreccion || !modoCorreccion.lat || !modoCorreccion.lng) {
        alert('⚠️ Primero selecciona una ubicación');
        return;
      }

      const identifier = pbl || id;
      console.log('💾 Guardando:', { pbl, id, identifier, marca });

      let marker = null;
      
      if (pbl) {
        marker = markers.find(m => m.pbl === pbl);
        if (!marker && markersForMercado) {
          marker = markersForMercado.find(m => m.pbl === pbl);
        }
        if (!marker && baseCompData) {
          marker = baseCompData.find(m => m.pbl === pbl);
        }
      }
      
      if (!marker && id) {
        marker = markers.find(m => m.id === id);
        if (!marker && markersForMercado) {
          marker = markersForMercado.find(m => m.id === id);
        }
        if (!marker && baseCompData) {
          marker = baseCompData.find(m => m.id === id);
        }
      }

      if (!marker) {
        console.error('❌ Marcador no encontrado:', { pbl, id });
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

        console.log('📤 Enviando coordenada:', coordenada);

        await guardarCoordenadaCorregida(coordenada);
        console.log('✅ Coordenada guardada en backend');
        
        const cacheKey = selectedRegion;
        const markerId = `${cacheKey}-${marker.id}`;
        let leafletMarker = markersRef.current[markerId];
        
        if (!leafletMarker && competenciaMarkersRef.current.length > 0) {
          leafletMarker = competenciaMarkersRef.current.find(m => {
            const latLng = m.getLatLng();
            return latLng.lat === marker.lat && latLng.lng === marker.lng;
          });
        }
        
        if (leafletMarker && map) {
          const newLatLng = L.latLng(modoCorreccion.lat, modoCorreccion.lng);
          leafletMarker.setLatLng(newLatLng);
          
          // ✅ Mover también el marcador de guerra si existe
          if (guerraMarkersRef.current[markerId]) {
            guerraMarkersRef.current[markerId].setLatLng(newLatLng);
          }
          
          map.setView(newLatLng, map.getZoom());
          
          if (leafletMarker.isPopupOpen()) {
            leafletMarker.closePopup();
            
            setTimeout(() => {
              leafletMarker.openPopup();
            }, 100);
          }
          
          console.log('✅ Marcador movido a:', modoCorreccion.lat, modoCorreccion.lng);
        } else {
          console.warn('⚠️ No se encontró el marcador de Leaflet, pero la coordenada fue guardada');
        }
        
        marker.lat = modoCorreccion.lat;
        marker.lng = modoCorreccion.lng;
        
        setModoCorreccion(null);
        if (map) map.getContainer().style.cursor = '';
        
      } catch (error) {
        console.error('❌ Error:', error);
        alert('❌ Error al guardar: ' + error.message);
      }
    };

    return () => {
      delete window.activarCorreccionCoordenadas;
      delete window.guardarCorreccionCoordenadas;
    };
  }, [map, modoCorreccion, markers, markersForMercado, baseCompData, selectedRegion]);

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
      if (btnGuardar) {
        btnGuardar.disabled = false;
        btnGuardar.style.opacity = '1';
      }
      
      const btnActivar = document.getElementById(`activar-coord-${identifier}`);
      if (btnActivar) {
        btnActivar.textContent = 'Coord. Seleccionada ✓';
        btnActivar.style.background = '#28a745';
      }
      
      map.getContainer().style.cursor = '';
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [map, modoCorreccion]);

  return null;
};

export default IconMarkersLayer;
