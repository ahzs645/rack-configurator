/**
 * JSCAD Bundler - Creates self-contained JSCAD configuration exports
 *
 * Exports the rack configuration as a JSON file that can be used
 * with the JSCAD rack generator modules to produce 3D models.
 */

import type { RackConfig } from '../state/types';
import { generateScadCode } from './scad-generator';

/**
 * Clear the component cache (no-op for JSCAD, kept for API compat)
 */
export function clearComponentCache(): void {
  // No-op: JSCAD modules are bundled, not fetched
}

/**
 * Generate a self-contained JSCAD configuration file
 */
export async function generateBundledScadCode(config: RackConfig): Promise<string> {
  return generateScadCode(config, false);
}

/**
 * Generate filename for the bundled file
 */
export function generateBundledFilename(config: RackConfig): string {
  const parts = [`rack_${config.rackU}u`];

  if (config.isSplit) {
    parts.push('split');
  }

  const deviceCount = config.isSplit
    ? config.leftDevices.length + config.rightDevices.length
    : config.devices.length;

  if (deviceCount > 0) {
    parts.push(`${deviceCount}dev`);
  }

  parts.push('config');

  return `${parts.join('_')}.json`;
}

/**
 * Download the bundled configuration file
 */
export async function downloadBundledScadFile(config: RackConfig): Promise<void> {
  const json = JSON.stringify(config, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = generateBundledFilename(config);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export as a downloadable configuration file
 */
export async function downloadScadFolder(config: RackConfig): Promise<void> {
  await downloadBundledScadFile(config);
}
