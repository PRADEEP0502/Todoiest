import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = 'h-4 w-full' }) => {
  return <div className={`animate-pulse bg-slate-800/80 rounded-md ${className}`} />;
};

export const TaskRowSkeleton: React.FC = () => {
  return (
    <div className="flex items-center gap-3 p-3.5 bg-slate-900/60 border border-slate-800/70 rounded-lg">
      <Skeleton className="w-4 h-4 rounded-md shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-2.5 w-1/3" />
      </div>
      <Skeleton className="h-5 w-16 rounded shrink-0" />
      <Skeleton className="h-5 w-20 rounded shrink-0" />
    </div>
  );
};
