import React, { useEffect, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { dashboardAPI } from "../services/api";

const C = {
  red:       "#DC0019",
  redDark:   "#A8000F",
  redSubtle: "#FDE8EA",
  success:   "#1D7A45",
  successBg: "#E5F4EC",
  warning:   "#B56D00",
  warningBg: "#FEF3E2",
  info:      "#1B5DA8",
  infoBg:    "#E5EFFA",
  critical:  "#A10012",
  criticalBg:"#FDE8EA",
  muted:     "#CCCBC5",
  border:    "#E2E0D8",
  paper:     "#F5F5F3",
  surface:   "#FFFFFF",
  text:      "#1C1C1A",
  textMuted: "#6B6A64",
  charcoal:  "#1A1A1A",
};

const PALETTE = [C.red, C.info, C.success, C.warning, "#7C3AED", "#0D9488"];

const FONT = {
  display: '"Barlow Condensed", "Noto Sans", sans-serif',
  body:    '"Noto Sans", system-ui, -apple-system, sans-serif',
  mono:    '"JetBrains Mono", "Courier New", monospace',
};

const fmtKES = (v) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
  : v >= 1_000   ? `${(v / 1_000).toFixed(0)}K`
  : String(v ?? 0);

const fmtComma = (v) => Number(v ?? 0).toLocaleString("en-KE");

const SEV = {
  critical: { icon: "bi-exclamation-triangle-fill", cls: "recommendation-item--critical", badge: "badge--critical" },
  warning:  { icon: "bi-exclamation-circle-fill",   cls: "recommendation-item--warning",  badge: "badge--warning"  },
  info:     { icon: "bi-info-circle-fill",           cls: "recommendation-item--info",     badge: "badge--info"     },
  success:  { icon: "bi-check-circle-fill",          cls: "recommendation-item--success",  badge: "badge--success"  },
};

/* ── Shared axis tick styles ── */
const tickBody = { fontSize: 11, fill: C.textMuted, fontFamily: FONT.body };
const tickMono = { fontSize: 11, fill: C.textMuted, fontFamily: FONT.mono };

/* ── Dark tooltip shell ── */
function TipShell({ label, children }) {
  return (
    <div style={{
      background: C.charcoal, borderRadius: 8, padding: "9px 13px",
      fontSize: 11, boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
    }}>
      <div style={{ color: "rgba(255,255,255,0.5)", marginBottom: 5, fontFamily: FONT.body }}>{label}</div>
      {children}
    </div>
  );
}

function SalesTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <TipShell label={label}>
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
          <span style={{ color: "rgba(255,255,255,0.6)", fontFamily: FONT.body, minWidth: 56 }}>{p.name}:</span>
          <span style={{ color: "#fff", fontFamily: FONT.mono, fontWeight: 600 }}>
            {p.value != null ? `KES ${fmtKES(p.value)}` : "—"}
          </span>
        </div>
      ))}
    </TipShell>
  );
}

function BarTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <TipShell label={label}>
      <span style={{ color: "#fff", fontFamily: FONT.mono, fontWeight: 600 }}>
        {fmtComma(payload[0]?.value)} units
      </span>
    </TipShell>
  );
}

/* ── Accuracy radial gauge ── */
function AccuracyGauge({ pct = 0 }) {
  const R = 50, cx = 68, cy = 68;
  const circ = 2 * Math.PI * R;
  const arc  = (circ * 270) / 360;
  const fill = arc * (Math.min(pct, 100) / 100);
  const color = pct >= 85 ? C.success : pct >= 70 ? C.warning : C.critical;
  return (
    <svg viewBox="0 0 136 136" style={{ width: 130, height: 130 }}
      aria-label={`Forecast accuracy ${pct.toFixed(1)}%`}>
      <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.border} strokeWidth="11"
        strokeDasharray={`${arc} ${circ - arc}`} strokeDashoffset={arc * 0.25}
        strokeLinecap="round" transform={`rotate(135 ${cx} ${cy})`} />
      <circle cx={cx} cy={cy} r={R} fill="none" stroke={color} strokeWidth="11"
        strokeDasharray={`${fill} ${circ - fill}`} strokeDashoffset={arc * 0.25}
        strokeLinecap="round" transform={`rotate(135 ${cx} ${cy})`}
        style={{ transition: "stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)" }} />
      <text x={cx} y={cy - 3} textAnchor="middle" fill={color}
        style={{ fontFamily: FONT.mono, fontSize: 17, fontWeight: 700 }}>
        {pct.toFixed(1)}%
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill={C.textMuted}
        style={{ fontFamily: FONT.body, fontSize: 10 }}>
        accuracy
      </text>
    </svg>
  );
}

/* ── KPI card ── */
function KpiCard({ icon, label, value, trend, trendDir = "up", variant = "" }) {
  return (
    <div className={`kpi-card${variant ? ` kpi-card--${variant}` : ""}`}>
      <div className="kpi-card__header">
        <div className="kpi-card__icon"><i className={`bi ${icon}`} aria-hidden="true" /></div>
        {trend != null && (
          <span className={`kpi-card__trend kpi-card__trend--${trendDir}`}>
            <i className={`bi bi-arrow-${trendDir === "up" ? "up" : "down"}-short`} />{trend}
          </span>
        )}
      </div>
      <div className="kpi-card__label" style={{ fontFamily: FONT.body }}>{label}</div>
      <div className="kpi-card__value" style={{ fontFamily: FONT.mono }}>{value}</div>
    </div>
  );
}

/* ── Empty chart placeholder ── */
function EmptyChart({ height = 160 }) {
  return (
    <div style={{
      height, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 6, color: C.textMuted,
    }}>
      <i className="bi bi-bar-chart-line" style={{ fontSize: 24, opacity: 0.3 }} aria-hidden="true" />
      <span style={{ fontFamily: FONT.body, fontSize: 12 }}>No data available</span>
    </div>
  );
}

/* ══════════════════════════════════════
   DASHBOARD
══════════════════════════════════════ */
export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [period, setPeriod]   = useState("30d");

  useEffect(() => {
    setLoading(true);
    setError(null);
    dashboardAPI
      .summary()
      .then(({ data }) => setSummary(data))
      .catch(() => setError("Failed to load dashboard data. Please try again."))
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) return (
    <div className="spinner-wrap" style={{ minHeight: "60vh" }}>
      <div className="spinner spinner--lg" />
      <span style={{ fontFamily: FONT.body, color: C.textMuted }}>Crunching the numbers…</span>
    </div>
  );

  if (error) return (
    <div className="alert alert--critical" style={{ marginTop: "var(--sp-8)" }}>
      <i className="bi bi-exclamation-triangle-fill alert__icon" />
      <div className="alert__body">
        <div className="alert__title">Unable to load dashboard</div>
        {error}
      </div>
    </div>
  );

  /* ── Data extraction ── */
  const totalSales     = Number(summary?.total_sales ?? 0);
  const totalUnits     = Number(summary?.total_units_sold ?? 0);
  const activeProducts = summary?.active_products ?? 0;
  const accuracyPct    = Number(summary?.forecast_accuracy_pct ?? 0);
  const regional       = summary?.regional_performance ?? [];
  const recs           = summary?.recent_recommendations ?? [];
  const topProducts    = summary?.top_products ?? [];

  /* Normalise trend data (demand_trend from serializer) */
  const trendData = (summary?.demand_trend ?? []).map((d) => ({
    month:    d.month ?? d.date ?? d.period ?? "—",
    actual:   d.actual   != null ? Number(d.actual)   : d.quantity != null ? Number(d.quantity) : null,
    forecast: d.forecast != null ? Number(d.forecast) : null,
  }));

  /* Regional bar */
  const barData = regional.map((r) => ({
    name:    r.region__name ?? r.name ?? "—",
    units:   Number(r.total_qty ?? r.units ?? 0),
    revenue: Number(r.total_rev ?? r.revenue ?? 0),
  }));
  const totalQty = barData.reduce((s, r) => s + r.units, 0) || 1;

  /* Donut — prefer topProducts, fall back to regional */
  const donutSrc = (topProducts.length ? topProducts : barData.map((r) => ({ name: r.name, units: r.units }))).slice(0, 5);
  const donutTotal = donutSrc.reduce((s, p) => s + Number(p.units ?? 0), 0) || 1;

  /* ── Layout constants ── */
  const panelStyle = {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    overflow: "hidden",
  };

  const phStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderBottom: `1px solid ${C.border}`,
  };

  const ptStyle = {
    fontFamily: FONT.display,
    fontWeight: 700,
    fontSize: 14,
    color: C.text,
    letterSpacing: "0.02em",
  };

  const psStyle = {
    fontFamily: FONT.body,
    fontSize: 11,
    color: C.textMuted,
    marginTop: 2,
  };

  return (
    <div className="page">

      {/* ── Page header ── */}
      <div className="page__header page__header--with-action" style={{ marginBottom: "var(--sp-5)" }}>
        <div>
          <div className="page__header-eyebrow">Overview</div>
          <h1>Dashboard</h1>
          <p style={{ fontFamily: FONT.body }}>Real-time performance across all CCBA regions.</p>
        </div>
        <div className="page__header-actions">
          <div className="tabs--pill tabs" style={{ display: "inline-flex" }}>
            {["7d", "30d", "90d", "1y"].map((p) => (
              <button key={p} className={`tab${period === p ? " is-active" : ""}`}
                onClick={() => setPeriod(p)} style={{ fontFamily: FONT.body }}>{p}</button>
            ))}
          </div>
          <button className="btn btn--secondary btn--sm" style={{ fontFamily: FONT.body }}>
            <i className="bi bi-download" />Export
          </button>
        </div>
      </div>

      {/* ══ ROW 1: KPIs ══ */}
      <div className="kpi-grid" style={{ marginBottom: 16 }}>
        <KpiCard icon="bi-cash-coin"         label="Total Sales (KES)"    value={`KES ${fmtKES(totalSales)}`}      trend={null} />
        <KpiCard icon="bi-boxes"             label="Units Sold"            value={fmtComma(totalUnits)}              trend={null} trendDir="up" variant="success" />
        <KpiCard icon="bi-grid-3x3-gap-fill" label="Active Products"       value={activeProducts}                    trend={null} trendDir="up" variant="info" />
        <KpiCard icon="bi-bullseye"          label="Forecast Accuracy"     value={accuracyPct ? `${accuracyPct.toFixed(1)}%` : "—"}
          trend={accuracyPct ? (accuracyPct >= 85 ? "On target" : "Below target") : null}
          trendDir={accuracyPct >= 85 ? "up" : "down"}
          variant={accuracyPct >= 85 ? "success" : ""} />
      </div>

      {/* ══ ROW 2: Sales trend (2/3) + Gauge (1/3) ══ */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginBottom: 12 }}>

        {/* Sales trend */}
        <div style={panelStyle}>
          <div style={phStyle}>
            <div>
              <div style={ptStyle}>Sales vs Forecast</div>
              <div style={psStyle}>Monthly demand — actual vs model prediction</div>
            </div>
            <div style={{ display: "flex", gap: 14 }}>
              {[{ color: C.red, label: "Actual", dashed: false }, { color: C.muted, label: "Forecast", dashed: true }]
                .map(({ color, label, dashed }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontFamily: FONT.body, color: C.textMuted }}>
                    <svg width="18" height="10" aria-hidden="true">
                      <line x1="0" y1="5" x2="18" y2="5" stroke={color} strokeWidth="2" strokeDasharray={dashed ? "4 3" : "none"} />
                    </svg>
                    {label}
                  </div>
                ))}
            </div>
          </div>
          <div style={{ padding: "14px 16px" }}>
            {trendData.length === 0 ? <EmptyChart height={200} /> : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trendData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.red}  stopOpacity={0.15} />
                      <stop offset="95%" stopColor={C.red}  stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gF" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={C.info} stopOpacity={0.08} />
                      <stop offset="95%" stopColor={C.info} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                  <XAxis dataKey="month" tick={tickBody} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtKES} tick={tickMono} axisLine={false} tickLine={false} width={48} />
                  <Tooltip content={<SalesTooltip />} />
                  <Area type="monotone" dataKey="actual" name="Actual" stroke={C.red} strokeWidth={2.5}
                    fill="url(#gA)" dot={false} activeDot={{ r: 4, fill: C.red, strokeWidth: 0 }} connectNulls={false} />
                  {trendData.some((d) => d.forecast != null) && (
                    <Area type="monotone" dataKey="forecast" name="Forecast" stroke={C.muted} strokeWidth={2}
                      strokeDasharray="5 4" fill="url(#gF)" dot={false}
                      activeDot={{ r: 4, fill: C.muted, strokeWidth: 0 }} />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Accuracy gauge */}
        <div style={{ ...panelStyle, display: "flex", flexDirection: "column" }}>
          <div style={phStyle}>
            <div>
              <div style={ptStyle}>Forecast Accuracy</div>
              <div style={psStyle}>30-day rolling average</div>
            </div>
          </div>
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 14, padding: "16px 20px",
          }}>
            <AccuracyGauge pct={accuracyPct} />
            <div style={{ width: "100%" }}>
              {[
                { label: "MAPE", value: summary?.mape ? `${Number(summary.mape).toFixed(1)}%` : "—" },
                { label: "RMSE", value: summary?.rmse ? fmtComma(summary.rmse) : "—" },
                { label: "Bias", value: summary?.bias ? `${Number(summary.bias) > 0 ? "+" : ""}${Number(summary.bias).toFixed(1)}%` : "—",
                  color: summary?.bias && Number(summary.bias) <= 0 ? C.success : undefined },
              ].map(({ label, value, color }, i, arr) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : "none",
                  fontSize: 12,
                }}>
                  <span style={{ fontFamily: FONT.body, color: C.textMuted }}>{label}</span>
                  <span style={{ fontFamily: FONT.mono, fontWeight: 600, color: color ?? C.text }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ ROW 3: Left 2-col grid + Right table ══ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, alignItems: "start" }}>

        {/* ── Regional bar chart ── */}
        <div style={panelStyle}>
          <div style={phStyle}>
            <div>
              <div style={ptStyle}>Regional Performance</div>
              <div style={psStyle}>Units sold by region</div>
            </div>
          </div>
          <div style={{ padding: "14px 16px" }}>
            {barData.length === 0 ? <EmptyChart height={180} /> : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={barData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="28%">
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                  <XAxis dataKey="name" tick={{ ...tickBody, fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => v.slice(0, 3)} />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tick={tickMono}
                    axisLine={false} tickLine={false} width={38} />
                  <Tooltip content={<BarTip />} />
                  <Bar dataKey="units" radius={[3, 3, 0, 0]}>
                    {barData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Product mix donut ── */}
        <div style={panelStyle}>
          <div style={phStyle}>
            <div>
              <div style={ptStyle}>Product Mix</div>
              <div style={psStyle}>Top SKUs by units</div>
            </div>
          </div>
          <div style={{ padding: "14px 16px" }}>
            {donutSrc.length === 0 ? <EmptyChart height={180} /> : (
              <>
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie data={donutSrc} cx="50%" cy="50%" innerRadius={40} outerRadius={60}
                      paddingAngle={2} dataKey="units" nameKey="name">
                      {donutSrc.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} stroke={C.surface} strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v, name) => [`${fmtComma(v)} units`, name]}
                      contentStyle={{
                        background: C.charcoal, border: "none", borderRadius: 8,
                        color: "#fff", fontSize: 11, fontFamily: FONT.mono,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 4 }}>
                  {donutSrc.map((p, i) => {
                    const pct = ((Number(p.units) / donutTotal) * 100).toFixed(1);
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ width: 9, height: 9, borderRadius: 2, flexShrink: 0, background: PALETTE[i % PALETTE.length] }} />
                        <span style={{ flex: 1, fontSize: 11, fontFamily: FONT.body, color: C.textMuted, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{p.name}</span>
                        <span style={{ fontSize: 11, fontFamily: FONT.mono, fontWeight: 600, color: C.text }}>{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Right column: Recommendations + Regional table ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* AI Recommendations */}
          <div style={panelStyle}>
            <div style={phStyle}>
              <div>
                <div style={ptStyle}>AI Recommendations</div>
                <div style={psStyle}>Flagged items</div>
              </div>
              <a href="/recommendations" className="btn btn--ghost btn--sm" style={{ fontFamily: FONT.body, fontSize: 11 }}>
                All <i className="bi bi-arrow-right" />
              </a>
            </div>
            <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
              {recs.length === 0 ? (
                <div style={{ padding: "12px 0", textAlign: "center", color: C.textMuted, fontFamily: FONT.body, fontSize: 12 }}>
                  No recommendations at this time
                </div>
              ) : recs.slice(0, 3).map((rec) => {
                const s = SEV[rec.severity] ?? SEV.info;
                return (
                  <div key={rec.id} className={`recommendation-item ${s.cls}`} style={{ padding: "8px 10px" }}>
                    <div className="recommendation-item__icon" style={{ width: 28, height: 28, fontSize: 13 }}>
                      <i className={`bi ${s.icon}`} aria-hidden="true" />
                    </div>
                    <div className="recommendation-item__body">
                      <div style={{ marginBottom: 2 }}>
                        <span className={`badge ${s.badge}`} style={{ fontFamily: FONT.body, fontSize: 9 }}>{rec.severity}</span>
                        {rec.product_name && (
                          <span style={{ marginLeft: 5, fontSize: 10, fontFamily: FONT.body, color: C.textMuted }}>
                            {rec.product_name}{rec.region_name ? ` · ${rec.region_name}` : ""}
                          </span>
                        )}
                      </div>
                      <div style={{ fontFamily: FONT.body, fontSize: 11, color: C.textMuted, lineHeight: 1.4 }}>
                        {rec.message}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Regional breakdown table */}
          <div style={panelStyle}>
            <div style={phStyle}>
              <div>
                <div style={ptStyle}>Regional Breakdown</div>
                <div style={psStyle}>Units & revenue</div>
              </div>
              <a href="/regions" className="btn btn--ghost btn--sm" style={{ fontFamily: FONT.body, fontSize: 11 }}>
                <i className="bi bi-geo-alt-fill" />
              </a>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: C.paper }}>
                    {["Region", "Units", "Revenue", "Share"].map((h) => (
                      <th key={h} style={{
                        textAlign: "left", padding: "8px 12px",
                        fontSize: 10, fontFamily: FONT.body, fontWeight: 700,
                        textTransform: "uppercase", letterSpacing: "0.06em",
                        color: C.textMuted, borderBottom: `1px solid ${C.border}`,
                        whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {barData.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: 16, textAlign: "center", color: C.textMuted, fontFamily: FONT.body }}>No data</td></tr>
                  ) : barData.map((r, i) => {
                    const share = ((r.units / totalQty) * 100).toFixed(1);
                    const statusCls = i < 2 ? "badge--success" : i === 2 ? "badge--warning" : "badge--default";
                    const statusLbl = i < 2 ? "On track" : i === 2 ? "Review" : "Monitor";
                    return (
                      <tr key={r.name} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "9px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
                            <span style={{ fontFamily: FONT.body, fontWeight: 600, fontSize: 12 }}>{r.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: "9px 12px", fontFamily: FONT.mono, fontSize: 11 }}>{fmtComma(r.units)}</td>
                        <td style={{ padding: "9px 12px", fontFamily: FONT.mono, fontSize: 11 }}>
                          KES {fmtKES(r.revenue)}
                        </td>
                        <td style={{ padding: "9px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 70 }}>
                            <div style={{ flex: 1, height: 4, borderRadius: 99, background: C.paper, overflow: "hidden" }}>
                              <div style={{ width: `${share}%`, height: "100%", background: PALETTE[i % PALETTE.length], borderRadius: 99 }} />
                            </div>
                            <span style={{ fontFamily: FONT.mono, fontSize: 10, color: C.textMuted, flexShrink: 0 }}>{share}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}