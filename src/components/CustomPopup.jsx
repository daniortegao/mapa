import React, { useState, useRef, useEffect } from 'react';
import { createBrandLogo } from '../utils/iconHelpers';
import '../styles/customPopup.css';

const CustomPopup = ({ marker, onClose, isOpen }) => {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const popupRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleMouseDown = (e) => {
      if (e.target.closest('.popup-close')) return;
      
      setIsDragging(true);
      const rect = popupRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const header = popupRef.current?.querySelector('.popup-header');
    if (header) {
      header.addEventListener('mousedown', handleMouseDown);
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      if (header) {
        header.removeEventListener('mousedown', handleMouseDown);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, isOpen]);

  if (!isOpen || !marker) return null;

  return (
    <div
      ref={popupRef}
      className="custom-popup"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
    >
      <div className="popup-header">
        <img 
          src={createBrandLogo(marker.Marca)}
          alt={marker.Marca}
          className="popup-logo"
          onError={(e) => e.target.style.display = 'none'}
        />
        <h3>{marker.nombre}</h3>
        <button className="popup-close" onClick={onClose}>×</button>
      </div>

      <div className="popup-body">
        <div className="popup-section">
          <div className="popup-row">
            <span className="label">Marca:</span>
            <span className="value">{marker.Marca}</span>
          </div>
          <div className="popup-row">
            <span className="label">Región:</span>
            <span className="value">{marker.Region}</span>
          </div>
          <div className="popup-row">
            <span className="label">Comuna:</span>
            <span className="value">{marker.Comuna}</span>
          </div>
          {marker.direccion && (
            <div className="popup-row">
              <span className="label">Dirección:</span>
              <span className="value">{marker.direccion}</span>
            </div>
          )}
          {marker.eds && (
            <div className="popup-row">
              <span className="label">EDS:</span>
              <span className="value">{marker.eds}</span>
            </div>
          )}
        </div>

        <div className="popup-divider"></div>

        <div className="popup-section">
          <h4>Precios</h4>
          <div className="popup-row">
            <span className="label">G93:</span>
            <span className="value price">${marker.precio_g93 || 'N/A'}</span>
          </div>
          <div className="popup-row">
            <span className="label">G95:</span>
            <span className="value price">${marker.precio_g95 || 'N/A'}</span>
          </div>
          <div className="popup-row">
            <span className="label">Diesel:</span>
            <span className="value price">${marker.precio_diesel || 'N/A'}</span>
          </div>
        </div>

        {marker.Guerra_Precio === 'Si' && (
          <>
            <div className="popup-divider"></div>
            <div className="popup-section alert">
              <div className="alert-icon">⚠️</div>
              <div className="alert-text">Guerra de Precio Activa</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CustomPopup;
