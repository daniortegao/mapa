const fileRoutes = [
    // Rutas de Volumen
    { name: 'Base_Volumen_19', subPath: "Bases\\Base BI\\Volumen Margen\\Volumen\\Base_Volumen_2019.json", category: 'volumen' },
    { name: 'Base_Volumen_20', subPath: "Bases\\Base BI\\Volumen Margen\\Volumen\\Base_Volumen_2020.json", category: 'volumen' },
    { name: 'Base_Volumen_21', subPath: "Bases\\Base BI\\Volumen Margen\\Volumen\\Base_Volumen_2021.json", category: 'volumen' },
    { name: 'Base_Volumen_22', subPath: "Bases\\Base BI\\Volumen Margen\\Volumen\\Base_Volumen_2022.json", category: 'volumen' },
    { name: 'Base_Volumen_23', subPath: "Bases\\Base BI\\Volumen Margen\\Volumen\\Base_Volumen_2023.json", category: 'volumen' },
    { name: 'Base_Volumen_24', subPath: "Bases\\Base BI\\Volumen Margen\\Volumen\\Base_Volumen_2024.json", category: 'volumen' },
    { name: 'Base_Volumen_25', subPath: "Bases\\Base BI\\Volumen Margen\\Volumen\\Base_Volumen_2025.json", category: 'volumen' },
    
    // Rutas de Margen
    { name: 'Base_Margen_19', subPath: "Bases\\Base BI\\Volumen Margen\\Margen\\Base_Margen_2019.json", category: 'margen' },
    { name: 'Base_Margen_20', subPath: "Bases\\Base BI\\Volumen Margen\\Margen\\Base_Margen_2020.json", category: 'margen' },
    { name: 'Base_Margen_21', subPath: "Bases\\Base BI\\Volumen Margen\\Margen\\Base_Margen_2021.json", category: 'margen' },
    { name: 'Base_Margen_22', subPath: "Bases\\Base BI\\Volumen Margen\\Margen\\Base_Margen_2022.json", category: 'margen' },
    { name: 'Base_Margen_23', subPath: "Bases\\Base BI\\Volumen Margen\\Margen\\Base_Margen_2023.json", category: 'margen' },
    { name: 'Base_Margen_24', subPath: "Bases\\Base BI\\Volumen Margen\\Margen\\Base_Margen_2024.json", category: 'margen' },
    { name: 'Base_Margen_25', subPath: "Bases\\Base BI\\Volumen Margen\\Margen\\Base_Margen_2025.json", category: 'margen' },
    
    // Otras rutas
    { name: 'base_Precio_publicado', subPath: "Bases\\Margen\\Margen Revendedores\\Basepreciospublicados.json", category: 'precios' },
    { name: 'base_eds', subPath: "Bases\\Bases Pricemax\\basepreciosurtidornew.json", category: 'pricemax' },
    { name: 'base_comp', subPath: "Bases\\Bases Pricemax\\basecompetencianew.json", category: 'pricemax' },
    { name: 'Estaciones', subPath: "Bases\\Base BI\\Volumen Margen\\Estaciones.json", category: 'estaciones' },
    { name: 'coordenadas_corregidas', subPath: "Bases\\Bases Pricemax\\coordenadas_corregidas.json", category: 'geolocalizacion' },
    { name: 'Historico_Alerta', subPath: "Bases\\Base Mercado\\Mercado_Base_Alerta_Historico.json", category: 'mercado' },
    { name: 'Mercado_Alerta', subPath: "Bases\\Base Mercado\\Mercado_Base_Alerta.json", category: 'mercado' },
    { name: 'Mercado_Guerra', subPath: "Bases\\Base Mercado\\Mercado_Guerra.json", category: 'mercado' },
	{ name: 'Base_Ajuste', subPath: "Bases\\Base_Ajuste_Cne\\Base_Ajuste_Autoservicio.json", category: 'mercado' },
	{ name: 'Base_ultimo_precio_marker', subPath: "Bases\\Base Mercado\\Baseultimopreciomarker.json", category: 'mercado' },
	{ name: 'Base_ultimo_precio_Surtidor', subPath: "Bases\\Base Mercado\\Baseultimopreciosurtidor.json", category: 'mercado' },
	 
  // ✅ NUEVA RUTA: Coordenadas corregidas
  { name: 'coordenadas_corregidas_new', subPath: "Bases\\Bases Pricemax\\coordenadas_corregidas_new.json", category: 'geolocalizacion' }
];


module.exports = fileRoutes;