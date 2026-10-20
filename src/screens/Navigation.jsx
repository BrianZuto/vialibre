import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { INCIDENT_TYPES, isActive, maneuver } from "../lib/domain";
import { cumulative, distance, fmtClock, fmtDist, fmtMin, pointAt, progressOf, toLL } from "../lib/geo";
import { Icon, Ring, StatusBar } from "../components/ui";
import MapView from "../components/MapView";
import { mapTiles } from "./Home";

function speak(text, on) {
  if (!on || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "es-CO"; u.rate = 1;
    window.speechSynthesis.speak(u);
  } catch {}
}

export default function Navigation() {
  const s = useStore();
  const nav = useNavigate();
  const t = s.trip;
  const r = t?.route;
  const coords = r?.coords || [];
  const cum = useMemo(() => cumulative(coords), [r]); // eslint-disable-line
  const total = cum[cum.length - 1] || 0;
  const starts = useMemo(() => { let acc = 0; return (r?.steps || []).map((st) => { const v = acc; acc += st.distance; return v; }); }, [r]);

  const nearStart = r && s.pos.source === "gps" && distance(s.pos, toLL(coords[0])) < 300 && !t.simulated;
  const [sim, setSim] = useState(t?.sim ?? !nearStart);
  const done = useRef(false);
  const [traveled, setTraveled] = useState(t?.progress || 0);
  const travRef = useRef(0);
  travRef.current = traveled;
  useEffect(() => () => { if (!done.current) s.setTrip((x) => (x ? { ...x, progress: travRef.current } : x)); }, []); // eslint-disable-line
  const [startedAt] = useState(t?.startedAt || Date.now());
  useEffect(() => { if (t && !t.startedAt) s.setTrip((x) => ({ ...x, startedAt })); }, []); // eslint-disable-line
  const spoken = useRef({});

  // Simulación del recorrido (cuando no estás en el punto de partida) o seguimiento por GPS
  useEffect(() => {
    if (!r || !sim) return;
    const step = t.mode === "foot" ? 10 : t.mode === "bike" ? 18 : 35;
    const id = setInterval(() => setTraveled((d) => Math.min(total, d + step)), 500);
    return () => clearInterval(id);
  }, [sim, r, total]); // eslint-disable-line
  useEffect(() => {
    if (!r || sim) return;
    const pr = progressOf(coords, cum, s.pos);
    if (pr.d < 120) setTraveled((d) => Math.max(d, pr.along));
  }, [s.pos, sim]); // eslint-disable-line

  const idx = Math.max(1, starts.findIndex((v, i) => i > 0 && v > traveled + 5));
  const upcoming = r?.steps[idx === -1 ? r.steps.length - 1 : idx];
  const after = r?.steps[idx + 1];
  const distToNext = upcoming ? starts[idx] - traveled : 0;
  const m = maneuver(upcoming);
  const remaining = Math.max(0, total - traveled);
  const remainingSec = r ? (r.st?.duration || r.duration) * (remaining / (total || 1)) : 0;
  const me = sim ? { ...pointAt(coords, cum, traveled) } : { ...s.pos, heading: s.pos.heading ?? pointAt(coords, cum, traveled).heading };

  // Incidente más cercano por delante sobre la ruta
  const ahead = useMemo(() => {
    if (!r) return null;
    return s.incidents.filter(isActive)
      .map((i) => ({ ...i, pr: progressOf(coords, cum, i) }))
      .filter((i) => i.pr.d < 120 && i.pr.along > traveled)
      .sort((a, b) => a.pr.along - b.pr.along)[0] || null;
  }, [s.incidents, Math.floor(traveled / 50), r]); // eslint-disable-line

  // Indicaciones por voz
  useEffect(() => {
    if (!upcoming) return;
    const k = idx;
    if (!spoken.current[k + "far"] && distToNext > 120) { spoken.current[k + "far"] = 1; speak(`En ${fmtDist(distToNext).replace("km", "kilómetros").replace(" m", " metros")}, ${m.text}`, s.settings.voice); }
    if (!spoken.current[k + "near"] && distToNext <= 60) { spoken.current[k + "near"] = 1; speak(m.text, s.settings.voice); }
  }, [idx, Math.floor(distToNext / 20)]); // eslint-disable-line
  useEffect(() => { if (ahead && !spoken.current["inc" + ahead.id]) { spoken.current["inc" + ahead.id] = 1; speak(`Atención: ${INCIDENT_TYPES[ahead.type].label} reportado adelante`, s.settings.voice); } }, [ahead?.id]); // eslint-disable-line

  // Llegada
  useEffect(() => {
    if (!r || done.current || remaining > 15) return;
    done.current = true;
    speak("Llegaste a tu destino", s.settings.voice);
    const actual = sim ? remainingSec + (r.st?.duration || r.duration) : (Date.now() - startedAt) / 1000;
    const step = Math.max(1, Math.floor(coords.length / 150));
    const id = "t" + Date.now();
    s.addTrip({
      id, to: t.dest, mode: t.mode, startedAt, endedAt: Date.now(), distance: total,
      duration: sim ? (r.st?.duration || r.duration) : actual, estimated: r.st?.duration || r.duration,
      saved: t.alternatives?.length ? Math.max(0, Math.min(...t.alternatives) - (r.st?.duration || r.duration)) : 0,
      incidents: r.st?.near?.length || 0, coords: coords.filter((_, i) => i % step === 0 || i === coords.length - 1),
    });
    setTimeout(() => nav("/llegada", { replace: true, state: { tripId: id } }), 600);
  }, [remaining]); // eslint-disable-line

  if (!r) return <Navigate to="/" replace />;

  const shareEta = async () => {
    const text = `Voy en camino a ${t.dest.name}. Llego aproximadamente a las ${fmtClock(Date.now() + remainingSec * 1000)} (VíaLibre).`;
    try {
      if (navigator.share) await navigator.share({ title: "Mi llegada", text });
      else { await navigator.clipboard.writeText(text); s.toast("Mensaje de llegada copiado para compartir"); }
    } catch {}
  };
  const exit = () => { window.speechSynthesis?.cancel(); s.toast("Navegación finalizada"); nav("/", { replace: true }); };

  return (
    <section className="screen">
      <div style={{ position: "relative", flex: 1 }}>
        <MapView center={me} zoom={17} follow me={me} routes={[{ coords: coords.slice(Math.max(0, cum.findIndex((c) => c >= traveled) - 1)), primary: true }]} dest={t.dest} incidents={s.incidents.filter(isActive)} big tiles={mapTiles(s.settings)} interactive={false} />
        <StatusBar over style={{ color: "#fff", background: "var(--vl-green)" }} />
        <div className="maneuver" role="status" aria-live="polite">
          <Icon name={m.icon} />
          <div style={{ minWidth: 0 }}><div className="dist num">{fmtDist(distToNext)}</div><div className="street">{m.text}</div></div>
          {after && <div className="next" style={{ top: "100%" }}><Icon name={maneuver(after).icon} style={{ fontSize: 18 }} /><span className="ellipsis">Luego: {maneuver(after).text.toLowerCase()}</span></div>}
        </div>
        <button className={`badge ${sim ? "b-mid" : "b-ok"}`} style={{ position: "absolute", left: 16, top: 200, zIndex: 555, border: 0 }} onClick={() => { setSim(!sim); s.setTrip((x) => ({ ...x, sim: !sim })); s.toast(sim ? "Siguiendo tu ubicación GPS" : "Simulando el recorrido"); }}>
          <Icon name={sim ? "pause" : "play_arrow"} style={{ fontSize: 14 }} />{sim ? "Simulando recorrido" : "Simular recorrido"}
        </button>
        {(t.mode === "car" || t.mode === "moto") && <div className="speed num" aria-label="Límite de velocidad 50 km/h">50</div>}
        {ahead && (
          <button className="card" onClick={() => nav("/trafico")} style={{ position: "absolute", right: 12, top: 196, zIndex: 555, padding: "8px 12px", display: "flex", gap: 8, alignItems: "center", border: 0, boxShadow: "0 3px 10px rgba(0,0,0,.18)", fontSize: 13, textAlign: "left" }}>
            <Icon name={INCIDENT_TYPES[ahead.type].icon} fill style={{ color: INCIDENT_TYPES[ahead.type].color }} />
            <span><b>{INCIDENT_TYPES[ahead.type].label}</b><br /><span className="muted num">a {fmtDist(ahead.pr.along - traveled)}</span></span>
          </button>
        )}
        <button className="fab" style={{ right: 16, bottom: 200 }} onClick={() => { s.setSetting("voice", !s.settings.voice); window.speechSynthesis?.cancel(); s.toast(s.settings.voice ? "Guía por voz silenciada" : "Guía por voz activada"); }} aria-label={s.settings.voice ? "Silenciar voz" : "Activar voz"}><Icon name={s.settings.voice ? "volume_up" : "volume_off"} /></button>
        <button className="fab amber" style={{ right: 12, bottom: 262, width: 52, height: 52 }} onClick={() => nav("/reportar")} aria-label="Reportar incidente"><Icon name="campaign" fill /></button>
        <div className="sheet" style={{ padding: "6px 16px 18px" }}>
          <div className="grab" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", width: "100%", textAlign: "center", padding: "4px 0 12px" }}>
            <span><span className="eta-big num">{fmtClock(Date.now() + remainingSec * 1000, false)}</span><br /><span className="muted" style={{ fontSize: 13 }}>llegada</span></span>
            <Ring value={traveled / (total || 1)} label={`${Math.round((traveled / (total || 1)) * 100)}%`} />
            <span><b className="num" style={{ fontFamily: "var(--f-display)", fontSize: 22 }}>{fmtMin(remainingSec)}</b><br /><span className="muted num" style={{ fontSize: 13 }}>{fmtDist(remaining)}</span></span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr) 52px", gap: 8 }}>
            <button className="btn ghost small" onClick={() => nav("/ruta")} style={{ flexDirection: "column", height: 60, gap: 0, borderRadius: 16, fontSize: 12 }}><Icon name="alt_route" />Rutas</button>
            <button className="btn ghost small" onClick={shareEta} style={{ flexDirection: "column", height: 60, gap: 0, borderRadius: 16, fontSize: 12 }}><Icon name="share_location" />Compartir</button>
            <button className="btn ghost small" onClick={() => nav("/trafico")} style={{ flexDirection: "column", height: 60, gap: 0, borderRadius: 16, fontSize: 12 }}><Icon name="warning" />Alertas</button>
            <button className="btn small" onClick={exit} style={{ height: 60, borderRadius: 16, background: "var(--t-bad)", color: "#fff", padding: 0 }} aria-label="Salir de la navegación"><Icon name="close" /></button>
          </div>
        </div>
      </div>
    </section>
  );
}
