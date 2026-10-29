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
      border: 'border-[#EDE6DC] hover:border-[#D8CFBF]',
      text: 'text-[#2C2621]',
      badge: 'bg-[#EAF2EC] text-[#3B664E] border-[#CDE0D3]',
      iconBg: 'bg-[#EAF2EC] text-[#52796F]'
    },
    orange: {
      border: 'border-[#EDE6DC] hover:border-[#D8CFBF]',
      text: 'text-[#2C2621]',
      badge: 'bg-[#FDF0EC] text-[#B85737] border-[#F6D5C9]',
      iconBg: 'bg-[#FDF0EC] text-[#C46849]'
    },
    emerald: {
      border: 'border-[#EDE6DC] hover:border-[#D8CFBF]',
      text: 'text-[#2C2621]',
      badge: 'bg-[#EAF2EC] text-[#3B664E] border-[#CDE0D3]',
      iconBg: 'bg-[#EAF2EC] text-[#4E7D63]'
    },
    purple: {
      border: 'border-[#EDE6DC] hover:border-[#D8CFBF]',
      text: 'text-[#2C2621]',
      badge: 'bg-[#F5EFF7] text-[#694874] border-[#E5D7E8]',
      iconBg: 'bg-[#F5EFF7] text-[#7C5A87]'
    },
    amber: {
      border: 'border-[#EDE6DC] hover:border-[#D8CFBF]',
      text: 'text-[#2C2621]',
      badge: 'bg-[#FDF6EA] text-[#9A641F] border-[#F0DFBE]',
      iconBg: 'bg-[#FDF6EA] text-[#B67A28]'
    }
  };

  const scheme = colorMap[colorScheme];

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-white border p-5 sm:p-6 shadow-cozy transition-all duration-200 ${
        scheme.border
      } ${highlight ? 'ring-2 ring-[#52796F] shadow-cozy-lg' : ''}`}
    >
      {/* Header with Title and Icon */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-bold tracking-wider uppercase text-[#8C827A]">
          {title}
        </span>
        <div className={`p-2.5 rounded-2xl text-base ${scheme.iconBg}`}>
          {icon}
        </div>
      </div>

      {/* Main Digital Value */}
      <div className="flex items-baseline gap-2 my-1">
        <span className={`text-4xl sm:text-5xl font-black digital-number ${scheme.text}`}>
          {value}
        </span>
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-xl border ${scheme.badge}`}>
          {unit}
        </span>
      </div>

      {/* Optional Subtitle */}
      {subtitle && (
        <p className="text-xs text-[#8C827A] mt-2 truncate font-medium">
          {subtitle}
        </p>
      )}
    </div>
  );
};
