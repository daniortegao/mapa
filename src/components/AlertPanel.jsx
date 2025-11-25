import React, { useState, useEffect, useMemo } from 'react';
import { getMercadoAlerta, getHistoricoAlerta, getDataBaseguerra, getDataBaseajuste } from '../services/apiService';
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
  if (!fechaStr || typeof fechaStr !== 'string') {
    return new Date();
  }
  const parts = fechaStr.trim().split(' ');
  const datePart = parts[0];
  const timePart = parts[1];

  if (!datePart) return new Date();

  const dateParts = datePart.split('-');
  if (dateParts.length !== 3) return new Date();

  const [day, month, year] = dateParts.map(Number);
  const [hours, minutes] = timePart ? timePart.split(':').map(Number) : [0, 0];

  if (isNaN(day) || isNaN(month) || isNaN(year)) return new Date();

  return new Date(year, month - 1, day, hours || 0, minutes || 0);
}

const ITEMS_PER_PAGE = 50;

const AlertPanel = ({ isVisible, onClose, alertasExternas }) => {
  const [activeTab, setActiveTab] = useState('alertas');
  const [alertas, setAlertas] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [guerraData, setGuerraData] = useState([]);
  const [ajustesData, setAjustesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [modalExpanded, setModalExpanded] = useState(false); // ← NUEVO

  // Estados para filtros histórico
  const [filterNombreEstacion, setFilterNombreEstacion] = useState('');
  const [filterSoloGuerra, setFilterSoloGuerra] = useState(false);

  // Estados para filtros ajustes
  const [filterNombreAjuste, setFilterNombreAjuste] = useState('');
  const [filterCombustible, setFilterCombustible] = useState('');

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
      const [alertasData, historicoData, guerraDataResult, ajustesDataResult] = await Promise.all([
        getMercadoAlerta(),
        getHistoricoAlerta(),
        getDataBaseguerra(),
        getDataBaseajuste()
      ]);

      setAlertas(Array.isArray(alertasData) ? alertasData : []);
      setHistorico(Array.isArray(historicoData) ? historicoData : []);

      const guerraArr =
        Array.isArray(guerraDataResult) ? guerraDataResult :
          Array.isArray(guerraDataResult?.data) ? guerraDataResult.data : [];
      setGuerraData(guerraArr);

      const ajustesArr =
        Array.isArray(ajustesDataResult) ? ajustesDataResult :
          Array.isArray(ajustesDataResult?.data) ? ajustesDataResult.data : [];
      setAjustesData(ajustesArr);

    } catch {
      setAlertas([]);
      setHistorico([]);
      setGuerraData([]);
      setAjustesData([]);
    } finally {
      setLoading(false);
    }
  };

  const agrupadas = useMemo(() => groupAlertsByStation(alertas), [alertas]);
  const cantidadEstaciones = useMemo(() => getStationCount(alertas), [alertas]);

  const estacionesGuerra = useMemo(() => {
    if (!Array.isArray(guerraData)) return [];

    return guerraData
      .filter(item => item.Activa === 'Si')
      .sort((a, b) => {
        if (a.Guerra_Precio === 'Si' && b.Guerra_Precio !== 'Si') return -1;
        if (a.Guerra_Precio !== 'Si' && b.Guerra_Precio === 'Si') return 1;
        return (a.Nom_Eds || '').localeCompare(b.Nom_Eds || '');
      });
  }, [guerraData]);

  // Filtrado del histórico
  const historicoFiltrado = useMemo(() => {
    let filtered = [...historico];

    if (filterNombreEstacion.trim() !== '') {
      const searchTerm = filterNombreEstacion.toLowerCase();
      filtered = filtered.filter(item =>
        (item.Nom_Eds || '').toLowerCase().includes(searchTerm)
      );
    }

    if (filterSoloGuerra) {
      const estacionesEnGuerra = new Set(
        guerraData
          .filter(g => g.Guerra_Precio === 'Si')
          .map(g => g.Nom_Eds)
      );
      filtered = filtered.filter(item => estacionesEnGuerra.has(item.Nom_Eds));
    }

    return filtered;
  }, [historico, filterNombreEstacion, filterSoloGuerra, guerraData]);

  const historicoSorted = useMemo(() => {
    return [...historicoFiltrado].sort((a, b) => parseFecha(b.Fecha) - parseFecha(a.Fecha));
  }, [historicoFiltrado]);

  // Filtrado de ajustes
  const ajustesFiltrado = useMemo(() => {
    let filtered = [...ajustesData];

    if (filterNombreAjuste.trim() !== '') {
      const searchTerm = filterNombreAjuste.toLowerCase();
      filtered = filtered.filter(item =>
        (item.Nom_Eds || '').toLowerCase().includes(searchTerm)
      );
    }

    if (filterCombustible.trim() !== '') {
      filtered = filtered.filter(item =>
        item.combustible === filterCombustible
      );
    }

    return filtered;
  }, [ajustesData, filterNombreAjuste, filterCombustible]);

  const ajustesSorted = useMemo(() => {
    return [...ajustesFiltrado];
  }, [ajustesFiltrado]);

  const totalPages = Math.max(1, Math.ceil(historicoSorted.length / ITEMS_PER_PAGE));
  const totalPagesAjustes = Math.max(1, Math.ceil(ajustesSorted.length / ITEMS_PER_PAGE));

  const historicoPageSlice = historicoSorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const ajustesPageSlice = ajustesSorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handlePrevPage = () => setPage(p => Math.max(p - 1, 1));
  const handleNextPage = () => setPage(p => Math.min(p + 1, activeTab === 'ajustes' ? totalPagesAjustes : totalPages));

  // Reset página al cambiar filtros o tab
  useEffect(() => {
    setPage(1);
  }, [filterNombreEstacion, filterSoloGuerra, filterNombreAjuste, filterCombustible, activeTab]);

  const combustiblesUnicos = useMemo(() => {
    return [...new Set(ajustesData.map(a => a.combustible))].filter(Boolean);
  }, [ajustesData]);

  return (
    <>
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
            Histórico Movimiento ({historicoSorted.length})
          </button>
          <button
            className={`alert-tab ${activeTab === 'ajustes' ? 'active' : ''}`}
            onClick={() => setActiveTab('ajustes')}
          >
            Ajustes PES ({ajustesSorted.length})
          </button>
          <button
            className={`alert-tab ${activeTab === 'guerra' ? 'active' : ''}`}
            onClick={() => setActiveTab('guerra')}
          >
            En Seguimiento ({estacionesGuerra.length})
          </button>
        </div>
        <div className="alert-panel-content">
          {loading ? (
            <div className="alert-loading">Cargando...</div>
          ) : activeTab === 'alertas' ? (
            <AlertasActivas agrupadas={agrupadas} />
          ) : activeTab === 'guerra' ? (
            <GuerraPreciosPanel data={estacionesGuerra} />
          ) : activeTab === 'historico' ? (
            <>
              <HistoricoAlertas
                data={historicoPageSlice}
                filterNombreEstacion={filterNombreEstacion}
                setFilterNombreEstacion={setFilterNombreEstacion}
                filterSoloGuerra={filterSoloGuerra}
                setFilterSoloGuerra={setFilterSoloGuerra}
                totalItems={historicoSorted.length}
                onExpand={() => setModalExpanded(true)}
              />
              <div style={{ marginTop: 10, textAlign: 'center', padding: '10px', background: 'white' }}>
                <button onClick={handlePrevPage} disabled={page === 1}>Prev</button>
                <span style={{ margin: '0 10px' }}>Página {page} de {totalPages}</span>
                <button onClick={handleNextPage} disabled={page === totalPages}>Siguiente</button>
              </div>
            </>
          ) : (
            <>
              <AjustesTabla
                data={ajustesPageSlice}
                filterNombreAjuste={filterNombreAjuste}
                setFilterNombreAjuste={setFilterNombreAjuste}
                filterCombustible={filterCombustible}
                setFilterCombustible={setFilterCombustible}
                combustiblesUnicos={combustiblesUnicos}
                totalItems={ajustesSorted.length}
              />
              <div style={{ marginTop: 10, textAlign: 'center', padding: '10px', background: 'white' }}>
                <button onClick={handlePrevPage} disabled={page === 1}>Prev</button>
                <span style={{ margin: '0 10px' }}>Página {page} de {totalPagesAjustes}</span>
                <button onClick={handleNextPage} disabled={page === totalPagesAjustes}>Siguiente</button>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* MODAL EXPANDIDO */}
      {modalExpanded && (
        <div className="modal-expandido-overlay" onClick={() => setModalExpanded(false)}>
          <div className="modal-expandido-contenido" onClick={(e) => e.stopPropagation()}>
            <div className="modal-expandido-header">
              <h2>📊 Histórico de Movimiento - Vista Completa</h2>
              <button
                className="modal-close-btn"
                onClick={() => setModalExpanded(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-expandido-body">
              <HistoricoAlertas
                data={historicoPageSlice}
                filterNombreEstacion={filterNombreEstacion}
                setFilterNombreEstacion={setFilterNombreEstacion}
                filterSoloGuerra={filterSoloGuerra}
                setFilterSoloGuerra={setFilterSoloGuerra}
                totalItems={historicoSorted.length}
                onExpand={() => { }}
              />

              <div style={{ marginTop: 10, textAlign: 'center', padding: '10px', background: 'white' }}>
                <button onClick={handlePrevPage} disabled={page === 1}>Prev</button>
                <span style={{ margin: '0 10px' }}>Página {page} de {totalPages}</span>
                <button onClick={handleNextPage} disabled={page === totalPages}>Siguiente</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
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
              {(() => {
                // Deduplicate footer lines
                const uniqueFooters = new Set();
                const footerContent = [];

                alerts.forEach(a => {
                  const text = `Actual: ${a.Fecha}, Anterior: ${a.FechaAnterior}`;
                  const isGuerra = a.Guerra_Precio === "Si";
                  const key = `${text}_${isGuerra}`;

                  if (!uniqueFooters.has(key)) {
                    uniqueFooters.add(key);
                    footerContent.push({ text, isGuerra });
                  }
                });

                return footerContent.map((item, idx) => (
                  <div key={idx}>
                    <span>{item.text}</span>
                    {item.isGuerra && <span style={{ marginLeft: 8, color: "#e67e22" }}>⚡ GUERRA DE PRECIO</span>}
                  </div>
                ));
              })()}
            </div>
          </div>
        );
      })}
    </div >
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

const HistoricoAlertas = ({
  data,
  filterNombreEstacion,
  setFilterNombreEstacion,
  filterSoloGuerra,
  setFilterSoloGuerra,
  totalItems,
  onExpand
}) => {
  if (!Array.isArray(data)) return <div className="alert-empty">⚠️ Error: Los datos no son un array</div>;

  const hayFiltrosActivos = filterNombreEstacion.trim() !== '' || filterSoloGuerra;

  const limpiarFiltros = () => {
    setFilterNombreEstacion('');
    setFilterSoloGuerra(false);
  };

  const formatFechaCompacta = (fechaStr) => {
    if (!fechaStr) return { dia: '-', hora: '' };
    const [fecha, hora] = fechaStr.split(' ');
    return {
      dia: fecha || '-',
      hora: hora?.substring(0, 5) || ''
    };
  };

  return (
    <div className="historico-wrapper">
      <div className="historico-filtros">
        <input
          id="filter-nombre"
          type="text"
          className="input-filtro-hist"
          placeholder="Buscar estación..."
          value={filterNombreEstacion}
          onChange={(e) => setFilterNombreEstacion(e.target.value)}
        />
        <label className="check-filtro-hist">
          <input
            type="checkbox"
            checked={filterSoloGuerra}
            onChange={(e) => setFilterSoloGuerra(e.target.checked)}
          />
          <span>Solo estaciones en guerra</span>
        </label>

        {hayFiltrosActivos && (
          <button
            className="btn-limpiar-filtros"
            onClick={limpiarFiltros}
            title="Limpiar todos los filtros"
          >
            ✕ Limpiar
          </button>
        )}

        {/* BOTÓN EXPANDIR */}
        {onExpand && (
          <button
            className="btn-expandir-vista"
            onClick={onExpand}
            title="Expandir vista"
          >
            ⛶ Expandir
          </button>
        )}

        <span style={{ marginLeft: 'auto', color: '#666', fontSize: '13px', fontWeight: 600 }}>
          Mostrando {data.length} de {totalItems}
        </span>
      </div>

      {data.length === 0 && hayFiltrosActivos ? (
        <div className="sin-resultados-filtro">
          <div className="sin-resultados-content">
            <span className="sin-resultados-icon">🔍</span>
            <p className="sin-resultados-texto">
              No se encontraron resultados para la búsqueda
              {filterNombreEstacion && <strong> "{filterNombreEstacion}"</strong>}
              {filterSoloGuerra && <span> (solo guerra)</span>}
            </p>
            <button
              className="btn-limpiar-filtros-destacado"
              onClick={limpiarFiltros}
            >
              Limpiar filtros y ver todos
            </button>
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="alert-empty">📋 No hay histórico disponible</div>
      ) : (
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
      )}
    </div>
  );
};

const AjustesTabla = ({
  data,
  filterNombreAjuste,
  setFilterNombreAjuste,
  filterCombustible,
  setFilterCombustible,
  combustiblesUnicos,
  totalItems
}) => {
  const [vistaDetallada, setVistaDetallada] = useState(false);

  const hayFiltrosActivos = filterNombreAjuste.trim() !== '' || filterCombustible.trim() !== '';

  const limpiarFiltros = () => {
    setFilterNombreAjuste('');
    setFilterCombustible('');
  };

  const agrupadosPorEstacion = useMemo(() => {
    const grupos = {};
    data.forEach(item => {
      const key = item.cod_cne || 'sin_cne';
      if (!grupos[key]) {
        grupos[key] = {
          Nom_Eds: item.Nom_Eds,
          marca: item.marca,
          cod_cne: item.cod_cne,
          pbl: item.pbl,
          combustibles: []
        };
      }
      grupos[key].combustibles.push(item);
    });

    return Object.values(grupos).map(grupo => {
      const subgrupos = {};
      grupo.combustibles.forEach(comb => {
        const difComp = comb.Diferencia_Competencia || 0;
        const difPropia = comb.Estrategia_Propia || 0;
        const combinedKey = `${difComp}_${difPropia}`;

        if (!subgrupos[combinedKey]) {
          subgrupos[combinedKey] = {
            diferencia_competencia: difComp,
            diferencia_propia: difPropia,
            combustibles: []
          };
        }
        subgrupos[combinedKey].combustibles.push(comb);
      });

      return {
        ...grupo,
        subgrupos: Object.values(subgrupos)
      };
    });
  }, [data]);

  const formatFecha = (fechaStr) => {
    if (!fechaStr || fechaStr === 'Mantiene Fecha') return { dia: 'Mantiene', hora: '' };
    const [datePart, timePart] = fechaStr.split(' ');
    return {
      dia: datePart || '-',
      hora: timePart?.substring(0, 5) || ''
    };
  };

  return (
    <div className="historico-wrapper">
      <div className="historico-filtros">
        <input
          type="text"
          className="input-filtro-hist"
          placeholder="Buscar estación..."
          value={filterNombreAjuste}
          onChange={(e) => setFilterNombreAjuste(e.target.value)}
        />
        <select
          className="input-filtro-hist"
          value={filterCombustible}
          onChange={(e) => setFilterCombustible(e.target.value)}
          style={{ minWidth: '150px' }}
        >
          <option value="">Todos los combustibles</option>
          {combustiblesUnicos.map(comb => (
            <option key={comb} value={comb}>{comb}</option>
          ))}
        </select>

        <label className="check-filtro-hist">
          <input
            type="checkbox"
            checked={vistaDetallada}
            onChange={(e) => setVistaDetallada(e.target.checked)}
          />
          <span>Vista detallada</span>
        </label>

        {hayFiltrosActivos && (
          <button
            className="btn-limpiar-filtros"
            onClick={limpiarFiltros}
            title="Limpiar todos los filtros"
          >
            ✕ Limpiar
          </button>
        )}

        <span style={{ marginLeft: 'auto', color: '#666', fontSize: '13px', fontWeight: 600 }}>
          Mostrando {vistaDetallada ? data.length : agrupadosPorEstacion.length} registros
        </span>
      </div>

      {data.length === 0 && hayFiltrosActivos ? (
        <div className="sin-resultados-filtro">
          <div className="sin-resultados-content">
            <span className="sin-resultados-icon">🔍</span>
            <p className="sin-resultados-texto">
              No se encontraron ajustes para la búsqueda
              {filterNombreAjuste && <strong> "{filterNombreAjuste}"</strong>}
              {filterCombustible && <span> ({filterCombustible})</span>}
            </p>
            <button
              className="btn-limpiar-filtros-destacado"
              onClick={limpiarFiltros}
            >
              Limpiar filtros y ver todos
            </button>
          </div>
        </div>
      ) : data.length === 0 ? (
        <div className="alert-empty">📋 No hay datos de ajustes disponibles</div>
      ) : vistaDetallada ? (
        <table className="historico-table-compact">
          <thead>
            <tr>
              <th>Estación</th>
              <th>Marca</th>
              <th>CNE</th>
              <th>Combustible</th>
              <th>PBL</th>
              <th>Precio Asistido</th>
              <th>Precio Autoservicio</th>
              <th>Dif. Competencia</th>
              <th>Estrategia Propia</th>
              <th>Cambio Precio</th>
              <th>Fecha Autoservicio</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => {
              const difComp = item.Diferencia_Competencia || 0;
              const difPropia = item.Estrategia_Propia || 0;
              const fechaAuto = formatFecha(item.fecha_autoservicio);
              const precioAsistido = item.precio_asistido || 0;
              const precioAutoservicio = item.precio_autoservicio || 0;
              const cambioPrecio = item.cambio_precio || 'Mantiene Diferencia';

              return (
                <tr key={idx}>
                  <td className="td-estacion" title={item.Nom_Eds}>
                    {item.Nom_Eds || 'S/N'}
                  </td>
                  <td className="td-marca">{item.marca || '-'}</td>
                  <td className="td-cne" title={item.cod_cne}>
                    {item.cod_cne || '-'}
                  </td>
                  <td className="td-combustible">
                    <span className={`combustible-badge combustible-${item.combustible?.toLowerCase()}`}>
                      {item.combustible || '-'}
                    </span>
                  </td>
                  <td className="td-pbl">{item.pbl || '-'}</td>
                  <td className="td-precio"><strong>${precioAsistido}</strong></td>
                  <td className="td-precio"><strong>${precioAutoservicio}</strong></td>
                  <td className={`td-diferencia ${difComp > 0 ? 'precio-sube' : difComp < 0 ? 'precio-baja' : 'precio-igual'}`}>
                    <strong>
                      {difComp > 0 ? '↑ +' : difComp < 0 ? '↓ ' : ''}{difComp}
                    </strong>
                  </td>
                  <td className={`td-diferencia ${difPropia > 0 ? 'precio-sube' : difPropia < 0 ? 'precio-baja' : 'precio-igual'}`}>
                    <strong>
                      {difPropia > 0 ? '↑ +' : difPropia < 0 ? '↓ ' : ''}{difPropia}
                    </strong>
                  </td>
                  <td className="td-cambio-precio" style={{ fontSize: '11px' }}>
                    {cambioPrecio}
                  </td>
                  <td className="td-fecha">
                    <div className="fecha-compacta">
                      <span className="fecha-dia">{fechaAuto.dia}</span>
                      {fechaAuto.hora && <span className="fecha-hora">{fechaAuto.hora}</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <table className="historico-table-compact ajustes-simplified">
          <thead>
            <tr>
              <th>Estación</th>
              <th>Marca</th>
              <th>CNE</th>
              <th>PBL</th>
              <th>Combustibles</th>
              <th>Dif. Competencia</th>
              <th>Dif. Estrategia</th>
              <th>Fecha Vigencia</th>
            </tr>
          </thead>
          <tbody>
            {agrupadosPorEstacion.map((grupo, idx) => {
              return grupo.subgrupos.map((subgrupo, subIdx) => {
                const fechaVig = formatFecha(subgrupo.combustibles[0]?.FechaVigenciaSugerida);
                const difComp = subgrupo.diferencia_competencia;
                const difPropia = subgrupo.diferencia_propia;

                return (
                  <tr key={`${idx}-${subIdx}`}>
                    {subIdx === 0 && (
                      <>
                        <td className="td-estacion" rowSpan={grupo.subgrupos.length} title={grupo.Nom_Eds}>
                          {grupo.Nom_Eds?.slice(0, 18) || 'S/N'}
                        </td>
                        <td className="td-marca" rowSpan={grupo.subgrupos.length}>{grupo.marca || '-'}</td>
                        <td className="td-cne" rowSpan={grupo.subgrupos.length} title={grupo.cod_cne}>
                          {grupo.cod_cne?.slice(-6) || '-'}
                        </td>
                        <td className="td-pbl" rowSpan={grupo.subgrupos.length}>{grupo.pbl || '-'}</td>
                      </>
                    )}
                    <td className="td-combustibles">
                      {subgrupo.combustibles.map((c, i) => (
                        <span key={i} className={`combustible-badge combustible-${c.combustible?.toLowerCase()}`} style={{ marginRight: '4px' }}>
                          {c.combustible}
                        </span>
                      ))}
                    </td>
                    <td className={`td-diferencia ${difComp > 0 ? 'precio-sube' : difComp < 0 ? 'precio-baja' : 'precio-igual'}`}>
                      <strong>{difComp > 0 ? '↑' : difComp < 0 ? '↓' : '='} {difComp > 0 ? '+' : ''}{difComp}</strong>
                    </td>
                    <td className={`td-diferencia ${difPropia > 0 ? 'precio-sube' : difPropia < 0 ? 'precio-baja' : 'precio-igual'}`}>
                      <strong>{difPropia > 0 ? '↑' : difPropia < 0 ? '↓' : '='} {difPropia > 0 ? '+' : ''}{difPropia}</strong>
                    </td>
                    <td className="td-fecha">
                      <div className="fecha-compacta">
                        <span className="fecha-dia">{fechaVig.dia}</span>
                        {fechaVig.hora && <span className="fecha-hora">{fechaVig.hora}</span>}
                      </div>
                    </td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AlertPanel;
