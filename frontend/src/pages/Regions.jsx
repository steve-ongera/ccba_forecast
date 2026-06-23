import React, { useEffect, useState } from "react";
import { regionsAPI } from "../services/api";
import Spinner from "../components/Spinner";

export default function Regions() {
  const [regions, setRegions] = useState([]);
  const [filteredRegions, setFilteredRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [countyFilter, setCountyFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [counties, setCounties] = useState([]);

  useEffect(() => {
    regionsAPI
      .list()
      .then(({ data }) => {
        const results = data.results || data;
        setRegions(results);
        setFilteredRegions(results);
        
        // Extract unique counties
        const uniqueCounties = [...new Set(results.map(r => r.county).filter(Boolean))];
        setCounties(uniqueCounties);
      })
      .finally(() => setLoading(false));
  }, []);

  // Filter regions based on search and county filter
  useEffect(() => {
    let filtered = regions;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.name.toLowerCase().includes(term) ||
        r.county?.toLowerCase().includes(term)
      );
    }

    // County filter
    if (countyFilter !== "all") {
      filtered = filtered.filter(r => r.county === countyFilter);
    }

    setFilteredRegions(filtered);
    setCurrentPage(1);
  }, [searchTerm, countyFilter, regions]);

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRegions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRegions.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Reset filters
  const clearFilters = () => {
    setSearchTerm("");
    setCountyFilter("all");
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || countyFilter !== "all";

  if (loading) {
    return (
      <div className="app-loading">
        <Spinner size="lg" label="Loading regions..." />
      </div>
    );
  }

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page__header">
        <div className="page__header-content">
          <div className="page__header-eyebrow">Geographic Coverage</div>
          <h1>Regions</h1>
          <p>Counties and sales territories tracked for forecasting.</p>
          <div className="page__meta">
            <span className="page__meta-item">
              <i className="bi bi-geo-alt"></i>
              {filteredRegions.length} regions
            </span>
            <span className="page__meta-item">
              <i className="bi bi-building"></i>
              {counties.length} counties
            </span>
          </div>
        </div>
        <div className="page__header-actions">
          <button className="btn btn--primary">
            <i className="bi bi-plus-lg"></i> Add Region
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card__header">
            <div className="kpi-card__icon">
              <i className="bi bi-globe2"></i>
            </div>
          </div>
          <div className="kpi-card__label">Total Regions</div>
          <div className="kpi-card__value">{regions.length}</div>
          <div className="kpi-card__sub">
            Across {counties.length} counties
          </div>
        </div>
        <div className="kpi-card kpi-card--info">
          <div className="kpi-card__header">
            <div className="kpi-card__icon">
              <i className="bi bi-building"></i>
            </div>
          </div>
          <div className="kpi-card__label">Counties</div>
          <div className="kpi-card__value">{counties.length}</div>
          <div className="kpi-card__sub">
            {counties.length > 0 ? `${counties.length} counties covered` : 'No counties'}
          </div>
        </div>
        <div className="kpi-card kpi-card--success">
          <div className="kpi-card__header">
            <div className="kpi-card__icon">
              <i className="bi bi-pin-map"></i>
            </div>
          </div>
          <div className="kpi-card__label">Coverage Rate</div>
          <div className="kpi-card__value">
            {regions.length > 0 ? 
              `${Math.round((regions.filter(r => r.latitude && r.longitude).length / regions.length) * 100)}%` : 
              '0%'
            }
          </div>
          <div className="kpi-card__sub">
            {regions.filter(r => r.latitude && r.longitude).length} mapped regions
          </div>
        </div>
        <div className="kpi-card kpi-card--warning">
          <div className="kpi-card__header">
            <div className="kpi-card__icon">
              <i className="bi bi-clock-history"></i>
            </div>
          </div>
          <div className="kpi-card__label">Last Updated</div>
          <div className="kpi-card__value" style={{ fontSize: 'var(--text-base)' }}>
            {new Date().toLocaleDateString()}
          </div>
          <div className="kpi-card__sub">
            Region data current
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
            <div className="input-wrap" style={{ flex: '1', minWidth: '200px' }}>
              <i className="bi bi-search input-icon"></i>
              <input
                type="text"
                className="input"
                placeholder="Search regions by name or county..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* County Filter */}
            <select
              className="select"
              style={{ maxWidth: '180px' }}
              value={countyFilter}
              onChange={(e) => setCountyFilter(e.target.value)}
            >
              <option value="all">All Counties</option>
              {counties.sort().map(county => (
                <option key={county} value={county}>{county}</option>
              ))}
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

      {/* Table */}
      <section className="panel">
        <div className="table-toolbar">
          <div className="table-toolbar__left">
            <span className="table-count">
              Showing <strong>{currentItems.length}</strong> of{" "}
              <strong>{filteredRegions.length}</strong> regions
              {filteredRegions.length !== regions.length && (
                <span style={{ marginLeft: 'var(--sp-2)', color: 'var(--c-text-muted)' }}>
                  (filtered from {regions.length})
                </span>
              )}
            </span>
          </div>
          <div className="table-toolbar__right">
            <button className="btn btn--secondary btn--sm">
              <i className="bi bi-download"></i> Export
            </button>
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
                  <th>Region</th>
                  <th>County</th>
                  <th className="is-mono">Latitude</th>
                  <th className="is-mono">Longitude</th>
                  <th>Status</th>
                  <th style={{ width: '80px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        <i className="bi bi-geo-alt" style={{ color: 'var(--c-red)', marginRight: 'var(--sp-2)' }}></i>
                        {r.name}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge--info">{r.county || "—"}</span>
                    </td>
                    <td className="is-mono">
                      {r.latitude ? Number(r.latitude).toFixed(6) : "—"}
                    </td>
                    <td className="is-mono">
                      {r.longitude ? Number(r.longitude).toFixed(6) : "—"}
                    </td>
                    <td>
                      <span className={`status-dot ${r.latitude && r.longitude ? "status-dot--success" : "status-dot--warning"}`}>
                        {r.latitude && r.longitude ? "Mapped" : "Unmapped"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--sp-1)' }}>
                        <button className="btn btn--ghost btn--xs" title="View region">
                          <i className="bi bi-eye"></i>
                        </button>
                        <button className="btn btn--ghost btn--xs" title="Edit region">
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button className="btn btn--ghost btn--xs" title="View on map" style={{ color: 'var(--c-info)' }}>
                          <i className="bi bi-map"></i>
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
              <i className="bi bi-geo-alt"></i>
            </div>
            <div className="empty-state__title">No regions found</div>
            <div className="empty-state__desc">
              {hasActiveFilters ? (
                <>No regions match your current filters. Try adjusting your search criteria.</>
              ) : (
                <>No regions have been added to the system yet. Click "Add Region" to get started.</>
              )}
            </div>
            {hasActiveFilters && (
              <button className="btn btn--secondary" onClick={clearFilters}>
                <i className="bi bi-arrow-counterclockwise"></i> Clear Filters
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        {filteredRegions.length > itemsPerPage && (
          <div className="table-pagination">
            <div className="table-pagination__info">
              Showing {indexOfFirstItem + 1} to{" "}
              {Math.min(indexOfLastItem, filteredRegions.length)} of{" "}
              {filteredRegions.length} entries
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
                // Show first, last, and pages around current
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