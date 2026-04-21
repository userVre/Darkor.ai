import { X } from "@/components/material-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { fonts } from "../styles/typography";

type CreditLimitModalProps = {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  title?: string;
  body?: string;
  upgradeLabel?: string;
};

export function CreditLimitModal({
  visible,
  onClose,
  onUpgrade,
  title,
  body,
  upgradeLabel,
}: CreditLimitModalProps) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t("creditLimit.title");
  const resolvedBody = body ?? t("creditLimit.body");
  const resolvedUpgradeLabel = upgradeLabel ?? t("common.actions.upgrade");
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

          <View style={styles.content}>
            <Text style={styles.title}>{resolvedTitle}</Text>

            <Text style={styles.body}>
              {resolvedBody}
            </Text>

            <Pressable accessibilityRole="button" onPress={onUpgrade} style={styles.upgradeButton}>
              <Text style={styles.upgradeText}>{resolvedUpgradeLabel}</Text>
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
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
  },
  content: {
    paddingTop: 36,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 14,
  },
  closeButton: {
    position: "absolute",
    top: 18,
    right: 18,
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
    color: "#0A0A0A",
    textAlign: "center",
    fontSize: 20,
    lineHeight: 24,
    ...fonts.bold,
  },
  body: {
    color: "#808080",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 21,
    ...fonts.regular,
  },
  upgradeButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: "#1D4ED8",
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

