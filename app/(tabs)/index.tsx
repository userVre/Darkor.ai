import { useAuth } from "@clerk/expo";
import { skip, useMutation, useQuery } from "convex/react";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { MotiView } from "moti";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Diamond, Settings, X } from "lucide-react-native";

import { triggerHaptic } from "../../lib/haptics";

type ServiceCardData = {
  id: string;
  title: string;
  subtitle: string;
  video: number;
  serviceParam: string;
};

type MeResponse = {
  credits?: number;
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

type ServiceCardProps = {
  item: ServiceCardData;
  height: number;
  index: number;
  onPress: (item: ServiceCardData) => void;
};

const CardSeparator = () => <View style={{ height: CARD_GAP }} />;

const ServiceCard = memo(function ServiceCard({ item, height, index, onPress }: ServiceCardProps) {
  const player = useVideoPlayer(item.video, (playerInstance) => {
    playerInstance.loop = true;
    playerInstance.muted = true;
    playerInstance.volume = 0;
    playerInstance.timeUpdateEventInterval = 0;
    playerInstance.play();
  });

  const handlePress = useCallback(() => {
    triggerHaptic();
    onPress(item);
  }, [item, onPress]);

  return (
    <MotiView
      from={{ opacity: 0, translateY: 16 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 520, delay: index * 120 }}
      className="px-4"
    >
      <View
        className="overflow-hidden rounded-3xl border border-white/10 bg-[#050505]"
        style={{ height, borderCurve: "continuous" }}
      >
        <VideoView
          player={player}
          className="absolute inset-0"
          contentFit="cover"
          nativeControls={false}
          pointerEvents="none"
        />

        <BlurView
          intensity={88}
          tint="dark"
          className="absolute bottom-3 left-3 right-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-3"
          style={{ borderCurve: "continuous" }}
        >
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text className="text-base font-semibold text-white">{item.title}</Text>
              <Text className="mt-1 text-xs text-zinc-400">{item.subtitle}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={handlePress}
              className="cursor-pointer rounded-full border border-white/40 bg-white/15 px-4 py-2"
            >
              <Text className="text-xs font-semibold text-white">Try it! -&gt;</Text>
            </Pressable>
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

  const me = useQuery("users:me" as any, isSignedIn ? {} : skip) as MeResponse | null | undefined;
  const ensureUser = useMutation("users:getOrCreateCurrentUser" as any);

  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);

  useEffect(() => {
    if (!isSignedIn) return;
    ensureUser({}).catch(() => undefined);
  }, [ensureUser, isSignedIn]);

  const credits = typeof me?.credits === "number" ? me.credits : 3;
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

  const renderItem = useCallback(
    ({ item, index }: { item: ServiceCardData; index: number }) => (
      <ServiceCard item={item} height={cardHeight} index={index} onPress={handleServicePress} />
    ),
    [cardHeight, handleServicePress],
  );

  const keyExtractor = useCallback((item: ServiceCardData) => item.id, []);

  return (
    <View className="flex-1 bg-black">
      <FlatList
        className="flex-1 bg-black"
        contentContainerStyle={contentContainerStyle}
        data={SERVICES}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ItemSeparatorComponent={CardSeparator}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        windowSize={6}
        initialNumToRender={3}
        getItemLayout={(_, index) => ({
          length: cardHeight + CARD_GAP,
          offset: (cardHeight + CARD_GAP) * index,
          index,
        })}
      />

      <View
        className="absolute left-0 right-0 top-0 z-10 flex-row items-center justify-between px-4"
        style={{ paddingTop: insets.top + 8 }}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={handleOpenCredits}
          className="cursor-pointer flex-row items-center gap-1.5 rounded-full border border-white/20 bg-black/70 px-3 py-2"
        >
          <Diamond color="#ffffff" size={16} />
          <Text className="text-xs font-semibold text-white">{credits}</Text>
        </Pressable>
        <Pressable
          onPress={handleOpenSettings}
          className="cursor-pointer h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60"
        >
          <Settings color="#ffffff" size={18} />
        </Pressable>
      </View>

      <Modal
        visible={isCreditModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCreditModalOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/70 px-6">
          <View className="w-full rounded-[26px] bg-white p-6">
            <Pressable
              onPress={() => {
                triggerHaptic();
                setIsCreditModalOpen(false);
              }}
              className="cursor-pointer absolute right-4 top-4 h-7 w-7 items-center justify-center rounded-full bg-slate-100"
            >
              <X color="#111827" size={16} />
            </Pressable>
            <Text className="mt-4 text-xl font-semibold text-slate-900">Daily Credit Limit</Text>
            <Text className="mt-3 text-sm leading-5 text-slate-600">
              Every account receives a set amount of daily credits. When credits run out, users can wait for the daily
              reset or choose to upgrade to a PRO plan instead anytime now!
            </Text>
            <Pressable
              onPress={handleUpgrade}
              className="cursor-pointer mt-5 items-center rounded-2xl bg-black py-3"
            >
              <Text className="text-sm font-semibold text-white">Upgrade</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

