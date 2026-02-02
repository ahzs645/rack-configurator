// JSCAD Web Worker
// Runs JSCAD modeling in a separate thread and serializes to STL

import { generateRack } from '../jscad/rack-generator';
import { serialize } from '@jscad/stl-serializer';
import type { RackConfig } from '../state/types';
import type { WorkerMessage, WorkerResponse, JscadResult } from './types';

let isReady = false;

// Send a message to the main thread
function postResponse(response: WorkerResponse) {
  self.postMessage(response);
}

/**
 * Render a rack configuration to STL
 */
function render(config: RackConfig): JscadResult {
  const startTime = Date.now();

  try {
    // Generate 3D geometry using JSCAD modeling
    const geometry = generateRack(config);

    // Serialize to binary STL
    const stlData = serialize({ binary: true }, geometry);

    // stlData is an array of ArrayBuffers, combine them
    let totalLength = 0;
    for (const chunk of stlData) {
      totalLength += (chunk as ArrayBuffer).byteLength;
    }

    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of stlData) {
      combined.set(new Uint8Array(chunk as ArrayBuffer), offset);
      offset += (chunk as ArrayBuffer).byteLength;
    }

    return {
      success: true,
      output: combined.buffer as ArrayBuffer,
      renderTime: Date.now() - startTime,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
      renderTime: Date.now() - startTime,
    };
  }
}

// Initialize
function initialize() {
  try {
    postResponse({ type: 'progress', payload: 'Initializing JSCAD...' });

    // JSCAD doesn't need special initialization like OpenSCAD WASM
    // It's pure JavaScript that runs directly
    isReady = true;
    postResponse({ type: 'ready' });
  } catch (e) {
    postResponse({
      type: 'error',
      payload: e instanceof Error ? e.message : String(e),
    });
  }
}

// Handle messages from main thread
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, id, payload } = event.data;

  switch (type) {
    case 'init':
      initialize();
      break;

    case 'invoke':
      if (!isReady) {
        postResponse({
          type: 'result',
          id,
          payload: { success: false, error: 'JSCAD not ready' },
        });
        return;
      }

      if (!payload) {
        postResponse({
          type: 'result',
          id,
          payload: { success: false, error: 'No payload provided' },
        });
        return;
      }

      const result = render(payload.config);

      postResponse({
        type: 'result',
        id,
        payload: result,
      });
      break;

    case 'cancel':
      // TODO: Implement cancellation
      break;
  }
};
