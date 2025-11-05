import React, { useMemo, useState } from 'react';

const FilterPanel = ({ markers, selectedRegion, onFiltersChange }) => {
  const [selectedComuna, setSelectedComuna] = useState('');
  const [selectedMarca, setSelectedMarca] = useState('');
  const [selectedJefeZona, setSelectedJefeZona] = useState('');
  const [selectedEds, setSelectedEds] = useState('');
  const [edsSearchTerm, setEdsSearchTerm] = useState('');

  const comunas = useMemo(() => {
    const filtered = markers.filter(m => m.Region === selectedRegion);
    return [...new Set(filtered.map(m => m.Comuna))].sort();
  }, [markers, selectedRegion]);

  const marcas = useMemo(() => {
    const filtered = markers.filter(m => m.Region === selectedRegion);
    return [...new Set(filtered.map(m => m.Marca))].sort();
  }, [markers, selectedRegion]);

  const jefesZona = useMemo(() => {
    const filtered = markers.filter(m => 
      m.Region === selectedRegion && m.nombre
    );
    return [...new Set(filtered.map(m => m.nombre))].sort();
  }, [markers, selectedRegion]);

  const allEds = useMemo(() => {
    return [...new Set(
      markers
        .filter(m => {
          const regionMatch = m.Region === selectedRegion;
          const comunaMatch = !selectedComuna || m.Comuna === selectedComuna;
          const marcaMatch = !selectedMarca || m.Marca === selectedMarca;
          const jefeMatch = !selectedJefeZona || m.nombre === selectedJefeZona;
          return regionMatch && comunaMatch && marcaMatch && jefeMatch;
        })
        .map(m => m.eds)
        .filter(eds => eds)
    )].sort();
  }, [markers, selectedRegion, selectedComuna, selectedMarca, selectedJefeZona]);

  const filteredEds = useMemo(() => {
    return allEds.filter(eds =>
      eds.toLowerCase().includes(edsSearchTerm.toLowerCase())
    );
  }, [allEds, edsSearchTerm]);

  const filteredMarkers = useMemo(() => {
    return markers.filter(m => {
      const regionMatch = m.Region === selectedRegion;
      const comunaMatch = !selectedComuna || m.Comuna === selectedComuna;
      const marcaMatch = !selectedMarca || m.Marca === selectedMarca;
      const jefeMatch = !selectedJefeZona || m.nombre === selectedJefeZona;
      const edsMatch = !selectedEds || m.eds === selectedEds;
      return regionMatch && comunaMatch && marcaMatch && jefeMatch && edsMatch;
    });
  }, [markers, selectedRegion, selectedComuna, selectedMarca, selectedJefeZona, selectedEds]);

  React.useEffect(() => {
    onFiltersChange(filteredMarkers);
  }, [filteredMarkers, onFiltersChange]);

  const markersByBrand = useMemo(() => {
    const result = {};
    filteredMarkers.forEach(m => {
      result[m.Marca] = (result[m.Marca] || 0) + 1;
    });
    return result;
  }, [filteredMarkers]);

  const handleClearFilters = () => {
    setSelectedComuna('');
    setSelectedMarca('');
    setSelectedJefeZona('');
    setSelectedEds('');
    setEdsSearchTerm('');
  };

  return (
    <div className="filter-panel">
      <h3 className="filter-title">📊 Estadísticas</h3>
      <div className="stats-mini">
        <div className="stat-item">
          <span className="stat-label">Estaciones</span>
          <span className="stat-value">{filteredMarkers.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Marcas</span>
          <span className="stat-value">{Object.keys(markersByBrand).length}</span>
        </div>
      </div>

      <h3 className="filter-title">🏢 Por Marca</h3>
      <div className="brands-mini">
        {Object.entries(markersByBrand)
          .sort((a, b) => b[1] - a[1])
          .map(([brand, count]) => (
            <div key={brand} className="brand-mini">
              <span>{brand}</span>
              <span className="count">{count}</span>
            </div>
          ))}
      </div>

      <h3 className="filter-title">🔍 Filtros Avanzados</h3>

      <div className="filter-item">
        <label>Comuna</label>
        <select
          value={selectedComuna}
          onChange={(e) => {
            setSelectedComuna(e.target.value);
            setSelectedEds('');
            setEdsSearchTerm('');
          }}
        >
          <option value="">Todas</option>
          {comunas.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="filter-item">
        <label>Marca</label>
        <select
          value={selectedMarca}
          onChange={(e) => setSelectedMarca(e.target.value)}
        >
          <option value="">Todas</option>
          {marcas.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      <div className="filter-item">
        <label>Jefe de Zona</label>
        <select
          value={selectedJefeZona}
          onChange={(e) => {
            setSelectedJefeZona(e.target.value);
            setSelectedEds('');
            setEdsSearchTerm('');
          }}
        >
          <option value="">Todos</option>
          {jefesZona.map(jefe => (
            <option key={jefe} value={jefe}>{jefe}</option>
          ))}
        </select>
      </div>

      <div className="filter-item">
        <label>Buscar EDS</label>
        <input
          type="text"
          placeholder="Escribe para buscar..."
          value={edsSearchTerm}
          onChange={(e) => {
            setEdsSearchTerm(e.target.value);
            setSelectedEds('');
          }}
        />
        
        {edsSearchTerm && filteredEds.length > 0 && (
          <div className="eds-dropdown">
            {filteredEds.slice(0, 8).map(eds => (
              <div
                key={eds}
                className="eds-option"
                onClick={() => {
                  setSelectedEds(eds);
                  setEdsSearchTerm('');
                }}
              >
                {eds}
              </div>
            ))}
          </div>
        )}

        {selectedEds && (
          <div className="selected-eds">
            <span>✓ {selectedEds}</span>
            <button
              onClick={() => {
                setSelectedEds('');
                setEdsSearchTerm('');
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      <button className="btn-clear" onClick={handleClearFilters}>
        🔄 Limpiar Filtros
      </button>
    </div>
  );
};

export default FilterPanel;
