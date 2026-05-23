import type {ComponentProps} from "react";
import {IconButton as PaperIconButton} from "react-native-paper";

export type IconButtonProps = ComponentProps<typeof PaperIconButton>;

export function IconButton(props: IconButtonProps) {
  return <PaperIconButton {...props} mode={props.mode ?? "contained-tonal"} />;
}

export default IconButton;
