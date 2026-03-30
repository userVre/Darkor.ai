import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { Gem } from "lucide-react-native";
import { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { triggerHaptic } from "../lib/haptics";
import { fonts } from "../styles/typography";

type ExteriorRedesignStepThreeStyleCard = {
  id: string;
  title: string;
  image: number;
};

type ExteriorRedesignStepThreeProps = {
  creditCount: number;
  styles: ExteriorRedesignStepThreeStyleCard[];
  selectedStyle: string | null;
  onSelectStyle: (style: string | null) => void;
  onContinue: () => void;
  onExit: () => void;
};

const REFERENCE_WIDTH = 456;
const REFERENCE_HEIGHT = 932;
const ACTIVE_CONTINUE_COLOR = "#FF3B30";

function scaleValue(value: number, scale: number) {
  return value * scale;
}

function chunkIntoRows<T>(items: T[], size: number) {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
}

export function ExteriorRedesignStepThree({
  creditCount,
  styles,
  selectedStyle,
  onSelectStyle,
  onContinue,
  onExit,
}: ExteriorRedesignStepThreeProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const layoutScale = Math.min(width / REFERENCE_WIDTH, height / REFERENCE_HEIGHT, 1);
  const sideInset = scaleValue(20, layoutScale);
  const headerInset = scaleValue(68, layoutScale);
  const gridGap = scaleValue(24, layoutScale);
  const gridVerticalGap = scaleValue(12, layoutScale);
  const mainWidth = Math.min(width - sideInset * 2, scaleValue(416, layoutScale));
  const topBadgeTop = scaleValue(36, layoutScale);
  const topTitleTop = scaleValue(52, layoutScale);
  const progressTop = scaleValue(74, layoutScale);
  const progressSegmentWidth = scaleValue(92, layoutScale);
  const progressGap = scaleValue(16, layoutScale);
  const titleTop = progressTop + scaleValue(28, layoutScale);
  const subtitleTopGap = scaleValue(12, layoutScale);
  const gridTopGap = scaleValue(24, layoutScale);
  const cardWidth = scaleValue(120, layoutScale);
  const cardHeight = scaleValue(164, layoutScale);
  const cardImageHeight = scaleValue(108, layoutScale);
  const cardLabelHeight = scaleValue(56, layoutScale);
  const labelTextTop = scaleValue(24, layoutScale);
  const labelTextLeft = scaleValue(20, layoutScale);
  const bottomContainerHeight = scaleValue(132, layoutScale);
  const buttonHeight = scaleValue(60, layoutScale);
  const buttonTop = scaleValue(52, layoutScale);
  const rows = useMemo(() => chunkIntoRows(styles, 3), [styles]);
  const canContinue = Boolean(selectedStyle);

  const handleExitPress = () => {
    triggerHaptic();
    Alert.alert("Exit?", "Your progress will be lost.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Exit",
        style: "destructive",
        onPress: () => {
          onExit();
        },
      },
    ]);
  };

  const handleStylePress = (styleTitle: string) => {
    triggerHaptic();
    onSelectStyle(selectedStyle === styleTitle ? null : styleTitle);
  };

  const handleContinuePress = () => {
    if (!canContinue) {
      return;
    }
    triggerHaptic();
    onContinue();
  };

  return (
    <View style={stylesSheet.screen}>
      <StatusBar style="dark" />

      <View style={[stylesSheet.creditBadge, { top: topBadgeTop, left: sideInset }]}>
        <Gem color="#FFFFFF" size={13} strokeWidth={2.1} />
        <Text style={stylesSheet.creditText}>{creditCount}</Text>
      </View>

      <Text style={[stylesSheet.stepText, { top: topTitleTop }]}>Step 3 / 4</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close exterior style selection"
        onPress={handleExitPress}
        style={[stylesSheet.closeButton, { top: topTitleTop, right: scaleValue(36, layoutScale) }]}
      >
        <Text style={stylesSheet.closeText}>{"\u00D7"}</Text>
      </Pressable>

      <View style={[stylesSheet.progressRow, { top: progressTop, width: mainWidth, right: sideInset }]}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View
            key={`exterior-style-progress-${index}`}
            style={[
              stylesSheet.progressSegment,
              {
                width: progressSegmentWidth,
                marginRight: index === 3 ? 0 : progressGap,
                backgroundColor: index < 3 ? "#0A0A0A" : "#E0E0E0",
              },
            ]}
          />
        ))}
      </View>

      <ScrollView
        style={stylesSheet.content}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: titleTop,
          paddingBottom: bottomContainerHeight + insets.bottom + scaleValue(36, layoutScale),
        }}
      >
        <Text style={[stylesSheet.title, { marginLeft: headerInset }]}>Select Style</Text>
        <Text style={[stylesSheet.subtitle, { marginLeft: headerInset, marginTop: subtitleTopGap, marginRight: headerInset }]}>
          Select your desired design style to start creating your ideal exterior
        </Text>

        <View style={{ marginTop: gridTopGap, width: cardWidth * 3 + gridGap * 2, alignSelf: "center" }}>
          {rows.map((row, rowIndex) => (
            <View
              key={`exterior-style-row-${rowIndex}`}
              style={{
                flexDirection: "row",
                marginBottom: rowIndex === rows.length - 1 ? 0 : gridVerticalGap,
              }}
            >
              {row.map((styleCard, columnIndex) => {
                const active = selectedStyle === styleCard.title;

                return (
                  <Pressable
                    key={styleCard.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    hitSlop={12}
                    onPress={() => handleStylePress(styleCard.title)}
                    style={[
                      stylesSheet.styleCard,
                      {
                        width: cardWidth,
                        height: cardHeight,
                        marginRight: columnIndex === row.length - 1 ? 0 : gridGap,
                        borderColor: active ? ACTIVE_CONTINUE_COLOR : "#E5E5E5",
                      },
                    ]}
                  >
                    <Image
                      source={styleCard.image}
                      style={{ width: "100%", height: cardImageHeight }}
                      contentFit="cover"
                      transition={120}
                      cachePolicy="memory-disk"
                    />
                    <View style={[stylesSheet.labelBar, { height: cardLabelHeight }]}>
                      <Text
                        numberOfLines={2}
                        style={[
                          stylesSheet.labelText,
                          {
                            top: labelTextTop,
                            left: labelTextLeft,
                            color: active ? ACTIVE_CONTINUE_COLOR : "#0A0A0A",
                          },
                        ]}
                      >
                        {styleCard.title}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[stylesSheet.bottomContainer, { paddingBottom: insets.bottom }]}>
        <View style={[stylesSheet.bottomContainerInner, { height: bottomContainerHeight }]}>
          <Pressable
            accessibilityRole="button"
            disabled={!canContinue}
            onPress={handleContinuePress}
            pointerEvents={canContinue ? "auto" : "none"}
            style={[
              stylesSheet.continueButton,
              {
                width: mainWidth,
                height: buttonHeight,
                marginTop: buttonTop,
                backgroundColor: canContinue ? ACTIVE_CONTINUE_COLOR : "#E8E8E8",
              },
            ]}
          >
            <Text style={[stylesSheet.continueText, { color: canContinue ? "#FFFFFF" : "#A0A0A0" }]}>Continue</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const stylesSheet = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  creditBadge: {
    position: "absolute",
    zIndex: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    backgroundColor: "#0A0A0A",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  creditText: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 13,
    ...fonts.bold,
  },
  stepText: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 3,
    textAlign: "center",
    color: "#0A0A0A",
    fontSize: 14,
    lineHeight: 18,
    ...fonts.semibold,
  },
  closeButton: {
    position: "absolute",
    zIndex: 3,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    color: "#0A0A0A",
    fontSize: 18,
    lineHeight: 18,
    ...fonts.bold,
  },
  progressRow: {
    position: "absolute",
    zIndex: 2,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  progressSegment: {
    height: 4,
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    color: "#0A0A0A",
    fontSize: 24,
    lineHeight: 29,
    ...fonts.bold,
  },
  subtitle: {
    color: "#6F6F6F",
    fontSize: 15,
    lineHeight: 22,
    ...fonts.regular,
  },
  styleCard: {
    overflow: "hidden",
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: "#FFFFFF",
  },
  labelBar: {
    position: "relative",
    backgroundColor: "#FFFFFF",
  },
  labelText: {
    position: "absolute",
    right: 8,
    fontSize: 11,
    lineHeight: 13,
    ...fonts.semibold,
  },
  bottomContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
  },
  bottomContainerInner: {
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F1F1",
    backgroundColor: "#FFFFFF",
  },
  continueButton: {
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  continueText: {
    fontSize: 16,
    lineHeight: 20,
    ...fonts.semibold,
  },
});
