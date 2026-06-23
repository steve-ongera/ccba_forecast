import React, { useEffect, useState } from "react";
import { forecastsAPI } from "../services/api";
import Spinner from "../components/Spinner";

export default function Forecasts() {
  const [forecasts, setForecasts] = useState([]);
  const [filteredForecasts, setFilteredForecasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const [horizonFilter, setHorizonFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Extracted filter options
  const [regions, setRegions] = useState([]);
  const [products, setProducts] = useState([]);
  const [horizons, setHorizons] = useState([]);
  
  // Stats
  const [stats, setStats] = useState({
    totalForecasts: 0,
    avgPredictedDemand: 0,
    totalPredictedDemand: 0,
    accuracyRate: 0,
    highAccuracyCount: 0
  });

  const loadForecasts = () => {
    setLoading(true);
    forecastsAPI
      .list()
      .then(({ data }) => {
        const results = data.results || data;
        setForecasts(results);
        setFilteredForecasts(results);
        
        // Extract unique filter options
        const uniqueRegions = [...new Set(results.map(f => f.region_name).filter(Boolean))];
        const uniqueProducts = [...new Set(results.map(f => f.product_name).filter(Boolean))];
        const uniqueHorizons = [...new Set(results.map(f => f.horizon).filter(Boolean))];
        setRegions(uniqueRegions);
        setProducts(uniqueProducts);
        setHorizons(uniqueHorizons);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadForecasts();
  }, []);

  // Calculate statistics
  useEffect(() => {
    const validForecasts = filteredForecasts.filter(f => f.predicted_demand != null);
    const totalPredicted = validForecasts.reduce((sum, f) => sum + Number(f.predicted_demand), 0);
    const avgPredicted = validForecasts.length > 0 ? totalPredicted / validForecasts.length : 0;
    
    // Calculate accuracy for forecasts with actual data
    const forecastsWithActual = filteredForecasts.filter(f => f.actual_demand != null && f.predicted_demand != null);
    const accurateCount = forecastsWithActual.filter(f => {
      const predicted = Number(f.predicted_demand);
      const actual = Number(f.actual_demand);
      const accuracy = 1 - (Math.abs(predicted - actual) / (predicted + actual));
      return accuracy >= 0.8; // 80% accuracy threshold
    });
    
    setStats({
      totalForecasts: filteredForecasts.length,
      avgPredictedDemand: avgPredicted,
      totalPredictedDemand: totalPredicted,
      accuracyRate: forecastsWithActual.length > 0 ? (accurateCount.length / forecastsWithActual.length) * 100 : 0,
      highAccuracyCount: accurateCount.length
    });
  }, [filteredForecasts]);

  // Filter logic
  useEffect(() => {
    let filtered = forecasts;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(f =>
        f.product_name?.toLowerCase().includes(term) ||
        f.region_name?.toLowerCase().includes(term) ||
        f.forecast_date?.includes(term)
      );
    }

    // Region filter
    if (regionFilter !== "all") {
      filtered = filtered.filter(f => f.region_name === regionFilter);
    }

    // Product filter
    if (productFilter !== "all") {
      filtered = filtered.filter(f => f.product_name === productFilter);
    }

    // Horizon filter
    if (horizonFilter !== "all") {
      filtered = filtered.filter(f => f.horizon === horizonFilter);
    }

    // Status filter (accuracy-based)
    if (statusFilter !== "all") {
      filtered = filtered.filter(f => {
        if (f.actual_demand == null || f.predicted_demand == null) {
          return statusFilter === "pending";
        }
        const predicted = Number(f.predicted_demand);
        const actual = Number(f.actual_demand);
        const accuracy = 1 - (Math.abs(predicted - actual) / (predicted + actual));
        if (statusFilter === "high") return accuracy >= 0.8;
        if (statusFilter === "medium") return accuracy >= 0.5 && accuracy < 0.8;
        if (statusFilter === "low") return accuracy < 0.5;
        return false;
      });
    }

    setFilteredForecasts(filtered);
    setCurrentPage(1);
  }, [searchTerm, regionFilter, productFilter, horizonFilter, statusFilter, forecasts]);

  // Reset filters
  const clearFilters = () => {
    setSearchTerm("");
    setRegionFilter("all");
    setProductFilter("all");
    setHorizonFilter("all");
    setStatusFilter("all");
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || 
    regionFilter !== "all" || 
    productFilter !== "all" || 
    horizonFilter !== "all" || 
    statusFilter !== "all";

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredForecasts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredForecasts.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Format date
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get accuracy status and color
  const getAccuracyStatus = (predicted, actual) => {
    if (predicted == null || actual == null) {
      return { status: 'Pending', color: 'badge--muted', dot: 'status-dot--warning' };
    }
    const p = Number(predicted);
    const a = Number(actual);
    const accuracy = 1 - (Math.abs(p - a) / (p + a));
    if (accuracy >= 0.8) {
      return { status: 'High', color: 'badge--success', dot: 'status-dot--success' };
    } else if (accuracy >= 0.5) {
      return { status: 'Medium', color: 'badge--warning', dot: 'status-dot--warning' };
    } else {
      return { status: 'Low', color: 'badge--critical', dot: 'status-dot--critical' };
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await forecastsAPI.generate({ horizon: "weekly" });
      loadForecasts();
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="app-loading">
        <Spinner size="lg" label="Loading forecasts..." />
      </div>
    );
  }

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page__header page__header--with-action">
        <div>
          <div className="page__header-eyebrow">Demand Forecasting</div>
          <h1>Forecasts</h1>
          <p>Predicted demand per product and region (7–30 day horizon).</p>
          <div className="page__meta">
            <span className="page__meta-item">
              <i className="bi bi-calendar3"></i>
              {filteredForecasts.length > 0 ? (
                <>
                  {formatDate(filteredForecasts[0]?.forecast_date)} - {formatDate(filteredForecasts[filteredForecasts.length - 1]?.forecast_date)}
                </>
              ) : (
                "No data available"
              )}
            </span>
            <span className="page__meta-item">
              <i className="bi bi-graph-up"></i>
              {filteredForecasts.length} forecasts
            </span>
            <span className="page__meta-item">
              <i className="bi bi-tag"></i>
              {horizons.length} horizons
            </span>
          </div>
        </div>
        <div className="page__header-actions">
          <button 
            className="btn btn--primary" 
            onClick={handleGenerate} 
            disabled={generating}
          >
            <i className={`bi ${generating ? 'bi-hourglass-split' : 'bi-magic'}`} /> 
            {generating ? "Generating..." : "Generate Forecast"}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card__header">
            <div className="kpi-card__icon">
              <i className="bi bi-file-earmark-spreadsheet"></i>
            </div>
          </div>
          <div className="kpi-card__label">Total Forecasts</div>
          <div className="kpi-card__value">{stats.totalForecasts}</div>
          <div className="kpi-card__sub">
            {filteredForecasts.filter(f => f.actual_demand != null).length} with actuals
          </div>
        </div>

        <div className="kpi-card kpi-card--info">
          <div className="kpi-card__header">
            <div className="kpi-card__icon">
              <i className="bi bi-box"></i>
            </div>
          </div>
          <div className="kpi-card__label">Avg Predicted Demand</div>
          <div className="kpi-card__value">
            {stats.avgPredictedDemand > 0 ? Number(stats.avgPredictedDemand).toLocaleString() : "—"}
          </div>
          <div className="kpi-card__sub">
            Total: {Number(stats.totalPredictedDemand).toLocaleString()} units
          </div>
        </div>

        <div className="kpi-card kpi-card--success">
          <div className="kpi-card__header">
            <div className="kpi-card__icon">
              <i className="bi bi-bullseye"></i>
            </div>
            <span className="kpi-card__trend kpi-card__trend--up">
              <i className="bi bi-arrow-up-short"></i> {stats.accuracyRate.toFixed(1)}%
            </span>
          </div>
          <div className="kpi-card__label">Accuracy Rate</div>
          <div className="kpi-card__value">{stats.accuracyRate.toFixed(1)}%</div>
          <div className="kpi-card__sub">
            {stats.highAccuracyCount} high accuracy forecasts
          </div>
        </div>

        <div className="kpi-card kpi-card--warning">
          <div className="kpi-card__header">
            <div className="kpi-card__icon">
              <i className="bi bi-clock-history"></i>
            </div>
          </div>
          <div className="kpi-card__label">Forecast Horizon</div>
          <div className="kpi-card__value" style={{ fontSize: 'var(--text-base)' }}>
            {horizons.length > 0 ? horizons.join(', ') : '—'}
          </div>
          <div className="kpi-card__sub">
            {horizons.includes('weekly') ? 'Weekly forecasts available' : 'Check horizons'}
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

            {/* Search */}
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

            {/* Product Filter */}
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

            {/* Region Filter */}
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

            {/* Horizon Filter */}
            <select
              className="select"
              style={{ maxWidth: '140px' }}
              value={horizonFilter}
              onChange={(e) => setHorizonFilter(e.target.value)}
            >
              <option value="all">All Horizons</option>
              {horizons.map(horizon => (
                <option key={horizon} value={horizon}>{horizon}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              className="select"
              style={{ maxWidth: '140px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="high">High Accuracy</option>
              <option value="medium">Medium Accuracy</option>
              <option value="low">Low Accuracy</option>
              <option value="pending">Pending</option>
            </select>

            {/* Clear Filters */}
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
              <strong>{filteredForecasts.length}</strong> forecasts
              {filteredForecasts.length !== forecasts.length && (
                <span style={{ marginLeft: 'var(--sp-2)', color: 'var(--c-text-muted)' }}>
                  (filtered from {forecasts.length})
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
                  <th>Horizon</th>
                  <th className="is-mono">Predicted</th>
                  <th className="is-mono">Actual</th>
                  <th className="is-mono">Accuracy</th>
                  <th>Status</th>
                  <th>Algorithm</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((f) => {
                  const accuracyStatus = getAccuracyStatus(f.predicted_demand, f.actual_demand);
                  const hasActual = f.actual_demand != null && f.predicted_demand != null;
                  const accuracyPct = hasActual ? 
                    1 - (Math.abs(Number(f.predicted_demand) - Number(f.actual_demand)) / (Number(f.predicted_demand) + Number(f.actual_demand))) : 
                    null;
                  
                  return (
                    <tr key={f.id}>
                      <td className="is-mono">
                        {formatDate(f.forecast_date)}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{f.product_name}</div>
                        {f.product_sku && (
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--c-text-muted)' }}>
                            SKU: {f.product_sku}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="badge badge--info">{f.region_name}</span>
                      </td>
                      <td>
                        <span className="badge badge--default">{f.horizon}</span>
                      </td>
                      <td className="is-mono" style={{ fontWeight: 600 }}>
                        {Number(f.predicted_demand).toLocaleString()}
                      </td>
                      <td className="is-mono">
                        {f.actual_demand != null ? Number(f.actual_demand).toLocaleString() : "—"}
                      </td>
                      <td className="is-mono" style={{ fontWeight: 600 }}>
                        {accuracyPct != null ? `${(accuracyPct * 100).toFixed(1)}%` : "—"}
                      </td>
                      <td>
                        <span className={`status-dot ${accuracyStatus.dot}`}>
                          {accuracyStatus.status}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge--muted" style={{ fontSize: '9px' }}>
                          {f.algorithm || "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state__icon">
              <i className="bi bi-graph-down"></i>
            </div>
            <div className="empty-state__title">No forecasts found</div>
            <div className="empty-state__desc">
              {hasActiveFilters ? (
                <>No forecasts match your current filters. Try adjusting your search criteria.</>
              ) : (
                <>No forecasts have been generated yet. Click "Generate Forecast" to create new predictions.</>
              )}
            </div>
            {hasActiveFilters ? (
              <button className="btn btn--secondary" onClick={clearFilters}>
                <i className="bi bi-arrow-counterclockwise"></i> Clear Filters
              </button>
            ) : (
              <button className="btn btn--primary" onClick={handleGenerate} disabled={generating}>
                <i className={`bi ${generating ? 'bi-hourglass-split' : 'bi-magic'}`} /> 
                Generate Forecast
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        {filteredForecasts.length > itemsPerPage && (
          <div className="table-pagination">
            <div className="table-pagination__info">
              Showing {indexOfFirstItem + 1} to{" "}
              {Math.min(indexOfLastItem, filteredForecasts.length)} of{" "}
              {filteredForecasts.length} entries
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