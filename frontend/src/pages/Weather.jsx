import React, { useEffect, useState } from "react";
import { weatherAPI } from "../services/api";
import Spinner from "../components/Spinner";

export default function Weather() {
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [dateRange, setDateRange] = useState("last30");
  const [tempFilter, setTempFilter] = useState("all");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Extracted filter options
  const [regions, setRegions] = useState([]);
  
  // Stats
  const [stats, setStats] = useState({
    avgTemp: 0,
    avgRainfall: 0,
    avgHumidity: 0,
    maxTemp: 0,
    minTemp: 0,
    totalRainfall: 0
  });

  useEffect(() => {
    weatherAPI
      .list()
      .then(({ data }) => {
        const results = data.results || data;
        setRecords(results);
        setFilteredRecords(results);
        
        // Extract unique regions
        const uniqueRegions = [...new Set(results.map(w => w.region_name).filter(Boolean))];
        setRegions(uniqueRegions);
      })
      .finally(() => setLoading(false));
  }, []);

  // Calculate statistics
  useEffect(() => {
    if (filteredRecords.length === 0) {
      setStats({
        avgTemp: 0,
        avgRainfall: 0,
        avgHumidity: 0,
        maxTemp: 0,
        minTemp: 0,
        totalRainfall: 0
      });
      return;
    }

    const temps = filteredRecords.map(w => Number(w.temperature)).filter(t => !isNaN(t));
    const rainfalls = filteredRecords.map(w => Number(w.rainfall)).filter(r => !isNaN(r));
    const humidities = filteredRecords.map(w => Number(w.humidity)).filter(h => !isNaN(h));

    setStats({
      avgTemp: temps.length > 0 ? temps.reduce((a, b) => a + b, 0) / temps.length : 0,
      avgRainfall: rainfalls.length > 0 ? rainfalls.reduce((a, b) => a + b, 0) / rainfalls.length : 0,
      avgHumidity: humidities.length > 0 ? humidities.reduce((a, b) => a + b, 0) / humidities.length : 0,
      maxTemp: temps.length > 0 ? Math.max(...temps) : 0,
      minTemp: temps.length > 0 ? Math.min(...temps) : 0,
      totalRainfall: rainfalls.length > 0 ? rainfalls.reduce((a, b) => a + b, 0) : 0
    });
  }, [filteredRecords]);

  // Filter logic
  useEffect(() => {
    let filtered = records;

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(w =>
        w.region_name?.toLowerCase().includes(term) ||
        w.weather_date?.includes(term)
      );
    }

    // Region filter
    if (regionFilter !== "all") {
      filtered = filtered.filter(w => w.region_name === regionFilter);
    }

    // Date range filter
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
        filtered = filtered.filter(w => new Date(w.weather_date) >= cutoffDate);
      }
    }

    // Temperature filter
    if (tempFilter !== "all") {
      const temp = Number(tempFilter);
      filtered = filtered.filter(w => {
        const t = Number(w.temperature);
        return !isNaN(t) && t >= temp;
      });
    }

    setFilteredRecords(filtered);
    setCurrentPage(1);
  }, [searchTerm, regionFilter, dateRange, tempFilter, records]);

  // Reset filters
  const clearFilters = () => {
    setSearchTerm("");
    setRegionFilter("all");
    setDateRange("last30");
    setTempFilter("all");
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm || 
    regionFilter !== "all" || 
    dateRange !== "last30" || 
    tempFilter !== "all";

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRecords.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Format date
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get weather icon based on conditions
  const getWeatherIcon = (temp, rainfall, humidity) => {
    const t = Number(temp);
    const r = Number(rainfall);
    const h = Number(humidity);
    
    if (r > 20) return 'bi bi-cloud-rain-heavy';
    if (r > 5) return 'bi bi-cloud-rain';
    if (h > 80) return 'bi bi-cloud-haze';
    if (t > 30) return 'bi bi-sun';
    if (t > 20) return 'bi bi-cloud-sun';
    return 'bi bi-cloud';
  };

  // Get weather condition label
  const getWeatherCondition = (temp, rainfall, humidity) => {
    const t = Number(temp);
    const r = Number(rainfall);
    const h = Number(humidity);
    
    if (r > 20) return 'Heavy Rain';
    if (r > 5) return 'Light Rain';
    if (h > 80) return 'Humid';
    if (t > 30) return 'Hot & Sunny';
    if (t > 20) return 'Mild & Sunny';
    return 'Cool & Cloudy';
  };

  // Get temperature color class
  const getTempColor = (temp) => {
    const t = Number(temp);
    if (t > 30) return 'text-critical';
    if (t > 25) return 'text-warning';
    if (t > 15) return 'text-success';
    return 'text-info';
  };

  if (loading) {
    return (
      <div className="app-loading">
        <Spinner size="lg" label="Loading weather records..." />
      </div>
    );
  }

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page__header">
        <div className="page__header-content">
          <div className="page__header-eyebrow">Environmental Data</div>
          <h1>Weather Records</h1>
          <p>Regional weather data feeding into the demand forecasting model.</p>
          <div className="page__meta">
            <span className="page__meta-item">
              <i className="bi bi-calendar3"></i>
              {filteredRecords.length > 0 ? (
                <>
                  {formatDate(filteredRecords[0]?.weather_date)} - {formatDate(filteredRecords[filteredRecords.length - 1]?.weather_date)}
                </>
              ) : (
                "No data available"
              )}
            </span>
            <span className="page__meta-item">
              <i className="bi bi-cloud"></i>
              {filteredRecords.length} weather records
            </span>
            <span className="page__meta-item">
              <i className="bi bi-geo-alt"></i>
              {regions.length} regions
            </span>
          </div>
        </div>
        <div className="page__header-actions">
          <button className="btn btn--secondary" onClick={() => window.print()}>
            <i className="bi bi-printer"></i>
          </button>
        </div>
      </div>

      {/* KPI Cards - Weather Dashboard */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card__header">
            <div className="kpi-card__icon" style={{ background: 'var(--c-info-bg)', color: 'var(--c-info)' }}>
              <i className="bi bi-thermometer-half"></i>
            </div>
          </div>
          <div className="kpi-card__label">Average Temperature</div>
          <div className="kpi-card__value">{stats.avgTemp.toFixed(1)}°C</div>
          <div className="kpi-card__sub">
            Range: {stats.minTemp.toFixed(1)}°C - {stats.maxTemp.toFixed(1)}°C
          </div>
        </div>

        <div className="kpi-card kpi-card--info">
          <div className="kpi-card__header">
            <div className="kpi-card__icon" style={{ background: 'var(--c-info-bg)', color: 'var(--c-info)' }}>
              <i className="bi bi-droplet"></i>
            </div>
          </div>
          <div className="kpi-card__label">Average Rainfall</div>
          <div className="kpi-card__value">{stats.avgRainfall.toFixed(1)} mm</div>
          <div className="kpi-card__sub">
            Total: {stats.totalRainfall.toFixed(1)} mm
          </div>
        </div>

        <div className="kpi-card kpi-card--success">
          <div className="kpi-card__header">
            <div className="kpi-card__icon" style={{ background: 'var(--c-success-bg)', color: 'var(--c-success)' }}>
              <i className="bi bi-water"></i>
            </div>
          </div>
          <div className="kpi-card__label">Average Humidity</div>
          <div className="kpi-card__value">{stats.avgHumidity.toFixed(1)}%</div>
          <div className="kpi-card__sub">
            {filteredRecords.length} readings
          </div>
        </div>

        <div className="kpi-card kpi-card--warning">
          <div className="kpi-card__header">
            <div className="kpi-card__icon" style={{ background: 'var(--c-warning-bg)', color: 'var(--c-warning)' }}>
              <i className="bi bi-cloud-sun"></i>
            </div>
          </div>
          <div className="kpi-card__label">Current Conditions</div>
          <div className="kpi-card__value" style={{ fontSize: 'var(--text-base)' }}>
            {filteredRecords.length > 0 ? 
              getWeatherCondition(
                filteredRecords[filteredRecords.length - 1]?.temperature,
                filteredRecords[filteredRecords.length - 1]?.rainfall,
                filteredRecords[filteredRecords.length - 1]?.humidity
              ) : 
              'No data'
            }
          </div>
          <div className="kpi-card__sub">
            {filteredRecords.length > 0 ? 
              formatDate(filteredRecords[filteredRecords.length - 1]?.weather_date) : 
              'N/A'
            }
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
                placeholder="Search by region or date..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Date Range Filter */}
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

            {/* Temperature Filter */}
            <select
              className="select"
              style={{ maxWidth: '150px' }}
              value={tempFilter}
              onChange={(e) => setTempFilter(e.target.value)}
            >
              <option value="all">All Temperatures</option>
              <option value="30">Above 30°C (Hot)</option>
              <option value="25">Above 25°C (Warm)</option>
              <option value="20">Above 20°C (Mild)</option>
              <option value="15">Above 15°C (Cool)</option>
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
              <strong>{filteredRecords.length}</strong> weather records
              {filteredRecords.length !== records.length && (
                <span style={{ marginLeft: 'var(--sp-2)', color: 'var(--c-text-muted)' }}>
                  (filtered from {records.length})
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
                  <th>Region</th>
                  <th>Weather</th>
                  <th className="is-mono">Temp (°C)</th>
                  <th className="is-mono">Rainfall (mm)</th>
                  <th className="is-mono">Humidity (%)</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((w) => {
                  const weatherIcon = getWeatherIcon(w.temperature, w.rainfall, w.humidity);
                  const weatherCondition = getWeatherCondition(w.temperature, w.rainfall, w.humidity);
                  const tempColor = getTempColor(w.temperature);
                  
                  return (
                    <tr key={w.id}>
                      <td className="is-mono">
                        {formatDate(w.weather_date)}
                      </td>
                      <td>
                        <span className="badge badge--info">{w.region_name}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                          <i className={weatherIcon} style={{ fontSize: '18px', color: 'var(--c-info)' }}></i>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--c-text-muted)' }}>
                            {weatherCondition}
                          </span>
                        </div>
                      </td>
                      <td className={`is-mono ${tempColor}`} style={{ fontWeight: 600 }}>
                        {Number(w.temperature).toFixed(1)}
                      </td>
                      <td className="is-mono">
                        {Number(w.rainfall).toFixed(1)}
                        {Number(w.rainfall) > 20 && (
                          <span style={{ marginLeft: 'var(--sp-1)', color: 'var(--c-critical)' }}>
                            <i className="bi bi-exclamation-triangle"></i>
                          </span>
                        )}
                      </td>
                      <td className="is-mono">
                        {Number(w.humidity).toFixed(0)}
                        {Number(w.humidity) > 80 && (
                          <span style={{ marginLeft: 'var(--sp-1)', color: 'var(--c-warning)' }}>
                            <i className="bi bi-exclamation-triangle"></i>
                          </span>
                        )}
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
              <i className="bi bi-cloud-slash"></i>
            </div>
            <div className="empty-state__title">No weather records found</div>
            <div className="empty-state__desc">
              {hasActiveFilters ? (
                <>No weather records match your current filters. Try adjusting your search criteria.</>
              ) : (
                <>No weather data has been recorded yet. Weather data is essential for accurate demand forecasting.</>
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
        {filteredRecords.length > itemsPerPage && (
          <div className="table-pagination">
            <div className="table-pagination__info">
              Showing {indexOfFirstItem + 1} to{" "}
              {Math.min(indexOfLastItem, filteredRecords.length)} of{" "}
              {filteredRecords.length} entries
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