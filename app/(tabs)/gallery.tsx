import { useAuth } from "@clerk/expo";
import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { MotiView } from "moti";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
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
const CARD_GAP = 14;
const SECTION_GAP = 32;
const HORIZONTAL_PADDING = 20;
const BORDER_COLOR = "rgba(255,255,255,0.08)";
const BRAND_COLOR = "#f59e0b";

function mapService(service: DiscoverTile["service"]) {
  if (service === "garden") return "garden";
  if (service === "exterior") return "facade";
  return "interior";
}

function getCardTitle(item: DiscoverTile) {
  const title = item.title.trim();
  if (title.length > 0) return title;

  const fallbackTitle = item.spaceType.trim();
  if (fallbackTitle.length > 0) return fallbackTitle;

  return "Curated Space";
}

function getCardSubStyle(item: DiscoverTile) {
  const style = item.style.trim();
  if (style.length > 0) return style;

  const derivedStyle = item.subtitle
    .split("/")
    .map((value) => value.trim())
    .filter(Boolean)
    .at(-1);

  return derivedStyle ?? "Featured";
}

const DiscoverCard = memo(function DiscoverCard({
  item,
  width,
  onPress,
}: {
  item: DiscoverTile;
  width: number;
  onPress: (item: DiscoverTile) => void;
}) {
  const title = getCardTitle(item);
  const subStyle = getCardSubStyle(item);

  return (
    <LuxPressable
      onPress={() => {
        triggerHaptic();
        onPress(item);
      }}
      pressableClassName="cursor-pointer"
      style={[styles.card, { width }]}
      glowColor="rgba(245, 158, 11, 0.18)"
      scale={0.985}
    >
      <Image
        source={item.image}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        transition={140}
        cachePolicy="memory-disk"
      />
      <LinearGradient
        colors={["rgba(0,0,0,0.03)", "rgba(0,0,0,0.24)", "rgba(0,0,0,0.98)"]}
        locations={[0.1, 0.56, 1]}
        style={[StyleSheet.absoluteFillObject, styles.cardGradient]}
      >
        <Text style={styles.cardTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.cardSubtitle} numberOfLines={1}>
          {subStyle}
        </Text>
      </LinearGradient>
    </LuxPressable>
  );
});

const DiscoverSectionGrid = memo(function DiscoverSectionGrid({
  section,
  cardWidth,
  columnCount,
  expanded,
  onToggle,
  onCardPress,
}: {
  section: DiscoverSection;
  cardWidth: number;
  columnCount: number;
  expanded: boolean;
  onToggle: (sectionId: DiscoverSection["id"]) => void;
  onCardPress: (item: DiscoverTile) => void;
}) {
  const collapsedCount = Math.max(columnCount * 2, 4);
  const visibleItems = expanded ? section.items : section.items.slice(0, collapsedCount);
  const canExpand = section.items.length > collapsedCount;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionCopy}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionMeta}>{section.items.length} curated spaces</Text>
        </View>

        {canExpand ? (
          <LuxPressable
            onPress={() => onToggle(section.id)}
            pressableClassName="cursor-pointer"
            style={styles.toggleButton}
            scale={0.98}
          >
            <Text style={styles.toggleButtonText}>{expanded ? "Show Less" : "See All"}</Text>
          </LuxPressable>
        ) : null}
      </View>

      <View style={styles.grid}>
        {visibleItems.map((item) => (
          <DiscoverCard key={item.id} item={item} width={cardWidth} onPress={onCardPress} />
        ))}
      </View>
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
  const availableWidth = useMemo(() => Math.max(width - HORIZONTAL_PADDING * 2, 0), [width]);
  const columnCount = useMemo(() => {
    if (availableWidth >= 1120) return 4;
    if (availableWidth >= 760) return 3;
    if (availableWidth >= 360) return 2;
    return 1;
  }, [availableWidth]);
  const cardWidth = useMemo(() => {
    const totalGap = CARD_GAP * (columnCount - 1);
    return Math.floor(Math.max(availableWidth - totalGap, 0) / columnCount);
  }, [availableWidth, columnCount]);

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
    router.push("/settings");
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
          gap: SECTION_GAP,
        }}
        contentInsetAdjustmentBehavior="never"
      >
        <MotiView {...staggerFadeUp(0)} style={styles.headerBlock}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>Discover</Text>
              <Text style={styles.headerSubtitle}>Curated transformations by room type and design style.</Text>
            </View>

            <View style={styles.headerActions}>
              <View style={styles.creditBadge}>
                <View style={styles.creditIcon}>
                  <Diamond color={BRAND_COLOR} size={15} />
                </View>
                <View style={styles.creditCopy}>
                  <Text style={styles.creditLabel}>Diamond Credit</Text>
                  <Text style={styles.creditValue}>{credits}</Text>
                </View>
              </View>

              <LuxPressable
                onPress={handleOpenSettings}
                pressableClassName="cursor-pointer"
                style={styles.settingsButton}
                scale={0.98}
              >
                <Settings2 color="#ffffff" size={19} strokeWidth={2.1} />
              </LuxPressable>
            </View>
          </View>
        </MotiView>

        {DISCOVER_SECTIONS.map((section, index) => (
          <MotiView key={section.id} {...staggerFadeUp(index + 1)}>
            <DiscoverSectionGrid
              section={section}
              cardWidth={cardWidth}
              columnCount={columnCount}
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

const styles = StyleSheet.create({
  card: {
    aspectRatio: 0.82,
    overflow: "hidden",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: "#111113",
  },
  cardGradient: {
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 88,
    paddingBottom: 16,
  },
  cardTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
  },
  cardSubtitle: {
    marginTop: 4,
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 16,
  },
  creditBadge: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingLeft: 10,
    paddingRight: 14,
    paddingVertical: 8,
  },
  creditCopy: {
    gap: 1,
  },
  creditIcon: {
    height: 28,
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "rgba(245, 158, 11, 0.14)",
  },
  creditLabel: {
    color: "#a1a1aa",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  creditValue: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginLeft: "auto",
  },
  headerBlock: {
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
    paddingRight: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  headerSubtitle: {
    color: "#a1a1aa",
    fontSize: 14,
    lineHeight: 20,
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 36,
  },
  section: {
    gap: 16,
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  sectionCopy: {
    flex: 1,
    gap: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionMeta: {
    color: "#71717a",
    fontSize: 13,
    fontWeight: "600",
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "700",
    lineHeight: 30,
  },
  settingsButton: {
    height: 48,
    width: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  toggleButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  toggleButtonText: {
    color: "#e4e4e7",
    fontSize: 13,
    fontWeight: "700",
  },
});
