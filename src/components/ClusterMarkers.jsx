import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster';
import { createCustomIcon, createBrandLogo } from '../utils/iconHelpers';

const ClusterMarkers = ({ markers, selectedRegion }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || markers.length === 0) return;

    // Limpiar clusters anteriores
    map.eachLayer((layer) => {
      if (layer instanceof L.MarkerClusterGroup) {
        map.removeLayer(layer);
      }
    });

    // Crear nuevo cluster group
    const markerClusterGroup = L.markerClusterGroup({
      maxClusterRadius: 80,
      disableClusteringAtZoom: 16,
      chunkedLoading: true,
      chunkInterval: 200,
      chunkDelay: 50
    });

    // Filtrar por región y agregar marcadores
    const filteredMarkers = markers.filter(m => m.Region === selectedRegion);

    filteredMarkers.forEach((marker) => {
      const leafletMarker = L.marker([marker.lat, marker.lng], {
        icon: createCustomIcon(marker.Marca)
      });

      // Crear popup con contenido HTML
      const popupContent = `
        <div class="popup-container">
          <div class="popup-header">
            <img 
              src="${createBrandLogo(marker.Marca)}"
              alt="${marker.Marca}"
              style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;"
              onerror="this.style.display='none'"
            />
            <h3>${marker.nombre}</h3>
          </div>
          <div class="popup-content">
            <div class="popup-data">
              <strong>Marca:</strong> ${marker.Marca}<br />
              <strong>Region:</strong> ${marker.Region}<br />
              <strong>Comuna:</strong> ${marker.Comuna}<br />
              ${marker.direccion ? `<strong>Dirección:</strong> ${marker.direccion}<br />` : ''}
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

      leafletMarker.bindPopup(popupContent, { maxWidth: 300, minWidth: 250 });
      markerClusterGroup.addLayer(leafletMarker);
    });

    map.addLayer(markerClusterGroup);

    console.log(`📍 ${filteredMarkers.length} marcadores renderizados con clustering`);

    return () => {
      if (markerClusterGroup) {
        map.removeLayer(markerClusterGroup);
      }
    };
  }, [map, markers, selectedRegion]);

  return null;
};

export default ClusterMarkers;
