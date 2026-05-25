import React, {type PropsWithChildren} from "react";
import {StyleSheet, type StyleProp, type ViewStyle} from "react-native";
import {Card as PaperCard, type CardProps as PaperCardProps} from "react-native-paper";

import {md3Shapes} from "../../constants/md3Theme";

const PaperCardAny = PaperCard as React.ComponentType<any>;

type MD3CardProps = PropsWithChildren<
  Omit<PaperCardProps, "mode" | "children"> & {
    contentStyle?: StyleProp<ViewStyle>;
  }
>;

export function FilledCard({children, style, contentStyle, ...props}: MD3CardProps) {
  return (
    <PaperCardAny {...props} mode="contained" style={[styles.card, style]}>
      <PaperCard.Content style={contentStyle}>{children}</PaperCard.Content>
    </PaperCardAny>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: md3Shapes.large,
    overflow: "hidden",
  },
});
