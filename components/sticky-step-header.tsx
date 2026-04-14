import { ArrowLeft, X } from "@/components/material-icons";
import { BlurView } from "expo-blur";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DS, GLASS_HEADER_CONTENT_GAP, ambientShadow, floatingButton, organicRadii } from "../lib/design-system";
import { DiamondCreditPill } from "./diamond-credit-pill";
import { StepProgressLine } from "./step-progress-line";

export const STICKY_STEP_HEADER_CONTENT_GAP = GLASS_HEADER_CONTENT_GAP;

const HEADER_TOP_PADDING = 4;
const HEADER_BOTTOM_PADDING = 14;
const HEADER_ROW_HEIGHT = 52;
const HEADER_PROGRESS_GAP = 12;
const HEADER_PROGRESS_HEIGHT = 4;
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
      <BlurView intensity={72} tint="light" style={[styles.inner, { marginHorizontal: horizontalInset }]}>
        <View style={styles.row}>
          <Pressable
            accessibilityLabel={closeAccessibilityLabel}
            accessibilityRole="button"
            hitSlop={10}
            onPress={onClose}
            style={styles.iconButton}
          >
            <X color={DS.colors.textPrimary} size={18} strokeWidth={2} />
          </Pressable>

          <View style={styles.progressCluster}>
            <Text numberOfLines={1} style={styles.stepText}>
              {stepLabel}
            </Text>
            <StepProgressLine
              fillColor={DS.colors.accent}
              progress={safeStep / totalSteps}
              style={styles.progressLine}
              trackColor="rgba(17, 19, 24, 0.09)"
            />
          </View>

          <View style={styles.rightGroup}>
            {showBack ? (
              <Pressable
                accessibilityLabel={backAccessibilityLabel}
                accessibilityRole="button"
                hitSlop={10}
                onPress={onBack}
                style={styles.iconButton}
              >
                <ArrowLeft color={DS.colors.textPrimary} size={18} strokeWidth={1.9} style={styles.backIcon} />
              </Pressable>
            ) : null}

            {showCredits ? (
              <DiamondCreditPill
                accessibilityLabel="Return to Tools"
                count={creditCount}
                onPress={onClose}
                style={styles.creditPill}
                variant="dark"
              />
            ) : null}
          </View>
        </View>

        <View style={styles.titleStack}>
          <Text numberOfLines={1} style={styles.titleText}>
            {headerTitle}
          </Text>
        </View>
      </BlurView>
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
    backgroundColor: "transparent",
  },
  inner: {
    gap: HEADER_PROGRESS_GAP,
    ...organicRadii(),
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.72)",
    ...ambientShadow(),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: HEADER_ROW_HEIGHT,
    gap: 12,
  },
  progressCluster: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  rightGroup: {
    minWidth: 88,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "flex-end",
  },
  titleStack: {
    gap: 4,
  },
  iconButton: {
    width: HEADER_ACTION_SIZE,
    height: HEADER_ACTION_SIZE,
    ...floatingButton(false),
    paddingHorizontal: 0,
    paddingVertical: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    transform: [{ translateX: -1 }],
  },
  titleText: {
    color: DS.colors.textPrimary,
    ...DS.typography.cardTitle,
    fontSize: 24,
    lineHeight: 30,
  },
  stepText: {
    color: DS.colors.textSecondary,
    ...DS.typography.label,
    fontSize: 10,
    lineHeight: 14,
  },
  creditPill: {
    minHeight: 36,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  progressLine: {
    width: "100%",
    maxWidth: 164,
    height: HEADER_PROGRESS_HEIGHT,
  },
});
