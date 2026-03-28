import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { AnimatePresence, MotiView } from "moti";
import { memo, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SERVICE_WIZARD_THEME } from "../lib/service-wizard-theme";
import { LuxPressable } from "./lux-pressable";

const pointerClassName = "cursor-pointer";
const PROGRESS_DURATION_MS = 15_000;
const PROGRESS_MAX = 0.95;
const SUBTITLE_ROTATION_MS = 3_000;
const SHIMMER_DURATION_MS = 2_000;

type ServiceProcessingScreenProps = {
  imageUri?: string | null;
  subtitlePhrases: string[];
  onCancel: () => void;
  cancelDisabled?: boolean;
};

export const ServiceProcessingScreen = memo(function ServiceProcessingScreen({
  imageUri,
  subtitlePhrases,
  onCancel,
  cancelDisabled = false,
}: ServiceProcessingScreenProps) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [subtitleIndex, setSubtitleIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const subtitleSignature = subtitlePhrases.join("|");
  const activeSubtitle = useMemo(
    () => subtitlePhrases[subtitleIndex % Math.max(subtitlePhrases.length, 1)] ?? "Rendering final lighting...",
    [subtitleIndex, subtitlePhrases],
  );

  useEffect(() => {
    setSubtitleIndex(0);
    const interval = setInterval(() => {
      setSubtitleIndex((current) => (current + 1) % Math.max(subtitlePhrases.length, 1));
    }, SUBTITLE_ROTATION_MS);

    return () => clearInterval(interval);
  }, [subtitleSignature]);

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

  return (
    <View style={styles.screen}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.photoImage} contentFit="cover" transition={180} />
      ) : (
        <View style={styles.photoFallback} />
      )}

      <LinearGradient
        colors={["rgba(0,0,0,0.04)", "rgba(0,0,0,0.14)", "rgba(0,0,0,0.42)", "rgba(0,0,0,0.85)"]}
        locations={[0, 0.28, 0.58, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <MotiView
        animate={{ translateX: [-width * 0.8, width * 0.92] }}
        transition={{ duration: SHIMMER_DURATION_MS, loop: true, type: "timing" }}
        style={[styles.scanSweepWrap, { top: -height * 0.12, height: height * 1.18 }]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.03)", "rgba(124,58,237,0.18)", "rgba(255,255,255,0.03)", "rgba(255,255,255,0)"]}
          locations={[0, 0.22, 0.5, 0.78, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.scanSweep}
        />
      </MotiView>

      <View style={[styles.content, { paddingTop: insets.top + 12 }]}>
        <View style={styles.bottomContent}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(progress * 100, 2)}%` }]} />
          </View>

          <View style={styles.copyBlock}>
            <Text style={styles.title}>AI is crafting your masterpiece...</Text>
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
            <Text style={styles.eta}>Usually ready in ~15 seconds</Text>
          </View>
        </View>

        <LuxPressable
          onPress={onCancel}
          disabled={cancelDisabled}
          className={pointerClassName}
          pressableClassName={pointerClassName}
          style={[styles.cancelWrap, { paddingBottom: Math.max(insets.bottom + 8, 14) }]}
          glowColor="rgba(255,255,255,0.02)"
          scale={0.98}
        >
          <Text style={[styles.cancelText, cancelDisabled ? styles.cancelTextDisabled : null]}>
            Cancel and keep my credit
          </Text>
        </LuxPressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SERVICE_WIZARD_THEME.colors.background,
  },
  photoImage: {
    ...StyleSheet.absoluteFillObject,
  },
  photoFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#050506",
  },
  scanSweepWrap: {
    position: "absolute",
    width: 220,
    opacity: 0.75,
    transform: [{ skewX: "-12deg" }],
  },
  scanSweep: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 24,
  },
  bottomContent: {
    gap: 18,
    paddingBottom: 28,
  },
  progressTrack: {
    height: 3,
    width: "100%",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#7C3AED",
  },
  copyBlock: {
    gap: 12,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 34,
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
    color: "#E4E4E7",
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 24,
    textAlign: "left",
  },
  eta: {
    color: "rgba(212,212,216,0.72)",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
    textAlign: "left",
  },
  cancelWrap: {
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingTop: 4,
  },
  cancelText: {
    color: "rgba(161,161,170,0.9)",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  cancelTextDisabled: {
    color: "rgba(113,113,122,0.76)",
  },
});
