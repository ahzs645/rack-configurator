// OpenSCAD Runner - Manages the Web Worker from the main thread

import type { WorkerMessage, WorkerResponse, OpenSCADInvocation, OpenSCADResult } from './types';

type StatusCallback = (status: string) => void;
type ResultCallback = (result: OpenSCADResult) => void;

let worker: Worker | null = null;
let isInitialized = false;
let initPromise: Promise<void> | null = null;
let pendingRequests = new Map<string, { resolve: ResultCallback; reject: (e: Error) => void }>();
let statusCallback: StatusCallback | null = null;

// Generate a unique ID for each request
function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Set a callback for status updates
export function setStatusCallback(callback: StatusCallback | null) {
  statusCallback = callback;
}

// Initialize the worker
export async function initializeWorker(): Promise<void> {
  if (isInitialized) return;
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    try {
      // Create the worker from the public folder (plain JS, no bundling needed)
      // Use import.meta.env.BASE_URL to support deployment to subdirectories (e.g., GitHub Pages)
      worker = new Worker(`${import.meta.env.BASE_URL}openscad-worker.js`);

      // Handle messages from the worker
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const { type, id, payload } = event.data;

        switch (type) {
          case 'ready':
            isInitialized = true;
            resolve();
            break;

          case 'progress':
            if (statusCallback && typeof payload === 'string') {
              statusCallback(payload);
            }
            break;

          case 'result':
            if (id && pendingRequests.has(id)) {
              const { resolve: resultResolve } = pendingRequests.get(id)!;
              pendingRequests.delete(id);
              resultResolve(payload as OpenSCADResult);
            }
            break;

          case 'error':
            if (!isInitialized) {
              reject(new Error(typeof payload === 'string' ? payload : 'Worker initialization failed'));
            }
            break;
        }
      };

      worker.onerror = (e) => {
        console.error('Worker error:', e);
        if (!isInitialized) {
          reject(new Error('Worker failed to initialize'));
        }
      };

      // Send init message
      const initMessage: WorkerMessage = { type: 'init', id: 'init' };
      worker.postMessage(initMessage);
    } catch (e) {
      reject(e);
    }
  });

  return initPromise;
}

// Render SCAD code to STL
export async function renderScad(invocation: OpenSCADInvocation): Promise<OpenSCADResult> {
  if (!worker || !isInitialized) {
    await initializeWorker();
  }

  if (!worker) {
    return { success: false, error: 'Worker not available' };
  }

  return new Promise((resolve, reject) => {
    const id = generateId();

    pendingRequests.set(id, { resolve, reject });

    const message: WorkerMessage = {
      type: 'invoke',
      id,
      payload: invocation,
    };

    worker!.postMessage(message);

    // Timeout after 5 minutes
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        resolve({ success: false, error: 'Render timed out' });
      }
    }, 5 * 60 * 1000);
  });
}

// Check if the worker is ready
export function isWorkerReady(): boolean {
  return isInitialized;
}

// Terminate the worker
export function terminateWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
    isInitialized = false;
    initPromise = null;
    pendingRequests.clear();
  }
}
