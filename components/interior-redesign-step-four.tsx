import { StatusBar } from "expo-status-bar";
import { Gem, PaintRoller, Wand2 } from "lucide-react-native";
import { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { triggerHaptic } from "../lib/haptics";
import { fonts } from "../styles/typography";
import { InteriorRedesignStepProgress } from "./interior-redesign-step-progress";

type InteriorRedesignStepFourMode = {
  id: string;
  title: string;
  description: string;
};

type InteriorRedesignStepFourPalette = {
  id: string;
  label: string;
  colors: string[];
};

type InteriorRedesignStepFourProps = {
  creditCount: number;
  modes: InteriorRedesignStepFourMode[];
  palettes: InteriorRedesignStepFourPalette[];
  selectedModeId: string | null;
  selectedPaletteId: string | null;
  onSelectMode: (modeId: string | null) => void;
  onSelectPalette: (paletteId: string | null) => void;
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

function ModePreviewGraphic({ active, variant }: { active: boolean; variant: "preserve" | "renovate" }) {
  const accentColor = active ? ACTIVE_CONTINUE_COLOR : "#0A0A0A";
  const wallColor = variant === "preserve" ? "#E9E4DD" : "#F5DAD6";
  const floorColor = variant === "preserve" ? "#D5C4B2" : "#D9B09A";
  const featureColor = variant === "preserve" ? "#B68C6A" : "#CE6D55";

  return (
    <View style={[styles.modePreviewFrame, { borderColor: active ? "#F4C4BD" : "#E9E9E9" }]}>
      <View style={[styles.modePreviewWall, { backgroundColor: wallColor }]} />
      <View style={[styles.modePreviewFloor, { backgroundColor: floorColor }]} />
      <View style={[styles.modePreviewSofa, { backgroundColor: featureColor }]} />
      <View style={[styles.modePreviewPillar, { backgroundColor: accentColor, opacity: variant === "renovate" ? 0.72 : 0.4 }]} />
      <View style={[styles.modePreviewAccent, { backgroundColor: accentColor }]} />
    </View>
  );
}

function ModeSelectionCard({
  active,
  description,
  height,
  iconSize,
  layoutScale,
  onPress,
  style,
  title,
  variant,
  width,
}: {
  active: boolean;
  description: string;
  height: number;
  iconSize: number;
  layoutScale: number;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  title: string;
  variant: "preserve" | "renovate";
  width: number;
}) {
  const horizontalPadding = scaleValue(16, layoutScale);
  const topPadding = scaleValue(12, layoutScale);
  const contentGap = scaleValue(12, layoutScale);
  const textGap = scaleValue(8, layoutScale);
  const previewBottom = scaleValue(14, layoutScale);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      hitSlop={12}
      onPress={onPress}
      style={[
        styles.modeCard,
        {
          width,
          height,
          borderColor: active ? ACTIVE_CONTINUE_COLOR : "#E5E5E5",
        },
        style,
      ]}
    >
      <View style={[styles.modeCardContent, { paddingTop: topPadding, paddingHorizontal: horizontalPadding, gap: contentGap }]}>
        <View
          style={[
            styles.modeIconWrap,
            {
              borderColor: active ? "#FFC1B8" : "#ECECEC",
              backgroundColor: active ? "#FFF1EE" : "#F8F8F8",
            },
          ]}
        >
          {variant === "renovate" ? (
            <Wand2 color={active ? ACTIVE_CONTINUE_COLOR : "#0A0A0A"} size={iconSize} strokeWidth={2.1} />
          ) : (
            <PaintRoller color={active ? ACTIVE_CONTINUE_COLOR : "#0A0A0A"} size={iconSize} strokeWidth={2.1} />
          )}
        </View>

        <View style={{ gap: textGap }}>
          <Text style={[styles.modeTitle, { color: active ? ACTIVE_CONTINUE_COLOR : "#0A0A0A" }]} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.modeDescription} numberOfLines={2}>
            {description}
          </Text>
        </View>
      </View>

      <View style={[styles.modePreviewSlot, { left: horizontalPadding, right: horizontalPadding, bottom: previewBottom }]}>
        <ModePreviewGraphic active={active} variant={variant} />
      </View>
    </Pressable>
  );
}

export function InteriorRedesignStepFour({
  creditCount,
  modes,
  palettes,
  selectedModeId,
  selectedPaletteId,
  onSelectMode,
  onSelectPalette,
  onContinue,
  onExit,
}: InteriorRedesignStepFourProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const layoutScale = Math.min(width / REFERENCE_WIDTH, height / REFERENCE_HEIGHT, 1);
  const paletteScale = Math.min(width / PALETTE_REFERENCE_WIDTH, 1);
  const sideInset = scaleValue(20, layoutScale);
  const mainWidth = Math.min(width - sideInset * 2, scaleValue(416, layoutScale));
  const topBadgeTop = scaleValue(36, layoutScale);
  const topTitleTop = scaleValue(52, layoutScale);
  const progressTop = scaleValue(74, layoutScale);
  const progressSegmentWidth = scaleValue(92, layoutScale);
  const progressGap = scaleValue(16, layoutScale);
  const sectionTitleLeft = scaleValue(20, layoutScale);
  const modeTitleTop = progressTop + scaleValue(36, layoutScale);
  const modeCardsTopGap = scaleValue(16, layoutScale);
  const modeCardWidth = scaleValue(196, layoutScale);
  const modeCardHeight = scaleValue(192, layoutScale);
  const modeCardGap = scaleValue(16, layoutScale);
  const modeIconSize = scaleValue(28, layoutScale);
  const modeSectionToPaletteGap = scaleValue(48, layoutScale);
  const paletteTitleTopGap = scaleValue(20, layoutScale);
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
  const paletteRows = useMemo(() => chunkIntoRows(palettes, 3), [palettes]);
  const canContinue = Boolean(selectedModeId && selectedPaletteId);
  const paletteGridWidth = paletteCardWidth * 3 + paletteHorizontalGap * 2;

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

  const handleModePress = (modeId: string) => {
    triggerHaptic();
    onSelectMode(selectedModeId === modeId ? null : modeId);
  };

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

      <View style={[styles.creditBadge, { top: topBadgeTop, left: sideInset }]}>
        <Gem color="#FFFFFF" size={13} strokeWidth={2.1} />
        <Text style={styles.creditText}>{creditCount}</Text>
      </View>

      <Text style={[styles.stepText, { top: topTitleTop }]}>Step 4 / 4</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close mode and palette selection"
        onPress={handleExitPress}
        style={[styles.closeButton, { top: topTitleTop, right: scaleValue(36, layoutScale) }]}
      >
        <Text style={styles.closeText}>{"\u00D7"}</Text>
      </Pressable>

      <InteriorRedesignStepProgress
        currentStep={4}
        segmentWidth={progressSegmentWidth}
        gap={progressGap}
        style={{ top: progressTop, width: mainWidth, right: sideInset, zIndex: 2 }}
      />

      <ScrollView
        style={styles.content}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: modeTitleTop,
          paddingBottom: bottomContainerHeight + insets.bottom + scaleValue(36, layoutScale),
        }}
      >
        <Text style={[styles.sectionTitle, { marginLeft: sectionTitleLeft }]}>Mode</Text>

        <View style={{ marginTop: modeCardsTopGap, width: modeCardWidth * 2 + modeCardGap, alignSelf: "center" }}>
          <View style={{ flexDirection: "row" }}>
            {modes.map((mode, index) => {
              const active = selectedModeId === mode.id;

              return (
                <ModeSelectionCard
                  key={mode.id}
                  onPress={() => handleModePress(mode.id)}
                  active={active}
                  description={mode.description}
                  height={modeCardHeight}
                  iconSize={modeIconSize}
                  layoutScale={layoutScale}
                  style={index === modes.length - 1 ? undefined : { marginRight: modeCardGap }}
                  title={mode.title}
                  variant={mode.id === "renovate" ? "renovate" : "preserve"}
                  width={modeCardWidth}
                />
              );
            })}
          </View>
        </View>

        <Text style={[styles.sectionTitle, { marginLeft: sectionTitleLeft, marginTop: modeSectionToPaletteGap }]}>Select Palette</Text>

        <View style={{ marginTop: paletteTitleTopGap, paddingHorizontal: paletteMargin }}>
          <View style={{ width: paletteGridWidth, alignSelf: "center" }}>
            {paletteRows.map((row, rowIndex) => (
              <View
                key={`interior-palette-row-${rowIndex}`}
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
                        {palette.colors.map((color) => (
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
  content: {
    flex: 1,
  },
  sectionTitle: {
    color: "#0A0A0A",
    fontSize: 24,
    lineHeight: 29,
    ...fonts.bold,
  },
  modeCard: {
    overflow: "hidden",
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: "#FFFFFF",
  },
  modeCardContent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  modePreviewSlot: {
    position: "absolute",
  },
  modeIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modeTitle: {
    fontSize: 16,
    lineHeight: 20,
    ...fonts.bold,
  },
  modeDescription: {
    color: "#757575",
    fontSize: 11,
    lineHeight: 15,
    ...fonts.regular,
  },
  modePreviewFrame: {
    height: 68,
    overflow: "hidden",
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: "#FBFBFB",
  },
  modePreviewWall: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: 38,
  },
  modePreviewFloor: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 24,
  },
  modePreviewSofa: {
    position: "absolute",
    left: 18,
    bottom: 18,
    width: 54,
    height: 18,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  modePreviewPillar: {
    position: "absolute",
    left: 78,
    top: 16,
    width: 8,
    height: 34,
    borderRadius: 6,
  },
  modePreviewAccent: {
    position: "absolute",
    right: 18,
    bottom: 22,
    width: 26,
    height: 14,
    borderRadius: 7,
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
