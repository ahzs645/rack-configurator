import { RACK_CONSTANTS, getRackHeight } from '../state/types';

/**
 * Coordinate transformation utilities
 *
 * Rack coordinates:
 *   - Origin at center of faceplate
 *   - X: positive = right, negative = left
 *   - Y: positive = up, negative = down
 *
 * SVG coordinates:
 *   - Origin at top-left
 *   - X: positive = right
 *   - Y: positive = down
 */

export interface ViewConfig {
  svgWidth: number;
  svgHeight: number;
  rackU: number;
  zoom: number;
  panX: number;
  panY: number;
  padding: number;
}

/**
 * Get the rack panel dimensions in mm
 */
export function getRackDimensions(rackU: number): { width: number; height: number } {
  return {
    width: RACK_CONSTANTS.PANEL_WIDTH,
    height: getRackHeight(rackU),
  };
}

/**
 * Calculate the scale factor to fit the rack in the SVG viewport
 */
export function calculateFitScale(
  svgWidth: number,
  svgHeight: number,
  rackU: number,
  padding: number
): number {
  const rack = getRackDimensions(rackU);
  const availableWidth = svgWidth - padding * 2;
  const availableHeight = svgHeight - padding * 2;

  const scaleX = availableWidth / rack.width;
  const scaleY = availableHeight / rack.height;

  return Math.min(scaleX, scaleY);
}

/**
 * Convert rack coordinates (mm) to SVG coordinates (px)
 */
export function rackToSvg(
  rackX: number,
  rackY: number,
  view: ViewConfig
): { x: number; y: number } {
  const baseScale = calculateFitScale(view.svgWidth, view.svgHeight, view.rackU, view.padding);
  const scale = baseScale * view.zoom;

  // Center of the SVG viewport
  const centerX = view.svgWidth / 2 + view.panX;
  const centerY = view.svgHeight / 2 + view.panY;

  // Transform: rack origin (center) -> SVG origin (top-left)
  // Also flip Y axis
  const x = centerX + rackX * scale;
  const y = centerY - rackY * scale;

  return { x, y };
}

/**
 * Convert SVG coordinates (px) to rack coordinates (mm)
 */
export function svgToRack(
  svgX: number,
  svgY: number,
  view: ViewConfig
): { x: number; y: number } {
  const baseScale = calculateFitScale(view.svgWidth, view.svgHeight, view.rackU, view.padding);
  const scale = baseScale * view.zoom;

  // Center of the SVG viewport
  const centerX = view.svgWidth / 2 + view.panX;
  const centerY = view.svgHeight / 2 + view.panY;

  // Inverse transform
  const x = (svgX - centerX) / scale;
  const y = (centerY - svgY) / scale;

  return { x, y };
}

/**
 * Convert a size in rack mm to SVG pixels
 */
export function rackSizeToSvg(sizeMm: number, view: ViewConfig): number {
  const baseScale = calculateFitScale(view.svgWidth, view.svgHeight, view.rackU, view.padding);
  return sizeMm * baseScale * view.zoom;
}

/**
 * Convert a size in SVG pixels to rack mm
 */
export function svgSizeToRack(sizePx: number, view: ViewConfig): number {
  const baseScale = calculateFitScale(view.svgWidth, view.svgHeight, view.rackU, view.padding);
  return sizePx / (baseScale * view.zoom);
}

/**
 * Get the bounding box of the rack panel in SVG coordinates
 */
export function getRackBoundsSvg(view: ViewConfig): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const rack = getRackDimensions(view.rackU);

  // Top-left corner (in rack coords: -width/2, +height/2)
  const topLeft = rackToSvg(-rack.width / 2, rack.height / 2, view);

  // Size in SVG coords
  const width = rackSizeToSvg(rack.width, view);
  const height = rackSizeToSvg(rack.height, view);

  return {
    x: topLeft.x,
    y: topLeft.y,
    width,
    height,
  };
}

/**
 * Clamp a device position to stay within rack bounds
 */
export function clampToRackBounds(
  offsetX: number,
  offsetY: number,
  deviceWidth: number,
  deviceHeight: number,
  rackU: number
): { x: number; y: number } {
  const rack = getRackDimensions(rackU);

  // Max offsets (device center must keep device within bounds)
  const maxX = (rack.width - deviceWidth) / 2;
  const maxY = (rack.height - deviceHeight) / 2;

  return {
    x: Math.max(-maxX, Math.min(maxX, offsetX)),
    y: Math.max(-maxY, Math.min(maxY, offsetY)),
  };
}

/**
 * Check if two devices overlap
 */
export function devicesOverlap(
  x1: number,
  y1: number,
  w1: number,
  h1: number,
  x2: number,
  y2: number,
  w2: number,
  h2: number
): boolean {
  // Convert from center-based to corner-based
  const left1 = x1 - w1 / 2;
  const right1 = x1 + w1 / 2;
  const top1 = y1 + h1 / 2;
  const bottom1 = y1 - h1 / 2;

  const left2 = x2 - w2 / 2;
  const right2 = x2 + w2 / 2;
  const top2 = y2 + h2 / 2;
  const bottom2 = y2 - h2 / 2;

  // Check for overlap
  return !(right1 <= left2 || left1 >= right2 || bottom1 >= top2 || top1 <= bottom2);
}

/**
 * Snap a value to a grid
 */
export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}
