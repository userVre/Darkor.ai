import {useTranslation} from "react-i18next";
import {Button, Dialog, Portal, Text, useTheme as usePaperTheme} from "react-native-paper";

import type {BoardItem} from "../lib/board";

type BoardActionsModalProps = {
  item: BoardItem | null;
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
};

export function BoardActionsModal({item, visible, onClose, onSave, onDelete}: BoardActionsModalProps) {
  const {t} = useTranslation();
  const paperTheme = usePaperTheme();

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onClose}>
        <Dialog.Title>
          <Text numberOfLines={1} variant="titleLarge">
            {item?.styleName ?? t("profile.title")}
          </Text>
        </Dialog.Title>
        <Dialog.Actions>
          <Button mode="text" onPress={onClose}>
            {t("common.actions.close")}
          </Button>
          <Button mode="text" textColor={paperTheme.colors.error} onPress={onDelete}>
            {t("profile.deleteFromBoardTitle")}
          </Button>
          <Button mode="contained" onPress={onSave}>
            {t("profile.saveToGallery")}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
