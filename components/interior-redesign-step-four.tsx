import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BadgeCheck, PaintRoller, Wand2 } from "@/components/material-icons";
import {
  DESIGN_WIZARD_ACCENT_STRONG,
  DESIGN_WIZARD_SELECTION_BLUE,
  DESIGN_WIZARD_SURFACE,
  DESIGN_WIZARD_TEXT,
  DESIGN_WIZARD_TEXT_MUTED,
  getWizardFloatingButtonStyle,
  getWizardSelectedLabelTextStyle,
  getWizardSelectedIconContainerStyle,
  getWizardSelectionCardStyle,
} from "./design-wizard-primitives";
import { triggerHaptic } from "../lib/haptics";
import { fonts } from "../styles/typography";
import { DesignStepHeader, getDesignStepHeaderMetrics } from "./design-step-header";

type InteriorRedesignStepFourMode = {
  id: string;
  title: string;
  description: string;
  label?: string;
};

type InteriorRedesignStepFourPalette = {
  id: string;
  label: string;
  colors: string[];
  displayLabel?: string;
};

type InteriorRedesignStepFourProps = {
  creditCount: number;
  modes: InteriorRedesignStepFourMode[];
  palettes: InteriorRedesignStepFourPalette[];
  selectedModeId: string | null;
  selectedPaletteId: string | null;
  onSelectMode: (modeId: string | null) => void;
  onSelectPalette: (paletteId: string | null) => void;
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

function ModeSelectionCard({
  active,
  description,
  height,
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
  layoutScale: number;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  title: string;
  variant: "preserve" | "renovate";
  width: number;
}) {
  const horizontalPadding = scaleValue(18, layoutScale);
  const verticalPadding = scaleValue(18, layoutScale);
  const titleTopGap = scaleValue(18, layoutScale);
  const descriptionTopGap = scaleValue(12, layoutScale);
  const iconSize = scaleValue(30, layoutScale);
  const ModeIcon = variant === "renovate" ? Wand2 : PaintRoller;

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
        },
        getWizardSelectionCardStyle(active, DESIGN_WIZARD_SURFACE),
        style,
      ]}
    >
      <View style={[styles.modeCardContent, { paddingHorizontal: horizontalPadding, paddingVertical: verticalPadding }]}>
        <View style={styles.modeCardTopRow}>
          <View
            style={[
              styles.modeIconWrap,
              getWizardSelectedIconContainerStyle(active),
            ]}
          >
            <ModeIcon color={active ? DESIGN_WIZARD_SELECTION_BLUE : "#111111"} size={iconSize} strokeWidth={2.2} />
          </View>
          {active ? (
            <View style={styles.modeSelectedBadge}>
              <BadgeCheck color={DESIGN_WIZARD_ACCENT_STRONG} size={18} strokeWidth={2.1} />
            </View>
          ) : null}
        </View>

        <View style={{ marginTop: titleTopGap }}>
          <Text style={[styles.modeTitle, getWizardSelectedLabelTextStyle(active), active ? styles.modeTitleActive : null]} numberOfLines={2}>
            {title}
          </Text>
        </View>

        <View style={[styles.modeDescriptionBlock, { marginTop: descriptionTopGap }]}>
          <Text style={[styles.modeDescription, active ? styles.modeDescriptionActive : null]}>
            {description}
          </Text>
        </View>
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
  onBack,
  onContinue,
  onExit,
}: InteriorRedesignStepFourProps) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const headerMetrics = getDesignStepHeaderMetrics(insets.top);
  const layoutScale = Math.min(width / REFERENCE_WIDTH, height / REFERENCE_HEIGHT, 1);
  const paletteScale = Math.min(width / PALETTE_REFERENCE_WIDTH, 1);
  const sideInset = scaleValue(20, layoutScale);
  const mainWidth = Math.min(width - sideInset * 2, scaleValue(416, layoutScale));
  const sectionTitleLeft = 24;
  const modeTitleTop = headerMetrics.contentOffset;
  const modeCardsTopGap = scaleValue(32, layoutScale);
  const modeCardWidth = scaleValue(196, layoutScale);
  const modeCardHeight = scaleValue(252, layoutScale);
  const modeCardGap = scaleValue(16, layoutScale);
  const modeSectionToPaletteGap = scaleValue(32, layoutScale);
  const paletteTitleTopGap = scaleValue(32, layoutScale);
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
  const paletteRows = useMemo(() => chunkIntoRows(palettes, 3), [palettes]);
  const canContinue = Boolean(selectedModeId && selectedPaletteId);
  const paletteGridWidth = paletteCardWidth * 3 + paletteHorizontalGap * 2;

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

      <DesignStepHeader
        backAccessibilityLabel={t("wizard.headers.previousStep")}
        closeAccessibilityLabel={t("wizard.headers.close")}
        creditCount={creditCount}
        horizontalInset={sideInset}
        onBack={onBack}
        onClose={onExit}
        step={4}
        totalSteps={4}
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
        <Text style={[styles.sectionTitle, { marginLeft: sectionTitleLeft }]}>{t("wizard.interior.stepFourMode")}</Text>

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
                  layoutScale={layoutScale}
                  style={index === modes.length - 1 ? undefined : { marginRight: modeCardGap }}
                  title={mode.label ?? mode.title}
                  variant={mode.id === "renovate" ? "renovate" : "preserve"}
                  width={modeCardWidth}
                />
              );
            })}
          </View>
        </View>

        <Text style={[styles.sectionTitle, { marginLeft: sectionTitleLeft, marginTop: modeSectionToPaletteGap }]}>{t("wizard.interior.stepFourPalette")}</Text>

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
                        },
                        getWizardSelectionCardStyle(active, DESIGN_WIZARD_SURFACE),
                      ]}
                      >
                        {active ? (
                          <View style={styles.paletteSelectionBadge}>
                            <View style={[styles.paletteSelectionBadgeInner, getWizardSelectedIconContainerStyle(true)]}>
                              <BadgeCheck color={DESIGN_WIZARD_SELECTION_BLUE} size={16} strokeWidth={2.1} />
                            </View>
                          </View>
                        ) : null}
                        <View style={{ height: paletteCardTopHeight, flexDirection: "row" }}>
                        {palette.colors.map((color) => (
                          <View key={`${palette.id}-${color}`} style={{ flex: 1, backgroundColor: color }} />
                        ))}
                      </View>
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
                          {palette.displayLabel ?? palette.label}
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
    color: DESIGN_WIZARD_TEXT,
    fontSize: 24,
    lineHeight: 29,
    textAlign: "left",
    ...fonts.bold,
  },
  modeCard: {
  },
  modeCardContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  modeCardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  modeIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  modeSelectedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(37,99,235,0.08)",
  },
  modeTitle: {
    color: DESIGN_WIZARD_TEXT,
    fontSize: 18,
    lineHeight: 23,
    ...fonts.bold,
  },
  modeTitleActive: {
    ...fonts.bold,
  },
  modeDescriptionBlock: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modeDescription: {
    color: DESIGN_WIZARD_TEXT_MUTED,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "left",
    ...fonts.regular,
  },
  modeDescriptionActive: {
    color: DESIGN_WIZARD_TEXT_MUTED,
  },
  paletteCard: {
    overflow: "hidden",
  },
  paletteSelectionBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 2,
  },
  paletteSelectionBadgeInner: {
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

