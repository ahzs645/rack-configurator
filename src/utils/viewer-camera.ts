import { MathUtils, PerspectiveCamera, Vector3 } from 'three';

/** Frame a centered model using the narrower viewport dimension. */
export function fitViewerCamera(camera: PerspectiveCamera, target: Vector3, modelRadius: number): void {
  const halfFov = Math.atan(Math.tan(MathUtils.degToRad(camera.fov / 2)) * Math.min(camera.aspect, 1));
  const distance = Math.max(5, modelRadius / Math.sin(halfFov) * 1.1);
  target.set(0, 0, 0);
  camera.position.set(3, 2, 4).normalize().multiplyScalar(distance);
  camera.far = Math.max(camera.far, distance * 4);
  camera.updateProjectionMatrix();
  camera.lookAt(target);
}

/** Zoom buttons dolly around the current pan target, never the world origin. */
export function zoomViewerCamera(camera: PerspectiveCamera, target: Vector3, factor: number, minDistance: number, maxDistance: number): void {
  const offset = camera.position.clone().sub(target);
  const distance = MathUtils.clamp(offset.length() * factor, minDistance, maxDistance);
  if (offset.lengthSq() === 0) offset.set(0, 0, 1);
  camera.position.copy(target).add(offset.setLength(distance));
  camera.lookAt(target);
}
