import {type Theme, useTheme} from "@/styles/theme";
import {Image} from "expo-image";
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

type ServiceProcessingScreenProps = {
  imageUri?: string | null;
  resultImageUri?: string | null;
  subtitlePhrases?: readonly string[];
  onCancel: () => void;
  cancelDisabled?: boolean;
  complete?: boolean;
};

export const ServiceProcessingScreen = memo(function ServiceProcessingScreen({
  imageUri,
  resultImageUri,
  subtitlePhrases,
  onCancel,
  cancelDisabled = false,
  complete = false,
}: ServiceProcessingScreenProps) {
  const { t, i18n } = useTranslation();
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

  const subtitleSignature = activeSubtitlePhrases.join("|");
  const activeSubtitle = useMemo(
    () => activeSubtitlePhrases[subtitleIndex % Math.max(activeSubtitlePhrases.length, 1)] ?? t("processing.status.renderingFinalLighting"),
    [activeSubtitlePhrases, subtitleIndex, t],
  );

  const handlePreviewLayout = (event: LayoutChangeEvent) => {
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    if (nextHeight > 0 && nextHeight !== previewHeight) {
      setPreviewHeight(nextHeight);
    }
  };

  useEffect(() => {
    setSubtitleIndex(0);
    const interval = setInterval(() => {
      setSubtitleIndex((current) => Math.min(current + 1, Math.max(activeSubtitlePhrases.length - 1, 0)));
    }, STATUS_ROTATION_MS);

    return () => clearInterval(interval);
  }, [activeSubtitlePhrases.length, subtitleSignature]);

  useEffect(() => {
    setProgress(0);

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
  }, []);

  useEffect(() => {
    if (!complete) {
      scanOpacity.value = withTiming(1, { duration: 180 });
      beforeOpacity.value = withTiming(1, { duration: 180 });
      afterOpacity.value = withTiming(0, { duration: 180 });
      return;
    }

    setSubtitleIndex(Math.max(activeSubtitlePhrases.length - 1, 0));
    setProgress(1);
    scanOpacity.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
    beforeOpacity.value = withTiming(revealedImageUri ? 0.18 : 1, { duration: 360, easing: Easing.out(Easing.cubic) });
    afterOpacity.value = withTiming(revealedImageUri ? 1 : 0, { duration: 420, easing: Easing.out(Easing.cubic) });
  }, [activeSubtitlePhrases.length, afterOpacity, beforeOpacity, complete, revealedImageUri, scanOpacity]);

  useEffect(() => {
    if (previewHeight <= 0 || complete) {
      cancelAnimation(scanProgress);
      return;
    }

    scanProgress.value = 0;
    scanProgress.value = withRepeat(
      withTiming(1, {
        duration: 1800,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      false,
    );

    return () => {
      cancelAnimation(scanProgress);
    };
  }, [complete, previewHeight, scanProgress]);

  const scanLineStyle = useAnimatedStyle(() => {
    const lineTravel = Math.max(previewHeight + 72, 0);
    const translateY = interpolate(scanProgress.value, [0, 1], [-36, lineTravel]);

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
          <Text style={styles.title}>{t("processing.title")}</Text>
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
          <Text style={styles.previewLabel}>{t("workspace.editor.sourcePhoto")}</Text>
          <View
            style={[styles.previewFrame, { height: Math.min(Math.max(width * 1.02, 320), height * 0.42) }]}
            onLayout={handlePreviewLayout}
          >
            {previewImageUri ? (
              <Animated.View style={[styles.imageLayer, beforeImageStyle]}>
                <Image source={{ uri: previewImageUri }} style={styles.previewImage} contentFit="cover" cachePolicy="memory-disk" transition={120} />
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
              <View style={styles.scanSweepBlur} />
              <View style={styles.scanSweepGlow} />
              <View style={styles.scanSweepCore} />
            </Animated.View>
          </View>
        </View>

        <View style={styles.bottomContent}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(progress * 100, 2)}%` }]} />
          </View>

          <View style={styles.copyBlock}>
            <Text style={styles.eta}>{t("processing.eta")}</Text>
          </View>
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
      left: 14,
      right: 14,
      height: 64,
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
    },
    previewLabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontFamily: fonts.regular.fontFamily,
      fontWeight: "700",
      lineHeight: 14,
      letterSpacing: 1,
      textTransform: "uppercase",
      textAlign: "left",
    },
    previewFrame: {
      borderRadius: 24,
      overflow: "hidden",
      backgroundColor: "#EFF4FF",
      borderWidth: 1,
      borderColor: "rgba(37, 99, 235, 0.08)",
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
    title: {
      color: "#0F172A",
      fontSize: 34,
      fontFamily: fonts.regular.fontFamily,
      fontWeight: "800",
      lineHeight: 40,
      letterSpacing: -0.8,
      textAlign: "left",
      maxWidth: 340,
    },
    subtitleWrap: {
      minHeight: 48,
      justifyContent: "center",
    },
    subtitle: {
      color: "#334155",
      fontSize: 17,
      fontFamily: fonts.regular.fontFamily,
      fontWeight: "700",
      lineHeight: 24,
      textAlign: "left",
    },
    eta: {
      color: "#475569",
      fontSize: 13,
      fontFamily: fonts.regular.fontFamily,
      fontWeight: "600",
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
      fontFamily: fonts.regular.fontFamily,
      fontWeight: "600",
    },
    cancelTextDisabled: {
      color: colors.borderLight,
    },
    scanSweepBlur: {
      position: "absolute",
      left: 0,
      right: 0,
      top: 8,
      height: 44,
      borderRadius: 999,
      backgroundColor: "rgba(37, 99, 235, 0.16)",
      shadowColor: "#2563EB",
      shadowOpacity: 0.34,
      shadowRadius: 26,
      shadowOffset: { width: 0, height: 10 },
    },
    scanSweepGlow: {
      position: "absolute",
      left: 8,
      right: 8,
      top: 20,
      height: 14,
      borderRadius: 999,
      backgroundColor: "rgba(59, 130, 246, 0.38)",
      shadowColor: "#2563EB",
      shadowOpacity: 0.55,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 0 },
    },
    scanSweepCore: {
      position: "absolute",
      left: 18,
      right: 18,
      top: 26,
      height: 4,
      borderRadius: 999,
      backgroundColor: "#2563EB",
      shadowColor: "#60A5FA",
      shadowOpacity: 0.9,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 0 },
    },
  });
}
