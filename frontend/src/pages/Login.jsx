import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
      setError("Invalid username or password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-screen__panel">
        <div className="auth-screen__brand">
          <span className="auth-screen__mark">CCBA</span>
          <h1>Demand Forecast</h1>
          <p>AI-powered demand forecasting for beverage supply chain optimization.</p>
        </div>

        <div className="auth-screen__stat-strip">
          <div>
            <strong>7–30</strong>
            <span>days ahead forecast</span>
          </div>
          <div>
            <strong>85%+</strong>
            <span>target accuracy</span>
          </div>
          <div>
            <strong>47</strong>
            <span>counties covered</span>
          </div>
        </div>
      </div>

      <div className="auth-screen__form-wrap">
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Sign in</h2>
          <p className="auth-form__sub">Access the forecasting dashboard.</p>

          {error && (
            <div className="auth-form__error">
              <i className="bi bi-exclamation-triangle-fill" /> {error}
            </div>
          )}

          <label className="form-field">
            <span>Username</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. analyst.nairobi"
              required
            />
          </label>

          <label className="form-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}