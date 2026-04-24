import React from 'react';

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200/80 dark:bg-slate-800/80 ${className}`}
      {...props}
    />
  );
}
