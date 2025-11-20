import React, { useMemo, useState } from 'react';

const FilterPanel = ({ markers, selectedRegion, onFiltersChange }) => {
  const [selectedComuna, setSelectedComuna] = useState('');
  const [selectedMarca, setSelectedMarca] = useState('');
  const [selectedJefeZona, setSelectedJefeZona] = useState('');
  const [selectedEds, setSelectedEds] = useState('');
  const [edsSearchTerm, setEdsSearchTerm] = useState('');
  const [soloGuerraPrecios, setSoloGuerraPrecios] = useState(false);
  const [soloEstacionesPES, setSoloEstacionesPES] = useState(false);

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
    return [...new Set(filtered.map(m => m.eds))].filter(eds => eds).sort();
  }, [markers, selectedRegion, selectedComuna, selectedMarca, selectedJefeZona, comunasDelJefe]);

  const filteredEds = useMemo(() => {
    return allEds.filter(eds => 
      eds.toLowerCase().includes(edsSearchTerm.toLowerCase())
    );
  }, [allEds, edsSearchTerm]);

  // Array CON filtro EDS para mostrar en mapa
  const filteredMarkers = useMemo(() => {
    return markers.filter(m => {
      const regionMatch = m.Region === selectedRegion;
      const edsMatch = !selectedEds || m.eds === selectedEds;
      const guerraMatch = !soloGuerraPrecios || m.Guerra_Precio === 'Si';
      const pesMatch = !soloEstacionesPES || (m.Surtidores_Autoservicio && m.Surtidores_Autoservicio !== null && m.Surtidores_Autoservicio !== '');

      if (selectedJefeZona) {
        const esDelJefe = m.nombre === selectedJefeZona;
        const esCompetenciaEnComunasDelJefe = comunasDelJefe.includes(m.Comuna);
        const jefeMatch = esDelJefe || esCompetenciaEnComunasDelJefe;
        return regionMatch && jefeMatch && edsMatch && guerraMatch && pesMatch;
      }

      if (selectedComuna) {
        const todasLasEstacionesEnComuna = m.Comuna === selectedComuna;
        const marcaMatch = !selectedMarca || m.Marca === selectedMarca;
        return regionMatch && todasLasEstacionesEnComuna && marcaMatch && edsMatch && guerraMatch && pesMatch;
      }

      const marcaMatch = !selectedMarca || m.Marca === selectedMarca;
      return regionMatch && marcaMatch && edsMatch && guerraMatch && pesMatch;
    });
  }, [markers, selectedRegion, selectedComuna, selectedMarca, selectedJefeZona, selectedEds, comunasDelJefe, soloGuerraPrecios, soloEstacionesPES]);

  // Array SIN filtro EDS para botón Mercado
  const filteredMarkersForMercado = useMemo(() => {
    return markers.filter(m => {
      const regionMatch = m.Region === selectedRegion;
      const guerraMatch = !soloGuerraPrecios || m.Guerra_Precio === 'Si';
      const pesMatch = !soloEstacionesPES || (m.Surtidores_Autoservicio && m.Surtidores_Autoservicio !== null && m.Surtidores_Autoservicio !== '');

      if (selectedJefeZona) {
        const esDelJefe = m.nombre === selectedJefeZona;
        const esCompetenciaEnComunasDelJefe = comunasDelJefe.includes(m.Comuna);
        const jefeMatch = esDelJefe || esCompetenciaEnComunasDelJefe;
        return regionMatch && jefeMatch && guerraMatch && pesMatch;
      }

      if (selectedComuna) {
        const todasLasEstacionesEnComuna = m.Comuna === selectedComuna;
        const marcaMatch = !selectedMarca || m.Marca === selectedMarca;
        return regionMatch && todasLasEstacionesEnComuna && marcaMatch && guerraMatch && pesMatch;
      }

      const marcaMatch = !selectedMarca || m.Marca === selectedMarca;
      return regionMatch && marcaMatch && guerraMatch && pesMatch;
    });
  }, [markers, selectedRegion, selectedComuna, selectedMarca, selectedJefeZona, comunasDelJefe, soloGuerraPrecios, soloEstacionesPES]);

  // ✅ DEDUPLICAR filteredMarkers para el mapa
  const uniqueFilteredMarkers = useMemo(() => {
    const uniqueMap = new Map();
    
    filteredMarkers.forEach(marker => {
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
    
    return Array.from(uniqueMap.values());
  }, [filteredMarkers]);

  // ✅ Enviar únicos al mapa, histórico completo para Mercado
  React.useEffect(() => {
    onFiltersChange(uniqueFilteredMarkers, filteredMarkersForMercado);
  }, [uniqueFilteredMarkers, filteredMarkersForMercado, onFiltersChange]);

  // Contador de marcas (solo estaciones únicas)
  const markersByBrand = useMemo(() => {
    const result = {};
    uniqueFilteredMarkers.forEach(m => {
      result[m.Marca] = (result[m.Marca] || 0) + 1;
    });
    return result;
  }, [uniqueFilteredMarkers]);

  // Contador total por marca en la región
  const brandCounts = useMemo(() => {
    const filtered = markers.filter(m => m.Region === selectedRegion);
    const brandMap = new Map();
    filtered.forEach(m => {
      const brand = m.Marca || 'Sin marca';
      const id = m.pbl || m.id || `${m.lat}_${m.lng}`;
      if (!brandMap.has(brand)) {
        brandMap.set(brand, new Set());
      }
      brandMap.get(brand).add(id);
    });
    return Object.fromEntries(
      Array.from(brandMap.entries()).map(([name, set]) => [name, set.size])
    );
  }, [markers, selectedRegion]);

  const handleClearFilters = () => {
    setSelectedComuna('');
    setSelectedMarca('');
    setSelectedJefeZona('');
    setSelectedEds('');
    setEdsSearchTerm('');
    setSoloGuerraPrecios(false);
    setSoloEstacionesPES(false);
  };

  return (
    <div className="filter-panel">
      <div className="filter-group">
        <label htmlFor="comuna-select">Comuna</label>
        <select
          id="comuna-select"
          value={selectedComuna}
          onChange={(e) => setSelectedComuna(e.target.value)}
        >
          <option value="">Todas las comunas</option>
          {comunas.map(comuna => (
            <option key={comuna} value={comuna}>{comuna}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="marca-select">Marca</label>
        <select
          id="marca-select"
          value={selectedMarca}
          onChange={(e) => setSelectedMarca(e.target.value)}
        >
          <option value="">Todas las marcas</option>
          {marcas.map(marca => (
            <option key={marca} value={marca}>
              {marca} {brandCounts[marca] ? `(${brandCounts[marca]})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="jefe-select">Jefe de Zona</label>
        <select
          id="jefe-select"
          value={selectedJefeZona}
          onChange={(e) => setSelectedJefeZona(e.target.value)}
        >
          <option value="">Selecciona un Jefe de Zona</option>
          {jefesZona.map(jefe => (
            <option key={jefe} value={jefe}>{jefe}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="eds-select">EDS</label>
        <select
          id="eds-select"
          value={selectedEds}
          onChange={(e) => setSelectedEds(e.target.value)}
        >
          <option value="">Todas las EDS</option>
          {filteredEds.map(eds => (
            <option key={eds} value={eds}>{eds}</option>
          ))}
        </select>
      </div>

      <div className="filter-group filter-checkbox">
        <label htmlFor="guerra-precios-checkbox" className="checkbox-label">
          <input
            id="guerra-precios-checkbox"
            type="checkbox"
            checked={soloGuerraPrecios}
            onChange={(e) => setSoloGuerraPrecios(e.target.checked)}
          />
          <span className="checkbox-text">Guerra de Precios</span>
        </label>
      </div>

      <div className="filter-group filter-checkbox filter-checkbox-pes">
        <label htmlFor="estaciones-pes-checkbox" className="checkbox-label">
          <input
            id="estaciones-pes-checkbox"
            type="checkbox"
            checked={soloEstacionesPES}
            onChange={(e) => setSoloEstacionesPES(e.target.checked)}
          />
          <span className="checkbox-text">Estaciones PES</span>
        </label>
      </div>
    </div>
  );
};

export default FilterPanel;
