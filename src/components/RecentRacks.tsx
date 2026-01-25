import { useState, useEffect } from 'react';
import { getRecentRacks, deleteRecentRack, type RecentRack } from '../utils/recent-racks-db';
import { useRackStore } from '../state/rack-store';

interface RecentRacksProps {
  onLoad?: () => void;
}

export function RecentRacks({ onLoad }: RecentRacksProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [recentRacks, setRecentRacks] = useState<RecentRack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const loadConfig = useRackStore((state) => state.loadConfig);

  const fetchRecentRacks = async () => {
    setIsLoading(true);
    try {
      const racks = await getRecentRacks();
      setRecentRacks(racks);
    } catch (error) {
      console.error('Failed to load recent racks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRecentRacks();
    }
  }, [isOpen]);

  const handleLoadRack = (rack: RecentRack) => {
    loadConfig(rack.config);
    setIsOpen(false);
    onLoad?.();
  };

  const handleDeleteRack = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteRecentRack(id);
      setRecentRacks((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.error('Failed to delete rack:', error);
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded transition-colors"
        title="Recent racks"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Recent
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-1 min-w-[280px] z-50">
            <div className="px-3 py-2 border-b border-gray-700">
              <h3 className="text-sm font-medium text-white">Recent Racks</h3>
              <p className="text-xs text-gray-500">Load a recently exported rack</p>
            </div>

            {isLoading ? (
              <div className="px-3 py-4 text-center">
                <svg
                  className="animate-spin w-5 h-5 mx-auto text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
            ) : recentRacks.length === 0 ? (
              <div className="px-3 py-4 text-center text-gray-500 text-sm">
                <svg
                  className="w-8 h-8 mx-auto mb-2 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                  />
                </svg>
                No recent racks yet.
                <br />
                Export a rack to save it here.
              </div>
            ) : (
              <div className="py-1">
                {recentRacks.map((rack) => (
                  <div
                    key={rack.id}
                    onClick={() => handleLoadRack(rack)}
                    className="px-3 py-2 hover:bg-gray-700 cursor-pointer group flex items-start gap-3"
                  >
                    {/* Rack icon */}
                    <div className="flex-shrink-0 w-10 h-10 bg-gray-700 rounded flex items-center justify-center text-gray-400 group-hover:bg-gray-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8"
                        />
                      </svg>
                    </div>

                    {/* Rack info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {rack.name}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <span>{rack.deviceCount} device{rack.deviceCount !== 1 ? 's' : ''}</span>
                        <span>·</span>
                        <span>{formatTimeAgo(rack.timestamp)}</span>
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDeleteRack(e, rack.id)}
                      className="flex-shrink-0 p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove from recent"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
