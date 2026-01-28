import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Mode, MODES, CYCLE, FOCUS_MINUTES } from '../constants/timer';

// Re-export for convenience
export { MODES, Mode } from '../constants/timer';

interface DailyStats {
  date: string;
  sessionsCompleted: number;
  totalFocusMinutes: number;
}

interface TimerState {
  mode: Mode;
  timeLeft: number;
  isRunning: boolean;
  cycleCount: number;
  todayStats: DailyStats;
  weeklyStats: DailyStats[];
}

interface TimerActions {
  setMode: (mode: Mode) => void;
  tick: () => void;
  toggleTimer: () => void;
  resetTimer: () => void;
  skipToNext: () => void;
  completeSession: () => void;
  initializeDay: () => void;
}

type TimerStore = TimerState & TimerActions;

// Helpers
const getTodayString = (): string => new Date().toISOString().split('T')[0];

const createEmptyDayStats = (): DailyStats => ({
  date: getTodayString(),
  sessionsCompleted: 0,
  totalFocusMinutes: 0,
});

const getNextMode = (currentMode: Mode, cycleCount: number): { mode: Mode; newCycleCount: number } => {
  if (currentMode === 'focus') {
    const newCycleCount = cycleCount + 1;
    if (newCycleCount >= CYCLE.SESSIONS_BEFORE_LONG_BREAK) {
      return { mode: 'longBreak', newCycleCount: 0 };
    }
    return { mode: 'shortBreak', newCycleCount };
  }
  return { mode: 'focus', newCycleCount: cycleCount };
};

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => ({
      // Initial state
      mode: 'focus',
      timeLeft: MODES.focus.duration,
      isRunning: false,
      cycleCount: 0,
      todayStats: createEmptyDayStats(),
      weeklyStats: [],

      setMode: (mode) => set({
        mode,
        timeLeft: MODES[mode].duration,
        isRunning: false,
      }),

      tick: () => set((state) => ({
        timeLeft: Math.max(0, state.timeLeft - 1),
      })),

      toggleTimer: () => set((state) => ({
        isRunning: !state.isRunning,
      })),

      resetTimer: () => set((state) => ({
        timeLeft: MODES[state.mode].duration,
        isRunning: false,
      })),

      skipToNext: () => {
        const { mode, cycleCount } = get();
        const { mode: nextMode, newCycleCount } = getNextMode(mode, cycleCount);
        
        set({
          mode: nextMode,
          timeLeft: MODES[nextMode].duration,
          isRunning: false,
          cycleCount: newCycleCount,
        });
      },

      completeSession: () => {
        const state = get();
        const { mode: nextMode, newCycleCount } = getNextMode(state.mode, state.cycleCount);
        
        // Update stats only for focus sessions
        const updatedStats = state.mode === 'focus'
          ? {
              ...state.todayStats,
              sessionsCompleted: state.todayStats.sessionsCompleted + 1,
              totalFocusMinutes: state.todayStats.totalFocusMinutes + FOCUS_MINUTES,
            }
          : state.todayStats;

        set({
          mode: nextMode,
          timeLeft: MODES[nextMode].duration,
          isRunning: false,
          cycleCount: newCycleCount,
          todayStats: updatedStats,
        });
      },

      initializeDay: () => {
        const today = getTodayString();
        const { todayStats, weeklyStats } = get();

        if (todayStats.date !== today) {
          // Archive previous day if it had activity
          const updatedWeeklyStats = todayStats.sessionsCompleted > 0
            ? [...weeklyStats.slice(-(CYCLE.MAX_WEEKLY_STATS - 1)), todayStats]
            : weeklyStats;

          set({
            todayStats: createEmptyDayStats(),
            weeklyStats: updatedWeeklyStats,
          });
        }
      },
    }),
    {
      name: 'focus-timer-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        todayStats: state.todayStats,
        weeklyStats: state.weeklyStats,
        cycleCount: state.cycleCount,
      }),
    }
  )
);
