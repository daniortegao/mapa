
// --- Utilidad para obtener la última fila por nivel ---
export function obtenerUltimaFilaPorNivel(nivel, data) {
    const filas = data
        .filter(f => f.nivel && f.nivel.toString().toLowerCase() === nivel.toLowerCase())
        .sort((a, b) => new Date(b.fecha_aplicacion || b.Fecha) - new Date(a.fecha_aplicacion || a.Fecha));
    return filas[0] || null;
}

/*
 * baseHistorico: tu arreglo de datos históricos filtrado (usas markersForMercado || markers, por ejemplo)
 * marker: el marcador que se está usando para el popup actual
 */
export function obtenerDiferenciasNiveles(marker, baseHistorico) {
    const filaNivel1 = obtenerUltimaFilaPorNivel('Nivel 1', baseHistorico.filter(m => m.id === marker.id));
    const filaNivel2 = obtenerUltimaFilaPorNivel('Nivel 2', baseHistorico.filter(m => m.id === marker.id));
    if (!filaNivel1 || !filaNivel2) return null;
    return {
        g93: filaNivel2.g93 - filaNivel1.g93,
        g95: filaNivel2.g95 - filaNivel1.g95,
        g97: filaNivel2.g97 - filaNivel1.g97,
        diesel: filaNivel2.diesel - filaNivel1.diesel,
        kero: filaNivel2.kero - filaNivel1.kero
    };
}

// Normaliza histórico del marker con filtro de nivel
export function obtenerHistoricoMarker(markerId, dataArray, nivel = "Nivel 1") {
    const datos = dataArray.filter(m =>
        m.id === markerId &&
        m.nivel &&
        m.nivel.toLowerCase() === nivel.toLowerCase()
    );

    return datos
        .sort((a, b) => {
            const fechaA = a.fecha_aplicacion ? new Date(a.fecha_aplicacion) : new Date(0);
            const fechaB = b.fecha_aplicacion ? new Date(b.fecha_aplicacion) : new Date(0);
            return fechaB - fechaA;
        })
        .map(item => ({
            fecha: item.fecha_aplicacion || item.Fecha || 'S/F',
            g93: item.precio_g93 || item.G93 || '-',
            g95: item.precio_g95 || item.G95 || '-',
            g97: item.precio_g97 || item.G97 || '-',
            diesel: item.precio_diesel || item.Diesel || '-',
            kero: item.precio_kero || item.Kero || '-'
        }));
}
