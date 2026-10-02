import { useCallback, useEffect, useState } from 'react';

const readHash = () => window.location.hash.replace(/^#/, '');

/** Keeps the active tab in location.hash so refresh and back/forward work. */
export function useHashTab(allowedTabs, fallback) {
  const resolve = useCallback((hash) => (allowedTabs.includes(hash) ? hash : fallback), [allowedTabs, fallback]);
  const [tab, setTab] = useState(() => resolve(readHash()));

  useEffect(() => {
    const onHashChange = () => setTab(resolve(readHash()));
    onHashChange();
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [resolve]);

  return tab;
}
