import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { INCIDENT_TYPES, isActive, nearestTo } from "../lib/domain";
import { distance, fmtDist } from "../lib/geo";
import { Icon, StatusBar } from "../components/ui";
import MapView from "../components/MapView";
import { estMinutes, mapTiles } from "./Home";

const CATEGORY = { amenity: "Lugar de interés", shop: "Comercio", highway: "Vía", place: "Sector", building: "Edificio", leisure: "Recreación", tourism: "Turismo", office: "Oficina", boundary: "Zona" };

export default function Place() {
  const s = useStore();
  const nav = useNavigate();
  const p = useLocation().state?.place || s.trip?.dest;
  if (!p) return <Navigate to="/buscar" replace />;

  const saved = s.favorites.some((f) => f.id === p.id);
  const dist = distance(s.pos, p);
  const nearInc = nearestTo(s.incidents.filter(isActive), p).find((i) => i.dist < 1500);

  const share = async () => {
    const url = `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=17/${p.lat}/${p.lon}`;
    try {
      if (navigator.share) { await navigator.share({ title: p.name, text: `${p.name} · ${p.address}`, url }); return; }
      await navigator.clipboard.writeText(`${p.name} · ${p.address} ${url}`);
      s.toast("Enlace del lugar copiado");
    } catch { /* el usuario canceló */ }
  };

  return (
    <section className="screen">
      <div style={{ position: "relative", flex: 1 }}>
        <MapView center={{ lat: p.lat - 0.004, lon: p.lon }} zoom={16} dest={p} me={dist < 30000 ? s.pos : null} tiles={mapTiles(s.settings)} bounds={dist < 15000 ? [[s.pos.lat, s.pos.lon], [p.lat, p.lon]] : null} fitPad={[[50, 110], [50, 360]]} />
        <StatusBar over />
        <button className="fab over-top" style={{ left: 16, top: 48, width: 44, height: 44 }} onClick={() => nav(-1)} aria-label="Volver"><Icon name="arrow_back" /></button>
        <div className="sheet" style={{ paddingBottom: 20 }}>
          <div className="grab" />
          <div className="pad" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <h2 className="h-title">{p.name}</h2>
              <div className="muted" style={{ marginTop: 4 }}>{CATEGORY[p.category] || "Lugar"} · {p.address}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
                {saved && <span className="badge b-ok">En tus favoritos</span>}
                <span className="muted num" style={{ fontSize: 14 }}>{fmtDist(dist)} · {estMinutes(s.pos, p)} en carro</span>
              </div>
            </div>
            <button className="btn route" onClick={() => { s.setTrip({ dest: p }); nav("/ruta"); }}><Icon name="directions" />Cómo llegar</button>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
              <button className="btn ghost small tile" onClick={() => s.toast(s.toggleFavorite(p) ? "Guardado en Favoritos" : "Quitado de Favoritos")}><Icon name={saved ? "bookmark_added" : "bookmark"} fill={saved} /><span>{saved ? "Guardado" : "Guardar"}</span></button>
              <button className="btn ghost small tile" onClick={share}><Icon name="share" /><span>Compartir</span></button>
              <button className="btn ghost small tile" onClick={() => nav(`/explorar?cat=parqueadero&lat=${p.lat}&lon=${p.lon}`)}><Icon name="local_parking" /><span>Parqueo</span></button>
            </div>
            {nearInc && (
              <div className="card" style={{ padding: "12px 14px", display: "flex", gap: 10, alignItems: "center", background: "var(--vl-amber-soft)", borderColor: "#F4D58A" }}>
                <Icon name="warning" style={{ color: "#8A5A00" }} />
                <span style={{ fontSize: 14, lineHeight: 1.35 }}>Hay un reporte de <b>{INCIDENT_TYPES[nearInc.type].label.toLowerCase()}</b> a {fmtDist(nearInc.dist)} de este lugar.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
