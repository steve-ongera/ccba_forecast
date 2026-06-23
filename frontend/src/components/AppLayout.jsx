import React, { useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import Spinner from "./Spinner";
import { useAuth } from "../context/AuthContext";

export default function AppLayout() {
  const { isAuthenticated, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (loading) {
    return (
      <div className="app-loading">
        <Spinner size="lg" label="Loading CCBA Demand Forecast..." />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className={`app-shell ${collapsed ? "app-shell--collapsed" : ""}`}>
      <Sidebar collapsed={collapsed} onClose={() => setCollapsed(true)} />
      <div className="app-shell__main">
        <Navbar onToggleSidebar={() => setCollapsed((v) => !v)} />
        <main className="app-shell__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}