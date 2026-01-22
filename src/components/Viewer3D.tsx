import { useState, useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { useRackStore } from '../state/rack-store';
import { generateScadCode } from '../utils/scad-generator';
import { useLiveScadRender } from '../hooks/useLiveScadRender';

export function Viewer3D() {
  const { config } = useRackStore();
  const [showCode, setShowCode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    animationId: number;
    controls: { isDragging: boolean; prevMouse: { x: number; y: number } };
  } | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);

  const { stlData, isRendering, error, lastRenderTime } = useLiveScadRender();

  const scadCode = generateScadCode(config, true);

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
    if (!containerRef.current || showCode) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1f2937);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(300, 200, 400);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
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

    // Mouse controls state
    const controls = {
      isDragging: false,
      prevMouse: { x: 0, y: 0 },
    };

    sceneRef.current = { scene, camera, renderer, animationId: 0, controls };

    // Animation loop
    const animate = () => {
      if (!sceneRef.current) return;
      sceneRef.current.animationId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Mouse controls for rotation
    const onMouseDown = (e: MouseEvent) => {
      controls.isDragging = true;
      controls.prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!controls.isDragging || !meshRef.current) return;
      const deltaX = e.clientX - controls.prevMouse.x;
      const deltaY = e.clientY - controls.prevMouse.y;
      meshRef.current.rotation.y += deltaX * 0.01;
      meshRef.current.rotation.x += deltaY * 0.01;
      controls.prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      controls.isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.multiplyScalar(e.deltaY > 0 ? 1.1 : 0.9);
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mouseleave', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !sceneRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      sceneRef.current.camera.aspect = w / h;
      sceneRef.current.camera.updateProjectionMatrix();
      sceneRef.current.renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('mouseleave', onMouseUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animationId);
        sceneRef.current.renderer.dispose();
        container.removeChild(sceneRef.current.renderer.domElement);
        sceneRef.current = null;
      }
    };
  }, [showCode]);

  // Update mesh when STL geometry changes
  useEffect(() => {
    if (!sceneRef.current || showCode) return;

    const { scene } = sceneRef.current;

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
        color: 0x4b5563,
        metalness: 0.3,
        roughness: 0.7,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(stlGeometry, material);
      // Rotate to correct orientation (OpenSCAD Y-up to Three.js Y-up)
      mesh.rotation.x = -Math.PI / 2;
      scene.add(mesh);
      meshRef.current = mesh;
    }
  }, [stlGeometry, showCode]);

  return (
    <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col flex-1">
      {/* Header */}
      <div className="p-3 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
        <h3 className="text-lg font-semibold text-white">3D Preview</h3>
        <button
          onClick={() => setShowCode(!showCode)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            showCode
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {showCode ? 'Show 3D' : 'Show Code'}
        </button>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-hidden relative">
        {showCode ? (
          // Code view
          <div className="h-full overflow-auto p-3">
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
              {scadCode}
            </pre>
          </div>
        ) : (
          // 3D preview
          <>
            <div ref={containerRef} className="w-full h-full" />
            {/* Loading overlay */}
            {isRendering && (
              <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <svg
                    className="animate-spin w-8 h-8 text-blue-500"
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
                  <span className="text-sm text-gray-300">Rendering...</span>
                </div>
              </div>
            )}
            {/* Error message */}
            {error && !isRendering && (
              <div className="absolute bottom-12 left-2 right-2 bg-red-900/80 text-red-200 text-xs p-2 rounded">
                {error}
              </div>
            )}
          </>
        )}
      </div>

      {/* Status bar */}
      <div className="p-2 border-t border-gray-700 bg-gray-900 flex-shrink-0">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {config.isSplit
              ? `${config.leftDevices.length + config.rightDevices.length} devices`
              : `${config.devices.length} devices`}
          </span>
          <span className="flex items-center gap-2">
            {lastRenderTime && (
              <span className="text-green-500">{lastRenderTime}ms</span>
            )}
            <span>{config.rackU}U rack</span>
          </span>
        </div>
      </div>
    </div>
  );
}
