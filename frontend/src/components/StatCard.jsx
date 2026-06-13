import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

/**
 * StatCard displays a statistic with an icon, value, and optional trend indicator.
 * Props:
 * - icon: React component for the leading icon.
 * - title: String label for the stat.
 * - value: Number or string to display.
 * - trend: 'up' | 'down' | null indicating trend direction.
 * - trendValue: String showing change amount (e.g., '+5%').
 */
export default function StatCard({ icon: Icon, title, value, trend, trendValue }) {
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : null;
  const trendColor = trend === 'up' ? '#34d399' : trend === 'down' ? '#f87171' : 'transparent';

  return (
    <div className="stat-card glassmorphism">
      <div className="stat-icon">
        <Icon size={24} />
      </div>
      <div className="stat-content">
        <span className="stat-title">{title}</span>
        <span className="stat-value">{value}</span>
        {trend && (
          <span className="stat-trend" style={{ color: trendColor }}>
            <TrendIcon size={14} /> {trendValue}
          </span>
        )}
      </div>
    </div>
  );
}
