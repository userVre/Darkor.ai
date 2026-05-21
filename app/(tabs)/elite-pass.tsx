import {useMutation} from "convex/react";
import {LinearGradient} from "expo-linear-gradient";
import {StatusBar} from "expo-status-bar";
import {Check, CreditCard, Crown, Landmark, LockKeyhole} from "lucide-react-native";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {useViewerCredits} from "../../components/viewer-credits-context";
import {useViewerSession} from "../../components/viewer-session-context";
import {triggerHaptic} from "../../lib/haptics";
import {useTheme, type Theme} from "../../styles/theme";
import {fonts} from "../../styles/typography";

const DAY_MS = 24 * 60 * 60 * 1000;
const PASS_DAYS = 7;
const DAILY_CAP = 3;

type RewardStatus = "claimed" | "available" | "locked";

type RewardDay = {
  day: number;
  isDay7: boolean;
  railActive: boolean;
  status: RewardStatus;
  waitDays: number;
};

function formatHoursUntil(timestamp: number, now: number) {
  if (!timestamp || timestamp <= now) return 0;
  return Math.max(1, Math.ceil((timestamp - now) / (60 * 60 * 1000)));
}

function clampPassDay(day: number) {
  return Math.max(1, Math.min(day, PASS_DAYS));
}

export default function ElitePassScreen() {
  const theme = useTheme();
  const {width} = useWindowDimensions();
  const isCompact = width < 380;
  const styles = useMemo(() => createStyles(theme, isCompact), [theme, isCompact]);
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();
  const pulseScale = useRef(new Animated.Value(1)).current;
  const {anonymousId} = useViewerSession();
  const {
    credits,
    diamondBalance,
    eliteProUntil,
    hasPaidAccess,
    hasProAccess,
    lastClaimAt,
    nextDiamondClaimAt,
    proTrialExpiresAt,
    streakCount,
    setOptimisticRewardState,
  } = useViewerCredits();
  const claimDailyDiamond = useMutation("diamonds:claimDailyDiamond" as any);
  const [isClaiming, setIsClaiming] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const proRewardUntil = Math.max(eliteProUntil, proTrialExpiresAt);
  const alreadyClaimed = lastClaimAt > 0 && now - lastClaimAt < DAY_MS;
  const day7ClaimedToday = alreadyClaimed && streakCount === 0 && proRewardUntil > now;
  const atCap = diamondBalance >= DAILY_CAP;
  const displayStreakCount = day7ClaimedToday ? PASS_DAYS : streakCount;
  const currentDay = day7ClaimedToday
    ? PASS_DAYS
    : alreadyClaimed
      ? clampPassDay(displayStreakCount)
      : clampPassDay(displayStreakCount + 1);
  const isDay7Available = !alreadyClaimed && !atCap && currentDay === PASS_DAYS;
  const hasClaimAction = !alreadyClaimed && !atCap;
  const canClaim = !alreadyClaimed && !atCap && !isClaiming;
  const progress = Math.max(0, Math.min(alreadyClaimed ? displayStreakCount : currentDay - 1, PASS_DAYS));
  const progressPercent = `${(progress / PASS_DAYS) * 100}%` as `${number}%`;
  const nextClaimHours = formatHoursUntil(nextDiamondClaimAt || lastClaimAt + DAY_MS, now);
  const proHours = formatHoursUntil(proRewardUntil, now);

  useEffect(() => {
    if (!canClaim) {
      pulseScale.stopAnimation();
      pulseScale.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.045,
          duration: 760,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: 760,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [canClaim, pulseScale]);

  const handleClaim = useCallback(async () => {
    if (!canClaim) return;

    triggerHaptic();
    setIsClaiming(true);
    try {
      const result = await claimDailyDiamond(anonymousId ? {anonymousId} : {});
      setOptimisticRewardState({
        credits: typeof result?.credits === "number" ? result.credits : credits,
        diamondBalance: typeof result?.diamondBalance === "number" ? result.diamondBalance : diamondBalance,
        lastClaimAt: typeof result?.lastClaimAt === "number" ? result.lastClaimAt : Date.now(),
        nextDiamondClaimAt: typeof result?.nextDiamondClaimAt === "number" ? result.nextDiamondClaimAt : 0,
        streakCount: typeof result?.streakCount === "number" ? result.streakCount : streakCount,
        eliteProUntil: typeof result?.eliteProUntil === "number" ? result.eliteProUntil : eliteProUntil,
        proTrialExpiresAt: typeof result?.proTrialExpiresAt === "number" ? result.proTrialExpiresAt : proTrialExpiresAt,
        hasProAccess: result?.hasProAccess ? true : hasProAccess,
        hasPaidAccess: result?.hasProAccess ? true : hasPaidAccess,
      });
      setNow(Date.now());
    } catch {
      Alert.alert(t("elitePass.errors.claimUnavailable"));
    } finally {
      setIsClaiming(false);
    }
  }, [
    anonymousId,
    canClaim,
    claimDailyDiamond,
    credits,
    diamondBalance,
    eliteProUntil,
    hasPaidAccess,
    hasProAccess,
    proTrialExpiresAt,
    setOptimisticRewardState,
    streakCount,
    t,
  ]);

  const claimLabel = alreadyClaimed
    ? t("elitePass.fullPage.claimedToday", {hours: nextClaimHours})
    : atCap
      ? t("elitePass.fullPage.capReached")
      : isDay7Available
        ? t("elitePass.fullPage.claimDay7")
        : t("elitePass.fullPage.claimDaily");

  const rewardDays = useMemo<RewardDay[]>(
    () => {
      const waitAnchorDay = alreadyClaimed ? progress : currentDay;

      return Array.from({length: PASS_DAYS}, (_, index) => {
        const day = index + 1;
        const claimed = alreadyClaimed ? day <= displayStreakCount : day < currentDay && day <= displayStreakCount;
        const available = day === currentDay && !alreadyClaimed && !atCap;
        const status = claimed ? "claimed" : available ? "available" : "locked";

        return {
          day,
          isDay7: day === PASS_DAYS,
          railActive: day <= progress,
          status,
          waitDays: status === "locked" ? Math.max(1, day - waitAnchorDay) : 0,
        };
      });
    },
    [alreadyClaimed, atCap, currentDay, displayStreakCount, progress],
  );

  return (
    <View style={styles.screen}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <LinearGradient
        colors={theme.isDark ? ["#090A10", "#10131A", "#090A10"] : ["#FFFFFF", "#F6F8FB", "#FFFFFF"]}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom + 100, 100)},
        ]}
      >
        <View style={styles.passCard}>
          {theme.isDark ? (
            <LinearGradient
              colors={["#161824", "#10131A", "#07080D"]}
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <View pointerEvents="none" style={styles.passTopRule} />

          <View style={styles.passTopRow}>
            <View style={styles.brandLockup}>
              <View style={styles.iconPlate}>
                <Landmark color={theme.isDark ? "#F5D38A" : "#7C5A22"} size={24} strokeWidth={2} />
              </View>
              <View style={styles.brandCopy}>
                <Text style={styles.eyebrow}>{t("elitePass.fullPage.eyebrow")}</Text>
                <Text adjustsFontSizeToFit minimumFontScale={0.84} numberOfLines={1} style={styles.title}>
                  {t("elitePass.fullPage.title")}
                </Text>
              </View>
            </View>

            <View style={styles.balancePill}>
              <CreditCard color={theme.isDark ? "#C7D2E8" : "#48617A"} size={16} strokeWidth={2} />
              <Text style={styles.balanceText}>{t("elitePass.fullPage.balance", {count: diamondBalance})}</Text>
            </View>
          </View>

          <Text style={styles.subtitle}>{t("elitePass.fullPage.subtitle")}</Text>

          <View style={styles.eliteBanner}>
            <View style={styles.heroBadge}>
              <Crown color={theme.isDark ? "#111827" : "#FFFFFF"} size={21} strokeWidth={2.25} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroKicker}>{t("elitePass.fullPage.heroKicker", {current: progress, total: PASS_DAYS})}</Text>
              <Text numberOfLines={2} style={styles.heroTitle}>
                {proHours > 0
                  ? t("elitePass.fullPage.proActive", {hours: proHours})
                  : t("elitePass.fullPage.heroTitle")}
              </Text>
            </View>
            {hasClaimAction ? (
              <Animated.View style={{transform: [{scale: canClaim ? pulseScale : 1}]}}>
                <Pressable
                  accessibilityLabel={claimLabel}
                  accessibilityRole="button"
                  accessibilityState={{busy: isClaiming, disabled: !canClaim}}
                  disabled={!canClaim}
                  onPress={() => void handleClaim()}
                  style={styles.bannerAction}
                >
                  {isClaiming ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <CreditCard color="#FFFFFF" size={15} strokeWidth={2} />
                      <Text numberOfLines={1} style={styles.bannerActionText}>
                        {isDay7Available ? t("elitePass.fullPage.claimDay7Short") : t("elitePass.fullPage.claimDailyShort")}
                      </Text>
                    </>
                  )}
                </Pressable>
              </Animated.View>
            ) : (
              <View accessibilityLabel={claimLabel} accessible style={styles.bannerStatus}>
                {alreadyClaimed ? (
                  <Check color={theme.isDark ? "#F5D38A" : "#7C5A22"} size={16} strokeWidth={2.35} />
                ) : (
                  <LockKeyhole color={theme.textMuted} size={15} strokeWidth={2.2} />
                )}
                <Text numberOfLines={1} style={styles.bannerStatusText}>
                  {alreadyClaimed ? t("elitePass.fullPage.nextIn", {hours: nextClaimHours}) : t("elitePass.fullPage.capShort")}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.streakHeader}>
            <Text style={styles.sectionTitle}>{t("elitePass.fullPage.streakTitle")}</Text>
            <Text style={styles.progressCount}>{t("elitePass.progressCount", {current: progress, total: PASS_DAYS})}</Text>
          </View>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.progressTrack}>
            <View style={[styles.progressFill, {width: progressPercent}]} />
          </View>

          <View
            accessibilityLabel={t("elitePass.progressA11y", {current: progress, total: PASS_DAYS})}
            accessible
            style={styles.timeline}
          >
            {rewardDays.map((reward, index) => {
              const {day, isDay7, railActive, status, waitDays} = reward;
              const claimed = status === "claimed";
              const available = status === "available";
              const locked = status === "locked";
              const nearFinal = locked && day >= PASS_DAYS - 1;
              const Icon = claimed ? Check : available ? (isDay7 ? Crown : CreditCard) : isDay7 || nearFinal ? Crown : LockKeyhole;
              const node = (
                <View
                  style={[
                    styles.dayNode,
                    nearFinal ? styles.dayNodeNearFinal : null,
                    isDay7 ? styles.day7Node : null,
                    claimed ? styles.dayNodeDone : null,
                    available ? styles.dayNodeCurrent : null,
                    locked ? styles.dayNodeLocked : null,
                  ]}
                >
                  <Icon
                    color={claimed || available ? "#FFFFFF" : isDay7 || nearFinal ? "#7C5A22" : theme.textMuted}
                    size={isDay7 ? 19 : 17}
                    strokeWidth={2.35}
                  />
                </View>
              );

              const stateLabel =
                claimed
                  ? t("elitePass.dayNode.claimed")
                  : available
                    ? t(isDay7 ? "elitePass.fullPage.availableDay7" : "elitePass.fullPage.availableToday")
                    : waitDays === 1
                      ? t("elitePass.fullPage.tomorrow")
                      : t("elitePass.fullPage.inDays", {count: waitDays});

              return (
                <View
                  key={day}
                  style={[
                    styles.timelineItem,
                    available ? styles.timelineItemAvailable : null,
                    isDay7 ? styles.timelineItemFinal : null,
                    locked && !isDay7 ? styles.timelineItemLocked : null,
                  ]}
                >
                  <View style={styles.railWrap}>
                    <View
                      style={[
                        styles.railLine,
                        index === 0 ? styles.railLineFirst : null,
                        index === PASS_DAYS - 1 ? styles.railLineLast : null,
                        railActive ? styles.railLineActive : null,
                      ]}
                    />
                    {available ? <Animated.View style={{transform: [{scale: pulseScale}]}}>{node}</Animated.View> : node}
                  </View>

                  <View style={styles.dayCopy}>
                    <Text style={[styles.dayTitle, isDay7 ? styles.dayTitleElite : null, locked && !nearFinal ? styles.dayTitleLocked : null]}>
                      {isDay7 ? t("elitePass.fullPage.day7Short") : t("elitePass.fullPage.dayShort", {day})}
                    </Text>
                    <Text numberOfLines={2} style={[styles.dayBody, available ? styles.dayBodyAvailable : null]}>
                      {stateLabel}
                    </Text>
                  </View>

                  {claimed || (locked && !isDay7) ? null : (
                    <View
                      style={[
                        styles.rewardPill,
                        locked ? styles.rewardPillLocked : null,
                        isDay7 ? styles.rewardPillElite : null,
                      ]}
                    >
                      {isDay7 ? (
                        <Crown color={locked ? theme.textMuted : "#7C5A22"} size={14} strokeWidth={2.2} />
                      ) : (
                        <CreditCard color={locked ? theme.textMuted : "#48617A"} size={14} strokeWidth={2} />
                      )}
                      <Text style={[styles.rewardText, locked ? styles.rewardTextLocked : null]}>
                        {isDay7 ? "+3 + Pro" : "+1"}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          <Text style={styles.footerHint}>
            {alreadyClaimed
              ? t("elitePass.fullPage.returnHint", {hours: nextClaimHours})
              : t("elitePass.fullPage.keepStreakHint")}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(theme: Theme, isCompact: boolean) {
  const cardBackground = theme.isDark ? "#090908" : "#11100E";
  const cardBorder = "rgba(226, 199, 145, 0.24)";
  const primaryText = "#FFF9EC";
  const secondaryText = "rgba(255, 249, 236, 0.72)";
  const mutedText = "rgba(255, 249, 236, 0.48)";
  const charcoal = "#C49A4A";
  const gold = "#C49A4A";
  const goldSoft = "rgba(196, 154, 74, 0.13)";
  const goldBorder = "rgba(196, 154, 74, 0.32)";
  const creditBlueSoft = "rgba(255, 249, 236, 0.07)";
  const creditBlueBorder = "rgba(255, 249, 236, 0.14)";

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.isDark ? "#050505" : "#F5F2EB",
    },
    content: {
      gap: 16,
      paddingHorizontal: isCompact ? 14 : 20,
    },
    passCard: {
      gap: 20,
      paddingHorizontal: isCompact ? 16 : 20,
      paddingVertical: 24,
      borderRadius: 8,
      borderCurve: "continuous",
      borderWidth: 1,
      borderColor: cardBorder,
      backgroundColor: cardBackground,
      overflow: "hidden",
      boxShadow: theme.isDark ? "0px 22px 48px rgba(0,0,0,0.46)" : "0px 18px 44px rgba(17, 16, 14, 0.18)",
    },
    passTopRule: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      height: 3,
      backgroundColor: "rgba(196, 154, 74, 0.92)",
    },
    passTopRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12,
    },
    brandLockup: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    brandCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    iconPlate: {
      width: 50,
      height: 50,
      borderRadius: 25,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: goldSoft,
      borderWidth: 1,
      borderColor: goldBorder,
    },
    balancePill: {
      minHeight: 34,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      paddingHorizontal: 11,
      borderRadius: 8,
      backgroundColor: "rgba(255, 249, 236, 0.08)",
      borderWidth: 1,
      borderColor: cardBorder,
    },
    balanceText: {
      color: primaryText,
      fontSize: 13,
      lineHeight: 17,
      letterSpacing: 0,
      fontVariant: ["tabular-nums"],
      ...fonts.semibold,
    },
    eyebrow: {
      color: mutedText,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0,
      textTransform: "uppercase",
      ...fonts.bold,
    },
    title: {
      color: primaryText,
      fontSize: isCompact ? 28 : 31,
      lineHeight: isCompact ? 34 : 37,
      letterSpacing: 0,
      ...fonts.bold,
    },
    subtitle: {
      color: secondaryText,
      fontSize: 14,
      lineHeight: 21,
      letterSpacing: 0,
      ...fonts.regular,
    },
    eliteBanner: {
      minHeight: 92,
      flexDirection: "row",
      alignItems: "center",
      gap: 13,
      padding: 15,
      borderRadius: 8,
      borderCurve: "continuous",
      backgroundColor: "rgba(255, 249, 236, 0.07)",
      borderWidth: 1,
      borderColor: "rgba(226, 199, 145, 0.22)",
    },
    heroBadge: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: gold,
      borderWidth: 1,
      borderColor: "rgba(253, 230, 138, 0.45)",
    },
    heroCopy: {
      flex: 1,
      minWidth: 0,
      gap: 3,
    },
    heroKicker: {
      color: "#D8B868",
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0,
      textTransform: "uppercase",
      ...fonts.bold,
    },
    heroTitle: {
      color: "#FFFFFF",
      fontSize: 14,
      lineHeight: 20,
      letterSpacing: 0,
      ...fonts.semibold,
    },
    bannerAction: {
      minHeight: 36,
      maxWidth: isCompact ? 112 : 142,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingHorizontal: 11,
      borderRadius: 7,
      borderCurve: "continuous",
      backgroundColor: gold,
    },
    bannerActionText: {
      flexShrink: 1,
      color: "#FFFFFF",
      fontSize: 12,
      lineHeight: 15,
      letterSpacing: 0,
      ...fonts.bold,
    },
    bannerStatus: {
      minHeight: 34,
      maxWidth: isCompact ? 118 : 146,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingHorizontal: 10,
      borderRadius: 7,
      borderCurve: "continuous",
      backgroundColor: "rgba(196, 154, 74, 0.12)",
      borderWidth: 1,
      borderColor: "rgba(196, 154, 74, 0.26)",
    },
    bannerStatusText: {
      flexShrink: 1,
      color: "#FFFFFF",
      fontSize: 12,
      lineHeight: 15,
      letterSpacing: 0,
      ...fonts.semibold,
    },
    streakHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      paddingTop: 2,
    },
    sectionTitle: {
      color: primaryText,
      fontSize: 17,
      lineHeight: 22,
      letterSpacing: 0,
      ...fonts.bold,
    },
    progressCount: {
      color: secondaryText,
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0,
      fontVariant: ["tabular-nums"],
      ...fonts.semibold,
    },
    progressTrack: {
      height: 6,
      borderRadius: 2,
      backgroundColor: "rgba(255, 249, 236, 0.10)",
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 2,
      backgroundColor: gold,
    },
    timeline: {
      gap: 8,
    },
    timelineItem: {
      minHeight: isCompact ? 58 : 66,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingRight: 10,
      borderRadius: 8,
      borderCurve: "continuous",
    },
    timelineItemAvailable: {
      backgroundColor: "rgba(196, 154, 74, 0.16)",
      borderWidth: 1,
      borderColor: goldBorder,
    },
    timelineItemLocked: {
      backgroundColor: "rgba(255, 249, 236, 0.035)",
      borderWidth: 1,
      borderColor: "rgba(255, 249, 236, 0.075)",
    },
    timelineItemFinal: {
      minHeight: 78,
      backgroundColor: "rgba(196, 154, 74, 0.18)",
      borderWidth: 1,
      borderColor: goldBorder,
    },
    railWrap: {
      width: 42,
      minHeight: isCompact ? 58 : 64,
      alignItems: "center",
      justifyContent: "center",
    },
    railLine: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 20,
      width: 2,
      borderRadius: 1,
      backgroundColor: "rgba(255, 249, 236, 0.14)",
    },
    railLineFirst: {
      top: 32,
    },
    railLineLast: {
      bottom: 32,
    },
    railLineActive: {
      backgroundColor: gold,
    },
    dayNode: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: cardBorder,
      backgroundColor: "rgba(255, 249, 236, 0.08)",
    },
    dayNodeNearFinal: {
      backgroundColor: goldSoft,
      borderColor: goldBorder,
    },
    day7Node: {
      width: 46,
      height: 46,
      borderRadius: 23,
    },
    dayNodeDone: {
      backgroundColor: charcoal,
      borderColor: charcoal,
    },
    dayNodeCurrent: {
      backgroundColor: gold,
      borderColor: gold,
    },
    dayNodeLocked: {
      backgroundColor: "rgba(255, 249, 236, 0.07)",
    },
    dayCopy: {
      flex: 1,
      minWidth: 0,
      gap: 3,
    },
    dayTitle: {
      color: primaryText,
      fontSize: 15,
      lineHeight: 19,
      letterSpacing: 0,
      ...fonts.bold,
    },
    dayTitleElite: {
      color: gold,
    },
    dayTitleLocked: {
      color: "rgba(255, 249, 236, 0.64)",
    },
    dayBody: {
      color: secondaryText,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0,
      ...fonts.medium,
    },
    dayBodyAvailable: {
      color: gold,
      ...fonts.semibold,
    },
    rewardPill: {
      minWidth: isCompact ? 64 : 78,
      minHeight: 32,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      paddingHorizontal: 9,
      borderRadius: 8,
      backgroundColor: creditBlueSoft,
      borderWidth: 1,
      borderColor: creditBlueBorder,
    },
    rewardPillElite: {
      backgroundColor: goldSoft,
      borderColor: goldBorder,
    },
    rewardPillLocked: {
      backgroundColor: "transparent",
      borderColor: "rgba(255, 249, 236, 0.12)",
    },
    rewardText: {
      color: primaryText,
      fontSize: 12,
      lineHeight: 15,
      letterSpacing: 0,
      ...fonts.bold,
    },
    rewardTextLocked: {
      color: mutedText,
    },
    footerHint: {
      color: secondaryText,
      fontSize: 13,
      lineHeight: 19,
      textAlign: "center",
      letterSpacing: 0,
      ...fonts.medium,
    },
  });
}
