import React, { useState, useMemo, useEffect } from 'react';
import './styles/globals.css';
import './styles/layout.css';
import './styles/markers.css';
import MapComponent from './components/MapComponent';
import FilterPanel from './components/FilterPanel';
import { REGION_COORDINATES } from './utils/constants';
import { useMapData } from './hooks/useMapData';
import { getDataBaseComp } from './services/apiService';

function App() {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [rightPanelVisible, setRightPanelVisible] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState('Metropolitana de Santiago');
  const [filteredMarkers, setFilteredMarkers] = useState([]);
  const [filteredMarkersForMercado, setFilteredMarkersForMercado] = useState([]);
  const [baseCompData, setBaseCompData] = useState([]);
  const { markers } = useMapData();

  const regions = useMemo(() => {
    const uniqueRegions = [...new Set(markers.map(m => m.Region))].sort();
    return uniqueRegions;
  }, [markers]);

  const regionMarkers = useMemo(() => {
    return markers.filter(m => m.Region === selectedRegion);
  }, [markers, selectedRegion]);

  // Cargar base competencia
  useEffect(() => {
    const loadIt = async () => {
      try {
        console.log('🔄 Cargando base_comp...');
        const data = await getDataBaseComp();
        console.log('📦 Respuesta:', data);
        
        const final = data?.bascomp || data?.base_comp || data?.data || [];
        console.log(`✅ Total: ${final.length}`);
        
        setBaseCompData(final);
      } catch (err) {
        console.error('❌ Error:', err);
      }
    };
    
    loadIt();
  }, []);

  // ✅ Función para recibir ambos arrays del FilterPanel
 const handleFiltersChange = (filtered, filteredForMercado) => {
  setFilteredMarkers(filtered);
  
  // ✅ CLAVE: Siempre pasar regionMarkers para Mercado (sin EDS)
  // Así el botón Mercado siempre busca en TODO sin importar qué EDS esté seleccionada
  setFilteredMarkersForMercado(regionMarkers);
};

  return (
    <div className="app-container">
      {/* Navbar */}
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

      {/* Contenedor principal */}
      <div className="main-container">
        {/* Sidebar */}
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

        {/* Mapa */}
        <div className="map-wrapper">
     <MapComponent 
  selectedRegion={selectedRegion}
  regionCenter={REGION_COORDINATES[selectedRegion]}
  markers={filteredMarkers.length > 0 ? filteredMarkers : regionMarkers}
  markersForMercado={regionMarkers}  // ✅ SIEMPRE TODO SIN EDS
  baseCompData={baseCompData}
/>

          <div className="map-controls">
            <button className="map-btn">🖼️ Pantalla Completa</button>
          </div>
        </div>

        {/* Panel derecho */}
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

      {/* Botones flotantes */}
      <button className="toggle-btn toggle-sidebar" onClick={() => setSidebarVisible(!sidebarVisible)}>
        {sidebarVisible ? '◀ Filtros' : '▶ Mostrar'}
      </button>
      <button className="toggle-btn toggle-right" onClick={() => setRightPanelVisible(!rightPanelVisible)}>
        {rightPanelVisible ? 'Datos ▶' : '◀ Mostrar'}
      </button>
    </div>
  );
}

export default App;
