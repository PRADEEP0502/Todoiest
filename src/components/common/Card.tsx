import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  action,
  className = '',
  bodyClassName = '',
  headerClassName = '',
  padding = 'md',
}) => {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3.5',
    md: 'p-5',
    lg: 'p-6',
  };

  const hasHeader = title || subtitle || action;

  return (
    <div
      className={`bg-slate-900/90 rounded-xl border border-slate-800/90 shadow-sm shadow-black/20 overflow-hidden ${className}`}
    >
      {hasHeader && (
        <div
          className={`flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80 ${headerClassName}`}
        >
          <div>
            {title && (
              <h3 className="text-sm font-semibold text-slate-100 tracking-tight">{title}</h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={`${paddingStyles[padding]} ${bodyClassName}`}>{children}</div>
    </div>
  );
};
