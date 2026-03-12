import { VideoView, useVideoPlayer } from "expo-video";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { memo, useCallback, useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

type ServiceCardData = {
  id: string;
  title: string;
  subtitle: string;
  video: number;
  serviceParam: string;
};

const SERVICES: ServiceCardData[] = [
  {
    id: "media-room",
    title: "Media Room Masterpiece",
    subtitle: "OLED media wall with warm wood slats and cinematic glow.",
    video: require("../../assets/videos/media-wall.mp4"),
    serviceParam: "interior",
  },
  {
    id: "facade",
    title: "Architectural Facade",
    subtitle: "Modern limestone facade with bold black frames.",
    video: require("../../assets/videos/facade.mp4"),
    serviceParam: "facade",
  },
  {
    id: "garden",
    title: "Designer Sanctuary",
    subtitle: "Backyard oasis with deck, fire pit, and lounge styling.",
    video: require("../../assets/videos/garden.mp4"),
    serviceParam: "garden",
  },
  {
    id: "floor",
    title: "Instant Floor Restyle",
    subtitle: "Hardwood morphs from tile to deep walnut luxury.",
    video: require("../../assets/videos/floor.mp4"),
    serviceParam: "floor",
  },
  {
    id: "paint",
    title: "Smart Wall Paint",
    subtitle: "Walls shift to bold sage and terracotta palettes.",
    video: require("../../assets/videos/paint.mp4"),
    serviceParam: "paint",
  },
  {
    id: "bedroom",
    title: "Interior Redesign",
    subtitle: "Luxury suite glow-up with hotel-grade finish.",
    video: require("../../assets/videos/master-suite.mp4"),
    serviceParam: "interior-bedroom",
  },
];

const CARD_GAP = 18;

type ServiceCardProps = {
  item: ServiceCardData;
  height: number;
  index: number;
  onPress: (item: ServiceCardData) => void;
};

const ServiceCard = memo(function ServiceCard({ item, height, index, onPress }: ServiceCardProps) {
  const player = useVideoPlayer(item.video, (playerInstance) => {
    playerInstance.loop = true;
    playerInstance.muted = true;
    playerInstance.volume = 0;
    playerInstance.timeUpdateEventInterval = 0;
    playerInstance.play();
  });

  const handlePress = useCallback(() => onPress(item), [item, onPress]);

  return (
    <MotiView
      from={{ opacity: 0, translateY: 16 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 520, delay: index * 120 }}
      style={styles.cardWrap}
    >
      <View style={[styles.card, { height }]}> 
        <VideoView
          player={player}
          style={styles.cardVideo}
          contentFit="cover"
          nativeControls={false}
          pointerEvents="none"
        />

        <BlurView intensity={70} tint="dark" style={styles.cardOverlay}>
          <View style={styles.overlayContent}>
            <View style={styles.overlayTextGroup}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
            </View>
            <Pressable onPress={handlePress} style={[styles.cardButton, styles.pointer]}>
              <Text style={styles.cardButtonText}>Try it! -&gt;</Text>
            </Pressable>
          </View>
        </BlurView>
      </View>
    </MotiView>
  );
});

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const cardHeight = useMemo(() => Math.min(360, Math.round(width * 0.62)), [width]);

  const handleServicePress = useCallback(
    (item: ServiceCardData) => {
      router.push({ pathname: "/workspace", params: { service: item.serviceParam } });
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: ServiceCardData; index: number }) => (
      <ServiceCard item={item} height={cardHeight} index={index} onPress={handleServicePress} />
    ),
    [cardHeight, handleServicePress],
  );

  const keyExtractor = useCallback((item: ServiceCardData) => item.id, []);

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={SERVICES}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ItemSeparatorComponent={() => <View style={styles.cardSpacer} />}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      removeClippedSubviews
      windowSize={6}
      initialNumToRender={3}
      getItemLayout={(_, index) => ({
        length: cardHeight + CARD_GAP,
        offset: (cardHeight + CARD_GAP) * index,
        index,
      })}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000000",
  },
  content: {
    paddingTop: 18,
    paddingBottom: 120,
  },
  cardWrap: {
    paddingHorizontal: 18,
  },
  cardSpacer: {
    height: CARD_GAP,
  },
  card: {
    borderRadius: 24,
    borderCurve: "continuous",
    overflow: "hidden",
    backgroundColor: "#050505",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  cardVideo: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  cardOverlay: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  overlayContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  overlayTextGroup: {
    flex: 1,
  },
  cardTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  cardSubtitle: {
    color: "#a1a1aa",
    fontSize: 12,
    marginTop: 4,
  },
  cardButton: {
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cardButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  pointer: {
    cursor: "pointer",
  },
});
