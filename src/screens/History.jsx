import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { MODES } from "../lib/api";
import { fmtClock, fmtDay, fmtDist, fmtMin } from "../lib/geo";
import { Empty, Icon, StatusBar } from "../components/ui";
import MapView from "../components/MapView";

const FILTERS = [["todos", "Todos"], ["semana", "Esta semana"], ["mes", "Este mes"], ["incidentes", "Con incidentes"]];

export default function History() {
  const s = useStore();
  const nav = useNavigate();
  const [f, setF] = useState("todos");
  const [open, setOpen] = useState(s.trips[0]?.id || null);
  const now = new Date();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7)).getTime();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const list = s.trips.filter((t) => f === "todos" || (f === "semana" ? t.endedAt >= weekStart : f === "mes" ? t.endedAt >= monthStart : t.incidents > 0));
  const groups = list.reduce((acc, t) => { const k = fmtDay(t.endedAt); (acc[k] ||= []).push(t); return acc; }, {});

  const repeat = (t) => { s.setTrip({ dest: t.to, mode: t.mode }); nav("/ruta"); };

  return (
    <section className="screen">
      <StatusBar />
      <div className="appbar">
        <button className="iconbtn" onClick={() => nav(-1)} aria-label="Volver"><Icon name="arrow_back" /></button>
        <h1 className="h-title" style={{ fontSize: 20, flex: 1 }}>Historial de viajes</h1>
        <span className="muted num" style={{ fontSize: 13, paddingRight: 12 }}>{s.trips.length} viajes</span>
      </div>
      <div className="pad chips" style={{ paddingBottom: 12 }}>
        {FILTERS.map(([k, l]) => <button key={k} className={`chip ${f === k ? "on" : ""}`} onClick={() => setF(k)}>{l}</button>)}
      </div>
      <div className="scroll" style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 16px 20px" }}>
        {list.length === 0 && (
          <div className="group"><Empty icon="route">{s.trips.length ? "No hay viajes con este filtro." : "Aún no tienes viajes. Cuando llegues a un destino con VíaLibre, aparecerá aquí."}</Empty>
            {!s.trips.length && <div className="pad" style={{ paddingBottom: 16 }}><button className="btn primary" style={{ width: "100%" }} onClick={() => nav("/buscar")}><Icon name="search" />Buscar un destino</button></div>}
          </div>
        )}
        {Object.entries(groups).map(([day, trips]) => (
          <div key={day} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p className="h-sec" style={{ margin: "6px 0 2px" }}>{day}</p>
            {trips.map((t) => open === t.id ? (
              <div key={t.id} className="trip" style={{ display: "block", padding: 0, overflow: "hidden" }}>
                <div style={{ position: "relative", height: 120 }}>
                  <MapView center={{ lat: t.to.lat, lon: t.to.lon }} zoom={14} interactive={false} dest={t.to} routes={[{ coords: t.coords, primary: true }]} bounds={[t.coords[0], t.coords[t.coords.length - 1]].map(([lon, lat]) => [lat, lon])} fitPad={[[20, 20], [20, 20]]} />
                </div>
                <button style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "center", padding: 14, width: "100%", textAlign: "left" }} onClick={() => setOpen(null)}>
                  <span className="dots"><i style={{ border: "2px solid var(--vl-route)" }} /><b /><i style={{ background: "var(--t-bad)" }} /></span>
                  <div style={{ minWidth: 0 }}><b>Tu ubicación</b><div style={{ marginTop: 12 }} className="ellipsis"><b>{t.to.name}</b></div></div>
                  <div style={{ textAlign: "right" }}><b className="num" style={{ fontFamily: "var(--f-display)" }}>{fmtMin(t.duration)}</b><div className="muted num" style={{ fontSize: 13 }}>{fmtDist(t.distance)}</div><div className="muted num" style={{ fontSize: 12 }}>{fmtClock(t.startedAt)}</div></div>
                </button>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "0 14px 14px" }}>
                  <button className="btn ghost small" onClick={() => { s.deleteTrip(t.id); s.toast("Viaje eliminado del historial"); }}><Icon name="delete" />Eliminar</button>
                  <button className="btn route small" onClick={() => repeat(t)}><Icon name="replay" />Repetir ruta</button>
                </div>
              </div>
            ) : (
              <button key={t.id} className="trip" onClick={() => setOpen(t.id)}>
                <span className="dots"><i style={{ border: "2px solid var(--vl-route)" }} /><b /><i style={{ background: "var(--t-bad)" }} /></span>
                <div style={{ minWidth: 0 }}><b>Tu ubicación</b><div style={{ marginTop: 12 }} className="ellipsis"><b>{t.to.name}</b> <span className="muted">· {MODES[t.mode]?.label || "Carro"}</span></div></div>
                <div style={{ textAlign: "right" }}><b className="num" style={{ fontFamily: "var(--f-display)" }}>{fmtMin(t.duration)}</b><div className="muted num" style={{ fontSize: 13 }}>{fmtDist(t.distance)}</div></div>
              </button>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
