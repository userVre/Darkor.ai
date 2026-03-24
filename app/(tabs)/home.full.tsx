import { useAuth } from "@clerk/expo";
import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Platform, StyleSheet, Text, View, type ViewToken, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowUpRight, Gem } from "lucide-react-native";

import { LuxPressable } from "../../components/lux-pressable";
import { triggerHaptic } from "../../lib/haptics";

const VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 62,
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
    subtitle: "Luxury suite redesigns with premium material realism.",
    video: require("../../assets/videos/master-suite.mp4"),
    poster: require("../../assets/media/discover/home/home-master-suite.jpg"),
    serviceParam: "interior",
  },
  {
    id: "exterior-design",
    title: "Exterior Design",
    subtitle: "Modern facade studies with sharper curb appeal direction.",
    video: require("../../assets/videos/facade.mp4"),
    poster: require("../../assets/media/discover/exterior/exterior-modern-villa.jpg"),
    serviceParam: "facade",
  },
  {
    id: "garden-design",
    title: "Garden Design",
    subtitle: "Backyard oasis concepts with lighting, fire, and flow.",
    video: require("../../assets/videos/garden.mp4"),
    poster: require("../../assets/media/discover/garden/garden-fireside-patio.jpg"),
    serviceParam: "garden",
  },
  {
    id: "ai-paint",
    title: "AI Paint",
    subtitle: "Wall color transformations tuned for elegant tonal balance.",
    video: require("../../assets/videos/paint.mp4"),
    poster: require("../../assets/media/empty-room.jpg"),
    serviceParam: "paint",
  },
  {
    id: "floor-restyle",
    title: "Floor Restyle",
    subtitle: "Material swaps from tile to hardwood with cleaner detailing.",
    video: require("../../assets/videos/floor.mp4"),
    poster: require("../../assets/media/sketch.jpg"),
    serviceParam: "floor",
  },
] as const;

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
  const player = useVideoPlayer(item.video);

  useEffect(() => {
    player.loop = true;
    player.muted = true;
    player.volume = 0;
    player.timeUpdateEventInterval = 0;
    player.keepScreenOnWhilePlaying = false;
    player.staysActiveInBackground = false;
    player.play();

    return () => {
      player.keepScreenOnWhilePlaying = false;
      player.pause();
      player.currentTime = 0;
    };
  }, [player]);

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
  if (!active || Platform.OS === "android") {
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
        colors={["rgba(0,0,0,0.04)", "rgba(0,0,0,0.12)", "rgba(0,0,0,0.44)", "rgba(0,0,0,0.82)"]}
        locations={[0, 0.42, 0.74, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <View style={styles.cardFrame}>
        <View style={styles.cardBottomRow}>
          <View style={styles.copyBlock}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>
              {item.subtitle}
            </Text>
          </View>

          <LuxPressable
            onPress={handlePress}
            className="cursor-pointer"
            style={styles.ctaButton}
            glowColor="rgba(255,255,255,0.08)"
            scale={0.97}
          >
            <View style={styles.ctaInner}>
              <Text style={styles.ctaText}>Try it</Text>
              <ArrowUpRight color="#ffffff" size={15} strokeWidth={2.5} />
            </View>
          </LuxPressable>
        </View>
      </View>
    </View>
  );
});

export default function HomeScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [activeCardId, setActiveCardId] = useState(SERVICE_CARDS[0]?.id ?? "");
  const me = useQuery("users:me" as any, isSignedIn ? {} : "skip") as { credits?: number } | null | undefined;
  const ensureUser = useMutation("users:getOrCreateCurrentUser" as any);

  useEffect(() => {
    if (!isSignedIn) return;
    ensureUser({}).catch(() => undefined);
  }, [ensureUser, isSignedIn]);

  const cardHeight = useMemo(() => Math.max(332, Math.min(408, Math.round(width * 0.92))), [width]);
  const diamondCount = isSignedIn ? me?.credits ?? 3 : 3;

  const handleServicePress = useCallback(
    (item: ServiceCardData) => {
      router.push({ pathname: "/workspace", params: { service: item.serviceParam } });
    },
    [router],
  );

  const handleDiamondPress = useCallback(() => {
    triggerHaptic();
    router.push("/paywall");
  }, [router]);

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
        <View style={styles.headerTopRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Darkor.ai</Text>
            <Text style={styles.title}>Choose Your Transformation</Text>
          </View>

          <LuxPressable
            onPress={handleDiamondPress}
            style={styles.diamondBadge}
            className="cursor-pointer"
            glowColor="rgba(125,211,252,0.14)"
            scale={0.98}
          >
            <Gem color="#7dd3fc" size={15} strokeWidth={2.1} />
            <Text style={styles.diamondBadgeText}>{diamondCount}</Text>
          </LuxPressable>
        </View>
      </View>
    ),
    [diamondCount, handleDiamondPress],
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={SERVICE_CARDS}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={header}
        contentContainerStyle={{
          paddingTop: insets.top + 34,
          paddingHorizontal: 16,
          paddingBottom: Math.max(insets.bottom + 120, 136),
          gap: 24,
        }}
        ItemSeparatorComponent={() => <View style={{ height: 24 }} />}
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
    marginBottom: 12,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  headerCopy: {
    flex: 1,
    gap: 12,
    paddingRight: 12,
  },
  eyebrow: {
    color: "#8b8b92",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2.6,
    textTransform: "uppercase",
  },
  title: {
    color: "#ffffff",
    fontSize: 38,
    fontWeight: "800",
    lineHeight: 44,
    letterSpacing: -1.2,
  },
  diamondBadge: {
    marginTop: 8,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(8,8,10,0.92)",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  diamondBadgeText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
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
  cardFrame: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    paddingBottom: 22,
    paddingTop: 26,
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 14,
  },
  copyBlock: {
    flex: 1,
    gap: 8,
    paddingRight: 4,
  },
  cardTitle: {
    color: "#ffffff",
    fontSize: 31,
    fontWeight: "800",
    lineHeight: 35,
    letterSpacing: -0.65,
  },
  cardSubtitle: {
    color: "rgba(244,244,245,0.9)",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  ctaButton: {
    alignSelf: "flex-end",
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.86)",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  ctaInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  ctaText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.15,
  },
});
