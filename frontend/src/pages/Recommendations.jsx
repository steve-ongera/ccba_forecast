import React, { useEffect, useState } from "react";
import { recommendationsAPI } from "../services/api";
import Spinner from "../components/Spinner";

export default function Recommendations() {
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    recommendationsAPI
      .list()
      .then(({ data }) => setRecs(data.results || data))
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (id) => {
    await recommendationsAPI.markRead(id);
    setRecs((prev) => prev.map((r) => (r.id === id ? { ...r, is_read: true } : r)));
  };

  if (loading) return <Spinner size="lg" label="Loading recommendations..." />;

  return (
    <div className="page">
      <div className="page__header">
        <h1>AI Recommendations</h1>
        <p>Decision-support alerts generated from forecast deviations.</p>
      </div>

      <ul className="recommendation-list recommendation-list--full">
        {recs.map((rec) => (
          <li key={rec.id} className={`recommendation-list__item pill--${rec.severity} ${rec.is_read ? "is-read" : ""}`}>
            <span className="badge">{rec.severity}</span>
            <div className="recommendation-list__body">
              <strong>
                {rec.product_name} · {rec.region_name}
              </strong>
              <p>{rec.message}</p>
              <span className="recommendation-list__meta">{rec.change_pct?.toFixed(1)}% expected change</span>
            </div>
            {!rec.is_read && (
              <button className="btn btn--ghost btn--sm" onClick={() => markRead(rec.id)}>
                Mark read
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}