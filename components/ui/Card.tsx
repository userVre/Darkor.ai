import React, {type PropsWithChildren} from "react";
import {StyleSheet, type StyleProp, type ViewStyle} from "react-native";
import {Card as PaperCard, type CardProps as PaperCardProps} from "react-native-paper";

import {md3Shapes} from "../../constants/md3Theme";

const PaperCardAny = PaperCard as React.ComponentType<any>;

export type MD3CardType = "elevated" | "filled" | "outlined";

export type MD3CardProps = PropsWithChildren<
  Omit<PaperCardProps, "mode" | "children"> & {
    type?: MD3CardType;
    contentStyle?: StyleProp<ViewStyle>;
  }
>;

const typeToMode: Record<MD3CardType, PaperCardProps["mode"]> = {
  elevated: "elevated",
  filled: "contained",
  outlined: "outlined",
};

function MD3Card({children, type = "elevated", style, contentStyle, ...props}: MD3CardProps) {
  const cardContent = <PaperCard.Content style={contentStyle}>{children}</PaperCard.Content>;

  if (type === "filled") {
    return (
      <PaperCardAny {...props} mode="contained" style={[styles.card, style]}>
        {cardContent}
      </PaperCardAny>
    );
  }

  if (type === "outlined") {
    return (
      <PaperCardAny {...props} mode="outlined" style={[styles.card, style]}>
        {cardContent}
      </PaperCardAny>
    );
  }

  return (
    <PaperCardAny {...props} mode={typeToMode[type]} style={[styles.card, style]}>
      {cardContent}
    </PaperCardAny>
  );
}

export function ElevatedCard(props: Omit<MD3CardProps, "type">) {
  return <MD3Card {...props} type="elevated" />;
}

export function FilledCard(props: Omit<MD3CardProps, "type">) {
  return <MD3Card {...props} type="filled" />;
}

export function OutlinedCard(props: Omit<MD3CardProps, "type">) {
  return <MD3Card {...props} type="outlined" />;
}

export {MD3Card as Card};
export default MD3Card;

const styles = StyleSheet.create({
  card: {
    borderRadius: md3Shapes.large,
    overflow: "hidden",
  },
});
