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
 * Also supports loading from a remote JSON URL via ?url= parameter.
 * Returns null if no config is present or if decompression/fetch fails.
 */
export async function loadConfigFromUrl(): Promise<RackConfig | null> {
  const params = new URLSearchParams(window.location.search);

  // Check for remote JSON URL first (?url=<json_url>)
  const jsonUrl = params.get('url');
  if (jsonUrl) {
    try {
      const response = await fetch(jsonUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const config = await response.json() as RackConfig;
      if (config && typeof config.rackU === 'number' && Array.isArray(config.devices)) {
        return config;
      }
      return null;
    } catch (e) {
      console.error('Failed to load config from URL:', e);
      return null;
    }
  }

  // Fall back to compressed config (?c=<compressed>)
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
  url.searchParams.delete('url');
  window.history.replaceState({}, '', url.pathname + (url.search || '') + url.hash);
}
