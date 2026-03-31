import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft } from "lucide-react-native";
import { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { triggerHaptic } from "../lib/haptics";
import { fonts } from "../styles/typography";

type ExteriorRedesignStepTwoCard = {
  id: string;
  title: string;
  image: number;
};

type ExteriorRedesignStepTwoProps = {
  cards: ExteriorRedesignStepTwoCard[];
  selectedBuildingType: string | null;
  onSelectBuildingType: (buildingType: string | null) => void;
  onBack: () => void;
  onContinue: () => void;
  onExit: () => void;
};

const REFERENCE_WIDTH = 460;
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

export function ExteriorRedesignStepTwo({
  cards,
  selectedBuildingType,
  onSelectBuildingType,
  onBack,
  onContinue,
  onExit,
}: ExteriorRedesignStepTwoProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const layoutScale = Math.min(width / REFERENCE_WIDTH, height / REFERENCE_HEIGHT, 1);
  const sideInset = scaleValue(20, layoutScale);
  const mainWidth = Math.min(width - sideInset * 2, scaleValue(420, layoutScale));
  const topTitleTop = scaleValue(52, layoutScale);
  const progressTop = scaleValue(74, layoutScale);
  const progressSegmentWidth = scaleValue(92, layoutScale);
  const progressGap = scaleValue(16, layoutScale);
  const titleLeft = scaleValue(48, layoutScale);
  const titleTop = progressTop + scaleValue(24, layoutScale);
  const subtitleTopGap = scaleValue(12, layoutScale);
  const gridTopGap = scaleValue(24, layoutScale);
  const gridWidth = scaleValue(460, layoutScale);
  const gridLeftInset = scaleValue(16, layoutScale);
  const gridRightInset = scaleValue(12, layoutScale);
  const cardWidth = scaleValue(204, layoutScale);
  const cardHeight = scaleValue(240, layoutScale);
  const cardGap = scaleValue(24, layoutScale);
  const rowGap = scaleValue(8, layoutScale);
  const labelBarHeight = scaleValue(44, layoutScale);
  const labelLeft = scaleValue(56, layoutScale);
  const bottomContainerHeight = scaleValue(132, layoutScale);
  const buttonHeight = scaleValue(60, layoutScale);
  const buttonTop = scaleValue(52, layoutScale);
  const rows = useMemo(() => chunkIntoRows(cards, 2), [cards]);
  const canContinue = Boolean(selectedBuildingType);

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

  const handleBackPress = () => {
    triggerHaptic();
    onBack();
  };

  const handleCardPress = (title: string) => {
    triggerHaptic();
    onSelectBuildingType(selectedBuildingType === title ? null : title);
  };

  const handleContinuePress = () => {
    if (!canContinue) {
      return;
    }
    triggerHaptic();
    onContinue();
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={handleBackPress}
        style={[styles.navButton, { top: topTitleTop, left: scaleValue(20, layoutScale) }]}
      >
        <ArrowLeft color="#0A0A0A" size={18} strokeWidth={2.4} />
      </Pressable>

      <Text style={[styles.stepText, { top: topTitleTop }]}>Step 2 / 4</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close building type selection"
        onPress={handleExitPress}
        style={[styles.navButton, { top: topTitleTop, right: scaleValue(36, layoutScale) }]}
      >
        <Text style={styles.closeText}>{"\u00D7"}</Text>
      </Pressable>

      <View style={[styles.progressRow, { top: progressTop, width: mainWidth, right: sideInset }]}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View
            key={`exterior-building-progress-${index}`}
            style={[
              styles.progressSegment,
              {
                width: progressSegmentWidth,
                marginRight: index === 3 ? 0 : progressGap,
                backgroundColor: index < 2 ? "#0A0A0A" : "#E0E0E0",
              },
            ]}
          />
        ))}
      </View>

      <ScrollView
        style={styles.content}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: titleTop,
          paddingBottom: bottomContainerHeight + insets.bottom + scaleValue(36, layoutScale),
        }}
      >
        <Text style={[styles.title, { marginLeft: titleLeft }]}>Choose Building Type</Text>
        <Text style={[styles.subtitle, { marginLeft: titleLeft, marginTop: subtitleTopGap, marginRight: titleLeft }]}>
          Select the building type to redesign and see it in your chosen style
        </Text>

        <View style={{ marginTop: gridTopGap, width: gridWidth, alignSelf: "center" }}>
          {rows.map((row, rowIndex) => (
            <View
              key={`exterior-building-row-${rowIndex}`}
              style={{
                flexDirection: "row",
                paddingLeft: gridLeftInset,
                paddingRight: gridRightInset,
                marginBottom: rowIndex === rows.length - 1 ? 0 : rowGap,
              }}
            >
              {row.map((card, columnIndex) => {
                const active = selectedBuildingType === card.title;
                return (
                  <Pressable
                    key={card.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    hitSlop={12}
                    onPress={() => handleCardPress(card.title)}
                    style={[
                      styles.card,
                      {
                        width: cardWidth,
                        height: cardHeight,
                        marginRight: columnIndex === row.length - 1 ? 0 : cardGap,
                        borderColor: active ? ACTIVE_CONTINUE_COLOR : "#E5E5E5",
                      },
                    ]}
                  >
                    <Image
                      source={card.image}
                      style={{ width: "100%", height: cardHeight - labelBarHeight }}
                      contentFit="cover"
                      transition={120}
                      cachePolicy="memory-disk"
                    />
                    <View style={[styles.labelBar, { height: labelBarHeight }]}>
                      <View style={{ flex: 1, justifyContent: "center", paddingLeft: labelLeft, paddingRight: scaleValue(10, layoutScale) }}>
                        <Text numberOfLines={1} style={[styles.labelText, { color: active ? ACTIVE_CONTINUE_COLOR : "#0A0A0A" }]}>
                          {card.title}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom }]}>
        <View style={[styles.bottomContainerInner, { height: bottomContainerHeight }]}>
          <Pressable
            accessibilityRole="button"
            disabled={!canContinue}
            onPress={handleContinuePress}
            pointerEvents={canContinue ? "auto" : "none"}
            style={[
              styles.continueButton,
              {
                width: mainWidth,
                height: buttonHeight,
                marginTop: buttonTop,
                backgroundColor: canContinue ? ACTIVE_CONTINUE_COLOR : "#E8E8E8",
              },
            ]}
          >
            <Text style={[styles.continueText, { color: canContinue ? "#FFFFFF" : "#A0A0A0" }]}>Continue</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  navButton: {
    position: "absolute",
    zIndex: 4,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 4,
    textAlign: "center",
    color: "#0A0A0A",
    fontSize: 14,
    lineHeight: 18,
    ...fonts.semibold,
  },
  closeText: {
    color: "#0A0A0A",
    fontSize: 18,
    lineHeight: 18,
    ...fonts.bold,
  },
  progressRow: {
    position: "absolute",
    zIndex: 3,
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
  card: {
    overflow: "hidden",
    borderRadius: 18,
    borderWidth: 1.5,
    backgroundColor: "#FFFFFF",
  },
  labelBar: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  labelText: {
    fontSize: 14,
    lineHeight: 18,
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
