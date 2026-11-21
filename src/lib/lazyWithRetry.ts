import React from 'react';

/**
 * Enhanced React.lazy wrapper that automatically handles dynamic chunk loading failures
 * (which occur when a new deployment on Vercel replaces old hashed chunks while a user tab is open).
 * Automatically reloads the page once with updated manifest to seamlessly recover without error screen.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    const pageHasBeenForceRefreshed = sessionStorage.getItem('chunk_reload_done');

    try {
      const module = await componentImport();
      return module;
    } catch (error: any) {
      const isChunkError = /dynamically imported module|Loading chunk|Failed to fetch/i.test(
        error?.message || ''
      );

      if (!pageHasBeenForceRefreshed && isChunkError) {
        sessionStorage.setItem('chunk_reload_done', 'true');
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }

      sessionStorage.removeItem('chunk_reload_done');
      throw error;
    }
  });
}
