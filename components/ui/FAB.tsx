import type {ComponentProps} from "react";
import {FAB as PaperFAB} from "react-native-paper";

export type FABProps = ComponentProps<typeof PaperFAB>;

export function FAB(props: FABProps) {
  return <PaperFAB {...props} variant={props.variant ?? "primary"} />;
}

export function ExtendedFAB(props: FABProps & {label: string}) {
  return <PaperFAB {...props} variant={props.variant ?? "primary"} />;
}

export default FAB;
