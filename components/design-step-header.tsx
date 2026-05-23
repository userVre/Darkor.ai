import {ArrowLeft, X} from "@/components/material-icons";
import {useTranslation} from "react-i18next";
import {I18nManager, Platform, StyleSheet, View} from "react-native";
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

type DesignStepHeaderProps = {
  title?: string;
  creditCount?: number;
  step: number;
  totalSteps: number;
  progress?: number;
  progressVariant?: "segmented" | "continuous";
  horizontalInset: number;
  onCreditsPress?: () => void;
  onBack?: () => void;
  onClose: () => void;
  backAccessibilityLabel?: string;
  closeAccessibilityLabel?: string;
};

const DESIGN_HEADER_TOP_PADDING = 8;
const DESIGN_HEADER_BOTTOM_PADDING = 12;
const DESIGN_HEADER_ROW_HEIGHT = 44;
const DESIGN_HEADER_ACTION_SIZE = 44;
const DESIGN_HEADER_CONTENT_GAP = 0;
const DESIGN_HEADER_PROGRESS_GAP = 12;
const DESIGN_HEADER_PROGRESS_HEIGHT = 12;
const DESIGN_HEADER_SIDE_WIDTH = DESIGN_HEADER_ACTION_SIZE;

export function getDesignStepHeaderMetrics(topInset: number) {
  const safeTop = Platform.OS === "android" ? Math.max(topInset, 12) : Math.max(topInset, 16);
  const height =
    safeTop +
    DESIGN_HEADER_TOP_PADDING +
    DESIGN_HEADER_ROW_HEIGHT +
    DESIGN_HEADER_PROGRESS_GAP +
    DESIGN_HEADER_PROGRESS_HEIGHT +
    DESIGN_HEADER_BOTTOM_PADDING;

  return {
    height,
    safeTop,
    contentOffset: height + DESIGN_HEADER_CONTENT_GAP,
  };
}

export function DesignStepHeader({
  title,
  creditCount,
  step,
  totalSteps,
  progress,
  progressVariant = "segmented",
  horizontalInset,
  onCreditsPress: _onCreditsPress,
  onBack,
  onClose,
  backAccessibilityLabel = "Go back",
  closeAccessibilityLabel = "Close",
}: DesignStepHeaderProps) {
  const {t} = useTranslation();
  const paperTheme = usePaperTheme();
  const insets = useSafeAreaInsets();
  const isRTL = I18nManager.isRTL;
  const metrics = getDesignStepHeaderMetrics(insets.top);
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
          paddingTop: metrics.safeTop + DESIGN_HEADER_TOP_PADDING,
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
            ) : showCredits ? (
              hasPaidAccess ? (
                <ProBadge style={styles.proBadge} />
              ) : (
                <DiamondCreditPill
                  accessibilityLabel="Credits remaining"
                  accessibilityRole="button"
                  count={creditCount ?? 0}
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

        <View style={styles.progressWrap}>
          <Text variant="labelLarge" style={[styles.stepMetaText, {color: paperTheme.colors.onSurfaceVariant}]}>
            {t("wizard.headers.stepProgress", {current: safeStep, total: totalSteps})}
          </Text>
          <StepProgressSegments
            key={`design-step-progress-${safeStep}-${totalSteps}`}
            progress={progress}
            variant={progressVariant}
            step={safeStep}
            totalSteps={totalSteps}
            style={progressVariant === "continuous" ? styles.progressRailContinuous : styles.progressRail}
          />
        </View>
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
    gap: DESIGN_HEADER_PROGRESS_GAP,
    paddingBottom: DESIGN_HEADER_BOTTOM_PADDING,
  },
  topRow: {
    minHeight: DESIGN_HEADER_ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sideSlot: {
    width: DESIGN_HEADER_SIDE_WIDTH,
    minHeight: DESIGN_HEADER_ACTION_SIZE,
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
  progressRailContinuous: {
    flex: 1,
    maxWidth: "100%",
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
    minHeight: DESIGN_HEADER_ACTION_SIZE,
    paddingHorizontal: md3Spacing.medium,
    paddingVertical: md3Spacing.small,
  },
  proBadge: {
    minHeight: DESIGN_HEADER_ACTION_SIZE,
  },
  titleWrap: {
    position: "absolute",
    left: DESIGN_HEADER_ACTION_SIZE + md3Spacing.medium,
    right: DESIGN_HEADER_ACTION_SIZE + md3Spacing.medium,
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
