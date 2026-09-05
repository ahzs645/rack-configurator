import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void) {
  window.visualViewport?.addEventListener('resize', callback);
  window.addEventListener('resize', callback);
  return () => {
    window.visualViewport?.removeEventListener('resize', callback);
    window.removeEventListener('resize', callback);
  };
}

function getHeight() {
  const viewport = window.visualViewport;
  // Account for the keyboard/browser chrome without resizing during page zoom.
  return Math.round(viewport ? viewport.height * viewport.scale : window.innerHeight);
}

export function useMobileViewportHeight() {
  return useSyncExternalStore(subscribe, getHeight, () => 800);
}
