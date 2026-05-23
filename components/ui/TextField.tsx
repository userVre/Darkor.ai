import {StyleSheet} from "react-native";
import {TextInput as PaperTextInput, type TextInputProps} from "react-native-paper";

import {md3Shapes} from "../../constants/md3Theme";

export type MD3TextFieldProps = Omit<TextInputProps, "mode">;

function MD3TextField({style, outlineStyle, contentStyle, mode, ...props}: MD3TextFieldProps & {mode: "flat" | "outlined"}) {
  return (
    <PaperTextInput
      {...props}
      mode={mode}
      contentStyle={[styles.content, contentStyle]}
      outlineStyle={[styles.outline, outlineStyle]}
      style={[styles.input, style]}
    />
  );
}

export function FilledTextField(props: MD3TextFieldProps) {
  return <MD3TextField {...props} mode="flat" />;
}

export function OutlinedTextField(props: MD3TextFieldProps) {
  return <MD3TextField {...props} mode="outlined" />;
}

export {PaperTextInput as TextInput};
export default FilledTextField;

const styles = StyleSheet.create({
  input: {
    backgroundColor: "transparent",
  },
  content: {
    letterSpacing: 0,
  },
  outline: {
    borderRadius: md3Shapes.small,
  },
});
