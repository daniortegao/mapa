import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { createCustomIcon, createBrandLogo } from '../utils/iconHelpers';

const IconMarkersLayer = ({ markers, markersForMercado = null, selectedRegion, baseCompData = [] }) => {
  const map = useMap();
  const markersRef = useRef({});
  const cacheRef = useRef({});
  const updateInProgressRef = useRef(false);
  const zoomUpdateRef = useRef(null);
  const [showingAssociated, setShowingAssociated] = useState(false);
  const [originalPopupMarker, setOriginalPopupMarker] = useState(null);
  const [activeMercadoPbl, setActiveMercadoPbl] = useState(null);
  const competenciaMarkersRef = useRef([]);

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
    console.log(`🗑️ Limpiando ${competenciaMarkersRef.current.length} marcadores de competencia`);
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

  const getButtonContent = useCallback((pbl) => {
    const isActive = activeMercadoPbl === pbl && showingAssociated;
    return isActive ? '❌ Cerrar Mercado' : '🛒 Abrir Mercado';
  }, [activeMercadoPbl, showingAssociated]);

  const updateMarkerButtons = useCallback(() => {
    Object.values(markersRef.current).forEach(marker => {
      if (marker._popup) {
        const latLng = marker.getLatLng();
        const markerData = markers.find(m => m.lat === latLng.lat && m.lng === latLng.lng);
        
        if (markerData && markerData.pbl && (markerData.Marca === 'Aramco' || markerData.Marca === 'Petrobras')) {
          const oldContent = marker._popup.getContent();
          if (typeof oldContent === 'string') {
            const updatedContent = oldContent.replace(
              /(<button class="associated-button"[^>]*>).*?(<\/button>)/g,
              `$1${getButtonContent(markerData.pbl)}$2`
            );
            marker._popup.setContent(updatedContent);
          }
        }
      }
    });
  }, [markers, getButtonContent]);

  const updateIconsInViewport = useCallback((allMarkers, clearFirst = true) => {
    if (!map || updateInProgressRef.current) return;

    updateInProgressRef.current = true;
    const bounds = map.getBounds();
    const visibleMarkers = allMarkers.filter(marker => {
      return bounds.contains([marker.lat, marker.lng]);
    });

    console.log(`🎯 Actualizando ${visibleMarkers.length} iconos...`);

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

      map.eachLayer((layer) => {
        if (layer instanceof L.Marker && !map.hasLayer(layer)) {
          try {
            map.removeLayer(layer);
          } catch (e) {}
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
        console.log(`📍 Procesando ${brandMarkers.length} de ${brand}...`);

        brandMarkers.forEach((marker) => {
          try {
            const markerId = `${cacheKey}-${marker.id}`;

            if (markersRef.current[markerId]) {
              return;
            }

            const lat = parseFloat(marker.lat);
            const lng = parseFloat(marker.lng);

            if (!isNaN(lat) && !isNaN(lng)) {
              const iconUrl = createCustomIcon(marker.Marca);
              const leafletMarker = L.marker([lat, lng], { icon: iconUrl }).addTo(map);

              let popupContent = `
                <div class="popup-container">
                  <div class="popup-header">
                    <img 
                      src="${createBrandLogo(marker.Marca)}"
                      alt="${marker.Marca}"
                      style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover; margin-right: 8px;"
                      onerror="this.style.display='none'"
                    />
                    <h3 style="margin: 0;">${marker.nombre || marker.Marca}</h3>
                  </div>
                  <div class="popup-content">
                    <div class="popup-data">
                      <strong>Marca:</strong> ${marker.Marca}<br />
                      <strong>PBL:</strong> ${marker.pbl || '-'}<br />
                      <strong>Region:</strong> ${marker.Region}<br />
                      <strong>Comuna:</strong> ${marker.Comuna}<br />
                      ${marker.direccion ? `<strong>Dirección:</strong> ${marker.direccion}<br />` : ''}
                      ${marker.eds ? `<strong>EDS:</strong> ${marker.eds}<br />` : ''}
                    </div>
                    <hr style="margin: 10px 0; border: none; border-top: 1px solid #e0e0e0" />
                    <div class="popup-data">
                      <strong>Precios:</strong><br />
                      G93: ${marker.precio_g93 ? `$${marker.precio_g93}` : 'N/A'}<br />
                      G95: ${marker.precio_g95 ? `$${marker.precio_g95}` : 'N/A'}<br />
                      Diesel: ${marker.precio_diesel ? `$${marker.precio_diesel}` : 'N/A'}<br />
                    </div>
                    ${marker.Guerra_Precio === 'Si' ? `
                      <hr style="margin: 10px 0; border: none; border-top: 1px solid #e0e0e0" />
                      <div class="popup-data" style="color: #d32f2f; font-weight: bold;">
                        ⚠️ Guerra de Precio Activa
                      </div>
                    ` : ''}
                  </div>
                </div>
              `;

              if (marker.pbl && (marker.Marca === 'Aramco' || marker.Marca === 'Petrobras')) {
                popupContent += `<button class="associated-button" onclick="window.showAssociatedIds && window.showAssociatedIds(${marker.pbl}, ${marker.lat}, ${marker.lng}, '${marker.id}')">🛒 Abrir Mercado</button>`;
              }

              const popup = L.popup({
                autoClose: false,
                closeOnClick: false,
                keepInView: true,
                autoPan: false
              }).setContent(popupContent);

              leafletMarker.bindPopup(popup);

              leafletMarker.on('popupopen', () => {
                makeDraggable(popup);
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
  }, [map, makeDraggable, selectedRegion]);

  const showAssociatedIds = useCallback((pbl, lat, lng, originalMarkerId) => {
    console.log(`🔍 PBL: ${pbl}, activeMercadoPbl: ${activeMercadoPbl}`);
    
    const searchArray = markersForMercado && markersForMercado.length > 0 ? markersForMercado : markers;
    
    // ✅ Si el mercado del mismo PBL está activo, CERRAR
    if (showingAssociated && activeMercadoPbl === pbl) {
      console.log('🔄 Cerrando mercado - mostrando todas las estaciones');
      
      clearCompetenciaMarkers();
      
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
      
      // ✅ USAR markersForMercado (sin filtro EDS) al cerrar mercado
      const markersToShow = markersForMercado && markersForMercado.length > 0 ? markersForMercado : markers;
      
      if (map && markersToShow && markersToShow.length > 0) {
        console.log(`📍 Recargando ${markersToShow.length} marcadores (sin filtro EDS)`);
        updateIconsInViewport(markersToShow, true);
      }
      
      return;
    }

    // ✅ ABRIR MERCADO - Mostrar competencia
    clearCompetenciaMarkers();

    const associatedData = baseCompData.filter(item => 
      String(item.pbl).trim() === String(pbl).trim()
    );
    
    console.log(`✅ Competencia en baseCompData: ${associatedData.length}`);

    if (associatedData.length === 0) {
      console.warn(`⚠️ Sin competencia para PBL: ${pbl}`);
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
            const iconUrl = createCustomIcon(marker.Marca);
            const leafletMarker = L.marker([markerLat, markerLng], { icon: iconUrl }).addTo(map);

            competenciaMarkersRef.current.push(leafletMarker);

            let popupContent = `
              <div class="popup-container">
                <div class="popup-header">
                  <img 
                    src="${createBrandLogo(marker.Marca)}"
                    alt="${marker.Marca}"
                    style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover; margin-right: 8px;"
                    onerror="this.style.display='none'"
                  />
                  <h3 style="margin: 0;">${marker.nombre || marker.Marca}</h3>
                </div>
                <div class="popup-content">
                  <div class="popup-data">
                    <strong>Marca:</strong> ${marker.Marca}<br />
                    <strong>PBL:</strong> ${marker.pbl || '-'}<br />
                    <strong>Region:</strong> ${marker.Region}<br />
                    <strong>Comuna:</strong> ${marker.Comuna}<br />
                    ${marker.direccion ? `<strong>Dirección:</strong> ${marker.direccion}<br />` : ''}
                    ${marker.eds ? `<strong>EDS:</strong> ${marker.eds}<br />` : ''}
                  </div>
                  <hr style="margin: 10px 0; border: none; border-top: 1px solid #e0e0e0" />
                  <div class="popup-data">
                    <strong>Precios:</strong><br />
                    G93: ${marker.precio_g93 ? `$${marker.precio_g93}` : 'N/A'}<br />
                    G95: ${marker.precio_g95 ? `$${marker.precio_g95}` : 'N/A'}<br />
                    Diesel: ${marker.precio_diesel ? `$${marker.precio_diesel}` : 'N/A'}<br />
                  </div>
                  ${marker.Guerra_Precio === 'Si' ? `
                    <hr style="margin: 10px 0; border: none; border-top: 1px solid #e0e0e0" />
                    <div class="popup-data" style="color: #d32f2f; font-weight: bold;">
                      ⚠️ Guerra de Precio Activa
                    </div>
                  ` : ''}
                </div>
              </div>
            `;

            if (marker.pbl && (marker.Marca === 'Aramco' || marker.Marca === 'Petrobras')) {
              popupContent += `<button class="associated-button" onclick="window.showAssociatedIds && window.showAssociatedIds(${marker.pbl}, ${marker.lat}, ${marker.lng}, '${marker.id}')">🛒 Abrir Mercado</button>`;
            }

            const popup = L.popup({
              autoClose: false,
              closeOnClick: false,
              keepInView: true,
              autoPan: false
            }).setContent(popupContent);

            leafletMarker.bindPopup(popup);
            leafletMarker.on('popupopen', () => makeDraggable(popup));
            leafletMarker.on('click', () => leafletMarker.openPopup());
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
      console.log(`✅ Mostrando ${associatedMarkers.length} estaciones`);
    }
  }, [baseCompData, markers, markersForMercado, map, makeDraggable, showingAssociated, activeMercadoPbl, updateIconsInViewport, clearCompetenciaMarkers]);

  useEffect(() => {
    window.showAssociatedIds = showAssociatedIds;
  }, [showAssociatedIds]);

  useEffect(() => {
    updateMarkerButtons();
  }, [showingAssociated, activeMercadoPbl, updateMarkerButtons]);

  useEffect(() => {
    if (!map || !markers || markers.length === 0) return;

    console.log(`✅ Cambio en markers - limpiando competencia anterior...`);
    clearCompetenciaMarkers();
    setShowingAssociated(false);
    setActiveMercadoPbl(null);
    setOriginalPopupMarker(null);
    
    updateIconsInViewport(markers, true);

  }, [map, markers, selectedRegion, updateIconsInViewport, clearCompetenciaMarkers]);

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

  return null;
};

export default IconMarkersLayer;
