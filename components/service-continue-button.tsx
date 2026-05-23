import {AnimatePresence, MotiView} from "moti";
import {useTranslation} from "react-i18next";
import {StyleSheet, View} from "react-native";
import {Easing} from "react-native-reanimated";
import {Button, Text, useTheme as usePaperTheme} from "react-native-paper";

import {md3Shapes, md3Spacing} from "../constants/md3Theme";

const MD3_EMPHASIZED_DECELERATE = Easing.bezier(0.05, 0.7, 0.1, 1);
const MD3_EMPHASIZED_ACCELERATE = Easing.bezier(0.3, 0, 0.8, 0.15);

type ServiceContinueButtonProps = {
  active?: boolean;
  activeColor?: string;
  label?: string;
  loading?: boolean;
  onPress: () => void | Promise<void>;
  pulse?: boolean;
  supportingText?: string | null;
  secondaryActionLabel?: string | null;
  onSecondaryAction?: (() => void | Promise<void>) | null;
  attention?: boolean;
  visible?: boolean;
};

export function ServiceContinueButton({
  active = true,
  activeColor,
  label,
  loading = false,
  onPress,
  pulse = false,
  supportingText,
  secondaryActionLabel,
  onSecondaryAction,
  attention = false,
  visible = true,
}: ServiceContinueButtonProps) {
  const {t} = useTranslation();
  const paperTheme = usePaperTheme();
  const isBlocked = loading || !active;
  const resolvedLabel = label ?? t("common.actions.continue");
  const buttonColor = active ? activeColor ?? paperTheme.colors.primary : paperTheme.colors.surfaceDisabled;
  const textColor = active ? paperTheme.colors.onPrimary : paperTheme.colors.onSurfaceDisabled;

  return (
    <AnimatePresence>
      {visible ? (
        <MotiView
          key={`service-continue-${resolvedLabel}-${active ? "active" : "idle"}-${pulse ? "pulse" : "static"}`}
          from={{opacity: 0, translateY: 20}}
          animate={{opacity: 1, translateY: 0}}
          exit={{opacity: 0, translateY: 12}}
          transition={{type: "timing", duration: 300, easing: MD3_EMPHASIZED_DECELERATE}}
          style={styles.wrap}
        >
          {pulse && active && !isBlocked ? (
            <MotiView
              pointerEvents="none"
              animate={{opacity: [0.12, 0.24, 0.12], scale: [0.985, 1.018, 0.985]}}
              transition={{duration: 2000, loop: true, type: "timing"}}
              style={[styles.pulseGlow, {backgroundColor: paperTheme.colors.primaryContainer}]}
            />
          ) : null}

          <MotiView
            animate={
              attention && active && !isBlocked
                ? {scale: [1, 1.035, 1], translateY: [0, -1, 0]}
                : pulse && active && !isBlocked
                  ? {scale: [1, 1.01, 1], translateY: [0, -1, 0]}
                  : {scale: 1, translateY: 0}
            }
            transition={
              attention && active && !isBlocked
                ? {duration: 400, type: "timing", easing: MD3_EMPHASIZED_DECELERATE}
                : pulse && active && !isBlocked
                  ? {duration: 2000, loop: true, type: "timing"}
                  : {duration: 180, type: "timing", easing: MD3_EMPHASIZED_ACCELERATE}
            }
          >
            <Button
              mode="contained"
              buttonColor={buttonColor}
              textColor={textColor}
              loading={loading}
              disabled={isBlocked}
              onPress={() => {
                void onPress();
              }}
              style={styles.button}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              {loading ? t("common.states.loading") : resolvedLabel}
            </Button>
          </MotiView>

          {secondaryActionLabel && onSecondaryAction ? (
            <Button
              compact
              mode="text"
              disabled={isBlocked}
              onPress={() => {
                void onSecondaryAction();
              }}
              labelStyle={styles.secondaryActionText}
            >
              {secondaryActionLabel}
            </Button>
          ) : null}

          {supportingText ? (
            <Text variant="bodySmall" style={[styles.supportingText, {color: paperTheme.colors.onSurfaceVariant}]}>
              {supportingText}
            </Text>
          ) : null}
        </MotiView>
      ) : null}
    </AnimatePresence>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    gap: md3Spacing.small,
  },
  pulseGlow: {
    position: "absolute",
    left: md3Spacing.extraSmall,
    right: md3Spacing.extraSmall,
    top: md3Spacing.small,
    bottom: 0,
    borderRadius: md3Shapes.extraLarge,
  },
  button: {
    width: "100%",
    borderRadius: md3Shapes.extraLarge,
  },
  buttonContent: {
    minHeight: 56,
    paddingHorizontal: md3Spacing.extraLarge,
  },
  buttonLabel: {
    letterSpacing: 0,
  },
  secondaryActionText: {
    letterSpacing: 0,
  },
  supportingText: {
    textAlign: "center",
    letterSpacing: 0,
  },
});
