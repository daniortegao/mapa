import React from 'react';
import '../styles/priceTable.css';

/**
 * Componente reutilizable para mostrar tabla de precios históricos
 * @param {Object} props
 * @param {Array} props.datos - Array de objetos { fecha, g93, g95, g97, diesel, kero }
 * @param {string} props.variant - 'primary' (azul) o 'secondary' (verde) para competencia
 * @param {string} props.titulo - Título opcional de la tabla
 */
const PriceTable = ({ datos, variant = 'primary', titulo }) => {
  if (!datos || datos.length === 0) {
    return <div className="price-table-empty">Sin datos disponibles</div>;
  }

  return (
    <div className="price-table-wrapper">
      {titulo && <h4 className="price-table-titulo">{titulo}</h4>}
      <div className="price-table-scroll">

        <table className={`price-table price-table--${variant}`}>
          
          <thead>
            <tr>
              <th>Actualización</th>
              <th>G93</th>
              <th>G95</th>
              <th>G97</th>
              <th>Diesel</th>
              <th>Kero</th>
            </tr>
          </thead>
          <tbody>
            {datos.map((fila, idx) => (
              <tr key={idx}>
                <td className="price-table__date">{fila.fecha}</td>
                <td>{fila.g93 || '-'}</td>
                <td>{fila.g95 || '-'}</td>
                <td>{fila.g97 || '-'}</td>
                <td>{fila.diesel || '-'}</td>
                <td>{fila.kero || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PriceTable;
