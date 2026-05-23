import type {ReactNode} from "react";
import {StyleSheet, View, type StyleProp, type ViewStyle} from "react-native";
import {Modal, Portal, Surface, useTheme} from "react-native-paper";

import {md3Shapes} from "../../constants/md3Theme";

export type ModalBottomSheetProps = {
  visible: boolean;
  onDismiss: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

export function ModalBottomSheet({visible, onDismiss, children, style, contentStyle}: ModalBottomSheetProps) {
  const theme = useTheme();

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.container, style]}
        dismissable
      >
        <Surface
          elevation={2}
          mode="elevated"
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.elevation.level2,
            },
            contentStyle,
          ]}
        >
          <View style={[styles.handle, {backgroundColor: theme.colors.onSurfaceVariant}]} />
          {children}
        </Surface>
      </Modal>
    </Portal>
  );
}

export {ModalBottomSheet as BottomSheet};
export default ModalBottomSheet;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
    margin: 0,
  },
  sheet: {
    borderTopLeftRadius: md3Shapes.extraLarge,
    borderTopRightRadius: md3Shapes.extraLarge,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
  },
  handle: {
    alignSelf: "center",
    width: 32,
    height: 4,
    borderRadius: md3Shapes.full,
    marginBottom: 20,
    opacity: 0.4,
  },
});
