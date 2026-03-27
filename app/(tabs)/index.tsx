import { useAuth } from "@clerk/expo";
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
  eyebrow: string;
  video: number;
  poster: number;
  serviceParam: string;
};

const SERVICE_CARDS: ServiceCardData[] = [
  {
    id: "interior-design",
    title: "Interior Design",
    subtitle: "Designer interiors with realistic materials and luxury light.",
    eyebrow: "Most Popular",
    video: require("../../assets/videos/master-suite.mp4"),
    poster: require("../../assets/media/discover/home/home-master-suite.jpg"),
    serviceParam: "interior",
  },
  {
    id: "exterior-design",
    title: "Exterior Design",
    subtitle: "Architectural facade upgrades with stronger curb appeal.",
    eyebrow: "Curb Appeal",
    video: require("../../assets/videos/facade.mp4"),
    poster: require("../../assets/media/discover/exterior/exterior-modern-villa.jpg"),
    serviceParam: "facade",
  },
  {
    id: "garden-design",
    title: "Garden Design",
    subtitle: "Landscape concepts for patios, pools, fire pits, and flow.",
    eyebrow: "Outdoor Living",
    video: require("../../assets/videos/garden.mp4"),
    poster: require("../../assets/media/discover/garden/garden-fireside-patio.jpg"),
    serviceParam: "garden",
  },
  {
    id: "ai-paint",
    title: "Smart Wall Paint",
    subtitle: "Premium wall recolors with exact masking and polished finish.",
    eyebrow: "Precision Edit",
    video: require("../../assets/videos/paint.mp4"),
    poster: require("../../assets/media/discover/wall-scenes/sage-green-suite.jpg"),
    serviceParam: "paint",
  },
  {
    id: "floor-restyle",
    title: "Floor Restyle",
    subtitle: "Floor material swaps with clean perspective and natural light.",
    eyebrow: "Material Upgrade",
    video: require("../../assets/videos/floor.mp4"),
    poster: require("../../assets/media/discover/floor-scenes/polished-carrara-marble.jpg"),
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
        <View style={styles.cardCopyStack}>
          <View style={styles.copyBlock}>
            <View style={styles.cardEyebrowPill}>
              <Text style={styles.cardEyebrowText}>{item.eyebrow}</Text>
            </View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSubtitle} numberOfLines={2}>
              {item.subtitle}
            </Text>
          </View>
        </View>

        <View style={styles.cardActionRow}>
          <LuxPressable
            onPress={handlePress}
            className="cursor-pointer"
            style={styles.ctaButton}
            glowColor="rgba(217,70,239,0.18)"
            scale={0.97}
          >
            <View style={styles.ctaInner}>
              <Text style={styles.ctaText}>Try it!</Text>
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
  const { anonymousId, isReady: viewerReady } = useViewerSession();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [activeCardId, setActiveCardId] = useState(SERVICE_CARDS[0]?.id ?? "");
  const viewerArgs = useMemo(() => (anonymousId ? { anonymousId } : {}), [anonymousId]);
  const me = useQuery("users:me" as any, viewerReady ? viewerArgs : "skip") as
    | { credits?: number; imagesRemaining?: number }
    | null
    | undefined;

  const cardHeight = useMemo(() => Math.max(356, Math.min(430, Math.round(width * 0.96))), [width]);
  const remainingRenders = viewerReady ? me?.imagesRemaining ?? me?.credits ?? 3 : 3;

  const handleServicePress = useCallback(
    (item: ServiceCardData) => {
      if (!isSignedIn) {
        router.push({ pathname: "/sign-in", params: { returnTo: `/workspace?service=${item.serviceParam}` } });
        return;
      }

      router.push({ pathname: "/workspace", params: { service: item.serviceParam } });
    },
    [isSignedIn, router],
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
        remainingRenders={remainingRenders}
        onUpgradeToPro={handleUpgradeToPro}
        onOpenProfile={handleOpenProfile}
      />
    ),
    [handleOpenProfile, handleUpgradeToPro, remainingRenders],
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
    gap: 16,
  },
  cardCopyStack: {
    gap: 12,
  },
  cardActionRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  copyBlock: {
    gap: 10,
    maxWidth: "88%",
  },
  cardEyebrowPill: {
    alignSelf: "flex-start",
    borderRadius: DS.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: HAIRLINE,
    borderColor: "rgba(255,255,255,0.16)",
  },
  cardEyebrowText: {
    color: "#f5d0fe",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  cardTitle: {
    color: DS.colors.textPrimary,
    ...DS.typography.title,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  cardSubtitle: {
    color: "rgba(255,255,255,0.88)",
    ...DS.typography.body,
    fontSize: 15,
    lineHeight: 22,
  },
  ctaButton: {
    alignSelf: "flex-end",
    borderRadius: DS.radius.pill,
    backgroundColor: "rgba(0,0,0,0.72)",
    borderWidth: HAIRLINE,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 20,
    paddingVertical: 14,
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
    fontSize: 15,
  },
});
