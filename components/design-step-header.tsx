import { ArrowLeft, Diamond, X } from "@/components/material-icons";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

const DESIGN_HEADER_TOP_PADDING = 12;
const DESIGN_HEADER_ROW_HEIGHT = 44;
const DESIGN_HEADER_PROGRESS_HEIGHT = 4;
const DESIGN_HEADER_PROGRESS_SEGMENT_GAP = 10;
const DESIGN_HEADER_ROW_TO_TITLE_GAP = 20;
const DESIGN_HEADER_PROGRESS_TO_TITLE_GAP = 32;
const DESIGN_HEADER_PROGRESS_BOTTOM_OFFSET =
  DESIGN_HEADER_PROGRESS_TO_TITLE_GAP - DESIGN_HEADER_ROW_TO_TITLE_GAP;

export function getDesignStepHeaderMetrics(topInset: number) {
  const safeTop = Platform.OS === "android" ? Math.max(topInset, 44) : Math.max(topInset, 20);
  const rowTop = safeTop + DESIGN_HEADER_TOP_PADDING;
  const rowBottom = rowTop + DESIGN_HEADER_ROW_HEIGHT;
  const progressTop =
    rowBottom - DESIGN_HEADER_PROGRESS_BOTTOM_OFFSET - DESIGN_HEADER_PROGRESS_HEIGHT;

  return {
    height: rowBottom,
    progressTop,
    rowTop,
    safeTop,
    contentOffset: rowBottom + DESIGN_HEADER_ROW_TO_TITLE_GAP,
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
  const insets = useSafeAreaInsets();
  const metrics = getDesignStepHeaderMetrics(insets.top);
  const isFirstStep = !onBack;
  const safeStep = Math.max(1, Math.min(step, totalSteps));

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
        <View style={[styles.sideSlot, styles.leftSlot]}>
          {isFirstStep ? (
            <View style={styles.creditBadge}>
              <Diamond color="#FFFFFF" size={13} strokeWidth={2.1} />
              <Text style={styles.creditText}>{creditCount ?? 0}</Text>
            </View>
          ) : (
            <Pressable
              accessibilityLabel={backAccessibilityLabel}
              accessibilityRole="button"
              hitSlop={10}
              onPress={onBack}
              style={styles.iconButton}
            >
              <ArrowLeft color="#0A0A0A" size={18} strokeWidth={2.4} />
            </Pressable>
          )}
        </View>

        <View style={styles.centerSlot}>
          <Text style={styles.stepText}>{`Step ${safeStep} / ${totalSteps}`}</Text>
        </View>

        <View style={[styles.sideSlot, styles.rightSlot]}>
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
  },
  sideSlot: {
    width: 88,
    minHeight: DESIGN_HEADER_ROW_HEIGHT,
    justifyContent: "center",
  },
  leftSlot: {
    alignItems: "flex-start",
  },
  rightSlot: {
    alignItems: "flex-end",
  },
  centerSlot: {
    flex: 1,
    minHeight: DESIGN_HEADER_ROW_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  creditBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "#0A0A0A",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  creditText: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 13,
    ...fonts.bold,
  },
  stepText: {
    color: "#0A0A0A",
    fontSize: 13,
    lineHeight: 16,
    textAlign: "center",
    ...fonts.semibold,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
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

