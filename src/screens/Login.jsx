import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { Icon, StatusBar } from "../components/ui";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Login() {
  const { user, login, toast } = useStore();
  const nav = useNavigate();
  const loc = useLocation();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});

  if (user) return <Navigate to="/" replace />;

  const submit = (e) => {
    e.preventDefault();
    const er = {};
    if (mode === "register" && name.trim().length < 3) er.name = "Escribe tu nombre (mínimo 3 letras).";
    if (!EMAIL.test(email.trim())) er.email = "Escribe un correo válido, por ejemplo nombre@correo.com.";
    if (pass.length < 6) er.pass = "La contraseña debe tener al menos 6 caracteres.";
    setErrors(er);
    if (Object.keys(er).length) return;
    const fallback = email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    login({ name: mode === "register" ? name.trim() : fallback, email: email.trim().toLowerCase(), since: Date.now() });
    toast(mode === "register" ? "Cuenta creada. ¡Bienvenido!" : "Sesión iniciada");
    nav(loc.state?.from || "/", { replace: true });
  };

  return (
    <section className="screen">
      <StatusBar />
      <div className="scroll pad" style={{ display: "flex", flexDirection: "column", gap: 24, paddingTop: 28 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16 }}>
          <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="18" fill="#1E5B3C" /><path d="M20 50 L30 14 L34 14 L44 50" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /><path d="M32 22 v6 M32 34 v6" stroke="#F2A400" strokeWidth="3.5" strokeLinecap="round" /></svg>
          <div>
            <h1 className="h-title" style={{ fontSize: 30 }}>{mode === "login" ? "Bienvenido a VíaLibre" : "Crea tu cuenta"}</h1>
            <p className="muted" style={{ margin: "6px 0 0", lineHeight: 1.45 }}>Llega a tu destino evitando trancones, con el tráfico y las alertas de la vía en tiempo real.</p>
          </div>
        </div>
        <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {mode === "register" && (
            <div><label className="lbl" htmlFor="lg-name">Nombre</label>
              <div className="field"><Icon name="person" className="muted" /><input id="lg-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Tu nombre" /></div>
              {errors.name && <div className="err">{errors.name}</div>}</div>
          )}
          <div><label className="lbl" htmlFor="lg-mail">Correo electrónico</label>
            <div className="field"><Icon name="mail" className="muted" /><input id="lg-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="nombre@correo.com" /></div>
            {errors.email && <div className="err">{errors.email}</div>}</div>
          <div><label className="lbl" htmlFor="lg-pass">Contraseña</label>
            <div className="field"><Icon name="lock" className="muted" /><input id="lg-pass" type={show ? "text" : "password"} value={pass} onChange={(e) => setPass(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="Mínimo 6 caracteres" />
              <button type="button" className="iconbtn" style={{ width: 36, height: 36 }} onClick={() => setShow(!show)} aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}><Icon name={show ? "visibility_off" : "visibility"} className="muted" /></button></div>
            {errors.pass && <div className="err">{errors.pass}</div>}
            {mode === "login" && <div style={{ textAlign: "right", marginTop: 8 }}><button type="button" style={{ color: "var(--vl-green-2)", fontWeight: 700, fontSize: 14 }} onClick={() => toast("Te enviaremos un enlace cuando la recuperación esté disponible")}>¿Olvidaste tu contraseña?</button></div>}
          </div>
          <button className="btn primary" type="submit">{mode === "login" ? "Ingresar" : "Crear cuenta"}</button>
        </form>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--muted)", fontSize: 13 }}><span style={{ flex: 1, height: 1, background: "var(--line)" }} />o continúa con<span style={{ flex: 1, height: 1, background: "var(--line)" }} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <button className="btn ghost small" onClick={() => toast("El ingreso con Google estará disponible pronto; usa tu correo")}><b style={{ fontFamily: "var(--f-display)", color: "#4285F4" }}>G</b> Google</button>
          <button className="btn ghost small" onClick={() => toast("El ingreso con Apple estará disponible pronto; usa tu correo")}><Icon name="phone_iphone" style={{ fontSize: 20 }} /> Apple</button>
        </div>
        <p style={{ textAlign: "center", margin: "0 0 24px", fontSize: 14 }}>
          {mode === "login" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
          <button style={{ color: "var(--vl-green-2)", fontWeight: 700 }} onClick={() => { setMode(mode === "login" ? "register" : "login"); setErrors({}); }}>{mode === "login" ? "Regístrate" : "Ingresa"}</button>
        </p>
      </div>
    </section>
  );
}
