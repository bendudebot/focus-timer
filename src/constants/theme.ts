/**
 * Focus Timer - Design System
 * Apple Glassmorphism aesthetic
 */

// Color palette - frosted glass, translucent
export const colors = {
  // Backgrounds
  background: {
    primary: '#0D0D0F',      // Deep dark
    secondary: '#151517',    // Slightly elevated
    gradient: ['#0D0D0F', '#1A1A1E', '#0D0D0F'] as const,
  },

  // Glass surfaces
  glass: {
    background: 'rgba(255, 255, 255, 0.08)',
    backgroundHover: 'rgba(255, 255, 255, 0.12)',
    backgroundActive: 'rgba(255, 255, 255, 0.15)',
    border: 'rgba(255, 255, 255, 0.12)',
    borderLight: 'rgba(255, 255, 255, 0.18)',
  },

  // Mode accent colors - subtle, sophisticated
  accent: {
    focus: '#FF7A7A',       // Soft coral
    shortBreak: '#7AE8A5',  // Mint green
    longBreak: '#7AC4FF',   // Sky blue
  },

  // Text
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.75)',
    tertiary: 'rgba(255, 255, 255, 0.5)',
    muted: 'rgba(255, 255, 255, 0.25)',
  },
} as const;

// Typography - clean, readable
export const typography = {
  timer: {
    fontSize: 76,
    fontWeight: '200' as const,
    letterSpacing: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 2,
  },
  stat: {
    fontSize: 32,
    fontWeight: '300' as const,
  },
  caption: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 1,
  },
  button: {
    fontSize: 14,
    fontWeight: '500' as const,
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

// Border radius - generous, Apple-style
export const radius = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  full: 999,
} as const;

// Blur intensities
export const blur = {
  light: 20,
  medium: 40,
  heavy: 60,
} as const;

// Animation timings
export const animation = {
  fast: 150,
  normal: 300,
  slow: 500,
  pulse: 2500,
} as const;

// Shadows - very soft
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  }),
} as const;
