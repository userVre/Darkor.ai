import { StatusBar } from "expo-status-bar";
import { Gem } from "lucide-react-native";
import { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { triggerHaptic } from "../lib/haptics";
import { fonts } from "../styles/typography";

type InteriorRedesignStepTwoProps = {
  creditCount: number;
  roomOptions: string[];
  selectedRoom: string | null;
  onSelectRoom: (room: string | null) => void;
  onContinue: () => void;
  onExit: () => void;
};

const REFERENCE_WIDTH = 456;
const REFERENCE_HEIGHT = 932;
const ACTIVE_CONTINUE_COLOR = "#FF3B30";

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
  onContinue,
  onExit,
}: InteriorRedesignStepTwoProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const layoutScale = Math.min(width / REFERENCE_WIDTH, height / REFERENCE_HEIGHT, 1);
  const sideInset = scaleValue(20, layoutScale);
  const titleInset = scaleValue(24, layoutScale);
  const leftColumnInset = scaleValue(28, layoutScale);
  const rightColumnInset = scaleValue(33, layoutScale);
  const columnGap = scaleValue(24, layoutScale);
  const mainWidth = Math.min(width - sideInset * 2, scaleValue(416, layoutScale));
  const topBadgeTop = scaleValue(36, layoutScale);
  const topTitleTop = scaleValue(52, layoutScale);
  const progressTop = scaleValue(74, layoutScale);
  const titleTop = progressTop + scaleValue(28, layoutScale);
  const subtitleTopGap = scaleValue(12, layoutScale);
  const gridTopGap = scaleValue(28, layoutScale);
  const progressSegmentWidth = scaleValue(92, layoutScale);
  const progressGap = scaleValue(16, layoutScale);
  const gridHeight = scaleValue(764, layoutScale);
  const pillHeight = scaleValue(16, layoutScale);
  const bottomContainerHeight = scaleValue(132, layoutScale);
  const buttonWidth = mainWidth;
  const buttonHeight = scaleValue(60, layoutScale);
  const buttonTop = scaleValue(52, layoutScale);
  const pillWidth = Math.max((width - leftColumnInset - rightColumnInset - columnGap) / 2, scaleValue(120, layoutScale));
  const roomRows = useMemo(() => chunkIntoRows(roomOptions, 2), [roomOptions]);
  const canContinue = Boolean(selectedRoom);

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

      <View style={[styles.creditBadge, { top: topBadgeTop, left: sideInset }]}>
        <Gem color="#FFFFFF" size={13} strokeWidth={2.1} />
        <Text style={styles.creditText}>{creditCount}</Text>
      </View>

      <Text style={[styles.stepText, { top: topTitleTop }]}>Step 2 / 4</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close room selection"
        onPress={handleExitPress}
        style={[styles.closeButton, { top: topTitleTop, right: scaleValue(36, layoutScale) }]}
      >
        <Text style={styles.closeText}>{"\u00D7"}</Text>
      </Pressable>

      <View style={[styles.progressRow, { top: progressTop, width: mainWidth, right: sideInset }]}>
        {Array.from({ length: 4 }).map((_, index) => (
          <View
            key={`interior-room-progress-${index}`}
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
        <Text style={[styles.title, { marginLeft: titleInset }]}>Choose Room</Text>
        <Text style={[styles.subtitle, { marginLeft: titleInset, marginTop: subtitleTopGap, marginRight: titleInset }]}>
          Select a room to design and see it transformed in your chosen style.
        </Text>

        <View style={{ marginTop: gridTopGap, height: gridHeight }}>
          <View style={[styles.grid, { paddingLeft: leftColumnInset, paddingRight: rightColumnInset }]}>
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
                        styles.roomPill,
                        {
                          width: pillWidth,
                          height: pillHeight,
                          marginRight: columnIndex === 0 && row.length > 1 ? columnGap : 0,
                          backgroundColor: active ? ACTIVE_CONTINUE_COLOR : "#F3F3F3",
                          borderColor: active ? ACTIVE_CONTINUE_COLOR : "#E2E2E2",
                        },
                      ]}
                    >
                      <Text style={[styles.roomPillText, { color: active ? "#FFFFFF" : "#0A0A0A" }]} numberOfLines={1}>
                        {room}
                      </Text>
                    </Pressable>
                  );
                })}

                {row.length === 1 ? <View style={{ width: pillWidth }} /> : null}
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
    width: 20,
    height: 20,
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
    ...fonts.bold,
  },
  subtitle: {
    color: "#6F6F6F",
    fontSize: 15,
    lineHeight: 22,
    ...fonts.regular,
  },
  grid: {
    flex: 1,
    justifyContent: "space-between",
  },
  gridRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  roomPill: {
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  roomPillText: {
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
