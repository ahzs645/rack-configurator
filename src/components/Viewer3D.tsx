import { useState, useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { useRackStore } from '../state/rack-store';
import { generateScadCode } from '../utils/scad-generator';
import { useLiveScadRender } from '../hooks/useLiveScadRender';

type ViewMode = '2d' | '3d' | 'code';

export function Viewer3D() {
  const { config } = useRackStore();
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
    renderer: THREE.WebGLRenderer;
    animationId: number;
    controls: { isDragging: boolean; prevMouse: { x: number; y: number } };
    is2D: boolean;
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
    if (!containerRef.current || viewMode === 'code') return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const is2D = viewMode === '2d';

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1f2937);

    // Camera - orthographic for 2D, perspective for 3D
    let camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
    if (is2D) {
      const frustumSize = 300;
      const aspect = width / height;
      camera = new THREE.OrthographicCamera(
        -frustumSize * aspect / 2,
        frustumSize * aspect / 2,
        frustumSize / 2,
        -frustumSize / 2,
        0.1,
        2000
      );
      // Position camera to look at front (Z axis pointing at viewer)
      camera.position.set(0, 0, 500);
      camera.lookAt(0, 0, 0);
    } else {
      camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
      camera.position.set(300, 200, 400);
      camera.lookAt(0, 0, 0);
    }

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

    // Grid helper - only for 3D view
    if (!is2D) {
      const gridHelper = new THREE.GridHelper(500, 50, 0x444444, 0x333333);
      gridHelper.position.y = -100;
      scene.add(gridHelper);
    }

    // Mouse controls state
    const controls = {
      isDragging: false,
      prevMouse: { x: 0, y: 0 },
    };

    sceneRef.current = { scene, camera, renderer, animationId: 0, controls, is2D };

    // Animation loop
    const animate = () => {
      if (!sceneRef.current) return;
      sceneRef.current.animationId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Mouse controls - rotation for 3D, pan for 2D
    const onMouseDown = (e: MouseEvent) => {
      controls.isDragging = true;
      controls.prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!controls.isDragging) return;
      const deltaX = e.clientX - controls.prevMouse.x;
      const deltaY = e.clientY - controls.prevMouse.y;

      if (is2D) {
        // Pan in 2D mode
        if (camera instanceof THREE.OrthographicCamera) {
          const scale = (camera.right - camera.left) / width;
          camera.position.x -= deltaX * scale;
          camera.position.y += deltaY * scale;
        }
      } else if (meshRef.current) {
        // Rotate in 3D mode
        meshRef.current.rotation.y += deltaX * 0.01;
        meshRef.current.rotation.x += deltaY * 0.01;
      }
      controls.prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      controls.isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (is2D && camera instanceof THREE.OrthographicCamera) {
        // Zoom orthographic camera
        const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
        camera.left *= zoomFactor;
        camera.right *= zoomFactor;
        camera.top *= zoomFactor;
        camera.bottom *= zoomFactor;
        camera.updateProjectionMatrix();
      } else {
        camera.position.multiplyScalar(e.deltaY > 0 ? 1.1 : 0.9);
      }
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
      const cam = sceneRef.current.camera;
      if (cam instanceof THREE.PerspectiveCamera) {
        cam.aspect = w / h;
      } else if (cam instanceof THREE.OrthographicCamera) {
        const frustumSize = 300;
        const aspect = w / h;
        cam.left = -frustumSize * aspect / 2;
        cam.right = frustumSize * aspect / 2;
        cam.top = frustumSize / 2;
        cam.bottom = -frustumSize / 2;
      }
      cam.updateProjectionMatrix();
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
  }, [viewMode]);

  // Update mesh when STL geometry changes
  useEffect(() => {
    if (!sceneRef.current || viewMode === 'code') return;

    const { scene, is2D } = sceneRef.current;

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
      // For 2D view, also rotate to show front face
      if (is2D) {
        mesh.rotation.y = 0;
        mesh.rotation.z = 0;
      }
      scene.add(mesh);
      meshRef.current = mesh;
    }
  }, [stlGeometry, viewMode]);

  return (
    <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col flex-1">
      {/* Header with tabs */}
      <div className="p-3 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-1 bg-gray-900 rounded-lg p-1">
          <button
            onClick={() => setViewMode('2d')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === '2d'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
            }`}
          >
            2D Front
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === '3d'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
            }`}
          >
            3D View
          </button>
          <button
            onClick={() => setViewMode('code')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'code'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
            }`}
          >
            Code
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-hidden relative">
        {viewMode === 'code' ? (
          // Code view
          <div className="h-full overflow-auto p-3">
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
              {scadCode}
            </pre>
          </div>
        ) : (
          // 2D/3D preview
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
