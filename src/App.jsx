import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useStore } from "./lib/store";
import { Toast } from "./components/ui";
import Login from "./screens/Login";
import Home from "./screens/Home";
import Search from "./screens/Search";
import Place from "./screens/Place";
import Plan from "./screens/Plan";
import Navigation from "./screens/Navigation";
import Report from "./screens/Report";
import Arrive from "./screens/Arrive";
import Explore from "./screens/Explore";
import Traffic from "./screens/Traffic";
import Account from "./screens/Account";
import History from "./screens/History";

function Private({ children }) {
  const { user } = useStore();
  const loc = useLocation();
  return user ? children : <Navigate to="/login" replace state={{ from: loc.pathname }} />;
}

export default function App() {
  const p = (el) => <Private>{el}</Private>;
  return (
    <div className="shell">
      <div className="phone">
        <div className="notch" />
        <div className="screenwrap">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={p(<Home />)} />
            <Route path="/buscar" element={p(<Search />)} />
            <Route path="/lugar" element={p(<Place />)} />
            <Route path="/ruta" element={p(<Plan />)} />
            <Route path="/navegacion" element={p(<Navigation />)} />
            <Route path="/reportar" element={p(<Report />)} />
            <Route path="/llegada" element={p(<Arrive />)} />
            <Route path="/explorar" element={p(<Explore />)} />
            <Route path="/trafico" element={p(<Traffic />)} />
            <Route path="/cuenta" element={p(<Account />)} />
            <Route path="/historial" element={p(<History />)} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toast />
        </div>
      </div>
    </div>
  );
}
