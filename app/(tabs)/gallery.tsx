import { useAuth } from "@clerk/expo";
import { skip, useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Diamond, Search, Settings, X } from "lucide-react-native";

import { triggerHaptic } from "../../lib/haptics";

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
    <View className="flex-1 bg-black">
      <ScrollView
        className="flex-1 bg-black"
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120 }}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View className="px-4">
          <View className="mb-6 flex-row items-center justify-between">
            <Pressable
              onPress={handleOpenCredits}
              className="cursor-pointer flex-row items-center gap-1.5 rounded-full border border-white/20 bg-black/70 px-3 py-2"
            >
              <Diamond color="#ffffff" size={16} />
              <Text className="text-xs font-semibold text-white">{credits}</Text>
            </Pressable>

            <Text className="text-2xl font-semibold text-white">Discover</Text>

            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={handleSearch}
                className="cursor-pointer h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60"
              >
                <Search color="#ffffff" size={18} />
              </Pressable>
              <Pressable
                onPress={handleOpenSettings}
                className="cursor-pointer h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60"
              >
                <Settings color="#ffffff" size={18} />
              </Pressable>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8">
            <View className="flex-row gap-3">
              {FILTERS.map((filter) => {
                const active = filter === activeFilter;
                return (
                  <Pressable
                    key={filter}
                    onPress={() => handleFilterSelect(filter)}
                    className={`cursor-pointer rounded-full border px-4 py-2 ${
                      active
                        ? "border-white/40 bg-white/15"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <Text className={`text-xs font-semibold ${active ? "text-white" : "text-zinc-400"}`}>
                      {filter}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>

        <View className="gap-8">
          {filteredSections.map((section, sectionIndex) => (
            <View key={section.id} className="gap-6">
              {section.categories.map((category, index) => (
                <MotiView
                  key={category.id}
                  from={{ opacity: 0, translateY: 16 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: "timing", duration: 420, delay: (sectionIndex + index) * 80 }}
                  className="gap-3"
                >
                  <View className="flex-row items-center justify-between px-4">
                    <Text className="text-lg font-semibold text-white">{category.title}</Text>
                    <Pressable
                      onPress={() => handleSeeAll(category.title)}
                      className="cursor-pointer"
                    >
                      <Text className="text-xs font-semibold text-zinc-400">See All</Text>
                    </Pressable>
                  </View>

                  <FlatList
                    data={PLACEHOLDERS}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => `${category.id}-${item}`}
                    contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                    renderItem={({ index: itemIndex }) => (
                      <MotiView
                        from={{ opacity: 0, translateY: 10 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: "timing", duration: 380, delay: itemIndex * 120 }}
                        className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/80"
                        style={{ width: placeholderWidth, height: 140, borderCurve: "continuous" }}
                      >
                        <View className="h-full w-full bg-white/5" />
                        <View className="absolute inset-x-3 bottom-3 rounded-xl border border-white/10 bg-black/40 px-3 py-2">
                          <Text className="text-xs font-semibold text-white">Inspiration</Text>
                          <Text className="mt-1 text-[10px] text-zinc-400">High-end concept</Text>
                        </View>
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






