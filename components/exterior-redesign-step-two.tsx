import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  DESIGN_WIZARD_SELECTION_BLUE,
  DESIGN_WIZARD_SURFACE,
  DESIGN_WIZARD_TEXT,
  DESIGN_WIZARD_TEXT_MUTED,
  getArchitecturalBuildingIcon,
  getArchitecturalIconProps,
  getWizardFloatingButtonStyle,
  getWizardSelectedLabelTextStyle,
  getWizardSelectedIconContainerStyle,
  getWizardSelectionCardStyle,
} from "./design-wizard-primitives";
import { triggerHaptic } from "../lib/haptics";
import { fonts } from "../styles/typography";
import { DesignStepHeader, getDesignStepHeaderMetrics } from "./design-step-header";

type ExteriorRedesignStepTwoCard = {
  id: string;
  title: string;
  image: number;
  label?: string;
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
const GRID_GAP = 16;
const THUMBNAIL_CROP_OVERFLOW = 28;
const THUMBNAIL_CROP_SHIFT = -8;

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
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const headerMetrics = getDesignStepHeaderMetrics(insets.top);
  const layoutScale = Math.min(width / REFERENCE_WIDTH, height / REFERENCE_HEIGHT, 1);
  const sideInset = scaleValue(20, layoutScale);
  const mainWidth = Math.min(width - sideInset * 2, scaleValue(420, layoutScale));
  const titleLeft = 24;
  const titleTop = headerMetrics.contentOffset;
  const subtitleTopGap = scaleValue(12, layoutScale);
  const gridTopGap = scaleValue(24, layoutScale);
  const bottomContainerHeight = scaleValue(116, layoutScale);
  const buttonHeight = scaleValue(60, layoutScale);
  const buttonTop = scaleValue(24, layoutScale);
  const cardWidth = (mainWidth - GRID_GAP) / 2;
  const cardHeight = scaleValue(188, layoutScale);
  const cardImageHeight = scaleValue(132, layoutScale);
  const cardLabelHeight = cardHeight - cardImageHeight;
  const rows = useMemo(() => chunkIntoRows(cards, 2), [cards]);
  const canContinue = Boolean(selectedBuildingType);

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

      <DesignStepHeader
        backAccessibilityLabel={t("wizard.headers.previousStep")}
        closeAccessibilityLabel={t("wizard.headers.close")}
        horizontalInset={sideInset}
        onBack={onBack}
        onClose={onExit}
        step={2}
        totalSteps={4}
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
        <Text style={[styles.title, { marginLeft: titleLeft }]}>{t("wizard.exterior.stepTwoTitle")}</Text>
        <Text style={[styles.subtitle, { marginLeft: titleLeft, marginTop: subtitleTopGap, marginRight: titleLeft }]}>
          {t("wizard.exterior.stepTwoSubtitle")}
        </Text>

        <View style={styles.grid}>
          {rows.map((row, rowIndex) => (
            <View
              key={`exterior-building-row-${rowIndex}`}
              style={{
                flexDirection: "row",
                justifyContent: "center",
                marginTop: rowIndex === 0 ? gridTopGap : 8,
              }}
            >
              {row.map((card, columnIndex) => {
                const active = selectedBuildingType === card.title;
                const BuildingIcon = getArchitecturalBuildingIcon(card.title);
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
                          marginRight: columnIndex === row.length - 1 ? 0 : GRID_GAP,
                        },
                        getWizardSelectionCardStyle(active, DESIGN_WIZARD_SURFACE),
                      ]}
                    >
                      <View style={[styles.cardImageWrap, { height: cardImageHeight }]}>
                        <Image
                          source={card.image}
                          style={{
                            width: "100%",
                            height: cardImageHeight + THUMBNAIL_CROP_OVERFLOW,
                            transform: [{ translateY: THUMBNAIL_CROP_SHIFT }],
                          }}
                          contentFit="cover"
                          transition={120}
                          cachePolicy="memory-disk"
                        />
                      </View>

                      <View
                        style={[
                          styles.labelBar,
                          {
                            height: cardLabelHeight,
                            backgroundColor: "#FFFFFF",
                          },
                        ]}
                      >
                        <View style={styles.labelRow}>
                          <View style={[styles.labelIconWrap, getWizardSelectedIconContainerStyle(active)]}>
                            <BuildingIcon {...getArchitecturalIconProps(active ? DESIGN_WIZARD_SELECTION_BLUE : DESIGN_WIZARD_TEXT, 18)} />
                          </View>
                          <Text numberOfLines={2} style={[styles.labelText, getWizardSelectedLabelTextStyle(active), active ? styles.labelTextActive : null]}>
                            {card.label ?? card.title}
                          </Text>
                        </View>
                      </View>
                  </Pressable>
                );
              })}
              {row.length === 1 ? <View style={{ width: cardWidth }} /> : null}
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
  subtitle: {
    color: DESIGN_WIZARD_TEXT_MUTED,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "left",
    ...fonts.regular,
  },
  grid: {
    gap: 8,
  },
  card: {
    overflow: "hidden",
  },
  cardImageWrap: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: "#EFEFEF",
  },
  labelBar: {
    width: "100%",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 8,
  },
  labelIconWrap: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  labelText: {
    fontSize: 15,
    lineHeight: 19,
    textAlign: "left",
    ...fonts.semibold,
  },
  labelTextActive: {
    ...fonts.bold,
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
