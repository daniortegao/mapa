import React, { useState, useEffect, useMemo } from 'react';
import { getMercadoAlerta, getHistoricoAlerta } from '../services/apiService';
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

  const loadData = async () => {
    try {
      setLoading(true);
      const [alertasData, historicoData] = await Promise.all([
        getMercadoAlerta(),
        getHistoricoAlerta()
      ]);
      setAlertas(Array.isArray(alertasData) ? alertasData : []);
      setHistorico(Array.isArray(historicoData) ? historicoData : []);
    } catch {
      setAlertas([]);
      setHistorico([]);
    } finally {
      setLoading(false);
    }
  };

  const agrupadas = useMemo(() => groupAlertsByStation(alertas), [alertas]);
  const cantidadEstaciones = useMemo(() => getStationCount(alertas), [alertas]);

  const totalPages = Math.max(1, Math.ceil(historico.length / ITEMS_PER_PAGE));

  // Ordenar historial por fecha descendente usando parseFecha
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
          className={`alert-tab ${activeTab === 'historico' ? 'active' : ''}`}
          onClick={() => setActiveTab('historico')}
        >
          Histórico ({historico.length})
        </button>
      </div>
      <div className="alert-panel-content">
        {loading ? (
          <div className="alert-loading">Cargando...</div>
        ) : (
          activeTab === 'alertas' ? (
            <AlertasActivas agrupadas={agrupadas} />
          ) : (
            <>
              <HistoricoAlertas data={historicoPageSlice} />
              <div style={{ marginTop: 10, textAlign: 'center' }}>
                <button onClick={handlePrevPage} disabled={page === 1}>Prev</button>
                <span style={{ margin: '0 10px' }}>Página {page} de {totalPages}</span>
                <button onClick={handleNextPage} disabled={page === totalPages}>Siguiente</button>
              </div>
            </>
          )
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

const HistoricoAlertas = ({ data }) => {
  if (!Array.isArray(data)) return <div className="alert-empty">⚠️ Error: Los datos no son un array</div>;
  if (data.length === 0) return <div className="alert-empty">📋 No hay histórico disponible</div>;

  return (
    <div className="historico-wrapper">
      <table className="historico-table">
        <thead>
          <tr>
            <th>Estación</th>
            <th>Marca</th>
            <th>Comb.</th>
            <th>Precio</th>
            <th>Anterior</th>
            <th>Dif</th>
            <th>Tipo</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => {
            const precioActual = Number(item.Precio) || 0;
            const precioAnterior = Number(item.PrecioAnterior) || 0;
            const diferencia = precioActual - precioAnterior;
            const guerra = item.Guerra_Precio === 'Si';
            return (
              <tr key={idx} className={guerra ? 'guerra-row' : ''}>
                <td title={item.Nom_Eds}>{item.Nom_Eds?.slice(0, 20)}...</td>
                <td>{item.marca}</td>
                <td>{item.Combustible}</td>
                <td>${precioActual}</td>
                <td>${precioAnterior}</td>
                <td className={diferencia < 0 ? 'negative' : 'positive'}>
                  {diferencia > 0 ? '+' : ''}{diferencia}
                </td>
                <td>{item.tipo_atencion}</td>
                <td className="fecha-small">{item.Fecha}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default AlertPanel;
