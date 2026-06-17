import type {
  GameParams,
  TrajectoryPoint,
  ThrowResult,
  TrainingTarget,
  TrainingDifficulty,
  DisturbanceParams,
  HeatZoneData,
  HeatZonePoint,
  SmartTrainingLevel,
  SmartTrainingSession,
  TrainingAnalysisData,
  BattleConfig,
  BattleSession,
  BattlePlayerRound,
  BattleAnalysisData,
  BattleHistoryEntry,
  BattleLeaderboardEntry,
  ReplaySession,
  ReplayRound,
  ReplayAnalysisData,
  TurningPoint,
  ReplaySummary,
  ReplayFilter,
} from '../types/game';

const GRAVITY = 9.8;
const TIME_STEP = 0.02;
const MAX_FLIGHT_TIME = 10;

const DEFAULT_DISTURBANCE: DisturbanceParams = {
  windForce: 0,
  windAngle: 0,
  lateralOffset: 0,
  potHeightOffset: 0,
};

export function getDefaultDisturbance(): DisturbanceParams {
  return { ...DEFAULT_DISTURBANCE };
}

export function calculateTrajectory(
  params: GameParams,
  disturbance: DisturbanceParams = DEFAULT_DISTURBANCE
): TrajectoryPoint[] {
  const { launchPosition, launchAngle, launchForce, potPosition } = params;
  const { windForce, windAngle, lateralOffset, potHeightOffset } = disturbance;

  const angleRad = (launchAngle * Math.PI) / 180;

  const vx = launchForce * Math.cos(angleRad);
  const vy = launchForce * Math.sin(angleRad);

  const directionX = potPosition.x - launchPosition.x;
  const directionZ = potPosition.z - launchPosition.z;
  const length = Math.sqrt(directionX * directionX + directionZ * directionZ);
  const normX = length > 0 ? directionX / length : 1;
  const normZ = length > 0 ? directionZ / length : 0;

  const perpX = -normZ;
  const perpZ = normX;

  const windRad = (windAngle * Math.PI) / 180;
  const windX = windForce * Math.cos(windRad);
  const windZ = windForce * Math.sin(windRad);

  const trajectory: TrajectoryPoint[] = [];
  const adjustedPotY = potPosition.y + potHeightOffset;

  for (let t = 0; t <= MAX_FLIGHT_TIME; t += TIME_STEP) {
    const baseX = launchPosition.x + normX * vx * t + lateralOffset * perpX * (t / Math.max(t, 0.1));
    const baseZ = launchPosition.z + normZ * vx * t + lateralOffset * perpZ * (t / Math.max(t, 0.1));

    const x = baseX + 0.5 * windX * t * t;
    const y = launchPosition.y + vy * t - 0.5 * GRAVITY * t * t;
    const z = baseZ + 0.5 * windZ * t * t;

    trajectory.push({ x, y, z, t });

    if (y <= adjustedPotY - 1 && t > 0.1) {
      break;
    }
  }

  return trajectory;
}

export function calculateLandingPosition(
  trajectory: TrajectoryPoint[],
  potY: number = 0
): { x: number; y: number; z: number } {
  if (trajectory.length < 2) {
    return { x: 0, y: 0, z: 0 };
  }

  const last = trajectory[trajectory.length - 1];
  const prev = trajectory[trajectory.length - 2];
  const groundY = potY - 1;

  if (last.y > groundY) {
    return { x: last.x, y: last.y, z: last.z };
  }

  const ratio = (groundY - prev.y) / (last.y - prev.y);
  return {
    x: prev.x + (last.x - prev.x) * ratio,
    y: groundY,
    z: prev.z + (last.z - prev.z) * ratio,
  };
}

export function checkHit(
  landingPos: { x: number; y: number; z: number },
  potPosition: { x: number; y: number; z: number },
  potRadius: number,
  potHeightOffset: number = 0
): { hit: boolean; deviationDistance: number } {
  const adjustedPotY = potPosition.y + potHeightOffset;
  const dx = landingPos.x - potPosition.x;
  const dz = landingPos.z - potPosition.z;
  const dy = landingPos.y - adjustedPotY;
  const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

  const isInHeightRange = landingPos.y <= adjustedPotY + 0.6 && landingPos.y >= adjustedPotY - 0.2;
  const isWithinRadius = horizontalDistance <= potRadius;

  return {
    hit: isInHeightRange && isWithinRadius,
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

  if (last.y > -1) {
    return last.t;
  }

  const ratio = (-1 - prev.y) / (last.y - prev.y);
  return prev.t + (last.t - prev.t) * ratio;
}

export function performThrow(
  params: GameParams,
  id: number,
  previousResults: ThrowResult[],
  disturbance: DisturbanceParams = DEFAULT_DISTURBANCE
): ThrowResult {
  const trajectory = calculateTrajectory(params, disturbance);
  const adjustedPotY = params.potPosition.y + disturbance.potHeightOffset;
  const landingPos = calculateLandingPosition(trajectory, adjustedPotY);
  const { hit, deviationDistance } = checkHit(
    landingPos,
    params.potPosition,
    params.potRadius,
    disturbance.potHeightOffset
  );
  const maxHeight = calculateMaxHeight(trajectory);
  const flightTime = calculateFlightTime(trajectory);

  const tempResult: ThrowResult = {
    id: 0,
    timestamp: 0,
    params: { ...params },
    hit,
    deviationDistance,
    landPosition: landingPos,
    maxHeight,
    flightTime,
    bestAngleRangeAtTime: null,
    disturbanceParams: { ...disturbance },
  };

  const allResultsIncludingThis = [...previousResults, tempResult];
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
    disturbanceParams: { ...disturbance },
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

export function calculateHeatZone(
  params: GameParams,
  disturbance: DisturbanceParams = DEFAULT_DISTURBANCE,
  angleRange: { min: number; max: number } = { min: 20, max: 70 },
  forceRange: { min: number; max: number } = { min: 5, max: 25 },
  resolution: number = 15
): HeatZoneData {
  const angleStep = (angleRange.max - angleRange.min) / resolution;
  const forceStep = (forceRange.max - forceRange.min) / resolution;

  const heatPoints: { landing: { x: number; z: number }; hit: boolean; angle: number; force: number; deviation: number }[] = [];
  let bestAngle = 45;
  let bestForce = 10;
  let minDeviation = Infinity;
  let hitCenter = { x: params.potPosition.x, z: params.potPosition.z };
  const hitLandings: { x: number; z: number }[] = [];

  for (let ai = 0; ai <= resolution; ai++) {
    for (let fi = 0; fi <= resolution; fi++) {
      const angle = angleRange.min + ai * angleStep;
      const force = forceRange.min + fi * forceStep;

      const testParams: GameParams = {
        ...params,
        launchAngle: angle,
        launchForce: force,
      };

      const trajectory = calculateTrajectory(testParams, disturbance);
      const adjustedPotY = params.potPosition.y + disturbance.potHeightOffset;
      const landing = calculateLandingPosition(trajectory, adjustedPotY);
      const { hit, deviationDistance } = checkHit(
        landing,
        params.potPosition,
        params.potRadius,
        disturbance.potHeightOffset
      );

      if (hit) {
        hitLandings.push({ x: landing.x, z: landing.z });
      }

      if (deviationDistance < minDeviation) {
        minDeviation = deviationDistance;
        bestAngle = angle;
        bestForce = force;
      }

      heatPoints.push({
        landing: { x: landing.x, z: landing.z },
        hit,
        angle,
        force,
        deviation: deviationDistance,
      });
    }
  }

  if (hitLandings.length > 0) {
    hitCenter = {
      x: hitLandings.reduce((s, p) => s + p.x, 0) / hitLandings.length,
      z: hitLandings.reduce((s, p) => s + p.z, 0) / hitLandings.length,
    };
  }

  const maxDeviation = Math.max(...heatPoints.map((p) => p.deviation), 1);

  const gridSize = 20;
  const xMin = params.potPosition.x - params.potRadius * 8;
  const xMax = params.potPosition.x + params.potRadius * 8;
  const zMin = params.potPosition.z - params.potRadius * 8;
  const zMax = params.potPosition.z + params.potRadius * 8;
  const xStep = (xMax - xMin) / gridSize;
  const zStep = (zMax - zMin) / gridSize;

  const points: HeatZonePoint[] = [];

  for (let xi = 0; xi <= gridSize; xi++) {
    for (let zi = 0; zi <= gridSize; zi++) {
      const gx = xMin + xi * xStep;
      const gz = zMin + zi * zStep;

      let nearestDeviation = Infinity;
      for (const hp of heatPoints) {
        const d = Math.sqrt((gx - hp.landing.x) ** 2 + (gz - hp.landing.z) ** 2);
        if (d < nearestDeviation) {
          nearestDeviation = d + hp.deviation * 0.5;
        }
      }

      const distFromPot = Math.sqrt(
        (gx - params.potPosition.x) ** 2 + (gz - params.potPosition.z) ** 2
      );
      const probability = Math.max(
        0,
        1 - (nearestDeviation / (maxDeviation + 0.5)) - distFromPot * 0.15
      );

      points.push({
        x: gx,
        z: gz,
        probability: Math.min(1, Math.max(0, probability)),
      });
    }
  }

  return {
    points,
    center: hitCenter,
    optimalAngle: bestAngle,
    optimalForce: bestForce,
    hitRadius: params.potRadius,
  };
}

export function analyzeRecentPerformance(
  results: ThrowResult[],
  recentCount: number = 10
): {
  hitRate: number;
  avgDeviation: number;
  avgForce: number;
  forceStd: number;
  avgAngle: number;
  angleStd: number;
  bestAngle: number | null;
} {
  const recent = results.slice(-recentCount);
  if (recent.length === 0) {
    return {
      hitRate: 0,
      avgDeviation: 0,
      avgForce: 10,
      forceStd: 0,
      avgAngle: 45,
      angleStd: 0,
      bestAngle: null,
    };
  }

  const hitRate = calculateHitRate(recent);
  const avgDeviation = recent.reduce((s, r) => s + r.deviationDistance, 0) / recent.length;
  const forces = recent.map((r) => r.params.launchForce);
  const avgForce = forces.reduce((s, f) => s + f, 0) / forces.length;
  const forceStd = Math.sqrt(
    forces.reduce((s, f) => s + (f - avgForce) ** 2, 0) / forces.length
  );
  const angles = recent.map((r) => r.params.launchAngle);
  const avgAngle = angles.reduce((s, a) => s + a, 0) / angles.length;
  const angleStd = Math.sqrt(
    angles.reduce((s, a) => s + (a - avgAngle) ** 2, 0) / angles.length
  );

  const hitResults = recent.filter((r) => r.hit);
  const bestAngle =
    hitResults.length > 0
      ? hitResults.reduce((s, r) => s + r.params.launchAngle, 0) / hitResults.length
      : null;

  return { hitRate, avgDeviation, avgForce, forceStd, avgAngle, angleStd, bestAngle };
}

export function createBattleSession(config: BattleConfig): BattleSession {
  return {
    id: Date.now(),
    config,
    currentRound: 1,
    currentPlayer: 1,
    rounds: [],
    player1Score: 0,
    player2Score: 0,
    player1Streak: 0,
    player2Streak: 0,
    player1Hits: 0,
    player2Hits: 0,
    completed: false,
    startTime: Date.now(),
    timedOut: false,
  };
}

export function processBattleRound(
  session: BattleSession,
  params: GameParams
): { updatedSession: BattleSession; roundResult: BattlePlayerRound } {
  const { config } = session;
  const trajectory = calculateTrajectory(params, config.disturbance);
  const adjustedPotY = params.potPosition.y + config.disturbance.potHeightOffset;
  const landingPos = calculateLandingPosition(trajectory, adjustedPotY);
  const { hit, deviationDistance } = checkHit(
    landingPos,
    params.potPosition,
    params.potRadius,
    config.disturbance.potHeightOffset
  );
  const maxHeight = calculateMaxHeight(trajectory);
  const flightTime = calculateFlightTime(trajectory);

  const player = session.currentPlayer;
  let streak = player === 1 ? session.player1Streak : session.player2Streak;
  if (hit) {
    streak += 1;
  } else {
    streak = 0;
  }

  const baseScore = hit ? 10 : 0;
  const streakBonus =
    streak >= config.streakBonusThreshold
      ? config.streakBonusPoints * Math.floor(streak / config.streakBonusThreshold)
      : 0;
  const roundScore = baseScore + streakBonus;

  const roundResult: BattlePlayerRound = {
    round: session.currentRound,
    player,
    params: { ...params },
    hit,
    deviationDistance,
    landPosition: landingPos,
    maxHeight,
    flightTime,
    streakCount: streak,
    roundScore,
    timestamp: Date.now(),
  };

  const newRounds = [...session.rounds, roundResult];
  let p1Score = session.player1Score;
  let p2Score = session.player2Score;
  let p1Streak = session.player1Streak;
  let p2Streak = session.player2Streak;
  let p1Hits = session.player1Hits;
  let p2Hits = session.player2Hits;

  if (player === 1) {
    p1Score += roundScore;
    p1Streak = streak;
    if (hit) p1Hits += 1;
  } else {
    p2Score += roundScore;
    p2Streak = streak;
    if (hit) p2Hits += 1;
  }

  const player2Done =
    newRounds.filter((r) => r.player === 2 && r.round === session.currentRound).length > 0;
  const roundComplete = player === 1 ? false : player2Done;

  const nextRound = roundComplete ? session.currentRound + 1 : session.currentRound;
  const nextPlayer: 1 | 2 = player === 1 ? 2 : 1;
  const isRoundsMode = config.mode === 'rounds';
  const maxRounds = config.rounds;
  const completed = isRoundsMode && nextRound > maxRounds;

  const updatedSession: BattleSession = {
    ...session,
    currentRound: nextRound,
    currentPlayer: completed ? session.currentPlayer : nextPlayer,
    rounds: newRounds,
    player1Score: p1Score,
    player2Score: p2Score,
    player1Streak: p1Streak,
    player2Streak: p2Streak,
    player1Hits: p1Hits,
    player2Hits: p2Hits,
    completed,
    endTime: completed ? Date.now() : undefined,
  };

  return { updatedSession, roundResult };
}

export function analyzeBattleSession(session: BattleSession): BattleAnalysisData {
  const p1Rounds = session.rounds.filter((r) => r.player === 1);
  const p2Rounds = session.rounds.filter((r) => r.player === 2);
  const isTimedMode = session.config.mode === 'timed';

  let totalRounds: number;
  if (isTimedMode) {
    const maxRoundP1 = p1Rounds.length > 0 ? Math.max(...p1Rounds.map(r => r.round)) : 0;
    const maxRoundP2 = p2Rounds.length > 0 ? Math.max(...p2Rounds.map(r => r.round)) : 0;
    totalRounds = Math.max(maxRoundP1, maxRoundP2);
  } else {
    totalRounds = session.config.rounds;
  }
  totalRounds = Math.max(totalRounds, 1);

  const hitRateComparison: BattleAnalysisData['hitRateComparison'] = [];
  for (let i = 1; i <= totalRounds; i++) {
    const p1UpTo = p1Rounds.filter((r) => r.round <= i);
    const p2UpTo = p2Rounds.filter((r) => r.round <= i);
    const p1Rate = p1UpTo.length > 0 ? (p1UpTo.filter((r) => r.hit).length / p1UpTo.length) * 100 : 0;
    const p2Rate = p2UpTo.length > 0 ? (p2UpTo.filter((r) => r.hit).length / p2UpTo.length) * 100 : 0;
    hitRateComparison.push({
      round: `第${i}轮`,
      player1: Number(p1Rate.toFixed(1)),
      player2: Number(p2Rate.toFixed(1)),
    });
  }

  const p1Devs = p1Rounds.map((r) => r.deviationDistance);
  const p2Devs = p2Rounds.map((r) => r.deviationDistance);
  const p1DevMA = movingAverage(p1Devs, 3);
  const p2DevMA = movingAverage(p2Devs, 3);

  const deviationComparison: BattleAnalysisData['deviationComparison'] = [];
  for (let i = 0; i < totalRounds; i++) {
    deviationComparison.push({
      round: `第${i + 1}轮`,
      player1: i < p1Devs.length ? Number(p1Devs[i].toFixed(2)) : 0,
      player2: i < p2Devs.length ? Number(p2Devs[i].toFixed(2)) : 0,
      player1Avg: i < p1DevMA.length ? Number(p1DevMA[i].toFixed(2)) : 0,
      player2Avg: i < p2DevMA.length ? Number(p2DevMA[i].toFixed(2)) : 0,
    });
  }

  const p1Forces = p1Rounds.map((r) => r.params.launchForce);
  const p2Forces = p2Rounds.map((r) => r.params.launchForce);
  const p1ForceMA = movingAverage(p1Forces, 3);
  const p2ForceMA = movingAverage(p2Forces, 3);

  const forceStability: BattleAnalysisData['forceStability'] = [];
  for (let i = 0; i < totalRounds; i++) {
    forceStability.push({
      round: `第${i + 1}轮`,
      player1Force: i < p1Forces.length ? Number(p1Forces[i].toFixed(1)) : 0,
      player2Force: i < p2Forces.length ? Number(p2Forces[i].toFixed(1)) : 0,
      player1Avg: i < p1ForceMA.length ? Number(p1ForceMA[i].toFixed(1)) : 0,
      player2Avg: i < p2ForceMA.length ? Number(p2ForceMA[i].toFixed(1)) : 0,
      player1Hit: i < p1Rounds.length && p1Rounds[i].hit ? 1 : 0,
      player2Hit: i < p2Rounds.length && p2Rounds[i].hit ? 1 : 0,
    });
  }

  const keyRounds: BattleAnalysisData['keyRounds'] = [];
  for (let i = 1; i <= totalRounds; i++) {
    const p1r = p1Rounds.find((r) => r.round === i);
    const p2r = p2Rounds.find((r) => r.round === i);
    if (p1r && p2r) {
      const swing = (p1r.roundScore - p2r.roundScore);
      keyRounds.push({
        round: i,
        player1Score: p1r.roundScore,
        player2Score: p2r.roundScore,
        player1Hit: p1r.hit,
        player2Hit: p2r.hit,
        swing,
      });
    }
  }

  const p1HitRate = p1Rounds.length > 0 ? (p1Rounds.filter((r) => r.hit).length / p1Rounds.length) * 100 : 0;
  const p2HitRate = p2Rounds.length > 0 ? (p2Rounds.filter((r) => r.hit).length / p2Rounds.length) * 100 : 0;
  const p1AvgDev = p1Rounds.length > 0 ? p1Rounds.reduce((s, r) => s + r.deviationDistance, 0) / p1Rounds.length : 0;
  const p2AvgDev = p2Rounds.length > 0 ? p2Rounds.reduce((s, r) => s + r.deviationDistance, 0) / p2Rounds.length : 0;
  const p1ForceStd = calculateStdDev(p1Forces);
  const p2ForceStd = calculateStdDev(p2Forces);

  let p1MaxStreak = 0;
  let p2MaxStreak = 0;
  let cur1 = 0;
  let cur2 = 0;
  for (const r of p1Rounds) {
    cur1 = r.hit ? cur1 + 1 : 0;
    p1MaxStreak = Math.max(p1MaxStreak, cur1);
  }
  for (const r of p2Rounds) {
    cur2 = r.hit ? cur2 + 1 : 0;
    p2MaxStreak = Math.max(p2MaxStreak, cur2);
  }

  const winner: 1 | 2 | 0 =
    session.player1Score > session.player2Score ? 1
    : session.player2Score > session.player1Score ? 2
    : 0;

  return {
    hitRateComparison,
    deviationComparison,
    forceStability,
    keyRounds,
    summary: {
      player1Name: session.config.player1Name,
      player2Name: session.config.player2Name,
      player1TotalScore: session.player1Score,
      player2TotalScore: session.player2Score,
      player1HitRate: Number(p1HitRate.toFixed(1)),
      player2HitRate: Number(p2HitRate.toFixed(1)),
      player1AvgDeviation: Number(p1AvgDev.toFixed(3)),
      player2AvgDeviation: Number(p2AvgDev.toFixed(3)),
      player1ForceStd: Number(p1ForceStd.toFixed(2)),
      player2ForceStd: Number(p2ForceStd.toFixed(2)),
      player1MaxStreak: p1MaxStreak,
      player2MaxStreak: p2MaxStreak,
      winner,
      totalRounds,
      duration: Math.round(((session.endTime || Date.now()) - session.startTime) / 1000),
    },
  };
}

const BATTLE_HISTORY_KEY = 'battle_history';
const BATTLE_LEADERBOARD_KEY = 'battle_leaderboard';

export function getBattleHistory(): BattleHistoryEntry[] {
  try {
    const raw = localStorage.getItem(BATTLE_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveBattleHistory(entry: BattleHistoryEntry): void {
  const history = getBattleHistory();
  history.unshift(entry);
  if (history.length > 50) history.length = 50;
  localStorage.setItem(BATTLE_HISTORY_KEY, JSON.stringify(history));
}

export function getBattleLeaderboard(): BattleLeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(BATTLE_LEADERBOARD_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function updateBattleLeaderboard(session: BattleSession): void {
  const lb = getBattleLeaderboard();
  const updateEntry = (name: string, won: boolean, score: number, hitRate: number, maxStreak: number) => {
    const existing = lb.find((e) => e.playerName === name);
    if (existing) {
      if (won) existing.wins += 1;
      else existing.losses += 1;
      existing.totalScore += score;
      existing.avgHitRate = Number(((existing.avgHitRate * (existing.wins + existing.losses - 1) + hitRate) / (existing.wins + existing.losses)).toFixed(1));
      existing.maxStreak = Math.max(existing.maxStreak, maxStreak);
    } else {
      lb.push({
        playerName: name,
        wins: won ? 1 : 0,
        losses: won ? 0 : 1,
        totalScore: score,
        avgHitRate: Number(hitRate.toFixed(1)),
        maxStreak,
      });
    }
  };

  const analysis = analyzeBattleSession(session);
  const { winner } = analysis.summary;
  updateEntry(session.config.player1Name, winner === 1, session.player1Score, analysis.summary.player1HitRate, analysis.summary.player1MaxStreak);
  updateEntry(session.config.player2Name, winner === 2, session.player2Score, analysis.summary.player2HitRate, analysis.summary.player2MaxStreak);
  if (winner === 0) {
    const p1 = lb.find((e) => e.playerName === session.config.player1Name);
    const p2 = lb.find((e) => e.playerName === session.config.player2Name);
    if (p1) { p1.wins += 0; p1.losses += 0; }
    if (p2) { p2.wins += 0; p2.losses += 0; }
  }

  lb.sort((a, b) => b.wins - a.wins || b.totalScore - a.totalScore);
  localStorage.setItem(BATTLE_LEADERBOARD_KEY, JSON.stringify(lb));
}

export function generateSmartTrainingLevels(
  recentResults: ThrowResult[]
): SmartTrainingLevel[] {
  const perf = analyzeRecentPerformance(recentResults, 10);
  const levels: SmartTrainingLevel[] = [];

  const baseDistance = perf.avgDeviation < 0.5
    ? 12
    : perf.avgDeviation < 1.5
    ? 9
    : perf.hitRate > 0.3
    ? 7
    : 5;

  const basePotRadius = perf.hitRate > 0.6
    ? 0.2
    : perf.hitRate > 0.3
    ? 0.3
    : 0.45;

  const difficultyFromPerf = (): TrainingDifficulty => {
    if (perf.hitRate > 0.6 && perf.avgDeviation < 0.8) return 'hard';
    if (perf.hitRate > 0.3 || perf.avgDeviation < 1.5) return 'medium';
    return 'easy';
  };

  const getDisturbance = (intensity: number): DisturbanceParams => ({
    windForce: intensity * (0.2 + Math.random() * 0.5),
    windAngle: (Math.random() - 0.5) * 180,
    lateralOffset: intensity * (Math.random() - 0.5) * 0.6,
    potHeightOffset: intensity * (Math.random() - 0.5) * 0.4,
  });

  const level1Diff = perf.hitRate < 0.2 ? 'easy' : 'easy';
  levels.push({
    id: 1,
    levelNumber: 1,
    name: '热身关卡',
    description: '适应环境，建立手感',
    difficulty: level1Diff,
    targetHitRate: 0.3,
    requiredHits: 2,
    maxAttempts: 8,
    distance: Math.max(4, baseDistance - 2),
    potRadius: basePotRadius + 0.1,
    disturbance: getDisturbance(0.3),
    hideBestAngle: true,
  });

  const level2Diff = difficultyFromPerf() === 'hard' ? 'medium' : difficultyFromPerf();
  levels.push({
    id: 2,
    levelNumber: 2,
    name: '基础训练',
    description: '标准难度，强化记忆',
    difficulty: level2Diff,
    targetHitRate: 0.4,
    requiredHits: 3,
    maxAttempts: 8,
    distance: baseDistance,
    potRadius: basePotRadius,
    disturbance: getDisturbance(0.6),
    hideBestAngle: true,
  });

  const level3Diff = difficultyFromPerf();
  levels.push({
    id: 3,
    levelNumber: 3,
    name: '进阶挑战',
    description: '精准控制，突破瓶颈',
    difficulty: level3Diff,
    targetHitRate: 0.5,
    requiredHits: 3,
    maxAttempts: 7,
    distance: baseDistance + 1,
    potRadius: Math.max(0.15, basePotRadius - 0.05),
    disturbance: getDisturbance(1),
    hideBestAngle: true,
  });

  if (perf.hitRate > 0.4) {
    levels.push({
      id: 4,
      levelNumber: 4,
      name: '极限挑战',
      description: '高压环境，超越自我',
      difficulty: 'hard',
      targetHitRate: 0.5,
      requiredHits: 2,
      maxAttempts: 6,
      distance: baseDistance + 3,
      potRadius: Math.max(0.15, basePotRadius - 0.1),
      disturbance: getDisturbance(1.3),
      hideBestAngle: true,
    });
  }

  return levels;
}

export function createSmartTrainingSession(
  recentResults: ThrowResult[]
): SmartTrainingSession {
  const levels = generateSmartTrainingLevels(recentResults);
  return {
    id: Date.now(),
    startTime: Date.now(),
    levels,
    currentLevelIndex: 0,
    preTrainingResults: [...recentResults].slice(-10),
    inTrainingResults: [],
    completed: false,
    passed: false,
  };
}

export function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function movingAverage(values: number[], window: number = 3): number[] {
  return values.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    return slice.reduce((s, v) => s + v, 0) / slice.length;
  });
}

export function analyzeTrainingSession(
  session: SmartTrainingSession
): TrainingAnalysisData {
  const preResults = session.preTrainingResults;
  const inResults = session.inTrainingResults;

  const preHitRate = calculateHitRate(preResults);
  const inHitRate = calculateHitRate(inResults);

  const hitRateTrend: TrainingAnalysisData['hitRateTrend'] = [];
  const window = Math.max(2, Math.ceil(Math.min(preResults.length, inResults.length) / 3));

  const preWindows = Math.max(1, Math.floor(preResults.length / window));
  for (let i = 0; i < preWindows; i++) {
    const slice = preResults.slice(i * window, (i + 1) * window);
    hitRateTrend.push({
      name: `前${i + 1}`,
      训练前: Number((calculateHitRate(slice) * 100).toFixed(1)),
      训练中: 0,
    });
  }

  const inWindows = Math.max(1, Math.ceil(inResults.length / window));
  for (let i = 0; i < inWindows; i++) {
    const slice = inResults.slice(i * window, (i + 1) * window);
    hitRateTrend.push({
      name: `训${i + 1}`,
      训练前: 0,
      训练中: Number((calculateHitRate(slice) * 100).toFixed(1)),
    });
  }

  if (hitRateTrend.length === 0) {
    hitRateTrend.push({ name: '训练前', 训练前: Number((preHitRate * 100).toFixed(1)), 训练中: 0 });
    hitRateTrend.push({ name: '训练中', 训练前: 0, 训练中: Number((inHitRate * 100).toFixed(1)) });
  }

  const deviations = inResults.map((r) => Number(r.deviationDistance.toFixed(2)));
  const devMA = movingAverage(deviations, 3);
  const deviationConvergence: TrainingAnalysisData['deviationConvergence'] = inResults.map(
    (r, i) => ({
      name: `第${i + 1}次`,
      偏差: Number(r.deviationDistance.toFixed(2)),
      移动平均: Number(devMA[i].toFixed(2)),
    })
  );

  const forces = inResults.map((r) => r.params.launchForce);
  const avgForces = movingAverage(forces, 3);
  const forceStability: TrainingAnalysisData['forceStability'] = inResults.map(
    (r, i) => ({
      name: `第${i + 1}次`,
      力度: Number(r.params.launchForce.toFixed(1)),
      平均力度: Number(avgForces[i].toFixed(1)),
      命中: r.hit ? 1 : 0,
    })
  );

  const hitAngleRanges: { min: number; max: number }[] = [];
  for (let i = 0; i < inResults.length; i++) {
    const slice = inResults.slice(0, i + 1).filter((r) => r.hit);
    if (slice.length > 0) {
      const angles = slice.map((r) => r.params.launchAngle);
      hitAngleRanges.push({
        min: Math.min(...angles),
        max: Math.max(...angles),
      });
    } else {
      hitAngleRanges.push({ min: 0, max: 0 });
    }
  }

  const initialAngleRange = findBestAngleRange(preResults);
  const finalAngleRange = findBestAngleRange(inResults);
  const initialCenter = initialAngleRange
    ? (initialAngleRange.min + initialAngleRange.max) / 2
    : 45;
  const initialWidth = initialAngleRange
    ? (initialAngleRange.max - initialAngleRange.min) / 2
    : 15;

  const angleConvergence: TrainingAnalysisData['angleConvergence'] = inResults.map(
    (r, i) => {
      const range = hitAngleRanges[i];
      const hasRange = range.min !== 0 || range.max !== 0;
      const center = hasRange ? (range.min + range.max) / 2 : initialCenter;
      const width = hasRange ? (range.max - range.min) / 2 : initialWidth;
      return {
        name: `第${i + 1}次`,
        角度: Number(r.params.launchAngle.toFixed(0)),
        下限: Number((center - width).toFixed(0)),
        上限: Number((center + width).toFixed(0)),
        命中: r.hit ? 1 : 0,
        命中区间: Number(center.toFixed(0)),
      };
    }
  );

  const preDev =
    preResults.length > 0
      ? preResults.reduce((s, r) => s + r.deviationDistance, 0) / preResults.length
      : 0;
  const inDev =
    inResults.length > 0
      ? inResults.reduce((s, r) => s + r.deviationDistance, 0) / inResults.length
      : 0;

  const preForceStd = calculateStdDev(preResults.map((r) => r.params.launchForce));
  const inForceStd = calculateStdDev(inResults.map((r) => r.params.launchForce));

  const initialRangeWidth = initialAngleRange
    ? initialAngleRange.max - initialAngleRange.min
    : 0;
  const finalRangeWidth = finalAngleRange
    ? finalAngleRange.max - finalAngleRange.min
    : 0;
  const angleNarrowing =
    initialRangeWidth > 0
      ? ((initialRangeWidth - finalRangeWidth) / initialRangeWidth) * 100
      : 0;

  const completedLevels = inResults.length > 0 ? session.currentLevelIndex : 0;

  return {
    hitRateTrend,
    deviationConvergence,
    forceStability,
    angleConvergence,
    summary: {
      preTrainingHitRate: Number((preHitRate * 100).toFixed(1)),
      inTrainingHitRate: Number((inHitRate * 100).toFixed(1)),
      hitRateImprovement: Number(((inHitRate - preHitRate) * 100).toFixed(1)),
      avgDeviationBefore: Number(preDev.toFixed(3)),
      avgDeviationAfter: Number(inDev.toFixed(3)),
      deviationImprovement:
        preDev > 0 ? Number(Number(((preDev - inDev) / preDev) * 100).toFixed(1)) : 0,
      forceStdBefore: Number(preForceStd.toFixed(2)),
      forceStdAfter: Number(inForceStd.toFixed(2)),
      forceStabilityImprovement:
        preForceStd > 0
          ? Number(Number(((preForceStd - inForceStd) / preForceStd) * 100).toFixed(1))
          : 0,
      finalAngleRange,
      initialAngleRange,
      angleRangeNarrowing: Number(angleNarrowing.toFixed(1)),
      totalAttempts: inResults.length,
      totalHits: inResults.filter((r) => r.hit).length,
      trainingDuration: Math.round(((session.endTime || Date.now()) - session.startTime) / 1000),
      levelsCompleted: completedLevels,
      totalLevels: session.levels.length,
    },
  };
}

const REPLAY_SESSIONS_KEY = 'replay_sessions';

export function createReplaySession(session: BattleSession): ReplaySession {
  const replayRounds: ReplayRound[] = session.rounds.map((round) => {
    const trajectory = calculateTrajectory(round.params, session.config.disturbance);
    return {
      ...round,
      trajectory,
      isKeyMoment: false,
    };
  });

  const replaySession: ReplaySession = {
    id: session.id,
    config: session.config,
    rounds: replayRounds,
    player1Score: session.player1Score,
    player2Score: session.player2Score,
    player1Hits: session.player1Hits,
    player2Hits: session.player2Hits,
    player1MaxStreak: 0,
    player2MaxStreak: 0,
    winner: session.player1Score > session.player2Score ? 1 : session.player2Score > session.player1Score ? 2 : 0,
    startTime: session.startTime,
    endTime: session.endTime || Date.now(),
    totalRounds: Math.max(...session.rounds.map((r) => r.round), 0),
    duration: Math.round(((session.endTime || Date.now()) - session.startTime) / 1000),
  };

  let p1Streak = 0;
  let p2Streak = 0;
  let p1MaxStreak = 0;
  let p2MaxStreak = 0;

  for (const round of replaySession.rounds) {
    if (round.player === 1) {
      p1Streak = round.hit ? p1Streak + 1 : 0;
      p1MaxStreak = Math.max(p1MaxStreak, p1Streak);
    } else {
      p2Streak = round.hit ? p2Streak + 1 : 0;
      p2MaxStreak = Math.max(p2MaxStreak, p2Streak);
    }
  }

  replaySession.player1MaxStreak = p1MaxStreak;
  replaySession.player2MaxStreak = p2MaxStreak;

  return identifyKeyMoments(replaySession);
}

export function identifyKeyMoments(session: ReplaySession): ReplaySession {
  const rounds = [...session.rounds];
  const totalRounds = session.totalRounds;

  let p1Score = 0;
  let p2Score = 0;
  let p1Streak = 0;
  let p2Streak = 0;
  let prevLeader: 1 | 2 | 0 = 0;

  for (let i = 0; i < rounds.length; i++) {
    const round = rounds[i];

    if (round.player === 1) {
      p1Score += round.roundScore;
      p1Streak = round.hit ? p1Streak + 1 : 0;
    } else {
      p2Score += round.roundScore;
      p2Streak = round.hit ? p2Streak + 1 : 0;
    }

    const currentLeader: 1 | 2 | 0 = p1Score > p2Score ? 1 : p2Score > p1Score ? 2 : 0;

    if (round.streakCount >= session.config.streakBonusThreshold && round.hit) {
      rounds[i] = {
        ...round,
        isKeyMoment: true,
        keyMomentType: 'streak_bonus',
        keyMomentDescription: `${round.player === 1 ? session.config.player1Name : session.config.player2Name} 达成 ${round.streakCount} 连中，获得连中加分！`,
      };
      continue;
    }

    if (round.round >= Math.floor(totalRounds * 0.7) && round.hit) {
      const scoreDiff = Math.abs(p1Score - p2Score);
      if (scoreDiff <= 10) {
        rounds[i] = {
          ...round,
          isKeyMoment: true,
          keyMomentType: 'clutch_hit',
          keyMomentDescription: `${round.player === 1 ? session.config.player1Name : session.config.player2Name} 在关键回合命中！`,
        };
        continue;
      }
    }

    if (prevLeader !== 0 && currentLeader !== prevLeader && currentLeader !== 0) {
      rounds[i] = {
        ...round,
        isKeyMoment: true,
        keyMomentType: 'turning_point',
        keyMomentDescription: `比分反超！${currentLeader === 1 ? session.config.player1Name : session.config.player2Name} 取得领先`,
      };
    }

    if (!round.hit && round.deviationDistance > 2) {
      const isAfterStreak = round.player === 1 ? p1Streak === 0 && i > 0 && rounds[i - 1]?.streakCount > 0 : p2Streak === 0 && i > 0 && rounds[i - 1]?.streakCount > 0;
      if (isAfterStreak) {
        rounds[i] = {
          ...round,
          isKeyMoment: true,
          keyMomentType: 'big_miss',
          keyMomentDescription: `${round.player === 1 ? session.config.player1Name : session.config.player2Name} 失误，连中终结`,
        };
      }
    }

    prevLeader = currentLeader;
  }

  return { ...session, rounds };
}

export function analyzeReplaySession(session: ReplaySession): ReplayAnalysisData {
  const p1Rounds = session.rounds.filter((r) => r.player === 1);
  const p2Rounds = session.rounds.filter((r) => r.player === 2);
  const totalRounds = session.totalRounds;

  const scoreTimeline: ReplayAnalysisData['scoreTimeline'] = [];
  let p1Score = 0;
  let p2Score = 0;

  for (let i = 1; i <= totalRounds; i++) {
    const p1Round = p1Rounds.find((r) => r.round === i);
    const p2Round = p2Rounds.find((r) => r.round === i);

    if (p1Round) p1Score += p1Round.roundScore;
    if (p2Round) p2Score += p2Round.roundScore;

    const lead: 1 | 2 | 0 = p1Score > p2Score ? 1 : p2Score > p1Score ? 2 : 0;
    scoreTimeline.push({ round: i, player1Score: p1Score, player2Score: p2Score, lead });
  }

  const turningPoints = findTurningPoints(session);
  const keyMoments = session.rounds.filter((r) => r.isKeyMoment);

  const calcPlayerStats = (rounds: ReplayRound[]) => {
    if (rounds.length === 0) {
      return {
        avgAngle: 0,
        avgForce: 0,
        angleStd: 0,
        forceStd: 0,
        avgDeviation: 0,
        hitRate: 0,
        clutchHitRate: 0,
        avgFlightTime: 0,
        avgMaxHeight: 0,
      };
    }

    const angles = rounds.map((r) => r.params.launchAngle);
    const forces = rounds.map((r) => r.params.launchForce);
    const deviations = rounds.map((r) => r.deviationDistance);
    const flightTimes = rounds.map((r) => r.flightTime);
    const maxHeights = rounds.map((r) => r.maxHeight);
    const hits = rounds.filter((r) => r.hit);

    const clutchRounds = rounds.filter((r) => r.round >= Math.floor(totalRounds * 0.7));
    const clutchHits = clutchRounds.filter((r) => r.hit);

    return {
      avgAngle: Number((angles.reduce((a, b) => a + b, 0) / angles.length).toFixed(1)),
      avgForce: Number((forces.reduce((a, b) => a + b, 0) / forces.length).toFixed(1)),
      angleStd: Number(calculateStdDev(angles).toFixed(2)),
      forceStd: Number(calculateStdDev(forces).toFixed(2)),
      avgDeviation: Number((deviations.reduce((a, b) => a + b, 0) / deviations.length).toFixed(3)),
      hitRate: Number((hits.length / rounds.length * 100).toFixed(1)),
      clutchHitRate: clutchRounds.length > 0 ? Number((clutchHits.length / clutchRounds.length * 100).toFixed(1)) : 0,
      avgFlightTime: Number((flightTimes.reduce((a, b) => a + b, 0) / flightTimes.length).toFixed(2)),
      avgMaxHeight: Number((maxHeights.reduce((a, b) => a + b, 0) / maxHeights.length).toFixed(2)),
    };
  };

  const p1Stats = calcPlayerStats(p1Rounds);
  const p2Stats = calcPlayerStats(p2Rounds);

  const comparison = {
    angleAdvantage: (Math.abs(p1Stats.avgAngle - p2Stats.avgAngle) < 1 ? 0 : p1Stats.avgAngle > p2Stats.avgAngle ? 1 : 2) as 0 | 1 | 2,
    forceAdvantage: (Math.abs(p1Stats.avgForce - p2Stats.avgForce) < 0.5 ? 0 : p1Stats.avgForce > p2Stats.avgForce ? 1 : 2) as 0 | 1 | 2,
    accuracyAdvantage: (Math.abs(p1Stats.avgDeviation - p2Stats.avgDeviation) < 0.1 ? 0 : p1Stats.avgDeviation < p2Stats.avgDeviation ? 1 : 2) as 0 | 1 | 2,
    stabilityAdvantage: (Math.abs(p1Stats.forceStd - p2Stats.forceStd) < 0.1 ? 0 : p1Stats.forceStd < p2Stats.forceStd ? 1 : 2) as 0 | 1 | 2,
  };

  return {
    scoreTimeline,
    turningPoints,
    keyMoments,
    playerStats: {
      player1: p1Stats,
      player2: p2Stats,
    },
    comparison,
  };
}

export function findTurningPoints(session: ReplaySession): TurningPoint[] {
  const p1Rounds = session.rounds.filter((r) => r.player === 1);
  const p2Rounds = session.rounds.filter((r) => r.player === 2);
  const totalRounds = session.totalRounds;
  const turningPoints: TurningPoint[] = [];

  let p1Score = 0;
  let p2Score = 0;
  let prevLeader: 1 | 2 | 0 = 0;
  let p1Streak = 0;
  let p2Streak = 0;
  let p1StreakStart = 0;
  let p2StreakStart = 0;

  for (let i = 1; i <= totalRounds; i++) {
    const p1Round = p1Rounds.find((r) => r.round === i);
    const p2Round = p2Rounds.find((r) => r.round === i);

    const beforeScore = { player1: p1Score, player2: p2Score };

    if (p1Round) {
      p1Score += p1Round.roundScore;
      if (p1Round.hit) {
        if (p1Streak === 0) p1StreakStart = i;
        p1Streak++;
        if (p1Streak === session.config.streakBonusThreshold) {
          turningPoints.push({
            round: i,
            type: 'streak_start',
            description: `${session.config.player1Name} 开始连中势头，从第 ${p1StreakStart} 轮到第 ${i} 轮连续命中`,
            player: 1,
            impactScore: p1Round.roundScore,
            beforeScore: { ...beforeScore },
            afterScore: { player1: p1Score, player2: p2Score },
          });
        }
      } else {
        if (p1Streak >= session.config.streakBonusThreshold) {
          turningPoints.push({
            round: i,
            type: 'streak_end',
            description: `${session.config.player1Name} 的连中势头在第 ${i} 轮终结，共 ${p1Streak} 连中`,
            player: 1,
            impactScore: -p1Streak * 5,
            beforeScore: { ...beforeScore },
            afterScore: { player1: p1Score, player2: p2Score },
          });
        }
        p1Streak = 0;
      }
    }

    if (p2Round) {
      p2Score += p2Round.roundScore;
      if (p2Round.hit) {
        if (p2Streak === 0) p2StreakStart = i;
        p2Streak++;
        if (p2Streak === session.config.streakBonusThreshold) {
          turningPoints.push({
            round: i,
            type: 'streak_start',
            description: `${session.config.player2Name} 开始连中势头，从第 ${p2StreakStart} 轮到第 ${i} 轮连续命中`,
            player: 2,
            impactScore: p2Round.roundScore,
            beforeScore: { ...beforeScore },
            afterScore: { player1: p1Score, player2: p2Score },
          });
        }
      } else {
        if (p2Streak >= session.config.streakBonusThreshold) {
          turningPoints.push({
            round: i,
            type: 'streak_end',
            description: `${session.config.player2Name} 的连中势头在第 ${i} 轮终结，共 ${p2Streak} 连中`,
            player: 2,
            impactScore: -p2Streak * 5,
            beforeScore: { ...beforeScore },
            afterScore: { player1: p1Score, player2: p2Score },
          });
        }
        p2Streak = 0;
      }
    }

    const currentLeader: 1 | 2 | 0 = p1Score > p2Score ? 1 : p2Score > p1Score ? 2 : 0;

    if (prevLeader !== 0 && currentLeader !== prevLeader && currentLeader !== 0) {
      const swing = Math.abs(p1Score - p2Score);
      turningPoints.push({
        round: i,
        type: 'lead_change',
        description: `第 ${i} 轮后，${currentLeader === 1 ? session.config.player1Name : session.config.player2Name} 反超比分，领先 ${swing} 分`,
        player: currentLeader,
        impactScore: swing,
        beforeScore: { ...beforeScore },
        afterScore: { player1: p1Score, player2: p2Score },
      });
    }

    if (i === Math.ceil(totalRounds / 2) && currentLeader !== 0) {
      const otherPlayer = currentLeader === 1 ? 2 : 1;
      const midPointDiff = Math.abs(p1Score - p2Score);
      if (midPointDiff >= 15) {
        turningPoints.push({
          round: i,
          type: currentLeader === 1 ? 'collapse' : 'comeback',
          description: `半场结束，${currentLeader === 1 ? session.config.player1Name : session.config.player2Name} 领先 ${midPointDiff} 分，${otherPlayer === 1 ? session.config.player1Name : session.config.player2Name} 需努力追赶`,
          player: currentLeader,
          impactScore: midPointDiff,
          beforeScore: { ...beforeScore },
          afterScore: { player1: p1Score, player2: p2Score },
        });
      }
    }

    prevLeader = currentLeader;
  }

  turningPoints.sort((a, b) => a.round - b.round);
  return turningPoints;
}

export function filterReplayRounds(session: ReplaySession, filter: ReplayFilter): ReplayRound[] {
  let filtered = [...session.rounds];

  if (filter.player && filter.player !== 'all') {
    const playerNum = parseInt(filter.player, 10) as 1 | 2;
    filtered = filtered.filter((r) => r.player === playerNum);
  }

  if (filter.hitOnly) {
    filtered = filtered.filter((r) => r.hit);
  }

  if (filter.minAngle !== undefined) {
    filtered = filtered.filter((r) => r.params.launchAngle >= filter.minAngle!);
  }
  if (filter.maxAngle !== undefined) {
    filtered = filtered.filter((r) => r.params.launchAngle <= filter.maxAngle!);
  }

  if (filter.minForce !== undefined) {
    filtered = filtered.filter((r) => r.params.launchForce >= filter.minForce!);
  }
  if (filter.maxForce !== undefined) {
    filtered = filtered.filter((r) => r.params.launchForce <= filter.maxForce!);
  }

  if (filter.minDeviation !== undefined) {
    filtered = filtered.filter((r) => r.deviationDistance >= filter.minDeviation!);
  }
  if (filter.maxDeviation !== undefined) {
    filtered = filtered.filter((r) => r.deviationDistance <= filter.maxDeviation!);
  }

  if (filter.keyMomentsOnly) {
    filtered = filtered.filter((r) => r.isKeyMoment);
  }

  return filtered;
}

export function generateReplaySummary(session: ReplaySession, analysis: ReplayAnalysisData): ReplaySummary {
  const date = new Date(session.startTime);
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  const duration = session.duration;
  const durationStr = `${Math.floor(duration / 60)}分${duration % 60}秒`;

  const winnerName = session.winner === 1
    ? session.config.player1Name
    : session.winner === 2
    ? session.config.player2Name
    : '平局';

  const keyHighlights: string[] = [];
  const performanceInsights: string[] = [];

  if (session.player1MaxStreak >= 3) {
    keyHighlights.push(`${session.config.player1Name} 最高 ${session.player1MaxStreak} 连中，展现出色的稳定性`);
  }
  if (session.player2MaxStreak >= 3) {
    keyHighlights.push(`${session.config.player2Name} 最高 ${session.player2MaxStreak} 连中，发挥惊艳`);
  }

  if (analysis.turningPoints.filter((t) => t.type === 'lead_change').length >= 2) {
    keyHighlights.push('双方比分交替领先，比赛跌宕起伏');
  }

  const finalDiff = Math.abs(session.player1Score - session.player2Score);
  if (finalDiff <= 5 && session.winner !== 0) {
    keyHighlights.push(`比赛胶着，最终仅以 ${finalDiff} 分的微弱差距决出胜负`);
  }

  if (analysis.comparison.accuracyAdvantage !== 0) {
    const advPlayer = analysis.comparison.accuracyAdvantage === 1 ? session.config.player1Name : session.config.player2Name;
    const devDiff = Math.abs(analysis.playerStats.player1.avgDeviation - analysis.playerStats.player2.avgDeviation);
    performanceInsights.push(`${advPlayer} 精准度更高，平均偏差小 ${devDiff.toFixed(3)}m`);
  }

  if (analysis.comparison.stabilityAdvantage !== 0) {
    const advPlayer = analysis.comparison.stabilityAdvantage === 1 ? session.config.player1Name : session.config.player2Name;
    const stdDiff = Math.abs(analysis.playerStats.player1.forceStd - analysis.playerStats.player2.forceStd);
    performanceInsights.push(`${advPlayer} 力度控制更稳定，标准差低 ${stdDiff.toFixed(2)}`);
  }

  if (analysis.playerStats.player1.clutchHitRate !== analysis.playerStats.player2.clutchHitRate) {
    const better = analysis.playerStats.player1.clutchHitRate > analysis.playerStats.player2.clutchHitRate ? 1 : 2;
    const betterName = better === 1 ? session.config.player1Name : session.config.player2Name;
    performanceInsights.push(`${betterName} 关键回合表现更佳，关键命中率 ${analysis.playerStats[`player${better}`].clutchHitRate}%`);
  }

  return {
    title: `${session.config.player1Name} vs ${session.config.player2Name} 投壶对战复盘`,
    date: dateStr,
    players: [
      { name: session.config.player1Name, score: session.player1Score, hitRate: analysis.playerStats.player1.hitRate, maxStreak: session.player1MaxStreak },
      { name: session.config.player2Name, score: session.player2Score, hitRate: analysis.playerStats.player2.hitRate, maxStreak: session.player2MaxStreak },
    ],
    winner: winnerName,
    totalRounds: session.totalRounds,
    duration: durationStr,
    keyHighlights,
    performanceInsights,
  };
}

export function exportReplayReport(session: ReplaySession, analysis: ReplayAnalysisData, summary: ReplaySummary): string {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push(`  ${summary.title}`);
  lines.push('='.repeat(60));
  lines.push('');
  lines.push(`📅 比赛时间: ${summary.date}`);
  lines.push(`⏱ 比赛时长: ${summary.duration}`);
  lines.push(`🎯 总回合数: ${summary.totalRounds} 回合`);
  lines.push(`🏆 最终胜者: ${summary.winner}`);
  lines.push('');

  lines.push('─'.repeat(60));
  lines.push('  双方战绩');
  lines.push('─'.repeat(60));
  lines.push('');

  for (const player of summary.players) {
    lines.push(`👤 ${player.name}`);
    lines.push(`   最终得分: ${player.score} 分`);
    lines.push(`   命中率: ${player.hitRate}%`);
    lines.push(`   最高连中: ${player.maxStreak} 连中`);
    lines.push('');
  }

  lines.push('─'.repeat(60));
  lines.push('  关键亮点');
  lines.push('─'.repeat(60));
  lines.push('');

  for (let i = 0; i < summary.keyHighlights.length; i++) {
    lines.push(`  ${i + 1}. ${summary.keyHighlights[i]}`);
  }
  lines.push('');

  lines.push('─'.repeat(60));
  lines.push('  表现洞察');
  lines.push('─'.repeat(60));
  lines.push('');

  for (let i = 0; i < summary.performanceInsights.length; i++) {
    lines.push(`  ${i + 1}. ${summary.performanceInsights[i]}`);
  }
  lines.push('');

  lines.push('─'.repeat(60));
  lines.push('  数据对比');
  lines.push('─'.repeat(60));
  lines.push('');

  const p1 = analysis.playerStats.player1;
  const p2 = analysis.playerStats.player2;
  const p1Name = session.config.player1Name;
  const p2Name = session.config.player2Name;

  lines.push(`  指标                ${p1Name.padEnd(12)}  ${p2Name.padEnd(12)}`);
  lines.push(`  平均角度:           ${String(p1.avgAngle + '°').padEnd(12)}  ${String(p2.avgAngle + '°').padEnd(12)}`);
  lines.push(`  平均力度:           ${String(p1.avgForce).padEnd(12)}  ${String(p2.avgForce).padEnd(12)}`);
  lines.push(`  力度稳定性(σ):      ${String(p1.forceStd).padEnd(12)}  ${String(p2.forceStd).padEnd(12)}`);
  lines.push(`  角度稳定性(σ):      ${String(p1.angleStd).padEnd(12)}  ${String(p2.angleStd).padEnd(12)}`);
  lines.push(`  平均偏差:           ${String(p1.avgDeviation + 'm').padEnd(12)}  ${String(p2.avgDeviation + 'm').padEnd(12)}`);
  lines.push(`  命中率:             ${String(p1.hitRate + '%').padEnd(12)}  ${String(p2.hitRate + '%').padEnd(12)}`);
  lines.push(`  关键回合命中率:     ${String(p1.clutchHitRate + '%').padEnd(12)}  ${String(p2.clutchHitRate + '%').padEnd(12)}`);
  lines.push(`  平均飞行时间:       ${String(p1.avgFlightTime + 's').padEnd(12)}  ${String(p2.avgFlightTime + 's').padEnd(12)}`);
  lines.push(`  平均最高高度:       ${String(p1.avgMaxHeight + 'm').padEnd(12)}  ${String(p2.avgMaxHeight + 'm').padEnd(12)}`);
  lines.push('');

  lines.push('─'.repeat(60));
  lines.push('  胜负转折点');
  lines.push('─'.repeat(60));
  lines.push('');

  for (const tp of analysis.turningPoints) {
    const typeLabels: Record<string, string> = {
      comeback: '📈 逆转攻势',
      collapse: '📉 局势崩溃',
      streak_start: '🔥 连中开始',
      streak_end: '💨 连中终结',
      lead_change: '🔄 比分反超',
    };
    lines.push(`  第 ${tp.round} 轮 ${typeLabels[tp.type] || tp.type}`);
    lines.push(`     ${tp.description}`);
    lines.push(`     比分变化: ${tp.beforeScore.player1} : ${tp.beforeScore.player2} → ${tp.afterScore.player1} : ${tp.afterScore.player2}`);
    lines.push('');
  }

  lines.push('─'.repeat(60));
  lines.push('  逐回合详情');
  lines.push('─'.repeat(60));
  lines.push('');

  for (let i = 1; i <= session.totalRounds; i++) {
    const p1Round = session.rounds.find((r) => r.round === i && r.player === 1);
    const p2Round = session.rounds.find((r) => r.round === i && r.player === 2);

    lines.push(`  第 ${i} 回合:`);
    if (p1Round) {
      lines.push(`    ${p1Name}: ${p1Round.hit ? '✅ 命中' : '❌ 未中'} | 角度 ${p1Round.params.launchAngle.toFixed(0)}° | 力度 ${p1Round.params.launchForce.toFixed(1)} | 偏差 ${p1Round.deviationDistance.toFixed(2)}m | 得分 +${p1Round.roundScore}`);
    }
    if (p2Round) {
      lines.push(`    ${p2Name}: ${p2Round.hit ? '✅ 命中' : '❌ 未中'} | 角度 ${p2Round.params.launchAngle.toFixed(0)}° | 力度 ${p2Round.params.launchForce.toFixed(1)} | 偏差 ${p2Round.deviationDistance.toFixed(2)}m | 得分 +${p2Round.roundScore}`);
    }
    lines.push('');
  }

  lines.push('='.repeat(60));
  lines.push('  报告生成时间: ' + new Date().toLocaleString('zh-CN'));
  lines.push('='.repeat(60));

  return lines.join('\n');
}

export function downloadReplayReport(session: ReplaySession, analysis: ReplayAnalysisData, summary: ReplaySummary): void {
  const report = exportReplayReport(session, analysis, summary);
  const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `投壶对战复盘_${session.config.player1Name}_vs_${session.config.player2Name}_${new Date(session.startTime).toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function saveReplaySession(session: ReplaySession): void {
  try {
    const sessions = getReplaySessions();
    const existingIndex = sessions.findIndex((s) => s.id === session.id);
    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.unshift(session);
    }
    if (sessions.length > 20) sessions.length = 20;
    localStorage.setItem(REPLAY_SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    console.error('保存复盘会话失败');
  }
}

export function getReplaySessions(): ReplaySession[] {
  try {
    const raw = localStorage.getItem(REPLAY_SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getReplaySessionById(id: number): ReplaySession | null {
  const sessions = getReplaySessions();
  return sessions.find((s) => s.id === id) || null;
}

export function deleteReplaySession(id: number): void {
  try {
    const sessions = getReplaySessions().filter((s) => s.id !== id);
    localStorage.setItem(REPLAY_SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    console.error('删除复盘会话失败');
  }
}
