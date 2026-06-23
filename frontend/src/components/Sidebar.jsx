import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: "bi-grid-1x2-fill" },
  { to: "/forecasts", label: "Forecasts", icon: "bi-graph-up-arrow" },
  { to: "/recommendations", label: "Recommendations", icon: "bi-lightbulb-fill" },
  { to: "/sales", label: "Sales", icon: "bi-receipt" },
  { to: "/products", label: "Products", icon: "bi-box-seam-fill" },
  { to: "/regions", label: "Regions", icon: "bi-geo-alt-fill" },
  { to: "/weather", label: "Weather", icon: "bi-cloud-rain-fill" },
  { to: "/reports", label: "Reports", icon: "bi-file-earmark-bar-graph-fill" },
];

export default function Sidebar({ collapsed, onClose }) {
  const { role } = useAuth();

  return (
    <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
      <div className="sidebar__brand">
        <span className="sidebar__brand-mark">CCBA</span>
        <span className="sidebar__brand-sub">Demand Forecast</span>
      </div>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => `sidebar__link ${isActive ? "sidebar__link--active" : ""}`}
            onClick={onClose}
          >
            <i className={`bi ${item.icon}`} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        <span className="sidebar__role-pill">{role || "guest"}</span>
      </div>
    </aside>
  );
}