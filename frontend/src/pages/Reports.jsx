import React, { useEffect, useState } from "react";
import { reportsAPI } from "../services/api";
import Spinner from "../components/Spinner";

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [format, setFormat] = useState("pdf");
  const [reportType, setReportType] = useState("forecast");

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [formatFilter, setFormatFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("last30");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Extracted filter options
  const [formats, setFormats] = useState([]);
  const [types, setTypes] = useState([]);

  const loadReports = () => {
    setLoading(true);
    reportsAPI
      .list()
      .then(({ data }) => {
        const results = data.results || data;
        setReports(results);
        setFilteredReports(results);

        // Extract unique formats and types
        const uniqueFormats = [...new Set(results.map((r) => r.report_format).filter(Boolean))];
        const uniqueTypes = [...new Set(results.map((r) => r.report_type).filter(Boolean))];
        setFormats(uniqueFormats);
        setTypes(uniqueTypes);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReports();
  }, []);

  // Calculate statistics
  const totalReports = filteredReports.length;
  const pdfCount = filteredReports.filter((r) => r.report_format === "pdf").length;
  const excelCount = filteredReports.filter((r) => r.report_format === "excel").length;
  const recentCount = filteredReports.filter((r) => {
    const date = new Date(r.created_at);
    const now = new Date();
    const diffDays = (now - date) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  }).length;

  // Filter logic
  useEffect(() => {
    let filtered = reports;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.title?.toLowerCase().includes(term) ||
          r.generated_by_name?.toLowerCase().includes(term) ||
          r.report_type?.toLowerCase().includes(term)
      );
    }

    // Format filter
    if (formatFilter !== "all") {
      filtered = filtered.filter((r) => r.report_format === formatFilter);
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((r) => r.report_type === typeFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    // Date range filter
    if (dateRange !== "all") {
      const now = new Date();
      let cutoffDate = new Date();

      switch (dateRange) {
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
        filtered = filtered.filter((r) => new Date(r.created_at) >= cutoffDate);
      }
    }

    setFilteredReports(filtered);
    setCurrentPage(1);
  }, [searchTerm, formatFilter, typeFilter, statusFilter, dateRange, reports]);

  // Reset filters
  const clearFilters = () => {
    setSearchTerm("");
    setFormatFilter("all");
    setTypeFilter("all");
    setStatusFilter("all");
    setDateRange("last30");
  };

  // Check if any filters are active
  const hasActiveFilters =
    searchTerm || formatFilter !== "all" || typeFilter !== "all" || statusFilter !== "all" || dateRange !== "last30";

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredReports.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Format date
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-KE", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get status configuration
  const getStatusConfig = (status) => {
    switch (status) {
      case "completed":
        return { label: "Completed", badge: "badge--success", dot: "status-dot--success" };
      case "generating":
        return { label: "Generating", badge: "badge--warning", dot: "status-dot--warning" };
      case "failed":
        return { label: "Failed", badge: "badge--critical", dot: "status-dot--critical" };
      default:
        return { label: "Pending", badge: "badge--muted", dot: "status-dot--info" };
    }
  };

  // Get format icon
  const getFormatIcon = (format) => {
    switch (format) {
      case "pdf":
        return "bi bi-filetype-pdf";
      case "excel":
        return "bi bi-file-earmark-excel";
      default:
        return "bi bi-file-earmark";
    }
  };

  // Get format color
  const getFormatColor = (format) => {
    switch (format) {
      case "pdf":
        return "var(--c-critical)";
      case "excel":
        return "var(--c-success)";
      default:
        return "var(--c-text-muted)";
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await reportsAPI.generate({
        title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report`,
        report_format: format,
        report_type: reportType,
        filters: {},
      });
      loadReports();
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (id) => {
    try {
      await reportsAPI.download(id);
    } catch (error) {
      console.error("Failed to download report:", error);
    }
  };

  if (loading) {
    return (
      <div className="app-loading">
        <Spinner size="lg" label="Loading reports..." />
      </div>
    );
  }

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page__header page__header--with-action">
        <div>
          <div className="page__header-eyebrow">Document Management</div>
          <h1>Reports</h1>
          <p>PDF and Excel exports of sales, forecasts, and recommendations.</p>
          <div className="page__meta">
            <span className="page__meta-item">
              <i className="bi bi-file-earmark"></i>
              {filteredReports.length} reports
            </span>
            <span className="page__meta-item">
              <i className="bi bi-clock-history"></i>
              {recentCount} generated in last 7 days
            </span>
          </div>
        </div>
        <div className="page__header-actions">
          <div style={{ display: "flex", gap: "var(--sp-2)", flexWrap: "wrap", alignItems: "center" }}>
            <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="select" style={{ maxWidth: "140px" }}>
              <option value="forecast">Forecast</option>
              <option value="sales">Sales</option>
              <option value="performance">Performance</option>
              <option value="recommendations">Recommendations</option>
            </select>
            <select value={format} onChange={(e) => setFormat(e.target.value)} className="select" style={{ maxWidth: "120px" }}>
              <option value="pdf">PDF</option>
              <option value="excel">Excel</option>
            </select>
            <button className="btn btn--primary" onClick={handleGenerate} disabled={generating}>
              <i className={`bi ${generating ? "bi-hourglass-split" : "bi-file-earmark-plus"}`} />
              {generating ? "Generating..." : "Generate Report"}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card__header">
            <div className="kpi-card__icon">
              <i className="bi bi-files"></i>
            </div>
          </div>
          <div className="kpi-card__label">Total Reports</div>
          <div className="kpi-card__value">{totalReports}</div>
          <div className="kpi-card__sub">{recentCount} generated recently</div>
        </div>

        <div className="kpi-card kpi-card--info">
          <div className="kpi-card__header">
            <div className="kpi-card__icon" style={{ background: "var(--c-critical-bg)", color: "var(--c-critical)" }}>
              <i className="bi bi-filetype-pdf"></i>
            </div>
          </div>
          <div className="kpi-card__label">PDF Reports</div>
          <div className="kpi-card__value">{pdfCount}</div>
          <div className="kpi-card__sub">{totalReports > 0 ? `${Math.round((pdfCount / totalReports) * 100)}% of total` : "No PDFs"}</div>
        </div>

        <div className="kpi-card kpi-card--success">
          <div className="kpi-card__header">
            <div className="kpi-card__icon" style={{ background: "var(--c-success-bg)", color: "var(--c-success)" }}>
              <i className="bi bi-file-earmark-excel"></i>
            </div>
          </div>
          <div className="kpi-card__label">Excel Reports</div>
          <div className="kpi-card__value">{excelCount}</div>
          <div className="kpi-card__sub">{totalReports > 0 ? `${Math.round((excelCount / totalReports) * 100)}% of total` : "No Excel files"}</div>
        </div>

        <div className="kpi-card kpi-card--warning">
          <div className="kpi-card__header">
            <div className="kpi-card__icon">
              <i className="bi bi-calendar3"></i>
            </div>
          </div>
          <div className="kpi-card__label">Latest Report</div>
          <div className="kpi-card__value" style={{ fontSize: "var(--text-base)" }}>
            {reports.length > 0 ? formatDate(reports[0]?.created_at) : "—"}
          </div>
          <div className="kpi-card__sub">{reports.length > 0 ? reports[0]?.title || "No title" : "No reports"}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="panel" style={{ marginBottom: "var(--sp-4)" }}>
        <div className="panel__body">
          <div className="filter-bar">
            <span className="filter-bar__label">
              <i className="bi bi-funnel"></i> Filters
            </span>

            {/* Search */}
            <div className="input-wrap" style={{ flex: "1", minWidth: "180px" }}>
              <i className="bi bi-search input-icon"></i>
              <input
                type="text"
                className="input"
                placeholder="Search by title, type, or generator..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Date Range Filter */}
            <select className="select" style={{ maxWidth: "150px" }} value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
              <option value="last90">Last 90 Days</option>
              <option value="last365">Last Year</option>
              <option value="all">All Time</option>
            </select>

            {/* Format Filter */}
            <select className="select" style={{ maxWidth: "140px" }} value={formatFilter} onChange={(e) => setFormatFilter(e.target.value)}>
              <option value="all">All Formats</option>
              {formats.map((f) => (
                <option key={f} value={f}>
                  {f.toUpperCase()}
                </option>
              ))}
            </select>

            {/* Type Filter */}
            {types.length > 0 && (
              <select className="select" style={{ maxWidth: "160px" }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="all">All Types</option>
                {types.map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            )}

            {/* Status Filter */}
            <select className="select" style={{ maxWidth: "140px" }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="generating">Generating</option>
              <option value="failed">Failed</option>
            </select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button className="btn btn--ghost btn--sm" onClick={clearFilters}>
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
              Showing <strong>{currentItems.length}</strong> of <strong>{filteredReports.length}</strong> reports
              {filteredReports.length !== reports.length && (
                <span style={{ marginLeft: "var(--sp-2)", color: "var(--c-text-muted)" }}>(filtered from {reports.length})</span>
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
                  <th>Title</th>
                  <th>Type</th>
                  <th>Format</th>
                  <th>Generated By</th>
                  <th>Created</th>
                  <th>Status</th>
                  <th style={{ width: "100px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((r) => {
                  const statusConfig = getStatusConfig(r.status);
                  const formatIcon = getFormatIcon(r.report_format);
                  const formatColor = getFormatColor(r.report_format);

                  return (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          <i className={formatIcon} style={{ color: formatColor, marginRight: "var(--sp-2)" }}></i>
                          {r.title}
                        </div>
                        {r.description && (
                          <div style={{ fontSize: "var(--text-xs)", color: "var(--c-text-muted)", marginTop: "2px" }}>{r.description}</div>
                        )}
                      </td>
                      <td>
                        <span className="badge badge--info">{r.report_type ? r.report_type.charAt(0).toUpperCase() + r.report_type.slice(1) : "—"}</span>
                      </td>
                      <td>
                        <span className="badge badge--default">{r.report_format?.toUpperCase() || "—"}</span>
                      </td>
                      <td>{r.generated_by_name || "—"}</td>
                      <td className="is-mono" style={{ fontSize: "var(--text-xs)" }}>
                        {formatDate(r.created_at)}
                      </td>
                      <td>
                        <span className={`status-dot ${statusConfig.dot}`}>{statusConfig.label}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "var(--sp-1)" }}>
                          {r.status === "completed" && (
                            <button className="btn btn--primary btn--xs" title="Download report" onClick={() => handleDownload(r.id)}>
                              <i className="bi bi-download"></i>
                            </button>
                          )}
                          <button className="btn btn--ghost btn--xs" title="View details">
                            <i className="bi bi-eye"></i>
                          </button>
                          {r.status === "failed" && (
                            <button className="btn btn--ghost btn--xs" title="Retry" style={{ color: "var(--c-critical)" }}>
                              <i className="bi bi-arrow-repeat"></i>
                            </button>
                          )}
                        </div>
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
              <i className="bi bi-file-earmark-slides"></i>
            </div>
            <div className="empty-state__title">No reports found</div>
            <div className="empty-state__desc">
              {hasActiveFilters ? <>No reports match your current filters. Try adjusting your search criteria.</> : <>No reports have been generated yet. Click "Generate Report" to create your first report.</>}
            </div>
            {hasActiveFilters ? (
              <button className="btn btn--secondary" onClick={clearFilters}>
                <i className="bi bi-arrow-counterclockwise"></i> Clear Filters
              </button>
            ) : (
              <button className="btn btn--primary" onClick={handleGenerate} disabled={generating}>
                <i className={`bi ${generating ? "bi-hourglass-split" : "bi-file-earmark-plus"}`} />
                Generate Report
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        {filteredReports.length > itemsPerPage && (
          <div className="table-pagination">
            <div className="table-pagination__info">
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredReports.length)} of {filteredReports.length} entries
            </div>
            <div className="table-pagination__controls">
              <button className="page-btn" disabled={currentPage === 1} onClick={() => paginate(currentPage - 1)}>
                <i className="bi bi-chevron-left"></i>
              </button>
              {[...Array(totalPages)].map((_, index) => {
                const pageNumber = index + 1;
                if (pageNumber === 1 || pageNumber === totalPages || Math.abs(pageNumber - currentPage) <= 1) {
                  return (
                    <button key={pageNumber} className={`page-btn ${currentPage === pageNumber ? "is-active" : ""}`} onClick={() => paginate(pageNumber)}>
                      {pageNumber}
                    </button>
                  );
                }
                if (pageNumber === currentPage - 2 || pageNumber === currentPage + 2) {
                  return (
                    <span key={pageNumber} style={{ color: "var(--c-text-muted)", padding: "0 4px" }}>
                      …
                    </span>
                  );
                }
                return null;
              })}
              <button className="page-btn" disabled={currentPage === totalPages} onClick={() => paginate(currentPage + 1)}>
                <i className="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}