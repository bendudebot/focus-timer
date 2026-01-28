/**
 * Timer configuration constants
 */
import { colors } from './theme';

// Timer durations (in seconds)
export const TIMER_DURATIONS = {
  FOCUS: 25 * 60,        // 25 minutes
  SHORT_BREAK: 5 * 60,   // 5 minutes
  LONG_BREAK: 15 * 60,   // 15 minutes
} as const;

// Pomodoro cycle config
export const CYCLE = {
  SESSIONS_BEFORE_LONG_BREAK: 4,
  MAX_WEEKLY_STATS: 7,
} as const;

// Mode definitions
export const MODES = {
  focus: {
    duration: TIMER_DURATIONS.FOCUS,
    label: 'Focus',
    color: colors.accent.focus,
  },
  shortBreak: {
    duration: TIMER_DURATIONS.SHORT_BREAK,
    label: 'Break',
    color: colors.accent.shortBreak,
  },
  longBreak: {
    duration: TIMER_DURATIONS.LONG_BREAK,
    label: 'Long Break',
    color: colors.accent.longBreak,
  },
} as const;

export type Mode = keyof typeof MODES;

// Helper to get focus minutes from duration
export const FOCUS_MINUTES = TIMER_DURATIONS.FOCUS / 60;
