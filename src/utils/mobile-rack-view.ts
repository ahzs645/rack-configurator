import { calculateFitScale, getRackDimensions } from './coordinates';

export function getMobilePanLimits(width: number, height: number, rackU: number, panelWidth: number, zoom: number) {
  const rack = getRackDimensions(rackU, panelWidth);
  const scale = Math.max(0.001, calculateFitScale(width, height, rackU, 40, panelWidth)) * zoom;
  return {
    // Leave space beyond the panel for its hooks and edge details.
    maxPanX: Math.max(0, (rack.width * scale - width) / 2 + 40),
    maxPanY: Math.max(0, (rack.height * scale - Math.max(40, height - 220)) / 2),
  };
}

export function getMobileRackView(width: number, height: number, rackU: number, panelWidth: number) {
  const rack = getRackDimensions(rackU, panelWidth);
  const scale = Math.max(0.001, calculateFitScale(width, height, rackU, 40, panelWidth));
  // Reserve room for controls and rack dimensions. A shallow rack becomes a
  // horizontal workspace; taller racks approach the whole-panel overview.
  const availableHeight = Math.max(40, height - 220);
  const targetHeight = Math.min(240, availableHeight * 0.75);
  const ratio = targetHeight / (rack.height * scale);
  const overviewZoom = Math.min(1, availableHeight / (rack.height * scale));
  const zoom = Math.max(0.25, Math.min(4, rack.width / rack.height > 2 && ratio > 1.15 ? ratio : overviewZoom));
  const { maxPanX } = getMobilePanLimits(width, height, rackU, panelWidth, zoom);
  return { zoom, panX: maxPanX, panY: 0 };
}
