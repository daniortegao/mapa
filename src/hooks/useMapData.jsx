import { useState, useEffect } from 'react';

import { getDataFromAPI } from '../services/apiService';

export const useMapData = () => {

const [markers, setMarkers] = useState([]);

const [loading, setLoading] = useState(true);

// Carga inicial desde API

useEffect(() => {

const fetchData = async () => {

try {

console.log('📡 Obteniendo datos desde API...');

const response = await getDataFromAPI();

const data = Array.isArray(response) ? response : (response.data || []);

const formattedData = data.map(item => {

const lat = parseFloat(item.latitud);

const lng = parseFloat(item.longitud);

return {

id: item.id || item.pbl,

pbl: item.pbl,

eds: item.eds,

lat: isNaN(lat) ? -33.8688 : lat,

lng: isNaN(lng) ? -70.9123 : lng,

Marca: item.Marca || 'Unknown',

nombre: item.nombre || item.eds || `Estación ${item.id}`,

precio_g93: item.G93 || 0,

precio_g95: item.G95 || 0,

precio_g97: item.G97 || 0, // ✅ AGREGADO

precio_diesel: item.Diesel || 0,

precio_kero: item.Kerosene || 0, // ✅ AGREGADO

direccion: item.direccion || '',

logo: item.logo || '',

Region: item.Region || '',

Comuna: item.Comuna || '',

Guerra_Precio: item.Guerra_Precio || 'No',

Actualizacion: item.Actualizacion || '',

fecha_aplicacion: item.fecha_aplicacion || '' // ✅ AGREGADO

};

}).filter(m => !isNaN(m.lat) && !isNaN(m.lng));

console.log(`✅ ${formattedData.length} marcadores cargados`);

setMarkers(formattedData);

setLoading(false);

} catch (error) {

console.error("Error loading data:", error);

setLoading(false);

}

};

fetchData();

}, []);

// Polling cada 30 minutos

useEffect(() => {

const interval = setInterval(async () => {

try {

console.log('🔄 Actualizando datos...', new Date().toLocaleTimeString());

const response = await getDataFromAPI();

const data = Array.isArray(response) ? response : (response.data || []);

const formattedData = data.map(item => {

const lat = parseFloat(item.latitud);

const lng = parseFloat(item.longitud);

return {

id: item.id || item.pbl,

pbl: item.pbl,

eds: item.eds,

lat: isNaN(lat) ? -33.8688 : lat,

lng: isNaN(lng) ? -70.9123 : lng,

Marca: item.Marca || 'Unknown',

nombre: item.nombre || item.eds || `Estación ${item.id}`,

precio_g93: item.G93 || 0,

precio_g95: item.G95 || 0,

precio_g97: item.G97 || 0, // ✅ AGREGADO

precio_diesel: item.Diesel || 0,

precio_kero: item.Kerosene || 0, // ✅ AGREGADO

direccion: item.direccion || '',

logo: item.logo || '',

Region: item.Region || '',

Comuna: item.Comuna || '',

Guerra_Precio: item.Guerra_Precio || 'No',

Actualizacion: item.Actualizacion || '',

fecha_aplicacion: item.fecha_aplicacion || '' // ✅ AGREGADO

};

}).filter(m => !isNaN(m.lat) && !isNaN(m.lng));

setMarkers(formattedData);

console.log('✅ Datos actualizados:', formattedData.length);

} catch (error) {

console.error("Error updating data:", error);

}

}, 1800000);

return () => clearInterval(interval);

}, []);

return { markers, loading };

};
