// Servicios públicos sin backend propio:
// - Nominatim (OpenStreetMap) para buscar lugares y direcciones
// - OSRM (routing.openstreetmap.de) para calcular rutas en carro, bicicleta y a pie
const NOMINATIM = "https://nominatim.openstreetmap.org";
const OSRM = "https://routing.openstreetmap.de";

function mapPlace(r) {
  const a = r.address || {};
  const name = r.name || a.road || r.display_name.split(",")[0];
  const street = [a.road, a.house_number].filter(Boolean).join(" ");
  const city = a.city || a.town || a.village || a.municipality || a.county || "";
  const address = [street || a.suburb || a.neighbourhood, city].filter(Boolean).join(", ") || r.display_name.split(",").slice(1, 3).join(",").trim();
  return {
    id: String(r.place_id),
    name,
    address,
    type: r.type,
    category: r.category || r.class,
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
  };
}

function viewbox(c, deg = 0.25) {
  return `${c.lon - deg},${c.lat + deg},${c.lon + deg},${c.lat - deg}`;
}

export async function searchPlaces(q, center, { signal, bounded = false, limit = 8, radius } = {}) {
  const u = new URL(NOMINATIM + "/search");
  u.search = new URLSearchParams({
    q, format: "jsonv2", addressdetails: "1", limit: String(limit), countrycodes: "co",
    "accept-language": "es", viewbox: viewbox(center, radius || (bounded ? 0.06 : 0.35)), bounded: bounded ? "1" : "0",
  });
  const res = await fetch(u, { signal });
  if (!res.ok) throw new Error("No se pudo buscar en este momento.");
  return (await res.json()).map(mapPlace);
}

export async function reverse(p, { signal } = {}) {
  const u = new URL(NOMINATIM + "/reverse");
  u.search = new URLSearchParams({ lat: p.lat, lon: p.lon, format: "jsonv2", zoom: "17", addressdetails: "1", "accept-language": "es" });
  const res = await fetch(u, { signal });
  if (!res.ok) throw new Error("reverse");
  return mapPlace(await res.json());
}

export const MODES = {
  car: { profile: "routed-car", osrm: "driving", icon: "directions_car", label: "Carro", factor: 1 },
  moto: { profile: "routed-car", osrm: "driving", icon: "two_wheeler", label: "Moto", factor: 0.85 },
  bike: { profile: "routed-bike", osrm: "cycling", icon: "directions_bike", label: "Bicicleta", factor: 1 },
  foot: { profile: "routed-foot", osrm: "walking", icon: "directions_walk", label: "A pie", factor: 1 },
};

export async function getRoutes(mode, from, to, { signal } = {}) {
  const m = MODES[mode];
  const url = `${OSRM}/${m.profile}/route/v1/${m.osrm}/${from.lon},${from.lat};${to.lon},${to.lat}?alternatives=true&overview=full&geometries=geojson&steps=true`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("No se pudo calcular la ruta.");
  const data = await res.json();
  if (data.code !== "Ok" || !data.routes?.length) throw new Error("No encontramos una ruta hasta ese destino.");
  return data.routes.map((r, i) => ({
    id: i,
    distance: r.distance,
    duration: r.duration * m.factor,
    coords: r.geometry.coordinates,
    via: mainRoad(r),
    steps: r.legs.flatMap((l) => l.steps).map((s) => ({
      distance: s.distance,
      duration: s.duration,
      name: s.name || s.ref || "",
      type: s.maneuver.type,
      modifier: s.maneuver.modifier,
      exit: s.maneuver.exit,
      loc: { lon: s.maneuver.location[0], lat: s.maneuver.location[1] },
    })),
  }));
}

// La vía con más distancia recorrida en la ruta
function mainRoad(r) {
  const acc = {};
  r.legs.flatMap((l) => l.steps).forEach((s) => { if (s.name) acc[s.name] = (acc[s.name] || 0) + s.distance; });
  return Object.entries(acc).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
}

// Duración solo para mostrar en los chips de medio de transporte
export async function quickDuration(mode, from, to, signal) {
  const m = MODES[mode];
  const url = `${OSRM}/${m.profile}/route/v1/${m.osrm}/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`;
  const res = await fetch(url, { signal });
  const data = await res.json();
  return data.routes?.[0] ? data.routes[0].duration * m.factor : null;
}
