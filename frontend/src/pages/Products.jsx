import React, { useEffect, useState } from "react";
import { productsAPI } from "../services/api";
import Spinner from "../components/Spinner";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productsAPI
      .list()
      .then(({ data }) => setProducts(data.results || data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner size="lg" label="Loading products..." />;

  return (
    <div className="page">
      <div className="page__header">
        <h1>Products</h1>
        <p>Coca-Cola product catalog used in demand forecasting.</p>
      </div>

      <section className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Pack Size</th>
              <th>Price (KES)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.sku}</td>
                <td>{p.category}</td>
                <td>{p.pack_size}</td>
                <td>{Number(p.price).toLocaleString()}</td>
                <td>
                  <span className={`badge ${p.is_active ? "badge--success" : "badge--muted"}`}>
                    {p.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}