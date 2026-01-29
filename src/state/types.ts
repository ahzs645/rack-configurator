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
  | 'patch_panel'    // Keystone patch panel with configurable ports
  | 'pi5_case'       // Raspberry Pi 5 case mount (attaches behind faceplate cutout)
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
  patch_panel: 'Patch Panel',
  pi5_case: 'Raspberry Pi 5 Case',
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

// Toolless hook pattern spacing (standard rack hole spacing)
export const TOOLLESS_HOOK_SPACING = 47.625; // mm (4.7625cm = 1.875" = 3/16 of 10")

// Calculate how many hook positions fit in a given rack height
export function getToollessHookCount(rackU: number): number {
  const height = rackU * RACK_CONSTANTS.UNIT_HEIGHT;
  // Hook height is 30.4mm, we need at least that much space for a hook
  // First hook starts at bottom (0), subsequent hooks at spacing intervals
  const hookHeight = 30.4; // HOOK_HEIGHT from rack_ears.scad
  return Math.floor((height - hookHeight) / TOOLLESS_HOOK_SPACING) + 1;
}

// Get the Z position (from bottom) of a hook at a given index
export function getToollessHookPosition(index: number): number {
  return index * TOOLLESS_HOOK_SPACING;
}

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

// Joiner nut side options
export type JoinerNutSide = 'left' | 'right';

export const JOINER_NUT_SIDE_LABELS: Record<JoinerNutSide, string> = {
  left: 'Left Side',
  right: 'Right Side',
};

// Joiner screw type options
export type JoinerScrewType = 'M3' | 'M4' | 'M5' | 'M6' | '4-40' | '6-32' | '8-32' | '10-24' | '1/4-20';

export const JOINER_SCREW_TYPE_LABELS: Record<JoinerScrewType, string> = {
  'M3': 'M3 (Metric)',
  'M4': 'M4 (Metric)',
  'M5': 'M5 (Metric)',
  'M6': 'M6 (Metric)',
  '4-40': '#4-40 (Imperial)',
  '6-32': '#6-32 (Imperial)',
  '8-32': '#8-32 (Imperial)',
  '10-24': '#10-24 (Imperial)',
  '1/4-20': '1/4-20 (Imperial)',
};

// Joiner type options (how split panels connect)
export type JoinerType = 'screw' | 'dovetail';

export const JOINER_TYPE_LABELS: Record<JoinerType, string> = {
  screw: 'Screw & Nut',
  dovetail: 'Dovetail (Tool-free)',
};

// Placed device on the rack
export interface PlacedDevice {
  id: string;          // Unique instance ID
  deviceId: string;    // Device type ID from database, or "custom"
  offsetX: number;     // mm from center (negative = left)
  offsetY: number;     // mm from center (negative = down)
  mountType: MountType;
  backStyle?: BackStyle; // Per-device back style (defaults to global if not set)
  // For custom devices only:
  customWidth?: number;
  customHeight?: number;
  customDepth?: number;
  customName?: string;
  // For patch panel mount type:
  patchPanelPorts?: number;  // Number of keystone ports (default: 6)
}

// Full rack configuration
export interface RackConfig {
  rackU: 1 | 2 | 3 | 4 | 5 | 6;
  panelWidth: number; // Custom panel width in mm (default: 450.85 for 19" rack)
  earStyle: EarStyle;
  earPosition: EarPosition;  // Legacy - kept for non-toolless ear styles
  earThickness: number;
  toollessHookPattern: boolean[]; // Which hooks are enabled in the repeating pattern
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
  splitLocked: boolean;   // Lock split line from being dragged
  renderMode: RenderMode;

  // Joiner settings (for split panels)
  joinerType: JoinerType;  // "screw" or "dovetail"
  joinerNutSide: JoinerNutSide;
  joinerNutDepth: number;
  joinerScrewType: JoinerScrewType;
  joinerNutFloor: number;  // Floor thickness for captive nut (0 = open pocket)

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
  panelWidth: RACK_CONSTANTS.PANEL_WIDTH, // 450.85mm (standard 19" rack)
  earStyle: 'toolless',
  earPosition: 'bottom',  // Legacy - kept for non-toolless ear styles
  earThickness: 2.9,
  toollessHookPattern: [true, true], // Default: all hooks enabled for 2U
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
  splitLocked: false,
  renderMode: 'single',
  joinerType: 'screw',  // Default to screw joiners
  joinerNutSide: 'right',
  joinerNutDepth: 4.5,
  joinerScrewType: 'M5',
  joinerNutFloor: 0,  // Default open pocket (set > 0 for captive nut)
  devices: [],
  leftDevices: [],
  rightDevices: [],
};
