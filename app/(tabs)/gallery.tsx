import { useAuth } from "@clerk/expo";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { FlashList } from "@shopify/flash-list";
import { skip, useMutation, useQuery } from "convex/react";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Extrapolate,
  interpolate,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { Diamond, Search, Settings, X } from "lucide-react-native";

import { triggerHaptic } from "../../lib/haptics";
import { LUX_SPRING, staggerFadeUp } from "../../lib/motion";
import { DISCOVER_ITEMS, type DiscoverItem } from "../../lib/discover-data";
import { GlassBackdrop } from "../../components/glass-backdrop";
import { LuxPressable } from "../../components/lux-pressable";
import { useWorkspaceDraft } from "../../components/workspace-context";

type MeResponse = {
  credits?: number;
};

const NUM_COLUMNS = 2;
const GAP = 14;
const H_PADDING = 16;

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList) as typeof FlashList;

const DiscoverCard = memo(function DiscoverCard({
  item,
  index,
  columnWidth,
  onPress,
  scrollY,
}: {
  item: DiscoverItem;
  index: number;
  columnWidth: number;
  scrollY: SharedValue<number>;
  onPress: (item: DiscoverItem) => void;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const rowIndex = Math.floor(index / NUM_COLUMNS);
    const baseOffset = rowIndex * (260 + GAP);
    const scale = interpolate(
      scrollY.value,
      [baseOffset - 240, baseOffset, baseOffset + 240],
      [0.97, 1.03, 0.97],
      Extrapolate.CLAMP,
    );
    return {
      transform: [{ scale }],
    };
  }, [index, scrollY]);

  return (
    <Animated.View style={[animatedStyle, { width: columnWidth, marginBottom: GAP }]}>
      <LuxPressable
        onPress={() => onPress(item)}
        className="overflow-hidden rounded-3xl border border-white/10 bg-black"
        style={{ borderWidth: 0.5 }}
      >
        <View style={{ height: item.height }}>
          <Image
            source={typeof item.image === "string" ? { uri: item.image } : item.image}
            className="h-full w-full"
            contentFit="cover"
            transition={260}
          />
          <BlurView
            intensity={70}
            tint="dark"
            className="absolute bottom-3 left-3 right-3 rounded-2xl border border-white/10 bg-black/40 px-3 py-2"
            style={{ borderWidth: 0.5, borderCurve: "continuous" }}
          >
            <Text className="text-[11px] font-semibold text-zinc-200">{item.style}</Text>
            <Text className="mt-1 text-[10px] text-zinc-400">{item.title}</Text>
          </BlurView>
        </View>
      </LuxPressable>
    </Animated.View>
  );
});

function mapService(category: DiscoverItem["category"]) {
  if (category === "Garden") return "garden";
  if (category === "Exterior") return "exterior";
  return "interior";
}

export default function GalleryScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { draft, setDraftStyle } = useWorkspaceDraft();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const me = useQuery("users:me" as any, isSignedIn ? {} : skip) as MeResponse | null | undefined;
  const ensureUser = useMutation("users:getOrCreateCurrentUser" as any);

  const [selectedItem, setSelectedItem] = useState<DiscoverItem | null>(null);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);

  const styleSheetRef = useRef<BottomSheetModal>(null);
  const isSmallScreen = height < 740;
  const snapPoints = useMemo(() => [isSmallScreen ? "95%" : "58%"], [isSmallScreen]);

  useEffect(() => {
    if (!isSignedIn) return;
    ensureUser({}).catch(() => undefined);
  }, [ensureUser, isSignedIn]);

  const credits = typeof me?.credits === "number" ? me.credits : 3;
  const columnWidth = useMemo(() => (width - H_PADDING * 2 - GAP) / NUM_COLUMNS, [width]);
  const scrollY = useSharedValue(0);

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

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

  const handleSearch = useCallback(() => {
    triggerHaptic();
  }, []);

  const handleSelectItem = useCallback((item: DiscoverItem) => {
    triggerHaptic();
    setSelectedItem(item);
    requestAnimationFrame(() => styleSheetRef.current?.present());
  }, []);

  const handleCloseSheet = useCallback(() => {
    triggerHaptic();
    styleSheetRef.current?.dismiss();
  }, []);

  const handleUseStyle = useCallback(() => {
    if (!selectedItem) return;
    const service = mapService(selectedItem.category);
    const hasPrereqs = Boolean(draft.image && draft.room);
    const startStep = hasPrereqs ? 3 : 0;
    triggerHaptic();
    setDraftStyle(selectedItem.style);
    console.log("[Analytics] Style Selected from Discover", {
      style: selectedItem.style,
      category: selectedItem.category,
      hasPrereqs,
    });
    styleSheetRef.current?.dismiss();
    router.push({
      pathname: "/workspace",
      params: { service, presetStyle: selectedItem.style, startStep: String(startStep) },
    });
  }, [draft.image, draft.room, router, selectedItem, setDraftStyle]);

  const header = useMemo(
    () => (
      <View className="px-4" style={{ paddingTop: insets.top + 12 }}>
        <MotiView {...staggerFadeUp(0)}>
          <BlurView
            intensity={90}
            tint="dark"
            className="mb-6 rounded-[28px] border border-white/10 bg-black/60 px-4 py-3"
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

              <Text className="text-2xl font-semibold text-white">Discover</Text>

              <View className="flex-row items-center gap-2">
                <LuxPressable
                  onPress={handleSearch}
                  className="h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60"
                  style={{ borderWidth: 0.5 }}
                >
                  <Search color="#ffffff" size={18} />
                </LuxPressable>
                <LuxPressable
                  onPress={handleOpenSettings}
                  className="h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60"
                  style={{ borderWidth: 0.5 }}
                >
                  <Settings color="#ffffff" size={18} />
                </LuxPressable>
              </View>
            </View>
          </BlurView>
        </MotiView>

        <MotiView {...staggerFadeUp(1)} className="mb-6">
          <Text className="text-sm uppercase tracking-[3px] text-zinc-500">Darkor.ai Curated</Text>
          <Text className="mt-2 text-3xl font-semibold text-white">Visual Heart</Text>
          <Text className="mt-2 text-sm text-zinc-400">
            Explore {DISCOVER_ITEMS.length} cinematic spaces. Tap any style to launch the studio.
          </Text>
        </MotiView>
      </View>
    ),
    [credits, handleOpenCredits, handleOpenSettings, handleSearch, insets.top],
  );

  return (
    <View className="flex-1 bg-black" style={{ backgroundColor: "#000000" }}>
      <AnimatedFlashList
        data={DISCOVER_ITEMS}
        keyExtractor={(item) => item.id}
        numColumns={NUM_COLUMNS}
        masonry
        optimizeItemArrangement
        renderItem={({ item, index }) => (
          <DiscoverCard
            item={item}
            index={index}
            columnWidth={columnWidth}
            onPress={handleSelectItem}
            scrollY={scrollY}
          />
        )}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        estimatedItemSize={280}
        contentContainerStyle={{ paddingBottom: 140 }}
        ListHeaderComponent={header}
        columnWrapperStyle={{ paddingHorizontal: H_PADDING, columnGap: GAP }}
        contentInsetAdjustmentBehavior="automatic"
      />

      <BottomSheetModal
        ref={styleSheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={GlassBackdrop}
        onDismiss={() => setSelectedItem(null)}
        backgroundStyle={{ backgroundColor: "#050505" }}
        handleIndicatorStyle={{ backgroundColor: "rgba(255,255,255,0.4)" }}
      >
        <View className="flex-1 px-5 pb-8 pt-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-white">Style Preview</Text>
            <LuxPressable onPress={handleCloseSheet} className="h-9 w-9 items-center justify-center rounded-full bg-white/10">
              <X color="#f4f4f5" size={16} />
            </LuxPressable>
          </View>

          {selectedItem ? (
            <View className="mt-4 overflow-hidden rounded-3xl border border-white/10" style={{ borderWidth: 0.5 }}>
              <Image
                source={typeof selectedItem.image === "string" ? { uri: selectedItem.image } : selectedItem.image}
                className="h-56 w-full"
                contentFit="cover"
              />
              <BlurView
                intensity={80}
                tint="dark"
                className="absolute bottom-3 left-3 right-3 rounded-2xl border border-white/10 bg-black/60 px-3 py-2"
                style={{ borderWidth: 0.5 }}
              >
                <Text className="text-sm font-semibold text-white">{selectedItem.style}</Text>
                <Text className="mt-1 text-xs text-zinc-400">
                  {selectedItem.title} · {selectedItem.category}
                </Text>
              </BlurView>
            </View>
          ) : null}

          <LuxPressable onPress={handleUseStyle} className="mt-5 overflow-hidden rounded-[22px]">
            <LinearGradient
              colors={["#f43f5e", "#d946ef"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 22, paddingVertical: 16, alignItems: "center" }}
            >
              <Text className="text-sm font-semibold text-white">Use this Style ✨</Text>
            </LinearGradient>
          </LuxPressable>
        </View>
      </BottomSheetModal>

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
              <LuxPressable onPress={handleUpgrade} className="mt-5 items-center rounded-2xl bg-white/10 py-3">
                <Text className="text-sm font-semibold text-white">Upgrade</Text>
              </LuxPressable>
            </BlurView>
          </MotiView>
        </View>
      </Modal>
    </View>
  );
}

