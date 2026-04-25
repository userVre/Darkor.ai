import {ArrowLeft, X} from "@/components/material-icons";
import {useState} from "react";
import {useTranslation} from "react-i18next";
import {I18nManager, Platform, Pressable, StyleSheet, Text, View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {DS, floatingButton} from "../lib/design-system";
import {
getDirectionalAlignment,
getDirectionalArrowScale,
getDirectionalOppositeAlignment,
getDirectionalRow,
} from "../lib/i18n/rtl";
import {DiamondCreditPill} from "./diamond-credit-pill";
import {ExitConfirmModal} from "./exit-confirm-modal";
import {StepProgressSegments} from "./step-progress-segments";

export const STICKY_STEP_HEADER_CONTENT_GAP = 32;

const HEADER_TOP_PADDING = 8;
const HEADER_BOTTOM_PADDING = 12;
const HEADER_ROW_HEIGHT = 44;
const HEADER_ACTION_SIZE = 44;
const HEADER_SIDE_WIDTH = 116;
const HEADER_PROGRESS_GAP = 12;
const HEADER_PROGRESS_HEIGHT = 12;

type StickyStepHeaderProps = {
  title?: string;
  creditCount?: number;
  step: number;
  totalSteps: number;
  horizontalInset?: number;
  onCreditsPress?: () => void;
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
  onCreditsPress,
  onBack,
  onClose,
  backAccessibilityLabel = "Go back",
  closeAccessibilityLabel = "Close",
}: StickyStepHeaderProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isRTL = I18nManager.isRTL;
  const metrics = getStickyStepHeaderMetrics(insets.top);
  const safeStep = Math.max(1, Math.min(step, totalSteps));
  const showCredits = safeStep === 1;
  const showBack = safeStep > 1 && Boolean(onBack);
  const [isExitModalVisible, setIsExitModalVisible] = useState(false);
  const resolvedTitle = title ?? t("app.name");
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
          <View style={[styles.topRow, { flexDirection: getDirectionalRow(isRTL) }]}>
            <View style={[styles.sideSlot, { alignItems: getDirectionalAlignment(isRTL) }]}>
              {showBack ? (
                <Pressable
                  accessibilityLabel={backAccessibilityLabel}
                  accessibilityRole="button"
                  hitSlop={10}
                  onPress={onBack}
                  style={styles.iconButton}
                >
                  <ArrowLeft
                    color={DS.colors.textPrimary}
                    size={18}
                    strokeWidth={1.9}
                    style={[
                      styles.backIcon,
                      {
                        transform: [
                          { scaleX: getDirectionalArrowScale(isRTL) },
                          { translateX: isRTL ? 1 : -1 },
                        ],
                      },
                    ]}
                  />
                </Pressable>
              ) : showCredits ? (
                <DiamondCreditPill
                  accessibilityLabel="Credits remaining"
                  accessibilityRole={onCreditsPress ? "button" : "text"}
                  count={creditCount}
                  onPress={onCreditsPress}
                  style={styles.creditPill}
                  variant="light"
                />
              ) : null}
            </View>

            <View pointerEvents="none" style={styles.titleWrap}>
              <Text numberOfLines={1} style={styles.titleText}>
                {resolvedTitle}
              </Text>
            </View>

            <View style={[styles.sideSlot, { alignItems: getDirectionalOppositeAlignment(isRTL) }]}>
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

          <View style={styles.progressWrap}>
            <StepProgressSegments
              key={`sticky-step-progress-${safeStep}-${totalSteps}`}
              step={safeStep}
              totalSteps={totalSteps}
              style={styles.progressRail}
            />
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
    backgroundColor: DS.colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DS.colors.border,
  },
  inner: {
    gap: HEADER_PROGRESS_GAP,
    paddingBottom: HEADER_BOTTOM_PADDING,
  },
  topRow: {
    minHeight: HEADER_ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  progressRail: {
    width: "100%",
    maxWidth: 168,
  },
  iconButton: {
    width: HEADER_ACTION_SIZE,
    height: HEADER_ACTION_SIZE,
    ...floatingButton(false),
    paddingHorizontal: 0,
    paddingVertical: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DS.colors.surfaceHigh,
  },
  backIcon: {
    transform: [{ translateX: -1 }],
  },
  creditPill: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  titleWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  titleText: {
    color: DS.colors.textPrimary,
    ...DS.typography.button,
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: -0.35,
    textAlign: "center",
  },
});
