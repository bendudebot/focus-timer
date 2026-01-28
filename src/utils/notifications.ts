import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Mode, MODES } from '../store/timerStore';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('Notification permissions not granted');
    return false;
  }
  
  // Android specific channel setup
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('timer', {
      name: 'Timer Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#e94560',
      sound: 'default',
    });
  }
  
  return true;
}

export async function scheduleTimerEndNotification(mode: Mode, secondsLeft: number): Promise<string | null> {
  // Cancel any existing timer notification
  await cancelTimerNotification();
  
  const modeConfig = MODES[mode];
  const isBreak = mode !== 'focus';
  
  const title = isBreak ? '⏰ Break Over!' : '🍅 Focus Session Complete!';
  const body = isBreak 
    ? 'Time to get back to work!' 
    : `Great job! Take a ${mode === 'longBreak' ? 'long' : 'short'} break.`;
  
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        seconds: secondsLeft,
        channelId: Platform.OS === 'android' ? 'timer' : undefined,
      } as Notifications.TimeIntervalTriggerInput,
    });
    
    return id;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return null;
  }
}

export async function sendImmediateNotification(mode: Mode): Promise<void> {
  const isBreak = mode !== 'focus';
  const nextMode = isBreak ? 'Focus' : (mode === 'focus' ? 'Break' : 'Break');
  
  const title = isBreak ? '⏰ Break Over!' : '🍅 Focus Session Complete!';
  const body = isBreak 
    ? 'Time to get back to work!' 
    : 'Great job! Time for a break.';
  
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Immediate notification
    });
  } catch (error) {
    console.error('Error sending immediate notification:', error);
  }
}

export async function cancelTimerNotification(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
