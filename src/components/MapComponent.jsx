import React from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import IconMarkersLayer from './IconMarkersLayer';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const MapComponent = ({ 
  selectedRegion, 
  regionCenter, 
  markers = [], 
  baseCompData = [],
  markersForMercado = [], // ✅ Recibir array SIN filtro EDS
  selectedEds = null, // ✅ Recibir EDS seleccionado
}) => {
  const mapCenter = regionCenter || [-33.4474107, -70.5518946];

  return (
    <MapContainer
      center={mapCenter}
      zoom={9}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
      key={selectedRegion}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={18}
      />
      
      {markers && markers.length > 0 && (
        <IconMarkersLayer 
          markers={markers} 
          markersForMercado={markersForMercado} // ✅ Pasar array sin EDS
          selectedRegion={selectedRegion}
          baseCompData={baseCompData}
          selectedEds={selectedEds} // ✅ Pasar EDS
          
        />
      )}
    </MapContainer>
  );
};

export default MapComponent;
