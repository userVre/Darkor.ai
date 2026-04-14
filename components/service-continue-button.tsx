import { AnimatePresence, MotiView } from "moti";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { fonts } from "../styles/typography";
import { spacing } from "../styles/spacing";
import { createButtonStyles } from "@/styles/buttons";
import { type Theme, useTheme } from "@/styles/theme";

import { LuxPressable } from "./lux-pressable";

const pointerClassName = "cursor-pointer";
const ACTIVE_BUTTON_COLOR = "#CC3333";
const INACTIVE_BUTTON_COLOR = "#131B26";
const INACTIVE_TEXT_COLOR = "#CFCFCF";

type ServiceContinueButtonProps = {
  active?: boolean;
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
  const { t } = useTranslation();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isBlocked = loading || !active;
  const resolvedLabel = label ?? t("common.actions.continue");

  return (
    <AnimatePresence>
      {visible ? (
        <MotiView
          key={`service-continue-${resolvedLabel}-${active ? "active" : "idle"}-${pulse ? "pulse" : "static"}`}
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          exit={{ opacity: 0, translateY: 12 }}
          transition={{ type: "timing", duration: 300 }}
          style={styles.wrap}
        >
          {pulse && active && !isBlocked ? (
            <MotiView
              pointerEvents="none"
              animate={{ opacity: [0.16, 0.32, 0.16], scale: [0.985, 1.018, 0.985] }}
              transition={{ duration: 2000, loop: true, type: "timing" }}
              style={styles.pulseGlow}
            />
          ) : null}

          <MotiView
            animate={
              attention && active && !isBlocked
                ? { scale: [1, 1.035, 1], translateY: [0, -1, 0] }
                : pulse && active && !isBlocked
                  ? { scale: [1, 1.01, 1], translateY: [0, -1, 0] }
                  : { scale: 1, translateY: 0 }
            }
            transition={
              attention && active && !isBlocked
                ? { duration: 400, type: "timing" }
                : pulse && active && !isBlocked
                  ? { duration: 2000, loop: true, type: "timing" }
                  : { duration: 180, type: "timing" }
            }
          >
            <LuxPressable
              onPress={() => {
                void onPress();
              }}
              disabled={isBlocked}
              className={pointerClassName}
              pressableClassName={pointerClassName}
              style={styles.pressable}
              glowColor={ACTIVE_BUTTON_COLOR}
              scale={0.99}
            >
              <View style={[styles.button, active ? styles.buttonActive : styles.buttonInactive]}>
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={colors.textPrimary} />
                    <Text style={styles.buttonText}>{t("common.states.loading")}</Text>
                  </View>
                ) : (
                  <Text style={[styles.buttonText, active ? null : styles.buttonTextInactive]}>{resolvedLabel}</Text>
                )}
              </View>
            </LuxPressable>
          </MotiView>

          {secondaryActionLabel && onSecondaryAction ? (
            <LuxPressable
              onPress={() => {
                void onSecondaryAction();
              }}
              disabled={isBlocked}
              className={pointerClassName}
              pressableClassName={pointerClassName}
              style={styles.secondaryActionWrap}
              glowColor={colors.surfaceHigh}
              scale={0.98}
            >
              <Text style={styles.secondaryActionText}>{secondaryActionLabel}</Text>
            </LuxPressable>
          ) : null}

          {supportingText ? <Text style={styles.supportingText}>{supportingText}</Text> : null}
        </MotiView>
      ) : null}
    </AnimatePresence>
  );
}

function createStyles(colors: Theme) {
  const buttonStyles = createButtonStyles(colors);

  return StyleSheet.create({
    wrap: {
      width: "100%",
      gap: spacing.sm,
    },
    pulseGlow: {
      position: "absolute",
      left: 4,
      right: 4,
      top: 6,
      bottom: 0,
      borderRadius: 14,
      backgroundColor: ACTIVE_BUTTON_COLOR,
    },
    pressable: {
      width: "100%",
    },
    button: {
      ...buttonStyles.primary,
      width: "100%",
    },
    buttonActive: {
      backgroundColor: ACTIVE_BUTTON_COLOR,
    },
    buttonInactive: {
      backgroundColor: INACTIVE_BUTTON_COLOR,
      boxShadow: "0px 10px 24px rgba(17, 19, 24, 0.05)",
    },
    buttonText: {
      color: colors.textPrimary,
      fontSize: 16,
      fontFamily: fonts.regular.fontFamily,
      fontWeight: "800",
      textAlign: "center",
      letterSpacing: -0.2,
    },
    buttonTextInactive: {
      color: INACTIVE_TEXT_COLOR,
    },
    loadingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
    },
    secondaryActionWrap: {
      alignSelf: "center",
    },
    secondaryActionText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontFamily: fonts.regular.fontFamily,
      fontWeight: "600",
      textAlign: "center",
    },
    supportingText: {
      color: colors.textMuted,
      fontSize: 12,
      fontFamily: fonts.regular.fontFamily,
      fontWeight: "600",
      lineHeight: 18,
      textAlign: "center",
    },
  });
}
