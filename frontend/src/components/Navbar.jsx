import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : "??";

  return (
    <header className="navbar">
      <button className="navbar__burger" onClick={onToggleSidebar} aria-label="Toggle sidebar">
        <i className="bi bi-list" />
      </button>

      <div className="navbar__search">
        <i className="bi bi-search" />
        <input type="text" placeholder="Search product, region, SKU..." />
      </div>

      <div className="navbar__actions">
        <button className="navbar__icon-btn" aria-label="Notifications">
          <i className="bi bi-bell-fill" />
        </button>

        <div className="navbar__user" onClick={() => setMenuOpen((v) => !v)}>
          <span className="navbar__avatar">{initials}</span>
          <span className="navbar__username">{user?.username}</span>
          <i className="bi bi-chevron-down" />

          {menuOpen && (
            <div className="navbar__dropdown">
              <div className="navbar__dropdown-item navbar__dropdown-item--static">
                <i className="bi bi-person-badge" /> {user?.role}
              </div>
              <button className="navbar__dropdown-item" onClick={handleLogout}>
                <i className="bi bi-box-arrow-right" /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}