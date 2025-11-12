import React, { useState, useEffect, useMemo } from 'react';
import { getMercadoAlerta, getHistoricoAlerta, getDataBaseguerra } from '../services/apiService';
import '../styles/AlertPanel.css';

// Agrupar alertas por estación
function groupAlertsByStation(alerts) {
  const grouped = {};
  alerts.forEach(alert => {
    const key = alert.Nom_Eds || 'Sin nombre';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(alert);
  });
  return grouped;
}

// CONTADOR CORRECTO DE ESTACIONES ÚNICAS
function getStationCount(alerts) {
  const estaciones = {};
  alerts.forEach(a => estaciones[a.Nom_Eds || 'Sin nombre'] = true);
  return Object.keys(estaciones).length;
}

// Función para parsear fechas en formato "DD-MM-YYYY HH:mm"
function parseFecha(fechaStr) {
  const [datePart, timePart] = fechaStr.split(' ');
  const [day, month, year] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart ? timePart.split(':').map(Number) : [0, 0];
  return new Date(year, month - 1, day, hours, minutes);
}

const ITEMS_PER_PAGE = 50;

const AlertPanel = ({ isVisible, onClose, alertasExternas }) => {
  const [activeTab, setActiveTab] = useState('alertas');
  const [alertas, setAlertas] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [guerraData, setGuerraData] = useState([]); // ✅ NUEVO: Estado para datos de guerra
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (alertasExternas) {
      setAlertas(alertasExternas);
      setLoading(false);
    } else if (isVisible) {
      loadData();
    }
  }, [isVisible, alertasExternas]);

// Donde llamas a la función en AlertPanel:
const loadData = async () => {
  try {
    setLoading(true);
    const [alertasData, historicoData, guerraDataResult] = await Promise.all([
      getMercadoAlerta(),
      getHistoricoAlerta(),
      getDataBaseguerra()
    ]);
    setAlertas(Array.isArray(alertasData) ? alertasData : []);
    setHistorico(Array.isArray(historicoData) ? historicoData : []);
  
    // ESTA es la línea clave: revisa si la respuesta tiene un .data (estructura {data:[...]})
    const guerraArr =
      Array.isArray(guerraDataResult) ? guerraDataResult :
      Array.isArray(guerraDataResult?.data) ? guerraDataResult.data : [];
    setGuerraData(guerraArr);

  } catch {
    setAlertas([]);
    setHistorico([]);
    setGuerraData([]);
  } finally {
    setLoading(false);
  }
};


  const agrupadas = useMemo(() => groupAlertsByStation(alertas), [alertas]);
  const cantidadEstaciones = useMemo(() => getStationCount(alertas), [alertas]);

  // ✅ NUEVO: Procesar datos de guerra ordenados por estado
  const estacionesGuerra = useMemo(() => {
    if (!Array.isArray(guerraData)) return [];
    
    return guerraData
      .filter(item => item.Activa === 'Si') // Solo estaciones activas
      .sort((a, b) => {
        // Primero las que están en guerra
        if (a.Guerra_Precio === 'Si' && b.Guerra_Precio !== 'Si') return -1;
        if (a.Guerra_Precio !== 'Si' && b.Guerra_Precio === 'Si') return 1;
        // Luego por nombre
        return (a.Nom_Eds || '').localeCompare(b.Nom_Eds || '');
      });
  }, [guerraData]);

  const totalPages = Math.max(1, Math.ceil(historico.length / ITEMS_PER_PAGE));

  const historicoSorted = useMemo(() => {
    return [...historico].sort((a, b) => parseFecha(b.Fecha) - parseFecha(a.Fecha));
  }, [historico]);

  const historicoPageSlice = historicoSorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handlePrevPage = () => setPage(p => Math.max(p - 1, 1));
  const handleNextPage = () => setPage(p => Math.min(p + 1, totalPages));

  return (
    <aside className={`alert-panel${!isVisible ? ' hidden' : ''}`}>
      <div className="alert-panel-header">
        <h3 className="alert-panel-title">📊 Alertas de Mercado</h3>
        <button className="alert-panel-close" onClick={onClose}>✕</button>
      </div>
      <div className="alert-tabs">
        <button
          className={`alert-tab ${activeTab === 'alertas' ? 'active' : ''}`}
          onClick={() => setActiveTab('alertas')}
        >
          Alertas Activas ({cantidadEstaciones})
        </button>
        <button
          className={`alert-tab ${activeTab === 'guerra' ? 'active' : ''}`}
          onClick={() => setActiveTab('guerra')}
        >
          En Seguimiento ({estacionesGuerra.length})
        </button>
        <button
          className={`alert-tab ${activeTab === 'historico' ? 'active' : ''}`}
          onClick={() => setActiveTab('historico')}
        >
          Histórico ({historico.length})
        </button>
      </div>
      <div className="alert-panel-content">
        {loading ? (
          <div className="alert-loading">Cargando...</div>
        ) : activeTab === 'alertas' ? (
          <AlertasActivas agrupadas={agrupadas} />
        ) : activeTab === 'guerra' ? (
          <GuerraPreciosPanel data={estacionesGuerra} />
        ) : (
          <>
            <HistoricoAlertas data={historicoPageSlice} />
            <div style={{ marginTop: 10, textAlign: 'center' }}>
              <button onClick={handlePrevPage} disabled={page === 1}>Prev</button>
              <span style={{ margin: '0 10px' }}>Página {page} de {totalPages}</span>
              <button onClick={handleNextPage} disabled={page === totalPages}>Siguiente</button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};

const AlertasActivas = ({ agrupadas }) => {
  const estaciones = Object.entries(agrupadas);
  if (estaciones.length === 0) return <div className="alert-empty">No hay alertas activas</div>;

  return (
    <div className="alerts-list">
      {estaciones.map(([station, alerts]) => {
        const anyWar = alerts.some(a => a.Guerra_Precio === 'Si');
        const stationAlert = alerts[0];
        return (
          <div key={station} className={`alert-card${anyWar ? ' guerra' : ''}`}>
            <div className="alert-card-header">
              <span className="alert-icon">{anyWar ? '⚡' : '🔴'}</span>
              <div className="alert-card-info">
                <strong>{station}</strong>
                <span className="alert-marca">{stationAlert.marca} - {stationAlert.cod_cne}</span>
              </div>
            </div>
            <table className="alert-combs-table">
              <thead>
                <tr>
                  <th>Comb.</th>
                  <th>Actual</th>
                  <th>Anterior</th>
                  <th>Dif.</th>
                  <th>Hora</th>
                  <th>Tipo</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a, i) => {
                  const dif = (a.Precio || 0) - (a.PrecioAnterior || 0);
                  return (
                    <tr key={i}>
                      <td>{a.Combustible}</td>
                      <td>${a.Precio}</td>
                      <td>${a.PrecioAnterior}</td>
                      <td className={dif < 0 ? 'negative' : 'positive'}>
                        {dif > 0 && "+"}{dif}
                      </td>
                      <td>{a.Horario}</td>
                      <td>{a.tipo_atencion}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ marginTop: '8px', color: '#999', fontSize: '12px' }}>
              {alerts.map(a =>
                <div key={a.Combustible}>
                  <span>Actual: {a.Fecha}, Anterior: {a.FechaAnterior}</span>
                  {a.Guerra_Precio === "Si" && <span style={{ marginLeft: 8, color: "#e67e22" }}>⚡ GUERRA DE PRECIO</span>}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const GuerraPreciosPanel = ({ data }) => {
  if (!Array.isArray(data) || data.length === 0) {
    return <div className="alert-empty">No hay estaciones disponibles</div>;
  }
  return (
    <div className="guerra-list-simple">
      {data.map((item, idx) => (
        <div className={`guerra-simple-card${item.Guerra_Precio === 'Si' ? ' gcard-guerra' : ''}`} key={idx}>
          <div className="gsc-header">
            <span className={`gsc-icon${item.Guerra_Precio === 'Si' ? ' guerra' : ''}`}>⚡</span>
            <span className="gsc-eds">{item.Nom_Eds}</span>
            <span className="gsc-pbl">
              <span className="gsc-pbl-label">PBL</span>
              <span className="gsc-pbl-value">{item.PBL}</span>
            </span>
          </div>
          <div className="gsc-row">
            <span className="gsc-label">CNE:</span>
            <span className="gsc-value">{item.ID_Cne}</span>
            <span className="gsc-label">Tipo:</span>
            <span className="gsc-value">{item.Tipo_EDS}</span>
            <span className={`gsc-label estado ${item.Activa === 'Si' ? 'activo' : 'inactivo'}`}>
              {item.Activa === 'Si' ? 'Activa' : 'Inactiva'}
            </span>
          </div>
          <div className="gsc-row">
            <span className="gsc-label">Región:</span>
            <span className="gsc-value">{item.region}</span>
          </div>
        </div>
      ))}
    </div>
  );
};


const HistoricoAlertas = ({ data }) => {
  if (!Array.isArray(data)) return <div className="alert-empty">⚠️ Error: Los datos no son un array</div>;
  if (data.length === 0) return <div className="alert-empty">📋 No hay histórico disponible</div>;

  return (
    <div className="historico-wrapper">
      <table className="historico-table-compact">
        <thead>
          <tr>
            <th title="Estación">Estación</th>
            <th title="Marca">Marca</th>
            <th title="Código CNE">CNE</th>
            <th title="Combustible">Comb</th>
            <th title="PBL">PBL</th>
            <th title="Precio Actual">P Actual</th>
            <th title="Precio Anterior">P Anterior</th>
            <th title="Diferencia">Ajuste</th>
            <th title="Tipo de Atención">Tipo</th>
            <th title="Horario">Horario</th>
            <th title="Fecha Cambio Actual">Fecha Actual</th>
            <th title="Fecha Cambio Anterior">Fecha Anterior</th>
            <th title="Fecha de Carga">Fecha Carga</th>
            <th title="Marcador Principal">Marcador</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => {
            const precioActual = Number(item.Precio) || 0;
            const precioAnterior = Number(item.PrecioAnterior) || 0;
            const diferencia = precioActual - precioAnterior;
            const guerra = item.Guerra_Precio === 'Si';
            const marcadorPrincipal = item.Marcador_Principal === 'Si';
            
            const cambioClass = diferencia > 0 ? 'precio-sube' : diferencia < 0 ? 'precio-baja' : 'precio-igual';
            const cambioIcon = diferencia > 0 ? '↑' : diferencia < 0 ? '↓' : '=';
            const cambioSigno = diferencia > 0 ? '+' : '';
            
            const tipoIcon = item.tipo_atencion === 'Asistido' ? '👤' : item.tipo_atencion === 'Autoservicio' ? '⛽' : '❓';
            
            const formatFechaCompacta = (fechaStr) => {
              if (!fechaStr) return { dia: '-', hora: '' };
              const [fecha, hora] = fechaStr.split(' ');
              return {
                dia: fecha || '-',
                hora: hora?.substring(0, 5) || ''
              };
            };
            
            const fechaActual = formatFechaCompacta(item.Fecha);
            const fechaAnterior = formatFechaCompacta(item.FechaAnterior);
            const fechaCarga = formatFechaCompacta(item.FechaCarga);
            
            return (
              <tr 
                key={idx} 
                className={`historico-row ${guerra ? 'guerra-row' : ''} ${marcadorPrincipal ? 'principal-row' : ''}`}
              >
                <td className="td-estacion" title={item.Nom_Eds}>
                  {item.Nom_Eds?.slice(0, 18) || 'S/N'}
                </td>
                <td className="td-marca">{item.marca || '-'}</td>
                <td className="td-cne" title={item.cod_cne}>{item.cod_cne?.slice(-6) || '-'}</td>
                <td className="td-combustible">
                  <span className={`combustible-badge combustible-${item.Combustible?.toLowerCase()}`}>
                    {item.Combustible || '-'}
                  </span>
                </td>
                <td className="td-pbl">{item.pbl || '-'}</td>
                <td className="td-precio"><strong>${precioActual}</strong></td>
                <td className="td-anterior">${precioAnterior}</td>
                <td className={`td-diferencia ${cambioClass}`}>
                  <strong>{cambioIcon} {cambioSigno}{diferencia}</strong>
                </td>
                <td className="td-tipo" title={item.tipo_atencion}>{tipoIcon}</td>
                <td className="td-horario" title={item.Horario}>
                  <span className="horario-texto">{item.Horario || '-'}</span>
                </td>
                <td className="td-fecha">
                  <div className="fecha-compacta">
                    <span className="fecha-dia">{fechaActual.dia}</span>
                    <span className="fecha-hora">{fechaActual.hora}</span>
                  </div>
                </td>
                <td className="td-fecha">
                  <div className="fecha-compacta">
                    <span className="fecha-dia">{fechaAnterior.dia}</span>
                    <span className="fecha-hora">{fechaAnterior.hora}</span>
                  </div>
                </td>
                <td className="td-fecha">
                  <div className="fecha-compacta">
                    <span className="fecha-dia">{fechaCarga.dia}</span>
                    <span className="fecha-hora">{fechaCarga.hora}</span>
                  </div>
                </td>
                <td className="td-principal">
                  {marcadorPrincipal && <span className="principal-icon" title="Marcador Principal">SI</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default AlertPanel;
