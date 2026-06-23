import React, { useEffect, useState } from "react";
import { regionsAPI } from "../services/api";
import Spinner from "../components/Spinner";

export default function Regions() {
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    regionsAPI
      .list()
      .then(({ data }) => setRegions(data.results || data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner size="lg" label="Loading regions..." />;

  return (
    <div className="page">
      <div className="page__header">
        <h1>Regions</h1>
        <p>Counties and sales territories tracked for forecasting.</p>
      </div>

      <section className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Region</th>
              <th>County</th>
              <th>Latitude</th>
              <th>Longitude</th>
            </tr>
          </thead>
          <tbody>
            {regions.map((r) => (
              <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.county}</td>
                <td>{r.latitude ?? "—"}</td>
                <td>{r.longitude ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}