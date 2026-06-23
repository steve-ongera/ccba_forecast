import React, { useEffect, useState } from "react";
import { productsAPI } from "../services/api";
import Spinner from "../components/Spinner";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    productsAPI
      .list()
      .then(({ data }) => {
        const results = data.results || data;
        setProducts(results);
        setFilteredProducts(results);
        const uniqueCategories = [...new Set(results.map(p => p.category).filter(Boolean))];
        setCategories(uniqueCategories);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let filtered = products;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        p.category?.toLowerCase().includes(term)
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }

    if (statusFilter !== "all") {
      const isActive = statusFilter === "active";
      filtered = filtered.filter(p => p.is_active === isActive);
    }

    setFilteredProducts(filtered);
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, statusFilter, products]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setStatusFilter("all");
  };

  if (loading) {
    return (
      <div className="app-loading">
        <Spinner size="lg" label="Loading products..." />
      </div>
    );
  }

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page__header">
        <div className="page__header-content">
          <div className="page__header-eyebrow">Catalog Management</div>
          <h1>Products</h1>
          <p>Coca-Cola product catalog used in demand forecasting.</p>
        </div>
        <div className="page__header-actions">
          <button className="btn btn--primary">
            <i className="bi bi-plus-lg"></i> Add Product
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card__header">
            <div className="kpi-card__icon">
              <i className="bi bi-box"></i>
            </div>
          </div>
          <div className="kpi-card__label">Total Products</div>
          <div className="kpi-card__value">{products.length}</div>
        </div>
        <div className="kpi-card kpi-card--success">
          <div className="kpi-card__header">
            <div className="kpi-card__icon">
              <i className="bi bi-check-circle"></i>
            </div>
          </div>
          <div className="kpi-card__label">Active Products</div>
          <div className="kpi-card__value">
            {products.filter(p => p.is_active).length}
          </div>
        </div>
        <div className="kpi-card kpi-card--info">
          <div className="kpi-card__header">
            <div className="kpi-card__icon">
              <i className="bi bi-tags"></i>
            </div>
          </div>
          <div className="kpi-card__label">Categories</div>
          <div className="kpi-card__value">{categories.length}</div>
        </div>
        <div className="kpi-card kpi-card--warning">
          <div className="kpi-card__header">
            <div className="kpi-card__icon">
              <i className="bi bi-clock"></i>
            </div>
          </div>
          <div className="kpi-card__label">Last Updated</div>
          <div className="kpi-card__value" style={{ fontSize: 'var(--text-base)' }}>
            {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="panel" style={{ marginBottom: 'var(--sp-4)' }}>
        <div className="panel__body">
          <div className="filter-bar">
            <span className="filter-bar__label">
              <i className="bi bi-funnel"></i> Filters
            </span>

            <div className="input-wrap" style={{ flex: '1', minWidth: '200px' }}>
              <i className="bi bi-search input-icon"></i>
              <input
                type="text"
                className="input"
                placeholder="Search products by name, SKU, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="select"
              style={{ maxWidth: '180px' }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              className="select"
              style={{ maxWidth: '150px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            {(searchTerm || categoryFilter !== "all" || statusFilter !== "all") && (
              <button
                className="btn btn--ghost btn--sm"
                onClick={clearFilters}
              >
                <i className="bi bi-x-lg"></i> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <section className="panel">
        <div className="table-toolbar">
          <div className="table-toolbar__left">
            <span className="table-count">
              Showing <strong>{currentItems.length}</strong> of{" "}
              <strong>{filteredProducts.length}</strong> products
              {filteredProducts.length !== products.length && (
                <span style={{ marginLeft: 'var(--sp-2)', color: 'var(--c-text-muted)' }}>
                  (filtered from {products.length})
                </span>
              )}
            </span>
          </div>
          <div className="table-toolbar__right">
            <button className="btn btn--secondary btn--sm">
              <i className="bi bi-download"></i> Export
            </button>
            <button className="btn btn--secondary btn--sm">
              <i className="bi bi-arrow-clockwise"></i> Refresh
            </button>
          </div>
        </div>

        {currentItems.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Pack Size</th>
                  <th className="is-mono">Price (KES)</th>
                  <th>Status</th>
                  <th style={{ width: '80px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      {p.description && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--c-text-muted)', marginTop: '2px' }}>
                          {p.description}
                        </div>
                      )}
                    </td>
                    <td className="is-mono">{p.sku}</td>
                    <td>
                      <span className="badge badge--info">{p.category || "Uncategorized"}</span>
                    </td>
                    <td>{p.pack_size || "—"}</td>
                    <td className="is-mono">{Number(p.price).toLocaleString()}</td>
                    <td>
                      <span className={`status-dot ${p.is_active ? "status-dot--success" : "status-dot--critical"}`}>
                        {p.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--sp-1)' }}>
                        <button className="btn btn--ghost btn--xs" title="View product">
                          <i className="bi bi-eye"></i>
                        </button>
                        <button className="btn btn--ghost btn--xs" title="Edit product">
                          <i className="bi bi-pencil"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state__icon">
              <i className="bi bi-box-seam"></i>
            </div>
            <div className="empty-state__title">No products found</div>
            <div className="empty-state__desc">
              {searchTerm || categoryFilter !== "all" || statusFilter !== "all" ? (
                <>No products match your current filters. Try adjusting your search criteria.</>
              ) : (
                <>No products have been added to the catalog yet. Click "Add Product" to get started.</>
              )}
            </div>
            {(searchTerm || categoryFilter !== "all" || statusFilter !== "all") && (
              <button className="btn btn--secondary" onClick={clearFilters}>
                <i className="bi bi-arrow-counterclockwise"></i> Clear Filters
              </button>
            )}
          </div>
        )}

        {filteredProducts.length > itemsPerPage && (
          <div className="table-pagination">
            <div className="table-pagination__info">
              Showing {indexOfFirstItem + 1} to{" "}
              {Math.min(indexOfLastItem, filteredProducts.length)} of{" "}
              {filteredProducts.length} entries
            </div>
            <div className="table-pagination__controls">
              <button
                className="page-btn"
                disabled={currentPage === 1}
                onClick={() => paginate(currentPage - 1)}
              >
                <i className="bi bi-chevron-left"></i>
              </button>
              {[...Array(totalPages)].map((_, index) => {
                const pageNumber = index + 1;
                if (
                  pageNumber === 1 ||
                  pageNumber === totalPages ||
                  Math.abs(pageNumber - currentPage) <= 1
                ) {
                  return (
                    <button
                      key={pageNumber}
                      className={`page-btn ${currentPage === pageNumber ? "is-active" : ""}`}
                      onClick={() => paginate(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  );
                }
                if (pageNumber === currentPage - 2 || pageNumber === currentPage + 2) {
                  return <span key={pageNumber} style={{ color: 'var(--c-text-muted)', padding: '0 4px' }}>…</span>;
                }
                return null;
              })}
              <button
                className="page-btn"
                disabled={currentPage === totalPages}
                onClick={() => paginate(currentPage + 1)}
              >
                <i className="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}