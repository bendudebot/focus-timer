import { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useTimerStore, MODES, Mode } from '../store/timerStore';
import { colors, spacing, radius, animation, typography, shadows, blur } from '../constants/theme';
import { CYCLE } from '../constants/timer';
import {
  requestNotificationPermissions,
  scheduleTimerEndNotification,
  sendImmediateNotification,
  cancelTimerNotification,
} from '../utils/notifications';

// Layout constants
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CIRCLE_SIZE = SCREEN_WIDTH * 0.68;
const STROKE_WIDTH = 6;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Control button sizes
const MAIN_BUTTON_SIZE = 72;
const SECONDARY_BUTTON_SIZE = 52;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Format seconds to MM:SS
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function TimerScreen() {
  const {
    mode,
    timeLeft,
    isRunning,
    todayStats,
    cycleCount,
    setMode,
    tick,
    toggleTimer,
    resetTimer,
    skipToNext,
    completeSession,
    initializeDay,
  } = useTimerStore();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);
  const backgroundTime = useRef<number | null>(null);

  // Animation values
  const progress = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const glowIntensity = useSharedValue(0.2);

  const currentMode = MODES[mode];
  const accentColor = currentMode.color;

  // Initialize on mount
  useEffect(() => {
    initializeDay();
    requestNotificationPermissions();
  }, []);

  // Handle background/foreground transitions
  const handleAppStateChange = useCallback(
    async (nextAppState: AppStateStatus) => {
      const wasActive = appState.current === 'active';
      const isNowActive = nextAppState === 'active';

      if (wasActive && !isNowActive && isRunning) {
        backgroundTime.current = Date.now();
        await scheduleTimerEndNotification(mode, timeLeft);
      } else if (!wasActive && isNowActive) {
        await cancelTimerNotification();

        if (backgroundTime.current && isRunning) {
          const elapsed = Math.floor((Date.now() - backgroundTime.current) / 1000);
          const remaining = timeLeft - elapsed;

          if (remaining <= 0) {
            completeSession();
          }
          backgroundTime.current = null;
        }
      }

      appState.current = nextAppState;
    },
    [isRunning, timeLeft, mode, completeSession]
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [handleAppStateChange]);

  // Progress animation
  useEffect(() => {
    const totalTime = currentMode.duration;
    const progressValue = (totalTime - timeLeft) / totalTime;

    progress.value = withTiming(progressValue, {
      duration: animation.normal,
      easing: Easing.out(Easing.quad),
    });
  }, [timeLeft, currentMode.duration]);

  // Subtle glow pulse when running
  useEffect(() => {
    if (isRunning) {
      glowIntensity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: animation.pulse }),
          withTiming(0.15, { duration: animation.pulse })
        ),
        -1,
        true
      );
    } else {
      glowIntensity.value = withTiming(0.2, { duration: animation.normal });
    }
  }, [isRunning]);

  // Timer tick
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(tick, 1000);
    } else if (timeLeft === 0 && isRunning) {
      handleTimerComplete();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, timeLeft]);

  const handleTimerComplete = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await sendImmediateNotification(mode);
    completeSession();
  };

  const handleToggle = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    buttonScale.value = withSpring(0.9, { damping: 12 }, () => {
      buttonScale.value = withSpring(1, { damping: 12 });
    });

    if (!isRunning) {
      await scheduleTimerEndNotification(mode, timeLeft);
    } else {
      await cancelTimerNotification();
    }

    toggleTimer();
  };

  const handleReset = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await cancelTimerNotification();
    resetTimer();
  };

  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await cancelTimerNotification();
    skipToNext();
  };

  const handleModeChange = async (newMode: Mode) => {
    if (newMode === mode) return;
    Haptics.selectionAsync();
    await cancelTimerNotification();
    setMode(newMode);
  };

  // Animated styles
  const progressStyle = useAnimatedStyle(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowIntensity.value,
  }));

  return (
    <LinearGradient
      colors={colors.background.gradient}
      style={styles.container}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Mode Selector - Glass Card */}
        <BlurView intensity={blur.medium} tint="dark" style={styles.modeSelectorBlur}>
          <View style={styles.modeSelector}>
            {(Object.entries(MODES) as [Mode, typeof MODES[Mode]][]).map(([key, config]) => {
              const isActive = mode === key;
              return (
                <Pressable
                  key={key}
                  style={[
                    styles.modeButton,
                    isActive && styles.modeButtonActive,
                  ]}
                  onPress={() => handleModeChange(key)}
                >
                  {isActive && (
                    <View style={[styles.modeIndicator, { backgroundColor: config.color }]} />
                  )}
                  <Text
                    style={[
                      styles.modeButtonText,
                      isActive && { color: colors.text.primary },
                    ]}
                  >
                    {config.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </BlurView>

        {/* Cycle Progress Dots */}
        <View style={styles.cycleContainer}>
          {Array.from({ length: CYCLE.SESSIONS_BEFORE_LONG_BREAK }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.cycleDot,
                i < cycleCount && { backgroundColor: accentColor },
              ]}
            />
          ))}
        </View>

        {/* Timer Display */}
        <View style={styles.timerContainer}>
          {/* Ambient glow */}
          <Animated.View
            style={[
              styles.ambientGlow,
              { backgroundColor: accentColor },
              glowStyle,
            ]}
          />

          {/* Glass circle background */}
          <BlurView intensity={blur.light} tint="dark" style={styles.timerGlassCircle}>
            <View style={styles.timerGlassInner} />
          </BlurView>

          <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={styles.progressSvg}>
            {/* Track */}
            <Circle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={RADIUS}
              stroke={colors.glass.border}
              strokeWidth={STROKE_WIDTH}
              fill="transparent"
            />

            {/* Progress */}
            <AnimatedCircle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={RADIUS}
              stroke={accentColor}
              strokeWidth={STROKE_WIDTH}
              fill="transparent"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              style={progressStyle}
              transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
            />
          </Svg>

          {/* Time + Label */}
          <View style={styles.timeDisplay}>
            <Text style={styles.timeText}>{formatTime(timeLeft)}</Text>
            <Text style={[styles.modeLabel, { color: accentColor }]}>
              {currentMode.label}
            </Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleReset}
          >
            <BlurView intensity={blur.medium} tint="dark" style={styles.buttonBlur}>
              <Text style={styles.iconText}>↻</Text>
            </BlurView>
          </Pressable>

          <Pressable onPress={handleToggle}>
            <Animated.View style={buttonAnimatedStyle}>
              <View style={[styles.mainButton, shadows.glow(accentColor)]}>
                <BlurView intensity={blur.heavy} tint="dark" style={styles.mainButtonBlur}>
                  <View style={[styles.mainButtonOverlay, { backgroundColor: accentColor }]} />
                  <Text style={styles.mainButtonText}>
                    {isRunning ? '❚❚' : '▶'}
                  </Text>
                </BlurView>
              </View>
            </Animated.View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleSkip}
          >
            <BlurView intensity={blur.medium} tint="dark" style={styles.buttonBlur}>
              <Text style={styles.iconText}>⏭</Text>
            </BlurView>
          </Pressable>
        </View>

        {/* Stats - Glass Card */}
        <BlurView intensity={blur.medium} tint="dark" style={styles.statsCardBlur}>
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: accentColor }]}>
                {todayStats.sessionsCompleted}
              </Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: accentColor }]}>
                {todayStats.totalFocusMinutes}
              </Text>
              <Text style={styles.statLabel}>Minutes</Text>
            </View>
          </View>
        </BlurView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.md,
  },

  // Mode selector
  modeSelectorBlur: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  modeSelector: {
    flexDirection: 'row',
    padding: spacing.xs,
    gap: spacing.xs,
  },
  modeButton: {
    paddingHorizontal: spacing.md + 4,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  modeButtonActive: {
    backgroundColor: colors.glass.backgroundActive,
  },
  modeIndicator: {
    position: 'absolute',
    top: 0,
    left: '25%',
    right: '25%',
    height: 2,
    borderRadius: 1,
  },
  modeButtonText: {
    color: colors.text.tertiary,
    fontSize: typography.button.fontSize,
    fontWeight: typography.button.fontWeight,
  },

  // Cycle dots
  cycleContainer: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
    marginTop: spacing.xl,
  },
  cycleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text.muted,
  },

  // Timer
  timerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ambientGlow: {
    position: 'absolute',
    width: CIRCLE_SIZE * 1.3,
    height: CIRCLE_SIZE * 1.3,
    borderRadius: CIRCLE_SIZE * 0.65,
    transform: [{ scale: 1.1 }],
  },
  timerGlassCircle: {
    position: 'absolute',
    width: CIRCLE_SIZE - 20,
    height: CIRCLE_SIZE - 20,
    borderRadius: (CIRCLE_SIZE - 20) / 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  timerGlassInner: {
    flex: 1,
    backgroundColor: colors.glass.background,
  },
  progressSvg: {
    position: 'absolute',
  },
  timeDisplay: {
    alignItems: 'center',
  },
  timeText: {
    fontSize: typography.timer.fontSize,
    fontWeight: typography.timer.fontWeight,
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
    letterSpacing: typography.timer.letterSpacing,
  },
  modeLabel: {
    fontSize: typography.label.fontSize,
    fontWeight: typography.label.fontWeight,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: typography.label.letterSpacing,
  },

  // Controls
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl + spacing.sm,
    marginBottom: spacing.xl,
  },
  mainButton: {
    width: MAIN_BUTTON_SIZE,
    height: MAIN_BUTTON_SIZE,
    borderRadius: MAIN_BUTTON_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glass.borderLight,
  },
  mainButtonBlur: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.25,
  },
  mainButtonText: {
    fontSize: 22,
    color: colors.text.primary,
    fontWeight: '600',
  },
  secondaryButton: {
    width: SECONDARY_BUTTON_SIZE,
    height: SECONDARY_BUTTON_SIZE,
    borderRadius: SECONDARY_BUTTON_SIZE / 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  buttonBlur: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glass.background,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  iconText: {
    fontSize: 20,
    color: colors.text.secondary,
  },

  // Stats
  statsCardBlur: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginBottom: spacing.xl + spacing.md,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl + spacing.md,
    backgroundColor: colors.glass.background,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 80,
  },
  statValue: {
    fontSize: typography.stat.fontSize,
    fontWeight: typography.stat.fontWeight,
  },
  statLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
    color: colors.text.tertiary,
    marginTop: spacing.xs + 2,
    textTransform: 'uppercase',
    letterSpacing: typography.caption.letterSpacing,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.glass.border,
    marginHorizontal: spacing.xl,
  },
});
