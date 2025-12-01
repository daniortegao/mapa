const fileService = require('../services/fileService');
const fileRoutes = require('../config/fileRoutes');

class FileController {
    async getFileData(req, res, next) {
        try {
            const { routeName } = req.params;
            const routeConfig = fileRoutes.find(route => route.name === routeName);
            
            if (!routeConfig) {
                return res.status(404).json({ error: 'Ruta no encontrada' });
            }

            const filePath = fileService.getFilePath(routeConfig.subPath);
            const data = await fileService.getDataFromFile(filePath);
            
            // Devuelve directamente los datos sin wrapper
            res.json(data);
        } catch (error) {
            next(error);
        }
    }

    async saveFileData(req, res, next) {
        try {
            const { routeName } = req.params;
            const newData = req.body;
            
            const routeConfig = fileRoutes.find(route => route.name === routeName);
            
            if (!routeConfig) {
                return res.status(404).json({ error: 'Ruta no encontrada' });
            }

            if (!newData || Object.keys(newData).length === 0) {
                return res.status(400).json({ error: 'Datos vacíos o inválidos' });
            }

            const filePath = fileService.getFilePath(routeConfig.subPath);
            await fileService.saveDataToFile(filePath, newData);
            
            res.json({
                success: true,
                message: `Datos guardados en ${routeConfig.name} exitosamente`,
                data: newData
            });
        } catch (error) {
            next(error);
        }
    }

    async getRoutesInfo(req, res, next) {
        try {
            const routes = await fileService.getAllRoutes();
            res.json({
                success: true,
                routes: routes,
                total: routes.length
            });
        } catch (error) {
            next(error);
        }
    }

    async getRoutesByCategory(req, res, next) {
        try {
            const { category } = req.params;
            const fileRoutes = require('../config/fileRoutes');
            const filteredRoutes = fileRoutes.filter(route => route.category === category);
            
            res.json({
                success: true,
                category: category,
                routes: filteredRoutes.map(route => ({
                    name: route.name,
                    endpoints: {
                        get: `/${route.name}`,
                        post: `/guardar-${route.name.toLowerCase()}`
                    }
                })),
                count: filteredRoutes.length
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new FileController();