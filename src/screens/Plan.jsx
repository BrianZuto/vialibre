import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { MODES, getRoutes, quickDuration } from "../lib/api";
import { isActive, routeStatus, trafficNow } from "../lib/domain";
import { fmtClock, fmtDist, fmtMin } from "../lib/geo";
import { Icon, Spinner, StatusBar, Switch } from "../components/ui";
import MapView from "../components/MapView";
import { mapTiles } from "./Home";

export default function Plan() {
  const s = useStore();
  const nav = useNavigate();
  const dest = s.trip?.dest;
  const [mode, setMode] = useState(s.trip?.mode || "car");
  const [routes, setRoutes] = useState(null);
  const [error, setError] = useState("");
  const [sel, setSel] = useState(0);
  const [durs, setDurs] = useState({});
  const [sheet, setSheet] = useState(null);
  const [avoidInc, setAvoidInc] = useState(s.trip?.avoidInc ?? true);
  const [depart, setDepart] = useState(null); // minutos de espera
  const [pendingDepart, setPendingDepart] = useState(15);
  const [reversed, setReversed] = useState(false);
  // el origen se fija al abrir la pantalla para no recalcular con cada lectura del GPS
  const [origin] = useState({ lat: s.pos.lat, lon: s.pos.lon });

  const from = reversed ? dest : origin;
  const to = reversed ? origin : dest;

  useEffect(() => {
    if (!dest) return;
    const ctl = new AbortController();
    setRoutes(null); setError("");
    getRoutes(mode, from, to, { signal: ctl.signal })
      .then((r) => { setRoutes(r); setSel(0); })
      .catch((e) => e.name !== "AbortError" && setError(e.message || "No se pudo calcular la ruta."));
    return () => ctl.abort();
  }, [mode, reversed, dest?.id]); // eslint-disable-line

  useEffect(() => {
    if (!dest) return;
    const ctl = new AbortController();
    Object.keys(MODES).forEach((m) => quickDuration(m, from, to, ctl.signal).then((d) => setDurs((x) => ({ ...x, [m]: d }))).catch(() => {}));
    return () => ctl.abort();
  }, [reversed, dest?.id]); // eslint-disable-line

  const base = mode === "car" || mode === "moto" ? trafficNow(new Date(Date.now() + (depart || 0) * 60000)) : { key: "ok", factor: 1 };
  const enriched = useMemo(() => {
    if (!routes) return [];
    const active = s.incidents.filter(isActive);
    const list = routes.map((r) => ({ ...r, st: routeStatus(r, active, base) }));
    const score = (r) => r.st.duration + (avoidInc ? r.st.near.length * 240 : 0);
    const best = list.reduce((a, b) => (score(b) < score(a) ? b : a), list[0]);
    return list.map((r) => ({ ...r, best: r === best }));
  }, [routes, s.incidents, base.key, avoidInc]); // eslint-disable-line

  useEffect(() => { const i = enriched.findIndex((r) => r.best); if (i >= 0) setSel(i); }, [enriched.length, avoidInc]); // eslint-disable-line

  if (!dest) return <Navigate to="/buscar" replace />;

  const start = () => {
    const r = enriched[sel];
    s.setTrip({ dest, mode, avoidInc, route: r, from, to, simulated: reversed, alternatives: enriched.filter((x) => x !== r).map((x) => x.st.duration) });
    nav("/navegacion");
  };

  const departAt = (min) => new Date(Date.now() + (min || 0) * 60000);
  const bounds = enriched.length ? [[from.lat, from.lon], [to.lat, to.lon], ...enriched[sel].coords.filter((_, i) => i % 20 === 0).map(([lon, lat]) => [lat, lon])] : [[from.lat, from.lon], [to.lat, to.lon]];

  return (
    <section className="screen">
      <StatusBar />
      <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 44px", gap: 4, alignItems: "center", padding: "0 8px 10px" }}>
        <button className="iconbtn" onClick={() => nav(-1)} aria-label="Volver"><Icon name="arrow_back" /></button>
        <div style={{ display: "flex", flexDirection: reversed ? "column-reverse" : "column", gap: 6 }}>
          <div className="field" style={{ height: 42, borderRadius: 12 }}><i style={{ width: 10, height: 10, borderRadius: "50%", border: "2.5px solid var(--vl-route)", flex: "none" }} /><input readOnly value="Tu ubicación" aria-label="Mi ubicación" /></div>
          <div className="field" style={{ height: 42, borderRadius: 12, cursor: "pointer" }} onClick={() => nav("/buscar")}><Icon name="location_on" style={{ fontSize: 16, color: "var(--t-bad)" }} /><input readOnly value={dest.name} aria-label="Destino" style={{ cursor: "pointer" }} /></div>
        </div>
        <button className="iconbtn" aria-label="Intercambiar origen y destino" onClick={() => { setReversed(!reversed); s.toast("Origen y destino intercambiados"); }}><Icon name="swap_vert" /></button>
      </div>
      <div className="pad chips" style={{ paddingBottom: 10 }}>
        {Object.entries(MODES).map(([k, m]) => (
          <button key={k} className={`chip ${mode === k ? "on" : ""}`} onClick={() => setMode(k)} aria-label={m.label}>
            <Icon name={m.icon} /><span className="num">{durs[k] ? fmtMin(durs[k] * (k === "car" || k === "moto" ? trafficNow().factor : 1)) : "…"}</span>
          </button>
        ))}
      </div>
      <div style={{ position: "relative", height: 250, flex: "none" }}>
        <MapView
          center={dest} zoom={14} me={reversed ? null : origin} dest={to} tiles={mapTiles(s.settings)} bounds={bounds}
          incidents={s.incidents.filter(isActive)}
          routes={enriched.map((r, i) => ({ coords: r.coords, primary: i === sel, eta: fmtMin(r.st.duration), onClick: () => setSel(i) }))}
        />
      </div>
      <div className="scroll" style={{ background: "var(--surface)", borderRadius: "20px 20px 0 0", marginTop: -16, position: "relative", zIndex: 600, padding: "14px 16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        {!routes && !error && <div className="empty"><Spinner />Calculando rutas…</div>}
        {error && <div className="empty"><Icon name="wrong_location" />{error}<button className="btn ghost small" onClick={() => setMode(mode)}>Reintentar</button></div>}
        {depart != null && <div className="card" style={{ padding: "10px 14px", display: "flex", gap: 10, alignItems: "center", background: "var(--vl-green-soft)", borderColor: "#BFDCC9", fontSize: 14 }}><Icon name="schedule" style={{ color: "var(--vl-green)" }} />Salida programada a las <b>{fmtClock(departAt(depart))}</b><button style={{ marginLeft: "auto", color: "var(--vl-green-2)", fontWeight: 700 }} onClick={() => setDepart(null)}>Quitar</button></div>}
        {enriched.map((r, i) => (
          <button key={r.id} className={`routecard ${i === sel ? "sel" : ""}`} onClick={() => setSel(i)}>
            <span className="min num">{fmtMin(r.st.duration)} <span style={{ fontSize: 15, color: "var(--muted)", fontWeight: 700 }}>· {fmtDist(r.distance)}</span></span>
            {r.best ? <span className="badge b-ok" style={{ alignSelf: "center" }}>Recomendada</span> : <span />}
            <span className="muted" style={{ fontSize: 14 }}>
              {r.via ? `Por ${r.via}` : "Ruta alterna"} · llegada {fmtClock(new Date(departAt(depart).getTime() + r.st.duration * 1000), false)}
              {r.st.near.length > 0 && ` · ${r.st.near.length} ${r.st.near.length === 1 ? "incidente" : "incidentes"}`}
            </span>
            {mode === "car" || mode === "moto" ? <span className={`badge ${r.st.badge}`} style={{ justifySelf: "end" }}>{r.st.label}</span> : <span />}
          </button>
        ))}
        <div style={{ display: "grid", gridTemplateColumns: "auto auto 1fr", gap: 8, padding: "6px 0 16px", background: "var(--surface)", position: "sticky", bottom: 0, marginTop: "auto" }}>
          <button className="btn ghost small" onClick={() => setSheet("opts")} aria-label="Opciones de ruta"><Icon name="tune" /></button>
          <button className="btn ghost small" onClick={() => setSheet("later")}><Icon name="schedule" />Más tarde</button>
          <button className="btn route" disabled={!enriched.length} onClick={start}><Icon name="navigation" fill />Iniciar</button>
        </div>
      </div>

      {sheet && <div className="scrim" onClick={() => setSheet(null)} />}
      {sheet === "opts" && (
        <div className="sheet"><div className="grab" /><div className="pad" style={{ paddingBottom: 20 }}>
          <h2 className="h-title" style={{ fontSize: 19, margin: "6px 0 10px" }}>Opciones de ruta</h2>
          <button className="row" style={{ padding: "8px 0" }} onClick={() => setAvoidInc(!avoidInc)}><span className="ic"><Icon name="warning" /></span><span><span className="t">Evitar incidentes</span><span className="s">Recomienda la ruta con menos reportes</span></span><Switch on={avoidInc} /></button>
          <button className="row" style={{ padding: "8px 0" }} onClick={() => s.setSetting("voice", !s.settings.voice)}><span className="ic"><Icon name="record_voice_over" /></span><span className="t">Guía por voz</span><Switch on={s.settings.voice} /></button>
          <button className="btn primary" style={{ width: "100%", marginTop: 10 }} onClick={() => { setSheet(null); s.toast("Rutas actualizadas"); }}>Aplicar</button>
        </div></div>
      )}
      {sheet === "later" && (
        <div className="sheet"><div className="grab" /><div className="pad" style={{ paddingBottom: 20 }}>
          <h2 className="h-title" style={{ fontSize: 19, margin: "6px 0 4px" }}>Salir más tarde</h2>
          <p className="muted" style={{ margin: "0 0 12px", fontSize: 14 }}>Calculamos la llegada con el tráfico esperado a esa hora.</p>
          <div className="chips" style={{ flexWrap: "wrap" }}>
            {[15, 30, 45, 60, 90].map((m) => <button key={m} className={`chip ${pendingDepart === m ? "on" : ""}`} onClick={() => setPendingDepart(m)}>{fmtClock(departAt(m))}</button>)}
          </div>
          <button className="btn primary" style={{ width: "100%", marginTop: 14 }} onClick={() => { setDepart(pendingDepart); setSheet(null); s.toast(`Salida programada para las ${fmtClock(departAt(pendingDepart))}`); }}>Confirmar</button>
        </div></div>
      )}
    </section>
  );
}
