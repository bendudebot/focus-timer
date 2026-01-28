import { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, AppState, AppStateStatus } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  interpolateColor,
  useDerivedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { useTimerStore, MODES, Mode } from '../store/timerStore';
import { 
  requestNotificationPermissions, 
  scheduleTimerEndNotification,
  sendImmediateNotification,
  cancelTimerNotification 
} from '../utils/notifications';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.75;
const STROKE_WIDTH = 14;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  
  const progress = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  // Initialize day and request permissions on mount
  useEffect(() => {
    initializeDay();
    requestNotificationPermissions();
  }, []);

  // Handle app state changes for background timer
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isRunning, timeLeft, mode]);

  const handleAppStateChange = useCallback(async (nextAppState: AppStateStatus) => {
    if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
      // App going to background
      if (isRunning) {
        backgroundTime.current = Date.now();
        await scheduleTimerEndNotification(mode, timeLeft);
      }
    } else if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App coming to foreground
      await cancelTimerNotification();
      
      if (backgroundTime.current && isRunning) {
        const elapsedSeconds = Math.floor((Date.now() - backgroundTime.current) / 1000);
        const newTimeLeft = Math.max(0, timeLeft - elapsedSeconds);
        
        if (newTimeLeft <= 0) {
          // Timer completed in background
          completeSession();
        }
        backgroundTime.current = null;
      }
    }
    appState.current = nextAppState;
  }, [isRunning, timeLeft, mode]);

  // Update progress animation
  useEffect(() => {
    const totalTime = MODES[mode].time;
    progress.value = withTiming((totalTime - timeLeft) / totalTime, {
      duration: 300,
      easing: Easing.out(Easing.quad),
    });
  }, [timeLeft, mode]);

  // Pulse animation when running
  useEffect(() => {
    if (isRunning) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 1000 }),
          withTiming(1, { duration: 1000 })
        ),
        -1,
        true
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 1500 }),
          withTiming(0.2, { duration: 1500 })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1);
      glowOpacity.value = withTiming(0.3);
    }
  }, [isRunning]);

  // Timer interval
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        tick();
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      handleTimerComplete();
    }
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft]);

  const handleTimerComplete = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await sendImmediateNotification(mode);
    completeSession();
  };

  const handleToggleTimer = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    buttonScale.value = withSpring(0.9, { damping: 10 }, () => {
      buttonScale.value = withSpring(1);
    });
    
    if (!isRunning) {
      // Starting timer - schedule notification
      await scheduleTimerEndNotification(mode, timeLeft);
    } else {
      // Pausing timer - cancel notification
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await cancelTimerNotification();
    skipToNext();
  };

  const handleSwitchMode = async (newMode: Mode) => {
    if (newMode === mode) return;
    Haptics.selectionAsync();
    await cancelTimerNotification();
    setMode(newMode);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressStyle = useAnimatedStyle(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: glowOpacity.value,
  }));

  const currentMode = MODES[mode];
  const cycleIndicators = Array.from({ length: 4 }, (_, i) => i < cycleCount);

  return (
    <LinearGradient
      colors={['#0f0c29', '#302b63', '#24243e']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Mode Selector */}
        <View style={styles.modeSelector}>
          {Object.entries(MODES).map(([key, value]) => (
            <Pressable
              key={key}
              style={[
                styles.modeButton, 
                mode === key && { 
                  backgroundColor: value.color + '30',
                  borderColor: value.color,
                  borderWidth: 1,
                }
              ]}
              onPress={() => handleSwitchMode(key as Mode)}
            >
              <Text style={[
                styles.modeText, 
                mode === key && { color: value.color, fontWeight: '700' }
              ]}>
                {value.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Cycle Indicators */}
        <View style={styles.cycleContainer}>
          {cycleIndicators.map((completed, i) => (
            <View 
              key={i}
              style={[
                styles.cycleIndicator,
                completed && { backgroundColor: currentMode.color }
              ]}
            />
          ))}
        </View>

        {/* Timer Circle */}
        <View style={styles.timerContainer}>
          {/* Glow effect */}
          <Animated.View style={[styles.glowRing, { borderColor: currentMode.color }, pulseStyle]} />
          
          <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
            <Defs>
              <SvgGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={currentMode.color} stopOpacity="1" />
                <Stop offset="100%" stopColor={currentMode.color} stopOpacity="0.6" />
              </SvgGradient>
            </Defs>
            
            {/* Background circle */}
            <Circle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={RADIUS}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={STROKE_WIDTH}
              fill="transparent"
            />
            
            {/* Progress circle */}
            <AnimatedCircle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={RADIUS}
              stroke="url(#progressGradient)"
              strokeWidth={STROKE_WIDTH}
              fill="transparent"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              style={progressStyle}
              transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
            />
          </Svg>
          
          {/* Time Display */}
          <View style={styles.timeDisplay}>
            <Text style={styles.timeText}>{formatTime(timeLeft)}</Text>
            <Text style={[styles.modeLabel, { color: currentMode.color }]}>
              {currentMode.label}
            </Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable 
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed
            ]} 
            onPress={handleReset}
          >
            <Text style={styles.secondaryButtonText}>↺</Text>
          </Pressable>
          
          <Pressable onPress={handleToggleTimer}>
            <Animated.View 
              style={[
                styles.mainButton, 
                { backgroundColor: currentMode.color },
                buttonStyle
              ]}
            >
              <Text style={styles.mainButtonText}>
                {isRunning ? '⏸' : '▶'}
              </Text>
            </Animated.View>
          </Pressable>
          
          <Pressable 
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed
            ]} 
            onPress={handleSkip}
          >
            <Text style={styles.secondaryButtonText}>⏭</Text>
          </Pressable>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: currentMode.color }]}>
              {todayStats.sessionsCompleted}
            </Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: currentMode.color }]}>
              {todayStats.totalFocusMinutes}
            </Text>
            <Text style={styles.statLabel}>Minutes</Text>
          </View>
        </View>

        {/* Motivational Text */}
        <Text style={styles.motivationalText}>
          {mode === 'focus' 
            ? '🎯 Stay focused, you got this!' 
            : '☕ Take a moment to recharge'}
        </Text>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignItems: 'center', paddingTop: 10 },
  
  modeSelector: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  modeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  modeText: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
    fontSize: 13,
  },
  
  cycleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
  },
  cycleIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  
  timerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  glowRing: {
    position: 'absolute',
    width: CIRCLE_SIZE + 20,
    height: CIRCLE_SIZE + 20,
    borderRadius: (CIRCLE_SIZE + 20) / 2,
    borderWidth: 2,
  },
  timeDisplay: {
    position: 'absolute',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 68,
    fontWeight: '200',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
  
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 30,
    marginBottom: 30,
  },
  mainButton: {
    width: 85,
    height: 85,
    borderRadius: 42.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  mainButtonText: {
    fontSize: 36,
    color: '#ffffff',
  },
  secondaryButton: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  secondaryButtonText: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.9)',
  },
  buttonPressed: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 40,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 30,
  },
  
  motivationalText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    marginBottom: 30,
  },
});
