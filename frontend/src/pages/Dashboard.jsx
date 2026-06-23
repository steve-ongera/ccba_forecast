import React, { useEffect, useState } from "react";
import { dashboardAPI } from "../services/api";
import Spinner from "../components/Spinner";

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI
      .summary()
      .then(({ data }) => setSummary(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner size="lg" label="Crunching the numbers..." />;
  if (!summary) return <p>Unable to load dashboard data.</p>;

  return (
    <div className="page">
      <div className="page__header">
        <h1>Dashboard</h1>
        <p>Last 30 days overview across all regions.</p>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <i className="bi bi-cash-coin kpi-card__icon" />
          <span className="kpi-card__label">Total Sales (KES)</span>
          <span className="kpi-card__value">{Number(summary.total_sales).toLocaleString()}</span>
        </div>
        <div className="kpi-card">
          <i className="bi bi-boxes kpi-card__icon" />
          <span className="kpi-card__label">Units Sold</span>
          <span className="kpi-card__value">{Number(summary.total_units_sold).toLocaleString()}</span>
        </div>
        <div className="kpi-card">
          <i className="bi bi-grid-3x3-gap-fill kpi-card__icon" />
          <span className="kpi-card__label">Active Products</span>
          <span className="kpi-card__value">{summary.active_products}</span>
        </div>
        <div className="kpi-card">
          <i className="bi bi-bullseye kpi-card__icon" />
          <span className="kpi-card__label">Forecast Accuracy</span>
          <span className="kpi-card__value">
            {summary.forecast_accuracy_pct ? `${summary.forecast_accuracy_pct.toFixed(1)}%` : "—"}
          </span>
        </div>
      </div>

      <div className="panel-grid">
        <section className="panel">
          <h2>Regional Performance</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Region</th>
                <th>Units</th>
                <th>Revenue (KES)</th>
              </tr>
            </thead>
            <tbody>
              {summary.regional_performance.map((r) => (
                <tr key={r.region__name}>
                  <td>{r.region__name}</td>
                  <td>{Number(r.total_qty).toLocaleString()}</td>
                  <td>{Number(r.total_rev).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel">
          <h2>Recent AI Recommendations</h2>
          <ul className="recommendation-list">
            {summary.recent_recommendations.map((rec) => (
              <li key={rec.id} className={`recommendation-list__item pill--${rec.severity}`}>
                <span className="badge">{rec.severity}</span>
                <p>{rec.message}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}