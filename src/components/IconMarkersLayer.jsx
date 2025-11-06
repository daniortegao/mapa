import React, { useEffect, useRef, useState, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { createCustomIcon, createBrandLogo } from "../utils/iconHelpers";

const IconMarkersLayer = ({
  markers,              // lista NORMAL (incluye EDS si aplica)
  markersForMercado,    // lista SIN EDS (para Mercado)
  selectedRegion,
  baseCompData
}) => {
  const map = useMap();
  const markersRef = useRef({});
  const zoomUpdateRef = useRef(null);
  const [showingAssociated, setShowingAssociated] = useState(false);

  const clearMarkers = useCallback(() => {
    if (!map) return;
    Object.values(markersRef.current).forEach((marker) => {
      try {
        if (map.hasLayer(marker)) map.removeLayer(marker);
      } catch {}
    });
    markersRef.current = {};
  }, [map]);

  const makeDraggable = useCallback((popup) => {
    if (!map || !popup || !popup.getElement) return;
    const el = popup.getElement();
    if (!el) return;
    try {
      const wrapper = el.querySelector(".leaflet-popup-content-wrapper");
      if (!wrapper) return;
      const draggable = new L.Draggable(el, wrapper);
      draggable.enable();
    } catch {}
  }, [map]);

  const bindPopupWithMercado = useCallback((leafletMarker, marker) => {
    const popupHtml = `
      <div class="popup-container">
        <div class="popup-header">
          <img src="${createBrandLogo(marker.Marca)}" alt="${marker.Marca}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;margin-right:8px" onerror="this.style.display='none'"/>
          <h3 style="margin:0">${marker.nombre} - ${marker.Marca}</h3>
        </div>
        <div class="popup-content">
          <div class="popup-data">
            <strong>Marca</strong>: ${marker.Marca}<br/>
            <strong>PBL</strong>: ${marker.pbl ?? "-"}<br/>
            <strong>Región</strong>: ${marker.Region ?? "-"}<br/>
            <strong>Comuna</strong>: ${marker.Comuna ?? "-"}<br/>
            ${marker.direccion ? `<strong>Dirección</strong>: ${marker.direccion}<br/>` : ""}
            ${marker.eds ? `<strong>EDS</strong>: ${marker.eds}<br/>` : ""}
          </div>
          <hr style="margin:10px 0;border:none;border-top:1px solid #e0e0e0"/>
          <div class="popup-data">
            <strong>Precios</strong><br/>
            G93: ${marker.preciog93 ?? "NA"}<br/>
            G95: ${marker.preciog95 ?? "NA"}<br/>
            Diesel: ${marker.preciodiesel ?? "NA"}<br/>
          </div>
          ${marker.GuerraPrecio === "Si" ? `
            <hr style="margin:10px 0;border:none;border-top:1px solid #e0e0e0"/>
            <div class="popup-data" style="color:#d32f2f;font-weight:bold">Guerra de Precio Activa</div>
          ` : ""}
          <div style="margin-top:10px">
            <button data-mercado="1" style="padding:6px 10px;border:1px solid #1976d2;color:#1976d2;background:#fff;border-radius:4px;cursor:pointer">
              Mercado
            </button>
          </div>
        </div>
      </div>
    `;

    const popup = L.popup({
      autoClose: false,
      closeOnClick: false,
      keepInView: true,
      autoPan: false
    }).setContent(popupHtml);

    leafletMarker.bindPopup(popup);

    leafletMarker.on("popupopen", () => {
      makeDraggable(popup);
      const el = popup.getElement();
      if (!el) return;
      const btn = el.querySelector('button[data-mercado="1"]');
      if (btn) {
        btn.onclick = (e) => {
          e.stopPropagation();
          showMercadoForPbl(marker.pbl);
        };
      }
    });

    leafletMarker.on("click", () => leafletMarker.openPopup());
  }, [makeDraggable]);

  const addMarkers = useCallback((data) => {
    if (!map) return;
    data.forEach((m) => {
      const lat = Number(m.lat);
      const lng = Number(m.lng);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return;

      const key = `${lat.toFixed(6)}_${lng.toFixed(6)}`;
      if (markersRef.current[key] && map.hasLayer(markersRef.current[key])) return;

      const icon = createCustomIcon(m.Marca);
      const leafletMarker = L.marker([lat, lng], { icon }).addTo(map);

      bindPopupWithMercado(leafletMarker, m);
      markersRef.current[key] = leafletMarker;
    });
  }, [map, bindPopupWithMercado]);

  const renderNormal = useCallback(() => {
    if (!map) return;
    clearMarkers();
    if (!Array.isArray(markers) || markers.length === 0) return;
    addMarkers(markers);
  }, [map, markers, addMarkers, clearMarkers]);

  const showMercadoForPbl = useCallback((pbl) => {
    if (!map) return;

    // Toggle: si ya está activo, salir y restaurar
    if (showingAssociated) {
      setShowingAssociated(false);
      renderNormal();
      return;
    }

    // Validar pool SIN EDS
    const pool = Array.isArray(markersForMercado) ? markersForMercado : [];
    if (pool.length === 0) {
      // No hay candidatos que mostrar
      return;
    }

    // Filtrar competencia desde baseCompData
    const associated = Array.isArray(baseCompData)
      ? baseCompData.filter((x) => String(x.pbl).trim() === String(pbl).trim())
      : [];
    if (associated.length === 0) {
      return;
    }

    // Normalizar tipos de id
    const ids = new Set(associated.map((x) => String(x.id).trim()));
    const toShow = pool.filter((m) => ids.has(String(m.id).trim()));
    if (toShow.length === 0) {
      // Puede ser que ids en baseCompData no coincidan con los id de markers (dataset distinto)
      return;
    }

    clearMarkers();
    addMarkers(toShow);
    setShowingAssociated(true);
  }, [map, showingAssociated, baseCompData, markersForMercado, addMarkers, clearMarkers, renderNormal]);

  // Cuando cambian los marcadores normales, salir de Mercado y renderizar normal
  useEffect(() => {
    if (showingAssociated) setShowingAssociated(false);
    renderNormal();
  }, [renderNormal, showingAssociated]);

  // Re-render al moverse/zoomear sólo en modo normal
  useEffect(() => {
    if (!map) return;

    const onMoveEnd = () => {
      if (showingAssociated) return;
      renderNormal();
    };

    map.on("moveend", onMoveEnd);
    return () => {
      map.off("moveend", onMoveEnd);
    };
  }, [map, renderNormal, showingAssociated]);

  return null;
};

export default IconMarkersLayer;
