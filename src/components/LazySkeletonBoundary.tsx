import React, { useState, useEffect } from 'react';
import { SkeletonLoader } from './SkeletonLoader';
import { SkeletonType, SkeletonOptions } from '../domain/SkeletonManager';

interface LazySkeletonBoundaryProps {
  isLoading: boolean;
  type?: SkeletonType;
  options?: SkeletonOptions;
  fallback?: React.ReactNode;
  children: React.ReactNode;
  minDelayMs?: number;
}

export const LazySkeletonBoundary: React.FC<LazySkeletonBoundaryProps> = ({
  isLoading,
  type = 'dashboard',
  options,
  fallback,
  children,
  minDelayMs = 250,
}) => {
  const [showSkeleton, setShowSkeleton] = useState(isLoading);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (isLoading) {
      setShowSkeleton(true);
    } else {
      // Smooth transition to prevent micro-flashes/layout shift
      timer = setTimeout(() => {
        setShowSkeleton(false);
      }, minDelayMs);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isLoading, minDelayMs]);

  if (showSkeleton) {
    return (
      <div className="w-full transition-opacity duration-300 ease-in-out opacity-100">
        {fallback || <SkeletonLoader type={type} options={options} />}
      </div>
    );
  }

  return (
    <div className="w-full transition-opacity duration-300 ease-in-out opacity-100">
      {children}
    </div>
  );
};
