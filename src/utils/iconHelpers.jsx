import L from 'leaflet';
import { ICON_MAP } from './constants';

export const getIconForMarca = (marca) => {
  return ICON_MAP[marca] || 'default.jpg';
};

export const createCustomIcon = (marca, publicUrl = process.env.PUBLIC_URL) => {
  const iconUrl = getIconForMarca(marca);
  
  return L.icon({
    iconUrl: `${publicUrl}/iconos/${iconUrl}`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
    shadowSize: [41, 41],
    shadowAnchor: [13, 41]
  });
};

export const createBrandLogo = (marca, publicUrl = process.env.PUBLIC_URL) => {
  const iconUrl = getIconForMarca(marca);
  return `${publicUrl}/iconos/${iconUrl}`;
};
