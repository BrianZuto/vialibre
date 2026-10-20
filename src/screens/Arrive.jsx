import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { fmtClock, fmtDist, fmtMin } from "../lib/geo";
import { Icon, StatusBar } from "../components/ui";
import MapView from "../components/MapView";

export default function Arrive() {
  const s = useStore();
  const nav = useNavigate();
  const id = useLocation().state?.tripId;
  const trip = s.trips.find((t) => t.id === id) || s.trips[0];
  if (!trip) return <Navigate to="/" replace />;
  const end = trip.coords[trip.coords.length - 1];
  const bounds = [trip.coords[0], end].map(([lon, lat]) => [lat, lon]);

  return (
    <section className="screen">
      <div style={{ position: "relative", height: 300, flex: "none" }}>
        <MapView center={{ lat: end[1], lon: end[0] }} zoom={15} dest={trip.to} routes={[{ coords: trip.coords, primary: true, dashed: true }]} bounds={bounds} fitPad={[[40, 60], [40, 60]]} />
        <StatusBar over />
      </div>
      <div className="scroll" style={{ background: "var(--surface)", borderRadius: "24px 24px 0 0", marginTop: -24, position: "relative", zIndex: 600, padding: "22px 16px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--vl-green)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="flag" fill style={{ color: "#fff", fontSize: 30 }} /></span>
          <div style={{ minWidth: 0 }}><h2 className="h-title">Llegaste a tu destino</h2><div className="muted ellipsis">{trip.to.name}</div></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", border: "1px solid var(--line)", borderRadius: 16 }}>
          <div style={{ padding: 12, textAlign: "center" }}><b className="num" style={{ fontFamily: "var(--f-display)", fontSize: 20 }}>{fmtMin(trip.duration)}</b><div className="muted" style={{ fontSize: 12 }}>duración</div></div>
          <div style={{ padding: 12, textAlign: "center", borderLeft: "1px solid var(--line)", borderRight: "1px solid var(--line)" }}><b className="num" style={{ fontFamily: "var(--f-display)", fontSize: 20 }}>{fmtDist(trip.distance)}</b><div className="muted" style={{ fontSize: 12 }}>distancia</div></div>
          <div style={{ padding: 12, textAlign: "center" }}><b className="num" style={{ fontFamily: "var(--f-display)", fontSize: 20 }}>{fmtClock(trip.endedAt, false)}</b><div className="muted" style={{ fontSize: 12 }}>llegada</div></div>
        </div>
        {trip.saved >= 60 ? (
          <div className="card" style={{ padding: "12px 14px", display: "flex", gap: 10, alignItems: "center", background: "var(--vl-green-soft)", borderColor: "#BFDCC9" }}><Icon name="savings" fill style={{ color: "var(--vl-green)" }} /><span style={{ fontSize: 14, lineHeight: 1.35 }}>Ahorraste <b>{fmtMin(trip.saved)}</b> frente a la ruta alterna.</span></div>
        ) : trip.incidents > 0 ? (
          <div className="card" style={{ padding: "12px 14px", display: "flex", gap: 10, alignItems: "center", background: "var(--vl-amber-soft)", borderColor: "#F4D58A" }}><Icon name="warning" style={{ color: "#8A5A00" }} /><span style={{ fontSize: 14, lineHeight: 1.35 }}>Pasaste cerca de <b>{trip.incidents}</b> {trip.incidents === 1 ? "incidente reportado" : "incidentes reportados"}.</span></div>
        ) : null}
        <div><b style={{ fontFamily: "var(--f-display)" }}>¿Cómo estuvo la ruta?</b>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} className={`ms ${trip.rating >= n ? "fill" : ""}`} style={{ color: trip.rating >= n ? "#F2A400" : undefined, fontSize: 30 }} aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`} onClick={() => { s.rateTrip(trip.id, n); s.toast("Gracias por calificar la ruta"); }}>star</button>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: "auto" }}>
          <button className="btn ghost" onClick={() => nav(`/explorar?cat=parqueadero&lat=${trip.to.lat}&lon=${trip.to.lon}`)}><Icon name="local_parking" />Parquear</button>
          <button className="btn primary" onClick={() => { s.setTrip(null); nav("/", { replace: true }); }}>Finalizar</button>
        </div>
      </div>
    </section>
  );
}
