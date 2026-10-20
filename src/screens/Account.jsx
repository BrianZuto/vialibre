import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { initials } from "../lib/geo";
import { BottomNav, Icon, Ring, StatusBar, Switch } from "../components/ui";

const LEVELS = [[0, "Conductor nuevo"], [10, "Conductor colaborador"], [30, "Guardián de la vía"], [75, "Leyenda de VíaLibre"]];

export default function Account() {
  const s = useStore();
  const nav = useNavigate();
  const [sheet, setSheet] = useState(null);
  const [name, setName] = useState(s.user?.name || "");
  const [email, setEmail] = useState(s.user?.email || "");
  const [confirmReset, setConfirmReset] = useState(false);

  const li = LEVELS.findLastIndex(([min]) => s.reports >= min);
  const next = LEVELS[li + 1];
  const goal = next ? next[0] : LEVELS[li][0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const tripsMonth = s.trips.filter((t) => t.endedAt >= monthStart).length;
  const saved = s.favorites.length + s.wishlist.length + (s.places.home ? 1 : 0) + (s.places.work ? 1 : 0);

  const save = (e) => {
    e.preventDefault();
    if (name.trim().length < 3) return s.toast("Escribe un nombre de al menos 3 letras");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) return s.toast("Escribe un correo válido");
    s.updateUser({ name: name.trim(), email: email.trim().toLowerCase() });
    setSheet(null); s.toast("Perfil actualizado");
  };

  return (
    <section className="screen">
      <StatusBar />
      <div className="scroll" style={{ display: "flex", flexDirection: "column", gap: 18, padding: "4px 16px 20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "64px 1fr auto", gap: 14, alignItems: "center" }}>
          <span className="avatar" style={{ width: 64, height: 64, fontSize: 22 }}>{initials(s.user?.name)}</span>
          <div style={{ minWidth: 0 }}><h1 className="h-title ellipsis" style={{ fontSize: 22 }}>{s.user?.name}</h1><div className="muted ellipsis" style={{ fontSize: 14 }}>{s.user?.email}</div></div>
          <button className="iconbtn" aria-label="Editar perfil" onClick={() => setSheet("edit")}><Icon name="edit" /></button>
        </div>
        <div className="card" style={{ padding: "14px 16px", display: "grid", gridTemplateColumns: "64px 1fr", gap: 14, alignItems: "center" }}>
          <Ring value={next ? s.reports / goal : 1} label={next ? `${s.reports}/${goal}` : `${s.reports}`} color="var(--vl-amber)" />
          <div><b style={{ fontFamily: "var(--f-display)" }}>{LEVELS[li][1]}</b><div className="muted" style={{ fontSize: 13, lineHeight: 1.35, marginTop: 2 }}>{next ? `Haz ${goal - s.reports} ${goal - s.reports === 1 ? "reporte" : "reportes"} más para llegar a «${next[1]}».` : "Llegaste al nivel más alto. ¡Gracias por cuidar la vía!"}</div></div>
        </div>
        <div className="group">
          <button className="row" onClick={() => nav("/historial")}><span className="ic"><Icon name="history" /></span><span><span className="t">Historial de viajes</span><span className="s">{tripsMonth} {tripsMonth === 1 ? "viaje" : "viajes"} este mes</span></span><Icon name="chevron_right" className="muted" /></button>
          <button className="row" onClick={() => nav("/explorar")}><span className="ic"><Icon name="bookmark" /></span><span><span className="t">Lugares guardados</span><span className="s">{saved ? `${saved} ${saved === 1 ? "lugar" : "lugares"}` : "Agrega Casa, Trabajo y favoritos"}</span></span><Icon name="chevron_right" className="muted" /></button>
        </div>
        <div>
          <p className="h-sec" style={{ margin: "0 0 8px" }}>Ajustes de navegación</p>
          <div className="group">
            <button className="row" onClick={() => s.setSetting("voice", !s.settings.voice)}><span className="ic"><Icon name="record_voice_over" /></span><span><span className="t">Guía por voz</span><span className="s">Español (Colombia)</span></span><Switch on={s.settings.voice} /></button>
            <button className="row" onClick={() => s.setSetting("nightMap", !s.settings.nightMap)}><span className="ic"><Icon name="dark_mode" /></span><span><span className="t">Mapa oscuro de noche</span><span className="s">Automático después de las 6:00 p. m.</span></span><Switch on={s.settings.nightMap} /></button>
            <div className="row"><span className="ic"><Icon name="straighten" /></span><span className="t">Unidades</span><span className="s">Kilómetros</span></div>
          </div>
        </div>
        <div className="group">
          <button className="row" onClick={() => setSheet("help")}><span className="ic"><Icon name="help" /></span><span className="t">Ayuda y soporte</span><Icon name="chevron_right" className="muted" /></button>
          <button className="row" onClick={() => { s.logout(); nav("/login", { replace: true }); }}><span className="ic" style={{ background: "#FBE1DE", color: "var(--t-bad)" }}><Icon name="logout" /></span><span className="t" style={{ color: "var(--t-bad)" }}>Cerrar sesión</span><span /></button>
        </div>
      </div>
      <BottomNav />

      {sheet && <div className="scrim" onClick={() => { setSheet(null); setConfirmReset(false); }} />}
      {sheet === "edit" && (
        <div className="sheet"><div className="grab" />
          <form className="pad" onSubmit={save} style={{ paddingBottom: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            <h2 className="h-title" style={{ fontSize: 19, margin: "6px 0 2px" }}>Editar perfil</h2>
            <div><label className="lbl" htmlFor="ac-name">Nombre</label><div className="field"><Icon name="person" className="muted" /><input id="ac-name" value={name} onChange={(e) => setName(e.target.value)} /></div></div>
            <div><label className="lbl" htmlFor="ac-mail">Correo electrónico</label><div className="field"><Icon name="mail" className="muted" /><input id="ac-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div></div>
            <button className="btn primary" type="submit">Guardar cambios</button>
          </form>
        </div>
      )}
      {sheet === "help" && (
        <div className="sheet"><div className="grab" /><div className="pad" style={{ paddingBottom: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 className="h-title" style={{ fontSize: 19, margin: "6px 0 2px" }}>Ayuda y soporte</h2>
          <p className="muted" style={{ margin: 0, lineHeight: 1.5, fontSize: 14 }}>Busca un destino, compara las rutas y toca «Iniciar». Si no estás en el punto de partida, VíaLibre simula el recorrido para que puedas ver la guía paso a paso. Tus reportes, favoritos e historial se guardan solo en este dispositivo. Los mapas son de OpenStreetMap y el tráfico es una estimación según la hora.</p>
          {!confirmReset
            ? <button className="btn ghost small" onClick={() => setConfirmReset(true)}><Icon name="delete" />Borrar mis datos de este dispositivo</button>
            : <button className="btn small" style={{ background: "var(--t-bad)", color: "#fff" }} onClick={() => { s.resetAll(); nav("/login", { replace: true }); }}>Confirmar: borrar todo y cerrar sesión</button>}
        </div></div>
      )}
    </section>
  );
}
