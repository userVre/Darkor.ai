import type {ReactNode} from "react";
import {Portal, Dialog as PaperDialog, Text} from "react-native-paper";

import {TextButton, FilledButton} from "./Button";

export type DialogAction = {
  label: string;
  onPress: () => void;
  mode?: "text" | "filled";
  disabled?: boolean;
};

export type DialogProps = {
  visible: boolean;
  title?: string;
  children?: ReactNode;
  supportingText?: string;
  icon?: string;
  actions?: DialogAction[];
  onDismiss: () => void;
};

export function Dialog({visible, title, children, supportingText, icon, actions = [], onDismiss}: DialogProps) {
  return (
    <Portal>
      <PaperDialog visible={visible} onDismiss={onDismiss}>
        {icon ? <PaperDialog.Icon icon={icon} /> : null}
        {title ? <PaperDialog.Title>{title}</PaperDialog.Title> : null}
        <PaperDialog.Content>
          {supportingText ? <Text variant="bodyMedium">{supportingText}</Text> : null}
          {children}
        </PaperDialog.Content>
        {actions.length > 0 ? (
          <PaperDialog.Actions>
            {actions.map((action) =>
              action.mode === "filled" ? (
                <FilledButton key={action.label} compact disabled={action.disabled} onPress={action.onPress}>
                  {action.label}
                </FilledButton>
              ) : (
                <TextButton key={action.label} compact disabled={action.disabled} onPress={action.onPress}>
                  {action.label}
                </TextButton>
              ),
            )}
          </PaperDialog.Actions>
        ) : null}
      </PaperDialog>
    </Portal>
  );
}

export default Dialog;
