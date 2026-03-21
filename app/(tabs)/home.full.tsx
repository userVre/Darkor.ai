import { useAuth } from "@clerk/expo";
import { useMutation, useQuery } from "convex/react";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { FlashList } from "@shopify/flash-list";
import { MotiView } from "moti";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Text, View, ViewToken, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Diamond, Settings, X } from "lucide-react-native";

import { triggerHaptic } from "../../lib/haptics";
import { LUX_SPRING, staggerFadeUp } from "../../lib/motion";
import { formatRewardCountdown } from "../../lib/rewards";
import { LuxPressable } from "../../components/lux-pressable";
import { DIAGNOSTIC_BYPASS, DISABLE_VIDEO_BACKGROUNDS } from "../../lib/diagnostics";

type ServiceCardData = {
  id: string;
  title: string;
  subtitle: string;
  video: number;
  serviceParam: string;
};

type MeResponse = {
  credits?: number;
  plan?: string;
  lastRewardDate?: number;
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

const CARD_GAP = 16;
const VIDEO_ENABLED = !DISABLE_VIDEO_BACKGROUNDS;

type ServiceCardProps = {
  item: ServiceCardData;
  height: number;
  index: number;
  isActive: boolean;
  onPress: (item: ServiceCardData) => void;
};

const CardSeparator = () => <View style={{ height: CARD_GAP }} />;

type BackgroundProps = {
  source: number;
  isActive: boolean;
};

function VideoBackground({ source, isActive }: BackgroundProps) {
  const player = useVideoPlayer(source, (playerInstance) => {
    playerInstance.loop = true;
    playerInstance.muted = true;
    playerInstance.volume = 0;
    playerInstance.timeUpdateEventInterval = 0;
  });

  useEffect(() => {
    if (!player) return;
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, player]);

  return (
    <VideoView
      player={player}
      className="absolute inset-0"
      contentFit="cover"
      nativeControls={false}
      pointerEvents="none"
    />
  );
}

function StaticBackground(_: BackgroundProps) {
  return <View className="absolute inset-0 bg-black" />;
}

const CardBackground = VIDEO_ENABLED ? VideoBackground : StaticBackground;

const ServiceCard = memo(function ServiceCard({ item, height, index, isActive, onPress }: ServiceCardProps) {
  const handlePress = useCallback(() => {
    triggerHaptic();
    onPress(item);
  }, [item, onPress]);

  return (
    <MotiView {...staggerFadeUp(index)} className="px-4">
      <View
        className="overflow-hidden rounded-3xl border border-white/10 bg-black"
        style={{ height, borderCurve: "continuous", borderWidth: 0.5 }}
      >
        <CardBackground source={item.video} isActive={isActive} />

        <BlurView
          intensity={96}
          tint="dark"
          className="absolute bottom-3 left-3 right-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3"
          style={{ borderCurve: "continuous", borderWidth: 0.5 }}
        >
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text className="text-base font-semibold text-white">{item.title}</Text>
              <Text className="mt-1 text-xs text-zinc-400">{item.subtitle}</Text>
            </View>
            <LuxPressable
              accessibilityRole="button"
              onPress={handlePress}
              className="rounded-full border border-white/40 bg-white/15 px-4 py-2"
              style={{ borderWidth: 0.5 }}
            >
              <Text className="text-xs font-semibold text-white">Try it! -&gt;</Text>
            </LuxPressable>
          </View>
        </BlurView>
      </View>
    </MotiView>
  );
});

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { isSignedIn } = useAuth();
  const diagnostic = DIAGNOSTIC_BYPASS;

  const me = useQuery(
    "users:me" as any,
    diagnostic ? "skip" : isSignedIn ? {} : "skip",
  ) as MeResponse | null | undefined;
  const ensureUser = useMutation("users:getOrCreateCurrentUser" as any);

  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    console.log("[Screen] Home mounted");
    return () => console.log("[Screen] Home unmounted");
  }, []);

  useEffect(() => {
    if (diagnostic) return;
    if (!isSignedIn) return;
    ensureUser({}).catch(() => undefined);
  }, [diagnostic, ensureUser, isSignedIn]);

  const credits = diagnostic ? 10 : typeof me?.credits === "number" ? me.credits : 3;
  const rewardCountdown = formatRewardCountdown(me?.lastRewardDate);
  const cardHeight = useMemo(() => Math.min(360, Math.round(width * 0.62)), [width]);
  const headerOffset = useMemo(() => insets.top + 64, [insets.top]);

  const contentContainerStyle = useMemo(
    () => ({ paddingTop: headerOffset + 12, paddingBottom: 120 }),
    [headerOffset],
  );

  const handleServicePress = useCallback(
    (item: ServiceCardData) => {
      router.push({ pathname: "/workspace", params: { service: item.serviceParam } });
    },
    [router],
  );

  const handleOpenSettings = useCallback(() => {
    triggerHaptic();
    router.push("/settings");
  }, [router]);

  const handleOpenCredits = useCallback(() => {
    triggerHaptic();
    setIsCreditModalOpen(true);
  }, []);

  const handleUpgrade = useCallback(() => {
    triggerHaptic();
    setIsCreditModalOpen(false);
    router.push("/settings");
  }, [router]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
      const next = new Set<string>();
      viewableItems.forEach((token) => {
        if (token.item?.id) next.add(token.item.id);
      });
      setActiveIds(next);
    },
  ).current;

  const renderItem = useCallback(
    ({ item, index }: { item: ServiceCardData; index: number }) => (
      <ServiceCard
        item={item}
        height={cardHeight}
        index={index}
        isActive={activeIds.has(item.id)}
        onPress={handleServicePress}
      />
    ),
    [activeIds, cardHeight, handleServicePress],
  );

  const keyExtractor = useCallback((item: ServiceCardData) => item.id, []);

  return (
    <View className="flex-1 bg-black" style={{ backgroundColor: "#000000" }}>
      <FlashList
        className="flex-1 bg-black"
        style={{ backgroundColor: "#000000" }}
        contentContainerStyle={contentContainerStyle}
        data={SERVICES}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ItemSeparatorComponent={CardSeparator}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        windowSize={6}
        initialNumToRender={3}
        estimatedItemSize={cardHeight + CARD_GAP}
        onViewableItemsChanged={onViewableItemsChanged}
        getItemLayout={(_, index) => ({
          length: cardHeight + CARD_GAP,
          offset: (cardHeight + CARD_GAP) * index,
          index,
        })}
      />

      <View
        className="absolute left-0 right-0 top-0 z-10 px-4"
        style={{ paddingTop: insets.top + 6 }}
        pointerEvents="box-none"
      >
        <BlurView
          intensity={90}
          tint="dark"
          className="rounded-full border border-white/10 bg-black/50 px-3 py-2"
          style={{ borderWidth: 0.5 }}
        >
          <View className="flex-row items-center justify-between">
            <LuxPressable
              onPress={handleOpenCredits}
              className="flex-row items-center gap-1.5 rounded-full border border-white/20 bg-black/70 px-3 py-2"
              style={{ borderWidth: 0.5 }}
            >
              <Diamond color="#ffffff" size={16} />
              <Text className="text-xs font-semibold text-white">{credits}</Text>
            </LuxPressable>
            <LuxPressable
              onPress={handleOpenSettings}
              className="h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60"
              style={{ borderWidth: 0.5 }}
            >
              <Settings color="#ffffff" size={18} />
            </LuxPressable>
          </View>
        </BlurView>
      </View>

      <Modal
        visible={isCreditModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCreditModalOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/80 px-6">
          <MotiView
            from={{ opacity: 0, translateY: 14, scale: 0.98 }}
            animate={{ opacity: 1, translateY: 0, scale: 1 }}
            transition={LUX_SPRING}
          >
            <BlurView
              intensity={96}
              tint="dark"
              className="w-full rounded-[26px] border border-white/10 bg-black/70 p-6"
              style={{ borderWidth: 0.5 }}
            >
            <LuxPressable
              onPress={() => {
                triggerHaptic();
                setIsCreditModalOpen(false);
              }}
              className="absolute right-4 top-4 h-7 w-7 items-center justify-center rounded-full bg-white/10"
            >
              <X color="#f4f4f5" size={16} />
            </LuxPressable>
            <Text className="mt-4 text-xl font-semibold text-white">Daily Credit Limit</Text>
            <Text className="mt-3 text-sm leading-5 text-zinc-300">
              Every account receives a set amount of daily credits. When credits run out, users can wait for the daily
              reset or choose to upgrade to a PRO plan instead anytime now!
            </Text>
            <Text className="mt-3 text-xs text-zinc-400">{rewardCountdown}</Text>
            <LuxPressable
              onPress={handleUpgrade}
              className="mt-5 items-center rounded-2xl bg-white/10 py-3"
            >
              <Text className="text-sm font-semibold text-white">Upgrade</Text>
            </LuxPressable>
            </BlurView>
          </MotiView>
        </View>
      </Modal>
    </View>
  );
}



