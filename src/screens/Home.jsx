import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { BottomNav, Icon, StatusBar, Switch } from "../components/ui";
import MapView from "../components/MapView";
import { INCIDENT_TYPES, isActive, trafficNow } from "../lib/domain";
import { distance, fmtAgo, fmtMin, initials } from "../lib/geo";

export function estMinutes(from, to) {
  // estimación rápida para los accesos directos: 25 km/h promedio urbano ajustado por la hora
  return fmtMin((distance(from, to) * 1.3) / (25 / 3.6) * trafficNow().factor);
}

export function mapTiles(settings, sat) {
  if (sat) return "sat";
  const h = new Date().getHours();
  return settings.nightMap && (h >= 18 || h < 6) ? "dark" : "light";
}

export default function Home() {
  const s = useStore();
  const nav = useNavigate();
  const [inc, setInc] = useState(null);
  const [layers, setLayers] = useState(false);
  const [showInc, setShowInc] = useState(true);
  const [sat, setSat] = useState(false);
  const [recenter, setRecenter] = useState(0);
  const traffic = trafficNow();
  const active = useMemo(() => s.incidents.filter(isActive), [s.incidents]);

  const goPlace = (kind) => {
    const p = s.places[kind];
    if (!p) return nav(`/buscar?set=${kind}`);
    s.setTrip({ dest: p });
    nav("/ruta");
  };

  return (
    <section className="screen">
      <div style={{ position: "relative", flex: 1 }}>
        <MapView center={s.pos} zoom={15} me={s.pos} incidents={showInc ? active : []} onIncident={setInc} tiles={mapTiles(s.settings, sat)} recenter={recenter} />
        <StatusBar over />
        <div className="search-pill over-top" role="button" tabIndex={0} onClick={() => nav("/buscar")} onKeyDown={(e) => e.key === "Enter" && nav("/buscar")} aria-label="Buscar destino">
          <Icon name="search" style={{ color: "var(--vl-green)" }} />
          <span className="q">¿A dónde vas?</span>
          <button className="iconbtn" style={{ width: 36, height: 36 }} onClick={(e) => { e.stopPropagation(); nav("/buscar?voz=1"); }} aria-label="Buscar por voz"><Icon name="mic" className="muted" /></button>
          <button className="avatar" style={{ width: 38, height: 38, fontSize: 14 }} onClick={(e) => { e.stopPropagation(); nav("/cuenta"); }} aria-label="Mi cuenta">{initials(s.user?.name)}</button>
        </div>
        <div className="quick chips over-top2">
          <button className="chip" onClick={() => goPlace("home")}><Icon name="home" style={{ color: "var(--vl-green)" }} />{s.places.home ? <>Casa · <span className="num">{estMinutes(s.pos, s.places.home)}</span></> : "Agregar casa"}</button>
          <button className="chip" onClick={() => goPlace("work")}><Icon name="work" style={{ color: "var(--vl-green)" }} />{s.places.work ? <>Trabajo · <span className="num">{estMinutes(s.pos, s.places.work)}</span></> : "Agregar trabajo"}</button>
          <button className="chip" onClick={() => nav("/explorar?cat=gasolina")}><Icon name="local_gas_station" style={{ color: "var(--vl-green)" }} />Gasolina</button>
          <button className="chip" onClick={() => nav("/explorar?cat=parqueadero")}><Icon name="local_parking" style={{ color: "var(--vl-green)" }} />Parqueaderos</button>
        </div>
        <button className="fab" style={{ right: 16, top: 170 }} onClick={() => setLayers(true)} aria-label="Capas del mapa"><Icon name="layers" /></button>
        <button className="fab" style={{ right: 16, bottom: 206 }} onClick={() => { setRecenter((x) => x + 1); s.toast(s.pos.source === "gps" ? "Mapa centrado en tu ubicación" : "Activa la ubicación para centrar el mapa en ti"); }} aria-label="Centrar en mi ubicación"><Icon name="my_location" style={{ color: "var(--vl-route)" }} /></button>
        <button className="fab amber" style={{ right: 12, bottom: 132 }} onClick={() => nav("/reportar")} aria-label="Reportar incidente"><Icon name="campaign" fill style={{ fontSize: 30 }} /></button>
        <div className="card" style={{ position: "absolute", left: 16, bottom: 16, right: 84, padding: "10px 14px", zIndex: 550, border: 0, boxShadow: "0 4px 14px rgba(15,35,25,.18)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><b style={{ fontFamily: "var(--f-display)" }}>{s.pos.source === "gps" ? "Tu zona ahora" : "Armenia ahora"}</b><span className={`badge ${traffic.badge}`}>{traffic.label === "Trancón" ? "Congestionado" : traffic.label}</span></div>
          <div className="legend-traffic" style={{ marginTop: 6 }}><span><i style={{ background: "var(--t-ok)" }} />Fluido</span><span><i style={{ background: "var(--t-mid)" }} />Lento</span><span><i style={{ background: "var(--t-bad)" }} />Trancón</span></div>
        </div>

        {inc && (
          <div className="sheet" style={{ zIndex: 720 }}>
            <div className="grab" />
            <div className="pad" style={{ paddingBottom: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "48px 1fr auto", gap: 12, alignItems: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", display: "grid", placeItems: "center", color: INCIDENT_TYPES[inc.type].ink || "#fff", background: INCIDENT_TYPES[inc.type].color }}><Icon name={INCIDENT_TYPES[inc.type].icon} fill /></div>
                <div style={{ minWidth: 0 }}><b style={{ fontFamily: "var(--f-display)", fontSize: 18 }}>{INCIDENT_TYPES[inc.type].label}{inc.detail ? ` · ${inc.detail}` : ""}</b>
                  <div className="muted" style={{ fontSize: 13 }}>{inc.where} · {fmtAgo(inc.createdAt)} · a {Math.round(distance(s.pos, inc) / 100) / 10} km</div></div>
                <button className="iconbtn" onClick={() => setInc(null)} aria-label="Cerrar"><Icon name="close" /></button>
              </div>
              <div className="muted" style={{ fontSize: 14 }}><Icon name="groups" style={{ fontSize: 18, verticalAlign: -4 }} /> {inc.confirms} {inc.confirms === 1 ? "conductor lo confirmó" : "conductores lo confirmaron"}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button className="btn ghost small" onClick={() => { s.dismissIncident(inc.id); setInc(null); s.toast("Gracias, marcaste que ya no está"); }}>Ya no está</button>
                <button className="btn primary small" onClick={() => { s.confirmIncident(inc.id); setInc(null); s.toast("Confirmaste el incidente"); }}>Sigue ahí</button>
              </div>
            </div>
          </div>
        )}

        {layers && <>
          <div className="scrim" onClick={() => setLayers(false)} />
          <div className="sheet">
            <div className="grab" />
            <div className="pad" style={{ paddingBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><h2 className="h-title" style={{ fontSize: 19 }}>Capas del mapa</h2><button className="iconbtn" onClick={() => setLayers(false)} aria-label="Cerrar"><Icon name="close" /></button></div>
              <div className="list">
                <button className="row" style={{ padding: "8px 0" }} onClick={() => setShowInc(!showInc)}><span className="ic"><Icon name="warning" /></span><span><span className="t">Incidentes</span><span className="s">Reportes de la comunidad ({active.length})</span></span><Switch on={showInc} /></button>
                <button className="row" style={{ padding: "8px 0" }} onClick={() => setSat(!sat)}><span className="ic"><Icon name="satellite_alt" /></span><span><span className="t">Satélite</span><span className="s">Vista de imágenes aéreas</span></span><Switch on={sat} /></button>
                <button className="row" style={{ padding: "8px 0" }} onClick={() => s.setSetting("nightMap", !s.settings.nightMap)}><span className="ic"><Icon name="dark_mode" /></span><span><span className="t">Mapa oscuro de noche</span><span className="s">Automático después de las 6:00 p. m.</span></span><Switch on={s.settings.nightMap} /></button>
              </div>
            </div>
          </div>
        </>}
      </div>
      <BottomNav />
    </section>
  );
}
