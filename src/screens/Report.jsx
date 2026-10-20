import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { DETAILS, INCIDENT_TYPES } from "../lib/domain";
import { reverse } from "../lib/api";
import { Icon, StatusBar } from "../components/ui";
import MapView from "../components/MapView";

export default function Report() {
  const s = useStore();
  const nav = useNavigate();
  const [type, setType] = useState(null);
  const [detail, setDetail] = useState(null);
  const [where, setWhere] = useState("Cerca de tu ubicación");
  const [sent, setSent] = useState(false);
  const [at] = useState({ lat: s.pos.lat, lon: s.pos.lon });

  useEffect(() => {
    const ctl = new AbortController();
    reverse(at, { signal: ctl.signal }).then((p) => setWhere(p.address || p.name)).catch(() => {});
    return () => ctl.abort();
  }, []); // eslint-disable-line

  const send = () => {
    s.report({ type, detail, lat: at.lat, lon: at.lon, where });
    setSent(true);
  };

  return (
    <section className="screen">
      <div style={{ position: "relative", flex: 1 }}>
        <MapView center={at} zoom={16} me={at} tiles="light" interactive={false} style={{ filter: "saturate(.6)" }} />
        <div className="scrim" style={{ zIndex: 560 }} />
        <StatusBar over style={{ color: "#fff" }} />
        <div className="sheet" style={{ paddingBottom: 20 }}>
          <div className="grab" />
          <div className="pad" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div style={{ minWidth: 0 }}><h2 className="h-title" style={{ fontSize: 21 }}>¿Qué ves en la vía?</h2><div className="muted ellipsis" style={{ fontSize: 13, marginTop: 2 }}>{where}</div></div>
              <button className="iconbtn" onClick={() => nav(-1)} aria-label="Cerrar"><Icon name="close" /></button>
            </div>
            <div className="rtype" role="radiogroup" aria-label="Tipo de incidente">
              {Object.entries(INCIDENT_TYPES).map(([k, t]) => (
                <button key={k} className={type === k ? "sel" : ""} onClick={() => setType(k)} role="radio" aria-checked={type === k}>
                  <span className="disc" style={{ background: t.color }}><Icon name={t.icon} style={t.ink ? { color: t.ink } : null} /></span>{k === "cierre" ? "Cierre de vía" : t.short || t.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span className="muted" style={{ fontSize: 13, fontWeight: 700 }}>Detalle (opcional)</span>
              <div className="chips">
                {DETAILS.map((d) => <button key={d} className={`chip ${detail === d ? "on" : ""}`} onClick={() => setDetail(detail === d ? null : d)}>{d}</button>)}
              </div>
            </div>
            <button className="btn primary" disabled={!type} onClick={send}>{type ? `Enviar reporte de ${(INCIDENT_TYPES[type].short || INCIDENT_TYPES[type].label).toLowerCase()}` : "Selecciona un tipo"}</button>
          </div>
        </div>
        {sent && (
          <div className="scrim" style={{ zIndex: 900, display: "grid", placeItems: "center" }}>
            <div className="card" style={{ margin: "0 28px", padding: 24, textAlign: "center", display: "flex", flexDirection: "column", gap: 12, alignItems: "center", border: 0 }}>
              <span style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--vl-green-soft)", display: "grid", placeItems: "center" }}><Icon name="check_circle" fill style={{ color: "var(--vl-green)", fontSize: 36 }} /></span>
              <h2 className="h-title" style={{ fontSize: 20 }}>¡Gracias por reportar!</h2>
              <p className="muted" style={{ margin: 0, lineHeight: 1.45 }}>Tu reporte de <b>{(INCIDENT_TYPES[type].short || INCIDENT_TYPES[type].label).toLowerCase()}</b> ya aparece en el mapa y avisará a los conductores que pasen por esta zona.</p>
              <button className="btn primary" style={{ width: "100%" }} onClick={() => nav(-1)} autoFocus>Aceptar</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
