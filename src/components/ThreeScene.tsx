import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGame } from '../context/GameContext';
import { calculateTrajectory, calculateLandingPosition } from '../utils/physics';
import type { HeatZoneData, DisturbanceParams, TrajectoryPoint } from '../types/game';

export default function ThreeScene() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const arrowRef = useRef<THREE.Group | null>(null);
  const trajectoryLineRef = useRef<THREE.Line | null>(null);
  const potRef = useRef<THREE.Group | null>(null);
  const potRimHeightRef = useRef<THREE.Mesh | null>(null);
  const launchMarkerRef = useRef<THREE.Group | null>(null);
  const animationRef = useRef<number>(0);
  const throwProgressRef = useRef<number>(0);
  const trajectoryPointsRef = useRef<TrajectoryPoint[]>([]);
  const heatZoneRef = useRef<THREE.Group | null>(null);
  const windIndicatorRef = useRef<THREE.ArrowHelper | null>(null);

  const { state, endThrow } = useGame();
  const { params, isPlaying, currentTrajectory, heatZoneData, disturbanceParams } = state;

  const currentDisturbance = useRef<DisturbanceParams>(disturbanceParams);
  currentDisturbance.current = disturbanceParams;

  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  const paramsRef = useRef(params);
  paramsRef.current = params;

  const endThrowRef = useRef(endThrow);
  endThrowRef.current = endThrow;

  const createHeatZone = (scene: THREE.Scene, data: HeatZoneData) => {
    if (heatZoneRef.current) {
      scene.remove(heatZoneRef.current);
      heatZoneRef.current.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }

    const group = new THREE.Group();

    if (data.points.length > 0) {
      const xs = data.points.map((p) => p.x);
      const zs = data.points.map((p) => p.z);
      const xMin = Math.min(...xs);
      const xMax = Math.max(...xs);
      const zMin = Math.min(...zs);
      const zMax = Math.max(...zs);

      const gridX = Math.round(Math.sqrt(data.points.length)) - 1;
      const gridZ = gridX;

      const geometry = new THREE.PlaneGeometry(
        xMax - xMin,
        zMax - zMin,
        gridX,
        gridZ
      );

      const colors: number[] = [];
      for (const point of data.points) {
        const p = point.probability;
        let r: number, g: number, b: number;
        if (p > 0.75) {
          r = 0.95;
          g = 0.1;
          b = 0.1;
        } else if (p > 0.5) {
          r = 0.95;
          g = 0.65;
          b = 0.1;
        } else if (p > 0.25) {
          r = 0.95;
          g = 0.95;
          b = 0.1;
        } else {
          r = 0.1;
          g = 0.7;
          b = 0.95;
        }
        colors.push(r, g, b);
      }

      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.rotateX(-Math.PI / 2);
      geometry.translate((xMin + xMax) / 2, 0.02, (zMin + zMax) / 2);

      const material = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const mesh = new THREE.Mesh(geometry, material);
      group.add(mesh);

      const ringGeometry = new THREE.RingGeometry(
        data.hitRadius * 0.8,
        data.hitRadius,
        48
      );
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(params.potPosition.x, 0.03, params.potPosition.z);
      group.add(ring);
    }

    scene.add(group);
    heatZoneRef.current = group;
  };

  const updateWindIndicator = (scene: THREE.Scene, disturbance: DisturbanceParams) => {
    if (windIndicatorRef.current) {
      scene.remove(windIndicatorRef.current);
    }

    if (Math.abs(disturbance.windForce) > 0.01) {
      const windRad = (disturbance.windAngle * Math.PI) / 180;
      const dir = new THREE.Vector3(
        Math.cos(windRad),
        0,
        Math.sin(windRad)
      ).normalize();
      const origin = new THREE.Vector3(
        params.launchPosition.x,
        params.launchPosition.y + 1.5,
        params.launchPosition.z
      );
      const length = Math.min(3, Math.max(0.5, disturbance.windForce * 3));
      const hex = disturbance.windForce > 0 ? 0x4dabf7 : 0x82c91e;

      const arrow = new THREE.ArrowHelper(dir, origin, length, hex, 0.3, 0.2);
      scene.add(arrow);
      windIndicatorRef.current = arrow;
    }
  };

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

    const potHeightIndicatorGeometry = new THREE.RingGeometry(0.02, 0.32, 32);
    const potHeightIndicatorMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6b6b,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const potHeightIndicator = new THREE.Mesh(
      potHeightIndicatorGeometry,
      potHeightIndicatorMaterial
    );
    potHeightIndicator.rotation.x = -Math.PI / 2;
    potHeightIndicator.position.y = 0.6;
    potHeightIndicator.visible = false;
    potGroup.add(potHeightIndicator);
    potRimHeightRef.current = potHeightIndicator;

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

      const currentParams = paramsRef.current;
      const centerX = (currentParams.launchPosition.x + currentParams.potPosition.x) / 2;
      const centerZ = (currentParams.launchPosition.z + currentParams.potPosition.z) / 2;

      camera.position.x = centerX + cameraDistance * Math.sin(cameraAngle.theta) * Math.cos(cameraAngle.phi);
      camera.position.y = 3 + cameraDistance * Math.sin(cameraAngle.phi);
      camera.position.z = centerZ + cameraDistance * Math.cos(cameraAngle.theta) * Math.cos(cameraAngle.phi);
      camera.lookAt(centerX, 2, centerZ);

      if (isPlayingRef.current && arrowRef.current && trajectoryPointsRef.current.length > 0) {
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
            endThrowRef.current(result);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!potRef.current) return;
    const disturbance = currentDisturbance.current;
    potRef.current.position.set(
      params.potPosition.x,
      params.potPosition.y + disturbance.potHeightOffset,
      params.potPosition.z + disturbance.lateralOffset
    );
    potRef.current.scale.x = params.potRadius / 0.3;
    potRef.current.scale.z = params.potRadius / 0.3;

    if (potRimHeightRef.current && Math.abs(disturbance.potHeightOffset) > 0.01) {
      potRimHeightRef.current.visible = true;
      potRimHeightRef.current.position.y = 0.6 + disturbance.potHeightOffset;
    } else if (potRimHeightRef.current) {
      potRimHeightRef.current.visible = false;
    }
  }, [params.potPosition, params.potRadius, disturbanceParams]);

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
    if (sceneRef.current && heatZoneData) {
      createHeatZone(sceneRef.current, heatZoneData);
    } else if (sceneRef.current && heatZoneRef.current) {
      sceneRef.current.remove(heatZoneRef.current);
      heatZoneRef.current = null;
    }
  }, [heatZoneData]);

  useEffect(() => {
    if (sceneRef.current) {
      updateWindIndicator(sceneRef.current, disturbanceParams);
    }
  }, [disturbanceParams, params.launchPosition]);

  useEffect(() => {
    if (isPlaying) {
      const trajectory = calculateTrajectory(params, disturbanceParams);
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
  }, [isPlaying, params, disturbanceParams]);

  const calculateThrowResult = () => {
    const trajectory = trajectoryPointsRef.current;
    const disturbance = currentDisturbance.current;
    const currentParams = paramsRef.current;
    if (trajectory.length < 2) return null;

    const adjustedPotY = currentParams.potPosition.y + disturbance.potHeightOffset;
    const landingPos = calculateLandingPosition(trajectory, adjustedPotY);

    const adjustedPotX = currentParams.potPosition.x;
    const adjustedPotZ = currentParams.potPosition.z + disturbance.lateralOffset;
    const dx = landingPos.x - adjustedPotX;
    const dz = landingPos.z - adjustedPotZ;
    const dy = landingPos.y - adjustedPotY;
    const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const isInHeightRange =
      landingPos.y <= adjustedPotY + 0.6 && landingPos.y >= adjustedPotY - 0.2;
    const hit = isInHeightRange && horizontalDistance <= currentParams.potRadius;

    const maxHeight = Math.max(...trajectory.map((p) => p.y));
    const flightTime = trajectory.length * 0.02;

    return {
      id: Date.now(),
      timestamp: Date.now(),
      params: { ...currentParams },
      hit,
      deviationDistance: distance,
      landPosition: landingPos,
      maxHeight,
      flightTime,
      bestAngleRangeAtTime: null,
      disturbanceParams: { ...disturbance },
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
