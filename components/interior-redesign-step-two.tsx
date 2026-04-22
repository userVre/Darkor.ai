import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  DESIGN_WIZARD_SELECTION_BLUE,
  DESIGN_WIZARD_SURFACE_MUTED,
  DESIGN_WIZARD_TEXT,
  DESIGN_WIZARD_TEXT_MUTED,
  getArchitecturalIconProps,
  getArchitecturalRoomIcon,
  getWizardFloatingButtonStyle,
  getWizardSelectedLabelTextStyle,
  getWizardSelectedIconContainerStyle,
  getWizardSelectionCardStyle,
} from "./design-wizard-primitives";
import { triggerHaptic } from "../lib/haptics";
import { fonts } from "../styles/typography";
import { DesignStepHeader, getDesignStepHeaderMetrics } from "./design-step-header";

type InteriorRedesignStepTwoProps = {
  creditCount: number;
  roomOptions: {
    id: string;
    label: string;
  }[];
  selectedRoom: string | null;
  onSelectRoom: (room: string | null) => void;
  onBack: () => void;
  onContinue: () => void;
  onExit: () => void;
};

const REFERENCE_WIDTH = 456;
const REFERENCE_HEIGHT = 932;
const CARD_HEIGHT = 72;
const CARD_WIDTH = 192;
const GRID_GAP = 16;
const ROOM_ICON_SIZE = 24;

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

export function InteriorRedesignStepTwo({
  creditCount,
  roomOptions,
  selectedRoom,
  onSelectRoom,
  onBack,
  onContinue,
  onExit,
}: InteriorRedesignStepTwoProps) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const headerMetrics = getDesignStepHeaderMetrics(insets.top);
  const layoutScale = Math.min(width / REFERENCE_WIDTH, height / REFERENCE_HEIGHT, 1);
  const sideInset = scaleValue(20, layoutScale);
  const titleInset = 24;
  const mainWidth = Math.min(width - sideInset * 2, scaleValue(416, layoutScale));
  const titleTop = headerMetrics.contentOffset;
  const subtitleTopGap = scaleValue(12, layoutScale);
  const gridTopGap = scaleValue(28, layoutScale);
  const bottomContainerHeight = scaleValue(116, layoutScale);
  const buttonWidth = mainWidth;
  const buttonHeight = scaleValue(60, layoutScale);
  const buttonTop = scaleValue(24, layoutScale);
  const cardWidth = CARD_WIDTH;
  const cardHeight = CARD_HEIGHT;
  const roomRows = useMemo(() => chunkIntoRows(roomOptions, 2), [roomOptions]);
  const canContinue = Boolean(selectedRoom);

  const handleRoomPress = (room: string) => {
    triggerHaptic();
    onSelectRoom(selectedRoom === room ? null : room);
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
        <Text style={[styles.title, { marginLeft: titleInset }]}>{t("wizard.interior.stepTwoTitle")}</Text>
        <Text style={[styles.subtitle, { marginLeft: titleInset, marginTop: subtitleTopGap, marginRight: titleInset }]}>
          {t("wizard.interior.stepTwoSubtitle")}
        </Text>

        <View style={{ marginTop: gridTopGap }}>
          <View style={styles.grid}>
            {roomRows.map((row, rowIndex) => (
              <View key={`interior-room-row-${rowIndex}`} style={styles.gridRow}>
                {row.map((room, columnIndex) => {
                  const active = selectedRoom === room.id;
                  const RoomIcon = getArchitecturalRoomIcon(room.id);
                  const iconColor = active ? DESIGN_WIZARD_SELECTION_BLUE : DESIGN_WIZARD_TEXT;

                  return (
                    <Pressable
                      key={room.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      hitSlop={12}
                      onPress={() => handleRoomPress(room.id)}
                      style={[
                        styles.roomCard,
                        {
                          width: cardWidth,
                          height: cardHeight,
                          marginRight: columnIndex === 0 && row.length > 1 ? GRID_GAP : 0,
                        },
                        getWizardSelectionCardStyle(active, DESIGN_WIZARD_SURFACE_MUTED),
                      ]}
                    >
                        <View style={styles.roomCardContent}>
                          <View style={[styles.roomIconWrap, getWizardSelectedIconContainerStyle(active)]}>
                            <RoomIcon {...getArchitecturalIconProps(iconColor, ROOM_ICON_SIZE)} />
                          </View>
                          <Text style={[styles.roomCardTitle, getWizardSelectedLabelTextStyle(active), active ? styles.roomCardTitleActive : null]} numberOfLines={2}>
                            {room.label}
                          </Text>
                        </View>
                    </Pressable>
                  );
                })}

                {row.length === 1 ? <View style={{ width: cardWidth }} /> : null}
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
                width: buttonWidth,
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
    gap: 12,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  roomCard: {
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  roomCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  roomIconWrap: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  roomCardTitle: {
    color: DESIGN_WIZARD_TEXT,
    fontSize: 16,
    lineHeight: 20,
    textAlign: "left",
    flexShrink: 1,
    ...fonts.semibold,
  },
  roomCardTitleActive: {
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
