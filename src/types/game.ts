export interface GameParams {
  launchPosition: { x: number; y: number; z: number };
  potPosition: { x: number; y: number; z: number };
  potRadius: number;
  launchAngle: number;
  launchForce: number;
}

export interface ThrowResult {
  id: number;
  timestamp: number;
  params: GameParams;
  hit: boolean;
  deviationDistance: number;
  landPosition: { x: number; y: number; z: number };
  maxHeight: number;
  flightTime: number;
  bestAngleRangeAtTime: { min: number; max: number } | null;
  disturbanceParams?: DisturbanceParams;
}

export type GameMode = 'free' | 'training' | 'smart-training';

export type TrainingDifficulty = 'easy' | 'medium' | 'hard';

export interface TrainingTarget {
  distance: number;
  height: number;
  potRadius: number;
  difficulty: TrainingDifficulty;
  requiredHits: number;
  maxAttempts: number;
  description: string;
}

export interface DisturbanceParams {
  windForce: number;
  windAngle: number;
  lateralOffset: number;
  potHeightOffset: number;
}

export interface HeatZonePoint {
  x: number;
  z: number;
  probability: number;
}

export interface HeatZoneData {
  points: HeatZonePoint[];
  center: { x: number; z: number };
  optimalAngle: number;
  optimalForce: number;
  hitRadius: number;
}

export interface SmartTrainingLevel {
  id: number;
  levelNumber: number;
  name: string;
  description: string;
  difficulty: TrainingDifficulty;
  targetHitRate: number;
  requiredHits: number;
  maxAttempts: number;
  distance: number;
  potRadius: number;
  disturbance: DisturbanceParams;
  hideBestAngle: boolean;
}

export interface SmartTrainingSession {
  id: number;
  startTime: number;
  endTime?: number;
  levels: SmartTrainingLevel[];
  currentLevelIndex: number;
  preTrainingResults: ThrowResult[];
  inTrainingResults: ThrowResult[];
  completed: boolean;
  passed: boolean;
}

export interface TrainingAnalysisData {
  hitRateTrend: { name: string; 训练前: number; 训练中: number }[];
  deviationConvergence: { name: string; 偏差: number; 移动平均: number }[];
  forceStability: { name: string; 力度: number; 平均力度: number; 命中: number }[];
  angleConvergence: {
    name: string;
    角度: number;
    下限: number;
    上限: number;
    命中: number;
    命中区间: number;
  }[];
  summary: {
    preTrainingHitRate: number;
    inTrainingHitRate: number;
    hitRateImprovement: number;
    avgDeviationBefore: number;
    avgDeviationAfter: number;
    deviationImprovement: number;
    forceStdBefore: number;
    forceStdAfter: number;
    forceStabilityImprovement: number;
    finalAngleRange: { min: number; max: number } | null;
    initialAngleRange: { min: number; max: number } | null;
    angleRangeNarrowing: number;
    totalAttempts: number;
    totalHits: number;
    trainingDuration: number;
    levelsCompleted: number;
    totalLevels: number;
  };
}

export interface GameState {
  mode: GameMode;
  params: GameParams;
  results: ThrowResult[];
  isPlaying: boolean;
  currentTrajectory: { x: number; y: number; z: number }[];
  bestAngleRange: { min: number; max: number } | null;
  trainingTarget: TrainingTarget | null;
  trainingCompleted: boolean;
  trainingScore: number;
  disturbanceParams: DisturbanceParams;
  heatZoneData: HeatZoneData | null;
  smartTrainingSession: SmartTrainingSession | null;
  trainingAnalysis: TrainingAnalysisData | null;
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  z: number;
  t: number;
}
