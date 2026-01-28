import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Mode = 'focus' | 'shortBreak' | 'longBreak';

export const MODES = {
  focus: { time: 25 * 60, label: 'Focus', color: '#e94560' },
  shortBreak: { time: 5 * 60, label: 'Short Break', color: '#4ade80' },
  longBreak: { time: 15 * 60, label: 'Long Break', color: '#60a5fa' },
} as const;

interface DailyStats {
  date: string;
  sessionsCompleted: number;
  totalFocusMinutes: number;
}

interface TimerState {
  // Timer state
  mode: Mode;
  timeLeft: number;
  isRunning: boolean;
  cycleCount: number; // Focus sessions in current cycle (resets after long break)
  
  // Stats
  todayStats: DailyStats;
  weeklyStats: DailyStats[];
  
  // Actions
  setMode: (mode: Mode) => void;
  setTimeLeft: (time: number) => void;
  tick: () => void;
  toggleTimer: () => void;
  resetTimer: () => void;
  skipToNext: () => void;
  completeSession: () => void;
  initializeDay: () => void;
}

const getTodayString = () => new Date().toISOString().split('T')[0];

const getInitialDayStats = (): DailyStats => ({
  date: getTodayString(),
  sessionsCompleted: 0,
  totalFocusMinutes: 0,
});

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      // Initial state
      mode: 'focus',
      timeLeft: MODES.focus.time,
      isRunning: false,
      cycleCount: 0,
      todayStats: getInitialDayStats(),
      weeklyStats: [],

      setMode: (mode) => set({ mode, timeLeft: MODES[mode].time, isRunning: false }),
      
      setTimeLeft: (timeLeft) => set({ timeLeft }),
      
      tick: () => set((state) => ({ timeLeft: Math.max(0, state.timeLeft - 1) })),
      
      toggleTimer: () => set((state) => ({ isRunning: !state.isRunning })),
      
      resetTimer: () => set((state) => ({ 
        timeLeft: MODES[state.mode].time, 
        isRunning: false 
      })),
      
      skipToNext: () => {
        const state = get();
        if (state.mode === 'focus') {
          // Skip focus: don't count as completed, just move to break
          const newCycleCount = state.cycleCount + 1;
          if (newCycleCount >= 4) {
            set({ mode: 'longBreak', timeLeft: MODES.longBreak.time, isRunning: false, cycleCount: 0 });
          } else {
            set({ mode: 'shortBreak', timeLeft: MODES.shortBreak.time, isRunning: false, cycleCount: newCycleCount });
          }
        } else {
          // Skip break: go back to focus
          set({ mode: 'focus', timeLeft: MODES.focus.time, isRunning: false });
        }
      },
      
      completeSession: () => {
        const state = get();
        
        if (state.mode === 'focus') {
          const newCycleCount = state.cycleCount + 1;
          const newStats = {
            ...state.todayStats,
            sessionsCompleted: state.todayStats.sessionsCompleted + 1,
            totalFocusMinutes: state.todayStats.totalFocusMinutes + 25,
          };
          
          if (newCycleCount >= 4) {
            set({ 
              mode: 'longBreak', 
              timeLeft: MODES.longBreak.time, 
              isRunning: false,
              cycleCount: 0,
              todayStats: newStats,
            });
          } else {
            set({ 
              mode: 'shortBreak', 
              timeLeft: MODES.shortBreak.time, 
              isRunning: false,
              cycleCount: newCycleCount,
              todayStats: newStats,
            });
          }
        } else {
          // Break completed: back to focus
          set({ 
            mode: 'focus', 
            timeLeft: MODES.focus.time, 
            isRunning: false 
          });
        }
      },
      
      initializeDay: () => {
        const today = getTodayString();
        const state = get();
        
        if (state.todayStats.date !== today) {
          // Archive yesterday's stats if they exist
          const newWeeklyStats = state.todayStats.sessionsCompleted > 0 
            ? [...state.weeklyStats.slice(-6), state.todayStats]
            : state.weeklyStats;
            
          set({
            todayStats: getInitialDayStats(),
            weeklyStats: newWeeklyStats,
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
