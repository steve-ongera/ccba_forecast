import React, { useEffect, useState } from "react";
import { salesAPI } from "../services/api";
import Spinner from "../components/Spinner";

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const loadSales = () => {
    setLoading(true);
    salesAPI
      .list()
      .then(({ data }) => setSales(data.results || data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSales();
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      await salesAPI.bulkUpload(file);
      loadSales();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  if (loading) return <Spinner size="lg" label="Loading sales records..." />;

  return (
    <div className="page">
      <div className="page__header page__header--with-action">
        <div>
          <h1>Sales</h1>
          <p>Daily transactional sales records by product and region.</p>
        </div>
        <label className="btn btn--secondary">
          <i className="bi bi-upload" /> {uploading ? "Uploading..." : "Bulk upload CSV"}
          <input type="file" accept=".csv" hidden onChange={handleUpload} />
        </label>
      </div>

      <section className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Product</th>
              <th>Region</th>
              <th>Qty Sold</th>
              <th>Unit Price</th>
              <th>Revenue</th>
              <th>Promo</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id}>
                <td>{s.sales_date}</td>
                <td>{s.product_name}</td>
                <td>{s.region_name}</td>
                <td>{s.quantity_sold}</td>
                <td>{Number(s.unit_price).toLocaleString()}</td>
                <td>{Number(s.revenue).toLocaleString()}</td>
                <td>
                  {s.promotion_active ? (
                    <span className="badge badge--success">Yes</span>
                  ) : (
                    <span className="badge badge--muted">No</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}