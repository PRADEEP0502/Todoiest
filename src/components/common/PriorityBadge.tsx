import React from 'react';
import { getPriorityMeta } from '../../utils/priorityUtils';

interface PriorityBadgeProps {
  priority: 1 | 2 | 3 | 4 | number;
  showText?: boolean;
  shortText?: boolean;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  onClick?: () => void;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  showText = true,
  shortText = false,
  size = 'sm',
  className = '',
  onClick,
}) => {
  const meta = getPriorityMeta(priority);

  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-1',
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
  };

  const dotSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2 h-2',
  };

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center font-medium rounded border ${meta.badgeBg} ${meta.badgeBorder} ${meta.badgeText} ${sizeClasses[size]} ${
        onClick ? 'cursor-pointer hover:opacity-85' : ''
      } ${className}`}
      title={meta.displayLabel}
    >
      <span className={`rounded-full shrink-0 ${meta.dotColor} ${dotSizes[size]}`} />
      {showText && (
        <span className="leading-none">{shortText ? meta.shortLabel : meta.displayLabel}</span>
      )}
    </span>
  );
};
