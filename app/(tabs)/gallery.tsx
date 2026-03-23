import { useAuth } from "@clerk/expo";
import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { MotiView } from "moti";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Diamond, Settings2 } from "lucide-react-native";

import { LuxPressable } from "../../components/lux-pressable";
import { useWorkspaceDraft } from "../../components/workspace-context";
import { DISCOVER_SECTIONS, type DiscoverSection, type DiscoverTile } from "../../lib/discover-data";
import { triggerHaptic } from "../../lib/haptics";
import { staggerFadeUp } from "../../lib/motion";

type MeResponse = {
  credits?: number;
};

const SCREEN_BG = "#09090b";
const CARD_GAP = 16;
const BORDER_COLOR = "rgba(255,255,255,0.06)";
const BRAND_COLOR = "#f59e0b";

function mapService(service: DiscoverTile["service"]) {
  if (service === "garden") return "garden";
  if (service === "exterior") return "facade";
  return "interior";
}

const DiscoverCard = memo(function DiscoverCard({
  item,
  width,
  isLast,
  onPress,
}: {
  item: DiscoverTile;
  width: number;
  isLast: boolean;
  onPress: (item: DiscoverTile) => void;
}) {
  return (
    <LuxPressable
      onPress={() => {
        triggerHaptic();
        onPress(item);
      }}
      pressableClassName="cursor-pointer"
      className="overflow-hidden rounded-[24px] border"
      style={{
        width,
        height: width * 1.24,
        marginRight: isLast ? 0 : CARD_GAP,
        borderWidth: 1,
        borderColor: BORDER_COLOR,
        backgroundColor: "#111113",
      }}
      glowColor="rgba(245, 158, 11, 0.18)"
      scale={0.985}
    >
      <Image source={item.image} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={140} />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.08)", "rgba(0,0,0,0.88)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 18,
          paddingTop: 84,
          paddingBottom: 18,
        }}
      >
        <Text className="text-[22px] font-semibold text-white" numberOfLines={2}>
          {item.title}
        </Text>
        <Text className="mt-2 text-sm text-zinc-300" numberOfLines={1}>
          {item.subtitle}
        </Text>
      </LinearGradient>
    </LuxPressable>
  );
});

const DiscoverSectionRow = memo(function DiscoverSectionRow({
  section,
  cardWidth,
  expanded,
  onToggle,
  onCardPress,
}: {
  section: DiscoverSection;
  cardWidth: number;
  expanded: boolean;
  onToggle: (sectionId: DiscoverSection["id"]) => void;
  onCardPress: (item: DiscoverTile) => void;
}) {
  const visibleItems = expanded ? section.items : section.items.slice(0, 4);

  return (
    <View style={{ gap: 18 }}>
      <View className="flex-row items-center justify-between px-5">
        <Text className="text-[28px] font-semibold tracking-[-0.8px] text-white">{section.title}</Text>
        <LuxPressable
          onPress={() => onToggle(section.id)}
          pressableClassName="cursor-pointer"
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2"
          style={{ borderWidth: 1 }}
          scale={0.98}
        >
          <Text className="text-sm font-medium text-zinc-300">{expanded ? "Show Less" : "See All"}</Text>
        </LuxPressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToAlignment="start"
        snapToInterval={cardWidth + CARD_GAP}
        contentContainerStyle={{ paddingLeft: 20, paddingRight: 4 }}
      >
        {visibleItems.map((item, index) => (
          <DiscoverCard
            key={item.id}
            item={item}
            width={cardWidth}
            isLast={index === visibleItems.length - 1}
            onPress={onCardPress}
          />
        ))}
      </ScrollView>
    </View>
  );
});

export default function GalleryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { isSignedIn } = useAuth();
  const me = useQuery("users:me" as any, isSignedIn ? {} : "skip") as MeResponse | null | undefined;
  const ensureUser = useMutation("users:getOrCreateCurrentUser" as any);
  const { setDraftRoom, setDraftStyle } = useWorkspaceDraft();
  const [expandedSections, setExpandedSections] = useState<Record<DiscoverSection["id"], boolean>>({
    home: false,
    garden: false,
    exterior: false,
  });

  useEffect(() => {
    if (!isSignedIn) return;
    ensureUser({}).catch(() => undefined);
  }, [ensureUser, isSignedIn]);

  const credits = typeof me?.credits === "number" ? me.credits : 3;
  const cardWidth = useMemo(() => Math.min(Math.max(width * 0.68, 248), 284), [width]);

  const handleCardPress = useCallback(
    (item: DiscoverTile) => {
      setDraftRoom(item.spaceType);
      setDraftStyle(item.style);
      router.push({
        pathname: "/wizard",
        params: {
          service: mapService(item.service),
          presetRoom: item.spaceType,
          presetStyle: item.style,
        },
      });
    },
    [router, setDraftRoom, setDraftStyle],
  );

  const handleOpenSettings = useCallback(() => {
    triggerHaptic();
    router.push("/profile");
  }, [router]);

  const handleToggleSection = useCallback((sectionId: DiscoverSection["id"]) => {
    triggerHaptic();
    setExpandedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  }, []);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: SCREEN_BG }}>
      <StatusBar style="light" />
      <ScrollView
        style={{ flex: 1, backgroundColor: SCREEN_BG }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom + 34, 44),
          gap: 28,
        }}
        contentInsetAdjustmentBehavior="never"
      >
        <MotiView {...staggerFadeUp(0)} className="px-5">
          <View className="flex-row items-center justify-between">
            <Text className="text-[32px] font-bold tracking-[-1px] text-white">Discover</Text>

            <View className="flex-row items-center gap-3">
              <View
                className="flex-row items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5"
                style={{ borderWidth: 1 }}
              >
                <Diamond color={BRAND_COLOR} size={15} />
                <Text className="text-sm font-semibold text-white">{credits}</Text>
              </View>

              <LuxPressable
                onPress={handleOpenSettings}
                pressableClassName="cursor-pointer"
                className="h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]"
                style={{ borderWidth: 1 }}
                scale={0.98}
              >
                <Settings2 color="#ffffff" size={19} strokeWidth={2.1} />
              </LuxPressable>
            </View>
          </View>
        </MotiView>

        {DISCOVER_SECTIONS.map((section, index) => (
          <MotiView key={section.id} {...staggerFadeUp(index + 1)}>
            <DiscoverSectionRow
              section={section}
              cardWidth={cardWidth}
              expanded={expandedSections[section.id]}
              onToggle={handleToggleSection}
              onCardPress={handleCardPress}
            />
          </MotiView>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
