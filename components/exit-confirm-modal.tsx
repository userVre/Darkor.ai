import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { DS, ambientShadow, organicRadii } from "../lib/design-system";

type ExitConfirmModalProps = {
  visible: boolean;
  onCancel: () => void;
  onExit: () => void;
};

export function ExitConfirmModal({ visible, onCancel, onExit }: ExitConfirmModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <Pressable accessibilityRole="button" onPress={onCancel} style={StyleSheet.absoluteFillObject} />

        <View style={styles.card}>
          <Text style={styles.title}>Abandon Design?</Text>
          <Text style={styles.body}>Progress will be lost.</Text>

          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={onCancel} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>CANCEL</Text>
            </Pressable>

            <Pressable accessibilityRole="button" onPress={onExit} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>EXIT</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(17,19,24,0.42)",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    ...organicRadii(28, 24),
    ...ambientShadow(0.08, 18, 14),
  },
  title: {
    color: DS.colors.textPrimary,
    textAlign: "center",
    ...DS.typography.cardTitle,
  },
  body: {
    marginTop: 12,
    color: DS.colors.textSecondary,
    textAlign: "center",
    ...DS.typography.bodySm,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    ...organicRadii(18, 18),
  },
  secondaryButtonText: {
    color: DS.colors.textPrimary,
    ...DS.typography.button,
    fontSize: 14,
    letterSpacing: 0.2,
  },
  primaryButton: {
    flex: 1,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111318",
    ...organicRadii(18, 18),
  },
  primaryButtonText: {
    color: "#FFFFFF",
    ...DS.typography.button,
    fontSize: 14,
    letterSpacing: 0.2,
  },
});
