import { Image } from "expo-image";
import { AnimatePresence, MotiView } from "moti";
import { memo, useEffect, useMemo, useState } from "react";
import { Image as NativeImage, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { fonts } from "../styles/typography";
import { spacing } from "../styles/spacing";
import { type Theme, useTheme } from "@/styles/theme";

import { LuxPressable } from "./lux-pressable";
import { useWorkspaceDraft } from "./workspace-context";

const pointerClassName = "cursor-pointer";
const PROGRESS_DURATION_MS = 15_000;
const PROGRESS_MAX = 0.9;
const STATUS_ROTATION_MS = 3_000;
const SHIMMER_DURATION_MS = 2_000;
const GENERATION_PROGRESS_COLOR = "#CC3333";

type ServiceProcessingScreenProps = {
  imageUri?: string | null;
  subtitlePhrases?: readonly string[];
  onCancel: () => void;
  cancelDisabled?: boolean;
  complete?: boolean;
};

export const ServiceProcessingScreen = memo(function ServiceProcessingScreen({
  imageUri,
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
  const previewImageUri = draft.image?.uri ?? imageUri ?? null;
  const activeSubtitlePhrases = subtitlePhrases ?? defaultSubtitlePhrases;

  const subtitleSignature = activeSubtitlePhrases.join("|");
  const activeSubtitle = useMemo(
    () => activeSubtitlePhrases[subtitleIndex % Math.max(activeSubtitlePhrases.length, 1)] ?? t("processing.status.renderingFinalLighting"),
    [activeSubtitlePhrases, subtitleIndex, t],
  );

  useEffect(() => {
    setSubtitleIndex(0);
    const interval = setInterval(() => {
      setSubtitleIndex((current) => Math.min(current + 1, Math.max(activeSubtitlePhrases.length - 1, 0)));
    }, STATUS_ROTATION_MS);

    return () => clearInterval(interval);
  }, [activeSubtitlePhrases.length, subtitleSignature]);

  useEffect(() => {
    const startedAt = Date.now();
    setProgress(0);

    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const nextProgress = Math.min((elapsed / PROGRESS_DURATION_MS) * PROGRESS_MAX, PROGRESS_MAX);
      setProgress(nextProgress);
    }, 120);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!complete) {
      return;
    }

    setSubtitleIndex(Math.max(activeSubtitlePhrases.length - 1, 0));
    setProgress(1);
  }, [activeSubtitlePhrases.length, complete]);

  return (
    <View style={styles.screen}>
      {previewImageUri ? (
        <NativeImage source={{ uri: previewImageUri }} style={[styles.photoImage, { width, height }]} resizeMode="cover" />
      ) : (
        <View style={styles.photoFallback} />
      )}

      <View style={styles.photoOverlay} />

      <MotiView
        animate={{ translateX: [-width * 0.8, width * 0.92] }}
        transition={{ duration: SHIMMER_DURATION_MS, loop: true, type: "timing" }}
        style={[styles.scanSweepWrap, { top: -height * 0.12, height: height * 1.18 }]}
        pointerEvents="none"
      >
        <View style={styles.scanSweep} />
      </MotiView>

      <View style={[styles.content, { paddingTop: insets.top + 12 }]}>
        <View style={styles.bottomContent}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(progress * 100, 2)}%` }]} />
          </View>

          <View style={styles.copyBlock}>
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
      backgroundColor: colors.bg,
    },
    photoImage: {
      ...StyleSheet.absoluteFillObject,
    },
    photoFallback: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.surface,
    },
    photoOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.surfaceOverlay,
    },
    scanSweepWrap: {
      position: "absolute",
      width: 220,
      opacity: 0.75,
      transform: [{ skewX: "-12deg" }],
    },
    scanSweep: {
      flex: 1,
      backgroundColor: colors.brandSurface,
    },
    content: {
      flex: 1,
      justifyContent: "flex-end",
      paddingHorizontal: spacing.lg,
    },
    bottomContent: {
      gap: spacing.md,
      paddingBottom: spacing.lg,
    },
    progressTrack: {
      height: 3,
      width: "100%",
      borderRadius: 2,
      backgroundColor: colors.borderLight,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 2,
      backgroundColor: GENERATION_PROGRESS_COLOR,
    },
    copyBlock: {
      gap: spacing.sm,
    },
    title: {
      color: colors.textPrimary,
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
      color: colors.textSecondary,
      fontSize: 17,
      fontFamily: fonts.regular.fontFamily,
      fontWeight: "700",
      lineHeight: 24,
      textAlign: "left",
    },
    eta: {
      color: colors.textSecondary,
      fontSize: 13,
      fontFamily: fonts.regular.fontFamily,
      fontWeight: "600",
      lineHeight: 19,
      textAlign: "left",
    },
    cancelWrap: {
      alignSelf: "center",
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.xs,
    },
    cancelText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontFamily: fonts.regular.fontFamily,
      fontWeight: "600",
    },
    cancelTextDisabled: {
      color: colors.textMuted,
    },
  });
}
