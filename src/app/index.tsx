import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.75;
const STROKE_WIDTH = 12;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type Mode = 'focus' | 'shortBreak' | 'longBreak';

const MODES = {
  focus: { time: 25 * 60, label: 'Focus', color: '#e94560' },
  shortBreak: { time: 5 * 60, label: 'Short Break', color: '#4ade80' },
  longBreak: { time: 15 * 60, label: 'Long Break', color: '#60a5fa' },
};

export default function TimerScreen() {
  const [mode, setMode] = useState<Mode>('focus');
  const [timeLeft, setTimeLeft] = useState(MODES.focus.time);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const progress = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    const totalTime = MODES[mode].time;
    progress.value = withTiming((totalTime - timeLeft) / totalTime, {
      duration: 500,
      easing: Easing.out(Easing.quad),
    });
  }, [timeLeft, mode]);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft]);

  const handleTimerComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsRunning(false);
    
    if (mode === 'focus') {
      const newSessions = sessions + 1;
      setSessions(newSessions);
      // Every 4 focus sessions, take a long break
      if (newSessions % 4 === 0) {
        setMode('longBreak');
        setTimeLeft(MODES.longBreak.time);
      } else {
        setMode('shortBreak');
        setTimeLeft(MODES.shortBreak.time);
      }
    } else {
      setMode('focus');
      setTimeLeft(MODES.focus.time);
    }
  };

  const toggleTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    buttonScale.value = withSpring(0.95, {}, () => {
      buttonScale.value = withSpring(1);
    });
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsRunning(false);
    setTimeLeft(MODES[mode].time);
  };

  const switchMode = (newMode: Mode) => {
    Haptics.selectionAsync();
    setMode(newMode);
    setTimeLeft(MODES[newMode].time);
    setIsRunning(false);
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

  const currentMode = MODES[mode];

  return (
    <LinearGradient
      colors={['#1a1a2e', '#16213e', '#0f3460']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Mode Selector */}
        <View style={styles.modeSelector}>
          {Object.entries(MODES).map(([key, value]) => (
            <Pressable
              key={key}
              style={[styles.modeButton, mode === key && { backgroundColor: value.color + '40' }]}
              onPress={() => switchMode(key as Mode)}
            >
              <Text style={[styles.modeText, mode === key && { color: value.color }]}>
                {value.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Timer Circle */}
        <View style={styles.timerContainer}>
          <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
            {/* Background circle */}
            <Circle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={RADIUS}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={STROKE_WIDTH}
              fill="transparent"
            />
            {/* Progress circle */}
            <AnimatedCircle
              cx={CIRCLE_SIZE / 2}
              cy={CIRCLE_SIZE / 2}
              r={RADIUS}
              stroke={currentMode.color}
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
          <Pressable style={styles.secondaryButton} onPress={resetTimer}>
            <Text style={styles.secondaryButtonText}>↺</Text>
          </Pressable>
          
          <Pressable onPress={toggleTimer}>
            <Animated.View 
              style={[styles.mainButton, { backgroundColor: currentMode.color }, buttonStyle]}
            >
              <Text style={styles.mainButtonText}>
                {isRunning ? '⏸' : '▶'}
              </Text>
            </Animated.View>
          </Pressable>
          
          <Pressable style={styles.secondaryButton} onPress={() => {}}>
            <Text style={styles.secondaryButtonText}>⏭</Text>
          </Pressable>
        </View>

        {/* Session Counter */}
        <View style={styles.sessions}>
          <Text style={styles.sessionsText}>
            🍅 {sessions} sessions completed today
          </Text>
        </View>

        {/* Ad Banner Placeholder */}
        <View style={styles.adBanner}>
          <Text style={styles.adText}>📢 Ad Banner (AdMob)</Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignItems: 'center' },
  modeSelector: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 8,
  },
  modeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  modeText: {
    color: '#a0a0a0',
    fontWeight: '600',
    fontSize: 14,
  },
  timerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeDisplay: {
    position: 'absolute',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 72,
    fontWeight: '200',
    color: '#ffffff',
    fontVariant: ['tabular-nums'],
  },
  modeLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 8,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    marginBottom: 40,
  },
  mainButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainButtonText: {
    fontSize: 32,
    color: '#ffffff',
  },
  secondaryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 24,
    color: '#ffffff',
  },
  sessions: {
    marginBottom: 20,
  },
  sessionsText: {
    color: '#a0a0a0',
    fontSize: 14,
  },
  adBanner: {
    backgroundColor: '#333',
    padding: 16,
    width: '100%',
    alignItems: 'center',
  },
  adText: {
    color: '#fff',
    fontSize: 12,
  },
});
