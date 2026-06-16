import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { GameParams, GameState, GameMode, ThrowResult, TrainingDifficulty } from '../types/game';
import { calculateTrajectory, performThrow, findBestAngleRange, generateTrainingTarget, calculateTrainingScore } from '../utils/physics';

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
};

type GameAction =
  | { type: 'SET_MODE'; payload: GameMode }
  | { type: 'SET_PARAMS'; payload: Partial<GameParams> }
  | { type: 'START_THROW' }
  | { type: 'END_THROW'; payload: ThrowResult }
  | { type: 'RESET_RESULTS' }
  | { type: 'UPDATE_TRAJECTORY'; payload: { x: number; y: number; z: number }[] }
  | { type: 'START_TRAINING'; payload: TrainingDifficulty }
  | { type: 'COMPLETE_TRAINING'; payload: number };

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
      };

    case 'SET_PARAMS': {
      const newParams = { ...state.params, ...action.payload };
      const trajectory = calculateTrajectory(newParams);
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

      const bestAngleRange =
        state.mode === 'free' ? findBestAngleRange(newResults) : null;

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
      const newParams: GameParams = {
        ...state.params,
        launchPosition: { x: -target.distance, y: target.height, z: 0 },
        potPosition: { x: 0, y: 0, z: 0 },
        potRadius: target.potRadius,
      };
      const trajectory = calculateTrajectory(newParams);
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
      };
    }

    case 'COMPLETE_TRAINING':
      return {
        ...state,
        trainingCompleted: true,
        trainingScore: action.payload,
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
    dispatch({ type: 'END_THROW', payload: result });
  };

  const resetResults = () => {
    dispatch({ type: 'RESET_RESULTS' });
  };

  const performThrowAction = (): ThrowResult | null => {
    if (state.isPlaying) return null;
    const result = performThrow(state.params, state.results.length + 1, state.results);
    startThrow();
    return result;
  };

  const startTraining = (difficulty: TrainingDifficulty) => {
    dispatch({ type: 'START_TRAINING', payload: difficulty });
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
