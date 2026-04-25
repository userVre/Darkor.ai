import {Check, Wand2} from "@/components/material-icons";
import {StatusBar} from "expo-status-bar";
import {useMemo} from "react";
import {useTranslation} from "react-i18next";
import {Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {triggerHaptic} from "../lib/haptics";
import {fonts} from "../styles/typography";
import {DesignStepHeader, getDesignStepHeaderMetrics} from "./design-step-header";
import {
DESIGN_WIZARD_SELECTION_BLUE,
DESIGN_WIZARD_SURFACE,
DESIGN_WIZARD_TEXT,
getWizardFloatingButtonStyle,
getWizardSelectedIconContainerStyle,
getWizardSelectedLabelTextStyle,
getWizardSelectionCardStyle,
} from "./design-wizard-primitives";

type GardenRedesignStepThreePalette = {
  id: string;
  label: string;
  colors: string[];
  aiCard?: boolean;
};

type GardenRedesignStepThreeProps = {
  palettes: GardenRedesignStepThreePalette[];
  selectedPaletteId: string | null;
  useAISelection?: boolean;
  onSelectPalette: (paletteId: string | null) => void;
  onSelectAIPalette: () => void;
  onBack: () => void;
  onContinue: () => void;
  onExit: () => void;
};

const REFERENCE_WIDTH = 456;
const REFERENCE_HEIGHT = 932;
const PALETTE_REFERENCE_WIDTH = 500;

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
  useAISelection = false,
  onSelectPalette,
  onSelectAIPalette,
  onBack,
  onContinue,
  onExit,
}: GardenRedesignStepThreeProps) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const headerMetrics = getDesignStepHeaderMetrics(insets.top);
  const layoutScale = Math.min(width / REFERENCE_WIDTH, height / REFERENCE_HEIGHT, 1);
  const paletteScale = Math.min(width / PALETTE_REFERENCE_WIDTH, 1);
  const sideInset = scaleValue(20, layoutScale);
  const mainWidth = Math.min(width - sideInset * 2, scaleValue(416, layoutScale));
  const titleTop = headerMetrics.contentOffset;
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
  const bottomContainerHeight = scaleValue(116, layoutScale);
  const buttonHeight = scaleValue(60, layoutScale);
  const buttonTop = scaleValue(24, layoutScale);
  const palettesWithAI = useMemo<GardenRedesignStepThreePalette[]>(
    () => [{ id: "ai-landscape-choice", label: "AI Landscape Choice", colors: [], aiCard: true }, ...palettes],
    [palettes],
  );
  const paletteRows = chunkIntoRows(palettesWithAI, 3);
  const paletteGridWidth = paletteCardWidth * 3 + paletteHorizontalGap * 2;
  const canContinue = Boolean(selectedPaletteId || useAISelection);

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
        backAccessibilityLabel={t("wizard.headers.previousStep")}
        closeAccessibilityLabel={t("wizard.headers.close")}
        horizontalInset={sideInset}
        onBack={onBack}
        onClose={onExit}
        step={3}
        totalSteps={3}
      />

      <ScrollView
        style={styles.content}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: titleTop,
          paddingBottom: bottomContainerHeight + insets.bottom + scaleValue(36, layoutScale),
        }}
      >
        <Text style={[styles.title, { marginLeft: titleLeft }]}>{t("wizard.garden.stepThreeTitle")}</Text>

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
                  const active = palette.aiCard ? useAISelection : selectedPaletteId === palette.id;

                  return (
                    <Pressable
                      key={palette.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      hitSlop={12}
                      onPress={() => (palette.aiCard ? onSelectAIPalette() : handlePalettePress(palette.id))}
                      style={[
                        styles.paletteCard,
                        {
                          width: paletteCardWidth,
                          height: paletteCardHeight,
                          marginRight: columnIndex === row.length - 1 ? 0 : paletteHorizontalGap,
                        },
                        getWizardSelectionCardStyle(active, DESIGN_WIZARD_SURFACE),
                      ]}
                    >
                      {active ? (
                        <View style={styles.selectionBadge}>
                          <View style={[styles.selectionBadgeInner, getWizardSelectedIconContainerStyle(true)]}>
                            <Check color={DESIGN_WIZARD_SELECTION_BLUE} size={16} strokeWidth={2.4} />
                          </View>
                        </View>
                      ) : null}
                      {palette.aiCard ? (
                        <View style={[styles.aiPaletteMedia, { height: paletteCardTopHeight, backgroundColor: active ? "#DBEAFE" : "#F4F7FB" }]}>
                          <View style={[styles.aiPaletteIconWrap, { backgroundColor: active ? "#2563EB" : "#0F172A" }]}>
                            <Wand2 color="#FFFFFF" size={26} strokeWidth={2.1} />
                          </View>
                        </View>
                      ) : (
                        <View style={{ height: paletteCardTopHeight, flexDirection: "row" }}>
                          {palette.colors.slice(0, 4).map((color) => (
                            <View key={`${palette.id}-${color}`} style={{ flex: 1, backgroundColor: color }} />
                          ))}
                        </View>
                      )}
                      <View
                        style={[
                          styles.paletteLabelBar,
                          {
                            height: paletteLabelHeight,
                              backgroundColor: "#EFEFEF",
                          },
                        ]}
                      >
                        <Text
                          numberOfLines={2}
                          style={[
                            styles.paletteLabelText,
                            {
                              top: paletteLabelTop,
                              left: paletteLabelLeft,
                              },
                              getWizardSelectedLabelTextStyle(active),
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
              },
              getWizardFloatingButtonStyle(canContinue),
            ]}
          >
            <Text style={[styles.continueText, { color: canContinue ? "#FFFFFF" : "#7E7E7E" }]}>{t("common.actions.continue")}</Text>
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
    color: DESIGN_WIZARD_TEXT,
    fontSize: 24,
    lineHeight: 29,
    textAlign: "left",
    ...fonts.bold,
  },
  paletteCard: {
    overflow: "hidden",
  },
  aiPaletteMedia: {
    alignItems: "center",
    justifyContent: "center",
  },
  aiPaletteIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  selectionBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 2,
  },
  selectionBadgeInner: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
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
    backgroundColor: "transparent",
  },
  bottomContainerInner: {
    alignItems: "center",
    backgroundColor: "transparent",
  },
  continueButton: {
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  continueText: {
    fontSize: 16,
    lineHeight: 20,
    ...fonts.semibold,
  },
});
