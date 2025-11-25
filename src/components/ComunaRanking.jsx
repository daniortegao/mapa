import React, { useMemo, useState } from 'react';

const ComunaRanking = ({ markers }) => {
    const [selectedFuel, setSelectedFuel] = useState('precio_g93');

    const fuelOptions = {
        'precio_g93': 'Gasolina 93',
        'precio_g95': 'Gasolina 95',
        'precio_g97': 'Gasolina 97',
        'precio_diesel': 'Diesel',
        'precio_kero': 'Kerosene'
    };

    const rankingData = useMemo(() => {
        if (!markers || markers.length === 0) {
            console.log('ComunaRanking: No markers');
            return null;
        }

        console.log('ComunaRanking: Processing', markers.length, 'markers');

        // Group by comuna and calculate average prices
        const comunaData = {};
        const comunaStations = {}; // Track unique stations per comuna

        markers.forEach(m => {
            const comuna = m.Comuna;
            if (!comuna) return;

            // Track unique stations
            if (!comunaStations[comuna]) {
                comunaStations[comuna] = new Set();
            }
            const stationId = m.pbl || m.id || `${m.lat}_${m.lng}`;
            comunaStations[comuna].add(stationId);

            if (!comunaData[comuna]) {
                comunaData[comuna] = {
                    precio_g93: [],
                    precio_g95: [],
                    precio_g97: [],
                    precio_diesel: [],
                    precio_kero: []
                };
            }

            // Add prices for each fuel type
            const g93 = parseFloat(m.precio_g93 || m.G93);
            const g95 = parseFloat(m.precio_g95 || m.G95);
            const g97 = parseFloat(m.precio_g97 || m.G97);
            const diesel = parseFloat(m.precio_diesel || m.Diesel);
            const kero = parseFloat(m.precio_kero || m.Kero);

            if (g93 && g93 > 0) comunaData[comuna].precio_g93.push(g93);
            if (g95 && g95 > 0) comunaData[comuna].precio_g95.push(g95);
            if (g97 && g97 > 0) comunaData[comuna].precio_g97.push(g97);
            if (diesel && diesel > 0) comunaData[comuna].precio_diesel.push(diesel);
            if (kero && kero > 0) comunaData[comuna].precio_kero.push(kero);
        });

        // Calculate averages
        const comunaAverages = Object.keys(comunaData).map(comuna => {
            const averages = {};
            const fuelCounts = {};

            Object.keys(fuelOptions).forEach(fuel => {
                const prices = comunaData[comuna][fuel];
                if (prices.length > 0) {
                    averages[fuel] = prices.reduce((sum, p) => sum + p, 0) / prices.length;
                    fuelCounts[fuel] = prices.length;
                } else {
                    averages[fuel] = null;
                    fuelCounts[fuel] = 0;
                }
            });

            return {
                comuna,
                ...averages,
                fuelCounts, // Count per fuel type
                totalStations: comunaStations[comuna].size // Total unique stations
            };
        });

        console.log('ComunaRanking: Processed', comunaAverages.length, 'comunas');
        return comunaAverages;
    }, [markers]);

    if (!rankingData || rankingData.length === 0) {
        return <div className="stats-empty">Sin datos de comunas</div>;
    }

    // Filter and sort by selected fuel
    const validComunas = rankingData.filter(c => c[selectedFuel] !== null);
    const sortedByPrice = [...validComunas].sort((a, b) => b[selectedFuel] - a[selectedFuel]);

    const topExpensive = sortedByPrice.slice(0, 5);
    const topCheap = sortedByPrice.slice(-5).reverse();

    return (
        <div className="comuna-ranking-container">
            <div className="ranking-header" style={{ justifyContent: 'flex-end' }}>
                <select
                    value={selectedFuel}
                    onChange={(e) => setSelectedFuel(e.target.value)}
                    className="fuel-selector"
                >
                    {Object.keys(fuelOptions).map(fuel => (
                        <option key={fuel} value={fuel}>{fuelOptions[fuel]}</option>
                    ))}
                </select>
            </div>

            <div className="ranking-grid">
                {/* Cheapest */}
                <div className="ranking-section cheap">
                    <h5 className="ranking-section-title">🔴 Más Baratas</h5>
                    <div className="ranking-list">
                        {topCheap.map((comuna, index) => (
                            <div key={comuna.comuna} className="ranking-item">
                                <div className="ranking-info">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <span className="ranking-comuna">{comuna.comuna}</span>
                                        <span className="ranking-position">{index + 1}</span>
                                    </div>
                                    <span className="ranking-price cheap-price">
                                        ${Math.round(comuna[selectedFuel])}
                                    </span>
                                    <span className="ranking-stations">
                                        ({comuna.fuelCounts[selectedFuel]} de {comuna.totalStations} EDS)
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>




                {/* Most Expensive */}
                <div className="ranking-section expensive">
                    <h5 className="ranking-section-title">🟢 Más Caras</h5>
                    <div className="ranking-list">
                        {topExpensive.map((comuna, index) => (
                            <div key={comuna.comuna} className="ranking-item">
                                <div className="ranking-info">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <span className="ranking-comuna">{comuna.comuna}</span>
                                        <span className="ranking-position">{index + 1}</span>
                                    </div>
                                    <span className="ranking-price expensive-price">
                                        ${Math.round(comuna[selectedFuel])}
                                    </span>
                                    <span className="ranking-stations">
                                        ({comuna.fuelCounts[selectedFuel]} de {comuna.totalStations} EDS)
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ComunaRanking;
