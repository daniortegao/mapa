const coordenadasService = require('../services/coordenadasService');

class CoordenadasController {
  async getCoordenadasCorregidas(req, res, next) {
    try {
      console.log('📍 Solicitando coordenadas corregidas...');
      const coordenadas = await coordenadasService.getCoordenadasCorregidas();
      console.log(`✅ Retornando ${coordenadas.length} coordenadas corregidas`);
      res.json(coordenadas);
    } catch (error) {
      console.error('❌ Error al obtener coordenadas:', error);
      next(error);
    }
  }

  async saveCoordenadaCorregida(req, res, next) {
    try {
      const nuevaCoordenada = req.body;

      console.log('💾 Recibiendo coordenada para guardar:', nuevaCoordenada);

      if (!nuevaCoordenada || Object.keys(nuevaCoordenada).length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Datos vacíos o inválidos'
        });
      }

      const coordenadaGuardada = await coordenadasService.saveCoordenadaCorregida(nuevaCoordenada);

      console.log('✅ Coordenada guardada exitosamente');

      res.json({
        success: true,
        message: 'Coordenada guardada correctamente',
        data: coordenadaGuardada
      });
    } catch (error) {
      console.error('❌ Error al guardar coordenada:', error);
      next(error);
    }
  }

  // ✅ NUEVAS FUNCIONES PARA NOTAS COMPARTIDAS
  async getNotasCompartidas(req, res, next) {
    try {
      console.log('📝 Solicitando notas compartidas...');
      const notas = await coordenadasService.getNotasCompartidas();
      console.log(`✅ Retornando notas compartidas`);
      res.json(notas);
    } catch (error) {
      console.error('❌ Error al obtener notas:', error);
      next(error);
    }
  }

  async guardarNotasCompartidas(req, res, next) {
    try {
      const { contenido } = req.body;

      console.log('💾 Recibiendo notas para guardar');

      const notasGuardadas = await coordenadasService.guardarNotasCompartidas(contenido);

      console.log('✅ Notas guardadas exitosamente');

      res.json({
        success: true,
        message: 'Notas guardadas correctamente',
        data: notasGuardadas
      });
    } catch (error) {
      console.error('❌ Error al guardar notas:', error);
      next(error);
    }
  }

  // ✅ NUEVAS FUNCIONES PARA MARCAS NIVEL 2
  async getMarcasNivel2(req, res, next) {
    try {
      console.log('📍 Solicitando marcas nivel 2...');
      const marcas = await coordenadasService.getMarcasNivel2();
      console.log(`✅ Retornando ${marcas.length} marcas nivel 2`);
      res.json(marcas);
    } catch (error) {
      console.error('❌ Error al obtener marcas nivel 2:', error);
      next(error);
    }
  }

  async guardarMarcasNivel2(req, res, next) {
    try {
      const { marcas } = req.body;

      console.log('💾 Recibiendo marcas nivel 2 para guardar:', marcas);

      const marcasGuardadas = await coordenadasService.guardarMarcasNivel2(marcas);

      console.log('✅ Marcas nivel 2 guardadas exitosamente');

      res.json({
        success: true,
        message: 'Marcas guardadas correctamente',
        data: marcasGuardadas
      });
    } catch (error) {
      console.error('❌ Error al guardar marcas nivel 2:', error);
      next(error);
    }
  }
}

module.exports = new CoordenadasController();