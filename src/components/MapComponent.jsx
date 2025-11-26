import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import IconMarkersLayer from './IconMarkersLayer';
import NotesModal from './NotesModal';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const TILE_LAYERS = {
  streets: {
    name: 'Calles',
    icon: '🗺️',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap'
  },
  satellite: {
    name: 'Satélite',
    icon: '🛰️',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri'
  },
  hybrid: {
    name: 'Híbrido',
    icon: '🌍',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri'
  }
};

function MapController({ regionCenter }) {
  const map = useMap();

  useEffect(() => {
    if (regionCenter && regionCenter.length === 2) {
      map.setView(regionCenter, 10);
    }
  }, [regionCenter, map]);

  useEffect(() => {
    window.leafletMap = map;
  }, [map]);

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

function MapComponent({
  selectedRegion,
  regionCenter,
  markers,
  markersForMercado,
  baseCompData,
  onToggleSidebar,
  onToggleRightPanel,
  sidebarVisible,
  rightPanelVisible
}) {
  const [selectedLayer, setSelectedLayer] = useState('streets');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [searchMarker, setSearchMarker] = useState(null); // ← AGREGADO
  const [panelsMenuOpen, setPanelsMenuOpen] = useState(false);
  const [layersMenuOpen, setLayersMenuOpen] = useState(false);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const searchTimeoutRef = useRef(null);

  const handleSearch = (query) => {
    setSearchQuery(query);

    if (query.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=cl&limit=8&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'MapaEstaciones/1.0',
              'Accept-Language': 'es'
            }
          }
        );

        const data = await response.json();
        setSearchResults(data);
        setShowResults(data.length > 0);
      } catch (error) {
        console.error('Error en búsqueda:', error);
      }
    }, 500);
  };

  const selectLocation = (result) => {
    const map = window.leafletMap;
    if (map) {
      const lat = parseFloat(result.lat);
      const lon = parseFloat(result.lon);
      map.setView([lat, lon], 17);

      // ← AGREGADO: Guardar marcador
      setSearchMarker({
        position: [lat, lon],
        address: result.display_name
      });
    }

    setSearchQuery(result.display_name.split(',')[0]); // Primera parte
    setShowResults(false);
  };

  return (
    <div className="map-wrapper">
      {/* BUSCADOR DE DIRECCIONES - COMPACTO AL LADO DE LOS BOTONES */}
      <div className="map-control-left">
        <div className="search-bar-inline">
          <input
            type="text"
            className="search-input-inline"
            placeholder="🔍 Buscar dirección..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />

          {searchQuery && (
            <button
              className="search-clear-btn"
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
                setShowResults(false);
                setSearchMarker(null); // ← AGREGADO: Limpiar marcador
              }}
              title="Limpiar búsqueda"
            >
              ✕
            </button>
          )}

          {showResults && searchResults.length > 0 && (
            <div className="search-results-dropdown-inline">
              {searchResults.map((result, index) => (
                <div
                  key={index}
                  className="search-result-item"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectLocation(result);
                  }}
                >
                  📍 {result.display_name}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MENÚ CAPAS Y NOTAS (DERECHA) */}
      <div className="map-control-right">
        <button
          className="control-toggle-btn"
          onClick={() => setLayersMenuOpen(!layersMenuOpen)}
          title="Capas del Mapa"
        >
          🗺️
        </button>

        <button
          className="control-toggle-btn"
          onClick={() => setNotesModalOpen(true)}
          title="Notas"
        >
          📝
        </button>

        {layersMenuOpen && (
          <div className="control-dropdown">
            <div className="control-section">
              <div className="control-section-title">Capas del Mapa</div>
              <div className="layer-buttons">
                {Object.entries(TILE_LAYERS).map(([key, layer]) => (
                  <button
                    key={key}
                    className={`layer-btn-compact ${selectedLayer === key ? 'active' : ''}`}
                    onClick={() => setSelectedLayer(key)}
                  >
                    {layer.icon} {layer.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <MapContainer
        center={regionCenter || [-33.4489, -70.6693]}
        zoom={10}
        className="map"
        zoomControl={true}
      >
        <TileLayer
          url={TILE_LAYERS[selectedLayer].url}
          attribution={TILE_LAYERS[selectedLayer].attribution}
          maxZoom={19}
        />

        {selectedLayer === 'hybrid' && (
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution=""
            opacity={0.4}
          />
        )}

        <MapController regionCenter={regionCenter} />

        <IconMarkersLayer
          markers={markers}
          markersForMercado={markersForMercado}
          selectedRegion={selectedRegion}
          baseCompData={baseCompData}
        />

        {/* ← AGREGADO: MARCADOR DE BÚSQUEDA */}
        {searchMarker && (
          <Marker
            position={searchMarker.position}
            icon={L.divIcon({
              className: 'custom-search-marker',
              html: '<span class="search-marker-icon">📍</span>',
              iconSize: [40, 40],
              iconAnchor: [20, 40],
              popupAnchor: [0, -40]
            })}
          >
            <Popup>
              <div style={{ padding: '8px', minWidth: '200px' }}>
                <strong style={{ color: '#02d6a8', fontSize: '13px', display: 'block', marginBottom: '8px' }}>
                  📍 Ubicación buscada
                </strong>
                <p style={{ margin: 0, fontSize: '12px', color: '#495057' }}>
                  {searchMarker.address}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

      </MapContainer>

      {/* MODAL DE NOTAS */}
      <NotesModal
        isOpen={notesModalOpen}
        onClose={() => setNotesModalOpen(false)}
      />
    </div>
  );
}

export default MapComponent;
