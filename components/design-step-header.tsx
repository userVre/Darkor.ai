import { ArrowLeft, X } from "@/components/material-icons";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DS, ambientShadow, floatingButton } from "../lib/design-system";
import { DiamondCreditPill } from "./diamond-credit-pill";
import { ExitConfirmModal } from "./exit-confirm-modal";
import { StepProgressSegments } from "./step-progress-segments";

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

const DESIGN_HEADER_TOP_PADDING = 8;
const DESIGN_HEADER_BOTTOM_PADDING = 12;
const DESIGN_HEADER_ROW_HEIGHT = 52;
const DESIGN_HEADER_ACTION_SIZE = 44;
const DESIGN_HEADER_CONTENT_GAP = 32;
const DESIGN_HEADER_SIDE_WIDTH = 116;

export function getDesignStepHeaderMetrics(topInset: number) {
  const safeTop = Platform.OS === "android" ? Math.max(topInset, 12) : Math.max(topInset, 16);
  const height = safeTop + DESIGN_HEADER_TOP_PADDING + DESIGN_HEADER_ROW_HEIGHT + DESIGN_HEADER_BOTTOM_PADDING;

  return {
    height,
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
  const insets = useSafeAreaInsets();
  const metrics = getDesignStepHeaderMetrics(insets.top);
  const safeStep = Math.max(1, Math.min(step, totalSteps));
  const showCredits = safeStep === 1;
  const showBack = safeStep > 1 && Boolean(onBack);
  const [isExitModalVisible, setIsExitModalVisible] = useState(false);

  return (
    <>
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
        <View style={[styles.inner, { marginHorizontal: horizontalInset }]}>
          <View style={styles.sideSlot}>
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
            ) : showCredits ? (
              <DiamondCreditPill
                accessibilityLabel="Return to Tools"
                count={creditCount ?? 0}
                onPress={() => {
                  setIsExitModalVisible(true);
                }}
                style={styles.creditPill}
                variant="dark"
              />
            ) : null}
          </View>

          <View style={styles.progressWrap}>
            <StepProgressSegments step={safeStep} totalSteps={totalSteps} style={styles.progressRail} />
          </View>

          <View style={[styles.sideSlot, styles.sideSlotRight]}>
            <Pressable
              accessibilityLabel={closeAccessibilityLabel}
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => {
                setIsExitModalVisible(true);
              }}
              style={styles.iconButton}
            >
              <X color={DS.colors.textPrimary} size={18} strokeWidth={2} />
            </Pressable>
          </View>
        </View>
      </View>

      <ExitConfirmModal
        visible={isExitModalVisible}
        onCancel={() => {
          setIsExitModalVisible(false);
        }}
        onExit={() => {
          setIsExitModalVisible(false);
          onClose();
        }}
      />
    </>
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
    minHeight: DESIGN_HEADER_ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderCurve: "continuous",
    ...ambientShadow(0.05, 18, 10),
  },
  sideSlot: {
    width: DESIGN_HEADER_SIDE_WIDTH,
    minHeight: DESIGN_HEADER_ACTION_SIZE,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  sideSlotRight: {
    alignItems: "flex-end",
  },
  progressWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  progressRail: {
    width: "100%",
    maxWidth: 176,
  },
  iconButton: {
    width: DESIGN_HEADER_ACTION_SIZE,
    height: DESIGN_HEADER_ACTION_SIZE,
    ...floatingButton(false),
    paddingHorizontal: 0,
    paddingVertical: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F6F8",
  },
  backIcon: {
    transform: [{ translateX: -1 }],
  },
  creditPill: {
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
