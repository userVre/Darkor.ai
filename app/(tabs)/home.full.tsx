import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { FlatList, StyleSheet, Text, View, type ViewToken, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LuxPressable } from "../../components/lux-pressable";
import { triggerHaptic } from "../../lib/haptics";

const VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 65,
  minimumViewTime: 180,
};

type ServiceCardData = {
  id: string;
  title: string;
  subtitle: string;
  video: number;
  poster: number;
  serviceParam: string;
};

const SERVICE_CARDS: ServiceCardData[] = [
  {
    id: "interior-design",
    title: "Interior Design",
    subtitle: "Upload a room, choose a style, and let AI restage it in seconds.",
    video: require("../../assets/videos/media-wall.mp4"),
    poster: require("../../assets/media/empty-room.jpg"),
    serviceParam: "interior",
  },
  {
    id: "exterior-design",
    title: "Exterior Design",
    subtitle: "Refresh facades, lighting, and curb appeal with a cleaner native flow.",
    video: require("../../assets/videos/facade.mp4"),
    poster: require("../../assets/media/staging-before.jpg"),
    serviceParam: "facade",
  },
  {
    id: "garden-design",
    title: "Garden Design",
    subtitle: "Transform patios, yards, and pools without dragging the UI down.",
    video: require("../../assets/videos/garden.mp4"),
    poster: require("../../assets/media/garden-before.jpg"),
    serviceParam: "garden",
  },
  {
    id: "ai-paint",
    title: "AI Paint",
    subtitle: "Try fresh wall palettes instantly with a lighter render path.",
    video: require("../../assets/videos/paint.mp4"),
    poster: require("../../assets/media/staging-before.jpg"),
    serviceParam: "paint",
  },
  {
    id: "floor-restyle",
    title: "Floor Restyle",
    subtitle: "Preview new floor materials with faster, mobile-first interactions.",
    video: require("../../assets/videos/floor.mp4"),
    poster: require("../../assets/media/sketch.jpg"),
    serviceParam: "floor",
  },
  {
    id: "reference-style",
    title: "Reference Style",
    subtitle: "Match inspiration looks while keeping the experience responsive.",
    video: require("../../assets/videos/master-suite.mp4"),
    poster: require("../../assets/media/after-luxury.jpg"),
    serviceParam: "reference",
  },
];

type CardMediaProps = {
  item: ServiceCardData;
  active: boolean;
};

const CardPoster = memo(function CardPoster({ source }: { source: number }) {
  return (
    <Image
      source={source}
      style={StyleSheet.absoluteFillObject}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={120}
    />
  );
});

const ActiveCardVideo = memo(function ActiveCardVideo({ item }: { item: ServiceCardData }) {
  const player = useVideoPlayer(item.video, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.volume = 0;
    videoPlayer.timeUpdateEventInterval = 0;
    videoPlayer.play();
  });

  return (
    <VideoView
      player={player}
      style={styles.video}
      contentFit="cover"
      surfaceType="textureView"
      nativeControls={false}
      pointerEvents="none"
    />
  );
});

const CardMedia = memo(function CardMedia({ item, active }: CardMediaProps) {
  if (!active) {
    return <CardPoster source={item.poster} />;
  }

  return <ActiveCardVideo item={item} />;
});

type ServiceCardProps = {
  item: ServiceCardData;
  height: number;
  active: boolean;
  onPress: (item: ServiceCardData) => void;
};

const ServiceCard = memo(function ServiceCard({ item, height, active, onPress }: ServiceCardProps) {
  const handlePress = useCallback(() => {
    triggerHaptic();
    onPress(item);
  }, [item, onPress]);

  return (
    <View style={[styles.card, { height }]}> 
      <CardMedia item={item} active={active} />
      <LinearGradient
        colors={["rgba(0,0,0,0.04)", "rgba(0,0,0,0.16)", "rgba(0,0,0,0.74)"]}
        locations={[0, 0.46, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <View style={styles.cardContent}>
        <View style={styles.copyBlock}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>{active ? "Live preview" : "Ready"}</Text>
          </View>
          <BlurView intensity={70} tint="dark" style={styles.ctaGlass}>
            <LuxPressable onPress={handlePress} style={styles.ctaButton}>
              <Text style={styles.ctaText}>Try it</Text>
            </LuxPressable>
          </BlurView>
        </View>
      </View>
    </View>
  );
});

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [activeCardId, setActiveCardId] = useState(SERVICE_CARDS[0]?.id ?? "");

  const cardHeight = useMemo(() => Math.max(316, Math.min(388, Math.round(width * 0.96))), [width]);

  const handleServicePress = useCallback(
    (item: ServiceCardData) => {
      router.push({ pathname: "/workspace", params: { service: item.serviceParam } });
    },
    [router],
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<ServiceCardData>[] }) => {
      const firstVisible = viewableItems.find((entry) => entry.isViewable)?.item;
      if (firstVisible?.id) {
        setActiveCardId((current) => (current === firstVisible.id ? current : firstVisible.id));
      }
    },
  );

  const renderItem = useCallback(
    ({ item }: { item: ServiceCardData }) => (
      <ServiceCard item={item} height={cardHeight} active={item.id === activeCardId} onPress={handleServicePress} />
    ),
    [activeCardId, cardHeight, handleServicePress],
  );

  const keyExtractor = useCallback((item: ServiceCardData) => item.id, []);

  const header = useMemo(
    () => (
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Darkor.ai Premium</Text>
        <Text style={styles.title}>Choose Your Transformation</Text>
        <Text style={styles.subtitle}>
          Each service is now rendered with mobile-first lifecycle control so the screen stays smooth while you browse.
        </Text>
      </View>
    ),
    [],
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={SERVICE_CARDS}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={header}
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingHorizontal: 16,
          paddingBottom: Math.max(insets.bottom + 120, 136),
          gap: 20,
        }}
        ItemSeparatorComponent={() => <View style={{ height: 20 }} />}
        showsVerticalScrollIndicator={false}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        updateCellsBatchingPeriod={40}
        windowSize={3}
        removeClippedSubviews
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={VIEWABILITY_CONFIG}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    gap: 14,
    marginBottom: 6,
    paddingRight: 14,
  },
  eyebrow: {
    color: "#a1a1aa",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2.6,
    textTransform: "uppercase",
  },
  title: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 40,
  },
  subtitle: {
    color: "#a1a1aa",
    fontSize: 16,
    lineHeight: 25,
    maxWidth: 680,
  },
  card: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 32,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#050505",
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContent: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 22,
  },
  copyBlock: {
    marginTop: "auto",
    gap: 10,
    maxWidth: "78%",
  },
  cardTitle: {
    color: "#ffffff",
    fontSize: 29,
    fontWeight: "800",
    lineHeight: 33,
  },
  cardSubtitle: {
    color: "#d4d4d8",
    fontSize: 15,
    lineHeight: 22,
  },
  cardFooter: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  liveBadge: {
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(0,0,0,0.38)",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  liveBadgeText: {
    color: "#f4f4f5",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  ctaGlass: {
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  ctaButton: {
    minWidth: 108,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.78)",
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  ctaText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
