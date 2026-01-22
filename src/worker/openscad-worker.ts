// OpenSCAD Web Worker
// This worker runs OpenSCAD WASM in a separate thread

import type { WorkerMessage, WorkerResponse, OpenSCADResult } from './types';

declare const self: DedicatedWorkerGlobalScope;
declare const BrowserFS: {
  configure: (config: unknown, callback: (e?: Error) => void) => void;
  BFSRequire: (module: string) => unknown;
  FileSystem: {
    InMemory: { Create: (opts: unknown, cb: (e?: Error, fs?: unknown) => void) => void };
    ZipFS: { Create: (opts: { zipData: ArrayBuffer }, cb: (e?: Error, fs?: unknown) => void) => void };
    OverlayFS: { Create: (opts: { readable: unknown; writable: unknown }, cb: (e?: Error, fs?: unknown) => void) => void };
    MountableFileSystem: { Create: (opts: { '/': unknown }, cb: (e?: Error, fs?: unknown) => void) => void };
  };
  initialize: (fs: unknown) => void;
  EmscriptenFS: new (module: unknown, fs: unknown, path: unknown) => unknown;
};

// Load BrowserFS and OpenSCAD
importScripts('/browserfs.min.js');

let openscadInstance: {
  FS: {
    writeFile: (path: string, data: string | Uint8Array) => void;
    readFile: (path: string, opts?: { encoding?: string }) => Uint8Array | string;
    mkdir: (path: string) => void;
    mount: (fs: unknown, opts: unknown, path: string) => void;
    unlink: (path: string) => void;
    stat: (path: string) => { isDirectory: () => boolean };
  };
  callMain: (args: string[]) => number;
} | null = null;

let isReady = false;
let rackScadFS: unknown = null;

// Send a message to the main thread
function postResponse(response: WorkerResponse) {
  self.postMessage(response);
}

// Initialize BrowserFS and load libraries
async function initializeFilesystem(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Create in-memory filesystem for writing
    BrowserFS.FileSystem.InMemory.Create({}, (e, memfs) => {
      if (e || !memfs) {
        reject(e || new Error('Failed to create InMemory FS'));
        return;
      }

      // Create mountable filesystem
      BrowserFS.FileSystem.MountableFileSystem.Create({ '/': memfs }, (e, mfs) => {
        if (e || !mfs) {
          reject(e || new Error('Failed to create MountableFileSystem'));
          return;
        }

        BrowserFS.initialize(mfs);
        resolve();
      });
    });
  });
}

// Load the rack-scad library ZIP
async function loadRackScadLibrary(): Promise<void> {
  const response = await fetch('/rack-scad.zip');
  if (!response.ok) {
    throw new Error('Failed to load rack-scad.zip');
  }

  const zipData = await response.arrayBuffer();

  return new Promise((resolve, reject) => {
    BrowserFS.FileSystem.ZipFS.Create({ zipData }, (e, zipfs) => {
      if (e || !zipfs) {
        reject(e || new Error('Failed to create ZipFS'));
        return;
      }

      rackScadFS = zipfs;
      resolve();
    });
  });
}

// Initialize OpenSCAD WASM
async function initializeOpenSCAD(): Promise<void> {
  // Dynamic import of OpenSCAD WASM module
  const response = await fetch('/openscad.js');
  const text = await response.text();

  // Create a function from the module text
  const moduleFactory = new Function('Module', text + '\nreturn Module;');

  return new Promise((resolve, reject) => {
    const moduleConfig = {
      noInitialRun: true,
      print: (text: string) => {
        console.log('[OpenSCAD]', text);
      },
      printErr: (text: string) => {
        console.error('[OpenSCAD]', text);
      },
      locateFile: (path: string) => {
        if (path.endsWith('.wasm')) {
          return '/openscad.wasm';
        }
        return path;
      },
      onRuntimeInitialized: () => {
        openscadInstance = moduleConfig as typeof openscadInstance;
        resolve();
      },
    };

    try {
      moduleFactory(moduleConfig);
    } catch (e) {
      reject(e);
    }
  });
}

// Perform a render
async function render(
  id: string,
  scadCode: string,
  outputFormat: 'stl' | 'off',
  variables?: Record<string, unknown>
): Promise<OpenSCADResult> {
  if (!openscadInstance) {
    return { success: false, error: 'OpenSCAD not initialized' };
  }

  const startTime = Date.now();
  let stdout = '';
  let stderr = '';

  try {
    const FS = openscadInstance.FS;

    // Write the input SCAD file
    const inputPath = '/input.scad';
    const outputPath = `/output.${outputFormat}`;

    // Add variable definitions to the code
    let fullCode = scadCode;
    if (variables) {
      const varDefs = Object.entries(variables)
        .map(([key, value]) => {
          if (typeof value === 'string') {
            return `${key} = "${value}";`;
          } else if (typeof value === 'boolean') {
            return `${key} = ${value ? 'true' : 'false'};`;
          } else {
            return `${key} = ${value};`;
          }
        })
        .join('\n');
      fullCode = varDefs + '\n' + scadCode;
    }

    FS.writeFile(inputPath, fullCode);

    // Build arguments
    const args = [
      inputPath,
      '-o', outputPath,
      '--backend=manifold',
      `--export-format=${outputFormat === 'stl' ? 'binstl' : outputFormat}`,
    ];

    // Run OpenSCAD
    const result = openscadInstance.callMain(args);

    if (result !== 0) {
      return {
        success: false,
        error: `OpenSCAD exited with code ${result}`,
        stdout,
        stderr,
        renderTime: Date.now() - startTime,
      };
    }

    // Read output file
    const outputData = FS.readFile(outputPath) as Uint8Array;

    // Clean up
    try {
      FS.unlink(inputPath);
      FS.unlink(outputPath);
    } catch {
      // Ignore cleanup errors
    }

    return {
      success: true,
      output: outputData.buffer,
      stdout,
      stderr,
      renderTime: Date.now() - startTime,
    };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : String(e),
      stdout,
      stderr,
      renderTime: Date.now() - startTime,
    };
  }
}

// Initialize everything
async function initialize() {
  try {
    postResponse({ type: 'progress', payload: 'Initializing filesystem...' });
    await initializeFilesystem();

    postResponse({ type: 'progress', payload: 'Loading rack-scad library...' });
    await loadRackScadLibrary();

    postResponse({ type: 'progress', payload: 'Initializing OpenSCAD WASM...' });
    await initializeOpenSCAD();

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
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, id, payload } = event.data;

  switch (type) {
    case 'init':
      await initialize();
      break;

    case 'invoke':
      if (!isReady) {
        postResponse({
          type: 'result',
          id,
          payload: { success: false, error: 'OpenSCAD not ready' },
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

      const result = await render(
        id,
        payload.scadCode,
        payload.outputFormat,
        payload.variables
      );

      postResponse({ type: 'result', id, payload: result });
      break;

    case 'cancel':
      // TODO: Implement cancellation
      break;
  }
};

// Export for TypeScript
export {};
