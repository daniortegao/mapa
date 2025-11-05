import axios from 'axios';

const BASE_URL = 'http://de250329:4000';

// Función para obtener datos desde la ruta base_eds
export const getDataFromAPI = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/base_eds`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener datos desde la API (base_eds):', error);
    throw error;
  }
};

export const getDataBaseComp = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/base_comp`);
    return response.data;
  } catch (error) {
    console.error("Error al obtener datos desde la API (base_comp):", error);
    throw error;
  }
};

// Obtener coordenadas corregidas
export const getCoordenadasCorregidas = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/coordenadas_corregidas`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error('Error al obtener coordenadas corregidas:', error);
    return [];
  }
};

// Guardar coordenada corregida
export const guardarCoordenadaCorregida = async (coordenada) => {
  try {
    await axios.post(`${BASE_URL}/guardar-coordenadas_corregidas`, coordenada);
  } catch (error) {
    console.error('Error al guardar coordenada corregida:', error);
    throw error;
  }
};
