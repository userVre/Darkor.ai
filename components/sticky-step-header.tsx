import { ArrowLeft, X } from "@/components/material-icons";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DiamondCreditPill } from "./diamond-credit-pill";
import { StepProgressLine } from "./step-progress-line";
import { fonts } from "../styles/typography";

export const STICKY_STEP_HEADER_CONTENT_GAP = 0;

const HEADER_TOP_PADDING = 4;
const HEADER_BOTTOM_PADDING = 14;
const HEADER_ROW_HEIGHT = 52;
const HEADER_PROGRESS_GAP = 10;
const HEADER_PROGRESS_HEIGHT = 2;
const HEADER_ACTION_SIZE = 40;

type StickyStepHeaderProps = {
  title?: string;
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
  const safeTop = Platform.OS === "android" ? Math.max(topInset, 12) : Math.max(topInset, 16);
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
  title,
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
  const headerTitle = title ?? t("common.labels.step", { current: safeStep, total: totalSteps });
  const stepLabel = t("common.labels.step", { current: safeStep, total: totalSteps });

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
          <View style={styles.titleCluster}>
            {showBack ? (
              <Pressable
                accessibilityLabel={backAccessibilityLabel}
                accessibilityRole="button"
                hitSlop={10}
                onPress={onBack}
                style={styles.iconButton}
              >
                <ArrowLeft color="#0A0A0A" size={18} strokeWidth={2.3} style={styles.backIcon} />
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

          <View style={styles.rightGroup}>
            {showCredits ? (
              <DiamondCreditPill
                accessibilityLabel="Return to Tools"
                count={creditCount}
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
  inner: {
    gap: HEADER_PROGRESS_GAP,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: HEADER_ROW_HEIGHT,
    justifyContent: "space-between",
  },
  titleCluster: {
    flex: 1,
    minHeight: HEADER_ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "flex-end",
  },
  titleStack: {
    flex: 1,
    justifyContent: "center",
  },
  iconButton: {
    width: HEADER_ACTION_SIZE,
    height: HEADER_ACTION_SIZE,
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
  creditPill: {
    minHeight: 36,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  progressLine: {
    height: HEADER_PROGRESS_HEIGHT,
  },
});

