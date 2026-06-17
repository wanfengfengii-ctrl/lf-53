import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type {
  GameParams,
  GameState,
  GameMode,
  ThrowResult,
  TrainingDifficulty,
  DisturbanceParams,
  SmartTrainingSession,
  TrainingAnalysisData,
} from '../types/game';
import {
  calculateTrajectory,
  performThrow,
  findBestAngleRange,
  generateTrainingTarget,
  calculateTrainingScore,
  getDefaultDisturbance,
  calculateHeatZone,
  createSmartTrainingSession,
  analyzeTrainingSession,
} from '../utils/physics';

const initialParams: GameParams = {
  launchPosition: { x: -5, y: 1, z: 0 },
  potPosition: { x: 5, y: 0, z: 0 },
  potRadius: 0.3,
  launchAngle: 45,
  launchForce: 10,
};

const initialState: GameState = {
  mode: 'free',
  params: initialParams,
  results: [],
  isPlaying: false,
  currentTrajectory: [],
  bestAngleRange: null,
  trainingTarget: null,
  trainingCompleted: false,
  trainingScore: 0,
  disturbanceParams: getDefaultDisturbance(),
  heatZoneData: null,
  smartTrainingSession: null,
  trainingAnalysis: null,
};

type GameAction =
  | { type: 'SET_MODE'; payload: GameMode }
  | { type: 'SET_PARAMS'; payload: Partial<GameParams> }
  | { type: 'START_THROW' }
  | { type: 'END_THROW'; payload: ThrowResult }
  | { type: 'RESET_RESULTS' }
  | { type: 'UPDATE_TRAJECTORY'; payload: { x: number; y: number; z: number }[] }
  | { type: 'START_TRAINING'; payload: TrainingDifficulty }
  | { type: 'COMPLETE_TRAINING'; payload: number }
  | { type: 'SET_DISTURBANCE'; payload: Partial<DisturbanceParams> }
  | { type: 'UPDATE_HEAT_ZONE' }
  | { type: 'START_SMART_TRAINING' }
  | { type: 'END_SMART_TRAINING_THROW'; payload: ThrowResult }
  | { type: 'NEXT_SMART_LEVEL' }
  | { type: 'END_SMART_TRAINING'; payload: TrainingAnalysisData }
  | { type: 'EXIT_SMART_TRAINING' };

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_MODE':
      return {
        ...state,
        mode: action.payload,
        results: [],
        bestAngleRange: null,
        trainingTarget: null,
        trainingCompleted: false,
        trainingScore: 0,
        disturbanceParams: getDefaultDisturbance(),
        heatZoneData: null,
        smartTrainingSession: null,
        trainingAnalysis: null,
      };

    case 'SET_PARAMS': {
      const newParams = { ...state.params, ...action.payload };
      const trajectory = calculateTrajectory(newParams, state.disturbanceParams);
      return {
        ...state,
        params: newParams,
        currentTrajectory: trajectory,
      };
    }

    case 'START_THROW':
      return { ...state, isPlaying: true };

    case 'END_THROW': {
      const resultWithBestAngle = {
        ...action.payload,
        bestAngleRangeAtTime: action.payload.bestAngleRangeAtTime ?? null,
      };
      const newResults = [...state.results, resultWithBestAngle];

      if (!resultWithBestAngle.bestAngleRangeAtTime) {
        const range = findBestAngleRange(newResults);
        resultWithBestAngle.bestAngleRangeAtTime = range;
        newResults[newResults.length - 1] = resultWithBestAngle;
      }

      const showBestAngle =
        state.mode === 'free' ||
        (state.mode === 'smart-training' &&
          state.smartTrainingSession &&
          !state.smartTrainingSession.levels[state.smartTrainingSession.currentLevelIndex]
            ?.hideBestAngle);

      const bestAngleRange = showBestAngle ? findBestAngleRange(newResults) : null;

      let trainingCompleted = state.trainingCompleted;
      let trainingScore = state.trainingScore;

      if (state.mode === 'training' && state.trainingTarget) {
        const hits = newResults.filter((r) => r.hit).length;
        if (hits >= state.trainingTarget.requiredHits) {
          trainingCompleted = true;
          trainingScore = calculateTrainingScore(newResults, state.trainingTarget);
        } else if (newResults.length >= state.trainingTarget.maxAttempts) {
          trainingCompleted = true;
          trainingScore = 0;
        }
      }

      return {
        ...state,
        isPlaying: false,
        results: newResults,
        bestAngleRange,
        trainingCompleted,
        trainingScore,
      };
    }

    case 'RESET_RESULTS':
      return {
        ...state,
        results: [],
        bestAngleRange: null,
        trainingCompleted: false,
        trainingScore: 0,
      };

    case 'UPDATE_TRAJECTORY':
      return { ...state, currentTrajectory: action.payload };

    case 'START_TRAINING': {
      const target = generateTrainingTarget(action.payload);
      const disturbance = getDefaultDisturbance();
      const newParams: GameParams = {
        ...state.params,
        launchPosition: { x: -target.distance, y: target.height, z: 0 },
        potPosition: { x: 0, y: 0, z: 0 },
        potRadius: target.potRadius,
      };
      const trajectory = calculateTrajectory(newParams, disturbance);
      return {
        ...state,
        mode: 'training',
        params: newParams,
        currentTrajectory: trajectory,
        results: [],
        bestAngleRange: null,
        trainingTarget: target,
        trainingCompleted: false,
        trainingScore: 0,
        disturbanceParams: disturbance,
        heatZoneData: null,
        smartTrainingSession: null,
        trainingAnalysis: null,
      };
    }

    case 'COMPLETE_TRAINING':
      return {
        ...state,
        trainingCompleted: true,
        trainingScore: action.payload,
      };

    case 'SET_DISTURBANCE': {
      const newDisturbance = { ...state.disturbanceParams, ...action.payload };
      const trajectory = calculateTrajectory(state.params, newDisturbance);
      return {
        ...state,
        disturbanceParams: newDisturbance,
        currentTrajectory: trajectory,
      };
    }

    case 'UPDATE_HEAT_ZONE': {
      const heatZone = calculateHeatZone(state.params, state.disturbanceParams);
      return { ...state, heatZoneData: heatZone };
    }

    case 'START_SMART_TRAINING': {
      if (state.results.length < 10) return state;
      if (state.smartTrainingSession) return state;
      const session = createSmartTrainingSession(state.results);
      const firstLevel = session.levels[0];
      const disturbance = firstLevel.disturbance;
      const newParams: GameParams = {
        ...state.params,
        launchPosition: { x: -firstLevel.distance, y: 1, z: 0 },
        potPosition: { x: 0, y: 0, z: 0 },
        potRadius: firstLevel.potRadius,
      };
      const trajectory = calculateTrajectory(newParams, disturbance);
      const heatZone = calculateHeatZone(newParams, disturbance);

      return {
        ...state,
        mode: 'smart-training',
        params: newParams,
        currentTrajectory: trajectory,
        results: [],
        bestAngleRange: null,
        trainingTarget: null,
        trainingCompleted: false,
        trainingScore: 0,
        disturbanceParams: disturbance,
        heatZoneData: heatZone,
        smartTrainingSession: session,
        trainingAnalysis: null,
      };
    }

    case 'END_SMART_TRAINING_THROW': {
      const result = action.payload;
      const session = state.smartTrainingSession;
      if (!session) return state;

      const currentLevel = session.levels[session.currentLevelIndex];
      const newSessionResults = [...session.inTrainingResults, result];
      const levelResults = newSessionResults.filter(
        (_, i) =>
          i >=
          newSessionResults.length -
            (session.currentLevelIndex === 0
              ? newSessionResults.length
              : session.inTrainingResults
                  .filter(
                    (_, idx) =>
                      idx >=
                      session.levels
                        .slice(0, session.currentLevelIndex)
                        .reduce((s, l) => s + l.maxAttempts, 0)
                  )
                  .length)
      );

      const levelHits = levelResults.filter((r) => r.hit).length;
      const levelPassed = levelHits >= currentLevel.requiredHits;
      const levelFailed =
        !levelPassed && levelResults.length >= currentLevel.maxAttempts;

      const newResults = [...state.results, result];
      const hideBestAngle = currentLevel.hideBestAngle;
      const bestAngleRange = hideBestAngle ? null : findBestAngleRange(newResults);

      const isLastLevel = session.currentLevelIndex >= session.levels.length - 1;
      const sessionCompleted = (levelPassed && isLastLevel) || (levelFailed && isLastLevel);
      const sessionCompletedEarly = levelFailed && !isLastLevel;

      let updatedSession: SmartTrainingSession = {
        ...session,
        inTrainingResults: newSessionResults,
        completed: sessionCompleted || sessionCompletedEarly,
        passed: levelPassed && isLastLevel,
        endTime: sessionCompleted || sessionCompletedEarly ? Date.now() : undefined,
      };

      let newAnalysis: TrainingAnalysisData | null = null;
      if (sessionCompleted || sessionCompletedEarly) {
        newAnalysis = analyzeTrainingSession(updatedSession);
      }

      return {
        ...state,
        isPlaying: false,
        results: newResults,
        bestAngleRange,
        smartTrainingSession: updatedSession,
        trainingAnalysis: newAnalysis,
      };
    }

    case 'NEXT_SMART_LEVEL': {
      const session = state.smartTrainingSession;
      if (!session || session.currentLevelIndex >= session.levels.length - 1) return state;

      const nextIndex = session.currentLevelIndex + 1;
      const nextLevel = session.levels[nextIndex];
      const disturbance = nextLevel.disturbance;
      const newParams: GameParams = {
        ...state.params,
        launchPosition: { x: -nextLevel.distance, y: 1, z: 0 },
        potPosition: { x: 0, y: 0, z: 0 },
        potRadius: nextLevel.potRadius,
      };
      const trajectory = calculateTrajectory(newParams, disturbance);
      const heatZone = calculateHeatZone(newParams, disturbance);

      return {
        ...state,
        params: newParams,
        currentTrajectory: trajectory,
        disturbanceParams: disturbance,
        heatZoneData: heatZone,
        smartTrainingSession: {
          ...session,
          currentLevelIndex: nextIndex,
        },
        trainingCompleted: false,
        trainingScore: 0,
      };
    }

    case 'END_SMART_TRAINING':
      return {
        ...state,
        trainingAnalysis: action.payload,
        smartTrainingSession: state.smartTrainingSession
          ? { ...state.smartTrainingSession, completed: true, endTime: Date.now() }
          : state.smartTrainingSession,
      };

    case 'EXIT_SMART_TRAINING':
      return {
        ...state,
        mode: 'free',
        smartTrainingSession: null,
        trainingAnalysis: null,
        heatZoneData: null,
        disturbanceParams: getDefaultDisturbance(),
        trainingTarget: null,
        trainingCompleted: false,
        trainingScore: 0,
        results: state.smartTrainingSession
          ? [...state.results.slice(0, Math.max(0, state.results.length - state.smartTrainingSession.inTrainingResults.length))]
          : state.results,
      };

    default:
      return state;
  }
}

interface GameContextType {
  state: GameState;
  setMode: (mode: GameMode) => void;
  setParams: (params: Partial<GameParams>) => void;
  startThrow: () => void;
  endThrow: (result: ThrowResult) => void;
  resetResults: () => void;
  performThrowAction: () => ThrowResult | null;
  startTraining: (difficulty: TrainingDifficulty) => void;
  setDisturbance: (params: Partial<DisturbanceParams>) => void;
  updateHeatZone: () => void;
  startSmartTraining: () => void;
  endSmartTrainingThrow: (result: ThrowResult) => void;
  nextSmartLevel: () => void;
  exitSmartTraining: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const setMode = (mode: GameMode) => {
    dispatch({ type: 'SET_MODE', payload: mode });
  };

  const setParams = (params: Partial<GameParams>) => {
    dispatch({ type: 'SET_PARAMS', payload: params });
  };

  const startThrow = () => {
    dispatch({ type: 'START_THROW' });
  };

  const endThrow = (result: ThrowResult) => {
    if (state.mode === 'smart-training') {
      dispatch({ type: 'END_SMART_TRAINING_THROW', payload: result });
    } else {
      dispatch({ type: 'END_THROW', payload: result });
    }
  };

  const resetResults = () => {
    dispatch({ type: 'RESET_RESULTS' });
  };

  const performThrowAction = (): ThrowResult | null => {
    if (state.isPlaying) return null;
    const result = performThrow(
      state.params,
      state.results.length + 1,
      state.results,
      state.disturbanceParams
    );
    startThrow();
    return result;
  };

  const startTraining = (difficulty: TrainingDifficulty) => {
    dispatch({ type: 'START_TRAINING', payload: difficulty });
  };

  const setDisturbance = (params: Partial<DisturbanceParams>) => {
    dispatch({ type: 'SET_DISTURBANCE', payload: params });
  };

  const updateHeatZone = () => {
    dispatch({ type: 'UPDATE_HEAT_ZONE' });
  };

  const startSmartTraining = () => {
    if (state.results.length < 10) {
      console.warn(`[SmartTraining] 前置条件未满足：需要至少10次投掷记录，当前：${state.results.length}`);
      return;
    }
    if (state.smartTrainingSession) {
      console.warn('[SmartTraining] 训练已在进行中');
      return;
    }
    dispatch({ type: 'START_SMART_TRAINING' });
  };

  const endSmartTrainingThrow = (result: ThrowResult) => {
    dispatch({ type: 'END_SMART_TRAINING_THROW', payload: result });
  };

  const nextSmartLevel = () => {
    dispatch({ type: 'NEXT_SMART_LEVEL' });
  };

  const exitSmartTraining = () => {
    dispatch({ type: 'EXIT_SMART_TRAINING' });
  };

  return (
    <GameContext.Provider
      value={{
        state,
        setMode,
        setParams,
        startThrow,
        endThrow,
        resetResults,
        performThrowAction,
        startTraining,
        setDisturbance,
        updateHeatZone,
        startSmartTraining,
        endSmartTrainingThrow,
        nextSmartLevel,
        exitSmartTraining,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
