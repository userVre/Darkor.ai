import {useTranslation} from "react-i18next";
import {Modal, Pressable, StyleSheet, Text, View} from "react-native";

import type {BoardItem} from "../lib/board";
import {fonts} from "../styles/typography";

type BoardActionsModalProps = {
  item: BoardItem | null;
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
};

export function BoardActionsModal({ item, visible, onClose, onSave, onDelete }: BoardActionsModalProps) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="fade" presentationStyle="overFullScreen" statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

        <View style={styles.sheet}>
          <Text numberOfLines={1} style={styles.sheetTitle}>
            {item?.styleName ?? t("profile.title")}
          </Text>

          <Pressable accessibilityRole="button" onPress={onSave} style={styles.actionButton}>
            <Text style={styles.actionText}>{t("profile.saveToGallery")}</Text>
          </Pressable>

          <Pressable accessibilityRole="button" onPress={onDelete} style={styles.actionButton}>
            <Text style={styles.deleteText}>{t("profile.deleteFromBoardTitle")}</Text>
          </Pressable>

          <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>{t("common.actions.close")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.36)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#0A0A0F",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    borderTopWidth: 0.5,
    borderColor: "rgba(255,255,255,0.10)",
  },
  sheetTitle: {
    color: "#FFFFFF",
    textAlign: "center",
    fontSize: 16,
    lineHeight: 20,
    ...fonts.semibold,
  },
  actionButton: {
    minHeight: 52,
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 18,
    ...fonts.medium,
  },
  deleteText: {
    color: "#EF4444",
    fontSize: 15,
    lineHeight: 18,
    ...fonts.medium,
  },
  cancelButton: {
    minHeight: 52,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 14,
    lineHeight: 18,
    ...fonts.medium,
  },
});
