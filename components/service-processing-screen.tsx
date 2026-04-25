import { Image } from "expo-image";
import { AnimatePresence, MotiView } from "moti";
import { memo, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { fonts } from "../styles/typography";
import { spacing } from "../styles/spacing";
import { type Theme, useTheme } from "@/styles/theme";
import { DS } from "../lib/design-system";

import { LuxPressable } from "./lux-pressable";
import { useWorkspaceDraft } from "./workspace-context";

const pointerClassName = "cursor-pointer";
const PROGRESS_INTERVAL_MS = 500;
const PROGRESS_MAX = 0.94;
const PROGRESS_EASING = 0.08;
const STATUS_ROTATION_MS = 3_000;
const SHIMMER_DURATION_MS = 2_000;
const GENERATION_PROGRESS_COLOR = DS.colors.accent;

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
      return;
    }

    setSubtitleIndex(Math.max(activeSubtitlePhrases.length - 1, 0));
    setProgress(1);
  }, [activeSubtitlePhrases.length, complete]);

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
          <View style={[styles.previewFrame, { height: Math.min(Math.max(width * 1.02, 320), height * 0.42) }]}>
            {previewImageUri ? (
              <Image source={{ uri: previewImageUri }} style={styles.previewImage} contentFit="cover" cachePolicy="memory-disk" transition={120} />
            ) : (
              <View style={styles.photoFallback} />
            )}

            <MotiView
              animate={{ translateY: ["-18%", "116%"], opacity: [0, 0.88, 0] }}
              transition={{ duration: SHIMMER_DURATION_MS, loop: true, type: "timing" }}
              style={styles.scanSweepWrap}
              pointerEvents="none"
            >
              <View style={styles.scanSweep} />
            </MotiView>
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
      backgroundColor: "#F3F4F6",
      alignItems: "center",
      justifyContent: "center",
    },
    scanSweepWrap: {
      position: "absolute",
      left: 18,
      right: 18,
      height: 72,
      borderRadius: 999,
      backgroundColor: "rgba(37, 99, 235, 0.12)",
      shadowColor: "#2563EB",
      shadowOpacity: 0.16,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 6 },
    },
    scanSweep: {
      flex: 1,
      borderRadius: 999,
    },
    content: {
      flex: 1,
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
    },
    hero: {
      alignItems: "center",
      gap: spacing.sm,
      paddingTop: spacing.lg,
    },
    previewCard: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: "#ECEEF2",
      backgroundColor: "#FFFFFF",
      padding: 16,
      gap: 12,
      shadowColor: "#111827",
      shadowOpacity: 0.05,
      shadowRadius: 22,
      shadowOffset: { width: 0, height: 10 },
      elevation: 3,
    },
    previewLabel: {
      color: "#9CA3AF",
      fontSize: 11,
      fontFamily: fonts.regular.fontFamily,
      fontWeight: "700",
      lineHeight: 14,
      letterSpacing: 1,
      textTransform: "uppercase",
      textAlign: "center",
    },
    previewFrame: {
      borderRadius: 24,
      overflow: "hidden",
      backgroundColor: "#ECEEF2",
    },
    previewImage: {
      width: "100%",
      height: "100%",
    },
    bottomContent: {
      gap: spacing.md,
    },
    progressTrack: {
      height: 3,
      width: "100%",
      borderRadius: 2,
      backgroundColor: "#E5E7EB",
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 2,
      backgroundColor: GENERATION_PROGRESS_COLOR,
    },
    copyBlock: {
      alignItems: "center",
    },
    title: {
      color: "#111111",
      fontSize: 34,
      fontFamily: fonts.regular.fontFamily,
      fontWeight: "800",
      lineHeight: 40,
      letterSpacing: -0.8,
      textAlign: "center",
      maxWidth: 340,
    },
    subtitleWrap: {
      minHeight: 48,
      justifyContent: "center",
    },
    subtitle: {
      color: "#687076",
      fontSize: 17,
      fontFamily: fonts.regular.fontFamily,
      fontWeight: "700",
      lineHeight: 24,
      textAlign: "center",
    },
    eta: {
      color: "#687076",
      fontSize: 13,
      fontFamily: fonts.regular.fontFamily,
      fontWeight: "600",
      lineHeight: 19,
      textAlign: "center",
    },
    cancelWrap: {
      alignSelf: "center",
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.xs,
    },
    cancelText: {
      color: "#687076",
      fontSize: 12,
      fontFamily: fonts.regular.fontFamily,
      fontWeight: "600",
    },
    cancelTextDisabled: {
      color: "#B0B7C3",
    },
  });
}
