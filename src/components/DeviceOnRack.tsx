import { useState, useEffect, useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { PlacedDevice, MountType } from '../state/types';
import { MOUNT_TYPE_LABELS } from '../state/types';
import { getPlacedDeviceDimensions } from '../utils/scad-generator';
import type { ViewConfig } from '../utils/coordinates';
import { rackToSvg, rackSizeToSvg } from '../utils/coordinates';
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
  const { config, selectedDeviceId, selectDevice, updateDeviceMountType } = useRackStore();
  const isSelected = selectedDeviceId === device.id;
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

  const style: React.CSSProperties = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  // Determine colors based on mount type and state
  let fillColor = MOUNT_TYPE_COLORS[device.mountType] || '#3b82f6';
  let strokeColor = '#1d4ed8'; // blue-700
  let strokeWidth = 2;

  if (isSelected) {
    strokeColor = '#f59e0b'; // amber-500
    strokeWidth = 3;
  }

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
    // Store the click position for the menu using native event for accurate coords
    const nativeEvent = e.nativeEvent;
    setMenuPosition({ x: nativeEvent.pageX, y: nativeEvent.pageY });
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
        strokeWidth={strokeWidth}
        rx={3}
        ry={3}
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
          {/* Side stripe on the edge */}
          <rect
            x={isLeftSide ? x : x + widthSvg - 4}
            y={y}
            width={4}
            height={heightSvg}
            fill={isLeftSide ? '#60a5fa' : '#f472b6'}
            rx={isLeftSide ? 3 : 0}
            ry={isLeftSide ? 3 : 0}
          />
          {/* Side badge */}
          <rect
            x={isLeftSide ? x - 1 : x + widthSvg - 13}
            y={y - 10}
            width={14}
            height={10}
            fill={isLeftSide ? '#3b82f6' : '#ec4899'}
            rx={2}
          />
          <text
            x={isLeftSide ? x + 6 : x + widthSvg - 6}
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
      {/* Selection handles */}
      {isSelected && !isDragging && (
        <>
          <rect
            x={x - 4}
            y={y - 4}
            width={8}
            height={8}
            fill="#f59e0b"
            stroke="#78350f"
            strokeWidth={1}
          />
          <rect
            x={x + widthSvg - 4}
            y={y - 4}
            width={8}
            height={8}
            fill="#f59e0b"
            stroke="#78350f"
            strokeWidth={1}
          />
          <rect
            x={x - 4}
            y={y + heightSvg - 4}
            width={8}
            height={8}
            fill="#f59e0b"
            stroke="#78350f"
            strokeWidth={1}
          />
          <rect
            x={x + widthSvg - 4}
            y={y + heightSvg - 4}
            width={8}
            height={8}
            fill="#f59e0b"
            stroke="#78350f"
            strokeWidth={1}
          />
        </>
      )}
      {/* Context menu rendered via portal */}
      {showMountMenu && menuPosition && (
        <foreignObject x={0} y={0} width={1} height={1} style={{ overflow: 'visible' }}>
          <div
            ref={menuRef}
            className="bg-gray-800 border border-gray-600 rounded shadow-lg py-1 max-h-64 overflow-y-auto"
            style={{
              position: 'fixed',
              left: menuPosition.x,
              top: menuPosition.y,
              width: 160,
              zIndex: 1000,
            }}
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
          </div>
        </foreignObject>
      )}
    </g>
  );
}
