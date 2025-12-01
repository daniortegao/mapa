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

// ✅ Obtener coordenadas corregidas
export const getCoordenadasCorregidas = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/coordenadas_corregidas_new`);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log('📍 No hay coordenadas corregidas aún (archivo vacío)');
      return [];
    }
    console.error('Error al obtener coordenadas corregidas:', error);
    return [];
  }
};

// ✅ Guardar coordenada corregida
export const guardarCoordenadaCorregida = async (coordenada) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/guardar-coordenadas_corregidas_new`,
      coordenada
    );
    return response.data;
  } catch (error) {
    console.error('Error al guardar coordenada corregida:', error);
    throw error;
  }
};

// ✅ Obtener notas compartidas
export const getNotasCompartidas = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/notas_compartidas`);
    // Si el archivo está vacío o no existe, retornar string vacío
    if (!response.data || response.data === '') {
      return '';
    }
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log('📝 No hay notas compartidas aún (archivo vacío)');
      return '';
    }
    console.error('Error al obtener notas compartidas:', error);
    return '';
  }
};

// ✅ Guardar notas compartidas
export const guardarNotasCompartidas = async (notas) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/guardar-notas_compartidas`,
      { contenido: notas }
    );
    return response.data;
  } catch (error) {
    console.error('Error al guardar notas compartidas:', error);
    throw error;
  }
};

export const getMercadoAlerta = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/Mercado_Alerta`);
    if (response.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    return [];
  } catch (error) {
    console.error('Error al obtener Mercado_Alerta:', error);
    return [];
  }
};

export const getHistoricoAlerta = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/Historico_alerta`);
    if (response.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    return [];
  } catch (error) {
    console.error('Error al obtener Historico_alerta:', error);
    return [];
  }
};

export const getDataBaseguerra = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/Mercado_Guerra`);
    return response.data;
  } catch (error) {
    console.error("Error al obtener datos desde la API (Mercado_Guerra):", error);
    throw error;
  }
};

export const getDataBaseajuste = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/Base_Ajuste`);
    return response.data;
  } catch (error) {
    console.error("Error al obtener datos desde la API (Base_Ajuste):", error);
    throw error;
  }
};

// ✅ Obtener marcas compartidas (Nivel 2)
export const getMarcasCompartidas = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/marcas_nivel2`);
    // Si retorna un array directamente
    if (Array.isArray(response.data)) {
      return response.data;
    }
    // Si retorna un objeto con data
    if (response.data && Array.isArray(response.data.data)) {
      return response.data.data;
    }
    return [];
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log('📍 No hay marcas compartidas aún');
      return [];
    }
    console.error('Error al obtener marcas compartidas:', error);
    return [];
  }
};

// ✅ Guardar marcas compartidas (Nivel 2)
export const guardarMarcasCompartidas = async (marcas) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/guardar-marcas_nivel2`,
      { marcas: marcas } // Enviamos como objeto JSON
    );
    return response.data;
  } catch (error) {
    console.error('Error al guardar marcas compartidas:', error);
    throw error;
  }
};