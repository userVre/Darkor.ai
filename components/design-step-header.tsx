import { ArrowLeft, X } from "@/components/material-icons";
import { BlurView } from "expo-blur";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DS, GLASS_HEADER_CONTENT_GAP, ambientShadow, floatingButton, organicRadii } from "../lib/design-system";
import { DiamondCreditPill } from "./diamond-credit-pill";
import { StepProgressLine } from "./step-progress-line";

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
const DESIGN_HEADER_PROGRESS_HEIGHT = 4;
const DESIGN_HEADER_PROGRESS_GAP = 12;
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
    contentOffset: height + GLASS_HEADER_CONTENT_GAP,
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
        },
      ]}
    >
      <BlurView intensity={72} tint="light" style={[styles.glassCard, { marginHorizontal: horizontalInset }]}>
        <View style={styles.headerRow}>
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

          <View style={styles.rightSlot}>
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
                count={creditCount ?? 0}
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
  glassCard: {
    ...organicRadii(),
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.72)",
    ...ambientShadow(),
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: DESIGN_HEADER_ROW_HEIGHT,
    gap: 12,
  },
  progressCluster: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  rightSlot: {
    minWidth: 88,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "flex-end",
  },
  titleStack: {
    marginTop: 14,
    gap: 4,
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
  iconButton: {
    width: DESIGN_HEADER_ACTION_SIZE,
    height: DESIGN_HEADER_ACTION_SIZE,
    ...floatingButton(false),
    paddingHorizontal: 0,
    paddingVertical: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    transform: [{ translateX: -1 }],
  },
  creditPill: {
    minHeight: 36,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  progressLine: {
    width: "100%",
    maxWidth: 164,
    height: DESIGN_HEADER_PROGRESS_HEIGHT,
  },
});
