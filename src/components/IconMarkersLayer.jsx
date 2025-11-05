import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { createCustomIcon, createBrandLogo } from '../utils/iconHelpers';

const IconMarkersLayer = ({ markers, selectedRegion, baseCompData = [] }) => {
  const map = useMap();
  const markersRef = useRef({});
  const cacheRef = useRef({});
  const updateInProgressRef = useRef(false);
  const zoomUpdateRef = useRef(null);
  const [showingAssociated, setShowingAssociated] = useState(false);
  const [originalPopupMarker, setOriginalPopupMarker] = useState(null);

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

  const addMarkers = useCallback((data, mapInstance) => {
    data.forEach(marker => {
      const lat = parseFloat(marker.lat);
      const lng = parseFloat(marker.lng);

      if (!isNaN(lat) && !isNaN(lng)) {
        const iconUrl = createCustomIcon(marker.Marca);
        const leafletMarker = L.marker([lat, lng], { icon: iconUrl }).addTo(mapInstance);

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
          popupContent += `<button class="associated-button" onclick="window.showAssociatedIds && window.showAssociatedIds(${marker.pbl}, ${lat}, ${lng}, '${marker.id}')">Mercado</button>`;
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
    });
  }, [makeDraggable]);

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
                popupContent += `<button class="associated-button" onclick="window.showAssociatedIds && window.showAssociatedIds(${marker.pbl}, ${lat}, ${lng}, '${marker.id}')">Mercado</button>`;
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
    console.log(`🔍 PBL seleccionado: ${pbl}`);
    
        if (showingAssociated) {
      // Volver a mostrar todos - CON OPACITY (SIN REMOVER)
      if (map) {
        map.eachLayer((layer) => {
          if (layer instanceof L.Marker) {
            layer.setOpacity(1);
          }
        });
      }
      Object.values(markersRef.current).forEach(marker => {
        try {
          if (!map.hasLayer(marker)) {
            map.addLayer(marker);
          }
          marker.setOpacity(1);
        } catch (error) {
          console.error('Error:', error);
        }
      });

      setShowingAssociated(false);
      setOriginalPopupMarker(null);
      return;
    }



    const associatedData = baseCompData.filter(item => 
      String(item.pbl).trim() === String(pbl).trim()
    );
    
    console.log(`✅ Competencia encontrada:`, associatedData.length);

    if (associatedData.length === 0) {
      console.warn(`⚠️ Sin competencia para PBL: ${pbl}`);
      return;
    }

    const ids = associatedData.map(item => item.id);

    if (map) {
      // Encontrar el popup abierto ANTES de cambios
      let openPopup = null;
      map.eachLayer((layer) => {
        if (layer instanceof L.Marker && layer._popup && layer._popup.isOpen()) {
          openPopup = layer._popup;
        }
      });

      // NO remover todo, solo cambiar lo que debe ser invisible
      const visibleIds = new Set(ids);
      visibleIds.add(lat + ',' + lng);

      map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          const mLatLng = layer.getLatLng();
          
          const shouldKeep = ids.some(id => {
            const marker = markers.find(m => m.id === id);
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
          const m = markers.find(x => x.id === id);
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

      // Agregar nuevos marcadores de competencia
      const associatedMarkers = markers.filter(item => ids.includes(item.id));
      associatedMarkers.forEach(marker => {
        const lat = parseFloat(marker.lat);
        const lng = parseFloat(marker.lng);

        if (!isNaN(lat) && !isNaN(lng)) {
          let exists = false;
          map.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
              const mLatLng = layer.getLatLng();
              if (mLatLng.lat === lat && mLatLng.lng === lng) {
                exists = true;
              }
            }
          });

          if (!exists) {
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
              popupContent += `<button class="associated-button" onclick="window.showAssociatedIds && window.showAssociatedIds(${marker.pbl}, ${lat}, ${lng}, '${marker.id}')">Mercado</button>`;
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

      // Mantener popup abierto
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
    }
  }, [baseCompData, markers, map, createCustomIcon, makeDraggable, showingAssociated]);

  useEffect(() => {
    window.showAssociatedIds = showAssociatedIds;
  }, [showAssociatedIds]);

  useEffect(() => {
    if (!map || !markers || markers.length === 0) return;

    console.log(`✅ Actualizando ${markers.length} marcadores`);
    updateIconsInViewport(markers, true);

  }, [map, markers, selectedRegion, updateIconsInViewport]);

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
