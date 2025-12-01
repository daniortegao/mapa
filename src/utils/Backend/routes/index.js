const express = require('express');
const fileRoutes = require('./fileRoutes');

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'API funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

// Montar rutas de archivos
router.use('/', fileRoutes);

module.exports = router;