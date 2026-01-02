// Configuración de aplicaciones S.I.M.E
export const APP_CONFIGS = {
    resumen: {
        name: 'S.I.M.E Resumen',
        subtitle: 'Sistema Integrado de Mercado y Estrategia',
        port: 3000,
        modules: [
            {
                id: 'mapa',
                label: '🗺️ Mapa',
                type: 'component', // Componente nativo
                defaultActive: true
            },
            {
                id: 'ajuste',
                label: '📊 Ajuste Semanal',
                type: 'iframe',
                port: 3002,
                devUrl: 'http://localhost:3002',
                prodPath: '../Ajuste-Semanal/'
            }
        ]
    },

    gestion: {
        name: 'S.I.M.E Gestión',
        subtitle: 'Sistema Integrado de Mercado y Estrategia',
        port: 3001,
        modules: [
            {
                id: 'calculos',
                label: '🔐 Gestión de Estaciones',
                type: 'iframe',
                port: 3005,
                devUrl: 'http://localhost:3005',
                prodPath: '../Calculos/',
                defaultActive: true,
                requiresAuth: true
            },
            {
                id: 'retail',
                label: '🛒 Retail',
                type: 'iframe',
                port: 3004,
                devUrl: 'http://localhost:3004',
                prodPath: '../Retail/'
            }
        ]
    }
};

// Detectar qué app ejecutar según variable de entorno
export const getCurrentAppConfig = () => {
    const mode = process.env.REACT_APP_SIME_MODE || 'resumen';
    const config = APP_CONFIGS[mode];

    if (!config) {
        console.warn(`Modo desconocido: ${mode}, usando 'resumen' por defecto`);
        return APP_CONFIGS.resumen;
    }

    return config;
};

// Helper para obtener URL de iframe según entorno
export const getModuleUrl = (module) => {
    if (module.type !== 'iframe') return null;

    const isDev = process.env.NODE_ENV === 'development';
    const baseUrl = isDev ? module.devUrl : module.prodPath;

    return `${baseUrl}?mode=embed`;
};
