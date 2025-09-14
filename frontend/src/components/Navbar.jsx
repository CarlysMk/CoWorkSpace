import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth";
import { Building2, LogIn, LogOut, UserPlus, CalendarCheck2, LayoutGrid } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <div className="nav">
      <Link to="/" className="brand" style={{display:"inline-flex", alignItems:"center", gap:8}}>
        <Building2 size={20} /> <span>CoWorkSpace</span>
      </Link>
      <Link to="/catalog" style={{display:"inline-flex", alignItems:"center", gap:6}}><LayoutGrid size={18}/> Catalogo</Link>
      {user && <Link to="/booking" style={{display:"inline-flex", alignItems:"center", gap:6}}><CalendarCheck2 size={18}/> Prenota</Link>}
      <div className="spacer" />
      {user ? (
        <>
          <Link to="/profile">Profilo</Link>
          <button className="btn small" onClick={logout} style={{display:"inline-flex", alignItems:"center", gap:6}}>
            <LogOut size={16}/> Logout
          </button>
        </>
      ) : (
        <>
          <Link to="/login" style={{display:"inline-flex", alignItems:"center", gap:6}}>
            <LogIn size={16}/> Accedi
          </Link>
          <Link to="/register" className="btn small primary" style={{display:"inline-flex", alignItems:"center", gap:6}}>
            <UserPlus size={16}/> Registrati
          </Link>
        </>
      )}
    </div>
  );
}