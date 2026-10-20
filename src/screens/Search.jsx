import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStore } from "../lib/store";
import { searchPlaces } from "../lib/api";
import { distance, fmtDist } from "../lib/geo";
import { Empty, Icon, Spinner, StatusBar } from "../components/ui";

export function placeIcon(p) {
  const t = `${p.category} ${p.type}`;
  if (/fuel/.test(t)) return "local_gas_station";
  if (/parking/.test(t)) return "local_parking";
  if (/university|school|college/.test(t)) return "school";
  if (/hospital|clinic|doctors/.test(t)) return "local_hospital";
  if (/bus|station|transport/.test(t)) return "directions_bus";
  if (/restaurant|cafe|fast_food/.test(t)) return "restaurant";
  if (/mall|shop|supermarket/.test(t)) return "storefront";
  if (/park|garden/.test(t)) return "park";
  if (/highway|road|street/.test(t)) return "add_road";
  return "location_on";
}

function Highlight({ text, q }) {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return text;
  return <>{text.slice(0, i)}<b>{text.slice(i, i + q.length)}</b>{text.slice(i + q.length)}</>;
}

export default function Search() {
  const s = useStore();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const setKind = params.get("set"); // home | work
  const addFav = params.get("fav");
  const [q, setQ] = useState("");
  const [res, setRes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const input = useRef();

  useEffect(() => { input.current?.focus(); if (params.get("voz")) dictate(); }, []); // eslint-disable-line

  useEffect(() => {
    if (q.trim().length < 3) { setRes([]); setError(""); return; }
    const ctl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true); setError("");
      try { setRes(await searchPlaces(q.trim(), s.pos, { signal: ctl.signal })); }
      catch (e) { if (e.name !== "AbortError") setError("No pudimos buscar en este momento. Revisa tu conexión e inténtalo de nuevo."); }
      finally { setLoading(false); }
    }, 450);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [q]); // eslint-disable-line

  function dictate() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return s.toast("Tu navegador no permite dictar; escribe el destino");
    const r = new SR();
    r.lang = "es-CO"; r.interimResults = false;
    r.onresult = (e) => setQ(e.results[0][0].transcript);
    r.onend = () => setListening(false);
    r.onerror = () => { setListening(false); s.toast("No te escuchamos; inténtalo de nuevo"); };
    setListening(true); r.start();
  }

  const choose = (p) => {
    if (setKind) {
      s.setPlace(setKind, p);
      s.toast(`${setKind === "home" ? "Casa" : "Trabajo"} guardado: ${p.name}`);
      return nav(-1);
    }
    if (addFav) {
      if (!s.favorites.some((f) => f.id === p.id)) s.toggleFavorite(p);
      s.toast(`${p.name} agregado a Favoritos`);
      return nav(-1);
    }
    s.addRecent(p);
    nav("/lugar", { state: { place: p } });
  };

  const quick = (kind) => {
    const p = s.places[kind];
    if (!p) return nav(`/buscar?set=${kind}`, { replace: true });
    s.setTrip({ dest: p }); nav("/ruta");
  };

  const title = setKind ? `Buscar dirección de ${setKind === "home" ? "tu casa" : "tu trabajo"}` : addFav ? "Buscar lugar para Favoritos" : "Buscar destino";

  return (
    <section className="screen">
      <StatusBar />
      <div className="appbar">
        <button className="iconbtn" onClick={() => nav(-1)} aria-label="Volver"><Icon name="arrow_back" /></button>
        <div className="field" style={{ flex: 1, height: 48, borderColor: "var(--vl-green-2)" }}>
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder={listening ? "Escuchando…" : "¿A dónde vas?"} aria-label={title} enterKeyHint="search" />
          {q ? <button onClick={() => setQ("")} aria-label="Borrar"><Icon name="close" className="muted" /></button>
            : <button onClick={dictate} aria-label="Dictar por voz"><Icon name="mic" className="muted" style={listening ? { color: "var(--t-bad)" } : null} /></button>}
        </div>
      </div>
      <div className="scroll">
        {!setKind && !addFav && (
          <div className="pad" style={{ paddingTop: 4, paddingBottom: 12 }}><div className="chips">
            <button className="chip" onClick={() => quick("home")}><Icon name="home" style={{ color: "var(--vl-green)" }} />Casa</button>
            <button className="chip" onClick={() => quick("work")}><Icon name="work" style={{ color: "var(--vl-green)" }} />Trabajo</button>
            <button className="chip" onClick={() => nav("/explorar")}><Icon name="star" style={{ color: "var(--vl-green)" }} />Favoritos</button>
          </div></div>
        )}
        {(setKind || addFav) && <p className="pad muted" style={{ margin: "4px 0 12px", fontSize: 14 }}>{title}</p>}

        {q.trim().length >= 3 && (
          <>
            <p className="h-sec pad" style={{ margin: "8px 0 4px", display: "flex", gap: 8, alignItems: "center" }}>Resultados {loading && <Spinner />}</p>
            {error && <p className="pad err">{error}</p>}
            {!loading && !error && res.length === 0 && <Empty icon="search_off">No encontramos lugares con «{q}». Prueba con otra dirección o nombre.</Empty>}
            <div className="list">
              {res.map((p) => (
                <button className="row" key={p.id} onClick={() => choose(p)}>
                  <span className="ic" style={{ background: "var(--vl-green-soft)", color: "var(--vl-green)" }}><Icon name={placeIcon(p)} /></span>
                  <span style={{ minWidth: 0 }}><span className="t"><Highlight text={p.name} q={q.trim()} /></span><span className="s ellipsis" style={{ display: "block" }}>{p.address}</span></span>
                  <span className="s num">{fmtDist(distance(s.pos, p))}</span>
                </button>
              ))}
            </div>
            <div className="divider" style={{ marginTop: 8 }} />
          </>
        )}

        <p className="h-sec pad" style={{ margin: "16px 0 4px", display: "flex", justifyContent: "space-between" }}>Recientes {s.recents.length > 0 && <button style={{ color: "var(--vl-green-2)", fontWeight: 700, letterSpacing: 0, textTransform: "none", fontSize: 13 }} onClick={s.clearRecents}>Borrar</button>}</p>
        {s.recents.length === 0 && <Empty icon="history">Aquí aparecerán los lugares que busques.</Empty>}
        <div className="list">
          {s.recents.map((p) => (
            <button className="row" key={p.id} onClick={() => choose(p)}>
              <span className="ic"><Icon name="history" /></span>
              <span style={{ minWidth: 0 }}><span className="t">{p.name}</span><span className="s ellipsis" style={{ display: "block" }}>{p.address}</span></span>
              <span className="s num">{fmtDist(distance(s.pos, p))}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
