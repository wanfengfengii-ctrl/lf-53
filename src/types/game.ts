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

export type GameMode = 'free' | 'training' | 'smart-training' | 'battle';

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
  battleSession: BattleSession | null;
  battleAnalysis: BattleAnalysisData | null;
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  z: number;
  t: number;
}

export type BattleMode = 'timed' | 'rounds';

export interface BattleConfig {
  mode: BattleMode;
  rounds: number;
  timeLimitSeconds: number;
  distance: number;
  potRadius: number;
  disturbance: DisturbanceParams;
  streakBonusThreshold: number;
  streakBonusPoints: number;
  player1Name: string;
  player2Name: string;
}

export interface BattlePlayerRound {
  round: number;
  player: 1 | 2;
  params: GameParams;
  hit: boolean;
  deviationDistance: number;
  landPosition: { x: number; y: number; z: number };
  maxHeight: number;
  flightTime: number;
  streakCount: number;
  roundScore: number;
  timestamp: number;
}

export interface BattleSession {
  id: number;
  config: BattleConfig;
  currentRound: number;
  currentPlayer: 1 | 2;
  rounds: BattlePlayerRound[];
  player1Score: number;
  player2Score: number;
  player1Streak: number;
  player2Streak: number;
  player1Hits: number;
  player2Hits: number;
  completed: boolean;
  startTime: number;
  endTime?: number;
  timedOut: boolean;
}

export interface BattleAnalysisData {
  hitRateComparison: { round: string; player1: number; player2: number }[];
  deviationComparison: { round: string; player1: number; player2: number; player1Avg: number; player2Avg: number }[];
  forceStability: { round: string; player1Force: number; player2Force: number; player1Avg: number; player2Avg: number; player1Hit: number; player2Hit: number }[];
  keyRounds: { round: number; player1Score: number; player2Score: number; player1Hit: boolean; player2Hit: boolean; swing: number }[];
  summary: {
    player1Name: string;
    player2Name: string;
    player1TotalScore: number;
    player2TotalScore: number;
    player1HitRate: number;
    player2HitRate: number;
    player1AvgDeviation: number;
    player2AvgDeviation: number;
    player1ForceStd: number;
    player2ForceStd: number;
    player1MaxStreak: number;
    player2MaxStreak: number;
    winner: 1 | 2 | 0;
    totalRounds: number;
    duration: number;
  };
}

export interface BattleHistoryEntry {
  id: number;
  date: number;
  player1Name: string;
  player2Name: string;
  player1Score: number;
  player2Score: number;
  winner: 1 | 2 | 0;
  mode: BattleMode;
  rounds: number;
}

export interface BattleLeaderboardEntry {
  playerName: string;
  wins: number;
  losses: number;
  totalScore: number;
  avgHitRate: number;
  maxStreak: number;
}

export interface ReplayRound extends BattlePlayerRound {
  trajectory: TrajectoryPoint[];
  isKeyMoment: boolean;
  keyMomentType?: 'streak_bonus' | 'turning_point' | 'clutch_hit' | 'big_miss';
  keyMomentDescription?: string;
}

export interface ReplaySession {
  id: number;
  config: BattleConfig;
  rounds: ReplayRound[];
  player1Score: number;
  player2Score: number;
  player1Hits: number;
  player2Hits: number;
  player1MaxStreak: number;
  player2MaxStreak: number;
  winner: 1 | 2 | 0;
  startTime: number;
  endTime: number;
  totalRounds: number;
  duration: number;
}

export interface TurningPoint {
  round: number;
  type: 'comeback' | 'collapse' | 'streak_start' | 'streak_end' | 'lead_change';
  description: string;
  player: 1 | 2;
  impactScore: number;
  beforeScore: { player1: number; player2: number };
  afterScore: { player1: number; player2: number };
}

export interface ReplayFilter {
  player?: '1' | '2' | 'all';
  hitOnly?: boolean;
  minAngle?: number;
  maxAngle?: number;
  minForce?: number;
  maxForce?: number;
  minDeviation?: number;
  maxDeviation?: number;
  keyMomentsOnly?: boolean;
}

export interface ReplaySummary {
  title: string;
  date: string;
  players: { name: string; score: number; hitRate: number; maxStreak: number }[];
  winner: string;
  totalRounds: number;
  duration: string;
  keyHighlights: string[];
  performanceInsights: string[];
}

export interface ReplayAnalysisData {
  scoreTimeline: { round: number; player1Score: number; player2Score: number; lead: 1 | 2 | 0 }[];
  turningPoints: TurningPoint[];
  keyMoments: ReplayRound[];
  playerStats: {
    player1: {
      avgAngle: number;
      avgForce: number;
      angleStd: number;
      forceStd: number;
      avgDeviation: number;
      hitRate: number;
      clutchHitRate: number;
      avgFlightTime: number;
      avgMaxHeight: number;
    };
    player2: {
      avgAngle: number;
      avgForce: number;
      angleStd: number;
      forceStd: number;
      avgDeviation: number;
      hitRate: number;
      clutchHitRate: number;
      avgFlightTime: number;
      avgMaxHeight: number;
    };
  };
  comparison: {
    angleAdvantage: 1 | 2 | 0;
    forceAdvantage: 1 | 2 | 0;
    accuracyAdvantage: 1 | 2 | 0;
    stabilityAdvantage: 1 | 2 | 0;
  };
}

export interface ReplayState {
  currentSession: ReplaySession | null;
  currentRoundIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  showTrajectories: 'all' | 'current' | 'none';
  showHitMarkers: boolean;
  filter: ReplayFilter;
  analysis: ReplayAnalysisData | null;
  summary: ReplaySummary | null;
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
  battleSession: BattleSession | null;
  battleAnalysis: BattleAnalysisData | null;
  replay: ReplayState;
}
