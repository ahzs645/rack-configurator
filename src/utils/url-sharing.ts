import type { RackConfig } from '../state/types';

import { deflateSync, decompressSync, strToU8, strFromU8 } from 'fflate';

// Keep share links usable on Safari versions without deflate-raw streams.
// The decoder accepts both the original raw-deflate and zlib-wrapped links.

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

export async function compressConfig(config: RackConfig): Promise<string> {
  return bytesToBase64Url(deflateSync(strToU8(JSON.stringify(config))));
}

export async function decompressConfig(encoded: string): Promise<RackConfig> {
  return JSON.parse(strFromU8(decompressSync(base64UrlToBytes(encoded)))) as RackConfig;
}

export function isRackConfig(config: unknown): config is RackConfig {
  if (!config || typeof config !== 'object') return false;
  const rack = config as RackConfig;
  if (!Number.isInteger(rack.rackU) || rack.rackU < 1 || rack.rackU > 6 || !Array.isArray(rack.devices)) return false;
  return [rack.devices, rack.leftDevices ?? [], rack.rightDevices ?? []].every(list =>
    Array.isArray(list) && list.every(device => device && typeof device.id === 'string'
      && typeof device.deviceId === 'string' && Number.isFinite(device.offsetX) && Number.isFinite(device.offsetY)));
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
 * Returns null only when there is no link; invalid links produce a visible error.
 */
export async function loadConfigFromUrl(): Promise<RackConfig | null> {
  const params = new URLSearchParams(window.location.search);

  const jsonUrl = params.get('url');
  const compressed = params.get('c');
  if (!params.has('url') && !params.has('c')) return null;

  let config: unknown;
  if (jsonUrl) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(jsonUrl, { signal: controller.signal });
      if (!response.ok) throw new Error('The saved rack could not be downloaded.');
      config = await response.json();
    } finally { clearTimeout(timeout); }
  } else if (compressed) {
    config = await decompressConfig(compressed);
  }
  if (!isRackConfig(config)) throw new Error('This rack link is incomplete or invalid.');
  return config;
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
