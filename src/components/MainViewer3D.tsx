import { useRef, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { fitViewerCamera, zoomViewerCamera } from '../utils/viewer-camera';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useRackStore } from '../state/rack-store';
import { useLiveScadRender } from '../hooks/useLiveScadRender';

export function MainViewer3D() {
  const isMobile = useIsMobile();
  const { config } = useRackStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    animationId: number;
    controls: OrbitControls;
  } | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const [dragMode, setDragMode] = useState<'rotate' | 'pan'>('rotate');

  const fitView = () => {
    const state = sceneRef.current;
    const geometry = meshRef.current?.geometry;
    if (!state || !geometry) return;
    geometry.computeBoundingSphere();
    fitViewerCamera(state.camera, state.controls.target, geometry.boundingSphere?.radius ?? 250);
    state.controls.update();
  };

  const zoomView = (factor: number) => {
    const state = sceneRef.current;
    if (!state) return;
    zoomViewerCamera(state.camera, state.controls.target, factor, state.controls.minDistance, state.controls.maxDistance);
    state.controls.update();
  };

  const { stlData, isRendering, error, lastRenderTime } = useLiveScadRender();

  // Parse STL data into geometry
  const stlGeometry = useMemo(() => {
    if (!stlData) return null;
    try {
      const loader = new STLLoader();
      const geometry = loader.parse(stlData);
      geometry.computeVertexNormals();
      // Center the geometry
      geometry.computeBoundingBox();
      if (geometry.boundingBox) {
        const center = new THREE.Vector3();
        geometry.boundingBox.getCenter(center);
        geometry.translate(-center.x, -center.y, -center.z);
      }
      return geometry;
    } catch (e) {
      console.error('Failed to parse STL:', e);
      return null;
    }
  }, [stlData]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(300, 200, 400);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(200, 300, 200);
    scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-200, -100, -200);
    scene.add(directionalLight2);

    // Grid helper
    const gridHelper = new THREE.GridHelper(500, 50, 0x444444, 0x333333);
    gridHelper.position.y = -100;
    scene.add(gridHelper);

    // OrbitControls moves the camera and its target together when panning.
    // Wheel zoom follows the cursor so off-center details stay under the pointer.
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.screenSpacePanning = true;
    controls.zoomToCursor = true;
    controls.minDistance = 5;
    controls.maxDistance = 5000;
    controls.rotateSpeed = 0.7;
    controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    renderer.domElement.style.cursor = 'grab';
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D rack view');
    renderer.domElement.setAttribute('role', 'img');
    sceneRef.current = { scene, camera, renderer, animationId: 0, controls };

    const animate = () => {
      if (!sceneRef.current) return;
      sceneRef.current.animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !sceneRef.current) return;
      const w = Math.max(1, containerRef.current.clientWidth);
      const h = Math.max(1, containerRef.current.clientHeight);
      sceneRef.current.camera.aspect = w / h;
      sceneRef.current.camera.updateProjectionMatrix();
      sceneRef.current.renderer.setSize(w, h);
    };
    const observer = new ResizeObserver(handleResize);
    observer.observe(container);

    return () => {
      observer.disconnect();
      controls.dispose();
      gridHelper.geometry.dispose();
      const gridMaterials = Array.isArray(gridHelper.material) ? gridHelper.material : [gridHelper.material];
      gridMaterials.forEach(material => material.dispose());
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animationId);
        sceneRef.current.renderer.dispose();
        container.removeChild(sceneRef.current.renderer.domElement);
        sceneRef.current = null;
      }
      if (meshRef.current) {
        meshRef.current.geometry.dispose();
        if (meshRef.current.material instanceof THREE.Material) meshRef.current.material.dispose();
        meshRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const state = sceneRef.current;
    if (!state) return;
    state.controls.mouseButtons.LEFT = dragMode === 'pan' ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    state.controls.touches.ONE = dragMode === 'pan' ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
    state.renderer.domElement.style.cursor = dragMode === 'pan' ? 'move' : 'grab';
  }, [dragMode]);

  // Update mesh when STL geometry changes
  useEffect(() => {
    if (!sceneRef.current) return;

    const { scene } = sceneRef.current;

    const hadMesh = !!meshRef.current;
    // Remove old mesh
    if (meshRef.current) {
      scene.remove(meshRef.current);
      meshRef.current.geometry.dispose();
      if (meshRef.current.material instanceof THREE.Material) {
        meshRef.current.material.dispose();
      }
      meshRef.current = null;
    }

    if (stlGeometry) {
      // Create mesh from STL geometry
      const material = new THREE.MeshStandardMaterial({
        color: 0x22d3ee,
        metalness: 0.3,
        roughness: 0.7,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(stlGeometry, material);
      // Rotate to correct orientation (OpenSCAD Z-up to Three.js Y-up)
      mesh.rotation.x = -Math.PI / 2;
      scene.add(mesh);
      meshRef.current = mesh;

      // Fit the first model only. Re-rendering must preserve an edge close-up.
      if (!hadMesh) {
        const { camera, controls } = sceneRef.current;
        stlGeometry.computeBoundingSphere();
        fitViewerCamera(camera, controls.target, stlGeometry.boundingSphere?.radius ?? 250);
        controls.maxDistance = Math.max(5000, camera.position.length() * 4);
        camera.far = controls.maxDistance * 2;
        camera.updateProjectionMatrix();
        controls.update();
      }
    }
  }, [stlGeometry]);

  return (
    <div className="flex-1 relative w-full h-full min-h-0 bg-gray-900">
      <div ref={containerRef} className="absolute inset-0" />

      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center gap-2 pointer-events-none">
        <div role="toolbar" aria-label="3D view controls" className="flex flex-wrap gap-1 bg-gray-900/90 border border-gray-600 rounded-lg p-1 pointer-events-auto text-xs text-white">
          <button aria-pressed={dragMode === 'rotate'} onClick={() => setDragMode('rotate')} title="Drag to rotate; Shift-drag or right-drag to pan"
            className={`px-3 py-2 rounded ${dragMode === 'rotate' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>Rotate</button>
          <button aria-pressed={dragMode === 'pan'} onClick={() => setDragMode('pan')} title="Drag to move the view"
            className={`px-3 py-2 rounded ${dragMode === 'pan' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>Pan</button>
          <span className="border-l border-gray-600 mx-1" />
          {!isMobile && <>
            <button aria-label="Zoom in" title="Zoom in" onClick={() => zoomView(0.8)} className="px-3 py-2 rounded hover:bg-gray-700">+</button>
            <button aria-label="Zoom out" title="Zoom out" onClick={() => zoomView(1.25)} className="px-3 py-2 rounded hover:bg-gray-700">−</button>
          </>}
          <button onClick={fitView} title="Recenter and fit the entire rack" className="px-3 py-2 rounded hover:bg-gray-700">Fit view</button>
        </div>
        <p className="text-xs text-gray-300 bg-gray-900/80 rounded px-2 py-1">{isMobile ? 'One finger to ' + dragMode + ' · Two fingers to pan / pinch to zoom' : (dragMode === 'rotate' ? 'Drag to rotate' : 'Drag to pan') + ' · Shift/right-drag to pan · Scroll to zoom toward cursor'}</p>
      </div>

      {/* Loading overlay */}
      {isRendering && (
        <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <svg
              className="animate-spin w-12 h-12 text-blue-500"
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
            <span className="text-sm text-gray-300">Rendering 3D preview...</span>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && !isRendering && (
        <div className="absolute bottom-4 left-4 right-4 bg-red-900/90 text-red-200 text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Status bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gray-900/80 backdrop-blur px-4 py-2 flex items-center justify-between text-sm">
        <span className="text-gray-400">
          {config.isSplit
            ? `${config.leftDevices.length + config.rightDevices.length} devices`
            : `${config.devices.length} devices`}
          {' | '}
          {config.rackU}U rack
        </span>
        {lastRenderTime && (
          <span className="text-green-500">Rendered in {lastRenderTime}ms</span>
        )}
      </div>
    </div>
  );
}
