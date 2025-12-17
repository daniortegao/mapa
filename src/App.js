import React, { useState, useMemo, useEffect } from 'react';
import './styles/globals.css';
import './styles/layout.css';
import './styles/markers.css';
import MapComponent from './components/MapComponent';
import FilterPanel from './components/FilterPanel';
import AlertPanel from './components/AlertPanel';
import StatisticsPanel from './components/StatisticsPanel';
import { REGION_COORDINATES, REGIONES_ORDENADAS } from './utils/constants';
import { useMapData } from './hooks/useMapData';
import { getDataBaseComp, getMercadoAlerta, getMarcasCompartidas, guardarMarcasCompartidas } from './services/apiService';

function App() {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [rightPanelVisible, setRightPanelVisible] = useState(false);
  const [alertPanelVisible, setAlertPanelVisible] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [selectedRegion, setSelectedRegion] = useState('Metropolitana de Santiago');
  const [filteredMarkers, setFilteredMarkers] = useState([]);
  const [filteredMarkersForMercado, setFilteredMarkersForMercado] = useState([]);
  const [baseCompData, setBaseCompData] = useState([]);
  const { markers, lastUpdateTime } = useMapData();

  // Estado para estaciones marcadas como "Nivel 2 en Nivel 1"
  const [nivel2EnNivel1Stations, setNivel2EnNivel1Stations] = useState([]);

  // Cargar marcas compartidas al iniciar
  useEffect(() => {
    const loadMarcas = async () => {
      try {
        const marcas = await getMarcasCompartidas();
        if (Array.isArray(marcas)) {
          setNivel2EnNivel1Stations(marcas);
        }
      } catch (err) {
        console.error('Error cargando marcas compartidas:', err);
      }
    };
    loadMarcas();
  }, []);

  const regions = useMemo(() => {
    const regionesConDatos = new Set(markers.map(m => m.Region));
    return REGIONES_ORDENADAS.filter(region => regionesConDatos.has(region));
  }, [markers]);

  const regionMarkers = useMemo(() => {
    return markers.filter(m => m.Region === selectedRegion);
  }, [markers, selectedRegion]);

  // ✅ AGREGA ESTO (marcadores únicos SOLO para el mapa):
  const uniqueRegionMarkers = useMemo(() => {
    const filtered = markers.filter(m => m.Region === selectedRegion);

    // Deduplicar: mantener solo el más reciente por estación
    const uniqueMap = new Map();

    filtered.forEach(marker => {
      const key = marker.pbl || marker.id || `${marker.lat}_${marker.lng}`;
      const existing = uniqueMap.get(key);

      if (!existing) {
        uniqueMap.set(key, marker);
      } else {
        const existingDate = existing.fecha_aplicacion ? new Date(existing.fecha_aplicacion) : new Date(0);
        const currentDate = marker.fecha_aplicacion ? new Date(marker.fecha_aplicacion) : new Date(0);

        if (currentDate > existingDate) {
          uniqueMap.set(key, marker);
        }
      }
    });

    const unique = Array.from(uniqueMap.values());
    console.log(`📍 ${selectedRegion}: ${unique.length} estaciones únicas de ${filtered.length} registros`);

    return unique;
  }, [markers, selectedRegion]);


  useEffect(() => {
    const loadIt = async () => {
      try {
        const data = await getDataBaseComp();
        const final = data?.bascomp || data?.base_comp || data?.data || [];
        setBaseCompData(final);
      } catch (err) {
        console.error('Error:', err);
      }
    };
    loadIt();
  }, []);

  // NOTA: Ya no usamos localStorage para persistencia local
  // La persistencia se maneja directamente al actualizar el estado

  useEffect(() => {
    const loadAlertCount = async () => {
      try {
        const alertas = await getMercadoAlerta();
        const getStationCount = (alerts) => {
          const estaciones = {};
          alerts.forEach(a => {
            estaciones[a.Nom_Eds || 'Sin nombre'] = true;
          });
          return Object.keys(estaciones).length;
        };
        const count = getStationCount(alertas);
        setAlertCount(count);
      } catch (err) {
        console.error('Error al cargar alertas:', err);
        setAlertCount(0);
      }
    };
    loadAlertCount();
    const interval = setInterval(loadAlertCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleFiltersChange = React.useCallback((filtered, filteredForMercado) => {
    setFilteredMarkers(filtered); // ← Únicos para visualizar
    setFilteredMarkersForMercado(filteredForMercado); // ← Histórico completo filtrado
  }, []);

  const handleStationSelect = (station) => {
    if (station && window.leafletMap) {
      // Change region if needed
      if (station.region !== selectedRegion) {
        setSelectedRegion(station.region);
      }
      // Center map on station with zoom
      setTimeout(() => {
        window.leafletMap.setView([station.lat, station.lng], 15);
      }, 100);
    }
  };

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
    setTimeout(() => {
      if (window.leafletMap) {
        window.leafletMap.invalidateSize();
      }
    }, 300);
  };

  const toggleRightPanel = () => {
    setRightPanelVisible(!rightPanelVisible);
    setTimeout(() => {
      if (window.leafletMap) {
        window.leafletMap.invalidateSize();
      }
    }, 300);
  };

  const toggleAlertPanel = () => {
    setAlertPanelVisible(!alertPanelVisible);
  };

  const toggleNivel2EnNivel1 = async (stationId) => {
    // Actualización optimista
    let newStations = [];
    setNivel2EnNivel1Stations(prev => {
      if (prev.includes(stationId)) {
        newStations = prev.filter(id => id !== stationId);
      } else {
        newStations = [...prev, stationId];
      }
      return newStations;
    });

    // Guardar en backend
    try {
      await guardarMarcasCompartidas(newStations);
    } catch (err) {
      console.error('Error guardando marcas compartidas:', err);
      // Revertir en caso de error (opcional, pero recomendado)
      // Por simplicidad, recargamos del servidor
      const marcas = await getMarcasCompartidas();
      if (Array.isArray(marcas)) {
        setNivel2EnNivel1Stations(marcas);
      }
    }
  };

  // Estado para intercambiar aplicaciones
  const [activeApp, setActiveApp] = useState('mapa'); // 'mapa' | 'calculos'

  // Usuario autenticado para mostrar en navbar
  const [loggedUser, setLoggedUser] = useState(() => {
    try {
      return localStorage.getItem('user_calc') || null;
    } catch (e) {
      return null;
    }
  });



  // URL base del proyecto frontend (Calculos)
  // Desarrollo: normalmente corre en localhost:3002 (verificar puerto correcto según orden de inicio)
  // Producción: Carpeta hermana '../Calculos/' (Asumiendo que Mapa está en /Mapa/ y Calculos en /Calculos/)
  const CALCULOS_APP_BASE_URL = process.env.NODE_ENV === 'development'
    ? 'http://localhost:3002'
    : '../Calculos/';

  // URL base del proyecto Ajuste Semanal
  const AJUSTE_APP_BASE_URL = process.env.NODE_ENV === 'development'
    ? 'http://localhost:3001'
    : '../Ajuste/';

  const calculosSrc = useMemo(() => {
    const params = new URLSearchParams();
    params.set('mode', 'embed');
    if (loggedUser) {
      params.set('user', loggedUser);
    }
    return `${CALCULOS_APP_BASE_URL}?${params.toString()}`;
  }, [CALCULOS_APP_BASE_URL, loggedUser]);

  const ajusteSrc = useMemo(() => {
    return `${AJUSTE_APP_BASE_URL}?mode=embed`;
  }, [AJUSTE_APP_BASE_URL]);

  const handleOpenPrecios = () => {
    setActiveApp('calculos');
  };



  // Escuchar mensajes desde el iframe de cálculos (logout, etc.)
  useEffect(() => {
    const handleMessage = (event) => {
      const { data } = event;
      if (!data || typeof data !== 'object') return;

      if (data.type === 'CALCULOS_LOGOUT') {
        // Volver al mapa y limpiar usuario local
        setActiveApp('mapa');
        setLoggedUser(null);
        try {
          localStorage.removeItem('user_calc');
        } catch (e) {
          // ignoramos errores
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="app-container">
      {/* LOGIN COMO PANTALLA FLOTANTE PARA PRECIOS */}

      {/* ========== NAVBAR ========== */}
      <nav className="navbar">
        <div className="navbar-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* LEFT: Logo y Título */}
          <div className="navbar-left">
            <h1 className="navbar-title">S.I.M.E</h1>
            <span className="navbar-subtitle">Sistema Integrado de Mercado y Estrategia</span>
            {/* Hora de Actualización */}
            {lastUpdateTime && (
              <div style={{
                fontSize: '12px',
                color: 'rgba(12, 12, 12, 0.85)',
                marginTop: '2px'
              }}>
                <span style={{ fontWeight: 'bold' }}>Actualizado: </span>
                <span>{typeof lastUpdateTime === 'string' ? lastUpdateTime : new Date(lastUpdateTime).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
              </div>
            )}
          </div>

          {/* CENTER: App Switcher */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => setActiveApp('mapa')}
              style={{
                background: activeApp === 'mapa' ? 'rgba(255,255,255,0.25)' : 'transparent',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.5)',
                borderRadius: '12px',
                padding: '6px 16px',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: activeApp === 'mapa' ? 'bold' : 'normal',
                transition: 'all 0.2s'
              }}
            >
              🗺️ Mapa
            </button>
            <button
              onClick={() => setActiveApp('ajuste')}
              style={{
                background: activeApp === 'ajuste' ? 'rgba(255,255,255,0.25)' : 'transparent',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.5)',
                borderRadius: '12px',
                padding: '6px 16px',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: activeApp === 'ajuste' ? 'bold' : 'normal',
                transition: 'all 0.2s'
              }}
            >
              📊 Ajuste Semanal
            </button>
            <button
              onClick={handleOpenPrecios}
              style={{
                background: activeApp === 'calculos' ? 'rgba(255,255,255,0.25)' : 'transparent',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.5)',
                borderRadius: '12px',
                padding: '6px 16px',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: activeApp === 'calculos' ? 'bold' : 'normal',
                transition: 'all 0.2s'
              }}
            >
              🔢 Calculo Precios
            </button>
          </div>

          {/* RIGHT: Alertas y Logo */}
          <div className="navbar-right" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            {/* Alertas (solo en mapa) */}
            {activeApp === 'mapa' && (
              <button
                className="navbar-alert-btn"
                onClick={toggleAlertPanel}
                aria-label="Ver alertas de mercado"
                title="Alertas de mercado"
              >
                🔔
                {alertCount > 0 && (
                  <span className="alert-badge">{alertCount}</span>
                )}
              </button>
            )}

            <img
              src={`${process.env.PUBLIC_URL}/iconos/aramco.jpg`}
              alt="Aramco Logo"
              className="navbar-logo"
              onError={(e) => e.target.style.display = 'none'}
            />
          </div>
        </div>
      </nav>

      {/* ========== PESTAÑAS HORIZONTALES (Solo Mapa) ========== */}
      {activeApp === 'mapa' && (
        <div className="panel-tabs-horizontal">
          <button
            className={`vertical-tab-btn ${sidebarVisible ? 'active' : ''}`}
            onClick={toggleSidebar}
          >
            <div className="vertical-tab-label">
              {sidebarVisible ? 'OCULTAR FILTROS' : 'MOSTRAR FILTROS'}
            </div>
          </button>

          <button
            className={`vertical-tab-btn ${rightPanelVisible ? 'active' : ''}`}
            onClick={toggleRightPanel}
          >
            <div className="vertical-tab-label">
              {rightPanelVisible ? 'OCULTAR DATOS' : 'MOSTRAR DATOS'}
            </div>
          </button>
        </div>
      )}

      {/* ========== MAIN CONTAINER ========== */}
      <div className="main-container">

        {/* Renderizado Condicional: MAPA vs CALCULOS */}
        {activeApp === 'mapa' ? (
          <>
            <aside className={`sidebar ${!sidebarVisible ? 'hidden' : ''}`}>
              <h3 className="sidebar-title">Filtros</h3>
              <div className="filter-group">
                <label>Región</label>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                >
                  {regions.map(region => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </div>

              <FilterPanel
                markers={regionMarkers}
                allMarkers={markers}
                selectedRegion={selectedRegion}
                onFiltersChange={handleFiltersChange}
                onStationSelect={handleStationSelect}
              />
            </aside>

            {(() => {
              const markersToMap = filteredMarkers.length > 0 ? filteredMarkers : uniqueRegionMarkers;
              return null;
            })()}

            <MapComponent
              selectedRegion={selectedRegion}
              regionCenter={REGION_COORDINATES[selectedRegion]}
              markers={filteredMarkers.length > 0 ? filteredMarkers : uniqueRegionMarkers}
              markersForMercado={filteredMarkers.length > 0 ? filteredMarkersForMercado : regionMarkers}
              baseCompData={baseCompData}
              onToggleSidebar={toggleSidebar}
              onToggleRightPanel={toggleRightPanel}
              sidebarVisible={sidebarVisible}
              rightPanelVisible={rightPanelVisible}
              nivel2EnNivel1Stations={nivel2EnNivel1Stations}
              onToggleNivel2EnNivel1={toggleNivel2EnNivel1}
            />

            <aside className={`right-panel ${!rightPanelVisible ? 'hidden' : ''}`}>
              <StatisticsPanel
                markers={filteredMarkers.length > 0 ? filteredMarkers : uniqueRegionMarkers}
                historicalMarkers={filteredMarkersForMercado.length > 0 ? filteredMarkersForMercado : regionMarkers}
                allMarkers={markers}
              />
            </aside>

            <AlertPanel
              isVisible={alertPanelVisible}
              onClose={toggleAlertPanel}
            />
          </>
        ) : activeApp === 'calculos' ? (
          // IFRAME CALCULOS
          <iframe
            src={calculosSrc}
            title="Calculadora Precios"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block'
            }}
          />
        ) : (
          // IFRAME AJUSTE SEMANAL
          <iframe
            src={ajusteSrc}
            title="Ajuste Semanal"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block'
            }}
          />
        )}
      </div>

      <div className="navbar-version">V3.0</div>
    </div>
  );
}

export default App;
