import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check } from "@/components/material-icons";

import {
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

type GardenRedesignStepTwoStyleCard = {
  id: string;
  title: string;
  image: number;
  label?: string;
};

type GardenRedesignStepTwoProps = {
  styles: GardenRedesignStepTwoStyleCard[];
  selectedStyle: string | null;
  onSelectStyle: (style: string | null) => void;
  onBack: () => void;
  onContinue: () => void;
  onExit: () => void;
};

const REFERENCE_WIDTH = 456;
const REFERENCE_HEIGHT = 932;
const GRID_GAP = 16;
const THUMBNAIL_CROP_OVERFLOW = 30;
const THUMBNAIL_CROP_SHIFT = -10;

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

export function GardenRedesignStepTwo({
  styles,
  selectedStyle,
  onSelectStyle,
  onBack,
  onContinue,
  onExit,
}: GardenRedesignStepTwoProps) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const headerMetrics = getDesignStepHeaderMetrics(insets.top);
  const layoutScale = Math.min(width / REFERENCE_WIDTH, height / REFERENCE_HEIGHT, 1);
  const sideInset = scaleValue(20, layoutScale);
  const headerInset = 24;
  const mainWidth = Math.min(width - sideInset * 2, scaleValue(416, layoutScale));
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
  const rows = useMemo(() => chunkIntoRows(styles, 2), [styles]);
  const canContinue = Boolean(selectedStyle);

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

      <DesignStepHeader
        backAccessibilityLabel={t("wizard.headers.previousStep")}
        closeAccessibilityLabel={t("wizard.headers.close")}
        horizontalInset={sideInset}
        onBack={onBack}
        onClose={onExit}
        step={2}
        totalSteps={3}
      />

      <ScrollView
        style={stylesSheet.content}
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: titleTop,
          paddingBottom: bottomContainerHeight + insets.bottom + scaleValue(36, layoutScale),
        }}
      >
        <Text style={[stylesSheet.title, { marginLeft: headerInset }]}>{t("wizard.garden.stepTwoTitle")}</Text>
        <Text style={[stylesSheet.subtitle, { marginLeft: headerInset, marginTop: subtitleTopGap, marginRight: headerInset }]}>
          {t("wizard.garden.stepTwoSubtitle")}
        </Text>

        <View style={stylesSheet.grid}>
          {rows.map((row, rowIndex) => (
            <View
              key={`garden-style-row-${rowIndex}`}
              style={{
                flexDirection: "row",
                justifyContent: "center",
                marginTop: rowIndex === 0 ? gridTopGap : 12,
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
                          marginRight: columnIndex === row.length - 1 ? 0 : GRID_GAP,
                        },
                        getWizardSelectionCardStyle(active, DESIGN_WIZARD_SURFACE),
                      ]}
                    >
                      {active ? (
                        <View style={stylesSheet.selectionBadge}>
                          <View style={[stylesSheet.selectionBadgeInner, getWizardSelectedIconContainerStyle(true)]}>
                            <Check color={DESIGN_WIZARD_SELECTION_BLUE} size={16} strokeWidth={2.4} />
                          </View>
                        </View>
                      ) : null}
                      <View style={[stylesSheet.cardImageWrap, { height: cardImageHeight }]}>
                        <Image
                          source={styleCard.image}
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
                          stylesSheet.labelBar,
                          {
                            height: cardLabelHeight,
                            backgroundColor: "#FFFFFF",
                          },
                        ]}
                      >
                        <Text
                          numberOfLines={2}
                        style={[
                          stylesSheet.labelText,
                          {
                          },
                          getWizardSelectedLabelTextStyle(active),
                          active ? stylesSheet.labelTextActive : null,
                        ]}
                      >
                          {styleCard.label ?? styleCard.title}
                        </Text>
                      </View>
                  </Pressable>
                );
              })}
              {row.length === 1 ? <View style={{ width: cardWidth }} /> : null}
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
              },
              getWizardFloatingButtonStyle(canContinue),
            ]}
          >
            <Text style={[stylesSheet.continueText, { color: canContinue ? "#FFFFFF" : "#7E7E7E" }]}>{t("common.actions.continue")}</Text>
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
  content: {
    flex: 1,
  },
  title: {
    color: DESIGN_WIZARD_TEXT,
    fontSize: 24,
    lineHeight: 29,
    ...fonts.bold,
  },
  subtitle: {
    color: DESIGN_WIZARD_TEXT_MUTED,
    fontSize: 15,
    lineHeight: 22,
    ...fonts.regular,
  },
  grid: {
    gap: 12,
  },
  styleCard: {
    overflow: "hidden",
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
  cardImageWrap: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: "#EFEFEF",
  },
  labelBar: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  labelText: {
    fontSize: 15,
    lineHeight: 19,
    textAlign: "center",
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
