import { X } from "@/components/material-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { fonts } from "../styles/typography";

type CreditLimitModalProps = {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
};

export function CreditLimitModal({ visible, onClose, onUpgrade }: CreditLimitModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
            <View style={styles.closeButtonVisual}>
              <X color="#0A0A0A" size={16} strokeWidth={2.2} />
            </View>
          </Pressable>

          <Text style={styles.title}>Daily Credit Limit</Text>

          <Text style={styles.body}>
            Every account receives a set amount of daily credits. When credits run out, users can wait for the daily
            reset or choose to upgrade to a PRO plan instead anytime now!
          </Text>

          <Pressable accessibilityRole="button" onPress={onUpgrade} style={styles.upgradeButton}>
            <Text style={styles.upgradeText}>Upgrade</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
  },
  closeButton: {
    position: "absolute",
    top: 28,
    right: 28,
    zIndex: 1,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonVisual: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    marginTop: 36,
    marginBottom: 28,
    marginHorizontal: 24,
    color: "#0A0A0A",
    textAlign: "center",
    fontSize: 20,
    lineHeight: 24,
    ...fonts.bold,
  },
  body: {
    marginTop: 28,
    marginHorizontal: 24,
    marginBottom: 32,
    color: "#808080",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 22,
    ...fonts.regular,
  },
  upgradeButton: {
    height: 56,
    marginTop: 32,
    marginHorizontal: 12,
    marginBottom: 28,
    borderRadius: 16,
    backgroundColor: "#0A0A0A",
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeText: {
    color: "#FFFFFF",
    textAlign: "center",
    fontSize: 16,
    lineHeight: 20,
    ...fonts.semibold,
  },
});

