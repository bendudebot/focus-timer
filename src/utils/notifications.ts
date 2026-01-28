import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Mode } from '../constants/timer';
import { colors } from '../constants/theme';

// Notification channel ID
const CHANNEL_ID = 'timer';

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Notification content by mode
const getNotificationContent = (mode: Mode): { title: string; body: string } => {
  if (mode === 'focus') {
    return {
      title: 'Focus Session Complete',
      body: 'Great work! Time to take a break.',
    };
  }
  return {
    title: 'Break Over',
    body: 'Ready to get back to work?',
  };
};

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  
  if (existingStatus === 'granted') {
    await setupAndroidChannel();
    return true;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  
  if (status !== 'granted') {
    console.log('Notification permissions not granted');
    return false;
  }

  await setupAndroidChannel();
  return true;
}

async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Timer',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: colors.accent.focus,
      sound: 'default',
    });
  }
}

export async function scheduleTimerEndNotification(
  mode: Mode,
  secondsLeft: number
): Promise<string | null> {
  await cancelTimerNotification();

  const { title, body } = getNotificationContent(mode);

  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        seconds: secondsLeft,
        channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
      } as Notifications.TimeIntervalTriggerInput,
    });
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    return null;
  }
}

export async function sendImmediateNotification(mode: Mode): Promise<void> {
  const { title, body } = getNotificationContent(mode);

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null,
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

export async function cancelTimerNotification(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
