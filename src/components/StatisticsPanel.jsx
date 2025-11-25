import React, { useMemo, useState } from 'react';
import '../styles/statisticsPanel.css';
import ComunaRanking from './ComunaRanking';

const StatisticsPanel = ({ markers, historicalMarkers, allMarkers }) => {
    const [calculationMode, setCalculationMode] = useState('average'); // 'average' or 'median'
    const [scopeMode, setScopeMode] = useState('regional'); // 'regional' or 'national'
    const [expandedSections, setExpandedSections] = useState({
        brands: false,
        prices: false,
        comunas: false
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const stats = useMemo(() => {
        // Use allMarkers for national scope, markers for regional scope
        const dataSource = scopeMode === 'national' ? allMarkers : markers;
        if (!dataSource || dataSource.length === 0) return null;

        const brands = {};
        const fuels = ['precio_g93', 'precio_g95', 'precio_g97', 'precio_diesel', 'precio_kero'];
        const fuelLabels = {
            'precio_g93': '93',
            'precio_g95': '95',
            'precio_g97': '97',
            'precio_diesel': 'Diesel',
            'precio_kero': 'Kero'
        };

        const globalMinMax = {};
        fuels.forEach(f => {
            globalMinMax[f] = { min: Infinity, max: -Infinity, minStation: null, maxStation: null };
        });

        dataSource.forEach(m => {
            const brandName = m.Marca || 'Otras';
            // Rename "Unknown" to "Blanco"
            const brand = brandName === 'Unknown' ? 'Blanco' : brandName;

            if (!brands[brand]) {
                brands[brand] = {
                    uniqueStations: new Set(), // Track unique stations
                    totals: {},
                    counts: {},
                    prices: {}
                };
                fuels.forEach(f => {
                    brands[brand].totals[f] = 0;
                    brands[brand].counts[f] = 0;
                    brands[brand].prices[f] = [];
                });
            }

            // Track unique stations using pbl or lat/lng as identifier
            const stationId = m.pbl || m.id || `${m.lat}_${m.lng}`;
            brands[brand].uniqueStations.add(stationId);

            fuels.forEach(f => {
                // Handle different field names if necessary (based on markerUtils)
                // markerUtils uses: precio_g93 || G93
                let val = m[f];
                if (val === undefined || val === null || val === '-') {
                    // Try capitalized
                    const cap = f.replace('precio_', '').replace('g', 'G').replace('d', 'D').replace('k', 'K');
                    val = m[cap];
                }

                const price = parseFloat(val);
                if (!isNaN(price) && price > 0) {
                    brands[brand].totals[f] += price;
                    brands[brand].counts[f]++;
                    brands[brand].prices[f].push(price); // Store all prices for median

                    // Min/Max
                    if (price < globalMinMax[f].min) {
                        globalMinMax[f].min = price;
                        globalMinMax[f].minStation = m;
                    }
                    if (price > globalMinMax[f].max) {
                        globalMinMax[f].max = price;
                        globalMinMax[f].maxStation = m;
                    }
                }
            });
        });

        // Calculate Averages and Medians
        const brandStats = Object.keys(brands).map(b => {
            const avgs = {};
            const medians = {};
            fuels.forEach(f => {
                // Average
                avgs[f] = brands[b].counts[f] > 0 ? (brands[b].totals[f] / brands[b].counts[f]).toFixed(0) : '-';

                // Median
                const prices = brands[b].prices[f].sort((a, b) => a - b);
                if (prices.length === 0) {
                    medians[f] = '-';
                } else {
                    const mid = Math.floor(prices.length / 2);
                    if (prices.length % 2 !== 0) {
                        medians[f] = prices[mid];
                    } else {
                        medians[f] = Math.round((prices[mid - 1] + prices[mid]) / 2);
                    }
                }
            });
            return {
                brand: b,
                count: brands[b].uniqueStations.size, // Use unique station count
                averages: avgs,
                medians: medians
            };
        });

        return { brandStats, globalMinMax, fuelLabels };
    }, [markers, allMarkers, scopeMode]);

    if (!stats) return <div className="stats-empty">Sin datos para mostrar</div>;

    const { brandStats, globalMinMax, fuelLabels } = stats;

    return (
        <div className="statistics-panel">
            {/* Sección Resumen por Marca */}
            <div className="stats-section">
                <div className="stats-header-row" onClick={() => toggleSection('brands')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`accordion-icon ${expandedSections.brands ? 'open' : ''}`}>▼</span>
                        <h4 className="stats-title">Resumen</h4>
                    </div>

                    {expandedSections.brands && (
                        <div className="toggle-container" onClick={(e) => e.stopPropagation()}>
                            {/* Scope Toggle */}
                            <span className={`toggle-label ${scopeMode === 'regional' ? 'active' : ''}`}>Regional</span>
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    checked={scopeMode === 'national'}
                                    onChange={() => setScopeMode(prev => prev === 'regional' ? 'national' : 'regional')}
                                />
                                <span className="slider round"></span>
                            </label>
                            <span className={`toggle-label ${scopeMode === 'national' ? 'active' : ''}`}>Nacional</span>

                            {/* Separator */}
                            <div style={{ width: '1px', height: '20px', background: '#dee2e6', margin: '0 12px' }}></div>

                            {/* Calculation Mode Toggle */}
                            <span className={`toggle-label ${calculationMode === 'average' ? 'active' : ''}`}>Prom</span>
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    checked={calculationMode === 'median'}
                                    onChange={() => setCalculationMode(prev => prev === 'average' ? 'median' : 'average')}
                                />
                                <span className="slider round"></span>
                            </label>
                            <span className={`toggle-label ${calculationMode === 'median' ? 'active' : ''}`}>Media</span>
                        </div>
                    )}
                </div>

                {expandedSections.brands && (
                    <div className="stats-table-container slide-down">
                        <table className="stats-table">
                            <thead>
                                <tr>
                                    <th>Marca</th>
                                    <th>93</th>
                                    <th>95</th>
                                    <th>97</th>
                                    <th>Die</th>
                                    <th>Kero</th>
                                </tr>
                            </thead>
                            <tbody>
                                {brandStats.map(b => (
                                    <tr key={b.brand}>
                                        <td>
                                            <div className="brand-cell-inline">
                                                <span className="brand-name">{b.brand}</span>
                                                <span className="brand-count">({b.count})</span>
                                            </div>
                                        </td>
                                        <td>{calculationMode === 'average' ? b.averages['precio_g93'] : b.medians['precio_g93']}</td>
                                        <td>{calculationMode === 'average' ? b.averages['precio_g95'] : b.medians['precio_g95']}</td>
                                        <td>{calculationMode === 'average' ? b.averages['precio_g97'] : b.medians['precio_g97']}</td>
                                        <td>{calculationMode === 'average' ? b.averages['precio_diesel'] : b.medians['precio_diesel']}</td>
                                        <td>{calculationMode === 'average' ? b.averages['precio_kero'] : b.medians['precio_kero']}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Sección Rango de Precios */}
            <div className="stats-section">
                <div className="stats-header-row" onClick={() => toggleSection('prices')} style={{ cursor: 'pointer', borderBottom: expandedSections.prices ? '2px solid #02d6a8' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`accordion-icon ${expandedSections.prices ? 'open' : ''}`}>▼</span>
                        <h4 className="stats-title">Rango de Precios (Min / Max)</h4>
                    </div>
                </div>

                {expandedSections.prices && (
                    <div className="slide-down">
                        {Object.keys(fuelLabels).map(key => {
                            const info = globalMinMax[key];
                            if (info.min === Infinity) return null;
                            return (
                                <div key={key} className="price-range-card">
                                    <div className="price-range-header">
                                        <span className="fuel-badge">{fuelLabels[key]}</span>
                                    </div>
                                    <div className="price-range-values">
                                        <div className="price-min">
                                            <span className="price-label">Min:</span>
                                            <span className="price-value">${info.min}</span>
                                            <div className="station-info">{info.minStation?.Marca} - {info.minStation?.direccion || info.minStation?.Comuna}</div>
                                        </div>
                                        <div className="price-max">
                                            <span className="price-label">Max:</span>
                                            <span className="price-value">${info.max}</span>
                                            <div className="station-info">{info.maxStation?.Marca} - {info.maxStation?.direccion || info.maxStation?.Comuna}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Comuna Ranking Section */}
            <div className="stats-section">
                <div className="stats-header-row" onClick={() => toggleSection('comunas')} style={{ cursor: 'pointer', borderBottom: expandedSections.comunas ? '2px solid #02d6a8' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`accordion-icon ${expandedSections.comunas ? 'open' : ''}`}>▼</span>
                        <h4 className="stats-title">Ranking de Comunas</h4>
                    </div>
                </div>

                {expandedSections.comunas && (
                    <div className="slide-down">
                        <ComunaRanking markers={markers} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatisticsPanel;
