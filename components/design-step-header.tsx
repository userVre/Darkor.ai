import { ArrowLeft, X } from "@/components/material-icons";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DiamondCreditPill } from "./diamond-credit-pill";
import { fonts } from "../styles/typography";

type DesignStepHeaderProps = {
  creditCount?: number;
  step: number;
  totalSteps: number;
  horizontalInset: number;
  onBack?: () => void;
  onClose: () => void;
  backAccessibilityLabel?: string;
  closeAccessibilityLabel?: string;
};

const DESIGN_HEADER_TOP_PADDING = 2;
const DESIGN_HEADER_BOTTOM_PADDING = 10;
const DESIGN_HEADER_ROW_HEIGHT = 44;
const DESIGN_HEADER_PROGRESS_HEIGHT = 4;
const DESIGN_HEADER_PROGRESS_SEGMENT_GAP = 10;
const DESIGN_HEADER_PROGRESS_GAP = 12;
const DESIGN_HEADER_CONTENT_GAP = 0;
const DESIGN_HEADER_SIDE_SLOT_WIDTH = 120;
const DESIGN_HEADER_ACTION_SIZE = 44;

export function getDesignStepHeaderMetrics(topInset: number) {
  const safeTop = Platform.OS === "android" ? Math.max(topInset, 12) : Math.max(topInset, 16);
  const rowTop = safeTop + DESIGN_HEADER_TOP_PADDING;
  const rowBottom = rowTop + DESIGN_HEADER_ROW_HEIGHT;
  const progressTop = rowBottom + DESIGN_HEADER_PROGRESS_GAP;
  const progressBottom = progressTop + DESIGN_HEADER_PROGRESS_HEIGHT;
  const height = progressBottom + DESIGN_HEADER_BOTTOM_PADDING;

  return {
    height,
    progressTop,
    rowTop,
    safeTop,
    contentOffset: height + DESIGN_HEADER_CONTENT_GAP,
  };
}

export function DesignStepHeader({
  creditCount,
  step,
  totalSteps,
  horizontalInset,
  onBack,
  onClose,
  backAccessibilityLabel = "Go back",
  closeAccessibilityLabel = "Close",
}: DesignStepHeaderProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const metrics = getDesignStepHeaderMetrics(insets.top);
  const safeStep = Math.max(1, Math.min(step, totalSteps));
  const showCredits = safeStep === 1;
  const showBack = safeStep > 1 && Boolean(onBack);

  return (
    <View pointerEvents="box-none" style={[styles.shell, { height: metrics.height }]}>
      <View
        style={[
          styles.progressRow,
          {
            top: metrics.progressTop,
            left: horizontalInset,
            right: horizontalInset,
          },
        ]}
        >
        {Array.from({ length: totalSteps }).map((_, index) => (
          <View
            key={`design-step-progress-${index}`}
            style={[
              styles.progressSegment,
              {
                backgroundColor: index < safeStep ? "#0A0A0A" : "#E0E0E0",
              },
            ]}
          />
        ))}
      </View>

      <View
        pointerEvents="box-none"
        style={[
          styles.headerRow,
          {
            top: metrics.rowTop,
            left: horizontalInset,
            right: horizontalInset,
          },
        ]}
      >
        <View style={styles.leftSlot}>
          {showCredits ? (
            <DiamondCreditPill
              accessibilityLabel="Return to Tools"
              count={creditCount ?? 0}
              onPress={onClose}
              variant="dark"
            />
          ) : showBack ? (
            <Pressable
              accessibilityLabel={backAccessibilityLabel}
              accessibilityRole="button"
              hitSlop={10}
              onPress={onBack}
              style={styles.iconButton}
            >
              <ArrowLeft color="#0A0A0A" size={18} strokeWidth={2.4} style={styles.backIcon} />
            </Pressable>
          ) : null}
        </View>

        <View pointerEvents="none" style={styles.centerSlot}>
          <Text style={styles.stepText}>{t("common.labels.step", { current: safeStep, total: totalSteps })}</Text>
        </View>

        <View style={styles.rightSlot}>
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
  },
  headerRow: {
    position: "absolute",
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    minHeight: DESIGN_HEADER_ROW_HEIGHT,
    justifyContent: "space-between",
  },
  leftSlot: {
    width: DESIGN_HEADER_SIDE_SLOT_WIDTH,
    height: DESIGN_HEADER_ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  rightSlot: {
    width: DESIGN_HEADER_SIDE_SLOT_WIDTH,
    height: DESIGN_HEADER_ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  centerSlot: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    color: "#0A0A0A",
    fontSize: 13,
    lineHeight: 16,
    textAlign: "center",
    ...fonts.semibold,
  },
  iconButton: {
    width: DESIGN_HEADER_ACTION_SIZE,
    height: DESIGN_HEADER_ACTION_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    transform: [{ translateX: 1.5 }],
  },
  progressRow: {
    position: "absolute",
    zIndex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: DESIGN_HEADER_PROGRESS_SEGMENT_GAP,
  },
  progressSegment: {
    flex: 1,
    height: DESIGN_HEADER_PROGRESS_HEIGHT,
    borderRadius: 999,
  },
});

