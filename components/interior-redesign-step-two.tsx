import { StatusBar } from "expo-status-bar";
import {
  Bath,
  Baby,
  BedDouble,
  BookOpen,
  CookingPot,
  DoorOpen,
  Gem,
  Home,
  Monitor,
  Projector,
  Sofa,
  Sparkles,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react-native";
import { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { triggerHaptic } from "../lib/haptics";
import { fonts } from "../styles/typography";
import { InteriorRedesignStepProgress } from "./interior-redesign-step-progress";

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
const INACTIVE_CARD_BG = "#F5F5F5";
const INACTIVE_CARD_BORDER = "#E3E3E3";
const ACTIVE_CARD_BG = "#FFF2F0";
const ACTIVE_CARD_BORDER = "#FF3B30";
const ACTIVE_ICON_BG = "#FFE3DE";
const INACTIVE_ICON_BG = "#FFFFFF";

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

const ROOM_ICONS: Record<string, LucideIcon> = {
  "Living Room": Sofa,
  Bedroom: BedDouble,
  Kitchen: CookingPot,
  Bathroom: Bath,
  "Home Office": Monitor,
  "Dining Room": UtensilsCrossed,
  Nursery: Baby,
  "Home Theater": Projector,
  "Gaming Room": Monitor,
  Hall: DoorOpen,
  Library: BookOpen,
  Laundry: Sparkles,
};

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
  const bottomContainerHeight = scaleValue(132, layoutScale);
  const buttonWidth = mainWidth;
  const buttonHeight = scaleValue(60, layoutScale);
  const buttonTop = scaleValue(52, layoutScale);
  const roomCardWidth = Math.max((width - leftColumnInset - rightColumnInset - columnGap) / 2, scaleValue(160, layoutScale));
  const roomCardHeight = scaleValue(92, layoutScale);
  const roomRows = useMemo(() => chunkIntoRows(roomOptions, 2), [roomOptions]);
  const canContinue = Boolean(selectedRoom);

  const handleExitPress = () => {
    triggerHaptic();
    Alert.alert("Exit?", "Your progress will be lost.", [
      { text: "CANCEL", style: "cancel" },
      {
        text: "EXIT",
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

      <InteriorRedesignStepProgress
        currentStep={2}
        segmentWidth={progressSegmentWidth}
        gap={progressGap}
        style={{ top: progressTop, width: mainWidth, right: sideInset, zIndex: 2 }}
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
          <View style={[styles.grid, { paddingLeft: leftColumnInset, paddingRight: rightColumnInset }]}>
            {roomRows.map((row, rowIndex) => (
              <View key={`interior-room-row-${rowIndex}`} style={styles.gridRow}>
                {row.map((room, columnIndex) => {
                  const active = selectedRoom === room;
                  const RoomIcon = ROOM_ICONS[room] ?? Home;

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
                          width: roomCardWidth,
                          minHeight: roomCardHeight,
                          marginRight: columnIndex === 0 && row.length > 1 ? columnGap : 0,
                          backgroundColor: active ? ACTIVE_CARD_BG : INACTIVE_CARD_BG,
                          borderColor: active ? ACTIVE_CARD_BORDER : INACTIVE_CARD_BORDER,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.roomIconWrap,
                          { backgroundColor: active ? ACTIVE_ICON_BG : INACTIVE_ICON_BG },
                        ]}
                      >
                        <RoomIcon color="#0A0A0A" size={20} strokeWidth={2.2} />
                      </View>

                      <View style={styles.roomCopy}>
                        <Text style={styles.roomCardTitle} numberOfLines={2}>
                          {room}
                        </Text>
                        <Text style={styles.roomCardHint}>
                          {active ? "Selected" : "Tap to choose"}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}

                {row.length === 1 ? <View style={{ width: roomCardWidth }} /> : null}
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
    gap: 14,
  },
  gridRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  roomCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  roomIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  roomCopy: {
    flex: 1,
    minWidth: 0,
  },
  roomCardTitle: {
    color: "#0A0A0A",
    fontSize: 15,
    lineHeight: 19,
    ...fonts.semibold,
  },
  roomCardHint: {
    marginTop: 4,
    color: "#7C7C7C",
    fontSize: 12,
    lineHeight: 15,
    ...fonts.medium,
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
