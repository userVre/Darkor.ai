import { useAuth } from "@clerk/expo";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { AnimatePresence, MotiView } from "moti";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Platform, StyleSheet, Text, View, type NativeSyntheticEvent, type NativeScrollEvent, type ViewToken, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowDown } from "lucide-react-native";

import { HomeHeader } from "../../components/home-header";
import { LuxPressable } from "../../components/lux-pressable";
import { useViewerSession } from "../../components/viewer-session-context";
import { DS, HAIRLINE, SCREEN_SECTION_GAP, SCREEN_SIDE_PADDING, glowShadow } from "../../lib/design-system";
import { ENABLE_GUEST_WIZARD_TEST_MODE, GUEST_TESTING_STARTER_CREDITS } from "../../lib/guest-testing";
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
  section: "full-ai-redesign" | "precision-edits";
  video: number;
  poster: number;
  serviceParam: string;
  requiresPro?: boolean;
};

type ServiceListItem =
  | {
      id: string;
      type: "section";
      label: string;
    }
  | {
      id: string;
      type: "card";
      item: ServiceCardData;
    };

const SECTION_CARD_GAP = 12;
const SECTION_BREAK_GAP = 16;

const SERVICE_SECTION_LABELS = {
  "full-ai-redesign": "✦ Full AI Redesign",
  "precision-edits": "✦ Precision Edits",
};

const SERVICE_CARDS: ServiceCardData[] = [
  {
    id: "interior-design",
    title: "Interior Design",
    subtitle: "Designer interiors with realistic materials and luxury light.",
    eyebrow: "Most Popular",
    section: "full-ai-redesign",
    video: require("../../assets/videos/master-suite.mp4"),
    poster: require("../../assets/media/discover/home/home-master-suite.jpg"),
    serviceParam: "interior",
  },
  {
    id: "exterior-design",
    title: "Exterior Design",
    subtitle: "Architectural facade upgrades with stronger curb appeal.",
    eyebrow: "Curb Appeal",
    section: "full-ai-redesign",
    video: require("../../assets/videos/facade.mp4"),
    poster: require("../../assets/media/discover/exterior/exterior-modern-villa.jpg"),
    serviceParam: "facade",
  },
  {
    id: "garden-design",
    title: "Garden Design",
    subtitle: "Landscape concepts for patios, pools, fire pits, and flow.",
    eyebrow: "Outdoor Living",
    section: "full-ai-redesign",
    video: require("../../assets/videos/garden.mp4"),
    poster: require("../../assets/media/discover/garden/garden-fireside-patio.jpg"),
    serviceParam: "garden",
  },
  {
    id: "ai-paint",
    title: "Smart Wall Paint",
    subtitle: "Premium wall recolors with exact masking and polished finish.",
    eyebrow: "Precision Edit",
    section: "precision-edits",
    video: require("../../assets/videos/paint.mp4"),
    poster: require("../../assets/media/discover/wall-scenes/sage-green-suite.jpg"),
    serviceParam: "paint",
    requiresPro: true,
  },
  {
    id: "floor-restyle",
    title: "Floor Restyle",
    subtitle: "Floor material swaps with clean perspective and natural light.",
    eyebrow: "Material Upgrade",
    section: "precision-edits",
    video: require("../../assets/videos/floor.mp4"),
    poster: require("../../assets/media/discover/floor-scenes/polished-carrara-marble.jpg"),
    serviceParam: "floor",
    requiresPro: true,
  },
] as const;

const SERVICE_LIST_ITEMS: ServiceListItem[] = [
  {
    id: "section-full-ai-redesign",
    type: "section",
    label: SERVICE_SECTION_LABELS["full-ai-redesign"],
  },
  ...SERVICE_CARDS.filter((card) => card.section === "full-ai-redesign").map((item) => ({
    id: item.id,
    type: "card" as const,
    item,
  })),
  {
    id: "section-precision-edits",
    type: "section",
    label: SERVICE_SECTION_LABELS["precision-edits"],
  },
  ...SERVICE_CARDS.filter((card) => card.section === "precision-edits").map((item) => ({
    id: item.id,
    type: "card" as const,
    item,
  })),
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
  showScrollHint: boolean;
  onPress: (item: ServiceCardData) => void;
};

const ServiceCard = memo(function ServiceCard({ item, height, active, showScrollHint, onPress }: ServiceCardProps) {
  const handlePress = useCallback(() => {
    triggerHaptic();
    onPress(item);
  }, [item, onPress]);

  return (
    <View style={styles.cardStack}>
      <View style={[styles.card, { height }]}>
        <CardMedia item={item} active={active} />
        <LinearGradient
          colors={["rgba(0,0,0,0.04)", "rgba(0,0,0,0.12)", "rgba(0,0,0,0.44)", "rgba(0,0,0,0.82)"]}
          locations={[0, 0.42, 0.74, 1]}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />

        {item.requiresPro ? (
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>💎 PRO</Text>
          </View>
        ) : null}

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
              glowColor="rgba(124,58,237,0.28)"
              scale={0.98}
            >
              <LinearGradient colors={["#7C3AED", "#6D28D9"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.ctaGradient}>
                <Text style={styles.ctaText}>Start Redesign →</Text>
              </LinearGradient>
            </LuxPressable>
          </View>
        </View>
      </View>

      <AnimatePresence>
        {showScrollHint ? (
          <MotiView
            key="scroll-hint"
            from={{ opacity: 0, translateY: -6 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: -8 }}
            transition={{ type: "timing", duration: 240 }}
            style={styles.scrollHintRow}
          >
            <ArrowDown color="rgba(255,255,255,0.52)" size={14} strokeWidth={2.1} />
            <Text style={styles.scrollHintText}>Scroll to explore all tools</Text>
          </MotiView>
        ) : null}
      </AnimatePresence>
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
  const [hasScrolledOnce, setHasScrolledOnce] = useState(false);
  const viewerArgs = useMemo(() => (anonymousId ? { anonymousId } : {}), [anonymousId]);
  const canCreateAsGuest = isSignedIn || ENABLE_GUEST_WIZARD_TEST_MODE;
  const me = useQuery("users:me" as any, viewerReady ? viewerArgs : "skip") as
    | { credits?: number; imagesRemaining?: number; imageGenerationLimit?: number }
    | null
    | undefined;

  const cardHeight = useMemo(() => Math.max(356, Math.min(430, Math.round(width * 0.96))), [width]);
  const remainingRenders = viewerReady
    ? me?.imagesRemaining ?? me?.credits ?? GUEST_TESTING_STARTER_CREDITS
    : GUEST_TESTING_STARTER_CREDITS;
  const renderLimit = viewerReady
    ? me?.imageGenerationLimit ?? Math.max(remainingRenders, 5)
    : Math.max(GUEST_TESTING_STARTER_CREDITS, 5);
  const remainingRenderProgress = renderLimit > 0 ? Math.min(remainingRenders / renderLimit, 1) : 0;

  const handleServicePress = useCallback(
    (item: ServiceCardData) => {
      if (!canCreateAsGuest) {
        router.push({ pathname: "/sign-in", params: { returnTo: `/workspace?service=${item.serviceParam}` } });
        return;
      }

      router.push({ pathname: "/workspace", params: { service: item.serviceParam } });
    },
    [canCreateAsGuest, router],
  );

  const handleUpgradeToPro = useCallback(() => {
    router.push("/paywall");
  }, [router]);

  const handleOpenProfile = useCallback(() => {
    router.push("/profile");
  }, [router]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<ServiceListItem>[] }) => {
      const firstVisible = viewableItems.find((entry) => entry.isViewable && entry.item.type === "card")?.item;
      if (firstVisible?.type === "card") {
        setActiveCardId((current) => (current === firstVisible.item.id ? current : firstVisible.item.id));
      }
    },
  );

  const renderItem = useCallback(
    ({ item, index }: { item: ServiceListItem; index: number }) => {
      const previousItem = index > 0 ? SERVICE_LIST_ITEMS[index - 1] : null;
      const marginTop =
        item.type === "section"
          ? index === 0
            ? 0
            : SECTION_BREAK_GAP
          : previousItem?.type === "section"
            ? SECTION_CARD_GAP
            : SCREEN_SECTION_GAP;

      return (
        <View style={marginTop > 0 ? { marginTop } : null}>
          {item.type === "section" ? (
            <Text style={styles.sectionHeader}>{item.label}</Text>
          ) : (
            <ServiceCard
              item={item.item}
              height={cardHeight}
              active={item.item.id === activeCardId}
              showScrollHint={item.item.id === "interior-design" && !hasScrolledOnce}
              onPress={handleServicePress}
            />
          )}
        </View>
      );
    },
    [activeCardId, cardHeight, handleServicePress, hasScrolledOnce],
  );

  const keyExtractor = useCallback((item: ServiceListItem) => item.id, []);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!hasScrolledOnce && event.nativeEvent.contentOffset.y > 18) {
      setHasScrolledOnce(true);
    }
  }, [hasScrolledOnce]);

  const header = useMemo(
    () => (
      <HomeHeader
        remainingRenders={remainingRenders}
        progressValue={remainingRenderProgress}
        onUpgradeToPro={handleUpgradeToPro}
        onOpenProfile={handleOpenProfile}
      />
    ),
    [handleOpenProfile, handleUpgradeToPro, remainingRenderProgress, remainingRenders],
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={SERVICE_LIST_ITEMS}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={header}
        contentContainerStyle={{
          paddingTop: insets.top + DS.spacing[3],
          paddingHorizontal: SCREEN_SIDE_PADDING,
          paddingBottom: Math.max(insets.bottom + 120, 136),
        }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        updateCellsBatchingPeriod={40}
        windowSize={3}
        removeClippedSubviews
        onScroll={handleScroll}
        scrollEventThrottle={16}
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
  sectionHeader: {
    color: "rgba(255,255,255,0.54)",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
  cardStack: {
    gap: 12,
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
    gap: 18,
  },
  cardCopyStack: {
    gap: 12,
  },
  cardActionRow: {
    width: "100%",
  },
  copyBlock: {
    gap: 10,
    maxWidth: "92%",
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
  proBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 2,
    borderRadius: DS.radius.pill,
    borderWidth: HAIRLINE,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(8,8,12,0.76)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  proBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.7,
  },
  ctaButton: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
  ctaGradient: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.1,
  },
  scrollHintRow: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scrollHintText: {
    color: "rgba(255,255,255,0.52)",
    fontSize: 13,
    fontWeight: "600",
  },
});
