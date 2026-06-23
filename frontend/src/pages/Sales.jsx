import React, { useEffect, useState, useMemo } from "react";
import { salesAPI } from "../services/api";
import Spinner from "../components/Spinner";

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [promoFilter, setPromoFilter] = useState("all");
  const [dateRange, setDateRange] = useState("last30");
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  const [regions, setRegions] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalUnits: 0,
    avgOrderValue: 0,
    promoRevenue: 0
  });

  const loadSales = () => {
    setLoading(true);
    salesAPI
      .list()
      .then(({ data }) => {
        const results = data.results || data;
        setSales(results);
        setFilteredSales(results);
        
        const uniqueRegions = [...new Set(results.map(s => s.region_name).filter(Boolean))];
        const uniqueProducts = [...new Set(results.map(s => s.product_name).filter(Boolean))];
        setRegions(uniqueRegions);
        setProducts(uniqueProducts);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSales();
  }, []);

  useEffect(() => {
    const totalRevenue = filteredSales.reduce((sum, s) => sum + Number(s.revenue || 0), 0);
    const totalUnits = filteredSales.reduce((sum, s) => sum + Number(s.quantity_sold || 0), 0);
    const promoRevenue = filteredSales
      .filter(s => s.promotion_active)
      .reduce((sum, s) => sum + Number(s.revenue || 0), 0);
    
    setStats({
      totalRevenue,
      totalUnits,
      avgOrderValue: filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0,
      promoRevenue
    });
  }, [filteredSales]);

  useEffect(() => {
    let filtered = sales;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.product_name?.toLowerCase().includes(term) ||
        s.region_name?.toLowerCase().includes(term) ||
        s.sales_date?.includes(term)
      );
    }

    if (regionFilter !== "all") {
      filtered = filtered.filter(s => s.region_name === regionFilter);
    }

    if (productFilter !== "all") {
      filtered = filtered.filter(s => s.product_name === productFilter);
    }

    if (promoFilter !== "all") {
      const isPromo = promoFilter === "yes";
      filtered = filtered.filter(s => s.promotion_active === isPromo);
    }

    if (dateRange !== "all") {
      const now = new Date();
      let cutoffDate = new Date();
      
      switch(dateRange) {
        case "last7":
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case "last30":
          cutoffDate.setDate(now.getDate() - 30);
          break;
        case "last90":
          cutoffDate.setDate(now.getDate() - 90);
          break;
        case "last365":
          cutoffDate.setDate(now.getDate() - 365);
          break;
        default:
          cutoffDate = null;
      }
      
      if (cutoffDate) {
        filtered = filtered.filter(s => new Date(s.sales_date) >= cutoffDate);
      }
    }

    setFilteredSales(filtered);
    setCurrentPage(1);
  }, [searchTerm, regionFilter, productFilter, promoFilter, dateRange, sales]);

  const clearFilters = () => {
    setSearchTerm("");
    setRegionFilter("all");
    setProductFilter("all");
    setPromoFilter("all");
    setDateRange("last30");
  };

  const hasActiveFilters = searchTerm || 
    regionFilter !== "all" || 
    productFilter !== "all" || 
    promoFilter !== "all" || 
    dateRange !== "last30";

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSales.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const formatCurrency = (value) => {
    return Number(value).toLocaleString('en-KE', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

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

  if (loading) {
    return (
      <div className="app-loading">
        <Spinner size="lg" label="Loading sales records..." />
      </div>
    );
  }

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page__header page__header--with-action">
        <div>
          <div className="page__header-eyebrow">Sales Analytics</div>
          <h1>Sales Transactions</h1>
          <p>Daily transactional sales records by product and region.</p>
          <div className="page__meta">
            <span className="page__meta-item">
              <i className="bi bi-calendar3"></i>
              {filteredSales.length > 0 ? (
                <>
                  {formatDate(filteredSales[0]?.sales_date)} - {formatDate(filteredSales[filteredSales.length - 1]?.sales_date)}
                </>
              ) : (
                "No data available"
              )}
            </span>
            <span className="page__meta-item">
              <i className="bi bi-shop"></i>
              {filteredSales.length} transactions
            </span>
          </div>
        </div>
        <div className="page__header-actions">
          <label className="btn btn--secondary">
            <i className="bi bi-upload" /> 
            {uploading ? "Uploading..." : "Bulk Upload CSV"}
            <input type="file" accept=".csv" hidden onChange={handleUpload} disabled={uploading} />
          </label>
          <button className="btn btn--secondary" onClick={() => window.print()}>
            <i className="bi bi-printer"></i>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card__header">
            <div className="kpi-card__icon">
              <i className="bi bi-currency-dollar"></i>
            </div>
            <div className="kpi-card__trend kpi-card__trend--up">
              <i className="bi bi-arrow-up"></i> 12.5%
            </div>
          </div>
          <div className="kpi-card__label">Total Revenue</div>
          <div className="kpi-card__value">KES {formatCurrency(stats.totalRevenue)}</div>
          <div className="kpi-card__sub">
            {filteredSales.length} transactions
          </div>
        </div>

        <div className="kpi-card kpi-card--info">
          <div className="kpi-card__header">
            <div className="kpi-card__icon">
              <i className="bi bi-cube"></i>
            </div>
          </div>
          <div className="kpi-card__label">Total Units Sold</div>
          <div className="kpi-card__value">{formatCurrency(stats.totalUnits)}</div>
          <div className="kpi-card__sub">
            Avg. {formatCurrency(stats.totalUnits / (filteredSales.length || 1))} per transaction
          </div>
        </div>

        <div className="kpi-card kpi-card--success">
          <div className="kpi-card__header">
            <div className="kpi-card__icon">
              <i className="bi bi-receipt"></i>
            </div>
          </div>
          <div className="kpi-card__label">Avg. Order Value</div>
          <div className="kpi-card__value">KES {formatCurrency(stats.avgOrderValue)}</div>
          <div className="kpi-card__sub">
            {filteredSales.length > 0 ? `${filteredSales.length} orders` : 'No orders'}
          </div>
        </div>

        <div className="kpi-card kpi-card--warning">
          <div className="kpi-card__header">
            <div className="kpi-card__icon">
              <i className="bi bi-tag"></i>
            </div>
          </div>
          <div className="kpi-card__label">Promotional Revenue</div>
          <div className="kpi-card__value">KES {formatCurrency(stats.promoRevenue)}</div>
          <div className="kpi-card__sub">
            {filteredSales.filter(s => s.promotion_active).length} promo transactions
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

            <div className="input-wrap" style={{ flex: '1', minWidth: '180px' }}>
              <i className="bi bi-search input-icon"></i>
              <input
                type="text"
                className="input"
                placeholder="Search by product, region, or date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="select"
              style={{ maxWidth: '150px' }}
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
              <option value="last90">Last 90 Days</option>
              <option value="last365">Last Year</option>
              <option value="all">All Time</option>
            </select>

            <select
              className="select"
              style={{ maxWidth: '160px' }}
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
            >
              <option value="all">All Regions</option>
              {regions.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>

            <select
              className="select"
              style={{ maxWidth: '160px' }}
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
            >
              <option value="all">All Products</option>
              {products.map(product => (
                <option key={product} value={product}>{product}</option>
              ))}
            </select>

            <select
              className="select"
              style={{ maxWidth: '140px' }}
              value={promoFilter}
              onChange={(e) => setPromoFilter(e.target.value)}
            >
              <option value="all">All Promotions</option>
              <option value="yes">With Promo</option>
              <option value="no">Without Promo</option>
            </select>

            {hasActiveFilters && (
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

      {/* Data Table */}
      <section className="panel">
        <div className="table-toolbar">
          <div className="table-toolbar__left">
            <span className="table-count">
              Showing <strong>{currentItems.length}</strong> of{" "}
              <strong>{filteredSales.length}</strong> transactions
              {filteredSales.length !== sales.length && (
                <span style={{ marginLeft: 'var(--sp-2)', color: 'var(--c-text-muted)' }}>
                  (filtered from {sales.length})
                </span>
              )}
            </span>
          </div>
          <div className="table-toolbar__right">
            <button className="btn btn--secondary btn--sm" onClick={() => window.location.reload()}>
              <i className="bi bi-arrow-clockwise"></i> Refresh
            </button>
          </div>
        </div>

        {currentItems.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Region</th>
                  <th className="is-mono">Qty Sold</th>
                  <th className="is-mono">Unit Price</th>
                  <th className="is-mono">Revenue</th>
                  <th>Promo</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((s) => (
                  <tr key={s.id}>
                    <td className="is-mono">
                      {formatDate(s.sales_date)}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{s.product_name}</div>
                      {s.product_sku && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--c-text-muted)' }}>
                          SKU: {s.product_sku}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge badge--info">{s.region_name}</span>
                    </td>
                    <td className="is-mono">{Number(s.quantity_sold).toLocaleString()}</td>
                    <td className="is-mono">KES {Number(s.unit_price).toLocaleString()}</td>
                    <td className="is-mono" style={{ fontWeight: 600 }}>
                      KES {Number(s.revenue).toLocaleString()}
                    </td>
                    <td>
                      {s.promotion_active ? (
                        <span className="badge badge--success">
                          <i className="bi bi-tag"></i> Yes
                        </span>
                      ) : (
                        <span className="badge badge--muted">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state__icon">
              <i className="bi bi-cart"></i>
            </div>
            <div className="empty-state__title">No sales records found</div>
            <div className="empty-state__desc">
              {hasActiveFilters ? (
                <>No transactions match your current filters. Try adjusting your search criteria.</>
              ) : (
                <>No sales records have been uploaded yet. Click "Bulk Upload CSV" to import data.</>
              )}
            </div>
            {hasActiveFilters && (
              <button className="btn btn--secondary" onClick={clearFilters}>
                <i className="bi bi-arrow-counterclockwise"></i> Clear Filters
              </button>
            )}
          </div>
        )}

        {filteredSales.length > itemsPerPage && (
          <div className="table-pagination">
            <div className="table-pagination__info">
              Showing {indexOfFirstItem + 1} to{" "}
              {Math.min(indexOfLastItem, filteredSales.length)} of{" "}
              {filteredSales.length} entries
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