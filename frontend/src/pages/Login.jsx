import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ccbaLogo from "../assets/ccbalogo.webp";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError("Invalid username or password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="auth-page">
      <div className="auth-page__container">
        {/* Brand Section */}
        <div className="auth-page__brand">
          <div className="auth-page__logo">
            <img 
              src={ccbaLogo} 
              alt="CCBA - Coca-Cola Beverages Africa" 
              className="auth-page__logo-image"
            />
          </div>
          <h1 className="auth-page__brand-title">CCBA Demand Forecast</h1>
          <p className="auth-page__brand-subtitle">AI-powered supply chain optimization</p>
        </div>

        {/* Login Form */}
        <div className="auth-page__form-wrap">
          <form className="auth-form" onSubmit={handleSubmit}>
            <h2>Welcome Back</h2>
            <p className="auth-form__sub">Sign in to access the forecasting dashboard.</p>

            {/* Error Message */}
            {error && (
              <div className="auth-form__error">
                <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
                {error}
              </div>
            )}

            {/* Username Field */}
            <div className="form-field">
              <label className="form-label" htmlFor="username">
                Username
              </label>
              <div className="input-wrap">
                <i className="bi bi-person input-icon" aria-hidden="true" />
                <input
                  id="username"
                  type="text"
                  className="input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  autoComplete="username"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Password Field with Show/Hide Toggle */}
            <div className="form-field">
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <div className="input-wrap">
                <i className="bi bi-lock input-icon" aria-hidden="true" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  disabled={submitting}
                />
                <button
                  type="button"
                  className="input-action-btn"
                  onClick={togglePasswordVisibility}
                  tabIndex="-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`} aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              className="btn btn--primary btn--block btn--lg" 
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner spinner--sm" style={{ marginRight: 'var(--sp-2)' }} />
                  Signing in...
                </>
              ) : (
                <>
                  <i className="bi bi-box-arrow-in-right" aria-hidden="true" />
                  Sign in
                </>
              )}
            </button>

            {/* Footer */}
            <div className="auth-form__footer">
              <span>Secure • {new Date().getFullYear()} CCBA Demand Forecast</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}