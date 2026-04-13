import { ArrowLeft, X } from "@/components/material-icons";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DiamondCreditPill } from "./diamond-credit-pill";
import { StepProgressLine } from "./step-progress-line";
import { fonts } from "../styles/typography";

type DesignStepHeaderProps = {
  title?: string;
  creditCount?: number;
  step: number;
  totalSteps: number;
  horizontalInset: number;
  onBack?: () => void;
  onClose: () => void;
  backAccessibilityLabel?: string;
  closeAccessibilityLabel?: string;
};

const DESIGN_HEADER_TOP_PADDING = 4;
const DESIGN_HEADER_BOTTOM_PADDING = 14;
const DESIGN_HEADER_ROW_HEIGHT = 52;
const DESIGN_HEADER_PROGRESS_HEIGHT = 2;
const DESIGN_HEADER_PROGRESS_GAP = 10;
const DESIGN_HEADER_CONTENT_GAP = 0;
const DESIGN_HEADER_ACTION_SIZE = 40;

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
  title,
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
  const headerTitle = title ?? t("common.labels.step", { current: safeStep, total: totalSteps });
  const stepLabel = t("common.labels.step", { current: safeStep, total: totalSteps });

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.shell,
        {
          height: metrics.height,
          paddingTop: metrics.safeTop + DESIGN_HEADER_TOP_PADDING,
          paddingHorizontal: horizontalInset,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleCluster}>
          {showBack ? (
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

          <View style={styles.titleStack}>
            <Text numberOfLines={1} style={styles.titleText}>
              {headerTitle}
            </Text>
            {title ? (
              <Text numberOfLines={1} style={styles.stepText}>
                {stepLabel}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.rightSlot}>
          {showCredits ? (
            <DiamondCreditPill
              accessibilityLabel="Return to Tools"
              count={creditCount ?? 0}
              onPress={onClose}
              style={styles.creditPill}
              variant="dark"
            />
          ) : null}

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

      <StepProgressLine
        fillColor="#0A0A0A"
        progress={safeStep / totalSteps}
        style={styles.progressLine}
        trackColor="#E7EBEF"
      />
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
    flexDirection: "row",
    alignItems: "center",
    minHeight: DESIGN_HEADER_ROW_HEIGHT,
    justifyContent: "space-between",
  },
  titleCluster: {
    flex: 1,
    minHeight: DESIGN_HEADER_ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rightSlot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "flex-end",
  },
  titleStack: {
    flex: 1,
    justifyContent: "center",
  },
  titleText: {
    color: "#0A0A0A",
    fontSize: 18,
    lineHeight: 22,
    ...fonts.bold,
  },
  stepText: {
    color: "#6D7682",
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.4,
    ...fonts.semibold,
  },
  iconButton: {
    width: DESIGN_HEADER_ACTION_SIZE,
    height: DESIGN_HEADER_ACTION_SIZE,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E8EC",
    backgroundColor: "#F7F8FA",
  },
  backIcon: {
    transform: [{ translateX: 1.5 }],
  },
  creditPill: {
    minHeight: 36,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  progressLine: {
    marginTop: DESIGN_HEADER_PROGRESS_GAP,
    height: DESIGN_HEADER_PROGRESS_HEIGHT,
  },
});

