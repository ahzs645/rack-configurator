import { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { useRackStore } from '../state/rack-store';
import { useLiveScadRender } from '../hooks/useLiveScadRender';

export function MainViewer3D() {
  const { config } = useRackStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    animationId: number;
    // Orbit controls state
    controls: {
      isDragging: boolean;
      prevMouse: { x: number; y: number };
      spherical: { radius: number; theta: number; phi: number };
      target: THREE.Vector3;
    };
  } | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);

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
    const width = container.clientWidth;
    const height = container.clientHeight;

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

    // Orbit controls state - camera orbits around target
    const target = new THREE.Vector3(0, 0, 0);
    const initialRadius = camera.position.length();
    const controls = {
      isDragging: false,
      prevMouse: { x: 0, y: 0 },
      spherical: {
        radius: initialRadius,
        theta: Math.atan2(camera.position.x, camera.position.z), // horizontal angle
        phi: Math.acos(camera.position.y / initialRadius), // vertical angle
      },
      target,
    };

    // Helper to update camera position from spherical coordinates
    const updateCameraPosition = () => {
      const { radius, theta, phi } = controls.spherical;
      camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = radius * Math.cos(phi);
      camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(controls.target);
    };

    sceneRef.current = { scene, camera, renderer, animationId: 0, controls };

    // Animation loop
    const animate = () => {
      if (!sceneRef.current) return;
      sceneRef.current.animationId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Mouse controls for orbiting camera
    const onMouseDown = (e: MouseEvent) => {
      controls.isDragging = true;
      controls.prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!controls.isDragging) return;
      const deltaX = e.clientX - controls.prevMouse.x;
      const deltaY = e.clientY - controls.prevMouse.y;

      // Update spherical coordinates
      controls.spherical.theta -= deltaX * 0.01;
      controls.spherical.phi += deltaY * 0.01;

      // Clamp phi to avoid flipping (keep between 0.1 and PI - 0.1)
      controls.spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, controls.spherical.phi));

      updateCameraPosition();
      controls.prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      controls.isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Zoom by changing radius
      controls.spherical.radius *= e.deltaY > 0 ? 1.1 : 0.9;
      // Clamp radius
      controls.spherical.radius = Math.max(50, Math.min(2000, controls.spherical.radius));
      updateCameraPosition();
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
  }, []);

  // Update mesh when STL geometry changes
  useEffect(() => {
    if (!sceneRef.current) return;

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
      // Rotate to correct orientation (OpenSCAD Z-up to Three.js Y-up)
      mesh.rotation.x = -Math.PI / 2;
      scene.add(mesh);
      meshRef.current = mesh;

      // Update orbit target to center of mesh
      if (sceneRef.current) {
        sceneRef.current.controls.target.set(0, 0, 0);
      }
    }
  }, [stlGeometry]);

  return (
    <div className="flex-1 relative bg-gray-900">
      <div ref={containerRef} className="w-full h-full" />

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
