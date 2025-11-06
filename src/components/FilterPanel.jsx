import React, { useMemo, useState } from 'react';

const FilterPanel = ({ markers, selectedRegion, onFiltersChange }) => {
  const [selectedComuna, setSelectedComuna] = useState('');
  const [selectedMarca, setSelectedMarca] = useState('');
  const [selectedJefeZona, setSelectedJefeZona] = useState('');
  const [selectedEds, setSelectedEds] = useState('');
  const [edsSearchTerm, setEdsSearchTerm] = useState('');

  const tuasMarcas = ['Aramco', 'Petrobras'];

  const comunas = useMemo(() => {
    const filtered = markers.filter(m => m.Region === selectedRegion);
    return [...new Set(filtered.map(m => m.Comuna))].sort();
  }, [markers, selectedRegion]);

  const marcas = useMemo(() => {
    const filtered = markers.filter(m => m.Region === selectedRegion);
    return [...new Set(filtered.map(m => m.Marca))].sort();
  }, [markers, selectedRegion]);

  const jefesZona = useMemo(() => {
    const filtered = markers.filter(
      m => m.Region === selectedRegion && m.nombre && tuasMarcas.includes(m.Marca)
    );
    return [...new Set(filtered.map(m => m.nombre))].sort();
  }, [markers, selectedRegion, tuasMarcas]);

  const comunasDelJefe = useMemo(() => {
    if (!selectedJefeZona) return [];
    const jefeMarkers = markers.filter(m => m.nombre === selectedJefeZona);
    return [...new Set(jefeMarkers.map(m => m.Comuna))];
  }, [markers, selectedJefeZona]);

  const allEds = useMemo(() => {
    let filtered = markers.filter(m => m.Region === selectedRegion);

    if (selectedJefeZona) {
      filtered = filtered.filter(m => comunasDelJefe.includes(m.Comuna));
    }

    if (selectedComuna) {
      filtered = filtered.filter(m => m.Comuna === selectedComuna);
    }

    if (selectedMarca) {
      filtered = filtered.filter(m => m.Marca === selectedMarca);
    }

    return [...new Set(filtered.map(m => m.eds).filter(eds => eds))].sort();
  }, [markers, selectedRegion, selectedComuna, selectedMarca, selectedJefeZona, comunasDelJefe]);

  const filteredEds = useMemo(() => {
    return allEds.filter(eds =>
      eds.toLowerCase().includes(edsSearchTerm.toLowerCase())
    );
  }, [allEds, edsSearchTerm]);

  // ✅ Array CON filtro EDS (para mostrar en mapa)
  const filteredMarkers = useMemo(() => {
    return markers.filter(m => {
      const regionMatch = m.Region === selectedRegion;
      const edsMatch = !selectedEds || m.eds === selectedEds;

      if (selectedJefeZona) {
        const esDelJefe = m.nombre === selectedJefeZona;
        const esCompetenciaEnComunasDelJefe = comunasDelJefe.includes(m.Comuna);
        const jefeMatch = esDelJefe || esCompetenciaEnComunasDelJefe;

        return regionMatch && jefeMatch && edsMatch;
      }

      if (selectedComuna) {
        const todasLasEstacionesEnComuna = m.Comuna === selectedComuna;
        const marcaMatch = !selectedMarca || m.Marca === selectedMarca;

        return regionMatch && todasLasEstacionesEnComuna && marcaMatch && edsMatch;
      }

      const marcaMatch = !selectedMarca || m.Marca === selectedMarca;

      return regionMatch && marcaMatch && edsMatch;
    });
  }, [markers, selectedRegion, selectedComuna, selectedMarca, selectedJefeZona, selectedEds, comunasDelJefe]);

  // ✅ Array SIN filtro EDS (para botón Mercado)
  const filteredMarkersForMercado = useMemo(() => {
    return markers.filter(m => {
      const regionMatch = m.Region === selectedRegion;
      // NO incluir edsMatch

      if (selectedJefeZona) {
        const esDelJefe = m.nombre === selectedJefeZona;
        const esCompetenciaEnComunasDelJefe = comunasDelJefe.includes(m.Comuna);
        const jefeMatch = esDelJefe || esCompetenciaEnComunasDelJefe;

        return regionMatch && jefeMatch;
      }

      if (selectedComuna) {
        const todasLasEstacionesEnComuna = m.Comuna === selectedComuna;
        const marcaMatch = !selectedMarca || m.Marca === selectedMarca;

        return regionMatch && todasLasEstacionesEnComuna && marcaMatch;
      }

      const marcaMatch = !selectedMarca || m.Marca === selectedMarca;

      return regionMatch && marcaMatch;
    });
  }, [markers, selectedRegion, selectedComuna, selectedMarca, selectedJefeZona, comunasDelJefe]);

  React.useEffect(() => {
    // Devolver AMBOS arrays
    onFiltersChange(filteredMarkers, filteredMarkersForMercado);
  }, [filteredMarkers, filteredMarkersForMercado, onFiltersChange]);

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
      <div className="filter-group">
        <label htmlFor="region-select">Región:</label>
        <span className="region-name">{selectedRegion}</span>
      </div>

      <div className="filter-group">
        <label htmlFor="comuna-select">Comuna:</label>
        <select
          id="comuna-select"
          value={selectedComuna}
          onChange={(e) => setSelectedComuna(e.target.value)}
        >
          <option value="">Todas las comunas</option>
          {comunas.map(comuna => (
            <option key={comuna} value={comuna}>
              {comuna}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="marca-select">Marca:</label>
        <select
          id="marca-select"
          value={selectedMarca}
          onChange={(e) => setSelectedMarca(e.target.value)}
        >
          <option value="">Todas las marcas</option>
          {marcas.map(marca => (
            <option key={marca} value={marca}>
              {marca} ({markersByBrand[marca] || 0})
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="jefe-select">Jefe de Zona:</label>
        <select
          id="jefe-select"
          value={selectedJefeZona}
          onChange={(e) => setSelectedJefeZona(e.target.value)}
        >
          <option value="">Selecciona un Jefe de Zona</option>
          {jefesZona.map(jefe => (
            <option key={jefe} value={jefe}>
              {jefe}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="eds-search">Buscar EDS:</label>
        <input
          id="eds-search"
          type="text"
          placeholder="Escribe para buscar..."
          value={edsSearchTerm}
          onChange={(e) => setEdsSearchTerm(e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label htmlFor="eds-select">EDS:</label>
        <select
          id="eds-select"
          value={selectedEds}
          onChange={(e) => setSelectedEds(e.target.value)}
        >
          <option value="">Todas las EDS</option>
          {filteredEds.map(eds => (
            <option key={eds} value={eds}>
              {eds}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-actions">
        <button onClick={handleClearFilters} className="btn-clear">
          Limpiar Filtros
        </button>
        <span className="marker-count">
          Estaciones mostradas: {filteredMarkers.length}
        </span>
      </div>
    </div>
  );
};

export default FilterPanel;
