import {useMutation} from "convex/react";
import {LinearGradient} from "expo-linear-gradient";
import {StatusBar} from "expo-status-bar";
import {Check, Crown, Flame, Gem, LockKeyhole, ShieldCheck, Sparkles} from "lucide-react-native";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {ActivityIndicator, Alert, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {triggerHaptic} from "../../lib/haptics";
import {useTheme, type Theme} from "../../styles/theme";
import {fonts} from "../../styles/typography";
import {useViewerCredits} from "../../components/viewer-credits-context";
import {useViewerSession} from "../../components/viewer-session-context";

const DAY_MS = 24 * 60 * 60 * 1000;
const DAILY_CAP = 2;

function formatHoursUntil(timestamp: number, now: number) {
  if (!timestamp || timestamp <= now) return 0;
  return Math.max(1, Math.ceil((timestamp - now) / (60 * 60 * 1000)));
}

export default function ElitePassScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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

  const alreadyClaimed = lastClaimAt > 0 && now - lastClaimAt < DAY_MS;
  const atCap = diamondBalance >= DAILY_CAP;
  const currentDay = alreadyClaimed
    ? Math.max(Math.min(streakCount, 7), 1)
    : Math.min(Math.max(streakCount + 1, 1), 7);
  const isDay7Available = !alreadyClaimed && !atCap && currentDay === 7;
  const canClaim = !alreadyClaimed && !atCap && !isClaiming;
  const progress = Math.max(0, Math.min(alreadyClaimed ? streakCount : currentDay - 1, 7));
  const nextClaimHours = formatHoursUntil(nextDiamondClaimAt || lastClaimAt + DAY_MS, now);
  const proHours = formatHoursUntil(eliteProUntil, now);

  useEffect(() => {
    if (!canClaim) {
      pulseScale.stopAnimation();
      pulseScale.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.06,
          duration: 720,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: 720,
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

  return (
    <View style={styles.screen}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <LinearGradient
        colors={theme.isDark ? ["#120B1B", theme.bg, theme.bg] : ["#FFF4D6", "#FFFFFF", "#FFFFFF"]}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {paddingTop: insets.top + 18, paddingBottom: Math.max(insets.bottom + 114, 136)},
        ]}
      >
        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <View style={styles.iconPlate}>
              <Flame color="#FF9F1C" size={26} strokeWidth={2.2} />
            </View>
            <View style={styles.balancePill}>
              <Gem color="#37C2FF" size={16} strokeWidth={2.1} />
              <Text style={styles.balanceText}>{t("elitePass.fullPage.balance", {count: diamondBalance})}</Text>
            </View>
          </View>

          <Text style={styles.eyebrow}>{t("elitePass.fullPage.eyebrow")}</Text>
          <Text adjustsFontSizeToFit minimumFontScale={0.82} numberOfLines={2} style={styles.title}>
            {t("elitePass.fullPage.title")}
          </Text>
          <Text style={styles.subtitle}>{t("elitePass.fullPage.subtitle")}</Text>

          <View style={styles.proStrip}>
            <Crown color="#FFD166" size={18} strokeWidth={2.1} />
            <Text style={styles.proStripText}>
              {proHours > 0
                ? t("elitePass.fullPage.proActive", {hours: proHours})
                : t("elitePass.fullPage.day7Promise")}
            </Text>
          </View>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("elitePass.fullPage.streakTitle")}</Text>
            <Text style={styles.progressCount}>{t("elitePass.progressCount", {current: progress, total: 7})}</Text>
          </View>

          <View style={styles.dayRow}>
            {Array.from({length: 7}).map((_, index) => {
              const day = index + 1;
              const isDay7 = day === 7;
              const completed = day <= streakCount && (alreadyClaimed || day < currentDay);
              const claimedToday = day === currentDay && alreadyClaimed;
              const current = day === currentDay && !alreadyClaimed && !atCap;
              const locked = !completed && !claimedToday && !current;
              const Icon = completed || claimedToday ? Check : current ? (isDay7 ? Crown : Gem) : LockKeyhole;
              const node = (
                <View
                  style={[
                    styles.dayNode,
                    isDay7 ? styles.day7Node : null,
                    completed || claimedToday ? styles.dayNodeDone : null,
                    current ? styles.dayNodeCurrent : null,
                    locked ? styles.dayNodeLocked : null,
                  ]}
                >
                  <Icon
                    color={completed || claimedToday ? "#FFFFFF" : current ? "#1A1300" : theme.textMuted}
                    size={isDay7 ? 18 : 16}
                    strokeWidth={2.2}
                  />
                </View>
              );

              return (
                <View key={day} style={styles.dayItem}>
                  {current ? <Animated.View style={{transform: [{scale: pulseScale}]}}>{node}</Animated.View> : node}
                  <Text numberOfLines={2} style={[styles.dayLabel, isDay7 ? styles.day7Label : null]}>
                    {isDay7 ? t("elitePass.fullPage.day7Short") : t("elitePass.fullPage.dayShort", {day})}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <Animated.View style={{transform: [{scale: canClaim ? pulseScale : 1}]}}>
          <Pressable
            accessibilityRole="button"
            disabled={!canClaim}
            onPress={() => void handleClaim()}
            style={[styles.claimButton, !canClaim ? styles.claimButtonDisabled : null]}
          >
            <LinearGradient
              colors={canClaim ? ["#FFE66D", "#FF9F1C"] : [theme.surfaceHigh, theme.surfaceHigh]}
              style={styles.claimGradient}
            >
              {isClaiming ? (
                <ActivityIndicator color="#1A1300" />
              ) : (
                <>
                  <Sparkles color={canClaim ? "#1A1300" : theme.textSecondary} size={18} strokeWidth={2.1} />
                  <Text style={[styles.claimText, !canClaim ? styles.claimTextDisabled : null]}>{claimLabel}</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Gem color="#37C2FF" size={20} strokeWidth={2.1} />
            <Text style={styles.infoTitle}>{t("elitePass.fullPage.dailyDiamondTitle")}</Text>
            <Text style={styles.infoBody}>{t("elitePass.fullPage.dailyDiamondBody")}</Text>
          </View>
          <View style={styles.infoCard}>
            <ShieldCheck color="#4ADE80" size={20} strokeWidth={2.1} />
            <Text style={styles.infoTitle}>{t("elitePass.fullPage.capTitle")}</Text>
            <Text style={styles.infoBody}>{t("elitePass.fullPage.capBody", {count: DAILY_CAP})}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    content: {
      gap: 18,
      paddingHorizontal: 20,
    },
    hero: {
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 22,
      borderRadius: 8,
      borderCurve: "continuous",
      borderWidth: 1,
      borderColor: theme.isDark ? "rgba(255, 209, 102, 0.22)" : "rgba(180, 83, 9, 0.18)",
      backgroundColor: theme.isDark ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.72)",
      boxShadow: theme.isDark ? "0px 18px 40px rgba(0,0,0,0.36)" : "0px 18px 40px rgba(180,83,9,0.13)",
    },
    heroTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    iconPlate: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.isDark ? "rgba(255,159,28,0.16)" : "rgba(255,159,28,0.18)",
      borderWidth: 1,
      borderColor: theme.isDark ? "rgba(255,209,102,0.26)" : "rgba(180,83,9,0.14)",
    },
    balancePill: {
      minHeight: 36,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      paddingHorizontal: 12,
      borderRadius: 18,
      backgroundColor: theme.surfaceHigh,
      borderWidth: 1,
      borderColor: theme.border,
    },
    balanceText: {
      color: theme.textPrimary,
      fontSize: 13,
      lineHeight: 17,
      letterSpacing: 0,
      ...fonts.semibold,
    },
    eyebrow: {
      color: theme.textSecondary,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0,
      textTransform: "uppercase",
      ...fonts.bold,
    },
    title: {
      color: theme.textPrimary,
      fontSize: 32,
      lineHeight: 38,
      letterSpacing: 0,
      ...fonts.bold,
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      letterSpacing: 0,
      ...fonts.regular,
    },
    proStrip: {
      minHeight: 46,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 14,
      borderRadius: 8,
      backgroundColor: theme.isDark ? "rgba(255,209,102,0.12)" : "rgba(255,209,102,0.26)",
      borderWidth: 1,
      borderColor: theme.isDark ? "rgba(255,209,102,0.22)" : "rgba(180,83,9,0.12)",
    },
    proStripText: {
      flex: 1,
      color: theme.textPrimary,
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0,
      ...fonts.semibold,
    },
    progressCard: {
      gap: 18,
      padding: 16,
      borderRadius: 8,
      backgroundColor: theme.surfaceCard,
      borderWidth: 1,
      borderColor: theme.border,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    sectionTitle: {
      color: theme.textPrimary,
      fontSize: 17,
      lineHeight: 22,
      letterSpacing: 0,
      ...fonts.bold,
    },
    progressCount: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0,
      fontVariant: ["tabular-nums"],
      ...fonts.semibold,
    },
    dayRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 5,
    },
    dayItem: {
      flex: 1,
      alignItems: "center",
      gap: 8,
      minWidth: 0,
    },
    dayNode: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceHigh,
    },
    day7Node: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    dayNodeDone: {
      backgroundColor: "#22C55E",
      borderColor: "#22C55E",
    },
    dayNodeCurrent: {
      backgroundColor: "#FFD166",
      borderColor: "#FF9F1C",
    },
    dayNodeLocked: {
      backgroundColor: theme.surfaceMuted,
    },
    dayLabel: {
      color: theme.textSecondary,
      fontSize: 10,
      lineHeight: 12,
      textAlign: "center",
      letterSpacing: 0,
      ...fonts.semibold,
    },
    day7Label: {
      color: theme.isDark ? "#FFD166" : "#92400E",
    },
    claimButton: {
      minHeight: 56,
      borderRadius: 8,
      overflow: "hidden",
      boxShadow: theme.isDark ? "0px 16px 34px rgba(255,159,28,0.18)" : "0px 16px 34px rgba(180,83,9,0.20)",
    },
    claimButtonDisabled: {
      boxShadow: "0px 8px 18px rgba(0,0,0,0.05)",
    },
    claimGradient: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingHorizontal: 16,
    },
    claimText: {
      color: "#1A1300",
      fontSize: 15,
      lineHeight: 20,
      textAlign: "center",
      letterSpacing: 0,
      ...fonts.bold,
    },
    claimTextDisabled: {
      color: theme.textSecondary,
    },
    infoGrid: {
      gap: 12,
    },
    infoCard: {
      gap: 8,
      padding: 16,
      borderRadius: 8,
      backgroundColor: theme.surfaceCard,
      borderWidth: 1,
      borderColor: theme.border,
    },
    infoTitle: {
      color: theme.textPrimary,
      fontSize: 15,
      lineHeight: 20,
      letterSpacing: 0,
      ...fonts.bold,
    },
    infoBody: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      letterSpacing: 0,
      ...fonts.regular,
    },
  });
}
