import { useAuth } from "@clerk/expo";
import { skip, useMutation, useQuery } from "convex/react";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Diamond, Search, Settings, X } from "lucide-react-native";

import { triggerHaptic } from "../../lib/haptics";
import { LUX_SPRING, staggerFadeUp } from "../../lib/motion";
import { LuxPressable } from "../../components/lux-pressable";

type MeResponse = {
  credits?: number;
};

type DiscoverCategory = {
  id: string;
  title: string;
};

type DiscoverSection = {
  id: "home" | "exterior" | "garden";
  title: string;
  categories: DiscoverCategory[];
};

const FILTERS = ["Home", "Garden", "Exterior Design"] as const;

const DISCOVER_SECTIONS: DiscoverSection[] = [
  {
    id: "home",
    title: "Home",
    categories: [
      { id: "kitchen", title: "Kitchen" },
      { id: "living-room", title: "Living Room" },
      { id: "master-suite", title: "Master Suite" },
      { id: "bathroom", title: "Bathroom" },
      { id: "dining-room", title: "Dining Room" },
      { id: "study-room", title: "Study Room" },
      { id: "nursery", title: "Nursery" },
      { id: "home-theater", title: "Home Theater" },
      { id: "gaming-room", title: "Gaming Room" },
      { id: "hall", title: "Hall" },
    ],
  },
  {
    id: "exterior",
    title: "Exterior",
    categories: [
      { id: "modern-house", title: "Modern House" },
      { id: "luxury-villa", title: "Luxury Villa" },
      { id: "apartment-block", title: "Apartment Block" },
      { id: "retail-store", title: "Retail Store" },
      { id: "garage", title: "Garage" },
    ],
  },
  {
    id: "garden",
    title: "Garden",
    categories: [
      { id: "backyard", title: "Backyard" },
      { id: "front-yard", title: "Front yard" },
      { id: "patio", title: "Patio" },
      { id: "swimming-pool", title: "Swimming Pool" },
      { id: "terrace", title: "Terrace" },
      { id: "deck", title: "Deck" },
    ],
  },
];

const PLACEHOLDERS = [0, 1, 2];

const filterMap: Record<(typeof FILTERS)[number], DiscoverSection["id"]> = {
  Home: "home",
  Garden: "garden",
  "Exterior Design": "exterior",
};

export default function GalleryScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const me = useQuery("users:me" as any, isSignedIn ? {} : skip) as MeResponse | null | undefined;
  const ensureUser = useMutation("users:getOrCreateCurrentUser" as any);

  const [activeFilter, setActiveFilter] = useState<(typeof FILTERS)[number]>("Home");
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);

  useEffect(() => {
    if (!isSignedIn) return;
    ensureUser({}).catch(() => undefined);
  }, [ensureUser, isSignedIn]);

  const credits = typeof me?.credits === "number" ? me.credits : 3;

  const filteredSections = useMemo(() => {
    const filterId = filterMap[activeFilter];
    return DISCOVER_SECTIONS.filter((section) => section.id === filterId);
  }, [activeFilter]);

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

  const handleFilterSelect = useCallback((filter: (typeof FILTERS)[number]) => {
    triggerHaptic();
    setActiveFilter(filter);
  }, []);

  const handleSeeAll = useCallback((category: string) => {
    triggerHaptic();
  }, []);

  const placeholderWidth = useMemo(() => Math.min(168, Math.round(width * 0.44)), [width]);

  return (
    <View className="flex-1 bg-black" style={{ backgroundColor: "#000000" }}>
      <ScrollView
        className="flex-1 bg-black"
        style={{ backgroundColor: "#000000" }}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120 }}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View className="px-4">
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

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8">
            <View className="flex-row gap-3">
              {FILTERS.map((filter, index) => {
                const active = filter === activeFilter;
                return (
                  <MotiView key={filter} {...staggerFadeUp(index, 70)}>
                    <LuxPressable
                      onPress={() => handleFilterSelect(filter)}
                      className={`rounded-full border px-4 py-2 ${
                        active ? "border-white/40 bg-white/15" : "border-white/10 bg-white/5"
                      }`}
                      style={{ borderWidth: 0.5 }}
                    >
                      <Text className={`text-xs font-semibold ${active ? "text-white" : "text-zinc-400"}`}>
                        {filter}
                      </Text>
                    </LuxPressable>
                  </MotiView>
                );
              })}
            </View>
          </ScrollView>
        </View>

        <View className="gap-8">
          {filteredSections.map((section, sectionIndex) => (
            <View key={section.id} className="gap-6">
              {section.categories.map((category, index) => (
                <MotiView key={category.id} {...staggerFadeUp(sectionIndex + index)} className="gap-3">
                  <View className="flex-row items-center justify-between px-4">
                    <Text className="text-lg font-semibold text-white">{category.title}</Text>
                    <LuxPressable onPress={() => handleSeeAll(category.title)}>
                      <Text className="text-xs font-semibold text-zinc-400">See All</Text>
                    </LuxPressable>
                  </View>

                  <FlatList
                    data={PLACEHOLDERS}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => `${category.id}-${item}`}
                    contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                    renderItem={({ index: itemIndex }) => (
                      <MotiView
                        {...staggerFadeUp(itemIndex, 110)}
                        className="overflow-hidden rounded-2xl border border-white/10 bg-black/70"
                        style={{ width: placeholderWidth, height: 140, borderCurve: "continuous", borderWidth: 0.5 }}
                      >
                        <View className="h-full w-full bg-white/5" />
                        <BlurView intensity={85} tint="dark" className="absolute inset-x-3 bottom-3 rounded-xl border border-white/10 bg-black/40 px-3 py-2" style={{ borderWidth: 0.5 }}>
                          <Text className="text-xs font-semibold text-white">Inspiration</Text>
                          <Text className="mt-1 text-[10px] text-zinc-400">High-end concept</Text>
                        </BlurView>
                      </MotiView>
                    )}
                  />
                </MotiView>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

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






