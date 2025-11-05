import React, { useMemo } from 'react';

const CompetenciaPanel = ({ markers, baseCompData, selectedPbl, onCompetenciaChange }) => {
  const competencia = useMemo(() => {
    if (!selectedPbl || !Array.isArray(baseCompData)) return [];
    
    console.log(`🔍 Buscando competencia para PBL: ${selectedPbl}`);
    
    const result = baseCompData.filter(item => 
      String(item.pbl).trim() === String(selectedPbl).trim()
    );
    
    console.log(`📍 Competencia encontrada: ${result.length}`);
    return result;
  }, [selectedPbl, baseCompData]);

  React.useEffect(() => {
    onCompetenciaChange(competencia);
  }, [competencia, onCompetenciaChange]);

  return null;
};

export default CompetenciaPanel;
