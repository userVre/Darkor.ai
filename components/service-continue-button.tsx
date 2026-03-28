import { AnimatePresence, MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { glowShadow } from "../lib/design-system";
import { LuxPressable } from "./lux-pressable";

const pointerClassName = "cursor-pointer";
const CONTINUE_PURPLE = "#7C3AED";
const CONTINUE_PURPLE_DARK = "#6D28D9";

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
  const isBlocked = loading;
  const effectiveOpacity = active ? 1 : 0.7;

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
              animate={{ opacity: [0.12, 0.28, 0.12], scale: [0.985, 1.02, 0.985] }}
              transition={{ duration: 2200, loop: true, type: "timing" }}
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
              glowColor={isBlocked || !active ? "rgba(124,58,237,0.12)" : "rgba(124,58,237,0.22)"}
              scale={0.99}
            >
              <LinearGradient
                colors={[CONTINUE_PURPLE, CONTINUE_PURPLE_DARK]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={[styles.button, active ? styles.buttonActive : styles.buttonInactive, { opacity: effectiveOpacity }]}
              >
                {loading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.buttonText}>Loading...</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>{label}</Text>
                )}
              </LinearGradient>
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
              glowColor="rgba(0,0,0,0)"
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

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    gap: 10,
  },
  pulseGlow: {
    position: "absolute",
    left: 4,
    right: 4,
    top: 6,
    bottom: 0,
    borderRadius: 18,
    backgroundColor: CONTINUE_PURPLE,
  },
  pressable: {
    width: "100%",
  },
  button: {
    minHeight: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  buttonActive: {
    ...glowShadow("rgba(124,58,237,0.24)", 18),
  },
  buttonInactive: {
    ...glowShadow("rgba(124,58,237,0.14)", 14),
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.2,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  secondaryActionWrap: {
    alignSelf: "center",
  },
  secondaryActionText: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  supportingText: {
    color: "rgba(255,255,255,0.56)",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    textAlign: "center",
  },
});
