import React, { useMemo, useState } from 'react';

const FilterPanel = ({ markers, allMarkers, selectedRegion, onFiltersChange, onStationSelect }) => {
  const [selectedComuna, setSelectedComuna] = useState('');
  const [selectedMarca, setSelectedMarca] = useState('');
  const [selectedJefeZona, setSelectedJefeZona] = useState('');
  const [selectedEds, setSelectedEds] = useState('');
  const [edsSearchTerm, setEdsSearchTerm] = useState('');
  const [globalEdsSearch, setGlobalEdsSearch] = useState('');
  const [soloGuerraPrecios, setSoloGuerraPrecios] = useState(false);
  const [soloEstacionesPES, setSoloEstacionesPES] = useState(false);

  console.log('🎨 FilterPanel RENDER:', { selectedRegion, selectedComuna, selectedMarca });

  const tuasMarcas = ['Aramco', 'Petrobras'];

  // Normalize string for comparison (trim and lowercase)
  const normalizeString = (str) => {
    return str ? str.trim().toLowerCase() : '';
  };

  const comunas = useMemo(() => {
    const filtered = markers.filter(m => m.Region === selectedRegion);
    const comunaSet = new Set(filtered.map(m => m.Comuna).filter(c => c));
    return Array.from(comunaSet).sort();
  }, [markers, selectedRegion]);

  // Clear comuna filter when region changes
  React.useEffect(() => {
    console.log('🌍 REGION CHANGED:', selectedRegion, '- Clearing filters');
    setSelectedComuna('');
    setSelectedMarca('');
    setSelectedJefeZona('');
    setSelectedEds('');
  }, [selectedRegion]);

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

  // All stations from all regions for global search
  const allStations = useMemo(() => {
    const stationMap = new Map();
    const markersToUse = allMarkers || markers; // Use allMarkers if available, fallback to markers
    markersToUse.forEach(m => {
      if (m.eds && m.pbl) {
        const key = m.pbl;
        if (!stationMap.has(key)) {
          stationMap.set(key, {
            pbl: m.pbl,
            eds: m.eds,
            region: m.Region,
            comuna: m.Comuna,
            marca: m.Marca,
            lat: m.lat,
            lng: m.lng
          });
        }
      }
    });
    return Array.from(stationMap.values()).sort((a, b) => a.eds.localeCompare(b.eds));
  }, [allMarkers, markers]);

  // Array CON filtro EDS para mostrar en mapa
  const filteredMarkers = useMemo(() => {
    console.log('🔍 FILTERING MARKERS:', {
      selectedRegion,
      selectedComuna,
      selectedMarca,
      selectedJefeZona,
      selectedEds,
      totalMarkers: markers.length
    });

    const result = markers.filter(m => {
      // Global EDS search (searches across all regions)
      if (globalEdsSearch.trim()) {
        const searchMatch = m.eds && m.eds.toLowerCase().includes(globalEdsSearch.toLowerCase());
        if (!searchMatch) return false;
      }

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
        const comunaMatch = normalizeString(m.Comuna) === normalizeString(selectedComuna);
        const marcaMatch = !selectedMarca || m.Marca === selectedMarca;

        if (comunaMatch) {
          console.log('✅ MATCH:', {
            comuna: m.Comuna,
            selectedComuna,
            normalized: normalizeString(m.Comuna),
            selectedNormalized: normalizeString(selectedComuna),
            marca: m.Marca,
            eds: m.eds
          });
        }

        return regionMatch && comunaMatch && marcaMatch && edsMatch && guerraMatch && pesMatch;
      }

      const marcaMatch = !selectedMarca || m.Marca === selectedMarca;
      return regionMatch && marcaMatch && edsMatch && guerraMatch && pesMatch;
    });

    console.log('📊 FILTERED RESULT:', {
      count: result.length,
      comunas: [...new Set(result.map(m => m.Comuna))],
      regions: [...new Set(result.map(m => m.Region))],
      samples: result.slice(0, 5).map(m => ({
        comuna: m.Comuna,
        region: m.Region,
        eds: m.eds,
        lat: m.lat,
        lng: m.lng
      }))
    });

    return result;
  }, [markers, selectedRegion, selectedComuna, selectedMarca, selectedJefeZona, selectedEds, comunasDelJefe, soloGuerraPrecios, soloEstacionesPES, globalEdsSearch]);

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
        const todasLasEstacionesEnComuna = normalizeString(m.Comuna) === normalizeString(selectedComuna);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uniqueFilteredMarkers, filteredMarkersForMercado]);

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

  // Center map when comuna is selected
  React.useEffect(() => {
    if (selectedComuna && window.leafletMap) {
      // Find a marker from the selected comuna to get coordinates
      const comunaMarker = markers.find(m =>
        normalizeString(m.Comuna) === normalizeString(selectedComuna)
      );

      if (comunaMarker && comunaMarker.Latitud_comuna && comunaMarker.Longitud_comuna) {
        const lat = parseFloat(comunaMarker.Latitud_comuna);
        const lng = parseFloat(comunaMarker.Longitud_comuna);

        if (!isNaN(lat) && !isNaN(lng)) {
          window.leafletMap.setView([lat, lng], 12); // Zoom level 12 for comuna view
        }
      }
    }
  }, [selectedComuna, markers]);

  const handleClearFilters = () => {
    setSelectedComuna('');
    setSelectedMarca('');
    setSelectedJefeZona('');
    setSelectedEds('');
    setEdsSearchTerm('');
    setGlobalEdsSearch('');
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

      <div className="filter-group">
        <label htmlFor="global-eds-search">EDS todas</label>
        <select
          id="global-eds-search"
          value={globalEdsSearch}
          onChange={(e) => {
            const selectedPbl = e.target.value;
            setGlobalEdsSearch(selectedPbl);
            if (selectedPbl && onStationSelect) {
              const station = allStations.find(s => s.pbl === selectedPbl);
              if (station) {
                onStationSelect(station);
              }
            }
          }}
        >
          <option value="">Selecciona una estación...</option>
          {allStations.map(station => (
            <option key={station.pbl} value={station.pbl}>
              {station.eds} - {station.comuna} ({station.region})
            </option>
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
