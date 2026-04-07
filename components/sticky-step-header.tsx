import { ArrowLeft, X } from "@/components/material-icons";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DiamondCreditPill } from "./diamond-credit-pill";
import { fonts } from "../styles/typography";

export const STICKY_STEP_HEADER_CONTENT_GAP = 32;

const HEADER_TOP_PADDING = 6;
const HEADER_BOTTOM_PADDING = 12;
const HEADER_ROW_HEIGHT = 44;
const HEADER_PROGRESS_GAP = 26;
const HEADER_PROGRESS_HEIGHT = 4;
const HEADER_PROGRESS_SEGMENT_GAP = 10;

type StickyStepHeaderProps = {
  creditCount?: number;
  step: number;
  totalSteps: number;
  horizontalInset?: number;
  onBack?: () => void;
  onClose: () => void;
  backAccessibilityLabel?: string;
  closeAccessibilityLabel?: string;
};

export function getStickyStepHeaderMetrics(topInset: number) {
  const safeTop = Platform.OS === "android" ? Math.max(topInset, 44) : Math.max(topInset, 20);
  const height =
    safeTop +
    HEADER_TOP_PADDING +
    HEADER_ROW_HEIGHT +
    HEADER_PROGRESS_GAP +
    HEADER_PROGRESS_HEIGHT +
    HEADER_BOTTOM_PADDING;

  return {
    height,
    safeTop,
    contentOffset: height + STICKY_STEP_HEADER_CONTENT_GAP,
  };
}

export function StickyStepHeader({
  creditCount = 0,
  step,
  totalSteps,
  horizontalInset = 20,
  onBack,
  onClose,
  backAccessibilityLabel = "Go back",
  closeAccessibilityLabel = "Close",
}: StickyStepHeaderProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const metrics = getStickyStepHeaderMetrics(insets.top);
  const safeStep = Math.max(1, Math.min(step, totalSteps));
  const showCredits = safeStep === 1;
  const showBack = safeStep > 1 && Boolean(onBack);

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.shell,
        {
          height: metrics.height,
          paddingTop: metrics.safeTop + HEADER_TOP_PADDING,
        },
      ]}
    >
      <View style={[styles.inner, { paddingHorizontal: horizontalInset }]}>
        <View style={styles.row}>
          <View style={styles.leftGroup}>
            {showBack ? (
              <Pressable
                accessibilityLabel={backAccessibilityLabel}
                accessibilityRole="button"
                hitSlop={10}
                onPress={onBack}
                style={styles.iconButton}
              >
                <ArrowLeft color="#0A0A0A" size={18} strokeWidth={2.3} />
              </Pressable>
            ) : null}

            {showCredits ? <DiamondCreditPill count={creditCount} variant="light" /> : null}
          </View>

          <View pointerEvents="none" style={styles.stepOverlay}>
            <Text style={styles.stepText}>{t("common.labels.step", { current: safeStep, total: totalSteps })}</Text>
          </View>

          <View style={styles.rightGroup}>
            <Pressable
              accessibilityLabel={closeAccessibilityLabel}
              accessibilityRole="button"
              hitSlop={10}
              onPress={onClose}
              style={styles.iconButton}
            >
              <X color="#0A0A0A" size={20} strokeWidth={2.3} />
            </Pressable>
          </View>
        </View>

        <View style={styles.progressRow}>
          {Array.from({ length: totalSteps }).map((_, index) => (
            <View
              key={`sticky-step-progress-${index}`}
              style={[
                styles.progressSegment,
                {
                  backgroundColor: index < safeStep ? "#0A0A0A" : "#E0E0E0",
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  inner: {
    gap: HEADER_PROGRESS_GAP,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: HEADER_ROW_HEIGHT,
    justifyContent: "space-between",
  },
  leftGroup: {
    minHeight: HEADER_ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 116,
  },
  rightGroup: {
    minHeight: HEADER_ROW_HEIGHT,
    alignItems: "flex-end",
    justifyContent: "center",
    minWidth: 44,
  },
  stepOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    color: "#0A0A0A",
    fontSize: 14,
    lineHeight: 18,
    textAlign: "center",
    ...fonts.semibold,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: HEADER_PROGRESS_SEGMENT_GAP,
    minHeight: HEADER_PROGRESS_HEIGHT,
  },
  progressSegment: {
    flex: 1,
    height: HEADER_PROGRESS_HEIGHT,
    borderRadius: 999,
  },
});

