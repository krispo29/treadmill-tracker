import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit: string;
  subtitle?: string;
  icon: React.ReactNode;
  colorScheme?: 'cyan' | 'orange' | 'emerald' | 'purple' | 'amber';
  highlight?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  icon,
  colorScheme = 'cyan',
  highlight = false,
}) => {
  const colorMap = {
    cyan: {
      border: 'border-cyan-500/30 hover:border-cyan-500/50',
      text: 'text-cyan-400 glow-cyan',
      bgGlow: 'bg-cyan-500/5',
      badge: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
      iconBg: 'bg-cyan-500/20 text-cyan-400'
    },
    orange: {
      border: 'border-orange-500/30 hover:border-orange-500/50',
      text: 'text-orange-400 glow-orange',
      bgGlow: 'bg-orange-500/5',
      badge: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
      iconBg: 'bg-orange-500/20 text-orange-400'
    },
    emerald: {
      border: 'border-emerald-500/30 hover:border-emerald-500/50',
      text: 'text-emerald-400 glow-emerald',
      bgGlow: 'bg-emerald-500/5',
      badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
      iconBg: 'bg-emerald-500/20 text-emerald-400'
    },
    purple: {
      border: 'border-purple-500/30 hover:border-purple-500/50',
      text: 'text-purple-400',
      bgGlow: 'bg-purple-500/5',
      badge: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
      iconBg: 'bg-purple-500/20 text-purple-400'
    },
    amber: {
      border: 'border-amber-500/30 hover:border-amber-500/50',
      text: 'text-amber-400',
      bgGlow: 'bg-amber-500/5',
      badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
      iconBg: 'bg-amber-500/20 text-amber-400'
    }
  };

  const scheme = colorMap[colorScheme];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-slate-900/90 border p-4 sm:p-5 transition-all duration-200 ${
        scheme.border
      } ${highlight ? 'ring-2 ring-cyan-500/40 shadow-lg shadow-cyan-500/10' : ''}`}
    >
      {/* Background ambient glow */}
      <div className={`absolute -right-8 -bottom-8 w-32 h-32 rounded-full blur-3xl pointer-events-none ${scheme.bgGlow}`} />

      {/* Header with Title and Icon */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
          {title}
        </span>
        <div className={`p-2 rounded-xl text-base ${scheme.iconBg}`}>
          {icon}
        </div>
      </div>

      {/* Main Digital Value */}
      <div className="flex items-baseline gap-2 my-1">
        <span className={`text-4xl sm:text-5xl font-black digital-number ${scheme.text}`}>
          {value}
        </span>
        <span className={`text-xs sm:text-sm font-semibold px-2 py-0.5 rounded-md border ${scheme.badge}`}>
          {unit}
        </span>
      </div>

      {/* Optional Subtitle */}
      {subtitle && (
        <p className="text-xs text-slate-400 mt-2 truncate">
          {subtitle}
        </p>
      )}
    </div>
  );
};
