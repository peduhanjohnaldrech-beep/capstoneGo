import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (e) {
  console.warn('Notifications setup failed:', e);
}

export const registerForPushNotifications = async () => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  return true;
};

export const scheduleDeadlineNotification = async (title, deadline, chapterName) => {
  const triggerDate = new Date(deadline);
  triggerDate.setDate(triggerDate.getDate() - 1); // 1 day before

  if (triggerDate <= new Date()) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📅 Deadline Tomorrow!',
      body: `${chapterName} for "${title}" is due tomorrow.`,
      sound: true,
    },
    trigger: { type: SchedulableTriggerInputTypes.DATE, date: triggerDate },
  });
};

export const sendInstantNotification = async (title, body) => {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null,
  });
};

export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};

export const scheduleDeadlineReminder = async (chapterId, chapterName, projectTitle, deadlineDate) => {
  try {
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of allScheduled) {
      if (notif.content?.data?.chapterId === chapterId) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }

    if (!deadlineDate) return;

    const triggerDate = new Date(deadlineDate);
    triggerDate.setDate(triggerDate.getDate() - 1);
    triggerDate.setHours(9, 0, 0, 0);

    if (triggerDate <= new Date()) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Deadline Tomorrow!',
        body: `${chapterName} for "${projectTitle}" is due tomorrow.`,
        sound: true,
        data: { chapterId },
      },
      trigger: { type: SchedulableTriggerInputTypes.DATE, date: triggerDate },
    });
  } catch (e) {
    console.log('scheduleDeadlineReminder error:', e);
  }
};
