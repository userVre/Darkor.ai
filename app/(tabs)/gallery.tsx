import { useAuth } from "@clerk/expo";
import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { useCallback, useEffect } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronRight, Compass, Diamond, Sparkles } from "lucide-react-native";

import { LuxPressable } from "../../components/lux-pressable";
import { useWorkspaceDraft } from "../../components/workspace-context";
import { DISCOVER_SECTIONS, type DiscoverTile } from "../../lib/discover-data";
import { triggerHaptic } from "../../lib/haptics";
import { staggerFadeUp } from "../../lib/motion";
import { formatRewardCountdown } from "../../lib/rewards";

type MeResponse = {
  credits?: number;
  plan?: string;
  lastRewardDate?: number;
};

function DiscoverCard({ item, onPress }: { item: DiscoverTile; onPress: (item: DiscoverTile) => void }) {
  return (
    <LuxPressable
      onPress={() => onPress(item)}
      className="mr-4 overflow-hidden rounded-[28px] border border-white/10 bg-zinc-950"
      style={{ width: 196, borderWidth: 0.5 }}
      glowColor="rgba(244, 63, 94, 0.24)"
    >
      <View style={{ height: 244 }}>
        <Image source={item.image} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={220} />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.2)", "rgba(0,0,0,0.92)"]}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, paddingTop: 52 }}
        >
          <Text className="text-lg font-semibold text-white">{item.title}</Text>
          <Text className="mt-1 text-xs text-zinc-300">{item.caption}</Text>
          <View className="mt-4 flex-row items-center justify-between rounded-full border border-white/10 bg-white/5 px-3 py-2">
            <View>
              <Text className="text-[10px] uppercase tracking-[1.2px] text-zinc-500">Preset</Text>
              <Text className="mt-1 text-sm font-medium text-zinc-100">{item.style}</Text>
            </View>
            <ChevronRight color="#ffffff" size={18} />
          </View>
        </LinearGradient>
      </View>
    </LuxPressable>
  );
}

export default function GalleryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const me = useQuery("users:me" as any, isSignedIn ? {} : "skip") as MeResponse | null | undefined;
  const ensureUser = useMutation("users:getOrCreateCurrentUser" as any);
  const { setDraftRoom, setDraftStyle } = useWorkspaceDraft();

  useEffect(() => {
    if (!isSignedIn) return;
    ensureUser({}).catch(() => undefined);
  }, [ensureUser, isSignedIn]);

  const credits = typeof me?.credits === "number" ? me.credits : 3;
  const rewardCountdown = formatRewardCountdown(me?.lastRewardDate);

  const handleOpenTile = useCallback(
    (item: DiscoverTile) => {
      triggerHaptic();
      setDraftRoom(item.spaceType);
      setDraftStyle(item.style);
      router.push({
        pathname: "/workspace",
        params: {
          service: item.service,
          presetRoom: item.spaceType,
          presetStyle: item.style,
          startStep: "0",
        },
      });
    },
    [router, setDraftRoom, setDraftStyle],
  );

  return (
    <View className="flex-1 bg-black">
      <ScrollView
        className="flex-1 bg-black"
        contentContainerStyle={{ paddingTop: insets.top + 18, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5">
          <MotiView {...staggerFadeUp(0)}>
            <View className="rounded-[30px] border border-white/10 bg-zinc-950 px-5 py-5" style={{ borderWidth: 0.5 }}>
              <View className="flex-row items-center justify-between">
                <View className="rounded-full border border-white/10 bg-white/5 px-3 py-2" style={{ borderWidth: 0.5 }}>
                  <View className="flex-row items-center gap-2">
                    <Diamond color="#ffffff" size={15} />
                    <Text className="text-sm font-semibold text-white">{credits}</Text>
                  </View>
                </View>
                <View className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2" style={{ borderWidth: 0.5 }}>
                  <Text className="text-[11px] font-medium text-emerald-200">{rewardCountdown}</Text>
                </View>
              </View>

              <View className="mt-6">
                <View className="flex-row items-center gap-2">
                  <Compass color="#ffffff" size={18} />
                  <Text className="text-[11px] uppercase tracking-[2px] text-zinc-500">Discover Hub</Text>
                </View>
                <Text className="mt-3 text-3xl font-semibold text-white">Explore spaces worth redesigning.</Text>
                <Text className="mt-3 max-w-[92%] text-sm leading-6 text-zinc-400">
                  Browse curated rooms, gardens, and facades. Any image you tap opens the Create flow with the matching
                  space type and a recommended style already selected.
                </Text>
              </View>
            </View>
          </MotiView>
        </View>

        {DISCOVER_SECTIONS.map((section, sectionIndex) => (
          <MotiView key={section.id} {...staggerFadeUp(sectionIndex + 1)} className="mt-10">
            <View className="px-5">
              <Text className="text-[11px] uppercase tracking-[2px] text-zinc-500">{section.eyebrow}</Text>
              <Text className="mt-2 text-2xl font-semibold text-white">{section.title}</Text>
              <Text className="mt-2 max-w-[92%] text-sm leading-6 text-zinc-400">{section.description}</Text>
            </View>

            <View className="mt-6 gap-8">
              {section.shelves.map((shelf) => (
                <View key={shelf.id}>
                  <View className="mb-4 px-5">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-lg font-semibold text-white">{shelf.title}</Text>
                      <View className="flex-row items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5" style={{ borderWidth: 0.5 }}>
                        <Sparkles color="#f9a8d4" size={12} />
                        <Text className="text-[10px] font-medium uppercase tracking-[1.4px] text-zinc-300">{shelf.items.length} looks</Text>
                      </View>
                    </View>
                    <Text className="mt-2 text-sm leading-6 text-zinc-500">{shelf.description}</Text>
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 20, paddingRight: 4 }}>
                    {shelf.items.map((item) => (
                      <DiscoverCard key={item.id} item={item} onPress={handleOpenTile} />
                    ))}
                  </ScrollView>
                </View>
              ))}
            </View>
          </MotiView>
        ))}
      </ScrollView>
    </View>
  );
}
