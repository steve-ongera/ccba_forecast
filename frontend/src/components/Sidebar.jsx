import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/",               label: "Dashboard",       icon: "bi-grid-1x2-fill" },
  { to: "/forecasts",      label: "Forecasts",       icon: "bi-graph-up-arrow" },
  { to: "/recommendations",label: "Recommendations", icon: "bi-lightbulb-fill", badge: 3 },
  { to: "/sales",          label: "Sales",           icon: "bi-receipt" },
  { to: "/products",       label: "Products",        icon: "bi-box-seam-fill" },
  { to: "/regions",        label: "Regions",         icon: "bi-geo-alt-fill" },
  { to: "/weather",        label: "Weather",         icon: "bi-cloud-rain-fill" },
  { to: "/reports",        label: "Reports",         icon: "bi-file-earmark-bar-graph-fill" },
];

export default function Sidebar({ collapsed, onClose }) {
  const { role } = useAuth();

  return (
    <aside className={`sidebar${collapsed ? " sidebar--collapsed" : ""}`}>
      {/* ---- Brand ---- */}
      <div className="sidebar__brand">
        <div className="sidebar__brand-icon">CC</div>
        <div className="sidebar__brand-text">
          <span className="sidebar__brand-mark">CCBA</span>
          <span className="sidebar__brand-sub">Demand Forecast</span>
        </div>
      </div>

      {/* ---- Navigation ---- */}
      <nav className="sidebar__nav" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `sidebar__link${isActive ? " sidebar__link--active" : ""}`
            }
            onClick={onClose}
            aria-label={item.label}
          >
            <i className={`bi ${item.icon}`} aria-hidden="true" />
            <span>{item.label}</span>
            {item.badge ? (
              <span className="sidebar__badge" aria-label={`${item.badge} notifications`}>
                {item.badge}
              </span>
            ) : null}
            {/* Tooltip shown only when collapsed */}
            <span className="sidebar__link-tooltip" aria-hidden="true">
              {item.label}
            </span>
          </NavLink>
        ))}
      </nav>

      {/* ---- Footer ---- */}
      <div className="sidebar__footer">
        <div className="sidebar__footer-icon" aria-hidden="true">
          <i className="bi bi-person-fill" />
        </div>
        <div className="sidebar__footer-text">
          <span className="sidebar__role-pill">{role || "guest"}</span>
        </div>
      </div>
    </aside>
  );
}