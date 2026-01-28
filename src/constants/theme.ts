/**
 * Focus Timer - Design System
 * Inspired by Apple's minimalist aesthetic
 */

// Color palette - muted, sophisticated
export const colors = {
  // Backgrounds
  background: {
    primary: '#0A0A0B',    // Near black
    secondary: '#141416',   // Dark gray
    tertiary: '#1C1C1E',    // Elevated surface
  },
  
  // Mode accent colors - desaturated, elegant
  accent: {
    focus: '#FF6B6B',       // Warm coral (not harsh red)
    shortBreak: '#4ADE80',  // Soft green
    longBreak: '#7DD3FC',   // Calm sky blue
  },
  
  // Text
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.7)',
    tertiary: 'rgba(255, 255, 255, 0.4)',
    muted: 'rgba(255, 255, 255, 0.2)',
  },
  
  // UI elements
  ui: {
    border: 'rgba(255, 255, 255, 0.08)',
    borderActive: 'rgba(255, 255, 255, 0.15)',
    surface: 'rgba(255, 255, 255, 0.05)',
    surfaceHover: 'rgba(255, 255, 255, 0.08)',
  },
} as const;

// Typography - clean, readable
export const typography = {
  timer: {
    fontSize: 72,
    fontWeight: '200' as const,
    letterSpacing: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 2,
  },
  stat: {
    fontSize: 28,
    fontWeight: '600' as const,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
  },
} as const;

// Spacing scale (4px base)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// Border radius
export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  full: 999,
} as const;

// Animation timings
export const animation = {
  fast: 150,
  normal: 300,
  slow: 500,
  pulse: 2000,
} as const;
