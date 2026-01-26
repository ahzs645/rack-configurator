/**
 * SCAD Bundler - Creates self-contained OpenSCAD files
 *
 * This bundles all necessary component files into a single .scad file
 * so the output works without needing the components folder.
 */

import type { RackConfig, PlacedDevice } from '../state/types';

// Component file contents will be embedded at build time or fetched at runtime
// Cache is cleared on page reload to pick up file changes
let componentCache: Map<string, string> | null = null;

/**
 * Clear the component cache to force re-fetching
 */
export function clearComponentCache(): void {
  componentCache = null;
}

// List of component files in dependency order
const COMPONENT_FILES = [
  'constants.scad',
  'devices.scad',
  'utilities.scad',
  'honeycomb.scad',
  'cage.scad',
  'custom_mounts.scad',
  'joiners.scad',
  'rack_ears.scad',
  'rack_generator.scad',
];

/**
 * Fetch component files from the server
 */
async function fetchComponents(): Promise<Map<string, string>> {
  if (componentCache) return componentCache;

  componentCache = new Map();

  for (const filename of COMPONENT_FILES) {
    try {
      const response = await fetch(`/components/${filename}`);
      if (response.ok) {
        let content = await response.text();
        // Remove use/include statements since we're inlining
        content = content.replace(/^(use|include)\s+<[^>]+>\s*$/gm, '// (inlined)');
        componentCache.set(filename, content);
      }
    } catch (e) {
      console.warn(`Failed to fetch ${filename}:`, e);
    }
  }

  return componentCache;
}

/**
 * Generate devices array in OpenSCAD syntax
 * Device format: ["device_id", offsetX, offsetY, mountType, backStyle]
 * Custom device format: ["custom", offsetX, offsetY, mountType, [w, h, d], "name", backStyle]
 * backStyle can be "default" to use global setting, or "solid"/"vent"/"none" for override
 */
function generateDevicesArray(devices: PlacedDevice[]): string {
  if (devices.length === 0) {
    return '[]';
  }

  const deviceStrings = devices.map((device) => {
    // Use "default" if no per-device backStyle is set, otherwise use the specific style
    const backStyle = device.backStyle || 'default';

    if (device.deviceId === 'custom') {
      return `    ["custom", ${device.offsetX}, ${device.offsetY}, "${device.mountType}", [${device.customWidth}, ${device.customHeight}, ${device.customDepth}], "${device.customName || 'Custom Device'}", "${backStyle}"]`;
    } else {
      return `    ["${device.deviceId}", ${device.offsetX}, ${device.offsetY}, "${device.mountType}", "${backStyle}"]`;
    }
  });

  return '[\n' + deviceStrings.join(',\n') + '\n]';
}

/**
 * Generate the main render call
 */
function generateRenderCall(config: RackConfig): string {
  const lines: string[] = [];

  if (config.isSplit) {
    const leftDevicesCode = generateDevicesArray(config.leftDevices);
    const rightDevicesCode = generateDevicesArray(config.rightDevices);

    lines.push('rack_faceplate_split(');
    lines.push(`    rack_u = ${config.rackU},`);
    lines.push(`    left_devices = ${leftDevicesCode},`);
    lines.push(`    right_devices = ${rightDevicesCode},`);
    lines.push(`    split_x = ${config.splitPosition},`);
    lines.push(`    plate_thick = ${config.plateThickness},`);
    lines.push(`    corner_radius = ${config.cornerRadius},`);
    lines.push(`    ear_style = "${config.earStyle}",`);
    lines.push(`    ear_thickness = ${config.earThickness},`);
    lines.push(`    ear_position = "${config.earPosition}",`);
    lines.push(`    clearance = ${config.clearance},`);
    lines.push(`    hex_diameter = ${config.hexDiameter},`);
    lines.push(`    hex_wall = ${config.hexWall},`);
    lines.push(`    back_style = "${config.backStyle}",`);
    lines.push(`    cutout_edge = ${config.cutoutEdge},`);
    lines.push(`    cutout_radius = ${config.cutoutRadius},`);
    lines.push(`    show_preview = ${config.showPreview},`);
    lines.push(`    show_labels = ${config.showLabels},`);
    lines.push(`    render_part = "${config.renderMode}",`);
    lines.push(`    joiner_nut_side = "${config.joinerNutSide || 'right'}",`);
    lines.push(`    joiner_nut_depth = ${config.joinerNutDepth || 4.5}`);
    lines.push(');');
  } else {
    const devicesCode = generateDevicesArray(config.devices);

    lines.push('rack_faceplate(');
    lines.push(`    rack_u = ${config.rackU},`);
    lines.push(`    devices = ${devicesCode},`);
    lines.push(`    plate_thick = ${config.plateThickness},`);
    lines.push(`    corner_radius = ${config.cornerRadius},`);
    lines.push(`    ear_style = "${config.earStyle}",`);
    lines.push(`    ear_thickness = ${config.earThickness},`);
    lines.push(`    ear_position = "${config.earPosition}",`);
    lines.push(`    clearance = ${config.clearance},`);
    lines.push(`    hex_diameter = ${config.hexDiameter},`);
    lines.push(`    hex_wall = ${config.hexWall},`);
    lines.push(`    back_style = "${config.backStyle}",`);
    lines.push(`    cutout_edge = ${config.cutoutEdge},`);
    lines.push(`    cutout_radius = ${config.cutoutRadius},`);
    lines.push(`    heavy_device = ${config.heavyDevice},`);
    lines.push(`    show_preview = ${config.showPreview},`);
    lines.push(`    show_labels = ${config.showLabels}`);
    lines.push(');');
  }

  return lines.join('\n');
}

/**
 * Generate a self-contained SCAD file with all components inlined
 */
export async function generateBundledScadCode(config: RackConfig): Promise<string> {
  const components = await fetchComponents();
  const lines: string[] = [];

  // Header
  lines.push('/*');
  lines.push(' * Self-Contained Rack Configuration');
  lines.push(` * Generated by Rack Configurator on ${new Date().toISOString()}`);
  lines.push(' *');
  lines.push(` * Rack: ${config.rackU}U, ${config.earStyle} ears, ${config.backStyle} back`);
  if (config.isSplit) {
    lines.push(` * Split at: ${config.splitPosition || 'auto'}mm`);
    lines.push(` * Left devices: ${config.leftDevices.length}`);
    lines.push(` * Right devices: ${config.rightDevices.length}`);
  } else {
    lines.push(` * Devices: ${config.devices.length}`);
  }
  lines.push(' *');
  lines.push(' * This file is self-contained - no external dependencies needed.');
  lines.push(' */');
  lines.push('');
  lines.push('$fn = 32;');
  lines.push('');

  // Add all component files
  for (const filename of COMPONENT_FILES) {
    const content = components.get(filename);
    if (content) {
      lines.push(`// ============================================================================`);
      lines.push(`// ${filename.toUpperCase()}`);
      lines.push(`// ============================================================================`);
      lines.push('');
      lines.push(content);
      lines.push('');
    }
  }

  // Add the render call
  lines.push('// ============================================================================');
  lines.push('// RENDER');
  lines.push('// ============================================================================');
  lines.push('');
  lines.push(generateRenderCall(config));

  return lines.join('\n');
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

  parts.push('bundled');

  return `${parts.join('_')}.scad`;
}

/**
 * Download the bundled SCAD file
 */
export async function downloadBundledScadFile(config: RackConfig): Promise<void> {
  const code = await generateBundledScadCode(config);
  const blob = new Blob([code], { type: 'text/plain' });
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
 * Export as a folder (ZIP) with main file + components
 */
export async function downloadScadFolder(config: RackConfig): Promise<void> {
  // For folder export, we need a ZIP library
  // For now, just export the bundled version
  // TODO: Add JSZip for proper folder export
  await downloadBundledScadFile(config);
}
