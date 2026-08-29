import React, { useState, useEffect } from 'react';
import { getInitials, getAvatarGradient, getWorkerAvatarUrl } from '../lib/avatarUtils';

interface WorkerAvatarProps {
  src?: string | null;
  name: string;
  className?: string;
  alt?: string;
  onClick?: () => void;
  title?: string;
}

export const WorkerAvatar: React.FC<WorkerAvatarProps> = ({
  src,
  name,
  className = 'w-10 h-10 rounded-xl',
  alt,
  onClick,
  title,
}) => {
  const [hasError, setHasError] = useState(false);

  // Reset error status if src prop changes
  useEffect(() => {
    setHasError(false);
  }, [src]);

  // Clean source URL: treat empty or invalid unsplash links as empty to use fallback
  const cleanSrc = (src && !hasError) ? src.trim() : null;

  // Fallback Initials Avatar
  const initials = getInitials(name);
  const gradientClass = getAvatarGradient(name);

  if (!cleanSrc) {
    return (
      <div
        onClick={onClick}
        title={title || name}
        className={`shrink-0 flex items-center justify-center font-black tracking-wider text-xs uppercase shadow-inner bg-gradient-to-br ${gradientClass} ${className}`}
      >
        <span>{initials}</span>
      </div>
    );
  }

  return (
    <img
      src={cleanSrc}
      alt={alt || name}
      title={title || name}
      onClick={onClick}
      onError={() => setHasError(true)}
      className={`object-cover shrink-0 ${className}`}
    />
  );
};
