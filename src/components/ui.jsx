import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fmtClock } from "../lib/geo";
import { useStore } from "../lib/store";

export const Icon = ({ name, fill, className = "", style }) => (
  <span className={`ms ${fill ? "fill" : ""} ${className}`} style={style} aria-hidden="true">{name}</span>
);

// Barra de estado del marco de teléfono (en un celular real solo deja el espacio)
export function StatusBar({ over, style }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 20000); return () => clearInterval(t); }, []);
  return (
    <div className={`status ${over ? "over" : ""}`} style={style}>
      <span className="num">{fmtClock(now, false)}</span>
      <span><Icon name="signal_cellular_alt" /> <Icon name="wifi" /> <Icon name="battery_5_bar" /></span>
    </div>
  );
}

const NAV = [["/", "navigation", "Navegar"], ["/explorar", "explore", "Explorar"], ["/trafico", "traffic", "Tráfico"], ["/cuenta", "person", "Mi cuenta"]];
export function BottomNav() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  return (
    <nav className="nav" aria-label="Navegación principal">
      {NAV.map(([to, icon, label]) => (
        <button key={to} className={pathname === to ? "on" : ""} onClick={() => nav(to)} aria-current={pathname === to ? "page" : undefined}>
          <span className="pill"><Icon name={icon} /></span>{label}
        </button>
      ))}
    </nav>
  );
}

export function Switch({ on }) {
  return <span className={`switch ${on ? "on" : ""}`} />;
}

export function Toast() {
  const { toastMsg } = useStore();
  if (!toastMsg) return null;
  return (
    <div className="toast" role="status"><Icon name="check_circle" fill style={{ color: "#7FD39C" }} /><span>{toastMsg}</span></div>
  );
}

export function Ring({ value, label, color = "var(--vl-route)" }) {
  const c = 2 * Math.PI * 26;
  return (
    <svg className="ring" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="26" fill="none" stroke="#E3E9E5" strokeWidth="7" />
      <circle cx="32" cy="32" r="26" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0.02, Math.min(1, value)))} transform="rotate(-90 32 32)" />
      <text x="32" y="37" textAnchor="middle" fontFamily="Manrope" fontWeight="800" fontSize={label.length > 3 ? 14 : 15} fill="#16211B">{label}</text>
    </svg>
  );
}

export const Spinner = () => <span className="spin" aria-label="Cargando" />;

export function Empty({ icon, children }) {
  return <div className="empty"><Icon name={icon} />{children}</div>;
}
