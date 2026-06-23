import React, { useEffect, useState } from "react";
import { recommendationsAPI } from "../services/api";
import Spinner from "../components/Spinner";

export default function Recommendations() {
  const [recs, setRecs] = useState([]);
  const [filteredRecs, setFilteredRecs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Extracted filter options
  const [categories, setCategories] = useState([]);

  // Severity configuration matching design system
  const SEVERITY_CONFIG = {
    critical: { 
      icon: 'bi-exclamation-triangle-fill', 
      cls: 'recommendation-item--critical', 
      badge: 'badge--critical',
      label: 'Critical'
    },
    warning: { 
      icon: 'bi-exclamation-circle-fill', 
      cls: 'recommendation-item--warning', 
      badge: 'badge--warning',
      label: 'Warning'
    },
    info: { 
      icon: 'bi-info-circle-fill', 
      cls: 'recommendation-item--info', 
      badge: 'badge--info',
      label: 'Info'
    },
    success: { 
      icon: 'bi-check-circle-fill', 
      cls: 'recommendation-item--success', 
      badge: 'badge--success',
      label: 'Success'
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = () => {
    setLoading(true);
    recommendationsAPI
      .list()
      .then(({ data }) => {
        const results = data.results || data;
        setRecs(results);
        setFilteredRecs(results);
        
        // Extract unique categories
        const uniqueCategories = [...new Set(results.map(r => r.category).filter(Boolean))];
        setCategories(uniqueCategories);
      })
      .finally(() => setLoading(false));
  };

  // Filter logic
  useEffect(() => {
    let filtered = recs;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.message?.toLowerCase().includes(term) ||
        r.product_name?.toLowerCase().includes(term) ||
        r.region_name?.toLowerCase().includes(term)
      );
    }

    // Severity filter
    if (severityFilter !== "all") {
      filtered = filtered.filter(r => r.severity === severityFilter);
    }

    // Status filter
    if (statusFilter === "read") {
      filtered = filtered.filter(r => r.is_read === true);
    } else if (statusFilter === "unread") {
      filtered = filtered.filter(r => r.is_read === false);
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(r => r.category === categoryFilter);
    }

    setFilteredRecs(filtered);
    setCurrentPage(1);
  }, [searchTerm, severityFilter, statusFilter, categoryFilter, recs]);

  // Reset filters
  const clearFilters = () => {
    setSearchTerm("");
    setSeverityFilter("all");
    setStatusFilter("all");
    setCategoryFilter("all");
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || 
    severityFilter !== "all" || 
    statusFilter !== "all" || 
    categoryFilter !== "all";

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRecs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRecs.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Calculate statistics
  const totalRecs = recs.length;
  const unreadCount = recs.filter(r => !r.is_read).length;
  const criticalCount = recs.filter(r => r.severity === 'critical').length;
  const warningCount = recs.filter(r => r.severity === 'warning').length;

  const markRead = async (id) => {
    setActionLoading(true);
    try {
      await recommendationsAPI.markRead(id);
      setRecs((prev) => prev.map((r) => (r.id === id ? { ...r, is_read: true } : r)));
    } finally {
      setActionLoading(false);
    }
  };

  const markAllRead = async () => {
    setActionLoading(true);
    try {
      const unreadIds = recs.filter(r => !r.is_read).map(r => r.id);
      await Promise.all(unreadIds.map(id => recommendationsAPI.markRead(id)));
      setRecs((prev) => prev.map((r) => ({ ...r, is_read: true })));
    } finally {
      setActionLoading(false);
    }
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-KE', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="app-loading">
        <Spinner size="lg" label="Loading recommendations..." />
      </div>
    );
  }

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page__header page__header--with-action">
        <div>
          <div className="page__header-eyebrow">Decision Support</div>
          <h1>AI Recommendations</h1>
          <p>Decision-support alerts generated from forecast deviations.</p>
          <div className="page__meta">
            <span className="page__meta-item">
              <i className="bi bi-envelope"></i>
              {unreadCount} unread
            </span>
            <span className="page__meta-item">
              <i className="bi bi-exclamation-triangle"></i>
              {criticalCount} critical
            </span>
            <span className="page__meta-item">
              <i className="bi bi-exclamation-circle"></i>
              {warningCount} warnings
            </span>
          </div>
        </div>
        <div className="page__header-actions">
          {unreadCount > 0 && (
            <button 
              className="btn btn--secondary" 
              onClick={markAllRead}
              disabled={actionLoading}
            >
              <i className={`bi ${actionLoading ? 'bi-hourglass-split' : 'bi-check2-all'}`} /> 
              Mark All Read
            </button>
          )}
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
              <i className="bi bi-chat-dots"></i>
            </div>
          </div>
          <div className="kpi-card__label">Total Recommendations</div>
          <div className="kpi-card__value">{totalRecs}</div>
          <div className="kpi-card__sub">
            {totalRecs > 0 ? `${Math.round((unreadCount / totalRecs) * 100)}% unread` : 'No recommendations'}
          </div>
        </div>

        <div className="kpi-card kpi-card--warning">
          <div className="kpi-card__header">
            <div className="kpi-card__icon">
              <i className="bi bi-envelope"></i>
            </div>
          </div>
          <div className="kpi-card__label">Unread</div>
          <div className="kpi-card__value">{unreadCount}</div>
          <div className="kpi-card__sub">
            {unreadCount > 0 ? 'Action required' : 'All caught up!'}
          </div>
        </div>

        <div className="kpi-card kpi-card--critical">
          <div className="kpi-card__header">
            <div className="kpi-card__icon">
              <i className="bi bi-exclamation-triangle-fill"></i>
            </div>
          </div>
          <div className="kpi-card__label">Critical</div>
          <div className="kpi-card__value">{criticalCount}</div>
          <div className="kpi-card__sub">
            {criticalCount > 0 ? 'Immediate attention needed' : 'No critical issues'}
          </div>
        </div>

        <div className="kpi-card kpi-card--info">
          <div className="kpi-card__header">
            <div className="kpi-card__icon">
              <i className="bi bi-clock-history"></i>
            </div>
          </div>
          <div className="kpi-card__label">Last Update</div>
          <div className="kpi-card__value" style={{ fontSize: 'var(--text-base)' }}>
            {recs.length > 0 ? formatDate(recs[0]?.created_at) : '—'}
          </div>
          <div className="kpi-card__sub">
            {recs.length > 0 ? 'Latest recommendation' : 'No data'}
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
                placeholder="Search by message, product, or region..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Severity Filter */}
            <select
              className="select"
              style={{ maxWidth: '150px' }}
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="all">All Severity</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
            </select>

            {/* Status Filter */}
            <select
              className="select"
              style={{ maxWidth: '140px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>

            {/* Category Filter */}
            {categories.length > 0 && (
              <select
                className="select"
                style={{ maxWidth: '160px' }}
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}

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

      {/* Recommendations List */}
      <section className="panel">
        <div className="table-toolbar">
          <div className="table-toolbar__left">
            <span className="table-count">
              Showing <strong>{currentItems.length}</strong> of{" "}
              <strong>{filteredRecs.length}</strong> recommendations
              {filteredRecs.length !== recs.length && (
                <span style={{ marginLeft: 'var(--sp-2)', color: 'var(--c-text-muted)' }}>
                  (filtered from {recs.length})
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
          <div style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
            <div className="recommendation-list">
              {currentItems.map((rec) => {
                const severity = SEVERITY_CONFIG[rec.severity] || SEVERITY_CONFIG.info;
                const isUnread = !rec.is_read;
                
                return (
                  <div 
                    key={rec.id} 
                    className={`recommendation-item ${severity.cls} ${isUnread ? '' : 'is-read'}`}
                    style={{ 
                      padding: 'var(--sp-4) var(--sp-4)',
                      borderLeft: `4px solid ${rec.severity === 'critical' ? 'var(--c-critical)' : 
                                    rec.severity === 'warning' ? 'var(--c-warning)' : 
                                    rec.severity === 'success' ? 'var(--c-success)' : 
                                    'var(--c-info)'}`
                    }}
                  >
                    <div className="recommendation-item__icon">
                      <i className={`bi ${severity.icon}`} aria-hidden="true" />
                    </div>
                    <div className="recommendation-item__body">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap', marginBottom: 'var(--sp-1)' }}>
                        <span className={`badge ${severity.badge}`}>
                          {severity.label}
                        </span>
                        {rec.category && (
                          <span className="badge badge--default">
                            {rec.category}
                          </span>
                        )}
                        {!isUnread && (
                          <span className="badge badge--muted">
                            <i className="bi bi-check-circle"></i> Read
                          </span>
                        )}
                      </div>
                      
                      <div className="recommendation-item__title">
                        {rec.product_name && (
                          <span style={{ fontWeight: 700 }}>{rec.product_name}</span>
                        )}
                        {rec.product_name && rec.region_name && (
                          <span style={{ color: 'var(--c-text-muted)', margin: '0 var(--sp-1)' }}>·</span>
                        )}
                        {rec.region_name && (
                          <span style={{ color: 'var(--c-text-muted)' }}>{rec.region_name}</span>
                        )}
                      </div>
                      
                      <div className="recommendation-item__desc">
                        {rec.message}
                      </div>
                      
                      <div className="recommendation-item__meta">
                        {rec.change_pct != null && (
                          <span className="recommendation-item__time">
                            <i className="bi bi-arrow-up-short" style={{ color: rec.change_pct > 0 ? 'var(--c-critical)' : 'var(--c-success)' }}></i>
                            {rec.change_pct > 0 ? '+' : ''}{rec.change_pct.toFixed(1)}% expected change
                          </span>
                        )}
                        {rec.created_at && (
                          <span className="recommendation-item__time">
                            <i className="bi bi-clock"></i> {formatDate(rec.created_at)}
                          </span>
                        )}
                        {rec.algorithm && (
                          <span className="recommendation-item__time">
                            <i className="bi bi-code-square"></i> {rec.algorithm}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="recommendation-item__actions">
                      {isUnread && (
                        <button 
                          className="btn btn--secondary btn--sm" 
                          onClick={() => markRead(rec.id)}
                          disabled={actionLoading}
                        >
                          <i className="bi bi-check2"></i> Mark Read
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state__icon">
              <i className="bi bi-check-circle"></i>
            </div>
            <div className="empty-state__title">No recommendations found</div>
            <div className="empty-state__desc">
              {hasActiveFilters ? (
                <>No recommendations match your current filters. Try adjusting your search criteria.</>
              ) : (
                <>All caught up! No recommendations at this time.</>
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
        {filteredRecs.length > itemsPerPage && (
          <div className="table-pagination">
            <div className="table-pagination__info">
              Showing {indexOfFirstItem + 1} to{" "}
              {Math.min(indexOfLastItem, filteredRecs.length)} of{" "}
              {filteredRecs.length} entries
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