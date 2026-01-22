import { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useRackStore } from '../state/rack-store';
import { generateScadCode, getPlacedDeviceDimensions } from '../utils/scad-generator';
import { RACK_CONSTANTS, getRackHeight } from '../state/types';

export function Viewer3D() {
  const { config } = useRackStore();
  const [showCode, setShowCode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    animationId: number;
  } | null>(null);

  const scadCode = generateScadCode(config, true);

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

    // Grid helper
    const gridHelper = new THREE.GridHelper(500, 50, 0x444444, 0x333333);
    gridHelper.position.y = -getRackHeight(config.rackU) / 2 - 5;
    scene.add(gridHelper);

    sceneRef.current = { scene, camera, renderer, animationId: 0 };

    // Animation loop
    const animate = () => {
      if (!sceneRef.current) return;
      sceneRef.current.animationId = requestAnimationFrame(animate);

      // Slow rotation
      scene.rotation.y += 0.002;

      renderer.render(scene, camera);
    };
    animate();

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
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animationId);
        sceneRef.current.renderer.dispose();
        container.removeChild(sceneRef.current.renderer.domElement);
        sceneRef.current = null;
      }
    };
  }, [showCode]);

  // Update scene when config changes
  useEffect(() => {
    if (!sceneRef.current || showCode) return;

    const { scene } = sceneRef.current;

    // Remove old meshes (keep lights and grid)
    const toRemove: THREE.Object3D[] = [];
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        toRemove.push(obj);
      }
    });
    toRemove.forEach((obj) => scene.remove(obj));

    // Rack dimensions
    const rackWidth = RACK_CONSTANTS.PANEL_WIDTH;
    const rackHeight = getRackHeight(config.rackU);
    const plateThickness = config.plateThickness;

    // Create rack faceplate
    const faceplateGeometry = new THREE.BoxGeometry(rackWidth, rackHeight, plateThickness);
    const faceplateMaterial = new THREE.MeshStandardMaterial({
      color: 0x4b5563,
      metalness: 0.3,
      roughness: 0.7,
    });
    const faceplate = new THREE.Mesh(faceplateGeometry, faceplateMaterial);
    faceplate.position.z = -plateThickness / 2;
    scene.add(faceplate);

    // Get all devices to display
    const allDevices = config.isSplit
      ? [...config.leftDevices, ...config.rightDevices]
      : config.devices;

    // Add split line visualization if in split mode
    if (config.isSplit) {
      const splitX = config.splitPosition || 0;
      const splitLineGeometry = new THREE.BoxGeometry(2, rackHeight, 5);
      const splitLineMaterial = new THREE.MeshBasicMaterial({
        color: 0x8b5cf6,
        transparent: true,
        opacity: 0.5,
      });
      const splitLine = new THREE.Mesh(splitLineGeometry, splitLineMaterial);
      splitLine.position.set(splitX, 0, -plateThickness / 2);
      scene.add(splitLine);
    }

    // Add devices
    allDevices.forEach((device) => {
      const dims = getPlacedDeviceDimensions(device);

      // Device box
      const deviceGeometry = new THREE.BoxGeometry(dims.width, dims.height, dims.depth);
      const deviceMaterial = new THREE.MeshStandardMaterial({
        color: 0x3b82f6,
        metalness: 0.1,
        roughness: 0.8,
      });
      const deviceMesh = new THREE.Mesh(deviceGeometry, deviceMaterial);

      // Position: x offset, y offset, z = behind faceplate
      deviceMesh.position.set(
        device.offsetX,
        device.offsetY,
        -plateThickness - dims.depth / 2
      );

      scene.add(deviceMesh);

      // Add wireframe for cage representation
      const wireframeGeometry = new THREE.BoxGeometry(
        dims.width + 4,
        dims.height + 4,
        dims.depth + 10
      );
      const wireframeMaterial = new THREE.MeshBasicMaterial({
        color: 0x6b7280,
        wireframe: true,
      });
      const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
      wireframe.position.copy(deviceMesh.position);
      wireframe.position.z -= 3;
      scene.add(wireframe);
    });
  }, [config, showCode]);

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
      <div className="flex-1 overflow-hidden">
        {showCode ? (
          // Code view
          <div className="h-full overflow-auto p-3">
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
              {scadCode}
            </pre>
          </div>
        ) : (
          // 3D preview
          <div ref={containerRef} className="w-full h-full" />
        )}
      </div>

      {/* Status bar */}
      <div className="p-2 border-t border-gray-700 bg-gray-900 flex-shrink-0">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{config.devices.length} devices</span>
          <span>{config.rackU}U rack</span>
        </div>
      </div>
    </div>
  );
}
