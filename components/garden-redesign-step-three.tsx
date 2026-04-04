import { StatusBar } from "expo-status-bar";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { triggerHaptic } from "../lib/haptics";
import { fonts } from "../styles/typography";
import { DesignStepHeader } from "./design-step-header";

type GardenRedesignStepThreePalette = {
  id: string;
  label: string;
  colors: string[];
};

type GardenRedesignStepThreeProps = {
  palettes: GardenRedesignStepThreePalette[];
  selectedPaletteId: string | null;
  onSelectPalette: (paletteId: string | null) => void;
  onBack: () => void;
  onContinue: () => void;
  onExit: () => void;
};

const REFERENCE_WIDTH = 456;
const REFERENCE_HEIGHT = 932;
const PALETTE_REFERENCE_WIDTH = 500;
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

export function GardenRedesignStepThree({
  palettes,
  selectedPaletteId,
  onSelectPalette,
  onBack,
  onContinue,
  onExit,
}: GardenRedesignStepThreeProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const layoutScale = Math.min(width / REFERENCE_WIDTH, height / REFERENCE_HEIGHT, 1);
  const paletteScale = Math.min(width / PALETTE_REFERENCE_WIDTH, 1);
  const sideInset = scaleValue(20, layoutScale);
  const mainWidth = Math.min(width - sideInset * 2, scaleValue(416, layoutScale));
  const headerTop = scaleValue(36, layoutScale);
  const progressTop = scaleValue(74, layoutScale);
  const progressGap = scaleValue(16, layoutScale);
  const progressSegmentWidth = (mainWidth - progressGap * 2) / 3;
  const titleTop = progressTop + scaleValue(36, layoutScale);
  const titleLeft = 24;
  const paletteTitleTopGap = scaleValue(20, paletteScale);
  const paletteMargin = scaleValue(24, paletteScale);
  const paletteCardWidth = scaleValue(124, paletteScale);
  const paletteCardHeight = scaleValue(164, paletteScale);
  const paletteCardTopHeight = scaleValue(108, paletteScale);
  const paletteLabelHeight = scaleValue(56, paletteScale);
  const paletteHorizontalGap = scaleValue(40, paletteScale);
  const paletteVerticalGap = scaleValue(8, paletteScale);
  const paletteLabelTop = scaleValue(28, paletteScale);
  const paletteLabelLeft = scaleValue(16, paletteScale);
  const bottomContainerHeight = scaleValue(132, layoutScale);
  const buttonHeight = scaleValue(60, layoutScale);
  const buttonTop = scaleValue(52, layoutScale);
  const paletteRows = chunkIntoRows(palettes, 3);
  const paletteGridWidth = paletteCardWidth * 3 + paletteHorizontalGap * 2;
  const canContinue = Boolean(selectedPaletteId);

  const handlePalettePress = (paletteId: string) => {
    triggerHaptic();
    onSelectPalette(selectedPaletteId === paletteId ? null : paletteId);
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

      <DesignStepHeader
        backAccessibilityLabel="Go to the previous step"
        closeAccessibilityLabel="Go back to step 1"
        horizontalInset={sideInset}
        onBack={onBack}
        onClose={onExit}
        step={3}
        top={headerTop}
        totalSteps={3}
      />

      <View style={[styles.progressRow, { top: progressTop, width: mainWidth, right: sideInset }]}>
        {Array.from({ length: 3 }).map((_, index) => (
          <View
            key={`garden-palette-progress-${index}`}
            style={[
              styles.progressSegment,
              {
                width: progressSegmentWidth,
                marginRight: index === 2 ? 0 : progressGap,
                backgroundColor: "#0A0A0A",
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
        <Text style={[styles.title, { marginLeft: titleLeft }]}>Select Palette</Text>

        <View style={{ marginTop: paletteTitleTopGap, paddingHorizontal: paletteMargin }}>
          <View style={{ width: paletteGridWidth, alignSelf: "center" }}>
            {paletteRows.map((row, rowIndex) => (
              <View
                key={`garden-palette-row-${rowIndex}`}
                style={{
                  flexDirection: "row",
                  marginBottom: rowIndex === paletteRows.length - 1 ? 0 : paletteVerticalGap,
                }}
              >
                {row.map((palette, columnIndex) => {
                  const active = selectedPaletteId === palette.id;

                  return (
                    <Pressable
                      key={palette.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      hitSlop={12}
                      onPress={() => handlePalettePress(palette.id)}
                      style={[
                        styles.paletteCard,
                        {
                          width: paletteCardWidth,
                          height: paletteCardHeight,
                          marginRight: columnIndex === row.length - 1 ? 0 : paletteHorizontalGap,
                          borderColor: active ? ACTIVE_CONTINUE_COLOR : "#E5E5E5",
                        },
                      ]}
                    >
                      <View style={{ height: paletteCardTopHeight, flexDirection: "row" }}>
                        {palette.colors.slice(0, 4).map((color) => (
                          <View key={`${palette.id}-${color}`} style={{ flex: 1, backgroundColor: color }} />
                        ))}
                      </View>
                      <View style={[styles.paletteLabelBar, { height: paletteLabelHeight }]}>
                        <Text
                          numberOfLines={2}
                          style={[
                            styles.paletteLabelText,
                            {
                              top: paletteLabelTop,
                              left: paletteLabelLeft,
                              color: active ? ACTIVE_CONTINUE_COLOR : "#0A0A0A",
                            },
                          ]}
                        >
                          {palette.label}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
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
    width: 44,
    height: 44,
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
    textAlign: "left",
    ...fonts.bold,
  },
  paletteCard: {
    overflow: "hidden",
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: "#FFFFFF",
  },
  paletteLabelBar: {
    position: "relative",
    backgroundColor: "#EFEFEF",
  },
  paletteLabelText: {
    position: "absolute",
    right: 8,
    fontSize: 10,
    lineHeight: 12,
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
    alignSelf: "center",
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
