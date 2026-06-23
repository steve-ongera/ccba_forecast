import React, { useState, useEffect } from "react";
import { Outlet, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import Spinner from "./Spinner";
import { useAuth } from "../context/AuthContext";

export default function AppLayout() {
  const { isAuthenticated, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile breakpoint
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const onChange = (e) => {
      setIsMobile(e.matches);
      if (!e.matches) setMobileOpen(false);
    };
    setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobile && mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isMobile, mobileOpen]);

  if (loading) {
    return (
      <div className="app-loading">
        <Spinner size="lg" label="Loading CCBA Demand Forecast…" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const handleToggleSidebar = () => {
    if (isMobile) {
      setMobileOpen((v) => !v);
    } else {
      setCollapsed((v) => !v);
    }
  };

  const handleCloseOnMobile = () => {
    if (isMobile) setMobileOpen(false);
  };

  return (
    <div className={`app-shell${!isMobile && collapsed ? " app-shell--collapsed" : ""}`}>
      {/* Mobile overlay */}
      {isMobile && (
        <div
          className={`app-shell__overlay${mobileOpen ? "" : " is-hidden"}`}
          onClick={handleCloseOnMobile}
          aria-hidden="true"
        />
      )}

      <Sidebar
        collapsed={!isMobile && collapsed}
        isMobileOpen={isMobile && mobileOpen}
        onClose={handleCloseOnMobile}
        // Pass extra class on mobile
        className={isMobile ? (mobileOpen ? "is-open" : "") : ""}
      />

      <div className="app-shell__main">
        <Navbar onToggleSidebar={handleToggleSidebar} />
        <main className="app-shell__content" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}