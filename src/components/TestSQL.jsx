// TestSQL.jsx
import React, { useState } from 'react';

function TestSQL() {
    const [resultado, setResultado] = useState(null);
    const [loading, setLoading] = useState(false);

    const SERVIDOR = 'DE250329.esmax.cl';
    const PUERTO = '80';  // Si Apache usa otro puerto, cámbialo aquí

    const probar = async () => {
        setLoading(true);
        setResultado(null);

        const url = `http://${SERVIDOR}/test-sql.php`;

        console.log('🔗 Conectando a:', url);

        try {
            const res = await fetch(url);

            console.log('📡 Status:', res.status);

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const data = await res.json();
            console.log('✅ Datos recibidos:', data);
            setResultado(data);

        } catch (err) {
            console.error('❌ Error:', err);
            setResultado({
                success: false,
                error: err.message,
                url: url
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '30px', fontFamily: 'Arial', maxWidth: '1000px', margin: '0 auto' }}>
            <h2>🧪 Test Conexión SQL Server desde React</h2>

            <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
                <p><strong>🌐 Servidor:</strong> {SERVIDOR}</p>
                <p><strong>🗄️ SQL Server:</strong> DE250329\SQLEXPRESS</p>
                <p><strong>💾 Base de datos:</strong> Calculo_Precios</p>
            </div>

            <button
                onClick={probar}
                disabled={loading}
                style={{
                    padding: '15px 40px',
                    fontSize: '18px',
                    backgroundColor: loading ? '#ccc' : '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold'
                }}
            >
                {loading ? '⏳ Probando...' : '🚀 Probar Conexión'}
            </button>

            {loading && <p style={{ marginTop: '20px' }}>⏳ Conectando...</p>}

            {resultado && (
                <div style={{
                    marginTop: '20px',
                    padding: '20px',
                    backgroundColor: resultado.success ? '#d4edda' : '#f8d7da',
                    border: `3px solid ${resultado.success ? '#28a745' : '#dc3545'}`,
                    borderRadius: '8px'
                }}>
                    <h3>{resultado.success ? '✅ CONEXIÓN EXITOSA' : '❌ ERROR'}</h3>

                    <p><strong>Mensaje:</strong> {resultado.mensaje || resultado.error}</p>

                    {resultado.servidor && (
                        <p><strong>SQL Server:</strong> {resultado.servidor}</p>
                    )}

                    {resultado.usuario_windows && (
                        <p><strong>Usuario Windows:</strong> {resultado.usuario_windows}</p>
                    )}

                    {resultado.lectura && (
                        <p><strong>Lectura:</strong> {resultado.lectura}</p>
                    )}

                    {resultado.escritura && (
                        <p><strong>Escritura:</strong> {resultado.escritura}</p>
                    )}

                    {resultado.datos && resultado.datos.length > 0 && (
                        <div style={{ marginTop: '20px' }}>
                            <h4>📊 Datos obtenidos: {resultado.registros} registros</h4>
                            <div style={{
                                backgroundColor: 'white',
                                padding: '15px',
                                borderRadius: '5px',
                                overflow: 'auto',
                                maxHeight: '400px'
                            }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#333', color: 'white' }}>
                                            <th style={{ padding: '10px', textAlign: 'left' }}>PBL</th>
                                            <th style={{ padding: '10px', textAlign: 'left' }}>Estación</th>
                                            <th style={{ padding: '10px', textAlign: 'left' }}>Producto</th>
                                            <th style={{ padding: '10px', textAlign: 'right' }}>Precio</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {resultado.datos.map((item, index) => (
                                            <tr key={index} style={{
                                                backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white',
                                                borderBottom: '1px solid #ddd'
                                            }}>
                                                <td style={{ padding: '8px' }}>{item.Pbl}</td>
                                                <td style={{ padding: '8px' }}>{item.Nombre_EESS}</td>
                                                <td style={{ padding: '8px' }}>{item.Producto}</td>
                                                <td style={{ padding: '8px', textAlign: 'right' }}>{item.Precio_Venta}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default TestSQL;
