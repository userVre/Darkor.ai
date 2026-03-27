import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Platform, StyleSheet, Text, View, type ViewToken, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowUpRight } from "lucide-react-native";

import { HomeHeader } from "../../components/home-header";
import { LuxPressable } from "../../components/lux-pressable";
import { useViewerSession } from "../../components/viewer-session-context";
import { DS, HAIRLINE, SCREEN_SECTION_GAP, SCREEN_SIDE_PADDING, glowShadow } from "../../lib/design-system";
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
    title: "Smart Wall Paint",
    subtitle: "Wall color transformations tuned for elegant tonal balance.",
    video: require("../../assets/videos/paint.mp4"),
    poster: require("../../assets/media/discover/wall/sage-green.jpg"),
    serviceParam: "paint",
  },
  {
    id: "floor-restyle",
    title: "Floor Restyle",
    subtitle: "Material swaps from tile to hardwood with cleaner detailing.",
    video: require("../../assets/videos/floor.mp4"),
    poster: require("../../assets/media/discover/floor/carrara-marble.jpg"),
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
  const { anonymousId, isReady: viewerReady } = useViewerSession();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [activeCardId, setActiveCardId] = useState(SERVICE_CARDS[0]?.id ?? "");
  const viewerArgs = useMemo(() => (anonymousId ? { anonymousId } : {}), [anonymousId]);
  const me = useQuery("users:me" as any, viewerReady ? viewerArgs : "skip") as { credits?: number } | null | undefined;

  const cardHeight = useMemo(() => Math.max(332, Math.min(408, Math.round(width * 0.92))), [width]);
  const diamondCount = viewerReady ? me?.credits ?? 3 : 3;

  const handleServicePress = useCallback(
    (item: ServiceCardData) => {
      router.push({ pathname: "/workspace", params: { service: item.serviceParam } });
    },
    [router],
  );

  const handleUpgradeToPro = useCallback(() => {
    router.push("/paywall");
  }, [router]);

  const handleOpenProfile = useCallback(() => {
    router.push("/profile");
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
      <HomeHeader
        diamondCount={diamondCount}
        onUpgradeToPro={handleUpgradeToPro}
        onOpenProfile={handleOpenProfile}
      />
    ),
    [diamondCount, handleOpenProfile, handleUpgradeToPro],
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={SERVICE_CARDS}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={header}
        contentContainerStyle={{
          paddingTop: insets.top + DS.spacing[3],
          paddingHorizontal: SCREEN_SIDE_PADDING,
          paddingBottom: Math.max(insets.bottom + 120, 136),
          gap: SCREEN_SECTION_GAP,
        }}
        ItemSeparatorComponent={() => <View style={{ height: SCREEN_SECTION_GAP }} />}
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
  card: {
    position: "relative",
    overflow: "hidden",
    borderRadius: DS.radius.xxl,
    borderWidth: HAIRLINE,
    borderColor: DS.colors.borderSubtle,
    backgroundColor: DS.colors.backgroundAlt,
    ...glowShadow("rgba(0,0,0,0.34)", 26),
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  cardFrame: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: DS.spacing[3],
    paddingBottom: DS.spacing[3],
    paddingTop: DS.spacing[4],
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 14,
  },
  copyBlock: {
    flex: 1,
    gap: DS.spacing[1],
    paddingRight: 4,
  },
  cardTitle: {
    color: DS.colors.textPrimary,
    ...DS.typography.title,
  },
  cardSubtitle: {
    color: DS.colors.textSecondary,
    ...DS.typography.body,
  },
  ctaButton: {
    alignSelf: "flex-end",
    borderRadius: DS.radius.pill,
    backgroundColor: "rgba(0,0,0,0.82)",
    borderWidth: HAIRLINE,
    borderColor: DS.colors.border,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  ctaInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  ctaText: {
    color: DS.colors.textPrimary,
    ...DS.typography.button,
  },
});
