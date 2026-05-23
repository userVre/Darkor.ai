import {useTranslation} from "react-i18next";
import {Button, Dialog, Portal, Text, useTheme as usePaperTheme} from "react-native-paper";

type ExitConfirmModalProps = {
  visible: boolean;
  onCancel: () => void;
  onExit: () => void;
};

export function ExitConfirmModal({visible, onCancel, onExit}: ExitConfirmModalProps) {
  const {t} = useTranslation();
  const paperTheme = usePaperTheme();

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onCancel}>
        <Dialog.Title>{t("common.alerts.exitTitle")}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">{t("common.alerts.progressLost")}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button mode="text" onPress={onCancel}>
            {t("common.actions.cancel")}
          </Button>
          <Button mode="contained" buttonColor={paperTheme.colors.error} textColor={paperTheme.colors.onError} onPress={onExit}>
            {t("common.actions.exit")}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
