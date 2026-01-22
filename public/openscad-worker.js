// OpenSCAD Web Worker
// This worker runs OpenSCAD WASM in a separate thread

// Load BrowserFS
importScripts('/browserfs.min.js');

let openscadInstance = null;
let isReady = false;
let rackScadFS = null;
let openscadFactory = null; // Store the factory to create new instances

// Send a message to the main thread
function postResponse(response) {
  self.postMessage(response);
}

// Initialize BrowserFS and load libraries
async function initializeFilesystem() {
  return new Promise((resolve, reject) => {
    BrowserFS.FileSystem.InMemory.Create({}, (e, memfs) => {
      if (e || !memfs) {
        reject(e || new Error('Failed to create InMemory FS'));
        return;
      }

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

// Load the rack-scad library ZIP and mount it
async function loadRackScadLibrary() {
  const response = await fetch('/rack-scad.zip');
  if (!response.ok) {
    throw new Error('Failed to load rack-scad.zip');
  }

  const arrayBuffer = await response.arrayBuffer();

  // BrowserFS ZipFS expects a Buffer, not an ArrayBuffer
  const Buffer = BrowserFS.BFSRequire('buffer').Buffer;
  const zipData = Buffer.from(arrayBuffer);

  return new Promise((resolve, reject) => {
    BrowserFS.FileSystem.ZipFS.Create({ zipData }, (e, zipfs) => {
      if (e || !zipfs) {
        reject(e || new Error('Failed to create ZipFS'));
        return;
      }

      rackScadFS = zipfs;

      // Mount the ZipFS at /libraries in BrowserFS
      // The zip contains components/ folder, so files will be at /libraries/components/
      const fs = BrowserFS.BFSRequire('fs');
      try {
        fs.mkdirSync('/libraries');
      } catch (e) {
        // Directory may already exist
      }

      // Get the MountableFileSystem and mount the ZipFS
      const rootFS = fs.getRootFS();
      if (rootFS && rootFS.mount) {
        rootFS.mount('/libraries', zipfs);
        console.log('[OpenSCAD Worker] Mounted rack-scad library at /libraries');

        // List contents to verify
        try {
          const files = fs.readdirSync('/libraries');
          console.log('[OpenSCAD Worker] /libraries contents:', files);
          if (files.includes('components')) {
            const componentFiles = fs.readdirSync('/libraries/components');
            console.log('[OpenSCAD Worker] /libraries/components contents:', componentFiles);
          }
        } catch (e) {
          console.log('[OpenSCAD Worker] Could not list directory:', e);
        }
      } else {
        console.warn('[OpenSCAD Worker] Could not mount ZipFS - no mount method');
      }

      resolve();
    });
  });
}

// Initialize OpenSCAD WASM - just load the factory
async function initializeOpenSCAD() {
  const response = await fetch('/openscad.js');
  let text = await response.text();

  // Patch import.meta.url which doesn't work in classic workers
  text = text.replace(/import\.meta\.url/g, '"/"');

  // Remove ES module export statement
  text = text.replace(/export\s+default\s+\w+;?/g, '');

  // Evaluate the script to get the OpenSCAD factory function
  const evalFunc = new Function(text + '\nreturn OpenSCAD;');
  openscadFactory = evalFunc();

  // Create initial instance to verify it works
  await createOpenSCADInstance();
}

// Create a fresh OpenSCAD instance (needed for each render since WASM can't be reused after abort)
async function createOpenSCADInstance() {
  return new Promise((resolve, reject) => {
    const moduleConfig = {
      noInitialRun: true,
      print: (text) => {
        console.log('[OpenSCAD]', text);
      },
      printErr: (text) => {
        console.error('[OpenSCAD]', text);
      },
      locateFile: (path) => {
        if (path.endsWith('.wasm')) {
          return '/openscad.wasm';
        }
        return path;
      },
    };

    try {
      openscadFactory(moduleConfig).then((instance) => {
        openscadInstance = instance;

        // Mount BrowserFS to OpenSCAD's Emscripten filesystem
        if (rackScadFS) {
          try {
            // Create mount point
            try { instance.FS.mkdir('/libraries'); } catch(e) { /* may exist */ }

            // Mount BrowserFS to Emscripten FS
            const BFS = new BrowserFS.EmscriptenFS(
              instance.FS,
              instance.PATH || { join: (...args) => args.join('/'), join2: (a, b) => `${a}/${b}` },
              instance.ERRNO_CODES || {}
            );
            instance.FS.mount(BFS, { root: '/libraries' }, '/libraries');

            // Create symlink so components/ resolves correctly
            try {
              instance.FS.symlink('/libraries/components', '/components');
            } catch (e) {
              // Alternative: mount directly at /components
              try { instance.FS.mkdir('/components'); } catch(e) {}
              instance.FS.mount(BFS, { root: '/libraries/components' }, '/components');
            }
          } catch (e) {
            console.error('[OpenSCAD Worker] Failed to mount rack-scad library:', e);
          }
        }

        resolve(instance);
      }).catch(reject);
    } catch (e) {
      reject(e);
    }
  });
}

// Perform a render
async function render(id, scadCode, outputFormat, variables) {
  if (!openscadFactory) {
    return { success: false, error: 'OpenSCAD not initialized' };
  }

  const startTime = Date.now();
  let stdout = '';
  let stderr = '';

  try {
    // Create a fresh instance for each render (WASM instances can't be reused after callMain)
    await createOpenSCADInstance();
    const FS = openscadInstance.FS;

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

    const args = [
      inputPath,
      '-o', outputPath,
      '--backend=manifold',
      `--export-format=${outputFormat === 'stl' ? 'binstl' : outputFormat}`,
    ];

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

    const outputData = FS.readFile(outputPath);

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
self.onmessage = async (event) => {
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
