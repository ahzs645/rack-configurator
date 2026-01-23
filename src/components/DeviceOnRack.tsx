import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { PlacedDevice, MountType } from '../state/types';
import { MOUNT_TYPE_LABELS } from '../state/types';
import { getPlacedDeviceDimensions } from '../utils/scad-generator';
import type { ViewConfig } from '../utils/coordinates';
import { rackToSvg, rackSizeToSvg, calculateFitScale } from '../utils/coordinates';
import { useRackStore } from '../state/rack-store';

// Short labels for mount types
const MOUNT_TYPE_SHORT: Record<MountType, string> = {
  cage: 'CAGE',
  cage_rect: 'RECT',
  cage_open: 'OPEN',
  enclosed: 'ENCL',
  angle: 'ANGL',
  simple: 'SIMP',
  passthrough: 'PASS',
  tray: 'TRAY',
  shelf: 'SHLF',
  storage: 'STOR',
  none: 'NONE',
};

// Colors for mount types
const MOUNT_TYPE_COLORS: Record<MountType, string> = {
  cage: '#3b82f6',      // blue
  cage_rect: '#6366f1', // indigo
  cage_open: '#8b5cf6', // violet
  enclosed: '#10b981',  // emerald
  angle: '#f59e0b',     // amber
  simple: '#6b7280',    // gray
  passthrough: '#ec4899', // pink
  tray: '#14b8a6',      // teal
  shelf: '#84cc16',     // lime
  storage: '#f97316',   // orange
  none: '#ef4444',      // red
};

interface DeviceOnRackProps {
  device: PlacedDevice;
  view: ViewConfig;
  isOverlapping?: boolean;
}

export function DeviceOnRack({ device, view, isOverlapping = false }: DeviceOnRackProps) {
  const { config, selectDevice, updateDeviceMountType, snapToGrid, gridSize } = useRackStore();
  const [showMountMenu, setShowMountMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Determine which side the device is on (for split mode)
  const isLeftSide = config.leftDevices.some((d) => d.id === device.id);
  const isRightSide = config.rightDevices.some((d) => d.id === device.id);

  const dims = getPlacedDeviceDimensions(device);

  // Calculate SVG position (top-left corner of device)
  const centerSvg = rackToSvg(device.offsetX, device.offsetY, view);
  const widthSvg = rackSizeToSvg(dims.width, view);
  const heightSvg = rackSizeToSvg(dims.height, view);

  // Adjust to top-left corner
  const x = centerSvg.x - widthSvg / 2;
  const y = centerSvg.y - heightSvg / 2;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: device.id,
    data: {
      type: 'placed-device',
      device,
    },
  });

  // Calculate snapped transform for live grid snapping during drag
  const getSnappedTransform = () => {
    if (!transform) return undefined;

    if (!snapToGrid) {
      return CSS.Translate.toString(transform);
    }

    // Calculate scale to convert pixels to mm
    const scale = calculateFitScale(view.svgWidth, view.svgHeight, view.rackU, view.padding) * view.zoom;

    // Convert current device position and delta to get new position in mm
    const deltaXMm = transform.x / scale;
    const deltaYMm = -transform.y / scale; // Flip Y for rack coordinates

    // Calculate new center position
    const newCenterX = device.offsetX + deltaXMm;
    const newCenterY = device.offsetY + deltaYMm;

    // Calculate the bottom-left corner position
    const cornerX = newCenterX - dims.width / 2;
    const cornerY = newCenterY - dims.height / 2;

    // Snap the corner to grid
    const snappedCornerX = Math.round(cornerX / gridSize) * gridSize;
    const snappedCornerY = Math.round(cornerY / gridSize) * gridSize;

    // Calculate new center from snapped corner
    const snappedCenterX = snappedCornerX + dims.width / 2;
    const snappedCenterY = snappedCornerY + dims.height / 2;

    // Calculate the snapped delta (difference from original position)
    const snappedDeltaXMm = snappedCenterX - device.offsetX;
    const snappedDeltaYMm = snappedCenterY - device.offsetY;

    // Convert back to pixels and round for crisp rendering
    const snappedX = Math.round(snappedDeltaXMm * scale);
    const snappedY = Math.round(-snappedDeltaYMm * scale); // Flip Y back

    return `translate3d(${snappedX}px, ${snappedY}px, 0)`;
  };

  const style: React.CSSProperties = {
    transform: getSnappedTransform(),
    cursor: isDragging ? 'grabbing' : 'grab',
    outline: 'none',
  };

  // Determine colors based on mount type and state
  let fillColor = MOUNT_TYPE_COLORS[device.mountType] || '#3b82f6';
  let strokeColor = '#1d4ed8'; // blue-700

  if (isOverlapping) {
    fillColor = '#ef4444'; // red-500
    strokeColor = '#dc2626'; // red-600
  }

  if (isDragging) {
    fillColor = MOUNT_TYPE_COLORS[device.mountType] || '#3b82f6';
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectDevice(device.id);
  };

  const handleRightClick = (e: React.MouseEvent<SVGGElement>) => {
    e.preventDefault();
    e.stopPropagation();
    selectDevice(device.id);
    // Use clientX/clientY for fixed positioning (relative to viewport)
    setMenuPosition({ x: e.clientX, y: e.clientY });
    setShowMountMenu(true);
  };

  const handleMountTypeChange = (mountType: MountType) => {
    updateDeviceMountType(device.id, mountType);
    setShowMountMenu(false);
    setMenuPosition(null);
  };

  // Close menu on click outside or escape key
  useEffect(() => {
    if (!showMountMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMountMenu(false);
        setMenuPosition(null);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMountMenu(false);
        setMenuPosition(null);
      }
    };

    // Delay adding the listener to prevent immediate close
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showMountMenu]);

  // Only show label if device is large enough
  const showLabel = widthSvg > 60 && heightSvg > 20;
  const fontSize = Math.min(12, Math.max(8, heightSvg * 0.4));

  // Mount type badge dimensions
  const badgeWidth = 32;
  const badgeHeight = 14;

  return (
    <g
      ref={setNodeRef as unknown as React.Ref<SVGGElement>}
      style={style}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      onContextMenu={handleRightClick}
      className="device-on-rack"
    >
      <rect
        x={x}
        y={y}
        width={widthSvg}
        height={heightSvg}
        fill={fillColor}
        fillOpacity={isDragging ? 0.7 : 0.85}
        stroke={strokeColor}
        strokeWidth={1}
        rx={2}
        ry={2}
        shapeRendering="crispEdges"
      />
      {showLabel && (
        <text
          x={x + widthSvg / 2}
          y={y + heightSvg / 2 - 6}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={fontSize}
          fontWeight="500"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {dims.name.length > 15 ? dims.name.substring(0, 12) + '...' : dims.name}
        </text>
      )}
      {/* Mount type badge */}
      {heightSvg > 30 && (
        <g style={{ pointerEvents: 'none' }}>
          <rect
            x={x + widthSvg / 2 - badgeWidth / 2}
            y={y + heightSvg - badgeHeight - 4}
            width={badgeWidth}
            height={badgeHeight}
            fill="rgba(0,0,0,0.5)"
            rx={2}
          />
          <text
            x={x + widthSvg / 2}
            y={y + heightSvg - badgeHeight / 2 - 3}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize={8}
            fontWeight="bold"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {MOUNT_TYPE_SHORT[device.mountType]}
          </text>
        </g>
      )}
      {/* Side indicator for split mode */}
      {config.isSplit && (isLeftSide || isRightSide) && (
        <g style={{ pointerEvents: 'none' }}>
          {/* Side stripe on the edge - L stripe on right edge, R stripe on left edge */}
          <rect
            x={isLeftSide ? x + widthSvg - 4 : x}
            y={y}
            width={4}
            height={heightSvg}
            fill={isLeftSide ? '#60a5fa' : '#f472b6'}
            rx={isLeftSide ? 0 : 3}
            ry={isLeftSide ? 0 : 3}
          />
          {/* Side badge - L on right edge, R on left edge */}
          <rect
            x={isLeftSide ? x + widthSvg - 1 : x - 1}
            y={y - 10}
            width={14}
            height={10}
            fill={isLeftSide ? '#3b82f6' : '#ec4899'}
            rx={2}
          />
          <text
            x={isLeftSide ? x + widthSvg + 6 : x + 6}
            y={y - 4}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize={7}
            fontWeight="bold"
          >
            {isLeftSide ? 'L' : 'R'}
          </text>
        </g>
      )}
      {/* Context menu rendered via React Portal to document.body */}
      {showMountMenu && menuPosition && createPortal(
        <div
          ref={menuRef}
          className="bg-gray-800 border border-gray-600 rounded shadow-lg py-1 max-h-64 overflow-y-auto"
          style={{
            position: 'fixed',
            left: menuPosition.x,
            top: menuPosition.y,
            width: 160,
            zIndex: 9999,
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div className="px-2 py-1 text-xs text-gray-400 border-b border-gray-700">
            Mount Type
          </div>
          {(Object.keys(MOUNT_TYPE_LABELS) as MountType[]).map((mt) => (
            <button
              key={mt}
              onClick={(e) => {
                e.stopPropagation();
                handleMountTypeChange(mt);
              }}
              className={`w-full px-3 py-1.5 text-left text-sm hover:bg-gray-700 flex items-center gap-2 ${
                device.mountType === mt ? 'bg-gray-700 text-white' : 'text-gray-300'
              }`}
            >
              <span
                className="w-3 h-3 rounded"
                style={{ backgroundColor: MOUNT_TYPE_COLORS[mt] }}
              />
              {MOUNT_TYPE_LABELS[mt]}
            </button>
          ))}
        </div>,
        document.body
      )}
    </g>
  );
}
