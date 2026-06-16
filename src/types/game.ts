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
}

export type GameMode = 'free' | 'training';

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
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  z: number;
  t: number;
}
