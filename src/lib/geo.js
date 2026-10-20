// Utilidades de geografía y formato (es-CO)
export const ARMENIA = { lat: 4.5339, lon: -75.6811 };

const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;

export function distance(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Coordenadas de OSRM/GeoJSON vienen como [lon, lat]
export const toLL = ([lon, lat]) => ({ lat, lon });

export function cumulative(coords) {
  const out = [0];
  for (let i = 1; i < coords.length; i++) out.push(out[i - 1] + distance(toLL(coords[i - 1]), toLL(coords[i])));
  return out;
}

// Punto a una distancia dada a lo largo de la línea
export function pointAt(coords, cum, d) {
  if (d <= 0) return toLL(coords[0]);
  const total = cum[cum.length - 1];
  if (d >= total) return toLL(coords[coords.length - 1]);
  let i = cum.findIndex((c) => c >= d);
  const a = toLL(coords[i - 1]), b = toLL(coords[i]);
  const t = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1);
  return { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t, heading: bearing(a, b) };
}

// Distancia recorrida más cercana a una posición (proyección sobre la línea)
export function progressOf(coords, cum, p) {
  let best = { d: Infinity, along: 0 };
  for (let i = 1; i < coords.length; i++) {
    const a = toLL(coords[i - 1]), b = toLL(coords[i]);
    const ax = 0, ay = 0;
    const kx = Math.cos(rad(a.lat)) * 111320, ky = 110540;
    const bx = (b.lon - a.lon) * kx, by = (b.lat - a.lat) * ky;
    const px = (p.lon - a.lon) * kx, py = (p.lat - a.lat) * ky;
    const len = bx * bx + by * by || 1;
    const t = Math.max(0, Math.min(1, (px * bx + py * by) / len));
    const dx = px - (ax + bx * t), dy = py - (ay + by * t);
    const dist = Math.hypot(dx, dy);
    if (dist < best.d) best = { d: dist, along: cum[i - 1] + (cum[i] - cum[i - 1]) * t };
  }
  return best;
}

export function bearing(a, b) {
  const y = Math.sin(rad(b.lon - a.lon)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lon - a.lon));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const nf1 = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
export function fmtDist(m) {
  if (m == null || isNaN(m)) return "";
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} m`;
  return `${m < 100000 ? nf1.format(m / 1000) : Math.round(m / 1000)} km`;
}

export function fmtMin(sec) {
  const m = Math.max(1, Math.round(sec / 60));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

export function fmtClock(date, withPeriod = true) {
  const d = new Date(date);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const p = h < 12 ? "a. m." : "p. m.";
  h = h % 12 || 12;
  return withPeriod ? `${h}:${m} ${p}` : `${h}:${m}`;
}

export function fmtAgo(ts) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
}

export function fmtDay(ts) {
  const d = new Date(ts), today = new Date();
  const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(today) - start(d)) / 86400000);
  const long = d.toLocaleDateString("es-CO", { day: "numeric", month: "long" });
  if (diff === 0) return "Hoy";
  if (diff === 1) return `Ayer · ${long}`;
  const wd = d.toLocaleDateString("es-CO", { weekday: "long" });
  return `${wd[0].toUpperCase()}${wd.slice(1)} · ${long}`;
}

export const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("") || "VL";
