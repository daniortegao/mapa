import React, { useState, useMemo, useEffect } from 'react';
import './styles/globals.css';
import './styles/layout.css';
import './styles/markers.css';
import MapComponent from './components/MapComponent';
import FilterPanel from './components/FilterPanel';
import AlertPanel from './components/AlertPanel';
import { REGION_COORDINATES, REGIONES_ORDENADAS } from './utils/constants';
import { useMapData } from './hooks/useMapData';
import { getDataBaseComp, getMercadoAlerta } from './services/apiService';

function App() {
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [rightPanelVisible, setRightPanelVisible] = useState(false);
  const [alertPanelVisible, setAlertPanelVisible] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [selectedRegion, setSelectedRegion] = useState('Metropolitana de Santiago');
  const [filteredMarkers, setFilteredMarkers] = useState([]);
  const [filteredMarkersForMercado, setFilteredMarkersForMercado] = useState([]);
  const [baseCompData, setBaseCompData] = useState([]);
  const { markers } = useMapData();

  const regions = useMemo(() => {
    const regionesConDatos = new Set(markers.map(m => m.Region));
    return REGIONES_ORDENADAS.filter(region => regionesConDatos.has(region));
  }, [markers]);

  const regionMarkers = useMemo(() => {
    return markers.filter(m => m.Region === selectedRegion);
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

  const handleFiltersChange = (filtered, filteredForMercado) => {
    setFilteredMarkers(filtered);
    setFilteredMarkersForMercado(regionMarkers);
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

  return (
    <div className="app-container">
      {/* ========== NAVBAR ========== */}
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-left">
            <h1 className="navbar-title">S.I.M.E</h1>
            <span className="navbar-subtitle">Region {selectedRegion}</span>
          </div>
          
          <div className="navbar-right">
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

            <img 
              src={`${process.env.PUBLIC_URL}/iconos/aramco.jpg`} 
              alt="Aramco Logo" 
              className="navbar-logo"
              onError={(e) => e.target.style.display = 'none'}
            />
          </div>
        </div>
      </nav>

      {/* ========== PESTAÑAS HORIZONTALES (FUERA DEL NAV) ========== */}
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


      {/* ========== MAIN CONTAINER ========== */}
      <div className="main-container">
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
            selectedRegion={selectedRegion}
            onFiltersChange={handleFiltersChange}
          />
        </aside>

        <MapComponent 
          selectedRegion={selectedRegion}
          regionCenter={REGION_COORDINATES[selectedRegion]}
          markers={filteredMarkers.length > 0 ? filteredMarkers : regionMarkers}
          markersForMercado={regionMarkers}
          baseCompData={baseCompData}
          onToggleSidebar={toggleSidebar}
          onToggleRightPanel={toggleRightPanel}
          sidebarVisible={sidebarVisible}
          rightPanelVisible={rightPanelVisible}
        />

        <aside className={`right-panel ${!rightPanelVisible ? 'hidden' : ''}`}>
          <div className="floating-table">
            <div className="floating-table-title">Estación Seleccionada</div>
            <table>
              <thead>
                <tr>
                  <th>Dato</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Región</td>
                  <td>{selectedRegion}</td>
                </tr>
                <tr>
                  <td>Estaciones</td>
                  <td>{filteredMarkers.length > 0 ? filteredMarkers.length : regionMarkers.length}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="floating-table">
            <div className="floating-table-title">Resumen de Precios</div>
            <table>
              <thead>
                <tr>
                  <th>Combustible</th>
                  <th>Promedio</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Diesel</td>
                  <td>$-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </aside>

        <AlertPanel 
          isVisible={alertPanelVisible}
          onClose={toggleAlertPanel}
        />
      </div>

      <div className="navbar-version">v2.0</div>
    </div>
  );
}

export default App;
