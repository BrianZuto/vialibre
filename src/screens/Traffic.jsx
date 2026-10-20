import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { INCIDENT_TYPES, isActive, nearestTo, trafficNow } from "../lib/domain";
import { fmtAgo, fmtClock, fmtDist } from "../lib/geo";
import { BottomNav, Empty, Icon, StatusBar } from "../components/ui";

const FILTERS = [
  ["todas", "Todas"],
  ["cerca", "A menos de 2 km"],
  ["accidente", "Accidentes"],
  ["cierre", "Cierres"],
  ["policia", "Policía"],
];

export default function Traffic() {
  const s = useStore();
  const nav = useNavigate();
  const [f, setF] = useState("todas");
  const [open, setOpen] = useState(null);
  const tr = trafficNow();
  const all = useMemo(() => nearestTo(s.incidents.filter(isActive), s.pos), [s.incidents, s.pos]);
  const list = all.filter((i) => f === "todas" || (f === "cerca" ? i.dist < 2000 : i.type === f));

  const notify = async () => {
    if (!("Notification" in window)) return s.toast("Tu navegador no permite notificaciones");
    const p = await Notification.requestPermission();
    s.toast(p === "granted" ? "Notificaciones activadas" : "Las notificaciones están bloqueadas en el navegador");
  };

  return (
    <section className="screen">
      <StatusBar />
      <div className="pad" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}>
        <h1 className="h-title" style={{ fontSize: 26 }}>Tráfico y alertas</h1>
        <button className="iconbtn" onClick={notify} aria-label="Activar notificaciones"><Icon name="notifications_active" /></button>
      </div>
      <div className="scroll" style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 12, paddingBottom: 16 }}>
        <div className="pad"><div className="card" style={{ padding: "14px 16px", display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
          <div><b style={{ fontFamily: "var(--f-display)", fontSize: 17 }}>{s.pos.source === "gps" ? "Tu zona" : "Armenia"} · {fmtClock(new Date())}</b><div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{tr.note} · estimado según la hora</div></div>
          <span className={`badge ${tr.badge}`} style={{ fontSize: 13 }}>{tr.label === "Trancón" ? "Congestionado" : tr.label}</span>
          <div style={{ gridColumn: "1/-1", display: "flex", height: 10, borderRadius: 5, overflow: "hidden" }}>
            <span style={{ flex: tr.split[0], background: "var(--t-ok)" }} /><span style={{ flex: tr.split[1], background: "var(--t-mid)" }} /><span style={{ flex: tr.split[2], background: "var(--t-bad)" }} />
          </div>
          <div className="legend-traffic num" style={{ gridColumn: "1/-1" }}><span><i style={{ background: "var(--t-ok)" }} />{tr.split[0]} % fluido</span><span><i style={{ background: "var(--t-mid)" }} />{tr.split[1]} % lento</span><span><i style={{ background: "var(--t-bad)" }} />{tr.split[2]} % trancón</span></div>
        </div></div>
        <div className="pad chips">
          {FILTERS.map(([k, l]) => <button key={k} className={`chip ${f === k ? "on" : ""}`} onClick={() => setF(k)}>{l}{k === "todas" ? ` · ${all.length}` : ""}</button>)}
        </div>
        {list.length === 0 ? (
          <div className="group" style={{ margin: "0 16px" }}><Empty icon="check_circle">No hay reportes activos con este filtro.</Empty></div>
        ) : (
          <div className="group" style={{ margin: "0 16px" }}>
            {list.map((i) => {
              const t = INCIDENT_TYPES[i.type];
              return (
                <div key={i.id}>
                  <button className="inc" onClick={() => setOpen(open === i.id ? null : i.id)} aria-expanded={open === i.id}>
                    <span className="disc" style={{ background: t.color }}><Icon name={t.icon} style={t.ink ? { color: t.ink } : null} /></span>
                    <div style={{ minWidth: 0 }}><b>{t.label}{i.detail ? ` · ${i.detail}` : ""}</b><div className="muted ellipsis" style={{ fontSize: 13 }}>{i.where}</div><div className="muted num" style={{ fontSize: 12 }}>{fmtAgo(i.createdAt)} · {i.confirms} {i.confirms === 1 ? "confirmación" : "confirmaciones"}{i.mine ? " · tu reporte" : ""}</div></div>
                    <span className="num" style={{ fontWeight: 700 }}>{fmtDist(i.dist)}</span>
                  </button>
                  {open === i.id && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "0 16px 12px 72px" }}>
                      <button className="btn ghost small" onClick={() => { s.dismissIncident(i.id); setOpen(null); s.toast("Gracias, marcaste que ya no está"); }}>Ya no está</button>
                      <button className="btn primary small" onClick={() => { s.confirmIncident(i.id); setOpen(null); s.toast("Confirmaste el incidente"); }}>Sigue ahí</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div className="pad"><button className="btn ghost" style={{ width: "100%", borderColor: "var(--vl-amber)", background: "var(--vl-amber-soft)" }} onClick={() => nav("/reportar")}><Icon name="campaign" fill style={{ color: "#8A5A00" }} />Reportar un incidente</button></div>
      </div>
      <BottomNav />
    </section>
  );
}
