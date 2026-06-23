import React, { useEffect, useState } from "react";
import { weatherAPI } from "../services/api";
import Spinner from "../components/Spinner";

export default function Weather() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    weatherAPI
      .list()
      .then(({ data }) => setRecords(data.results || data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner size="lg" label="Loading weather records..." />;

  return (
    <div className="page">
      <div className="page__header">
        <h1>Weather</h1>
        <p>Regional weather data feeding into the demand forecasting model.</p>
      </div>

      <section className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Region</th>
              <th>Temp (°C)</th>
              <th>Rainfall (mm)</th>
              <th>Humidity (%)</th>
            </tr>
          </thead>
          <tbody>
            {records.map((w) => (
              <tr key={w.id}>
                <td>{w.weather_date}</td>
                <td>{w.region_name}</td>
                <td>{w.temperature}</td>
                <td>{w.rainfall}</td>
                <td>{w.humidity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}