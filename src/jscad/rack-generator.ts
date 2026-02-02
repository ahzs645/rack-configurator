// JSCAD Rack Generator - Main entry point for generating complete rack faceplates
// Translated from OpenSCAD components/rack_generator.scad

import { primitives, booleans, transforms } from '@jscad/modeling';
import type { Geom3 } from '@jscad/modeling/src/geometries/types';
import type { RackConfig, PlacedDevice } from '../state/types';
import { getDevice } from '../data/devices';
import {
  faceplateHeight, EPS, DEFAULT_SEGMENTS,
} from './constants';
import { fourRoundedCornerPlate, safeUnion } from './utilities';
import { createRackEars } from './rack-ears';
import { cageStructure } from './cage';
import { passthroughFrame } from './mount-passthrough';
import { angleBracketCage, simpleBoxCage } from './mount-bracket';
import { trayMount, storageTray } from './mount-tray';
import { enhancedShelf } from './mount-shelf';
import type { EnhancedShelfOptions } from './mount-shelf';
import { enclosedBoxSystem } from './rack-mounts/enclosed-box';
import { patchPanel } from './rack-mounts/patch-panel';
import { pi5CaseMountPositioned } from './rack-mounts/pi5-case';
import { faceplateJoinerLeft, faceplateJoinerRight, dovetailJoinerLeft, dovetailJoinerRight } from './joiners';

const { cuboid } = primitives;
const { union, subtract } = booleans;
const { translate } = transforms;

/**
 * Get effective device dimensions
 */
function getDeviceDimensions(device: PlacedDevice): { width: number; height: number; depth: number } {
  if (device.deviceId === 'custom') {
    return {
      width: device.customWidth || 50,
      height: device.customHeight || 30,
      depth: device.customDepth || 50,
    };
  }

  if (device.mountType === 'patch_panel') {
    const ports = device.patchPanelPorts || 6;
    return { width: ports * 19, height: 30, depth: 15 };
  }

  if (device.mountType === 'pi5_case') {
    return { width: 93, height: 64, depth: 35 };
  }

  const deviceData = getDevice(device.deviceId);
  if (deviceData) {
    return { width: deviceData.width, height: deviceData.height, depth: deviceData.depth };
  }

  return { width: 50, height: 30, depth: 50 };
}

/**
 * Create a device cutout in the faceplate
 */
function deviceCutout(
  device: PlacedDevice,
  panelWidth: number,
  rackHeight: number,
  clearance: number,
  plateThickness: number,
  _heavyDevice: 0 | 1 | 2 = 0
): Geom3 {
  const dims = getDeviceDimensions(device);
  let cutW: number, cutH: number;

  // For mount types with their own walls, the cutout matches the device + clearance
  if (device.mountType === 'none') {
    cutW = dims.width + 2 * clearance;
    cutH = dims.height + 2 * clearance;
  } else if (device.mountType === 'cage' || device.mountType === 'cage_rect' || device.mountType === 'cage_open') {
    cutW = dims.width + 2 * clearance;
    cutH = dims.height + 2 * clearance;
  } else if (device.mountType === 'passthrough') {
    cutW = dims.width + 2 * clearance;
    cutH = dims.height + 2 * clearance;
  } else if (device.mountType === 'pi5_case') {
    cutW = dims.width;
    cutH = dims.height;
  } else {
    cutW = dims.width + 2 * clearance;
    cutH = dims.height + 2 * clearance;
  }

  const cx = panelWidth / 2 + device.offsetX - cutW / 2;
  const cy = rackHeight / 2 + device.offsetY - cutH / 2;

  return translate(
    [cx, cy, -EPS],
    cuboid({
      size: [cutW, cutH, plateThickness + 2 * EPS],
      center: [cutW / 2, cutH / 2, (plateThickness + 2 * EPS) / 2],
    })
  );
}

/**
 * Create a device mount structure
 */
function deviceMount(
  device: PlacedDevice,
  panelWidth: number,
  rackHeight: number,
  clearance: number,
  heavyDevice: 0 | 1 | 2,
  hexDia: number,
  hexWall: number,
  cutoutEdge: number,
  cutoutRadius: number,
  plateThickness: number,
  globalBackStyle: string,
  segments: number
): Geom3 | null {
  const dims = getDeviceDimensions(device);
  const backStyle = device.backStyle || globalBackStyle;

  // Calculate position for this device
  const wallThick = plateThickness + heavyDevice;
  const totalWidth = dims.width + 2 * wallThick + 2 * clearance;
  const totalHeight = dims.height + 2 * wallThick + 2 * clearance;
  const cx = panelWidth / 2 + device.offsetX - totalWidth / 2;
  const cy = rackHeight / 2 + device.offsetY - totalHeight / 2;

  switch (device.mountType) {
    case 'cage':
    case 'cage_rect':
    case 'cage_open': {
      const cage = cageStructure({
        offsetX: 0,
        offsetY: 0,
        deviceWidth: dims.width,
        deviceHeight: dims.height,
        deviceDepth: dims.depth,
        deviceClearance: clearance,
        heavyDevice,
        useHoneycomb: device.mountType === 'cage',
        backOpen: backStyle === 'none',
        noBack: backStyle === 'none',
        openFrame: device.mountType === 'cage_open',
        hexDia,
        hexWall,
        cutoutEdge,
        cutoutRadius,
        plateThickness,
        segments,
      });
      return translate([cx, cy, plateThickness], cage);
    }

    case 'passthrough': {
      const frame = passthroughFrame(dims.width, dims.height, 8, 3, clearance);
      const frameW = dims.width + 2 * clearance + 6;
      const frameH = dims.height + 2 * clearance + 6;
      const fx = panelWidth / 2 + device.offsetX - frameW / 2;
      const fy = rackHeight / 2 + device.offsetY - frameH / 2;
      return translate([fx, fy, plateThickness], frame);
    }

    case 'angle': {
      const bracket = angleBracketCage(dims.width, dims.height, dims.depth, 3);
      const bw = dims.width + 6;
      const bh = dims.height + 6;
      const bx = panelWidth / 2 + device.offsetX - bw / 2;
      const by = rackHeight / 2 + device.offsetY - bh / 2;
      return translate([bx, by, plateThickness], bracket);
    }

    case 'simple': {
      const box = simpleBoxCage(dims.width, dims.height, dims.depth, 3);
      const sw = dims.width + 6;
      const sh = dims.height + 6;
      const sx = panelWidth / 2 + device.offsetX - sw / 2;
      const sy = rackHeight / 2 + device.offsetY - sh / 2;
      return translate([sx, sy, plateThickness], box);
    }

    case 'tray': {
      const tray = trayMount(dims.width, dims.height, dims.depth, 3);
      const tw = dims.width + 6;
      const th = dims.height + 6;
      const tx = panelWidth / 2 + device.offsetX - tw / 2;
      const ty = rackHeight / 2 + device.offsetY - th / 2;
      return translate([tx, ty, plateThickness], tray);
    }

    case 'shelf': {
      const shelfOpts: Omit<EnhancedShelfOptions, 'width' | 'depth' | 'height'> = {
        thickness: 3,
        solidBottom: device.shelfSolidBottom ?? false,
        useHoneycomb: device.shelfUseHoneycomb ?? true,
        hexDia,
        hexWall,
        notch: device.shelfNotch ?? 'none',
        notchWidth: device.shelfNotchWidth ?? 100,
        screwHoles: device.shelfScrewHoles ?? 0,
        cableHolesLeft: device.shelfCableHolesLeft ?? 0,
        cableHolesRight: device.shelfCableHolesRight ?? 0,
        standoffs: device.standoffs?.map(s => ({
          x: s.x, y: s.y, height: s.height, outerDia: s.outerDia, holeDia: s.holeDia,
        })) ?? [],
        standoffCountersink: device.standoffCountersink ?? false,
        standoffReinforced: device.standoffReinforced ?? false,
        pullHandle: device.shelfPullHandle ?? false,
        pcbPreset: device.pcbPreset ? {
          enabled: device.pcbPreset.enabled,
          pcbWidth: device.pcbPreset.pcbWidth,
          pcbLength: device.pcbPreset.pcbLength,
          offsetX: device.pcbPreset.offsetX,
          offsetY: device.pcbPreset.offsetY,
          height: device.pcbPreset.height,
          outerDia: device.pcbPreset.outerDia,
          holeDia: device.pcbPreset.holeDia,
        } : undefined,
        segments,
      };

      const shelfW = dims.width + 6;
      const shelfD = dims.depth + 3;
      const shelfH = dims.height + 3;

      const shelf = enhancedShelf({
        width: shelfW,
        depth: shelfD,
        height: shelfH,
        ...shelfOpts,
      });

      const shx = panelWidth / 2 + device.offsetX - shelfW / 2;
      const shy = rackHeight / 2 + device.offsetY - shelfH / 2;
      return translate([shx, shy, plateThickness], shelf);
    }

    case 'storage': {
      const tray = storageTray(dims.width, dims.depth);
      const stw = dims.width + 4;
      const sth = dims.height + 4;
      const stx = panelWidth / 2 + device.offsetX - stw / 2;
      const sty = rackHeight / 2 + device.offsetY - sth / 2;
      return translate([stx, sty, plateThickness], tray);
    }

    case 'enclosed': {
      const box = enclosedBoxSystem({
        boxWidth: dims.width,
        boxHeight: dims.height,
        boxDepth: dims.depth,
        segments,
      });
      const ew = dims.width + 10;
      const eh = dims.height + 10;
      const ex = panelWidth / 2 + device.offsetX - ew / 2;
      const ey = rackHeight / 2 + device.offsetY - eh / 2;
      return translate([ex, ey, plateThickness], box);
    }

    case 'patch_panel': {
      const ports = device.patchPanelPorts || 6;
      const panel = patchPanel(ports, 3, 30, segments);
      const ppw = ports * 19 + 10;
      const pph = 30;
      const px = panelWidth / 2 + device.offsetX - ppw / 2;
      const py = rackHeight / 2 + device.offsetY - pph / 2;
      return translate([px, py, plateThickness], panel);
    }

    case 'pi5_case':
      return pi5CaseMountPositioned(
        device.offsetX, device.offsetY,
        panelWidth, rackHeight,
        plateThickness, segments
      );

    case 'none':
      return null;

    default:
      return null;
  }
}

/**
 * Generate a complete single-piece rack faceplate
 */
export function generateRackFaceplate(config: RackConfig): Geom3 {
  const panelWidth = config.panelWidth || 450.85;
  const rackU = config.rackU;
  const height = faceplateHeight(rackU);
  const plateThickness = config.plateThickness;
  const cornerRadius = config.cornerRadius;
  const segments = DEFAULT_SEGMENTS;

  // === Step 1: Create faceplate base ===
  let faceplate: Geom3;
  if (cornerRadius > 0) {
    faceplate = fourRoundedCornerPlate(panelWidth, height, plateThickness, cornerRadius, segments);
  } else {
    faceplate = cuboid({
      size: [panelWidth, height, plateThickness],
      center: [panelWidth / 2, height / 2, plateThickness / 2],
    });
  }

  // === Step 2: Cut device openings in faceplate ===
  const cutouts: Geom3[] = [];
  for (const device of config.devices) {
    cutouts.push(deviceCutout(
      device, panelWidth, height,
      config.clearance, plateThickness, config.heavyDevice
    ));
  }

  if (cutouts.length > 0) {
    faceplate = subtract(faceplate, ...cutouts);
  }

  // === Step 3: Add device mounts (behind faceplate) ===
  const mounts: Geom3[] = [];
  for (const device of config.devices) {
    const mount = deviceMount(
      device, panelWidth, height,
      config.clearance, config.heavyDevice,
      config.hexDiameter, config.hexWall,
      config.cutoutEdge, config.cutoutRadius,
      plateThickness, config.backStyle, segments
    );
    if (mount) {
      mounts.push(mount);
    }
  }

  // === Step 4: Add rack ears ===
  const ears = createRackEars(
    panelWidth, rackU,
    config.earStyle, config.earPosition, config.earThickness,
    config.toollessHookPattern, config.toollessHookTrimPattern,
    segments
  );

  // === Step 5: Combine everything ===
  const allParts = [faceplate, ...mounts];
  if (ears) allParts.push(ears);

  return safeUnion(...allParts);
}

/**
 * Generate a split rack faceplate (two-piece with joiner)
 */
export function generateRackFaceplateSplit(config: RackConfig): Geom3 {
  const panelWidth = config.panelWidth || 450.85;
  const rackU = config.rackU;
  const height = faceplateHeight(rackU);
  const plateThickness = config.plateThickness;
  const segments = DEFAULT_SEGMENTS;

  // Determine split position
  const splitX = config.splitPosition > 0 ? config.splitPosition : panelWidth / 2;

  const renderPart = config.renderMode;
  const parts: Geom3[] = [];

  // === LEFT HALF ===
  if (renderPart === 'both' || renderPart === 'left' || renderPart === 'left_print') {
    // Left faceplate section
    let leftPlate = cuboid({
      size: [splitX, height, plateThickness],
      center: [splitX / 2, height / 2, plateThickness / 2],
    });

    // Cut device openings in left half
    for (const device of config.leftDevices) {
      const cutout = deviceCutout(device, panelWidth, height, config.clearance, plateThickness, config.heavyDevice);
      leftPlate = subtract(leftPlate, cutout);
    }

    // Add device mounts for left half
    const leftMounts: Geom3[] = [leftPlate];
    for (const device of config.leftDevices) {
      const mount = deviceMount(
        device, panelWidth, height,
        config.clearance, config.heavyDevice,
        config.hexDiameter, config.hexWall,
        config.cutoutEdge, config.cutoutRadius,
        plateThickness, config.backStyle, segments
      );
      if (mount) leftMounts.push(mount);
    }

    // Left joiner wall
    if (config.joinerType === 'screw') {
      const joiner = faceplateJoinerLeft(
        rackU, config.joinerScrewType,
        config.joinerNutSide, config.joinerNutDepth, config.joinerNutFloor,
        segments
      );
      leftMounts.push(translate([splitX, 0, plateThickness], joiner));
    } else {
      const joiner = dovetailJoinerLeft(rackU, segments);
      leftMounts.push(translate([splitX, 0, plateThickness], joiner));
    }

    // Left ears
    const leftEars = createRackEars(
      panelWidth, rackU,
      config.earStyle, config.earPosition, config.earThickness,
      config.toollessHookPattern, config.toollessHookTrimPattern,
      segments
    );

    // Only include left ear
    // (simplified: include ear assembly, it will be clipped by the split)

    let leftHalf = safeUnion(...leftMounts);
    if (leftEars) leftHalf = union(leftHalf, leftEars);

    if (renderPart === 'left_print') {
      // Rotate for flat printing (if needed)
      parts.push(leftHalf);
    } else {
      parts.push(leftHalf);
    }
  }

  // === RIGHT HALF ===
  if (renderPart === 'both' || renderPart === 'right' || renderPart === 'right_print') {
    // Right faceplate section
    let rightPlate = translate(
      [splitX, 0, 0],
      cuboid({
        size: [panelWidth - splitX, height, plateThickness],
        center: [(panelWidth - splitX) / 2, height / 2, plateThickness / 2],
      })
    );

    // Cut device openings in right half
    for (const device of config.rightDevices) {
      const cutout = deviceCutout(device, panelWidth, height, config.clearance, plateThickness, config.heavyDevice);
      rightPlate = subtract(rightPlate, cutout);
    }

    // Add device mounts for right half
    const rightMounts: Geom3[] = [rightPlate];
    for (const device of config.rightDevices) {
      const mount = deviceMount(
        device, panelWidth, height,
        config.clearance, config.heavyDevice,
        config.hexDiameter, config.hexWall,
        config.cutoutEdge, config.cutoutRadius,
        plateThickness, config.backStyle, segments
      );
      if (mount) rightMounts.push(mount);
    }

    // Right joiner wall
    if (config.joinerType === 'screw') {
      const joiner = faceplateJoinerRight(
        rackU, config.joinerScrewType,
        config.joinerNutSide, config.joinerNutDepth, config.joinerNutFloor,
        segments
      );
      rightMounts.push(translate([splitX, 0, plateThickness], joiner));
    } else {
      const joiner = dovetailJoinerRight(rackU, segments);
      rightMounts.push(translate([splitX, 0, plateThickness], joiner));
    }

    let rightHalf = safeUnion(...rightMounts);

    if (renderPart === 'right_print') {
      parts.push(rightHalf);
    } else {
      parts.push(rightHalf);
    }
  }

  return safeUnion(...parts);
}

/**
 * Main entry point: generate rack faceplate from config
 */
export function generateRack(config: RackConfig): Geom3 {
  if (config.isSplit) {
    return generateRackFaceplateSplit(config);
  }
  return generateRackFaceplate(config);
}
