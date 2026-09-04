import type { RackConfig } from '../state/types';

/**
 * Share-link codec.
 *
 * Config JSON is deflated with the browser-native CompressionStream API and
 * encoded as URL-safe base64 (no padding). This has no Node.js dependencies:
 * the previous @firstform/json-url codec relied on Node's `Buffer` and `util`
 * globals, so every ?c= link failed in the browser with "Buffer is not defined".
 */

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(text: string): Uint8Array {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function pipeThrough(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const response = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await response.arrayBuffer());
}

export async function compressConfig(config: RackConfig): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(config));
  const deflated = await pipeThrough(json, new CompressionStream('deflate-raw'));
  return bytesToBase64Url(deflated);
}

export async function decompressConfig(encoded: string): Promise<RackConfig> {
  const inflated = await pipeThrough(base64UrlToBytes(encoded), new DecompressionStream('deflate-raw'));
  return JSON.parse(new TextDecoder().decode(inflated)) as RackConfig;
}

function isRackConfig(config: unknown): config is RackConfig {
  return (
    !!config &&
    typeof config === 'object' &&
    typeof (config as RackConfig).rackU === 'number' &&
    Array.isArray((config as RackConfig).devices)
  );
}

/**
 * Compress a RackConfig into a URL-safe string and return a shareable URL.
 */
export async function generateShareUrl(config: RackConfig): Promise<string> {
  const compressed = await compressConfig(config);
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
      const config: unknown = await response.json();
      return isRackConfig(config) ? config : null;
    } catch (e) {
      console.error('Failed to load config from URL:', e);
      return null;
    }
  }

  // Fall back to compressed config (?c=<compressed>)
  const compressed = params.get('c');
  if (!compressed) return null;

  try {
    const config: unknown = await decompressConfig(compressed);
    return isRackConfig(config) ? config : null;
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
