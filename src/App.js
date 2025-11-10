import React, { useState, useMemo, useEffect } from 'react';
import './styles/globals.css';
import './styles/layout.css';
import './styles/markers.css';
import MapComponent from './components/MapComponent';
import FilterPanel from './components/FilterPanel';
import { REGION_COORDINATES, REGIONES_ORDENADAS } from './utils/constants';
import { useMapData } from './hooks/useMapData';
import { getDataBaseComp } from './services/apiService';

function App() {
  const [sidebarVisible, setSidebarVisible] = useState(false); // ✅ CERRADO por defecto
  const [rightPanelVisible, setRightPanelVisible] = useState(false); // ✅ CERRADO por defecto
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

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-logo">
            <span>🗺️</span>
            ARAMCO - Mapa de Estaciones
          </div>
          <ul className="navbar-menu">
            <li><a href="#/" className="active">Mapa Resumen</a></li>
            <li><a href="#/mercado">Mapa Mercado</a></li>
            <li><a href="#/movimiento">Movimiento Mercado</a></li>
            <li><a href="#/reportes">Reportes Power BI</a></li>
          </ul>
          <div className="navbar-brand">
            <strong>aramco</strong>
          </div>
        </div>
      </nav>

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
      </div>
    </div>
  );
}

export default App;
