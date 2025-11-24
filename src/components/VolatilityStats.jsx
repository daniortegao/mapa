import React, { useMemo } from 'react';

const VolatilityStats = ({ markers }) => {
    const volatilityData = useMemo(() => {
        if (!markers || markers.length === 0) {
            console.log('VolatilityStats: No markers');
            return null;
        }

        console.log('VolatilityStats: Processing', markers.length, 'markers');
        const brandPriceHistory = {};

        // Group markers by brand and PBL to track price changes over time
        markers.forEach(m => {
            const brand = m.Marca || 'Otras';
            const pbl = m.pbl;
            const fecha = m.fecha_aplicacion;

            if (!brandPriceHistory[brand]) {
                brandPriceHistory[brand] = {};
            }
            if (!brandPriceHistory[brand][pbl]) {
                brandPriceHistory[brand][pbl] = [];
            }

            brandPriceHistory[brand][pbl].push({
                fecha,
                g93: parseFloat(m.precio_g93 || m.G93) || null
            });
        });

        console.log('VolatilityStats: Brand history:', Object.keys(brandPriceHistory));

        // Calculate volatility metrics for each brand
        const volatilityStats = {};
        Object.keys(brandPriceHistory).forEach(brand => {
            const stations = brandPriceHistory[brand];
            let totalChanges = 0;
            let totalMagnitude = 0;
            let allPrices = [];
            let stationCount = 0;
            let stationsWithHistory = 0;

            Object.keys(stations).forEach(pbl => {
                const history = stations[pbl].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

                // Count all stations, not just those with multiple entries
                stationCount++;

                // Collect all prices for std dev calculation
                history.forEach(h => {
                    if (h.g93 !== null) {
                        allPrices.push(h.g93);
                    }
                });

                // Count price changes only if there's history
                if (history.length > 1) {
                    stationsWithHistory++;
                    for (let i = 1; i < history.length; i++) {
                        if (history[i].g93 !== null && history[i - 1].g93 !== null) {
                            const change = Math.abs(history[i].g93 - history[i - 1].g93);
                            if (change > 0.5) { // Consider changes > 0.5 as significant
                                totalChanges++;
                                totalMagnitude += change;
                            }
                        }
                    }
                }
            });

            if (stationCount > 0 && allPrices.length > 0) {
                // Calculate standard deviation
                const mean = allPrices.reduce((sum, p) => sum + p, 0) / allPrices.length;
                const variance = allPrices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / allPrices.length;
                const stdDev = Math.sqrt(variance);

                volatilityStats[brand] = {
                    changeFrequency: stationsWithHistory > 0 ? totalChanges / stationsWithHistory : 0,
                    avgMagnitude: totalChanges > 0 ? totalMagnitude / totalChanges : 0,
                    stdDev: stdDev,
                    stationCount: stationCount,
                    stationsWithHistory: stationsWithHistory
                };
            }
        });

        console.log('VolatilityStats: Final stats:', volatilityStats);
        return volatilityStats;
    }, [markers]);

    if (!volatilityData || Object.keys(volatilityData).length === 0) {
        return <div className="stats-empty">Sin datos de volatilidad</div>;
    }

    return (
        <div className="volatility-container">
            <h4 className="stats-title">Volatilidad de Precios (G93)</h4>
            <div className="volatility-grid">
                {Object.keys(volatilityData)
                    .sort((a, b) => volatilityData[b].changeFrequency - volatilityData[a].changeFrequency)
                    .map(brand => {
                        const vol = volatilityData[brand];
                        return (
                            <div key={brand} className="volatility-card">
                                <div className="volatility-brand">{brand}</div>
                                <div className="volatility-metrics">
                                    <div className="volatility-metric">
                                        <span className="metric-label">Cambios/Estación:</span>
                                        <span className="metric-value">{vol.changeFrequency.toFixed(1)}</span>
                                    </div>
                                    <div className="volatility-metric">
                                        <span className="metric-label">Magnitud Prom:</span>
                                        <span className="metric-value">${vol.avgMagnitude.toFixed(0)}</span>
                                    </div>
                                    <div className="volatility-metric">
                                        <span className="metric-label">Desv. Estándar:</span>
                                        <span className="metric-value">${vol.stdDev.toFixed(0)}</span>
                                    </div>
                                    <div className="volatility-metric">
                                        <span className="metric-label">Estaciones:</span>
                                        <span className="metric-value">{vol.stationCount} ({vol.stationsWithHistory} con historial)</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
};

export default VolatilityStats;
