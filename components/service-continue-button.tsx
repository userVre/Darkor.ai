import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { DS, glowShadow } from "../lib/design-system";
import { LuxPressable } from "./lux-pressable";

const pointerClassName = "cursor-pointer";
const CONTINUE_PURPLE = "#7C3AED";

type ServiceContinueButtonProps = {
  disabled?: boolean;
  hint?: string | null;
  loading?: boolean;
  onPress: () => void | Promise<void>;
};

export function ServiceContinueButton({
  disabled = false,
  hint,
  loading = false,
  onPress,
}: ServiceContinueButtonProps) {
  const isBlocked = disabled || loading;
  const showHint = disabled && !loading && Boolean(hint);

  return (
    <View style={styles.wrap}>
      {showHint ? <Text style={styles.hint}>{hint}</Text> : null}
      <LuxPressable
        onPress={() => {
          void onPress();
        }}
        disabled={isBlocked}
        className={pointerClassName}
        pressableClassName={pointerClassName}
        style={styles.pressable}
        glowColor={disabled ? "rgba(0,0,0,0)" : "rgba(124,58,237,0.22)"}
        scale={0.99}
      >
        <View style={[styles.button, disabled ? styles.buttonDisabled : styles.buttonActive]}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.buttonText}>Loading...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Continue →</Text>
          )}
        </View>
      </LuxPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    gap: 10,
  },
  hint: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    textAlign: "center",
  },
  pressable: {
    width: "100%",
  },
  button: {
    minHeight: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    backgroundColor: CONTINUE_PURPLE,
  },
  buttonActive: {
    ...glowShadow("rgba(124,58,237,0.24)", 18),
  },
  buttonDisabled: {
    opacity: 0.3,
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
});
