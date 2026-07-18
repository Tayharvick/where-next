"use client";

function ClimateChart({ monthly }) {
  if (!monthly?.length) return null;

  const width = 520;
  const height = 160;
  const pad = { top: 16, right: 12, bottom: 28, left: 36 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const highs = monthly.map((m) => m.high).filter(Number.isFinite);
  const lows = monthly.map((m) => m.low).filter(Number.isFinite);
  const minT = Math.min(...lows) - 5;
  const maxT = Math.max(...highs) + 5;
  const range = maxT - minT || 1;

  const x = (i) => pad.left + (i / (monthly.length - 1)) * innerW;
  const y = (t) => pad.top + innerH - ((t - minT) / range) * innerH;

  const highPoints = monthly.map((m, i) => `${x(i)},${y(m.high)}`).join(" ");
  const lowPoints = monthly.map((m, i) => `${x(i)},${y(m.low)}`).join(" ");

  return (
    <div className="climate-chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="climate-chart" aria-label="12-month average high and low temperatures">
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const t = minT + range * pct;
          const yy = y(t);
          return (
            <g key={pct}>
              <line x1={pad.left} x2={width - pad.right} y1={yy} y2={yy} className="climate-chart-grid" />
              <text x={pad.left - 6} y={yy + 3} textAnchor="end" className="climate-chart-axis">
                {Math.round(t)}°
              </text>
            </g>
          );
        })}
        <polyline points={highPoints} className="climate-chart-line climate-chart-high" fill="none" />
        <polyline points={lowPoints} className="climate-chart-line climate-chart-low" fill="none" />
        {monthly.map((m, i) => (
          <g key={m.month}>
            <circle cx={x(i)} cy={y(m.high)} r="2.5" className="climate-chart-dot climate-chart-dot-high" />
            <circle cx={x(i)} cy={y(m.low)} r="2.5" className="climate-chart-dot climate-chart-dot-low" />
            <text x={x(i)} y={height - 8} textAnchor="middle" className="climate-chart-month">
              {m.month}
            </text>
          </g>
        ))}
      </svg>
      <div className="climate-chart-legend">
        <span><i className="climate-legend-swatch high" />Avg high</span>
        <span><i className="climate-legend-swatch low" />Avg low</span>
      </div>
    </div>
  );
}

function ClimateHighlights({ items }) {
  if (!items?.length) return null;
  return (
    <div className="climate-highlights">
      {items.map((item) => (
        <div key={item.text} className="climate-highlight">
          <span className="climate-highlight-icon" aria-hidden="true">{item.icon}</span>
          <span>{item.text}</span>
        </div>
      ))}
    </div>
  );
}

function ClimateStats({ stats }) {
  if (!stats?.length) return null;
  return (
    <div className="climate-stats">
      {stats.map((stat) => (
        <div key={stat.label} className="climate-stat">
          <div className="climate-stat-label">{stat.label}</div>
          <div className="climate-stat-value">{stat.value}</div>
        </div>
      ))}
    </div>
  );
}

function ClimateSkeleton() {
  return (
    <div className="climate-panel climate-panel-loading">
      <div className="climate-skel-title" />
      <div className="climate-skel-snapshot" />
      <div className="climate-skel-chart" />
      <div className="climate-skel-row" />
    </div>
  );
}

export default function ClimateAtAGlance({ data, loading }) {
  if (loading) return <ClimateSkeleton />;
  if (!data?.ok || !data.monthly?.length) return null;

  const hasExtras =
    data.highlights?.length ||
    data.stats?.length ||
    data.bestTimes ||
    data.thingsToKnow?.length ||
    data.considerations?.length;

  if (!hasExtras && !data.monthly?.length) return null;

  return (
    <aside className="climate-panel" aria-label="Climate at a Glance">
      <div className="climate-panel-head">
        <div className="climate-panel-label">Climate at a Glance</div>
      </div>

      {data.snapshot && <p className="climate-snapshot">{data.snapshot}</p>}

      <ClimateChart monthly={data.monthly} />
      <ClimateHighlights items={data.highlights} />
      <ClimateStats stats={data.stats} />

      {data.bestTimes && (
        <div className="climate-card">
          <div className="climate-card-label">Best Times to Enjoy</div>
          <div className="climate-card-value">{data.bestTimes.months}</div>
          {data.bestTimes.note && <p className="climate-card-copy">{data.bestTimes.note}</p>}
        </div>
      )}

      {data.thingsToKnow?.length > 0 && (
        <div className="climate-subsection">
          <div className="climate-subsection-label">Things to Know</div>
          <ul className="climate-list">
            {data.thingsToKnow.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {data.considerations?.length > 0 && (
        <div className="climate-subsection">
          <div className="climate-subsection-label">Climate Considerations</div>
          <ul className="climate-list climate-list-warn">
            {data.considerations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
