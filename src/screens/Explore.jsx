import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStore } from "../lib/store";
import { searchPlaces } from "../lib/api";
import { distance, fmtDist } from "../lib/geo";
import { BottomNav, Empty, Icon, Spinner, StatusBar } from "../components/ui";
import { estMinutes } from "./Home";

const CATS = {
  gasolina: { label: "Gasolina", title: "Gasolina cerca", q: "gasolinera", icon: "local_gas_station", radius: 0.06, bg: "#FDECEA", fg: "#C3261B", fallback: "Estación de servicio" },
  parqueadero: { label: "Parqueaderos", title: "Parqueaderos cerca", q: "parqueadero", icon: "local_parking", radius: 0.05, bg: "#E6F0FC", fg: "#1D5BB5", fallback: "Parqueadero" },
  peaje: { label: "Peajes", title: "Peajes en la región", q: "peaje", icon: "toll", radius: 0.6, bg: "#EEF1EF", fg: "#3B4A42", fallback: "Peaje" },
  taller: { label: "Talleres", title: "Talleres cerca", q: "taller mecánico", icon: "car_repair", radius: 0.06, bg: "#FFF4D6", fg: "#9A6A00", fallback: "Taller mecánico" },
};

export default function Explore() {
  const s = useStore();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const cat = CATS[params.get("cat")] ? params.get("cat") : "gasolina";
  const C = CATS[cat];
  const center = params.get("lat") ? { lat: +params.get("lat"), lon: +params.get("lon") } : s.pos;
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null); // favoritos | quiero
  const [edit, setEdit] = useState(false);

  useEffect(() => {
    const ctl = new AbortController();
    setItems(null); setError("");
    searchPlaces(C.q, center, { signal: ctl.signal, bounded: true, radius: C.radius, limit: 15 })
      .then((r) => setItems(r.map((p) => ({ ...p, name: p.name || C.fallback, dist: distance(center, p) })).sort((a, b) => a.dist - b.dist).slice(0, 8)))
      .catch((e) => e.name !== "AbortError" && setError("No pudimos cargar los lugares cercanos."));
    return () => ctl.abort();
  }, [cat, center.lat.toFixed(3), center.lon.toFixed(3)]); // eslint-disable-line

  const goPlace = (p) => { s.addRecent(p); nav("/lugar", { state: { place: p } }); };
  const goRoute = (kind) => {
    const p = s.places[kind];
    if (!p) return nav(`/buscar?set=${kind}`);
    s.setTrip({ dest: p }); nav("/ruta");
  };
  const lists = { favoritos: s.favorites, quiero: s.wishlist };

  return (
    <section className="screen">
      <StatusBar />
      <div className="scroll" style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 20 }}>
        <div className="pad" style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 4 }}>
          <h1 className="h-title" style={{ fontSize: 26 }}>Explorar</h1>
          <button className="field" onClick={() => nav("/buscar")} style={{ textAlign: "left", width: "100%" }}><Icon name="search" style={{ color: "var(--vl-green)" }} /><span className="muted" style={{ flex: 1 }}>Buscar lugares{s.pos.source === "gps" ? " cerca de ti" : " en Armenia"}</span></button>
          <div className="chips">
            {Object.entries(CATS).map(([k, c]) => (
              <button key={k} className={`chip ${cat === k ? "on" : ""}`} onClick={() => setParams((p) => { p.set("cat", k); return p; }, { replace: true })}><Icon name={c.icon} />{c.label}</button>
            ))}
          </div>
        </div>

        <div className="pad">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <p className="h-sec">Mis lugares</p>
            <button style={{ color: "var(--vl-green-2)", fontWeight: 700, fontSize: 14 }} onClick={() => { setEdit(!edit); setOpen(edit ? open : "favoritos"); }}>{edit ? "Listo" : "Editar"}</button>
          </div>
          <div className="favs">
            {[["home", "Casa"], ["work", "Trabajo"]].map(([k, label]) => (
              <button key={k} onClick={() => (edit ? nav(`/buscar?set=${k}`) : goRoute(k))}>
                <Icon name={k === "home" ? "home" : "work"} fill />{label}
                <span className="muted num" style={{ fontWeight: 400, fontSize: 12 }}>{s.places[k] ? (edit ? "Cambiar" : estMinutes(s.pos, s.places[k])) : "Agregar"}</span>
              </button>
            ))}
            <button onClick={() => nav("/buscar?fav=1")}><Icon name="add" style={{ background: "#EEF1EF", color: "var(--muted)" }} />Agregar<span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>lugar</span></button>
          </div>
          <div className="group" style={{ marginTop: 10 }}>
            {[["favoritos", "Favoritos", "favorite", "var(--t-bad)"], ["quiero", "Quiero ir", "flag", "var(--vl-route)"]].map(([k, label, icon, color]) => (
              <div key={k}>
                <button className="row" onClick={() => setOpen(open === k ? null : k)} aria-expanded={open === k}>
                  <span className="ic"><Icon name={icon} fill style={{ color }} /></span>
                  <span style={{ minWidth: 0 }}><span className="t">{label}</span><span className="s ellipsis" style={{ display: "block" }}>{lists[k].length ? `${lists[k].length} ${lists[k].length === 1 ? "lugar" : "lugares"} · ${lists[k].slice(0, 2).map((x) => x.name).join(", ")}` : "Sin lugares todavía"}</span></span>
                  <Icon name={open === k ? "expand_less" : "chevron_right"} className="muted" />
                </button>
                {open === k && (lists[k].length === 0
                  ? <p className="muted" style={{ margin: 0, padding: "0 16px 14px 68px", fontSize: 14 }}>{k === "favoritos" ? "Guarda lugares desde su detalle con «Guardar»." : "Agrega lugares desde su detalle."}</p>
                  : lists[k].map((p) => (
                    <div key={p.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", paddingRight: 8 }}>
                      <button className="row" style={{ gridTemplateColumns: "1fr auto", paddingLeft: 68, minHeight: 52 }} onClick={() => goPlace(p)}><span style={{ minWidth: 0 }}><span className="t ellipsis">{p.name}</span><span className="s ellipsis" style={{ display: "block" }}>{p.address}</span></span><span className="s num">{fmtDist(distance(s.pos, p))}</span></button>
                      {edit && <button className="iconbtn" aria-label={`Quitar ${p.name}`} onClick={() => (k === "favoritos" ? s.toggleFavorite(p) : s.toggleWish(p))}><Icon name="delete" style={{ color: "var(--t-bad)" }} /></button>}
                    </div>
                  )))}
              </div>
            ))}
          </div>
        </div>

        <div className="pad">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <p className="h-sec">{params.get("lat") ? `${C.label} cerca del destino` : C.title}</p>{!items && !error && <Spinner />}
          </div>
          {error && <p className="err">{error}</p>}
          {items && items.length === 0 && <div className="group"><Empty icon={C.icon}>No encontramos {C.label.toLowerCase()} en esta zona.</Empty></div>}
          {items && items.length > 0 && (
            <div className="group">
              {items.map((p) => (
                <button key={p.id} className="fuel" onClick={() => goPlace(p)}>
                  <span className="ic" style={{ background: C.bg, color: C.fg }}><Icon name={C.icon} fill /></span>
                  <span style={{ minWidth: 0 }}><b className="ellipsis" style={{ display: "block" }}>{p.name}</b><div className="muted ellipsis" style={{ fontSize: 13 }}>{p.address}</div></span>
                  <span className="num" style={{ fontFamily: "var(--f-display)", fontWeight: 800, color: p === items[0] ? "var(--t-ok)" : undefined }}>{fmtDist(p.dist)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </section>
  );
}
