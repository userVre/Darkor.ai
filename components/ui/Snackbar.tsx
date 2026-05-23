import type {ComponentProps} from "react";
import {Snackbar as PaperSnackbar} from "react-native-paper";

export type SnackbarProps = ComponentProps<typeof PaperSnackbar>;

export function Snackbar(props: SnackbarProps) {
  return <PaperSnackbar {...props} duration={props.duration ?? 4000} />;
}

export default Snackbar;
