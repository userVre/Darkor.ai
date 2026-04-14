import { ArrowLeft, X } from "@/components/material-icons";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DS, ambientShadow, floatingButton } from "../lib/design-system";
import { DiamondCreditPill } from "./diamond-credit-pill";
import { ExitConfirmModal } from "./exit-confirm-modal";
import { StepProgressSegments } from "./step-progress-segments";

export const STICKY_STEP_HEADER_CONTENT_GAP = 32;

const HEADER_TOP_PADDING = 8;
const HEADER_BOTTOM_PADDING = 12;
const HEADER_ROW_HEIGHT = 52;
const HEADER_ACTION_SIZE = 44;
const HEADER_SIDE_WIDTH = 116;

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
  const height = safeTop + HEADER_TOP_PADDING + HEADER_ROW_HEIGHT + HEADER_BOTTOM_PADDING;

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
  const insets = useSafeAreaInsets();
  const metrics = getStickyStepHeaderMetrics(insets.top);
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
            paddingTop: metrics.safeTop + HEADER_TOP_PADDING,
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
                count={creditCount}
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
    minHeight: HEADER_ROW_HEIGHT,
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
    width: HEADER_SIDE_WIDTH,
    minHeight: HEADER_ACTION_SIZE,
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
    width: HEADER_ACTION_SIZE,
    height: HEADER_ACTION_SIZE,
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
