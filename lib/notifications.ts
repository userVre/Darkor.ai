import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import {Platform} from "react-native";

import type * as ExpoNotifications from "expo-notifications";

const CHANNEL_ID = "tiered-engagement";
const STATE_KEY = "homedecor:tiered-notifications:v2";
const DECLINED_KEY = "homedecor:notifications-declined:v1";
const IOS_PROVISIONAL_KEY = "homedecor:ios-provisional-notifications-at:v1";
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const FREE_DAILY_DIAMOND_CAP = 2;

export const DAILY_DIAMOND_REMINDER_ID = "daily-diamond-reminder";
export const WEEKLY_PRO_TIP_ID = "weekly-pro-tip";

const DAILY_DIAMOND_TITLE = "Your Diamond is ready ✦";
const DAILY_DIAMOND_BODY = "Come back and claim your daily design credit before your streak breaks.";
const DIAMOND_CAP_MESSAGE = "You have 2 Diamonds saved. Time to design something!";

export const ARCHITECTURE_TIPS = [
  "Try Japandi style for small rooms — less furniture, more breathing space.",
  "Layer lighting: ambient + task + accent. One source = flat, three sources = luxury.",
  "60-30-10 color rule: 60% dominant, 30% secondary, 10% accent. Never break it.",
  "Mirrors opposite windows double natural light and visual space instantly.",
  "Odd numbers win: group décor in 3s or 5s, never 2s or 4s.",
  "Wabi-sabi: embrace imperfect natural textures — linen, clay, raw wood. It feels expensive.",
  "Raise your curtains to ceiling height, even with short windows. It makes ceilings feel higher.",
  "Biophilic design: one large plant per room increases perceived quality more than any furniture.",
] as const;

type SubscriptionType = "free" | "weekly" | "yearly";

type ScheduleState = {
  dailyDiamondTargetAt?: number;
  weeklyProTipTargetAt?: number;
};

type SaveNotificationPreferencesArgs = {
  anonymousId?: string;
  expoPushToken?: string;
  devicePushToken?: string;
  notificationsDeclined?: boolean;
  notificationsPermissionRequestedAt?: number;
  notificationsPermissionGrantedAt?: number;
  notificationPlatform?: string;
};

type ScheduleDiamondArgs = {
  diamondBalance?: number | null;
  lastDiamondClaimAt?: number | null;
  lastClaimAt?: number | null;
  nextDiamondClaimAt?: number | null;
  notificationsDeclined?: boolean | null;
};

type ScheduleProTipArgs = {
  forceReschedule?: boolean;
  notificationsDeclined?: boolean | null;
  proTipNotificationIndex?: number | null;
  persistNextTipIndex?: (nextIndex: number) => Promise<unknown>;
};

type RequestPermissionArgs = {
  anonymousId?: string | null;
  notificationsDeclined?: boolean | null;
  savePreferences?: (args: SaveNotificationPreferencesArgs) => Promise<unknown>;
};

type TieredNotificationArgs = ScheduleDiamondArgs & ScheduleProTipArgs & {
  isReady: boolean;
  hasProAccess: boolean;
  hasPaidAccess?: boolean;
  subscriptionType?: SubscriptionType;
};

let notificationsModulePromise: Promise<typeof ExpoNotifications | null> | null = null;
let notificationHandlerConfigured = false;

async function getNotificationsModule() {
  if (!notificationsModulePromise) {
    notificationsModulePromise = import("expo-notifications")
      .then((module) => module)
      .catch((error) => {
        console.warn("[Notifications] expo-notifications native module unavailable", error);
        return null;
      });
  }

  return notificationsModulePromise;
}

function configureNotificationHandler(Notifications: typeof ExpoNotifications) {
  if (notificationHandlerConfigured) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  notificationHandlerConfigured = true;
}

function isPermissionGranted(status: ExpoNotifications.NotificationPermissionsStatus, Notifications: typeof ExpoNotifications) {
  return (
    status.granted ||
    status.status === "granted" ||
    status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    status.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL
  );
}

function isFullPermissionGranted(status: ExpoNotifications.NotificationPermissionsStatus, Notifications: typeof ExpoNotifications) {
  if (Platform.OS === "ios" && status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return false;
  }

  return status.granted || status.status === "granted";
}

async function setupNotificationChannel(Notifications: typeof ExpoNotifications) {
  configureNotificationHandler(Notifications);

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: "Design reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default",
      vibrationPattern: [0, 180, 120, 180],
      lightColor: "#4F7BFF",
    });
  }
}

async function getLocalDeclined() {
  try {
    return await AsyncStorage.getItem(DECLINED_KEY) === "true";
  } catch {
    return false;
  }
}

async function markLocalDeclined() {
  try {
    await AsyncStorage.setItem(DECLINED_KEY, "true");
  } catch {
    // Local decline state is best-effort; the server profile is also updated.
  }
}

async function readState(): Promise<ScheduleState> {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as ScheduleState;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.warn("[Notifications] Unable to read schedule state", error);
    return {};
  }
}

async function writeState(state: ScheduleState) {
  try {
    await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("[Notifications] Unable to write schedule state", error);
  }
}

function finiteTimestamp(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

async function canScheduleWithoutPrompt(notificationsDeclined?: boolean | null) {
  if (Platform.OS === "web" || notificationsDeclined || await getLocalDeclined()) {
    return false;
  }

  try {
    const Notifications = await getNotificationsModule();
    if (!Notifications) {
      return false;
    }

    await setupNotificationChannel(Notifications);
    const current = await Notifications.getPermissionsAsync();
    return isPermissionGranted(current, Notifications);
  } catch (error) {
    console.warn("[Notifications] Unable to inspect notification permission", error);
    return false;
  }
}

async function cancelByIdentifier(identifier: string) {
  try {
    const Notifications = await getNotificationsModule();
    if (!Notifications) {
      return;
    }

    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch (error) {
    console.warn("[Notifications] Unable to cancel scheduled notification", error);
  }
}

async function hasScheduledIdentifier(identifier: string) {
  try {
    const Notifications = await getNotificationsModule();
    if (!Notifications) {
      return false;
    }

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.some((request) => request.identifier === identifier);
  } catch (error) {
    console.warn("[Notifications] Unable to inspect scheduled notifications", error);
    return false;
  }
}

function getProjectId() {
  return (
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.manifest2?.extra?.eas?.projectId ??
    undefined
  );
}

async function saveGrantedPushToken(
  Notifications: typeof ExpoNotifications,
  savePreferences?: (args: SaveNotificationPreferencesArgs) => Promise<unknown>,
  anonymousId?: string | null,
) {
  if (!savePreferences) {
    return;
  }

  let expoPushToken: string | undefined;
  let devicePushToken: string | undefined;

  try {
    const projectId = getProjectId();
    const token = await Notifications.getExpoPushTokenAsync(projectId ? {projectId} : undefined);
    expoPushToken = token.data;
  } catch (error) {
    console.warn("[Notifications] Unable to fetch Expo push token", error);
  }

  try {
    const token = await Notifications.getDevicePushTokenAsync();
    devicePushToken = typeof token.data === "string" ? token.data : JSON.stringify(token.data);
  } catch (error) {
    console.warn("[Notifications] Unable to fetch device push token", error);
  }

  await savePreferences({
    anonymousId: anonymousId ?? undefined,
    expoPushToken,
    devicePushToken,
    notificationsDeclined: false,
    notificationsPermissionRequestedAt: Date.now(),
    notificationsPermissionGrantedAt: Date.now(),
    notificationPlatform: Platform.OS,
  });
}

async function persistDenied(
  savePreferences?: (args: SaveNotificationPreferencesArgs) => Promise<unknown>,
  anonymousId?: string | null,
) {
  await markLocalDeclined();
  await savePreferences?.({
    anonymousId: anonymousId ?? undefined,
    notificationsDeclined: true,
    notificationsPermissionRequestedAt: Date.now(),
    notificationPlatform: Platform.OS,
  }).catch((error) => console.warn("[Notifications] Unable to persist declined permission", error));
}

function getDiamondTargetAt(args: ScheduleDiamondArgs) {
  const lastClaimAt = finiteTimestamp(args.lastDiamondClaimAt ?? args.lastClaimAt);
  if (lastClaimAt > 0) {
    return lastClaimAt + DAY_MS;
  }

  return finiteTimestamp(args.nextDiamondClaimAt);
}

function getRandomWeeklySlot() {
  const now = Date.now();
  const offsetMs = Math.max(60 * 1000, Math.floor(Math.random() * WEEK_MS));
  const target = new Date(now + offsetMs);
  return {
    targetAt: target.getTime(),
    weekday: target.getDay() + 1,
    hour: target.getHours(),
    minute: target.getMinutes(),
  };
}

export async function scheduleOrUpdateDiamondReminder(args: ScheduleDiamondArgs = {}) {
  await cancelByIdentifier(DAILY_DIAMOND_REMINDER_ID);

  const state = await readState();
  delete state.dailyDiamondTargetAt;
  await writeState(state);

  if (finiteTimestamp(args.diamondBalance) >= FREE_DAILY_DIAMOND_CAP) {
    return {scheduled: false, reason: "diamond-cap" as const, message: DIAMOND_CAP_MESSAGE};
  }

  const targetAt = getDiamondTargetAt(args);
  if (targetAt <= Date.now()) {
    return {scheduled: false, reason: "missing-or-expired-target" as const};
  }

  const canSchedule = await canScheduleWithoutPrompt(args.notificationsDeclined);
  if (!canSchedule) {
    return {scheduled: false, reason: "permission-not-granted" as const};
  }

  const Notifications = await getNotificationsModule();
  if (!Notifications) {
    return {scheduled: false, reason: "native-module-unavailable" as const};
  }

  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_DIAMOND_REMINDER_ID,
    content: {
      title: DAILY_DIAMOND_TITLE,
      body: DAILY_DIAMOND_BODY,
      sound: "default",
      data: {
        kind: "daily-diamond",
        route: "/(tabs)/index",
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(targetAt),
      channelId: CHANNEL_ID,
    } as ExpoNotifications.NotificationTriggerInput,
  });

  await writeState({...state, dailyDiamondTargetAt: targetAt});
  return {scheduled: true, id: DAILY_DIAMOND_REMINDER_ID, targetAt};
}

export async function scheduleOrUpdateProTip(args: ScheduleProTipArgs = {}) {
  if (args.forceReschedule === false && await hasScheduledIdentifier(WEEKLY_PRO_TIP_ID)) {
    return {scheduled: true, id: WEEKLY_PRO_TIP_ID, reason: "already-scheduled" as const};
  }

  await cancelByIdentifier(WEEKLY_PRO_TIP_ID);

  const state = await readState();
  delete state.weeklyProTipTargetAt;
  await writeState(state);

  const canSchedule = await canScheduleWithoutPrompt(args.notificationsDeclined);
  if (!canSchedule) {
    return {scheduled: false, reason: "permission-not-granted" as const};
  }

  const Notifications = await getNotificationsModule();
  if (!Notifications) {
    return {scheduled: false, reason: "native-module-unavailable" as const};
  }

  const currentTipIndex = Math.max(0, Math.floor(args.proTipNotificationIndex ?? 0));
  const tip = ARCHITECTURE_TIPS[currentTipIndex % ARCHITECTURE_TIPS.length] ?? ARCHITECTURE_TIPS[0];
  const slot = getRandomWeeklySlot();

  await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_PRO_TIP_ID,
    content: {
      title: "Architecture Tip",
      body: tip,
      sound: "default",
      data: {
        kind: "weekly-pro-tip",
        route: "/(tabs)/create?service=interior&startStep=1&entrySource=pro-tip-notification",
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: slot.weekday,
      hour: slot.hour,
      minute: slot.minute,
      channelId: CHANNEL_ID,
    } as ExpoNotifications.NotificationTriggerInput,
  });

  await args.persistNextTipIndex?.((currentTipIndex + 1) % ARCHITECTURE_TIPS.length);
  await writeState({...state, weeklyProTipTargetAt: slot.targetAt});

  return {scheduled: true, id: WEEKLY_PRO_TIP_ID, targetAt: slot.targetAt, tipIndex: currentTipIndex};
}

export async function cancelAll() {
  await Promise.all([
    cancelByIdentifier(DAILY_DIAMOND_REMINDER_ID),
    cancelByIdentifier(WEEKLY_PRO_TIP_ID),
  ]);
  await writeState({});
}

export async function requestPermissionsGracefully(args: RequestPermissionArgs = {}) {
  if (Platform.OS === "web" || args.notificationsDeclined || await getLocalDeclined()) {
    return {granted: false, reason: "declined" as const};
  }

  try {
    const Notifications = await getNotificationsModule();
    if (!Notifications) {
      return {granted: false, reason: "native-module-unavailable" as const};
    }

    await setupNotificationChannel(Notifications);

    const current = await Notifications.getPermissionsAsync();
    if (isFullPermissionGranted(current, Notifications)) {
      await saveGrantedPushToken(Notifications, args.savePreferences, args.anonymousId);
      return {granted: true, status: current.status};
    }

    if (Platform.OS === "ios" && current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
      const provisionalAtRaw = await AsyncStorage.getItem(IOS_PROVISIONAL_KEY).catch(() => null);
      const provisionalAt = Number(provisionalAtRaw ?? 0);
      if (!Number.isFinite(provisionalAt) || provisionalAt <= 0) {
        await AsyncStorage.setItem(IOS_PROVISIONAL_KEY, String(Date.now())).catch(() => undefined);
        await saveGrantedPushToken(Notifications, args.savePreferences, args.anonymousId);
        return {granted: true, status: current.status};
      }

      if (Date.now() - provisionalAt < 3 * DAY_MS) {
        await saveGrantedPushToken(Notifications, args.savePreferences, args.anonymousId);
        return {granted: true, status: current.status};
      }
    }

    if (!current.canAskAgain) {
      await persistDenied(args.savePreferences, args.anonymousId);
      return {granted: false, reason: "cannot-ask-again" as const};
    }

    const requested = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
        allowProvisional: Platform.OS === "ios" && current.status === "undetermined",
      },
    });

    if (isPermissionGranted(requested, Notifications)) {
      if (Platform.OS === "ios" && requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
        await AsyncStorage.setItem(IOS_PROVISIONAL_KEY, String(Date.now())).catch(() => undefined);
      }
      await saveGrantedPushToken(Notifications, args.savePreferences, args.anonymousId);
      return {granted: true, status: requested.status};
    }

    await persistDenied(args.savePreferences, args.anonymousId);
    return {granted: false, reason: "denied" as const};
  } catch (error) {
    console.warn("[Notifications] Permission request failed", error);
    return {granted: false, reason: "request-failed" as const};
  }
}

export async function syncTieredNotifications({
  isReady,
  hasProAccess,
  hasPaidAccess = false,
  subscriptionType,
  ...scheduleArgs
}: TieredNotificationArgs) {
  if (!isReady) {
    return;
  }

  const isProTier = hasProAccess || hasPaidAccess || subscriptionType === "weekly" || subscriptionType === "yearly";
  if (isProTier) {
    await cancelByIdentifier(DAILY_DIAMOND_REMINDER_ID);
    await scheduleOrUpdateProTip({...scheduleArgs, forceReschedule: false});
    return;
  }

  await cancelByIdentifier(WEEKLY_PRO_TIP_ID);
  await scheduleOrUpdateDiamondReminder(scheduleArgs);
}
