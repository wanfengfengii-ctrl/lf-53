import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGame } from '../context/GameContext';
import { calculateTrajectory } from '../utils/physics';

export default function ThreeScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const arrowRef = useRef<THREE.Group | null>(null);
  const trajectoryLineRef = useRef<THREE.Line | null>(null);
  const potRef = useRef<THREE.Group | null>(null);
  const launchMarkerRef = useRef<THREE.Group | null>(null);
  const animationRef = useRef<number>(0);
  const throwProgressRef = useRef<number>(0);
  const trajectoryPointsRef = useRef<{ x: number; y: number; z: number }[]>([]);

  const { state, endThrow } = useGame();
  const { params, isPlaying, currentTrajectory } = state;

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 30, 80);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 8, 15);
    camera.lookAt(0, 2, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    scene.add(directionalLight);

    const groundGeometry = new THREE.PlaneGeometry(40, 40);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x7cb342,
      roughness: 0.8,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(40, 40, 0x558b2f, 0x8bc34a);
    scene.add(gridHelper);

    const potGroup = new THREE.Group();
    const potBodyGeometry = new THREE.CylinderGeometry(0.3, 0.25, 0.6, 32);
    const potMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.7,
    });
    const potBody = new THREE.Mesh(potBodyGeometry, potMaterial);
    potBody.position.y = 0.3;
    potBody.castShadow = true;
    potGroup.add(potBody);

    const potRimGeometry = new THREE.TorusGeometry(0.3, 0.05, 16, 32);
    const potRimMaterial = new THREE.MeshStandardMaterial({
      color: 0x654321,
      roughness: 0.6,
    });
    const potRim = new THREE.Mesh(potRimGeometry, potRimMaterial);
    potRim.rotation.x = Math.PI / 2;
    potRim.position.y = 0.6;
    potRim.castShadow = true;
    potGroup.add(potRim);

    potGroup.position.set(params.potPosition.x, params.potPosition.y, params.potPosition.z);
    scene.add(potGroup);
    potRef.current = potGroup;

    const launchGroup = new THREE.Group();
    const launchBaseGeometry = new THREE.CylinderGeometry(0.2, 0.25, 0.3, 16);
    const launchBaseMaterial = new THREE.MeshStandardMaterial({
      color: 0x2196f3,
      roughness: 0.5,
    });
    const launchBase = new THREE.Mesh(launchBaseGeometry, launchBaseMaterial);
    launchBase.position.y = 0.15;
    launchBase.castShadow = true;
    launchGroup.add(launchBase);

    const launchPoleGeometry = new THREE.CylinderGeometry(0.03, 0.03, 1, 8);
    const launchPoleMaterial = new THREE.MeshStandardMaterial({
      color: 0x1976d2,
      roughness: 0.4,
    });
    const launchPole = new THREE.Mesh(launchPoleGeometry, launchPoleMaterial);
    launchPole.position.y = 0.8;
    launchPole.castShadow = true;
    launchGroup.add(launchPole);

    launchGroup.position.set(
      params.launchPosition.x,
      params.launchPosition.y - 1,
      params.launchPosition.z
    );
    scene.add(launchGroup);
    launchMarkerRef.current = launchGroup;

    const arrowGroup = new THREE.Group();
    const arrowShaftGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8);
    const arrowShaftMaterial = new THREE.MeshStandardMaterial({
      color: 0xffeb3b,
      roughness: 0.3,
    });
    const arrowShaft = new THREE.Mesh(arrowShaftGeometry, arrowShaftMaterial);
    arrowShaft.position.y = 0.4;
    arrowShaft.castShadow = true;
    arrowGroup.add(arrowShaft);

    const arrowHeadGeometry = new THREE.ConeGeometry(0.06, 0.15, 8);
    const arrowHeadMaterial = new THREE.MeshStandardMaterial({
      color: 0xf44336,
      roughness: 0.2,
    });
    const arrowHead = new THREE.Mesh(arrowHeadGeometry, arrowHeadMaterial);
    arrowHead.position.y = 0.9;
    arrowHead.castShadow = true;
    arrowGroup.add(arrowHead);

    const arrowFeatherGeometry = new THREE.BoxGeometry(0.15, 0.005, 0.08);
    const arrowFeatherMaterial = new THREE.MeshStandardMaterial({
      color: 0xe91e63,
      roughness: 0.5,
    });
    const arrowFeather1 = new THREE.Mesh(arrowFeatherGeometry, arrowFeatherMaterial);
    arrowFeather1.position.y = 0.05;
    arrowFeather1.rotation.y = Math.PI / 4;
    arrowFeather1.castShadow = true;
    arrowGroup.add(arrowFeather1);

    const arrowFeather2 = new THREE.Mesh(arrowFeatherGeometry, arrowFeatherMaterial);
    arrowFeather2.position.y = 0.05;
    arrowFeather2.rotation.y = -Math.PI / 4;
    arrowFeather2.castShadow = true;
    arrowGroup.add(arrowFeather2);

    arrowGroup.position.set(
      params.launchPosition.x,
      params.launchPosition.y,
      params.launchPosition.z
    );
    arrowGroup.visible = true;
    scene.add(arrowGroup);
    arrowRef.current = arrowGroup;

    const trajectoryGeometry = new THREE.BufferGeometry();
    const trajectoryMaterial = new THREE.LineBasicMaterial({
      color: 0xff5722,
      linewidth: 2,
      opacity: 0.8,
      transparent: true,
    });
    const trajectoryLine = new THREE.Line(trajectoryGeometry, trajectoryMaterial);
    scene.add(trajectoryLine);
    trajectoryLineRef.current = trajectoryLine;

    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let cameraAngle = { theta: 0, phi: Math.PI / 4 };
    let cameraDistance = 18;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;
      cameraAngle.theta -= deltaX * 0.01;
      cameraAngle.phi = Math.max(
        0.1,
        Math.min(Math.PI / 2 - 0.1, cameraAngle.phi - deltaY * 0.01)
      );
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraDistance = Math.max(5, Math.min(40, cameraDistance + e.deltaY * 0.02));
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      const centerX = (params.launchPosition.x + params.potPosition.x) / 2;
      const centerZ = (params.launchPosition.z + params.potPosition.z) / 2;

      camera.position.x = centerX + cameraDistance * Math.sin(cameraAngle.theta) * Math.cos(cameraAngle.phi);
      camera.position.y = 3 + cameraDistance * Math.sin(cameraAngle.phi);
      camera.position.z = centerZ + cameraDistance * Math.cos(cameraAngle.theta) * Math.cos(cameraAngle.phi);
      camera.lookAt(centerX, 2, centerZ);

      if (isPlaying && arrowRef.current && trajectoryPointsRef.current.length > 0) {
        throwProgressRef.current += 0.015;
        const index = Math.floor(throwProgressRef.current * trajectoryPointsRef.current.length);
        const currentIndex = Math.min(index, trajectoryPointsRef.current.length - 1);

        if (currentIndex < trajectoryPointsRef.current.length) {
          const point = trajectoryPointsRef.current[currentIndex];
          arrowRef.current.position.set(point.x, point.y, point.z);

          if (currentIndex > 0) {
            const prevPoint = trajectoryPointsRef.current[currentIndex - 1];
            const dx = point.x - prevPoint.x;
            const dy = point.y - prevPoint.y;
            const dz = point.z - prevPoint.z;
            const angleY = Math.atan2(dx, dz);
            const horizontalDist = Math.sqrt(dx * dx + dz * dz);
            const angleX = Math.atan2(dy, horizontalDist);
            arrowRef.current.rotation.x = -angleX;
            arrowRef.current.rotation.y = angleY;
          }
        }

        if (currentIndex >= trajectoryPointsRef.current.length - 1) {
          const result = calculateThrowResult();
          if (result) {
            endThrow(result);
          }
          throwProgressRef.current = 0;
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (!potRef.current) return;
    potRef.current.position.set(
      params.potPosition.x,
      params.potPosition.y,
      params.potPosition.z
    );
    potRef.current.scale.x = params.potRadius / 0.3;
    potRef.current.scale.z = params.potRadius / 0.3;
  }, [params.potPosition, params.potRadius]);

  useEffect(() => {
    if (!launchMarkerRef.current) return;
    launchMarkerRef.current.position.set(
      params.launchPosition.x,
      params.launchPosition.y - 1,
      params.launchPosition.z
    );
  }, [params.launchPosition]);

  useEffect(() => {
    if (!trajectoryLineRef.current) return;

    const trajectory = currentTrajectory;
    if (trajectory.length === 0) {
      trajectoryLineRef.current.geometry.setFromPoints([]);
      return;
    }

    const points = trajectory.map(
      (p) => new THREE.Vector3(p.x, p.y, p.z)
    );
    trajectoryLineRef.current.geometry.setFromPoints(points);
  }, [currentTrajectory]);

  useEffect(() => {
    if (isPlaying) {
      const trajectory = calculateTrajectory(params);
      trajectoryPointsRef.current = trajectory;
      throwProgressRef.current = 0;

      if (arrowRef.current) {
        arrowRef.current.visible = true;
        arrowRef.current.position.set(
          params.launchPosition.x,
          params.launchPosition.y,
          params.launchPosition.z
        );
      }
    } else {
      if (arrowRef.current) {
        arrowRef.current.visible = true;
        arrowRef.current.position.set(
          params.launchPosition.x,
          params.launchPosition.y,
          params.launchPosition.z
        );
      }
      throwProgressRef.current = 0;
    }
  }, [isPlaying, params]);

  const calculateThrowResult = () => {
    const trajectory = trajectoryPointsRef.current;
    if (trajectory.length < 2) return null;

    const last = trajectory[trajectory.length - 1];
    const prev = trajectory[trajectory.length - 2];

    let landingPos = { x: last.x, y: last.y, z: last.z };
    if (last.y <= 0) {
      const ratio = -prev.y / (last.y - prev.y);
      landingPos = {
        x: prev.x + (last.x - prev.x) * ratio,
        y: 0,
        z: prev.z + (last.z - prev.z) * ratio,
      };
    }

    const distance = Math.sqrt(
      Math.pow(landingPos.x - params.potPosition.x, 2) +
        Math.pow(landingPos.z - params.potPosition.z, 2)
    );

    const hit = distance <= params.potRadius;
    const maxHeight = Math.max(...trajectory.map((p) => p.y));
    const flightTime = trajectory.length * 0.02;

    return {
      id: Date.now(),
      timestamp: Date.now(),
      params: { ...params },
      hit,
      deviationDistance: distance,
      landPosition: landingPos,
      maxHeight,
      flightTime,
      bestAngleRangeAtTime: null,
    };
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '8px',
        overflow: 'hidden',
        cursor: 'grab',
      }}
    />
  );
}
