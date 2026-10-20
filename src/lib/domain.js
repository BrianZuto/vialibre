import { distance, progressOf, cumulative } from "./geo";

// Tipos de incidente: mismo círculo de color e ícono en el mapa, el reporte y la lista (ley de semejanza)
export const INCIDENT_TYPES = {
  trafico: { label: "Tráfico", icon: "traffic", color: "#D63B2F" },
  policia: { label: "Control policial", short: "Policía", icon: "local_police", color: "#2F6FDB" },
  accidente: { label: "Accidente", icon: "car_crash", color: "#B8322A" },
  peligro: { label: "Peligro en la vía", short: "Peligro", icon: "warning", color: "#F2A400", ink: "#2B1D00" },
  cierre: { label: "Cierre de vía", icon: "block", color: "#3B4A42" },
  obra: { label: "Obra", icon: "construction", color: "#E0731C" },
};
export const DETAILS = ["Leve", "Grave", "En mi carril", "Carril contrario"];

// Reportes de ejemplo alrededor de un punto, para que el mapa no arranque vacío
export function seedIncidents(c) {
  const now = Date.now();
  const at = (dLat, dLon) => ({ lat: c.lat + dLat, lon: c.lon + dLon });
  return [
    { type: "accidente", where: "Reporte de ejemplo", ...at(0.006, 0.004), createdAt: now - 6 * 60000, confirms: 12 },
    { type: "policia", where: "Reporte de ejemplo", ...at(0.011, 0.012), createdAt: now - 14 * 60000, confirms: 8 },
    { type: "obra", where: "Reporte de ejemplo", ...at(-0.009, 0.007), createdAt: now - 20 * 3600000, confirms: 5 },
    { type: "cierre", where: "Reporte de ejemplo", ...at(-0.004, -0.012), createdAt: now - 3 * 3600000, confirms: 4 },
    { type: "peligro", where: "Reporte de ejemplo", ...at(0.016, -0.006), createdAt: now - 40 * 60000, confirms: 3 },
  ].map((x, i) => ({ id: "seed-" + i, seed: true, ...x }));
}

// Los reportes vencen: tráfico/policía/accidente/peligro en 2 h; cierre y obra en 48 h
export function isActive(inc) {
  const ttl = inc.type === "cierre" || inc.type === "obra" ? 48 * 3600000 : 2 * 3600000;
  return !inc.gone && Date.now() - inc.createdAt < ttl;
}

// Tráfico estimado según la hora (no hay un servicio gratuito de tráfico en tiempo real)
export function trafficNow(date = new Date()) {
  const h = date.getHours() + date.getMinutes() / 60;
  const day = date.getDay();
  const weekend = day === 0 || day === 6;
  const peak = !weekend && ((h >= 6.5 && h < 8.5) || (h >= 17 && h < 19.5));
  const mid = (h >= 11.5 && h < 14) || (weekend && h >= 10 && h < 20) || (!weekend && h >= 8.5 && h < 17);
  if (peak) return { key: "bad", label: "Trancón", badge: "b-bad", factor: 1.35, split: [38, 34, 28], note: "Hora pico" };
  if (mid) return { key: "mid", label: "Moderado", badge: "b-mid", factor: 1.15, split: [55, 31, 14], note: "Tráfico de mediodía" };
  return { key: "ok", label: "Fluido", badge: "b-ok", factor: 1, split: [82, 13, 5], note: h >= 20 || h < 5 ? "Horario nocturno" : "Tráfico bajo" };
}

const TRAFFIC_LABEL = { ok: ["Fluido", "b-ok"], mid: ["Lento", "b-mid"], bad: ["Trancón", "b-bad"] };

// Incidentes a menos de 120 m de la ruta y estado estimado de la ruta
export function routeStatus(route, incidents, base) {
  const cum = cumulative(route.coords);
  const near = incidents.filter((i) => isActive(i) && progressOf(route.coords, cum, i).d < 120);
  const severe = near.some((i) => ["accidente", "cierre", "trafico"].includes(i.type));
  let level = base.key;
  if (severe) level = "bad"; else if (near.length && level === "ok") level = "mid";
  const extra = near.length * 60 + (severe ? 120 : 0);
  const [label, badge] = TRAFFIC_LABEL[level];
  return { near, level, label, badge, duration: route.duration * base.factor + extra };
}

// Texto e ícono de cada maniobra a partir de los pasos de OSRM
const MOD = { left: "a la izquierda", right: "a la derecha", "slight left": "levemente a la izquierda", "slight right": "levemente a la derecha", "sharp left": "a la izquierda", "sharp right": "a la derecha", straight: "derecho", uturn: "en U" };
const ICON = { left: "turn_left", right: "turn_right", "slight left": "turn_slight_left", "slight right": "turn_slight_right", "sharp left": "turn_sharp_left", "sharp right": "turn_sharp_right", straight: "straight", uturn: "u_turn_left" };

export function maneuver(step) {
  if (!step) return { icon: "flag", text: "Llegaste a tu destino" };
  const on = step.name ? ` en ${step.name}` : "";
  const to = step.name ? ` por ${step.name}` : "";
  const mod = MOD[step.modifier] || "";
  switch (step.type) {
    case "depart": return { icon: "navigation", text: `Sigue${to}` };
    case "arrive": return { icon: "flag", text: "Llegarás a tu destino" };
    case "roundabout": case "rotary": case "roundabout turn":
      return { icon: "roundabout_right", text: `En la glorieta toma la ${step.exit ? step.exit + "ª" : ""} salida${to}`.replace("la  salida", "la salida") };
    case "continue": case "new name":
      return { icon: "straight", text: `Continúa${to}` };
    case "merge": return { icon: "merge", text: `Incorpórate${to}` };
    case "fork": return { icon: ICON[step.modifier] || "fork_right", text: `Mantente ${mod}${to}` };
    case "end of road": case "turn": case "on ramp": case "off ramp": default:
      if (step.modifier === "straight") return { icon: "straight", text: `Sigue derecho${to}` };
      if (step.modifier === "uturn") return { icon: "u_turn_left", text: `Da la vuelta en U${to}` };
      return { icon: ICON[step.modifier] || "straight", text: `Gira ${mod}${on}` };
  }
}

export function nearestTo(list, p) {
  return [...list].map((x) => ({ ...x, dist: distance(p, x) })).sort((a, b) => a.dist - b.dist);
}
