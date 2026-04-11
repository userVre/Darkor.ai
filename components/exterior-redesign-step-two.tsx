import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { triggerHaptic } from "../lib/haptics";
import { fonts } from "../styles/typography";
import { DesignStepHeader, getDesignStepHeaderMetrics } from "./design-step-header";

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
const ACTIVE_CONTINUE_COLOR = "#0A0A0A";
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
  const bottomContainerHeight = scaleValue(132, layoutScale);
  const buttonHeight = scaleValue(60, layoutScale);
  const buttonTop = scaleValue(52, layoutScale);
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
                          borderColor: active ? ACTIVE_CONTINUE_COLOR : "#E5E5E5",
                        },
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
                            backgroundColor: active ? "#FFF2F0" : "#FFFFFF",
                          },
                        ]}
                      >
                        <Text numberOfLines={2} style={[styles.labelText, { color: active ? ACTIVE_CONTINUE_COLOR : "#0A0A0A" }]}>
                          {card.title}
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
            <Text style={[styles.continueText, { color: canContinue ? "#FFFFFF" : "#A0A0A0" }]}>{t("common.actions.continue")}</Text>
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
    color: "#0A0A0A",
    fontSize: 24,
    lineHeight: 29,
    textAlign: "left",
    ...fonts.bold,
  },
  subtitle: {
    color: "#6F6F6F",
    fontSize: 15,
    lineHeight: 22,
    ...fonts.regular,
  },
  grid: {
    gap: 8,
  },
  card: {
    overflow: "hidden",
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: "#FFFFFF",
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
