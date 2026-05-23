import type {ComponentProps} from "react";
import {ActivityIndicator, ProgressBar} from "react-native-paper";

export type LinearProgressIndicatorProps = ComponentProps<typeof ProgressBar>;
export type CircularProgressIndicatorProps = ComponentProps<typeof ActivityIndicator>;

export function LinearProgressIndicator(props: LinearProgressIndicatorProps) {
  return <ProgressBar {...props} />;
}

export function CircularProgressIndicator(props: CircularProgressIndicatorProps) {
  return <ActivityIndicator {...props} />;
}

export {ProgressBar, ActivityIndicator};
export default LinearProgressIndicator;
