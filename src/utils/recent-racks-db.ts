import type { RackConfig } from '../state/types';
import { DEVICES } from '../data/devices';
import type { RackDevice } from '../data/devices';

const DB_NAME = 'rack-configurator';
const DB_VERSION = 1;
const STORE_NAME = 'recent-racks';
const MAX_RECENT_RACKS = 3;

export interface RecentRack {
  id: string;
  name: string;
  config: RackConfig;
  timestamp: number;
  deviceCount: number;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

function generateRackName(config: RackConfig): string {
  const allDevices = [
    ...config.devices,
    ...config.leftDevices,
    ...config.rightDevices,
  ];

  const deviceCount = allDevices.length;
  const splitLabel = config.isSplit ? ' Split' : '';

  if (deviceCount === 0) {
    return `${config.rackU}U${splitLabel} Rack (Empty)`;
  }

  // Get the first device name for context
  const firstDevice = allDevices[0];
  let deviceName = 'Custom Device';
  if (firstDevice.deviceId !== 'custom') {
    const device = DEVICES.find((d: RackDevice) => d.id === firstDevice.deviceId);
    if (device) {
      deviceName = device.name;
    }
  } else if (firstDevice.customName) {
    deviceName = firstDevice.customName;
  }

  if (deviceCount === 1) {
    return `${config.rackU}U${splitLabel} - ${deviceName}`;
  }

  return `${config.rackU}U${splitLabel} - ${deviceName} +${deviceCount - 1}`;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export async function saveRecentRack(config: RackConfig): Promise<void> {
  const db = await openDatabase();

  const allDevices = [
    ...config.devices,
    ...config.leftDevices,
    ...config.rightDevices,
  ];

  const recentRack: RecentRack = {
    id: generateId(),
    name: generateRackName(config),
    config: JSON.parse(JSON.stringify(config)), // Deep clone
    timestamp: Date.now(),
    deviceCount: allDevices.length,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // Add the new rack
    store.add(recentRack);

    transaction.oncomplete = async () => {
      // Cleanup old racks (keep only MAX_RECENT_RACKS)
      await pruneOldRacks();
      resolve();
    };

    transaction.onerror = () => reject(transaction.error);
  });
}

async function pruneOldRacks(): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');

    // Get all racks sorted by timestamp descending
    const request = index.openCursor(null, 'prev');
    const racksToKeep: string[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

      if (cursor) {
        if (racksToKeep.length < MAX_RECENT_RACKS) {
          racksToKeep.push(cursor.value.id);
          cursor.continue();
        } else {
          // Delete this rack (it's beyond the limit)
          store.delete(cursor.value.id);
          cursor.continue();
        }
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getRecentRacks(): Promise<RecentRack[]> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');

    const racks: RecentRack[] = [];
    const request = index.openCursor(null, 'prev'); // Newest first

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;

      if (cursor && racks.length < MAX_RECENT_RACKS) {
        racks.push(cursor.value);
        cursor.continue();
      } else {
        resolve(racks);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

export async function deleteRecentRack(id: string): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearRecentRacks(): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
