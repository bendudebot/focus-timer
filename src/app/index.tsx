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
import { colors, spacing, radius, animation, typography } from '../constants/theme';
import { CYCLE } from '../constants/timer';
import {
  requestNotificationPermissions,
  scheduleTimerEndNotification,
  sendImmediateNotification,
  cancelTimerNotification,
} from '../utils/notifications';

// Layout constants
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CIRCLE_SIZE = SCREEN_WIDTH * 0.72;
const STROKE_WIDTH = 8;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Control button sizes
const MAIN_BUTTON_SIZE = 72;
const SECONDARY_BUTTON_SIZE = 48;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  const ringOpacity = useSharedValue(0.15);

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
        // Going to background while running
        backgroundTime.current = Date.now();
        await scheduleTimerEndNotification(mode, timeLeft);
      } else if (!wasActive && isNowActive) {
        // Coming back to foreground
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

  // Subtle pulse when running
  useEffect(() => {
    if (isRunning) {
      ringOpacity.value = withRepeat(
        withSequence(
          withTiming(0.25, { duration: animation.pulse }),
          withTiming(0.1, { duration: animation.pulse })
        ),
        -1,
        true
      );
    } else {
      ringOpacity.value = withTiming(0.15, { duration: animation.normal });
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

    buttonScale.value = withSpring(0.92, { damping: 15 }, () => {
      buttonScale.value = withSpring(1, { damping: 15 });
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

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Mode Selector */}
        <View style={styles.modeSelector}>
          {(Object.entries(MODES) as [Mode, typeof MODES[Mode]][]).map(([key, config]) => {
            const isActive = mode === key;
            return (
              <Pressable
                key={key}
                style={[
                  styles.modeButton,
                  isActive && [styles.modeButtonActive, { borderColor: config.color }],
                ]}
                onPress={() => handleModeChange(key)}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    isActive && { color: config.color },
                  ]}
                >
                  {config.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

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
          {/* Ambient ring */}
          <Animated.View
            style={[
              styles.ambientRing,
              { borderColor: accentColor },
              ringStyle,
            ]}
          />

          <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
            {/* Track */}
            <Circle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={RADIUS}
              stroke={colors.ui.border}
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
            <Text style={styles.iconText}>↻</Text>
          </Pressable>

          <Pressable onPress={handleToggle}>
            <Animated.View
              style={[
                styles.mainButton,
                { backgroundColor: accentColor },
                buttonAnimatedStyle,
              ]}
            >
              <Text style={styles.mainButtonText}>
                {isRunning ? '❚❚' : '▶'}
              </Text>
            </Animated.View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleSkip}
          >
            <Text style={styles.iconText}>⏭</Text>
          </Pressable>
        </View>

        {/* Stats */}
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
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    paddingTop: spacing.md,
  },

  // Mode selector
  modeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  modeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.full,
    backgroundColor: colors.ui.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modeButtonActive: {
    backgroundColor: 'transparent',
  },
  modeButtonText: {
    color: colors.text.tertiary,
    fontSize: typography.label.fontSize,
    fontWeight: typography.label.fontWeight,
  },

  // Cycle dots
  cycleContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
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
  ambientRing: {
    position: 'absolute',
    width: CIRCLE_SIZE + 32,
    height: CIRCLE_SIZE + 32,
    borderRadius: (CIRCLE_SIZE + 32) / 2,
    borderWidth: 1,
  },
  timeDisplay: {
    position: 'absolute',
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
    gap: spacing.xl,
    marginBottom: spacing.xl,
  },
  mainButton: {
    width: MAIN_BUTTON_SIZE,
    height: MAIN_BUTTON_SIZE,
    borderRadius: MAIN_BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainButtonText: {
    fontSize: 24,
    color: colors.text.primary,
  },
  secondaryButton: {
    width: SECONDARY_BUTTON_SIZE,
    height: SECONDARY_BUTTON_SIZE,
    borderRadius: SECONDARY_BUTTON_SIZE / 2,
    backgroundColor: colors.ui.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.ui.border,
  },
  buttonPressed: {
    backgroundColor: colors.ui.surfaceHover,
  },
  iconText: {
    fontSize: 18,
    color: colors.text.secondary,
  },

  // Stats
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.ui.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl + spacing.sm,
    marginBottom: spacing.xl,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.stat.fontSize,
    fontWeight: typography.stat.fontWeight,
  },
  statLabel: {
    fontSize: typography.caption.fontSize,
    fontWeight: typography.caption.fontWeight,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: typography.caption.letterSpacing,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.ui.border,
    marginHorizontal: spacing.xl,
  },
});
