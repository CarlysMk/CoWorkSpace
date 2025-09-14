import React from "react";
import { NavLink, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import PrivateRoute from "./PrivateRoute";
import { RequireAdmin, RequireManager } from "./guards";

import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Booking from "./pages/Booking.jsx";
import ManagerDashboard from "./pages/ManagerDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import AdminWizard from "./pages/AdminWizard.jsx";
import Catalog from "./pages/Catalog.jsx";
import Profile from "./pages/Profile.jsx";
import ManagerOverview from "./pages/ManagerOverview.jsx";

import NotificationsButton from "./components/NotificationsButton"; // <-- AGGIUNTA

function NavBar() {
  const { user, logout } = useAuth();
  return (
    <nav className="nav">
      <strong style={{ fontSize: 20 }}>
        <i className="fa-solid fa-building-user"></i> CoWorkSpace
      </strong>
      <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
        <i className="fa-solid fa-house"></i> Home
      </NavLink>
      <NavLink to="/catalog" className={({ isActive }) => (isActive ? "active" : "")}>
        Catalogo
      </NavLink>
      <NavLink to="/booking" className={({ isActive }) => (isActive ? "active" : "")}>
        <i className="fa-solid fa-calendar-check"></i> Prenota
      </NavLink>
      {user && (user.role==="manager" || user.role==="admin") ? (
        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "active" : "")}>
          <i className="fa-solid fa-chart-line"></i> Dashboard
        </NavLink>
      ) : null}
      {user && user.role==="admin" ? <NavLink to="/admin">Admin</NavLink> : null}
      <span className="spacer" />
      {user?.email ? (
        <>
          <NavLink
            to="/profile"
            className={({ isActive }) => (isActive ? "active" : "")}
            style={{ marginRight: 8 }}
          >
            {user.email}
          </NavLink>
          <button className="btn" onClick={logout}>Logout</button>
        </>
      ) : (
        <>
          <NavLink to="/login" className={({ isActive }) => (isActive ? "active" : "")}>
            <i className="fa-solid fa-right-to-bracket"></i> Login
          </NavLink>
          <NavLink to="/register" className={({ isActive }) => (isActive ? "active" : "")}>
            <i className="fa-solid fa-user-plus"></i> Register
          </NavLink>
        </>
      )}
    </nav>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavBar />
      <div className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/profile" element={<Profile />} />
          <Route element={<PrivateRoute />}>
            {/* rotte protette */}
            <Route path="/booking" element={<Booking />} />
            <Route element={<RequireManager />}>
              <Route path="/dashboard" element={<ManagerOverview />} />
            </Route>
          </Route>
          <Route path="/login" element={<Login />} />
          <Route element={<RequireAdmin />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/wizard" element={<AdminWizard />} />
          </Route>
          <Route path="/register" element={<Register />} />
        </Routes>
      </div>

      <NotificationsButton /> {/* <-- AGGIUNTA (fuori da <Routes/>) */}
    </AuthProvider>
  );
}
