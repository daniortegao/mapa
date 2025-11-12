import React, { useMemo, useState, useRef, useLayoutEffect } from 'react';
import '../styles/trendChart.css';

const COLORS = { G93:'#34c759', G95:'#007bff', G97:'#a259c1', Diesel:'#fd7e14', Kero:'#6c757d' };
const FUEL_OPTIONS = [
  { key:'G93', field:'g93', label:'G93' },
  { key:'G95', field:'g95', label:'G95' },
  { key:'G97', field:'g97', label:'G97' },
  { key:'Diesel', field:'diesel', label:'Diesel' },
  { key:'Kero', field:'kero', label:'Kero' }
];

const toNum = v => (v === '-' || v == null ? null : Number(v));

function parseDateSafe(fecha){
  const token = String(fecha || '').split(' ')[0];
  if(!token) return { d:new Date(0), label:'' };
  if(/^\d{4}-\d{2}-\d{2}$/.test(token)){
    const [y,m,d] = token.split('-');
    return { d:new Date(token), label:`${d.padStart(2,'0')}-${m.padStart(2,'0')}` };
  }
  if(/^\d{2}-\d{2}-\d{4}$/.test(token)){
    const [d,m,y] = token.split('-').map(s=>s.padStart(2,'0'));
    return { d:new Date(`${y}-${m}-${d}`), label:`${d}-${m}` };
  }
  const d = new Date(token);
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  return { d, label:`${dd}-${mm}` };
}

export default function TrendChart({ dataRows = [], maxPoints = 7 }) {
  const [fuelKey, setFuelKey] = useState('G93');
  const [hover, setHover] = useState(null);
  const wrapRef = useRef(null);
  const [w, setW] = useState(300);
  const [h, setH] = useState(160);

  // Lee variables CSS
  const readVars = () => {
    const el = wrapRef.current;
    if (!el) return { w:300, h:160, mLeft:58, mRight:10, mTop:8, mBottom:24, gap:10, barMax:20, barMin:10, startPad:12 };
    const cs = getComputedStyle(el);
    return {
      w: parseInt(cs.getPropertyValue('--trend-width')) || 300,
      h: parseInt(cs.getPropertyValue('--trend-height')) || 160,
      mLeft: parseInt(cs.getPropertyValue('--trend-left')) || 58,
      mRight: parseInt(cs.getPropertyValue('--trend-right')) || 10,
      mTop: parseInt(cs.getPropertyValue('--trend-top')) || 8,
      mBottom: parseInt(cs.getPropertyValue('--trend-bottom')) || 24,
      gap: parseInt(cs.getPropertyValue('--trend-gap')) || 10,
      barMax: parseInt(cs.getPropertyValue('--trend-bar-max')) || 20,
      barMin: parseInt(cs.getPropertyValue('--trend-bar-min')) || 10,
      startPad: parseInt(cs.getPropertyValue('--trend-start-pad')) || 12
    };
  };

  const [vars, setVars] = useState(readVars());

  useLayoutEffect(() => {
    setVars(readVars());
    setW(vars.w); setH(vars.h);
    const ro = new ResizeObserver(() => { const v = readVars(); setVars(v); setW(v.w); setH(v.h); });
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const points = useMemo(() => {
    const norm = dataRows
      .map(r => {
        const { d, label } = parseDateSafe(r.fecha);
        return { date:d, label, G93:toNum(r.g93), G95:toNum(r.g95), G97:toNum(r.g97), Diesel:toNum(r.diesel), Kero:toNum(r.kero) };
      })
      .sort((a,b)=>a.date-b.date)
      .slice(-maxPoints)
      .reverse();
    return norm;
  }, [dataRows, maxPoints]);

  const labels = points.map(p=>p.label);
  const values = points.map(p=>p[fuelKey]);

  const present = values.filter(v=>v!=null);
  const aMin = present.length ? Math.min(...present) : 0;
  const aMax = present.length ? Math.max(...present) : 1;

  const yMin = 0;
  const pad = Math.max(1, Math.round((aMax - aMin) * 0.05));
  const yMax = aMax <= 0 ? 1 : aMax + pad;

  const { mLeft, mRight, mTop, mBottom, gap, barMax, barMin, startPad } = vars;
  const innerW = w - mLeft - mRight;
  const innerH = h - mTop - mBottom;

  const xPos = (i) => {
    if (labels.length <= 1) return mLeft + startPad + innerW / 2;
    const usable = innerW - startPad * 2;
    return mLeft + startPad + (i * usable) / (labels.length - 1);
  };
  const yPos = (v) => {
    if (v == null) return null;
    const span = Math.max(1, (yMax - yMin));
    const y = (v - yMin) / span;
    return mTop + innerH - y * innerH;
  };

  const effW = innerW - gap * Math.max(0, labels.length - 1);
  const colWidth = labels.length > 0 ? Math.max(barMin, Math.min(barMax, effW / Math.max(1, labels.length))) : barMin;

  const gridY = 3;
  const yTicks = Array.from({ length: gridY + 1 }, (_, k) => yMin + (k * (yMax - yMin)) / Math.max(1, gridY));

  const handleEnter = (i, e) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const value = values[i];
    if (value == null) return;
    setHover({
      idx: i,
      xClient: e.clientX - rect.left,
      yClient: e.clientY - rect.top,
      value,
      label: labels[i],
      xSvg: xPos(i),
      ySvg: yPos(value)
    });
  };
  const handleMove = (i, e) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    setHover(h => (h && h.idx === i && rect)
      ? { ...h, xClient: e.clientX - rect.left, yClient: e.clientY - rect.top }
      : h
    );
  };
  const handleLeave = () => setHover(null);

  return (
    <div ref={wrapRef} className="trend-wrap">
      <div
        className="trend-tooltip"
        style={{
          display: hover ? 'block' : 'none',
          left: hover ? Math.min(Math.max(hover.xClient + 8, 0), w - 120) : 0,
          top: hover ? Math.min(Math.max(hover.yClient - 22, 0), h - 22) : 0
        }}
      >
        {hover ? `${hover.label} • ${Number(hover.value).toLocaleString('es-CL')}` : ''}
      </div>

      <div className="trend-header">
        <div className="trend-dot" style={{ background: COLORS[fuelKey] }} />
        <span style={{ fontSize: 11, color: '#333' }}>Combustible:</span>
        <select
          className="trend-select"
          value={fuelKey}
          onChange={(e)=>{ setHover(null); setFuelKey(e.target.value); }}
        >
          {FUEL_OPTIONS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
      </div>

      <svg className="trend-svg" width={w} height={h}>
        {yTicks.map((t, idx) => {
          const y = yPos(t);
          return (
            <g key={idx}>
              <line x1={mLeft} x2={mLeft + innerW} y1={y} y2={y} stroke="rgba(0,0,0,0.08)" />
              <text className="trend-ylabel" x={mLeft - 8} y={y} textAnchor="end" dominantBaseline="middle">
                {Math.round(t).toLocaleString('es-CL')}
              </text>
            </g>
          );
        })}

        {labels.map((lab, i) => (
          <text className="trend-xlabel" key={i} x={xPos(i)} y={h - 6} textAnchor="middle">{lab}</text>
        ))}

        {values.map((v, i) => {
          const y = yPos(v);
          const xCenter = xPos(i);
          const x = xCenter - colWidth / 2 + (i * gap) / Math.max(1, labels.length);
          const barH = v == null ? 0 : (mTop + innerH - y);
          return (
            <rect
              key={i}
              x={x}
              y={v == null ? (mTop + innerH) : y}
              width={colWidth}
              height={barH}
              fill={COLORS[fuelKey]}
              rx={3}
              onMouseEnter={(e)=> handleEnter(i, e)}
              onMouseMove={(e)=> handleMove(i, e)}
              onMouseLeave={handleLeave}
            />
          );
        })}
      </svg>
    </div>
  );
}
