const fs = require('fs').promises;
const path = require('path');
const { BASE_PATH } = require('../config/constants');

class FileService {
    constructor() {
        this.basePath = BASE_PATH;
    }

    getFilePath(subPath) {
        return path.join(this.basePath, subPath);
    }

    async getDataFromFile(filePath) {
        try {
            const data = await fs.readFile(filePath, 'utf8');
            if (!data.trim()) return [];
            return JSON.parse(data);
        } catch (err) {
            if (err.code === 'ENOENT') {
                await this.saveDataToFile(filePath, []);
                return [];
            }
            console.error(`Error al leer el archivo JSON (${filePath}):`, err);
            throw new Error(`Error al leer el archivo: ${err.message}`);
        }
    }

    async saveDataToFile(filePath, newData) {
        try {
            let currentData = [];
            try {
                currentData = await this.getDataFromFile(filePath);
            } catch (error) {
                currentData = [];
            }

            if (!Array.isArray(currentData)) currentData = [];
            
            const filteredData = currentData.filter(item => item.id !== newData.id);
            const updatedData = [...filteredData, newData];
            
            await fs.writeFile(filePath, JSON.stringify(updatedData, null, 2), 'utf8');
            return updatedData;
        } catch (err) {
            console.error(`Error al guardar los datos en el archivo JSON (${filePath}):`, err);
            throw new Error(`Error al guardar el archivo: ${err.message}`);
        }
    }

    async getAllRoutes() {
        const fileRoutes = require('../config/fileRoutes');
        return fileRoutes.map(route => ({
            name: route.name,
            category: route.category,
            endpoints: {
                get: `/${route.name}`,
                post: `/guardar-${route.name.toLowerCase()}`
            }
        }));
    }
}

module.exports = new FileService();