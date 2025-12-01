
const fs = require('fs').promises;
const path = require('path');
const fs = require('fs').promises;
const path = require('path');
const { BASE_PATH } = require('../config/constants');

class CoordenadasService {
  constructor() {
    this.basePath = BASE_PATH;
    this.filePath = path.join(this.basePath, 'Bases\\Bases Pricemax\\coordenadas_corregidas_new.json');
    this.notasFilePath = path.join(this.basePath, 'Bases\\Notas\\notas_compartidas.json');
    this.marcasNivel2FilePath = path.join(this.basePath, 'Bases\\Notas\\marcas_nivel2.json');
  }

  async getCoordenadasCorregidas() {
    try {
      const data = await fs.readFile(this.filePath, 'utf8');
      if (!data.trim()) return [];
      return JSON.parse(data);
    } catch (err) {
      if (err.code === 'ENOENT') {
        // Crear archivo vacío si no existe
        await this.saveCoordenadasCorregidas([]);
        return [];
      }
      console.error('Error al leer coordenadas corregidas:', err);
      throw new Error(`Error al leer archivo: ${err.message}`);
    }
  }

  async saveCoordenadasCorregidas(data) {
    try {
      // Crear directorio si no existe
      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });

      await fs.writeFile(this.filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.error('Error al guardar coordenadas corregidas:', err);
      throw new Error(`Error al guardar archivo: ${err.message}`);
    }
  }

  async saveCoordenadaCorregida(nuevaCoordenada) {
    try {
      // Validar datos requeridos
      if (!nuevaCoordenada.pbl || !nuevaCoordenada.lat_corregida || !nuevaCoordenada.lon_corregida) {
        throw new Error('Faltan campos requeridos: pbl, lat_corregida, lon_corregida');
      }

      // Leer datos actuales
      let coordenadas = await this.getCoordenadasCorregidas();

      // Buscar si ya existe por PBL
      const index = coordenadas.findIndex(c => c.pbl === nuevaCoordenada.pbl);

      const coordenadaCompleta = {
        id: nuevaCoordenada.id || nuevaCoordenada.pbl,
        pbl: nuevaCoordenada.pbl,
        eds: nuevaCoordenada.eds || '',
        marca: nuevaCoordenada.marca || '',
        comuna: nuevaCoordenada.comuna || '',
        lat_corregida: parseFloat(nuevaCoordenada.lat_corregida),
        lon_corregida: parseFloat(nuevaCoordenada.lon_corregida),
        fecha_correccion: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (index !== -1) {
        // Actualizar existente
        coordenadas[index] = coordenadaCompleta;
        console.log(`✅ Coordenada actualizada para PBL: ${nuevaCoordenada.pbl}`);
      } else {
        // Agregar nuevo
        coordenadas.push(coordenadaCompleta);
        console.log(`✅ Nueva coordenada agregada para PBL: ${nuevaCoordenada.pbl}`);
      }

      // Guardar archivo
      await this.saveCoordenadasCorregidas(coordenadas);

      return coordenadaCompleta;
    } catch (err) {
      console.error('Error al guardar coordenada:', err);
      throw err;
    }
  }

  // ✅ NUEVAS FUNCIONES PARA NOTAS COMPARTIDAS
  async getNotasCompartidas() {
    try {
      const data = await fs.readFile(this.notasFilePath, 'utf8');
      if (!data.trim()) return '';
      // Las notas se guardan como string JSON, así que parseamos y retornamos
      return JSON.parse(data);
    } catch (err) {
      if (err.code === 'ENOENT') {
        // Crear archivo vacío si no existe
        await this.guardarNotasCompartidas('');
        return '';
      }
      console.error('Error al leer notas compartidas:', err);
      throw new Error(`Error al leer archivo de notas: ${err.message}`);
    }
  }

  async guardarNotasCompartidas(contenido) {
    try {
      // Crear directorio si no existe
      const dir = path.dirname(this.notasFilePath);
      await fs.mkdir(dir, { recursive: true });

      // Guardar el contenido como string JSON
      await fs.writeFile(this.notasFilePath, JSON.stringify(contenido || ''), 'utf8');

      return contenido;
    } catch (err) {
      console.error('Error al guardar notas compartidas:', err);
      throw new Error(`Error al guardar archivo de notas: ${err.message}`);
    }
  }

  // ✅ NUEVAS FUNCIONES PARA MARCAS NIVEL 2
  async getMarcasNivel2() {
    try {
      const data = await fs.readFile(this.marcasNivel2FilePath, 'utf8');
      if (!data.trim()) return [];
      return JSON.parse(data);
    } catch (err) {
      if (err.code === 'ENOENT') {
        // Crear archivo vacío si no existe
        await this.guardarMarcasNivel2([]);
        return [];
      }
      console.error('Error al leer marcas nivel 2:', err);
      throw new Error(`Error al leer archivo de marcas: ${err.message}`);
    }
  }

  async guardarMarcasNivel2(marcas) {
    try {
      // Crear directorio si no existe
      const dir = path.dirname(this.marcasNivel2FilePath);
      await fs.mkdir(dir, { recursive: true });

      // Guardar el contenido como JSON
      await fs.writeFile(this.marcasNivel2FilePath, JSON.stringify(marcas || [], null, 2), 'utf8');

      return marcas;
    } catch (err) {
      console.error('Error al guardar marcas nivel 2:', err);
      throw new Error(`Error al guardar archivo de marcas: ${err.message}`);
    }
  }
}

module.exports = new CoordenadasService();