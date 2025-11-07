import React, { useMemo } from 'react';
import '../styles/debugPriceTable.css';

/**
 * Componente de DEBUG para visualizar todos los datos de precios históricos
 * Útil para verificar qué datos se están obteniendo de base_eds y base_comp
 */
const DebugPriceTable = ({ markers, baseCompData, selectedEds, selectedCompId }) => {
  // ✅ Obtener TODOS los datos del EDS seleccionado
  const datosEds = useMemo(() => {
    if (!markers || !selectedEds) return [];
    return markers.filter(m => m.eds === selectedEds);
  }, [markers, selectedEds]);

  // ✅ Obtener TODOS los datos de la competencia seleccionada
  const datosComp = useMemo(() => {
    if (!baseCompData || !selectedCompId) return [];
    return baseCompData.filter(m => m.id === selectedCompId);
  }, [baseCompData, selectedCompId]);

  return (
    <div className="debug-container">
      <div className="debug-section">
        <h2>🔍 DEBUG - Datos EDS</h2>
        <p className="debug-info">
          EDS: <strong>{selectedEds || 'N/A'}</strong> | 
          Total registros: <strong>{datosEds.length}</strong>
        </p>
        
        {datosEds.length > 0 && (
          <div className="table-wrapper">
            <table className="debug-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>G93</th>
                  <th>G95</th>
                  <th>G97</th>
                  <th>Diesel</th>
                  <th>Kero</th>
                  <th>EDS</th>
                  <th>ID</th>
                  <th>Marca</th>
                </tr>
              </thead>
              <tbody>
                {datosEds.map((item, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'odd' : 'even'}>
                    <td>{item.fecha || 'S/F'}</td>
                    <td>{item.precio_g93 || '-'}</td>
                    <td>{item.precio_g95 || '-'}</td>
                    <td>{item.precio_g97 || '-'}</td>
                    <td>{item.precio_diesel || '-'}</td>
                    <td>{item.precio_kero || '-'}</td>
                    <td>{item.eds || '-'}</td>
                    <td>{item.id || '-'}</td>
                    <td>{item.Marca || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {datosEds.length === 0 && (
          <div className="no-data">Sin datos para este EDS</div>
        )}
      </div>

      <div className="debug-section">
        <h2>🔍 DEBUG - Datos Competencia</h2>
        <p className="debug-info">
          Comp ID: <strong>{selectedCompId || 'N/A'}</strong> | 
          Total registros: <strong>{datosComp.length}</strong>
        </p>
        
        {datosComp.length > 0 && (
          <div className="table-wrapper">
            <table className="debug-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>G93</th>
                  <th>G95</th>
                  <th>G97</th>
                  <th>Diesel</th>
                  <th>Kero</th>
                  <th>ID</th>
                  <th>PBL</th>
                  <th>Marca</th>
                </tr>
              </thead>
              <tbody>
                {datosComp.map((item, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'odd' : 'even'}>
                    <td>{item.fecha || 'S/F'}</td>
                    <td>{item.precio_g93 || '-'}</td>
                    <td>{item.precio_g95 || '-'}</td>
                    <td>{item.precio_g97 || '-'}</td>
                    <td>{item.precio_diesel || '-'}</td>
                    <td>{item.precio_kero || '-'}</td>
                    <td>{item.id || '-'}</td>
                    <td>{item.pbl || '-'}</td>
                    <td>{item.Marca || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {datosComp.length === 0 && (
          <div className="no-data">Sin datos para esta competencia</div>
        )}
      </div>
    </div>
  );
};

export default DebugPriceTable;
