// Rack configuration types

export type MountType =
  | 'cage'           // Full cage with honeycomb ventilation
  | 'cage_rect'      // Cage with rectangular slot ventilation
  | 'cage_open'      // Side walls only, no front block
  | 'enclosed'       // Enclosed box with side rails
  | 'angle'          // L-bracket style side supports
  | 'simple'         // Basic box enclosure
  | 'passthrough'    // Thin frame for keystones, dongles
  | 'tray'           // Open tray mount
  | 'shelf'          // Ventilated shelf
  | 'storage'        // Deep tray with walls
  | 'none';          // Cutout only, no mount

export const MOUNT_TYPE_LABELS: Record<MountType, string> = {
  cage: 'Cage (Honeycomb)',
  cage_rect: 'Cage (Rectangular)',
  cage_open: 'Open Cage',
  enclosed: 'Enclosed Box',
  angle: 'Angle Bracket',
  simple: 'Simple Box',
  passthrough: 'Passthrough',
  tray: 'Tray',
  shelf: 'Shelf',
  storage: 'Storage',
  none: 'None (Cutout)',
};

export type EarStyle = 'toolless' | 'fusion' | 'simple' | 'none';

export const EAR_STYLE_LABELS: Record<EarStyle, string> = {
  toolless: 'Toolless Hooks',
  fusion: 'Fusion Style',
  simple: 'Simple L-Bracket',
  none: 'No Ears',
};

export type EarPosition = 'bottom' | 'top' | 'center';

export type BackStyle = 'solid' | 'vent' | 'none';

export const BACK_STYLE_LABELS: Record<BackStyle, string> = {
  solid: 'Solid',
  vent: 'Ventilated',
  none: 'Open',
};

export type VentType = 'honeycomb' | 'rectangular';

// Split render modes
export type RenderMode = 'single' | 'both' | 'left' | 'right' | 'left_print' | 'right_print';

export const RENDER_MODE_LABELS: Record<RenderMode, string> = {
  single: 'Single Piece',
  both: 'Split - Both Halves',
  left: 'Split - Left Only',
  right: 'Split - Right Only',
  left_print: 'Split - Left (Print)',
  right_print: 'Split - Right (Print)',
};

// Placed device on the rack
export interface PlacedDevice {
  id: string;          // Unique instance ID
  deviceId: string;    // Device type ID from database, or "custom"
  offsetX: number;     // mm from center (negative = left)
  offsetY: number;     // mm from center (negative = down)
  mountType: MountType;
  // For custom devices only:
  customWidth?: number;
  customHeight?: number;
  customDepth?: number;
  customName?: string;
}

// Full rack configuration
export interface RackConfig {
  rackU: 1 | 2 | 3 | 4 | 5 | 6;
  earStyle: EarStyle;
  earPosition: EarPosition;
  earThickness: number;
  backStyle: BackStyle;

  // Ventilation settings
  ventType: VentType;
  hexDiameter: number;
  hexWall: number;
  cutoutEdge: number;
  cutoutRadius: number;

  // Other settings
  plateThickness: number;
  cornerRadius: number;
  clearance: number;
  heavyDevice: 0 | 1 | 2;

  // Preview options
  showPreview: boolean;
  showLabels: boolean;

  // Split panel configuration
  isSplit: boolean;
  splitPosition: number;  // 0 = auto center
  renderMode: RenderMode;

  // Placed devices (for single piece or when isSplit=false)
  devices: PlacedDevice[];

  // Devices for split panels
  leftDevices: PlacedDevice[];
  rightDevices: PlacedDevice[];
}

// EIA-310 rack standard dimensions
export const RACK_CONSTANTS = {
  // 19" rack panel width (without ears)
  PANEL_WIDTH: 450.85, // mm

  // 1U height
  UNIT_HEIGHT: 44.45, // mm

  // Faceplate width including ears
  FACEPLATE_WIDTH: 482.6, // mm

  // Default plate thickness
  DEFAULT_THICKNESS: 4, // mm
};

// Calculate rack height in mm based on U size
export function getRackHeight(rackU: number): number {
  return rackU * RACK_CONSTANTS.UNIT_HEIGHT;
}

// Default configuration
export const DEFAULT_RACK_CONFIG: RackConfig = {
  rackU: 2,
  earStyle: 'toolless',
  earPosition: 'bottom',
  earThickness: 2.9,
  backStyle: 'vent',
  ventType: 'honeycomb',
  hexDiameter: 8,
  hexWall: 2,
  cutoutEdge: 3,
  cutoutRadius: 3,
  plateThickness: 4,
  cornerRadius: 0,
  clearance: 1.0,
  heavyDevice: 0,
  showPreview: true,
  showLabels: true,
  isSplit: false,
  splitPosition: 0,  // 0 = auto
  renderMode: 'single',
  devices: [],
  leftDevices: [],
  rightDevices: [],
};
