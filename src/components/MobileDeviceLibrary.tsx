import { useState } from 'react';
import type { RackDevice, DeviceCategory } from '../data/devices';
import {
  DEVICES,
  CATEGORY_LABELS,
  getAllCategories,
  getDevicesByCategory,
} from '../data/devices';
import { useRackStore } from '../state/rack-store';
import type { MountType } from '../state/types';

function CustomDeviceForm({ isExpanded, onToggle }: { isExpanded: boolean; onToggle: () => void }) {
  const { addCustomDevice } = useRackStore();
  const [name, setName] = useState('Custom Device');
  const [width, setWidth] = useState(100);
  const [height, setHeight] = useState(40);
  const [depth, setDepth] = useState(100);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    if (name.trim() && width > 0 && height > 0 && depth > 0) {
      addCustomDevice(name.trim(), width, height, depth, 0, 0, 'cage');
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    }
  };

  return (
    <div className="border-b border-gray-700">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between active:bg-gray-700 transition-colors"
      >
        <span className="text-sm font-medium text-blue-400">+ Custom Device</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
              placeholder="Device name"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">W (mm)</label>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-2 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                min="1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">H (mm)</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-2 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                min="1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">D (mm)</label>
              <input
                type="number"
                value={depth}
                onChange={(e) => setDepth(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-2 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                min="1"
              />
            </div>
          </div>
          <button
            onClick={handleAdd}
            className={`w-full py-2.5 text-white text-sm font-medium rounded-lg transition-colors ${
              added ? 'bg-green-600' : 'bg-blue-600 active:bg-blue-500'
            }`}
          >
            {added ? 'Added!' : 'Add to Rack'}
          </button>
        </div>
      )}
    </div>
  );
}

function MobileDeviceCard({ device }: { device: RackDevice }) {
  const { addDevice } = useRackStore();
  const [added, setAdded] = useState(false);

  const handleTap = () => {
    let mountType: MountType = 'cage';
    if (device.id === 'patch_panel') {
      mountType = 'patch_panel';
    } else if (device.allowedMountTypes && device.allowedMountTypes.length > 0) {
      mountType = device.allowedMountTypes[0];
    }
    addDevice(device.id, 0, 0, mountType);
    setAdded(true);
    setTimeout(() => setAdded(false), 1000);
  };

  return (
    <button
      onClick={handleTap}
      className={`w-full text-left rounded-lg p-3 transition-colors ${
        added
          ? 'bg-green-600/20 ring-1 ring-green-500'
          : 'bg-gray-700 active:bg-gray-600'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="text-sm text-white font-medium truncate">{device.name}</div>
          <div className="text-xs text-gray-400">
            {device.width} x {device.height} x {device.depth} mm
          </div>
        </div>
        <div className={`ml-2 flex-shrink-0 transition-colors ${added ? 'text-green-400' : 'text-gray-500'}`}>
          {added ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          )}
        </div>
      </div>
    </button>
  );
}

function CategorySection({ category, devices, isExpanded, onToggle }: {
  category: DeviceCategory;
  devices: RackDevice[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-gray-700">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between active:bg-gray-700 transition-colors"
      >
        <span className="text-sm font-medium text-gray-200">
          {CATEGORY_LABELS[category]}
        </span>
        <span className="text-gray-400 flex items-center gap-2">
          <span className="text-xs bg-gray-600 px-2 py-0.5 rounded-full">{devices.length}</span>
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      {isExpanded && (
        <div className="px-4 pb-3 space-y-2">
          {devices.map((device) => (
            <MobileDeviceCard key={device.id} device={device} />
          ))}
        </div>
      )}
    </div>
  );
}

export function MobileDeviceLibrary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<DeviceCategory>>(
    new Set(['accessories', 'mini_pc', 'network'])
  );

  const toggleCategory = (category: DeviceCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
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
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-4 border-b border-gray-700">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search devices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2">Tap a device to add it to the rack</p>
      </div>

      {/* Device list */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <CustomDeviceForm
          isExpanded={showCustomForm}
          onToggle={() => setShowCustomForm(!showCustomForm)}
        />

        {filteredDevices ? (
          <div className="p-4 space-y-2">
            {filteredDevices.length === 0 ? (
              <div className="text-gray-400 text-sm text-center py-8">
                <svg className="w-8 h-8 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                No devices found
              </div>
            ) : (
              filteredDevices.map((device) => (
                <MobileDeviceCard key={device.id} device={device} />
              ))
            )}
          </div>
        ) : (
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
      <div className="p-3 border-t border-gray-700 text-center text-xs text-gray-500">
        {DEVICES.length} devices available
      </div>
    </div>
  );
}
