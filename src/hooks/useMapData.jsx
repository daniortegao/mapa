import { useState, useEffect } from 'react';
import { getDataFromAPI, getCoordenadasCorregidas } from '../services/apiService';

export const useMapData = () => {
  const [markers, setMarkers] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ Función auxiliar para formatear con coordenadas corregidas
  const formatMarkerData = (data, coordenadasCorregidas = []) => {
    return data.map(item => {
      // ✅ Buscar coordenada corregida por PBL o ID
      const coordCorregida = coordenadasCorregidas.find(
        c => c.pbl === item.pbl || c.id === item.id
      );

      // ✅ Usar corregida si existe, sino usar original
      const lat = parseFloat(coordCorregida?.lat_corregida || item.latitud);
      const lng = parseFloat(coordCorregida?.lon_corregida || item.longitud);

      return {
        id: item.id || item.pbl,
        pbl: item.pbl,
        eds: item.eds,
        lat: isNaN(lat) ? -33.8688 : lat,
        lng: isNaN(lng) ? -70.9123 : lng,
        lat_original: parseFloat(item.latitud),
        lng_original: parseFloat(item.longitud),
        Marca: item.Marca || 'Unknown',
        nombre: item.nombre || item.eds || `Estación ${item.id}`,
        precio_g93: item.G93 || 0,
        precio_g95: item.G95 || 0,
        precio_g97: item.G97 || 0,
        precio_diesel: item.Diesel || 0,
        precio_kero: item.Kerosene || 0,
        direccion: item.direccion || '',
        logo: item.logo || '',
        Region: item.Region || '',
        Comuna: item.Comuna || '',
        Guerra_Precio: item.Guerra_Precio || 'No',
        Actualizacion: item.Actualizacion || '',
        fecha_aplicacion: item.fecha_aplicacion || '',
        Surtidores_Autoservicio: item.Surtidores_Autoservicio || null,
    Posicion_Surtidor: item.Posicion_Surtidor || null,
    Tipo_Isla: item.Tipo_Isla || null

      };
    }).filter(m => !isNaN(m.lat) && !isNaN(m.lng));
  };

  // Carga inicial desde API
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('📡 Obteniendo datos desde API...');
        
        // ✅ Cargar coordenadas corregidas
        let coordCorregidas = [];
        try {
          coordCorregidas = await getCoordenadasCorregidas();
          console.log(`📍 ${coordCorregidas.length} coordenadas corregidas cargadas`);
        } catch (error) {
          console.warn('⚠️ No se pudieron cargar coordenadas corregidas');
        }

        const response = await getDataFromAPI();
        const data = Array.isArray(response) ? response : (response.data || []);
        
        const formattedData = formatMarkerData(data, coordCorregidas);
        
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
        
        let coordCorregidas = [];
        try {
          coordCorregidas = await getCoordenadasCorregidas();
        } catch (error) {
          console.warn('⚠️ No se pudieron actualizar coordenadas corregidas');
        }

        const response = await getDataFromAPI();
        const data = Array.isArray(response) ? response : (response.data || []);
        
        const formattedData = formatMarkerData(data, coordCorregidas);
        
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
