import { Fragment, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { INCIDENT_TYPES } from "../lib/domain";
import { toLL } from "../lib/geo";

// Mapa base en tonos suaves para que la ruta y las alertas sean la figura (figura–fondo)
const OSM = { url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' };
const TILES = {
  light: { ...OSM, className: "tiles-soft" },
  dark: { ...OSM, className: "tiles-dark" },
  sat: { url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attr: "Imágenes &copy; Esri", className: "" },
};

const icon = (html, size, anchor) => L.divIcon({ className: "vl-pin", html, iconSize: size, iconAnchor: anchor || [size[0] / 2, size[1] / 2] });

export const incidentIcon = (type, big) => {
  const t = INCIDENT_TYPES[type];
  return icon(`<div class="vl-inc ${big ? "big" : ""}" style="background:${t.color};color:${t.ink || "#fff"}"><span class="ms">${t.icon}</span></div>`, big ? [36, 36] : [28, 28]);
};
const meIcon = (heading) =>
  heading == null
    ? icon('<div class="vl-me"><i></i></div>', [44, 44])
    : icon(`<div class="vl-me"><svg width="30" height="30" viewBox="-15 -15 30 30" style="transform:rotate(${heading}deg)"><path d="M0 -13 L10 11 L0 5 L-10 11Z" fill="#1D64D8" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/></svg></div>`, [44, 44]);
const destIcon = icon('<svg width="32" height="40" viewBox="-16 -38 32 40"><path d="M0 0 c-9 -12 -14 -18 -14 -26 a14 14 0 0 1 28 0 c0 8 -5 14 -14 26z" fill="#D63B2F" stroke="#fff" stroke-width="2"/><circle cx="0" cy="-24" r="5" fill="#fff"/></svg>', [32, 40], [16, 40]);
const etaIcon = (text, primary) => L.divIcon({ className: "vl-pin", html: `<span class="vl-eta ${primary ? "a" : "b"}">${text}</span>`, iconSize: [0, 0] });

function Fit({ bounds, center, zoom, follow, fitPad }) {
  const map = useMap();
  const key = bounds ? JSON.stringify(bounds) : null;
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, fitPad ? { paddingTopLeft: fitPad[0], paddingBottomRight: fitPad[1], maxZoom: 17 } : { padding: [40, 40], maxZoom: 17 });
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!bounds && center) map.setView([center.lat, center.lon], zoom ?? map.getZoom(), { animate: true });
  }, [follow ? center?.lat : null, follow ? center?.lon : null, zoom]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function Recenter({ signal, center, zoom }) {
  const map = useMap();
  useEffect(() => { if (signal) map.setView([center.lat, center.lon], zoom || 16, { animate: true }); }, [signal]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/**
 * routes: [{coords, primary, eta}]  incidents: [{...}]  me: {lat,lon,heading}  dest: {lat,lon}
 */
export default function MapView({
  center, zoom = 15, me, dest, routes = [], incidents = [], onIncident, bounds, follow, tiles = "light",
  recenter, big, style, interactive = true, padBottom = 0, fitPad,
}) {
  const t = TILES[tiles] || TILES.light;
  const lines = useMemo(() => routes.map((r) => r.coords.map(toLL).map((p) => [p.lat, p.lon])), [routes]);
  return (
    <div className="mapbox" style={style}>
      <MapContainer
        center={[center.lat, center.lon]} zoom={zoom} zoomControl={false} attributionControl
        dragging={interactive} scrollWheelZoom={interactive} doubleClickZoom={interactive} touchZoom={interactive}
        style={{ paddingBottom: padBottom }}
      >
        <TileLayer key={tiles} url={t.url} attribution={t.attr} maxZoom={19} className={t.className} />
        <Fit bounds={bounds} center={center} zoom={follow ? zoom : undefined} follow={follow} fitPad={fitPad} />
        {recenter !== undefined && <Recenter signal={recenter} center={center} zoom={zoom} />}
        {lines.map((l, i) => !routes[i].primary && (
          <Fragment key={"alt" + i}>
            <Polyline positions={l} pathOptions={{ color: "#fff", weight: 11, opacity: 1, lineCap: "round", lineJoin: "round" }} />
            <Polyline positions={l} pathOptions={{ color: "#8FA9D6", weight: 7, opacity: 1, lineCap: "round", lineJoin: "round" }} eventHandlers={routes[i].onClick ? { click: routes[i].onClick } : undefined} />
          </Fragment>
        ))}
        {lines.map((l, i) => routes[i].primary && (
          <Fragment key={"pri" + i}>
            <Polyline positions={l} pathOptions={{ color: "#fff", weight: 12, opacity: 1, lineCap: "round", lineJoin: "round" }} />
            <Polyline positions={l} pathOptions={{ color: "#1D64D8", weight: 8, opacity: 1, lineCap: "round", lineJoin: "round", dashArray: routes[i].dashed ? "2 12" : null }} />
          </Fragment>
        ))}
        {routes.map((r, i) => r.eta && r.coords.length > 2 && (
          <Marker key={"eta" + i} position={(([lon, lat]) => [lat, lon])(r.coords[Math.floor(r.coords.length * (r.primary ? 0.55 : 0.4))])} icon={etaIcon(r.eta, r.primary)} interactive={!!r.onClick} eventHandlers={r.onClick ? { click: r.onClick } : undefined} />
        ))}
        {incidents.map((inc) => (
          <Marker key={inc.id} position={[inc.lat, inc.lon]} icon={incidentIcon(inc.type, big)} eventHandlers={onIncident ? { click: () => onIncident(inc) } : undefined} />
        ))}
        {dest && <Marker position={[dest.lat, dest.lon]} icon={destIcon} interactive={false} />}
        {me && <Marker position={[me.lat, me.lon]} icon={meIcon(me.heading)} interactive={false} zIndexOffset={1000} />}
      </MapContainer>
    </div>
  );
}
