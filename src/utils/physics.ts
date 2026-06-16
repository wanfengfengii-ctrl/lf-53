import type { GameParams, TrajectoryPoint, ThrowResult, TrainingTarget, TrainingDifficulty } from '../types/game';

const GRAVITY = 9.8;
const TIME_STEP = 0.02;
const MAX_FLIGHT_TIME = 10;

export function calculateTrajectory(params: GameParams): TrajectoryPoint[] {
  const { launchPosition, launchAngle, launchForce, potPosition } = params;

  const angleRad = (launchAngle * Math.PI) / 180;

  const vx = launchForce * Math.cos(angleRad);
  const vy = launchForce * Math.sin(angleRad);

  const directionX = potPosition.x - launchPosition.x;
  const directionZ = potPosition.z - launchPosition.z;
  const length = Math.sqrt(directionX * directionX + directionZ * directionZ);
  const normX = length > 0 ? directionX / length : 1;
  const normZ = length > 0 ? directionZ / length : 0;

  const trajectory: TrajectoryPoint[] = [];

  for (let t = 0; t <= MAX_FLIGHT_TIME; t += TIME_STEP) {
    const x = launchPosition.x + normX * vx * t;
    const y = launchPosition.y + vy * t - 0.5 * GRAVITY * t * t;
    const z = launchPosition.z + normZ * vx * t;

    trajectory.push({ x, y, z, t });

    if (y <= 0 && t > 0.1) {
      break;
    }
  }

  return trajectory;
}

export function calculateLandingPosition(
  trajectory: TrajectoryPoint[]
): { x: number; y: number; z: number } {
  if (trajectory.length < 2) {
    return { x: 0, y: 0, z: 0 };
  }

  const last = trajectory[trajectory.length - 1];
  const prev = trajectory[trajectory.length - 2];

  if (last.y > 0) {
    return { x: last.x, y: last.y, z: last.z };
  }

  const ratio = -prev.y / (last.y - prev.y);
  return {
    x: prev.x + (last.x - prev.x) * ratio,
    y: 0,
    z: prev.z + (last.z - prev.z) * ratio,
  };
}

export function checkHit(
  landingPos: { x: number; y: number; z: number },
  potPosition: { x: number; y: number; z: number },
  potRadius: number
): { hit: boolean; deviationDistance: number } {
  const distance = Math.sqrt(
    Math.pow(landingPos.x - potPosition.x, 2) +
      Math.pow(landingPos.z - potPosition.z, 2)
  );

  return {
    hit: distance <= potRadius,
    deviationDistance: distance,
  };
}

export function calculateMaxHeight(trajectory: TrajectoryPoint[]): number {
  if (trajectory.length === 0) return 0;
  return Math.max(...trajectory.map((p) => p.y));
}

export function calculateFlightTime(trajectory: TrajectoryPoint[]): number {
  if (trajectory.length < 2) return 0;

  const last = trajectory[trajectory.length - 1];
  const prev = trajectory[trajectory.length - 2];

  if (last.y > 0) {
    return last.t;
  }

  const ratio = -prev.y / (last.y - prev.y);
  return prev.t + (last.t - prev.t) * ratio;
}

export function performThrow(
  params: GameParams,
  id: number,
  previousResults: ThrowResult[]
): ThrowResult {
  const trajectory = calculateTrajectory(params);
  const landingPos = calculateLandingPosition(trajectory);
  const { hit, deviationDistance } = checkHit(
    landingPos,
    params.potPosition,
    params.potRadius
  );
  const maxHeight = calculateMaxHeight(trajectory);
  const flightTime = calculateFlightTime(trajectory);

  const allResultsIncludingThis = [...previousResults, {
    id: 0,
    timestamp: 0,
    params: { ...params },
    hit,
    deviationDistance,
    landPosition: landingPos,
    maxHeight,
    flightTime,
    bestAngleRangeAtTime: null,
  }];

  const bestAngleRangeAtTime = findBestAngleRange(allResultsIncludingThis);

  return {
    id,
    timestamp: Date.now(),
    params: { ...params },
    hit,
    deviationDistance,
    landPosition: landingPos,
    maxHeight,
    flightTime,
    bestAngleRangeAtTime,
  };
}

export function findBestAngleRange(
  results: ThrowResult[]
): { min: number; max: number } | null {
  const hitResults = results.filter((r) => r.hit);
  if (hitResults.length === 0) return null;

  const angles = hitResults.map((r) => r.params.launchAngle);
  const min = Math.min(...angles);
  const max = Math.max(...angles);

  return { min, max };
}

export function calculateHitRate(results: ThrowResult[]): number {
  if (results.length === 0) return 0;
  const hits = results.filter((r) => r.hit).length;
  return hits / results.length;
}

export function getDeviationDistribution(
  results: ThrowResult[],
  bins: number = 10
): { range: string; count: number; rangeStart: number; rangeEnd: number }[] {
  if (results.length === 0) return [];

  const maxDeviation = Math.max(...results.map((r) => r.deviationDistance));
  const binSize = maxDeviation / bins || 1;

  const distribution: {
    range: string;
    count: number;
    rangeStart: number;
    rangeEnd: number;
  }[] = [];

  for (let i = 0; i < bins; i++) {
    const start = i * binSize;
    const end = (i + 1) * binSize;
    const count = results.filter(
      (r) => r.deviationDistance >= start && r.deviationDistance < end
    ).length;
    distribution.push({
      range: `${start.toFixed(1)}-${end.toFixed(1)}`,
      count,
      rangeStart: start,
      rangeEnd: end,
    });
  }

  return distribution;
}

export function generateTrainingTarget(difficulty: TrainingDifficulty): TrainingTarget {
  const configs: Record<TrainingDifficulty, {
    distance: number;
    height: number;
    potRadius: number;
    requiredHits: number;
    maxAttempts: number;
    description: string;
  }> = {
    easy: {
      distance: 5,
      height: 1,
      potRadius: 0.5,
      requiredHits: 3,
      maxAttempts: 10,
      description: '近距离 · 大壶口 · 入门练习',
    },
    medium: {
      distance: 8,
      height: 1,
      potRadius: 0.35,
      requiredHits: 3,
      maxAttempts: 8,
      description: '中距离 · 标准壶口 · 技巧提升',
    },
    hard: {
      distance: 12,
      height: 1.2,
      potRadius: 0.2,
      requiredHits: 2,
      maxAttempts: 6,
      description: '远距离 · 小壶口 · 高手挑战',
    },
  };

  return { ...configs[difficulty], difficulty };
}

export function calculateTrainingScore(
  results: ThrowResult[],
  target: TrainingTarget
): number {
  const hits = results.filter((r) => r.hit).length;
  if (hits < target.requiredHits) return 0;

  const baseScore = 60;
  const hitBonus = Math.min(hits, target.maxAttempts) * 5;
  const efficiencyBonus = Math.max(0, Math.round((1 - results.length / target.maxAttempts) * 20));
  const difficultyMultiplier = target.difficulty === 'hard' ? 1.5 : target.difficulty === 'medium' ? 1.2 : 1;

  return Math.round((baseScore + hitBonus + efficiencyBonus) * difficultyMultiplier);
}
