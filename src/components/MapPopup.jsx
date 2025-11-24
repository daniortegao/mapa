import React, { useState, useMemo } from 'react';
import TrendChart from './TrendChart';
import { obtenerHistoricoMarker } from '../utils/markerUtils';

const MapPopup = ({
    marker,
    allMarkers,
    onShowAssociated,
    onActivateCoords,
    onSaveCoords,
    modoCorreccion,
    variant = 'primary'
}) => {
    const [activeTab, setActiveTab] = useState('precios');
    const [selectedNivel, setSelectedNivel] = useState('Nivel 1');

    const datosTabla = useMemo(() => {
        return obtenerHistoricoMarker(marker.id, allMarkers, selectedNivel);
    }, [marker.id, allMarkers, selectedNivel]);

    // Calculate price differences between Nivel 1 and Nivel 2
    const priceDifferences = useMemo(() => {
        const nivel1Data = obtenerHistoricoMarker(marker.id, allMarkers, 'Nivel 1');
        const nivel2Data = obtenerHistoricoMarker(marker.id, allMarkers, 'Nivel 2');

        // Only calculate if both levels exist and have data
        if (nivel1Data.length === 0 || nivel2Data.length === 0) {
            return null;
        }

        // Get most recent entry from each level
        const nivel1Latest = nivel1Data[0];
        const nivel2Latest = nivel2Data[0];

        // Calculate differences for each fuel type
        const calculateDiff = (n1, n2) => {
            if (n1 === '-' || n2 === '-') return null;
            const diff = parseFloat(n2) - parseFloat(n1);
            return isNaN(diff) ? null : diff;
        };

        return {
            g93: calculateDiff(nivel1Latest.g93, nivel2Latest.g93),
            g95: calculateDiff(nivel1Latest.g95, nivel2Latest.g95),
            g97: calculateDiff(nivel1Latest.g97, nivel2Latest.g97),
            diesel: calculateDiff(nivel1Latest.diesel, nivel2Latest.diesel),
            kero: calculateDiff(nivel1Latest.kero, nivel2Latest.kero)
        };
    }, [marker.id, allMarkers]);

    const variantClass = variant === 'primary' ? '' : 'secondary';

    const logoUrl = marker.logo
        ? (marker.logo.startsWith('http') ? marker.logo : `https://api.bencinaenlinea.cl${marker.logo}`)
        : '';

    const handleTabClick = (tab) => {
        setActiveTab(tab);
    };

    return (
        <div className="icon-markers-popup-content">
            <div className="popup-info-header">
                {logoUrl && (
                    <img
                        src={logoUrl}
                        alt={`Logo ${marker.Marca}`}
                        className="popup-logo"
                        onError={(e) => e.target.style.display = 'none'}
                    />
                )}
                <div className="popup-info-row">
                    <span className="popup-label">PBL: </span>
                    <span className="popup-value-alerta">{marker.pbl || '-'}</span>
                </div>
                <div className="popup-info-row">
                    <span className="popup-label">EESS: </span>
                    <span className="popup-value">{marker.eds || '-'}</span>
                </div>
                <br />
                <div className="popup-info-row">
                    <span className="popup-label">JZ: </span>
                    <span className="popup-value">{marker.nombre || '-'}</span>
                </div>
                <div className="popup-info-row">
                    <span className="popup-label">OP: </span>
                    <span className="popup-value">{marker.operacion || '-'}</span>
                </div>
            </div>

            <div className="popup-tabs-container">
                <div className="popup-tabs-header">
                    {['precios', 'tendencias', 'coordenadas', 'informacion'].map(tab => (
                        <button
                            key={tab}
                            className={`popup-tab-button ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => handleTabClick(tab)}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                <div className="popup-tabs-content">
                    {activeTab === 'precios' && (
                        <div className="popup-tab-pane active">
                            <div className="nivel-toggle-container">
                                {['Nivel 1', 'Nivel 2'].map(nivel => (
                                    <button
                                        key={nivel}
                                        className={`nivel-toggle-btn ${selectedNivel === nivel ? 'active' : ''}`}
                                        onClick={() => setSelectedNivel(nivel)}
                                    >
                                        {nivel}
                                    </button>
                                ))}

                                {priceDifferences && (
                                    <div className="price-differences-container">
                                        <div className="price-diff-values">
                                            {priceDifferences.g93 !== null && (
                                                <div className="price-diff-item">
                                                    <span className="diff-fuel-name">G93:</span>
                                                    <span className={`diff-value ${priceDifferences.g93 >= 0 ? 'positive' : 'negative'}`}>
                                                        {priceDifferences.g93 >= 0 ? '+' : ''}{priceDifferences.g93.toFixed(0)}
                                                    </span>
                                                </div>
                                            )}
                                            {priceDifferences.g95 !== null && (
                                                <div className="price-diff-item">
                                                    <span className="diff-fuel-name">G95:</span>
                                                    <span className={`diff-value ${priceDifferences.g95 >= 0 ? 'positive' : 'negative'}`}>
                                                        {priceDifferences.g95 >= 0 ? '+' : ''}{priceDifferences.g95.toFixed(0)}
                                                    </span>
                                                </div>
                                            )}
                                            {priceDifferences.g97 !== null && (
                                                <div className="price-diff-item">
                                                    <span className="diff-fuel-name">G97:</span>
                                                    <span className={`diff-value ${priceDifferences.g97 >= 0 ? 'positive' : 'negative'}`}>
                                                        {priceDifferences.g97 >= 0 ? '+' : ''}{priceDifferences.g97.toFixed(0)}
                                                    </span>
                                                </div>
                                            )}
                                            {priceDifferences.diesel !== null && (
                                                <div className="price-diff-item">
                                                    <span className="diff-fuel-name">Diesel:</span>
                                                    <span className={`diff-value ${priceDifferences.diesel >= 0 ? 'positive' : 'negative'}`}>
                                                        {priceDifferences.diesel >= 0 ? '+' : ''}{priceDifferences.diesel.toFixed(0)}
                                                    </span>
                                                </div>
                                            )}
                                            {priceDifferences.kero !== null && (
                                                <div className="price-diff-item">
                                                    <span className="diff-fuel-name">Kero:</span>
                                                    <span className={`diff-value ${priceDifferences.kero >= 0 ? 'positive' : 'negative'}`}>
                                                        {priceDifferences.kero >= 0 ? '+' : ''}{priceDifferences.kero.toFixed(0)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className={`popup-table-wrapper ${variantClass}`}>
                                {datosTabla.length === 0 ? (
                                    <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: '#999', fontStyle: 'italic' }}>
                                        Sin datos disponibles
                                    </div>
                                ) : (
                                    <table className={`popup-table ${variantClass}`}>
                                        <thead>
                                            <tr>
                                                <th>Fecha</th>
                                                <th>G93</th>
                                                <th>G95</th>
                                                <th>G97</th>
                                                <th>Diesel</th>
                                                <th>Kero</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {datosTabla.map((fila, idx) => (
                                                <tr key={idx}>
                                                    <td>{fila.fecha}</td>
                                                    <td>{fila.g93}</td>
                                                    <td>{fila.g95}</td>
                                                    <td>{fila.g97}</td>
                                                    <td>{fila.diesel}</td>
                                                    <td>{fila.kero}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'tendencias' && (
                        <div className="popup-tab-pane active">
                            <div style={{ width: '100%', minHeight: '160px', paddingTop: '6px' }}>
                                <TrendChart
                                    dataRows={datosTabla}
                                    maxPoints={7}
                                    height={170}
                                    compact={true}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'coordenadas' && (
                        <div className="popup-tab-pane active">
                            <div className="popup-info-box">
                                <p><strong>Lat corregida:</strong> <span>{(modoCorreccion && (modoCorreccion.id === marker.id || modoCorreccion.pbl === marker.pbl) && modoCorreccion.lat) ? modoCorreccion.lat.toFixed(6) : marker.lat.toFixed(6)}</span></p>
                                <p><strong>Lon corregida:</strong> <span>{(modoCorreccion && (modoCorreccion.id === marker.id || modoCorreccion.pbl === marker.pbl) && modoCorreccion.lng) ? modoCorreccion.lng.toFixed(6) : marker.lng.toFixed(6)}</span></p>
                                <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #dee2e6' }} />
                                <p><strong>Región:</strong> {marker.Region || '-'}</p>
                                <p><strong>Comuna:</strong> {marker.Comuna || '-'}</p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                <button
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        background: (modoCorreccion && (modoCorreccion.id === marker.id || modoCorreccion.pbl === marker.pbl)) ? '#dc3545' : '#17a2b8',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        fontWeight: 600
                                    }}
                                    onClick={() => onActivateCoords(marker)}
                                >
                                    {(modoCorreccion && (modoCorreccion.id === marker.id || modoCorreccion.pbl === marker.pbl)) ? 'Coordenadas Activas' : 'Activar Coord'}
                                </button>
                                <button
                                    style={{ flex: 1, padding: '8px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 600, opacity: (modoCorreccion && (modoCorreccion.id === marker.id || modoCorreccion.pbl === marker.pbl) && modoCorreccion.lat) ? 1 : 0.5 }}
                                    onClick={() => onSaveCoords(marker)}
                                    disabled={!(modoCorreccion && (modoCorreccion.id === marker.id || modoCorreccion.pbl === marker.pbl) && modoCorreccion.lat)}
                                >
                                    Guardar
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'informacion' && (
                        <div className="popup-tab-pane active">
                            <div className="popup-info-box">
                                <p><strong>Dirección:</strong> {marker.direccion || '-'}</p>
                                <p><strong>Surtidores PES:</strong> {marker.Surtidores_Autoservicio || '-'}</p>
                                <p><strong>Posición Surtidor:</strong> {marker.Posicion_Surtidor || '-'}</p>
                                <p><strong>Tipo Isla:</strong> {marker.Tipo_Isla || '-'}</p>
                                {marker.Guerra_Precio === 'Si' && (
                                    <>
                                        <hr style={{ margin: '8px 0', border: 'none', borderTop: '1px solid #dee2e6' }} />
                                        <p><strong style={{ color: '#d9534f' }}>⚠️ Guerra de Precio Activa</strong></p>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {marker.pbl && (marker.Marca === 'Aramco' || marker.Marca === 'Petrobras') && (
                <button
                    className="popup-button-mercado"
                    onClick={() => onShowAssociated(marker.pbl, marker.lat, marker.lng, marker.id)}
                >
                    Mercado
                </button>
            )}
        </div>
    );
};

export default MapPopup;
