import React, { useEffect, useState } from "react";
import { forecastsAPI } from "../services/api";
import Spinner from "../components/Spinner";

export default function Forecasts() {
  const [forecasts, setForecasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadForecasts = () => {
    setLoading(true);
    forecastsAPI
      .list()
      .then(({ data }) => setForecasts(data.results || data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadForecasts();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await forecastsAPI.generate({ horizon: "weekly" });
      loadForecasts();
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <Spinner size="lg" label="Loading forecasts..." />;

  return (
    <div className="page">
      <div className="page__header page__header--with-action">
        <div>
          <h1>Forecasts</h1>
          <p>Predicted demand per product and region (7–30 day horizon).</p>
        </div>
        <button className="btn btn--primary" onClick={handleGenerate} disabled={generating}>
          <i className="bi bi-magic" /> {generating ? "Generating..." : "Generate forecast"}
        </button>
      </div>

      <section className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Forecast Date</th>
              <th>Product</th>
              <th>Region</th>
              <th>Horizon</th>
              <th>Predicted Demand</th>
              <th>Actual</th>
              <th>Algorithm</th>
            </tr>
          </thead>
          <tbody>
            {forecasts.map((f) => (
              <tr key={f.id}>
                <td>{f.forecast_date}</td>
                <td>{f.product_name}</td>
                <td>{f.region_name}</td>
                <td>{f.horizon}</td>
                <td>{Number(f.predicted_demand).toLocaleString()}</td>
                <td>{f.actual_demand ? Number(f.actual_demand).toLocaleString() : "—"}</td>
                <td>{f.algorithm || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}