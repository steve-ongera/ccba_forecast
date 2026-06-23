import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Maps route paths to human-readable labels
const ROUTE_LABELS = {
  "/":                "Dashboard",
  "/forecasts":       "Forecasts",
  "/recommendations": "Recommendations",
  "/sales":           "Sales",
  "/products":        "Products",
  "/regions":         "Regions",
  "/weather":         "Weather",
  "/reports":         "Reports",
};

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dropdownRef = useRef(null);

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : "??";

  const currentLabel = ROUTE_LABELS[location.pathname] ?? "Page";

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate("/login");
  };

  return (
    <header className="navbar" role="banner">
      {/* Skip nav for accessibility */}
      <a href="#main-content" className="skip-nav">Skip to content</a>

      {/* Sidebar toggle */}
      <button
        className="navbar__burger"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
        aria-expanded={undefined}
      >
        <i className="bi bi-list" aria-hidden="true" />
      </button>

      {/* Breadcrumb */}
      <nav className="navbar__breadcrumb" aria-label="Breadcrumb">
        <span>CCBA</span>
        <span className="navbar__breadcrumb-sep">
          <i className="bi bi-chevron-right" />
        </span>
        <span>{currentLabel}</span>
      </nav>

      {/* Search */}
      <div className="navbar__search" role="search">
        <i className="bi bi-search" aria-hidden="true" />
        <input
          type="search"
          placeholder="Search product, region, SKU…"
          aria-label="Search"
        />
        <span className="navbar__search-shortcut" aria-hidden="true">⌘K</span>
      </div>

      {/* Actions */}
      <div className="navbar__actions">
        <button
          className="navbar__icon-btn navbar__icon-btn--notify"
          aria-label="Notifications (3 unread)"
          title="Notifications"
        >
          <i className="bi bi-bell-fill" aria-hidden="true" />
        </button>

        <button
          className="navbar__icon-btn"
          aria-label="Settings"
          title="Settings"
        >
          <i className="bi bi-gear-fill" aria-hidden="true" />
        </button>

        <div className="navbar__actions-divider" aria-hidden="true" />

        {/* User menu */}
        <div
          className={`navbar__user${menuOpen ? " is-open" : ""}`}
          onClick={() => setMenuOpen((v) => !v)}
          role="button"
          aria-label="User menu"
          aria-haspopup="true"
          aria-expanded={menuOpen}
          ref={dropdownRef}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setMenuOpen((v) => !v);
            if (e.key === "Escape") setMenuOpen(false);
          }}
        >
          <span className="navbar__avatar" aria-hidden="true">{initials}</span>
          <div className="navbar__user-info">
            <span className="navbar__username">{user?.username}</span>
            <span className="navbar__user-role">{user?.role || "guest"}</span>
          </div>
          <i className="bi bi-chevron-down navbar__chevron" aria-hidden="true" />

          {menuOpen && (
            <div className="navbar__dropdown" role="menu" aria-label="User options">
              <div className="navbar__dropdown-header">
                <div className="navbar__dropdown-name">{user?.username}</div>
                <div className="navbar__dropdown-email">
                  {user?.email ?? `${user?.username?.toLowerCase()}@ccba.co.ke`}
                </div>
              </div>

              <button
                className="navbar__dropdown-item"
                role="menuitem"
                onClick={() => { setMenuOpen(false); navigate("/profile"); }}
              >
                <i className="bi bi-person-circle" aria-hidden="true" />
                My Profile
              </button>

              <button
                className="navbar__dropdown-item"
                role="menuitem"
                onClick={() => { setMenuOpen(false); navigate("/settings"); }}
              >
                <i className="bi bi-gear" aria-hidden="true" />
                Settings
              </button>

              <div className="navbar__dropdown-divider" role="separator" />

              <button
                className="navbar__dropdown-item navbar__dropdown-item--danger"
                role="menuitem"
                onClick={handleLogout}
              >
                <i className="bi bi-box-arrow-right" aria-hidden="true" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}