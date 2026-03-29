import { AnimatePresence, MotiView } from "moti";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useMemo } from "react";
import { fonts } from "../styles/typography";
import { spacing } from "../styles/spacing";
import { createButtonStyles } from "@/styles/buttons";
import { type Theme, useTheme } from "@/styles/theme";

import { LuxPressable } from "./lux-pressable";

const pointerClassName = "cursor-pointer";

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
  label = "Continue \u2192",
  loading = false,
  onPress,
  pulse = false,
  supportingText,
  secondaryActionLabel,
  onSecondaryAction,
  attention = false,
  visible = true,
}: ServiceContinueButtonProps) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isBlocked = loading || !active;

  return (
    <AnimatePresence>
      {visible ? (
        <MotiView
          key={`service-continue-${label}-${active ? "active" : "idle"}-${pulse ? "pulse" : "static"}`}
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
              glowColor={colors.brand}
              scale={0.99}
            >
              <View style={[styles.button, active ? styles.buttonActive : styles.buttonInactive]}>
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={colors.textPrimary} />
                    <Text style={styles.buttonText}>Loading...</Text>
                  </View>
                ) : (
                  <Text style={[styles.buttonText, active ? null : styles.buttonTextInactive]}>{label}</Text>
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
      backgroundColor: colors.brand,
    },
    pressable: {
      width: "100%",
    },
    button: {
      ...buttonStyles.primary,
      width: "100%",
    },
    buttonActive: {
      shadowOpacity: 0.3,
    },
    buttonInactive: {
      backgroundColor: colors.surfaceHigh,
      shadowColor: colors.surfaceHigh,
      shadowOpacity: 0.12,
      elevation: 2,
    },
    buttonText: {
      color: colors.textPrimary,
      fontSize: 16,
      fontFamily: fonts.regular.fontFamily,
      fontWeight: "800",
      textAlign: "left",
      letterSpacing: -0.2,
    },
    buttonTextInactive: {
      color: colors.textSecondary,
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
      textAlign: "left",
    },
    supportingText: {
      color: colors.textMuted,
      fontSize: 12,
      fontFamily: fonts.regular.fontFamily,
      fontWeight: "600",
      lineHeight: 18,
      textAlign: "left",
    },
  });
}
