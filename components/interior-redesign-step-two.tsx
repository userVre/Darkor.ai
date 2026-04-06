import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { triggerHaptic } from "../lib/haptics";
import { fonts } from "../styles/typography";
import { DesignStepHeader } from "./design-step-header";
import { getStickyStepHeaderMetrics } from "./sticky-step-header";

type InteriorRedesignStepTwoProps = {
  creditCount: number;
  roomOptions: string[];
  selectedRoom: string | null;
  onSelectRoom: (room: string | null) => void;
  onBack: () => void;
  onContinue: () => void;
  onExit: () => void;
};

const REFERENCE_WIDTH = 456;
const REFERENCE_HEIGHT = 932;
const ACTIVE_CONTINUE_COLOR = "#FF3B30";
const INACTIVE_CARD_BG = "#F5F5F5";
const INACTIVE_CARD_BORDER = "#E3E3E3";
const ACTIVE_CARD_BG = "#FFF2F0";
const ACTIVE_CARD_BORDER = "#FF3B30";
const CARD_WIDTH = 192;
const CARD_HEIGHT = 72;
const GRID_GAP = 16;

function scaleValue(value: number, scale: number) {
  return value * scale;
}

function chunkIntoRows(items: string[], size: number) {
  const rows: string[][] = [];
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
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const headerMetrics = getStickyStepHeaderMetrics(insets.top);
  const layoutScale = Math.min(width / REFERENCE_WIDTH, height / REFERENCE_HEIGHT, 1);
  const sideInset = scaleValue(20, layoutScale);
  const titleInset = 24;
  const mainWidth = Math.min(width - sideInset * 2, scaleValue(416, layoutScale));
  const titleTop = headerMetrics.contentOffset;
  const subtitleTopGap = scaleValue(12, layoutScale);
  const gridTopGap = scaleValue(28, layoutScale);
  const bottomContainerHeight = scaleValue(132, layoutScale);
  const buttonWidth = mainWidth;
  const buttonHeight = scaleValue(60, layoutScale);
  const buttonTop = scaleValue(52, layoutScale);
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
        backAccessibilityLabel="Go to the previous step"
        closeAccessibilityLabel="Go back to step 1"
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
        <Text style={[styles.title, { marginLeft: titleInset }]}>Choose Room</Text>
        <Text style={[styles.subtitle, { marginLeft: titleInset, marginTop: subtitleTopGap, marginRight: titleInset }]}>
          Select a room to design and see it transformed in your chosen style.
        </Text>

        <View style={{ marginTop: gridTopGap }}>
          <View style={styles.grid}>
            {roomRows.map((row, rowIndex) => (
              <View key={`interior-room-row-${rowIndex}`} style={styles.gridRow}>
                {row.map((room, columnIndex) => {
                  const active = selectedRoom === room;

                  return (
                    <Pressable
                      key={room}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      hitSlop={12}
                      onPress={() => handleRoomPress(room)}
                      style={[
                        styles.roomCard,
                        {
                          width: CARD_WIDTH,
                          height: CARD_HEIGHT,
                          marginRight: columnIndex === 0 && row.length > 1 ? GRID_GAP : 0,
                          backgroundColor: active ? ACTIVE_CARD_BG : INACTIVE_CARD_BG,
                          borderColor: active ? ACTIVE_CARD_BORDER : INACTIVE_CARD_BORDER,
                        },
                      ]}
                    >
                      <Text style={[styles.roomCardTitle, active ? styles.roomCardTitleActive : null]} numberOfLines={2}>
                        {room}
                      </Text>
                    </Pressable>
                  );
                })}

                {row.length === 1 ? <View style={{ width: CARD_WIDTH }} /> : null}
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
    gap: 12,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  roomCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  roomCardTitle: {
    color: "#0A0A0A",
    fontSize: 16,
    lineHeight: 20,
    textAlign: "center",
    ...fonts.semibold,
  },
  roomCardTitleActive: {
    color: ACTIVE_CONTINUE_COLOR,
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
