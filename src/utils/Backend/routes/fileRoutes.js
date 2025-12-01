const express = require('express');
const fileController = require('../controllers/fileController');
const coordenadasController = require('../controllers/coordenadasController');
const fileRoutesConfig = require('../config/fileRoutes');

const router = express.Router();

// Ruta para obtener información de todas las rutas disponibles
router.get('/routes', fileController.getRoutesInfo);
router.get('/routes/category/:category', fileController.getRoutesByCategory);

// ✅ RUTAS ESPECÍFICAS PARA COORDENADAS CORREGIDAS (ANTES del forEach)
router.get('/coordenadas_corregidas_new', coordenadasController.getCoordenadasCorregidas);
router.post('/guardar-coordenadas_corregidas_new', coordenadasController.saveCoordenadaCorregida);

// ✅ RUTAS ESPECÍFICAS PARA NOTAS COMPARTIDAS (NUEVO)
router.get('/notas_compartidas', coordenadasController.getNotasCompartidas);
router.post('/guardar-notas_compartidas', coordenadasController.guardarNotasCompartidas);

// ✅ RUTAS ESPECÍFICAS PARA MARCAS NIVEL 2 (NUEVO)
router.get('/marcas_nivel2', coordenadasController.getMarcasNivel2);
router.post('/guardar-marcas_nivel2', coordenadasController.guardarMarcasNivel2);

// Generar rutas dinámicas desde la configuración
fileRoutesConfig.forEach((route) => {
  // ✅ Saltar rutas específicas
  if (['coordenadas_corregidas_new', 'notas_compartidas', 'marcas_nivel2'].includes(route.name)) return;

  // Ruta para obtener datos (GET)
  router.get(`/${route.name}`, (req, res, next) => {
    req.params.routeName = route.name;
    fileController.getFileData(req, res, next);
  });

  // Ruta para guardar datos (POST)
  router.post(`/guardar-${route.name.toLowerCase()}`, (req, res, next) => {
    req.params.routeName = route.name;
    fileController.saveFileData(req, res, next);
  });
});

module.exports = router;
