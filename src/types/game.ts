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
}

export type GameMode = 'free' | 'training';

export interface GameState {
  mode: GameMode;
  params: GameParams;
  results: ThrowResult[];
  isPlaying: boolean;
  currentTrajectory: { x: number; y: number; z: number }[];
  bestAngleRange: { min: number; max: number } | null;
  trainingTarget: { distance: number; height: number } | null;
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  z: number;
  t: number;
}
