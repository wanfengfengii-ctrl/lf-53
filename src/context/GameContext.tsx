import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { GameParams, GameState, GameMode, ThrowResult } from '../types/game';
import { calculateTrajectory, performThrow, findBestAngleRange } from '../utils/physics';

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
};

type GameAction =
  | { type: 'SET_MODE'; payload: GameMode }
  | { type: 'SET_PARAMS'; payload: Partial<GameParams> }
  | { type: 'START_THROW' }
  | { type: 'END_THROW'; payload: ThrowResult }
  | { type: 'RESET_RESULTS' }
  | { type: 'UPDATE_TRAJECTORY'; payload: { x: number; y: number; z: number }[] }
  | { type: 'SET_TRAINING_TARGET'; payload: { distance: number; height: number } | null };

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_MODE':
      return {
        ...state,
        mode: action.payload,
        results: [],
        bestAngleRange: null,
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
      const newResults = [...state.results, action.payload];
      const bestAngleRange =
        state.mode === 'free' ? findBestAngleRange(newResults) : null;
      return {
        ...state,
        isPlaying: false,
        results: newResults,
        bestAngleRange,
      };
    }

    case 'RESET_RESULTS':
      return {
        ...state,
        results: [],
        bestAngleRange: null,
      };

    case 'UPDATE_TRAJECTORY':
      return { ...state, currentTrajectory: action.payload };

    case 'SET_TRAINING_TARGET':
      return { ...state, trainingTarget: action.payload };

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
  setTrainingTarget: (target: { distance: number; height: number } | null) => void;
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
    const result = performThrow(state.params, state.results.length + 1);
    startThrow();
    return result;
  };

  const setTrainingTarget = (target: { distance: number; height: number } | null) => {
    dispatch({ type: 'SET_TRAINING_TARGET', payload: target });
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
        setTrainingTarget,
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
