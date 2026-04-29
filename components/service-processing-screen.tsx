import {type Theme, useTheme} from "@/styles/theme";
import {Image} from "expo-image";
import {LinearGradient} from "expo-linear-gradient";
import {useRouter} from "expo-router";
import {Rocket} from "lucide-react-native";
import {AnimatePresence, MotiView} from "moti";
import {memo, useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {LayoutChangeEvent, StyleSheet, Text, View, useWindowDimensions} from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {DS, GLOBAL_VERTICAL_GAP} from "../lib/design-system";
import {spacing} from "../styles/spacing";
import {fonts} from "../styles/typography";

import {LuxPressable} from "./lux-pressable";
import {useWorkspaceDraft} from "./workspace-context";

const pointerClassName = "cursor-pointer";
const PROGRESS_INTERVAL_MS = 500;
const PROGRESS_MAX = 0.94;
const PROGRESS_EASING = 0.08;
const STATUS_ROTATION_MS = 3_000;
const GENERATION_PROGRESS_COLOR = DS.colors.accent;
const SCAN_DURATION_MS = 1_700;
const SCAN_LINE_HEIGHT = 44;
const SCAN_TRACK_INSET = 12;
const SCAN_LINE_CORE_HEIGHT = 3;
const SCAN_STATUS_FALLBACK = "Analyzing spatial geometry...";

type ServiceProcessingScreenProps = {
  imageUri?: string | null;
  resultImageUri?: string | null;
  subtitlePhrases?: readonly string[];
  title?: string;
  etaLabel?: string | null;
  previewLabel?: string;
  scanDurationMs?: number;
  onCancel: () => void;
  cancelDisabled?: boolean;
  complete?: boolean;
};

export const ServiceProcessingScreen = memo(function ServiceProcessingScreen({
  imageUri,
  resultImageUri,
  subtitlePhrases,
  title,
  etaLabel,
  previewLabel,
  scanDurationMs = SCAN_DURATION_MS,
  onCancel,
  cancelDisabled = false,
  complete = false,
}: ServiceProcessingScreenProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { draft } = useWorkspaceDraft();
  const defaultSubtitlePhrases = useMemo(
    () => [
      t("processing.status.analyzingGeometry"),
      t("processing.status.identifyingSurfaces"),
      t("processing.status.applyingStyle"),
      t("processing.status.renderingMaterials"),
      t("processing.status.addingDetails"),
      t("processing.status.almostReady"),
    ],
    [i18n.language, t],
  );
  const [subtitleIndex, setSubtitleIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [previewHeight, setPreviewHeight] = useState(0);
  const previewImageUri = draft.image?.uri ?? imageUri ?? null;
  const revealedImageUri = resultImageUri ?? null;
  const activeSubtitlePhrases = subtitlePhrases ?? defaultSubtitlePhrases;
  const scanProgress = useSharedValue(0);
  const scanOpacity = useSharedValue(1);
  const beforeOpacity = useSharedValue(1);
  const afterOpacity = useSharedValue(0);
  const hasRevealedResult = Boolean(revealedImageUri);

  const subtitleSignature = activeSubtitlePhrases.join("|");
  const activeSubtitle = useMemo(
    () => activeSubtitlePhrases[subtitleIndex % Math.max(activeSubtitlePhrases.length, 1)] ?? t("processing.status.renderingFinalLighting"),
    [activeSubtitlePhrases, subtitleIndex, t],
  );
  const resolvedTitle = title?.trim() || t("processing.title");
  const resolvedPreviewLabel = previewLabel?.trim() || t("workspace.editor.sourcePhoto");
  const scanStatusMessage = activeSubtitle?.trim() || SCAN_STATUS_FALLBACK;
  const handleSpeedUp = () => {
    router.push({
      pathname: "/paywall",
      params: {
        source: "generation-speed-up",
      },
    } as any);
  };

  const handlePreviewLayout = (event: LayoutChangeEvent) => {
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    if (nextHeight > 0 && nextHeight !== previewHeight) {
      setPreviewHeight(nextHeight);
    }
  };

  useEffect(() => {
    setSubtitleIndex(0);
    if (hasRevealedResult) {
      return;
    }

    const interval = setInterval(() => {
      setSubtitleIndex((current) => Math.min(current + 1, Math.max(activeSubtitlePhrases.length - 1, 0)));
    }, STATUS_ROTATION_MS);

    return () => clearInterval(interval);
  }, [activeSubtitlePhrases.length, hasRevealedResult, subtitleSignature]);

  useEffect(() => {
    setProgress(0);
    if (hasRevealedResult) {
      setProgress(1);
      return;
    }

    const interval = setInterval(() => {
      setProgress((current) => {
        if (current >= PROGRESS_MAX) {
          return current;
        }
        const remaining = PROGRESS_MAX - current;
        return Math.min(current + remaining * PROGRESS_EASING, PROGRESS_MAX);
      });
    }, PROGRESS_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [hasRevealedResult]);

  useEffect(() => {
    if (!hasRevealedResult) {
      scanOpacity.value = withTiming(1, { duration: 180 });
      beforeOpacity.value = withTiming(1, { duration: 180 });
      afterOpacity.value = withTiming(0, { duration: 180 });
      return;
    }

    setSubtitleIndex(Math.max(activeSubtitlePhrases.length - 1, 0));
    setProgress(1);
    scanOpacity.value = withTiming(0, { duration: 360, easing: Easing.out(Easing.cubic) });
    beforeOpacity.value = withTiming(complete ? 0.08 : 0.22, { duration: 420, easing: Easing.out(Easing.cubic) });
    afterOpacity.value = withTiming(1, { duration: 440, easing: Easing.out(Easing.cubic) });
  }, [activeSubtitlePhrases.length, afterOpacity, beforeOpacity, complete, hasRevealedResult, scanOpacity]);

  useEffect(() => {
    if (previewHeight <= 0 || hasRevealedResult) {
      cancelAnimation(scanProgress);
      return;
    }

    scanProgress.value = 0;
    scanProgress.value = withRepeat(
      withTiming(1, {
        duration: scanDurationMs,
        easing: Easing.linear,
      }),
      -1,
      true,
    );

    return () => {
      cancelAnimation(scanProgress);
    };
  }, [hasRevealedResult, previewHeight, scanDurationMs, scanProgress]);

  const scanLineStyle = useAnimatedStyle(() => {
    const halfLine = SCAN_LINE_HEIGHT / 2;
    const topEdge = -halfLine;
    const bottomEdge = Math.max(previewHeight - halfLine, topEdge);
    const translateY = interpolate(scanProgress.value, [0, 1], [topEdge, bottomEdge]);

    return {
      opacity: scanOpacity.value,
      transform: [{ translateY }],
    };
  });

  const beforeImageStyle = useAnimatedStyle(() => ({
    opacity: beforeOpacity.value,
  }));

  const afterImageStyle = useAnimatedStyle(() => ({
    opacity: afterOpacity.value,
  }));

  return (
    <View style={styles.screen}>
      <View style={[styles.content, { paddingTop: insets.top + 12 }]}>
        <View style={styles.hero}>
          <Text style={styles.title}>{resolvedTitle}</Text>
          <View style={styles.subtitleWrap}>
            <AnimatePresence>
              <MotiView
                key={activeSubtitle}
                from={{ opacity: 0, translateY: 12 }}
                animate={{ opacity: 1, translateY: 0 }}
                exit={{ opacity: 0, translateY: -12 }}
                transition={{ duration: 320, type: "timing" }}
              >
                <Text style={styles.subtitle}>{activeSubtitle}</Text>
              </MotiView>
            </AnimatePresence>
          </View>
        </View>

        <View style={styles.previewCard}>
          <Text style={styles.previewLabel}>{resolvedPreviewLabel}</Text>
          <View
            style={[styles.previewFrame, { height: Math.min(Math.max(width * 1.02, 320), height * 0.42) }]}
            onLayout={handlePreviewLayout}
          >
            {previewImageUri ? (
              <Animated.View style={[styles.imageLayer, beforeImageStyle]}>
                <Image source={{ uri: previewImageUri }} style={styles.previewImage} contentFit="contain" cachePolicy="memory-disk" transition={120} />
              </Animated.View>
            ) : (
              <View style={styles.photoFallback} />
            )}

            {revealedImageUri ? (
              <Animated.View style={[styles.imageLayer, afterImageStyle]}>
                <Image source={{ uri: revealedImageUri }} style={styles.previewImage} contentFit="cover" cachePolicy="memory-disk" transition={180} />
              </Animated.View>
            ) : null}

            <Animated.View style={[styles.scanSweepWrap, scanLineStyle]} pointerEvents="none">
              <LinearGradient
                colors={["rgba(255,255,255,0)", "rgba(34, 211, 238, 0.04)", "rgba(59, 130, 246, 0.12)", "rgba(255,255,255,0)"]}
                locations={[0, 0.2, 0.65, 1]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.scanTrail}
              />
              <View style={styles.scanSweepGlow} />
              <LinearGradient
                colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.92)", GENERATION_PROGRESS_COLOR, "rgba(255,255,255,0.96)", "rgba(255,255,255,0)"]}
                locations={[0, 0.16, 0.5, 0.84, 1]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.scanSweepCore}
              />
            </Animated.View>
          </View>
          <Text style={styles.scanStatus}>{scanStatusMessage}</Text>
        </View>

        <View style={styles.bottomContent}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(progress * 100, 2)}%` }]} />
          </View>

          <View style={styles.copyBlock}>
            <Text style={styles.eta}>{etaLabel?.trim() || t("processing.eta")}</Text>
          </View>

          {!hasRevealedResult ? (
            <LuxPressable
              onPress={handleSpeedUp}
              className={pointerClassName}
              pressableClassName={pointerClassName}
              style={styles.speedUpCta}
              glowColor="#3B82F6"
              scale={0.985}
            >
              <LinearGradient
                colors={["#0F172A", "#1D4ED8"]}
                start={{ x: 0, y: 0.2 }}
                end={{ x: 1, y: 0.8 }}
                style={styles.speedUpGradient}
              >
                <View style={styles.speedUpIconWrap}>
                  <Rocket color="#FFFFFF" size={18} strokeWidth={2.4} />
                </View>
                <View style={styles.speedUpCopy}>
                  <Text style={styles.speedUpTitle}>Speed Up</Text>
                  <Text style={styles.speedUpSubtitle}>Upgrade now for faster future renders</Text>
                </View>
              </LinearGradient>
            </LuxPressable>
          ) : null}
        </View>

        <LuxPressable
          onPress={onCancel}
          disabled={cancelDisabled}
          className={pointerClassName}
          pressableClassName={pointerClassName}
          style={[styles.cancelWrap, { paddingBottom: Math.max(insets.bottom + 8, 14) }]}
          glowColor={colors.surfaceHigh}
          scale={0.98}
        >
          <Text style={[styles.cancelText, cancelDisabled ? styles.cancelTextDisabled : null]}>
            {t("processing.cancelKeepCredit")}
          </Text>
        </LuxPressable>
      </View>
    </View>
  );
});

export function useGenerationStatusMessages() {
  const { t, i18n } = useTranslation();

  return useMemo(
    () => [
      t("processing.status.analyzingGeometry"),
      t("processing.status.identifyingSurfaces"),
      t("processing.status.applyingStyle"),
      t("processing.status.renderingMaterials"),
      t("processing.status.addingDetails"),
      t("processing.status.almostReady"),
    ],
    [i18n.language, t],
  );
}

function createStyles(colors: Theme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: "#FFFFFF",
    },
    photoFallback: {
      flex: 1,
      backgroundColor: colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    scanSweepWrap: {
      position: "absolute",
      left: SCAN_TRACK_INSET,
      right: SCAN_TRACK_INSET,
      height: SCAN_LINE_HEIGHT,
      justifyContent: "center",
    },
    content: {
      flex: 1,
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
    },
    hero: {
      alignItems: "flex-start",
      gap: spacing.sm,
      paddingTop: GLOBAL_VERTICAL_GAP,
    },
    previewCard: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: "rgba(12, 32, 74, 0.08)",
      backgroundColor: "#FFFFFF",
      padding: 16,
      gap: 12,
      shadowColor: "rgba(22, 55, 122, 0.22)",
      shadowOpacity: 0.1,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: 12 },
      elevation: 4,
      alignSelf: "center",
      width: "100%",
      maxWidth: 420,
      alignItems: "flex-start",
    },
    previewLabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontFamily: fonts.bold.fontFamily,
      fontWeight: fonts.bold.fontWeight,
      lineHeight: 14,
      letterSpacing: 1,
      textTransform: "uppercase",
      textAlign: "left",
    },
    previewFrame: {
      borderRadius: 24,
      overflow: "hidden",
      backgroundColor: "#0B1220",
      borderWidth: 1,
      borderColor: "rgba(37, 99, 235, 0.08)",
      width: "100%",
    },
    scanStatus: {
      color: "#475569",
      fontSize: 13,
      fontFamily: fonts.bold.fontFamily,
      fontWeight: fonts.bold.fontWeight,
      lineHeight: 18,
      textAlign: "left",
    },
    previewImage: {
      width: "100%",
      height: "100%",
    },
    imageLayer: {
      ...StyleSheet.absoluteFillObject,
    },
    bottomContent: {
      gap: spacing.md,
    },
    progressTrack: {
      height: 3,
      width: "100%",
      borderRadius: 2,
      backgroundColor: "rgba(37, 99, 235, 0.12)",
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 2,
      backgroundColor: GENERATION_PROGRESS_COLOR,
    },
    copyBlock: {
      alignItems: "flex-start",
    },
    speedUpCta: {
      borderRadius: 999,
      shadowColor: "#2563EB",
      shadowOpacity: 0.36,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    },
    speedUpGradient: {
      minHeight: 70,
      borderRadius: 999,
      paddingHorizontal: 18,
      paddingVertical: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderWidth: 1,
      borderColor: "rgba(191, 219, 254, 0.28)",
    },
    speedUpIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.16)",
    },
    speedUpCopy: {
      flex: 1,
      gap: 2,
    },
    speedUpTitle: {
      color: "#FFFFFF",
      fontSize: 15,
      fontFamily: fonts.bold.fontFamily,
      fontWeight: fonts.bold.fontWeight,
      lineHeight: 20,
      textAlign: "left",
    },
    speedUpSubtitle: {
      color: "rgba(255,255,255,0.82)",
      fontSize: 12,
      fontFamily: fonts.bold.fontFamily,
      fontWeight: fonts.bold.fontWeight,
      lineHeight: 17,
      textAlign: "left",
    },
    title: {
      color: "#0F172A",
      fontSize: 30,
      fontFamily: fonts.bold.fontFamily,
      fontWeight: fonts.bold.fontWeight,
      lineHeight: 36,
      letterSpacing: -0.8,
      textAlign: "left",
      maxWidth: 360,
    },
    subtitleWrap: {
      minHeight: 48,
      justifyContent: "center",
      alignItems: "flex-start",
    },
    subtitle: {
      color: "#334155",
      fontSize: 15,
      fontFamily: fonts.bold.fontFamily,
      fontWeight: fonts.bold.fontWeight,
      lineHeight: 22,
      textAlign: "left",
    },
    eta: {
      color: "#475569",
      fontSize: 13,
      fontFamily: fonts.bold.fontFamily,
      fontWeight: fonts.bold.fontWeight,
      lineHeight: 19,
      textAlign: "left",
    },
    cancelWrap: {
      alignSelf: "flex-start",
      paddingHorizontal: 0,
      paddingTop: spacing.xs,
    },
    cancelText: {
      color: "#64748B",
      fontSize: 12,
      fontFamily: fonts.bold.fontFamily,
      fontWeight: fonts.bold.fontWeight,
    },
    cancelTextDisabled: {
      color: colors.borderLight,
    },
    scanTrail: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 0,
      height: SCAN_LINE_HEIGHT,
      borderTopLeftRadius: 999,
      borderTopRightRadius: 999,
    },
    scanSweepGlow: {
      position: "absolute",
      left: 4,
      right: 4,
      top: (SCAN_LINE_HEIGHT - 12) / 2,
      height: 12,
      borderRadius: 999,
      backgroundColor: "rgba(56, 189, 248, 0.28)",
      shadowColor: "#22D3EE",
      shadowOpacity: 0.88,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 0 },
    },
    scanSweepCore: {
      position: "absolute",
      left: 0,
      right: 0,
      top: (SCAN_LINE_HEIGHT - SCAN_LINE_CORE_HEIGHT) / 2,
      height: SCAN_LINE_CORE_HEIGHT,
      borderRadius: 999,
      shadowColor: "#67E8F9",
      shadowOpacity: 0.96,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 0 },
    },
  });
}
