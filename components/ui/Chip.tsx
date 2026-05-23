import type {ComponentProps} from "react";
import {StyleSheet} from "react-native";
import {Chip as PaperChip} from "react-native-paper";

import {md3Shapes} from "../../constants/md3Theme";

export type MD3ChipProps = ComponentProps<typeof PaperChip>;

function MD3Chip({style, textStyle, ...props}: MD3ChipProps) {
  return <PaperChip {...props} style={[styles.chip, style]} textStyle={[styles.text, textStyle]} />;
}

export function AssistChip(props: MD3ChipProps) {
  return <MD3Chip {...props} elevated={false} />;
}

export function FilterChip(props: MD3ChipProps) {
  return <MD3Chip {...props} showSelectedOverlay />;
}

export function InputChip(props: MD3ChipProps) {
  return <MD3Chip {...props} closeIcon={props.closeIcon ?? "close"} />;
}

export function SuggestionChip(props: MD3ChipProps) {
  return <MD3Chip {...props} mode={props.mode ?? "flat"} />;
}

export {MD3Chip as Chip};
export default MD3Chip;

const styles = StyleSheet.create({
  chip: {
    borderRadius: md3Shapes.small,
  },
  text: {
    letterSpacing: 0,
  },
});
