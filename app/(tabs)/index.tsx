import { useAuth, useUser } from "@clerk/expo";
import { useQuery } from "convex/react";
import { VideoView, useVideoPlayer } from "expo-video";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { memo, useCallback, useMemo } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import Logo from "../../components/logo";
import { getPriceId, type BillingCycle, type PlanKey } from "../../lib/pricing";
import { openPolarCheckout } from "../../lib/polar";
import { saveSubscriptionIntent } from "../../lib/subscription-intent";
import HeroTransformation from "../_components/HeroTransformation";

type MeResponse = {
  plan: "free" | PlanKey;
  credits: number;
};

type ServiceCardData = {
  id: string;
  title: string;
  cta: string;
  video: number;
  serviceParam: string;
};

const SERVICE_CARDS: ServiceCardData[] = [
  {
    id: "media-room",
    title: "Media Room Masterpiece",
    cta: "Try it! ->",
    video: require("../../assets/videos/media-wall.mp4"),
    serviceParam: "interior",
  },
  {
    id: "facade",
    title: "Architectural Facade",
    cta: "Try it! ->",
    video: require("../../assets/videos/facade.mp4"),
    serviceParam: "facade",
  },
  {
    id: "garden",
    title: "Designer Sanctuary",
    cta: "Try it! ->",
    video: require("../../assets/videos/garden.mp4"),
    serviceParam: "garden",
  },
  {
    id: "floor",
    title: "Instant Floor Restyle",
    cta: "Try it! ->",
    video: require("../../assets/videos/floor.mp4"),
    serviceParam: "floor",
  },
  {
    id: "paint",
    title: "Smart Wall Paint",
    cta: "Try it! ->",
    video: require("../../assets/videos/paint.mp4"),
    serviceParam: "paint",
  },
  {
    id: "bedroom",
    title: "Interior Redesign",
    cta: "Try it! ->",
    video: require("../../assets/videos/master-suite.mp4"),
    serviceParam: "interior-bedroom",
  },
];

const CARD_GAP = 18;

type ServiceCardProps = {
  item: ServiceCardData;
  height: number;
  locked: boolean;
  onPress: (item: ServiceCardData, locked: boolean) => void;
};

const ServiceCard = memo(function ServiceCard({ item, height, locked, onPress }: ServiceCardProps) {
  const player = useVideoPlayer(item.video, (playerInstance) => {
    playerInstance.loop = true;
    playerInstance.muted = true;
    playerInstance.volume = 0;
    playerInstance.timeUpdateEventInterval = 0;
    playerInstance.play();
  });

  const handlePress = useCallback(() => onPress(item, locked), [item, locked, onPress]);
  const handleCtaPress = useCallback(
    (event: { stopPropagation?: () => void }) => {
      event.stopPropagation?.();
      onPress(item, locked);
    },
    [item, locked, onPress],
  );

  return (
    <Pressable onPress={handlePress} style={[styles.card, styles.pointer, { height }]}>
      <VideoView
        player={player}
        style={styles.cardVideo}
        contentFit="cover"
        nativeControls={false}
        pointerEvents="none"
      />

      <BlurView intensity={60} tint="dark" style={styles.cardOverlay}>
        <View style={styles.cardOverlayRow}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Pressable onPress={handleCtaPress} style={[styles.cardButton, styles.pointer]}>
            <Text style={styles.cardButtonText}>{item.cta}</Text>
          </Pressable>
        </View>
      </BlurView>

      {locked ? (
        <View style={styles.lockBadge}>
          <Text style={styles.lockText}>🔒</Text>
        </View>
      ) : null}
    </Pressable>
  );
});

export default function HomeScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const { width } = useWindowDimensions();
  const me = useQuery("users:me" as any, isSignedIn ? {} : "skip") as MeResponse | null | undefined;

  const cardHeight = useMemo(() => Math.min(340, Math.round(width * 0.62)), [width]);
  const plan = me?.plan && me.plan !== "free" ? me.plan : "free";
  const shouldLock = plan === "pro";

  const handleUpgrade = useCallback(async () => {
    const billing: BillingCycle = "monthly";
    const planName: PlanKey = "premium";
    const priceId = getPriceId(planName, billing);
    const intent = { planName, priceId, billingCycle: billing };

    try {
      if (!isSignedIn || !user?.id) {
        await saveSubscriptionIntent(intent);
        router.push("/sign-in");
        return;
      }

      await openPolarCheckout(user.id, intent);
    } catch (error) {
      Alert.alert("Upgrade failed", "Please try again in a moment.");
    }
  }, [isSignedIn, router, user?.id]);

  const promptUpgrade = useCallback(() => {
    Alert.alert(
      "Upgrade required",
      "Upgrade your plan to unlock this experience.",
      [
        { text: "Not now", style: "cancel" },
        { text: "Upgrade", onPress: () => void handleUpgrade() },
      ],
    );
  }, [handleUpgrade]);

  const handleServicePress = useCallback(
    (item: ServiceCardData, locked: boolean) => {
      if (locked) {
        promptUpgrade();
        return;
      }
      router.push({ pathname: "/workspace", params: { service: item.serviceParam } });
    },
    [promptUpgrade, router],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: ServiceCardData; index: number }) => (
      <View style={styles.cardWrap}>
        <ServiceCard item={item} height={cardHeight} locked={shouldLock && index >= 3} onPress={handleServicePress} />
      </View>
    ),
    [cardHeight, handleServicePress, shouldLock],
  );

  const keyExtractor = useCallback((item: ServiceCardData) => item.id, []);

  const header = useMemo(
    () => (
      <View style={styles.headerWrap}>
        <View style={styles.brandRow}>
          <Logo width={36} height={36} />
          <Text style={styles.brandTitle}>home ai</Text>
        </View>
        <Text style={styles.brandSubtitle}>Select a transformation and watch the room evolve.</Text>
        <HeroTransformation compact />
        <Text style={styles.sectionTitle}>Services</Text>
      </View>
    ),
    [],
  );

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={SERVICE_CARDS}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ListHeaderComponent={header}
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
    backgroundColor: "#f4f4f5",
  },
  content: {
    paddingBottom: 120,
  },
  headerWrap: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 12,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: 0.6,
  },
  brandSubtitle: {
    color: "#475569",
    fontSize: 13,
  },
  sectionTitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  cardWrap: {
    paddingHorizontal: 20,
  },
  cardSpacer: {
    height: CARD_GAP,
  },
  card: {
    borderRadius: 24,
    borderCurve: "continuous",
    overflow: "hidden",
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    boxShadow: "0 28px 60px rgba(15, 23, 42, 0.18)",
  },
  cardVideo: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  cardOverlay: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    backgroundColor: "rgba(6, 10, 18, 0.45)",
  },
  cardOverlayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitle: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  cardButton: {
    borderRadius: 999,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 14,
    paddingVertical: 8,
    boxShadow: "0 10px 20px rgba(15, 23, 42, 0.35)",
  },
  cardButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  lockBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  lockText: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "700",
  },
  pointer: {
    cursor: "pointer",
  },
});
