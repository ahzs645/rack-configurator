import createClient from '@firstform/json-url';
import type { RackConfig } from '../state/types';

const codec = createClient('lzw');

/**
 * Compress a RackConfig into a URL-safe string and return a shareable URL.
 */
export async function generateShareUrl(config: RackConfig): Promise<string> {
  const compressed = await codec.compress(config);
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('c', compressed);
  return url.toString();
}

/**
 * Try to extract and decompress a RackConfig from the current page URL.
 * Returns null if no config is present or if decompression fails.
 */
export async function loadConfigFromUrl(): Promise<RackConfig | null> {
  const params = new URLSearchParams(window.location.search);
  const compressed = params.get('c');
  if (!compressed) return null;

  try {
    const config = await codec.decompress(compressed) as RackConfig;
    // Basic validation
    if (config && typeof config.rackU === 'number' && Array.isArray(config.devices)) {
      return config;
    }
    return null;
  } catch (e) {
    console.error('Failed to decompress config from URL:', e);
    return null;
  }
}

/**
 * Remove the config parameter from the URL without reloading the page.
 */
export function clearUrlConfig(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('c');
  window.history.replaceState({}, '', url.pathname + (url.search || '') + url.hash);
}
