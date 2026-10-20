import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ARMENIA } from "./geo";
import { seedIncidents } from "./domain";

const KEY = "vialibre:v1";
const Ctx = createContext(null);

const initial = () => ({
  user: null,
  places: { home: null, work: null },
  favorites: [],
  wishlist: [],
  recents: [],
  incidents: seedIncidents(ARMENIA),
  trips: [],
  reports: 0,
  settings: { voice: true, nightMap: true },
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...initial(), ...JSON.parse(raw) };
  } catch {}
  return initial();
}

export function StoreProvider({ children }) {
  const [data, setData] = useState(load);
  const [pos, setPos] = useState({ ...ARMENIA, source: "default" });
  const [trip, setTrip] = useState(null); // destino, rutas calculadas y ruta elegida
  const [toastMsg, setToastMsg] = useState(null);
  const toastTimer = useRef();

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
  }, [data]);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (p) => setPos({ lat: p.coords.latitude, lon: p.coords.longitude, heading: p.coords.heading, speed: p.coords.speed, source: "gps" }),
      () => setPos((x) => ({ ...x, source: x.source === "gps" ? "gps" : "denied" })),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2400);
  }, []);

  const set = useCallback((fn) => setData((d) => ({ ...d, ...fn(d) })), []);

  const actions = useMemo(() => ({
    login: (user) => set(() => ({ user })),
    logout: () => set(() => ({ user: null })),
    updateUser: (patch) => set((d) => ({ user: { ...d.user, ...patch } })),
    setPlace: (kind, place) => set((d) => ({ places: { ...d.places, [kind]: place } })),
    toggleFavorite: (place) => {
      let added = false;
      set((d) => {
        const has = d.favorites.some((f) => f.id === place.id);
        added = !has;
        return { favorites: has ? d.favorites.filter((f) => f.id !== place.id) : [{ ...place, savedAt: Date.now() }, ...d.favorites] };
      });
      return added;
    },
    toggleWish: (place) => set((d) => {
      const has = d.wishlist.some((f) => f.id === place.id);
      return { wishlist: has ? d.wishlist.filter((f) => f.id !== place.id) : [place, ...d.wishlist] };
    }),
    addRecent: (place) => set((d) => ({ recents: [place, ...d.recents.filter((r) => r.id !== place.id)].slice(0, 8) })),
    clearRecents: () => set(() => ({ recents: [] })),
    report: (inc) => set((d) => ({
      incidents: [{ id: "r" + Date.now(), createdAt: Date.now(), confirms: 1, mine: true, ...inc }, ...d.incidents],
      reports: d.reports + 1,
    })),
    confirmIncident: (id) => set((d) => ({ incidents: d.incidents.map((i) => (i.id === id ? { ...i, confirms: i.confirms + 1, createdAt: Date.now() } : i)) })),
    dismissIncident: (id) => set((d) => ({ incidents: d.incidents.map((i) => (i.id === id ? { ...i, gone: true } : i)) })),
    addTrip: (t) => set((d) => ({ trips: [{ id: "t" + Date.now(), ...t }, ...d.trips].slice(0, 100) })),
    rateTrip: (id, rating) => set((d) => ({ trips: d.trips.map((t) => (t.id === id ? { ...t, rating } : t)) })),
    deleteTrip: (id) => set((d) => ({ trips: d.trips.filter((t) => t.id !== id) })),
    setSetting: (k, v) => set((d) => ({ settings: { ...d.settings, [k]: v } })),
    resetAll: () => setData(initial()),
  }), [set]);

  const value = { ...data, pos, trip, setTrip, toast, toastMsg, ...actions };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useStore = () => useContext(Ctx);
