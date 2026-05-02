import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import {Platform} from "react-native";

const CHANNEL_ID = "daily-engagement";
const SCHEDULE_STATE_KEY = "homedecor:tiered-notification-schedule:v1";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const DAILY_DIAMOND_BODY = "✨ Your Daily Diamond is ready! Come back and claim your 4K design credit.";

const ARCHITECTURE_TIPS = [
  "Pro Tip: Use 'Japandi' style for small rooms to create a sense of space.",
  "Pro Tip: Keep one dominant material per room, then repeat it twice for a calmer composition.",
  "Pro Tip: Use warm indirect lighting near textured walls to make compact spaces feel deeper.",
  "Pro Tip: Place the tallest visual element opposite the room entry to pull the eye through the space.",
  "Pro Tip: Pair matte finishes with one reflective accent to add depth without visual noise.",
  "Pro Tip: Leave negative space around statement furniture so the layout feels intentional.",
  "Pro Tip: Use low-profile storage in narrow rooms to keep sightlines open and spacious.",
  "Pro Tip: Match curtain color to the wall when you want a room to feel taller and softer.",
];

type SubscriptionType = "free" | "weekly" | "yearly";

type TieredNotificationArgs = {
  isReady: boolean;
  hasProAccess: boolean;
  hasPaidAccess?: boolean;
  subscriptionType?: SubscriptionType;
  nextDiamondClaimAt?: number | null;
};

type ScheduledItem = {
  id: string;
  targetAt: number;
};

type ScheduledNotificationState = {
  free?: ScheduledItem;
  pro?: ScheduledItem & {
    weekday: number;
    hour: number;
    minute: number;
  };
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function isPermissionGranted(status: Notifications.NotificationPermissionsStatus) {
  return (
    status.granted ||
    status.status === "granted" ||
    status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    status.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL
  );
}

async function ensureNotificationSetup() {
  if (Platform.OS === "web") {
    return false;
  }

  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: "Daily engagement",
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: "default",
        vibrationPattern: [0, 180, 120, 180],
        lightColor: "#4F7BFF",
      });
    }

    const current = await Notifications.getPermissionsAsync();
    if (isPermissionGranted(current)) {
      return true;
    }

    if (!current.canAskAgain) {
      return false;
    }

    const requested = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
        allowProvisional: true,
      },
    });

    return isPermissionGranted(requested);
  } catch (error) {
    console.warn("[Notifications] Unable to configure notifications", error);
    return false;
  }
}

async function readScheduleState(): Promise<ScheduledNotificationState> {
  try {
    const raw = await AsyncStorage.getItem(SCHEDULE_STATE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as ScheduledNotificationState;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.warn("[Notifications] Unable to read notification schedule", error);
    return {};
  }
}

async function writeScheduleState(state: ScheduledNotificationState) {
  try {
    await AsyncStorage.setItem(SCHEDULE_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("[Notifications] Unable to persist notification schedule", error);
  }
}

async function cancelScheduledItem(item?: ScheduledItem) {
  if (!item?.id) {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(item.id);
  } catch (error) {
    console.warn("[Notifications] Unable to cancel notification", error);
  }
}

async function hasScheduledItem(item?: ScheduledItem) {
  if (!item?.id) {
    return false;
  }

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.some((request) => request.identifier === item.id);
  } catch (error) {
    console.warn("[Notifications] Unable to inspect scheduled notifications", error);
    return true;
  }
}

function pickArchitectureTip() {
  return ARCHITECTURE_TIPS[Math.floor(Math.random() * ARCHITECTURE_TIPS.length)] ?? ARCHITECTURE_TIPS[0];
}

function getRandomWeeklySlot() {
  const weekday = Math.floor(Math.random() * 7) + 1;
  const hour = Math.floor(Math.random() * 10) + 9;
  const minute = [0, 15, 30, 45][Math.floor(Math.random() * 4)] ?? 0;

  return {weekday, hour, minute};
}

function getNextWeeklyTargetAt({weekday, hour, minute}: {weekday: number; hour: number; minute: number}) {
  const now = new Date();
  const target = new Date(now);
  const currentExpoWeekday = now.getDay() + 1;
  const dayOffset = (weekday - currentExpoWeekday + 7) % 7;

  target.setDate(now.getDate() + dayOffset);
  target.setHours(hour, minute, 0, 0);

  if (target.getTime() <= now.getTime()) {
    target.setTime(target.getTime() + WEEK_MS);
  }

  return target.getTime();
}

export async function scheduleFreeDailyDiamondNotification(nextDiamondClaimAt?: number | null) {
  const state = await readScheduleState();
  const targetAt = typeof nextDiamondClaimAt === "number" ? nextDiamondClaimAt : 0;

  if (!Number.isFinite(targetAt) || targetAt <= Date.now()) {
    await cancelScheduledItem(state.free);
    delete state.free;
    await writeScheduleState(state);
    return {scheduled: false, reason: "missing-target" as const};
  }

  if (state.free?.targetAt === targetAt && await hasScheduledItem(state.free)) {
    return {scheduled: true, id: state.free.id};
  }

  const canSchedule = await ensureNotificationSetup();
  if (!canSchedule) {
    return {scheduled: false, reason: "permission-denied" as const};
  }

  await cancelScheduledItem(state.free);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Daily Diamond ready",
      body: DAILY_DIAMOND_BODY,
      sound: "default",
      data: {kind: "daily-diamond"},
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(targetAt),
      channelId: CHANNEL_ID,
    },
  });

  state.free = {id, targetAt};
  await writeScheduleState(state);

  return {scheduled: true, id};
}

export async function scheduleWeeklyArchitectureTipNotification() {
  const state = await readScheduleState();

  if (state.pro?.id && await hasScheduledItem(state.pro)) {
    return {scheduled: true, id: state.pro.id};
  }

  const canSchedule = await ensureNotificationSetup();
  if (!canSchedule) {
    return {scheduled: false, reason: "permission-denied" as const};
  }

  const slot = getRandomWeeklySlot();
  const targetAt = getNextWeeklyTargetAt(slot);
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Architecture Tip",
      body: pickArchitectureTip(),
      sound: "default",
      data: {kind: "architecture-tip"},
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: slot.weekday,
      hour: slot.hour,
      minute: slot.minute,
      channelId: CHANNEL_ID,
    },
  });

  state.pro = {...slot, id, targetAt};
  await writeScheduleState(state);

  return {scheduled: true, id};
}

export async function syncTieredNotifications({
  isReady,
  hasProAccess,
  hasPaidAccess = false,
  subscriptionType,
  nextDiamondClaimAt,
}: TieredNotificationArgs) {
  if (!isReady) {
    return;
  }

  const isProTier = hasProAccess || hasPaidAccess || subscriptionType === "weekly" || subscriptionType === "yearly";
  const state = await readScheduleState();

  if (isProTier) {
    await cancelScheduledItem(state.free);
    delete state.free;
    await writeScheduleState(state);
    await scheduleWeeklyArchitectureTipNotification();
    return;
  }

  await cancelScheduledItem(state.pro);
  delete state.pro;
  await writeScheduleState(state);
  await scheduleFreeDailyDiamondNotification(nextDiamondClaimAt);
}
