import { ArrowLeft, Diamond, X } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { fonts } from "../styles/typography";

type DesignStepHeaderProps = {
  creditCount?: number;
  step: number;
  totalSteps: number;
  top: number;
  horizontalInset: number;
  onBack?: () => void;
  onClose: () => void;
  backAccessibilityLabel?: string;
  closeAccessibilityLabel?: string;
};

export function DesignStepHeader({
  creditCount,
  step,
  totalSteps,
  top,
  horizontalInset,
  onBack,
  onClose,
  backAccessibilityLabel = "Go back",
  closeAccessibilityLabel = "Close",
}: DesignStepHeaderProps) {
  const isFirstStep = !onBack;

  return (
    <View pointerEvents="box-none" style={[styles.headerRow, { top, left: horizontalInset, right: horizontalInset }]}>
      <View style={[styles.sideSlot, styles.leftSlot]}>
        {isFirstStep ? (
          <View style={styles.creditBadge}>
            <Diamond color="#FFFFFF" size={13} strokeWidth={2.1} />
            <Text style={styles.creditText}>{creditCount ?? 0}</Text>
          </View>
        ) : (
          <Pressable accessibilityLabel={backAccessibilityLabel} accessibilityRole="button" hitSlop={10} onPress={onBack} style={styles.iconButton}>
            <ArrowLeft color="#0A0A0A" size={18} strokeWidth={2.4} />
          </Pressable>
        )}
      </View>

      <View style={styles.centerSlot}>
        <Text style={styles.stepText}>{`Step ${step} / ${totalSteps}`}</Text>
      </View>

      <View style={[styles.sideSlot, styles.rightSlot]}>
        <Pressable accessibilityLabel={closeAccessibilityLabel} accessibilityRole="button" hitSlop={10} onPress={onClose} style={styles.iconButton}>
          <X color="#0A0A0A" size={20} strokeWidth={2.3} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    position: "absolute",
    zIndex: 4,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
  },
  sideSlot: {
    width: 72,
    minHeight: 44,
    justifyContent: "center",
  },
  leftSlot: {
    alignItems: "flex-start",
  },
  rightSlot: {
    alignItems: "flex-end",
  },
  centerSlot: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  creditBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    backgroundColor: "#0A0A0A",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  creditText: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 13,
    ...fonts.bold,
  },
  stepText: {
    color: "#0A0A0A",
    fontSize: 14,
    lineHeight: 18,
    textAlign: "center",
    ...fonts.semibold,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
