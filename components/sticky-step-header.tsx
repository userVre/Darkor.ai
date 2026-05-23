import {ArrowLeft, X} from "@/components/material-icons";
import {type ReactNode} from "react";
import {useTranslation} from "react-i18next";
import {I18nManager, StyleSheet, View} from "react-native";
import {IconButton, Surface, Text, useTheme as usePaperTheme} from "react-native-paper";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {md3Spacing} from "../constants/md3Theme";
import {
getDirectionalAlignment,
getDirectionalArrowScale,
getDirectionalOppositeAlignment,
getDirectionalRow,
} from "../lib/i18n/rtl";
import {triggerHaptic} from "../lib/haptics";
import {useDiamondStore} from "./diamond-store-context";
import {DiamondCreditPill, ProBadge} from "./diamond-credit-pill";
import {StepProgressSegments} from "./step-progress-segments";
import {useViewerCredits} from "./viewer-credits-context";

export const STICKY_STEP_HEADER_CONTENT_GAP = 0;

const HEADER_TOP_PADDING = 8;
const HEADER_BOTTOM_PADDING = 12;
const HEADER_ROW_HEIGHT = 44;
const HEADER_ACTION_SIZE = 44;
const HEADER_SIDE_WIDTH = HEADER_ACTION_SIZE;
const HEADER_PROGRESS_GAP = 12;
const HEADER_PROGRESS_HEIGHT = 12;

type StickyStepHeaderProps = {
  title?: string;
  creditCount?: number;
  step: number;
  totalSteps: number;
  progress?: number;
  progressVariant?: "segmented" | "continuous";
  showProgress?: boolean;
  leftAccessory?: ReactNode;
  horizontalInset?: number;
  onCreditsPress?: () => void;
  onBack?: () => void;
  onClose: () => void;
  backAccessibilityLabel?: string;
  closeAccessibilityLabel?: string;
};

export function getStickyStepHeaderMetrics(topInset: number) {
  return getStickyStepHeaderMetricsWithProgress(topInset, true);
}

export function getStickyStepHeaderMetricsWithProgress(topInset: number, showProgress: boolean) {
  const safeTop = Math.max(topInset, 12);
  const height =
    safeTop +
    HEADER_TOP_PADDING +
    HEADER_ROW_HEIGHT +
    (showProgress ? HEADER_PROGRESS_GAP + HEADER_PROGRESS_HEIGHT : 0) +
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
  progress,
  progressVariant = "segmented",
  showProgress = true,
  leftAccessory,
  horizontalInset = 20,
  onCreditsPress: _onCreditsPress,
  onBack,
  onClose,
  backAccessibilityLabel = "Go back",
  closeAccessibilityLabel = "Close",
}: StickyStepHeaderProps) {
  const {t} = useTranslation();
  const paperTheme = usePaperTheme();
  const insets = useSafeAreaInsets();
  const isRTL = I18nManager.isRTL;
  const metrics = getStickyStepHeaderMetricsWithProgress(insets.top, showProgress);
  const safeStep = Math.max(1, Math.min(step, totalSteps));
  const showCredits = safeStep === 1;
  const showBack = safeStep > 1 && Boolean(onBack);
  const {hasPaidAccess} = useViewerCredits();
  const {openStore} = useDiamondStore();
  const resolvedTitle = title ?? t("app.name");

  const handleCreditsTap = () => {
    triggerHaptic();
    openStore();
  };

  return (
    <Surface
      elevation={2}
      pointerEvents="box-none"
      style={[
        styles.shell,
        {
          backgroundColor: paperTheme.colors.surface,
          height: metrics.height,
          paddingTop: metrics.safeTop + HEADER_TOP_PADDING,
        },
      ]}
    >
      <View style={[styles.inner, {marginHorizontal: horizontalInset}]}>
        <View style={[styles.topRow, {flexDirection: getDirectionalRow(isRTL)}]}>
          <View style={[styles.sideSlot, {alignItems: getDirectionalAlignment(isRTL)}]}>
            {showBack ? (
              <IconButton
                accessibilityLabel={backAccessibilityLabel}
                icon={({color, size}) => (
                  <ArrowLeft
                    color={color}
                    size={size}
                    strokeWidth={1.9}
                    style={[
                      styles.backIcon,
                      {transform: [{scaleX: getDirectionalArrowScale(isRTL)}, {translateX: isRTL ? 1 : -1}]},
                    ]}
                  />
                )}
                mode="contained-tonal"
                onPress={onBack}
                size={18}
                style={styles.iconButton}
              />
            ) : leftAccessory ? (
              leftAccessory
            ) : showCredits ? (
              hasPaidAccess ? (
                <ProBadge style={styles.proBadge} />
              ) : (
                <DiamondCreditPill
                  accessibilityLabel="Credits remaining"
                  accessibilityRole="button"
                  count={creditCount}
                  iconOnly
                  onPress={handleCreditsTap}
                  style={styles.creditPill}
                  variant="light"
                />
              )
            ) : null}
          </View>

          <View pointerEvents="none" style={styles.titleWrap}>
            <Text numberOfLines={1} variant="titleMedium" style={[styles.titleText, {color: paperTheme.colors.onSurface}]}>
              {resolvedTitle}
            </Text>
          </View>

          <View style={[styles.sideSlot, {alignItems: getDirectionalOppositeAlignment(isRTL)}]}>
            <IconButton
              accessibilityLabel={closeAccessibilityLabel}
              icon={({color, size}) => <X color={color} size={size} strokeWidth={2} />}
              mode="contained-tonal"
              onPress={onClose}
              size={18}
              style={styles.iconButton}
            />
          </View>
        </View>

        {showProgress ? (
          <View style={styles.progressWrap}>
            <Text variant="labelLarge" style={[styles.stepMetaText, {color: paperTheme.colors.onSurfaceVariant}]}>
              {t("wizard.headers.stepProgress", {current: safeStep, total: totalSteps})}
            </Text>
            <StepProgressSegments
              key={`sticky-step-progress-${safeStep}-${totalSteps}`}
              progress={progress}
              variant={progressVariant}
              step={safeStep}
              totalSteps={totalSteps}
              style={styles.progressRail}
            />
          </View>
        ) : null}
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
  },
  inner: {
    gap: HEADER_PROGRESS_GAP,
    paddingBottom: HEADER_BOTTOM_PADDING,
  },
  topRow: {
    height: HEADER_ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sideSlot: {
    width: HEADER_SIDE_WIDTH,
    height: HEADER_ACTION_SIZE,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  progressWrap: {
    flexDirection: "row",
    gap: md3Spacing.small,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: md3Spacing.medium,
  },
  progressRail: {
    flex: 1,
    maxWidth: 168,
  },
  stepMetaText: {
    letterSpacing: 0,
  },
  iconButton: {
    margin: 0,
  },
  backIcon: {
    transform: [{translateX: -1}],
  },
  creditPill: {
    height: HEADER_ACTION_SIZE,
    paddingHorizontal: md3Spacing.medium,
    paddingVertical: md3Spacing.small,
  },
  proBadge: {
    height: HEADER_ACTION_SIZE,
  },
  titleWrap: {
    position: "absolute",
    left: HEADER_ACTION_SIZE + md3Spacing.medium,
    right: HEADER_ACTION_SIZE + md3Spacing.medium,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: md3Spacing.small,
  },
  titleText: {
    letterSpacing: 0,
    textAlign: "center",
  },
});
