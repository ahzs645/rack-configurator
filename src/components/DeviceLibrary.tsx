import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { RackDevice, DeviceCategory } from '../data/devices';
import {
  DEVICES,
  CATEGORY_LABELS,
  getAllCategories,
  getDevicesByCategory,
} from '../data/devices';
import { useRackStore } from '../state/rack-store';

interface DeviceCardProps {
  device: RackDevice;
}

function DeviceCard({ device }: DeviceCardProps) {
  const { addDevice } = useRackStore();

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library-${device.id}`,
    data: {
      type: 'library-device',
      deviceId: device.id,
    },
  });

  const handleDoubleClick = () => {
    addDevice(device.id, 0, 0, 'cage');
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`bg-gray-700 hover:bg-gray-600 rounded p-2 cursor-grab active:cursor-grabbing transition-colors ${
        isDragging ? 'opacity-30' : ''
      }`}
      onDoubleClick={handleDoubleClick}
      title={`${device.name}\n${device.width}x${device.height}x${device.depth}mm\nDouble-click to add at center`}
    >
      <div className="text-sm text-white font-medium truncate">{device.name}</div>
      <div className="text-xs text-gray-400">
        {device.width} x {device.height} x {device.depth} mm
      </div>
    </div>
  );
}

interface CategorySectionProps {
  category: DeviceCategory;
  devices: RackDevice[];
  isExpanded: boolean;
  onToggle: () => void;
}

function CategorySection({ category, devices, isExpanded, onToggle }: CategorySectionProps) {
  return (
    <div className="border-b border-gray-700">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-700 transition-colors"
      >
        <span className="text-sm font-medium text-gray-200">
          {CATEGORY_LABELS[category]}
        </span>
        <span className="text-gray-400 flex items-center gap-2">
          <span className="text-xs bg-gray-600 px-2 py-0.5 rounded">{devices.length}</span>
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {devices.map((device) => (
            <DeviceCard key={device.id} device={device} />
          ))}
        </div>
      )}
    </div>
  );
}

export function DeviceLibrary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<DeviceCategory>>(
    new Set(['mini_pc', 'network'])
  );

  const toggleCategory = (category: DeviceCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const filteredDevices = searchQuery
    ? DEVICES.filter(
        (d) =>
          d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  return (
    <div className="w-64 bg-gray-800 flex flex-col h-full border-r border-gray-700 flex-shrink-0 overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-2">Device Library</h2>
        <input
          type="text"
          placeholder="Search devices..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Device list */}
      <div className="flex-1 overflow-y-auto">
        {filteredDevices ? (
          // Search results
          <div className="p-3 space-y-2">
            {filteredDevices.length === 0 ? (
              <div className="text-gray-400 text-sm text-center py-4">No devices found</div>
            ) : (
              filteredDevices.map((device) => (
                <DeviceCard key={device.id} device={device} />
              ))
            )}
          </div>
        ) : (
          // Category list
          getAllCategories().map((category) => (
            <CategorySection
              key={category}
              category={category}
              devices={getDevicesByCategory(category)}
              isExpanded={expandedCategories.has(category)}
              onToggle={() => toggleCategory(category)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-700 text-xs text-gray-400">
        <p>Drag device to rack or double-click to add at center</p>
        <p className="mt-1">{DEVICES.length} devices available</p>
      </div>
    </div>
  );
}
