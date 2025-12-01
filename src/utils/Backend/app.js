const express = require('express');
const cors = require('cors');
const { PORT } = require('./config/constants');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

class App {
    constructor() {
        this.app = express();
        this.port = PORT;
        
        this.initializeMiddlewares();
        this.initializeRoutes();
        this.initializeErrorHandling();
    }

    initializeMiddlewares() {
        this.app.use(cors());
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));
        
        // Logger de requests
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    initializeRoutes() {
        this.app.use(routes);
        
        // Manejar rutas no encontradas
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                error: 'Ruta no encontrada',
                available: `${req.protocol}://${req.get('host')}/api/routes`
            });
        });
    }

    initializeErrorHandling() {
        this.app.use(errorHandler);
    }

    listen() {
        this.app.listen(this.port, () => {
            console.log(`🚀 Servidor iniciado en el puerto ${this.port}`);
            console.log(`📊 API disponible en: http://localhost:${this.port}/`);
            console.log(`🔍 Rutas disponibles en: http://localhost:${this.port}/routes`);
        });
    }
}

module.exports = App;