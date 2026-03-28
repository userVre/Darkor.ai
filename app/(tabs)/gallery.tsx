import { useAuth } from "@clerk/expo";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { memo, useCallback, useMemo, useState } from "react";
import { FlatList, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LuxPressable } from "../../components/lux-pressable";
import { useWorkspaceDraft } from "../../components/workspace-context";
import { DISCOVER_SECTIONS, type DiscoverSection, type DiscoverTile } from "../../lib/data";
import { DS, HAIRLINE, SCREEN_SECTION_GAP, SCREEN_SIDE_PADDING, glowShadow } from "../../lib/design-system";
import { ENABLE_GUEST_WIZARD_TEST_MODE } from "../../lib/guest-testing";
import { triggerHaptic } from "../../lib/haptics";

const SCREEN_BG = DS.colors.background;
const EDGE_PADDING = SCREEN_SIDE_PADDING;
const SECTION_GAP = SCREEN_SECTION_GAP + DS.spacing[1];
const SHELF_GAP = DS.spacing[2];
const CARD_BORDER_COLOR = DS.colors.borderSubtle;
const CARD_RADIUS = DS.radius.xl;

function mapService(service: DiscoverTile["service"]) {
  if (service === "garden") return "garden";
  if (service === "exterior") return "facade";
  if (service === "paint") return "paint";
  if (service === "floor") return "floor";
  return "interior";
}

function getCardTitle(item: DiscoverTile) {
  const title = item.title.trim();
  if (title.length > 0) return title;

  const fallbackTitle = item.spaceType.trim();
  if (fallbackTitle.length > 0) return fallbackTitle;

  return "Curated Space";
}

function getCardStyle(item: DiscoverTile) {
  const style = item.style.trim();
  if (style.length > 0) return style;

  const derivedStyle = item.subtitle
    .split("/")
    .map((value) => value.trim())
    .filter(Boolean)
    .at(-1);

  return derivedStyle ?? "Featured";
}

function getCardCategory(item: DiscoverTile) {
  const category = item.spaceType.trim();
  if (category.length > 0) {
    return category;
  }

  const derived = item.subtitle
    .split("/")
    .map((value) => value.trim())
    .filter(Boolean)
    .at(0);

  return derived ?? "Space";
}

const DiscoverShelfCard = memo(function DiscoverShelfCard({
  item,
  width,
  height,
  onPress,
}: {
  item: DiscoverTile;
  width: number;
  height: number;
  onPress: (item: DiscoverTile) => void;
}) {
  const title = getCardTitle(item);
  const styleName = getCardStyle(item);
  const categoryName = getCardCategory(item);

  const handlePress = useCallback(() => {
    triggerHaptic();
    onPress(item);
  }, [item, onPress]);

  return (
    <LuxPressable
      onPress={handlePress}
      pressableClassName="cursor-pointer"
      className="cursor-pointer overflow-hidden rounded-[24px]"
      style={[styles.card, { width, height }]}
      glowColor={DS.colors.accentGlow}
      scale={0.96}
    >
      <Image
        source={item.image}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        transition={120}
        cachePolicy="memory-disk"
      />
      <LinearGradient
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.18)", "rgba(0,0,0,0.82)", "rgba(0,0,0,0.98)"]}
        locations={[0, 0.16, 0.68, 1]}
        style={styles.cardGradient}
        pointerEvents="none"
      />

      <View style={styles.cardCopy}>
        <View style={styles.cardMetaRow}>
          <View style={styles.cardCategoryPill}>
            <Text style={styles.cardCategoryText}>{categoryName}</Text>
          </View>
        </View>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.cardStyle}>
          {styleName}
        </Text>
      </View>
    </LuxPressable>
  );
});

const DiscoverShelfSection = memo(function DiscoverShelfSection({
  section,
  cardWidth,
  cardHeight,
  expanded,
  onToggleExpanded,
  onCardPress,
}: {
  section: DiscoverSection;
  cardWidth: number;
  cardHeight: number;
  expanded: boolean;
  onToggleExpanded: () => void;
  onCardPress: (item: DiscoverTile) => void;
}) {
  const snapToInterval = cardWidth + SHELF_GAP;

  const keyExtractor = useCallback((item: DiscoverTile) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: DiscoverTile }) => (
      <DiscoverShelfCard item={item} width={cardWidth} height={cardHeight} onPress={onCardPress} />
    ),
    [cardHeight, cardWidth, onCardPress],
  );

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <View style={styles.sectionTitleCluster}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCountPill}>
              <Text style={styles.sectionCountText}>{section.items.length}</Text>
            </View>
          </View>
          <LuxPressable
            onPress={onToggleExpanded}
            pressableClassName="cursor-pointer"
            className="cursor-pointer"
            style={styles.sectionActionButton}
            glowColor="rgba(217,70,239,0.16)"
            scale={0.97}
          >
            <Text style={styles.sectionActionText}>{expanded ? "Show Less" : "See All"}</Text>
          </LuxPressable>
        </View>
        <Text style={styles.sectionDescription}>{section.description}</Text>
      </View>

      {expanded ? (
        <View style={styles.expandedGrid}>
          {section.items.map((item) => (
            <DiscoverShelfCard
              key={item.id}
              item={item}
              width={cardWidth}
              height={cardHeight}
              onPress={onCardPress}
            />
          ))}
        </View>
      ) : (
        <FlatList
          data={section.items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={snapToInterval}
          snapToAlignment="start"
          decelerationRate="fast"
          contentContainerStyle={styles.shelfContent}
          ItemSeparatorComponent={ShelfSpacer}
          initialNumToRender={3}
          maxToRenderPerBatch={4}
          updateCellsBatchingPeriod={40}
          windowSize={4}
          removeClippedSubviews
        />
      )}
    </View>
  );
});

function ShelfSpacer() {
  return <View style={{ width: SHELF_GAP }} />;
}

export default function GalleryScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { setDraftRoom, setDraftStyle } = useWorkspaceDraft();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const canCreateAsGuest = isSignedIn || ENABLE_GUEST_WIZARD_TEST_MODE;
  const totalOptions = useMemo(
    () => DISCOVER_SECTIONS.reduce((count, section) => count + section.items.length, 0),
    [],
  );

  const cardWidth = useMemo(() => {
    if (width >= 1200) return 320;
    return Math.min(280, Math.max(width - 44, 248));
  }, [width]);

  const cardHeight = useMemo(() => Math.round(cardWidth * 1.22), [cardWidth]);

  const handleToggleSection = useCallback((sectionId: string) => {
    setExpandedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  }, []);

  const handleCardPress = useCallback(
    (item: DiscoverTile) => {
      const params = {
        service: mapService(item.service),
        presetRoom: item.presetRoom ?? item.spaceType,
        presetStyle: item.presetStyle ?? item.style,
        startStep: item.startStep,
        entrySource: "discover",
      } as const;

      if (!canCreateAsGuest) {
        const search = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
          if (typeof value === "string" && value.length > 0) {
            search.set(key, value);
          }
        }
        router.push({ pathname: "/sign-in", params: { returnTo: `/wizard?${search.toString()}` } });
        return;
      }

      setDraftRoom(item.spaceType);
      setDraftStyle(item.style);
      router.push({
        pathname: "/wizard",
        params,
      });
    },
    [canCreateAsGuest, router, setDraftRoom, setDraftStyle],
  );

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + DS.spacing[3],
          paddingBottom: Math.max(insets.bottom + DS.spacing[4], DS.spacing[5]),
          gap: SECTION_GAP,
        }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Discover Hub</Text>
          <Text style={styles.headerText}>
            Browse {totalOptions} real-world references across interiors, wall inspiration, floor styles, gardens, and exterior forms.
          </Text>
          <Text style={styles.headerInstruction}>
            Tap any image to instantly redesign your own space in that exact style.
          </Text>
        </View>

        {DISCOVER_SECTIONS.map((section) => (
          <DiscoverShelfSection
            key={section.id}
            section={section}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            expanded={Boolean(expandedSections[section.id])}
            onToggleExpanded={() => handleToggleSection(section.id)}
            onCardPress={handleCardPress}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  scroll: {
    flex: 1,
    backgroundColor: SCREEN_BG,
  },
  header: {
    paddingHorizontal: EDGE_PADDING,
    gap: 10,
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 38,
    letterSpacing: -0.8,
  },
  headerText: {
    color: DS.colors.textSecondary,
    ...DS.typography.body,
    maxWidth: 720,
  },
  headerInstruction: {
    color: "#a1a1aa",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    maxWidth: 720,
  },
  section: {
    gap: 16,
  },
  sectionHeader: {
    gap: 7,
    paddingHorizontal: EDGE_PADDING,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitleCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    color: DS.colors.textPrimary,
    ...DS.typography.sectionTitle,
  },
  sectionCountPill: {
    minWidth: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: HAIRLINE,
    borderColor: DS.colors.borderSubtle,
  },
  sectionCountText: {
    color: DS.colors.textSecondary,
    fontSize: 12,
    fontWeight: "800",
  },
  sectionDescription: {
    color: DS.colors.textSecondary,
    ...DS.typography.bodySm,
    maxWidth: 760,
  },
  sectionActionButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: HAIRLINE,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  sectionActionText: {
    color: "#f5d0fe",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.45,
    textTransform: "uppercase",
  },
  shelfContent: {
    paddingLeft: EDGE_PADDING,
    paddingRight: EDGE_PADDING,
  },
  expandedGrid: {
    paddingHorizontal: EDGE_PADDING,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SHELF_GAP,
  },
  card: {
    overflow: "hidden",
    borderRadius: CARD_RADIUS,
    borderWidth: HAIRLINE,
    borderColor: CARD_BORDER_COLOR,
    backgroundColor: DS.colors.surfaceRaised,
    ...glowShadow("rgba(0,0,0,0.30)", 22),
  },
  cardGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 164,
  },
  cardCopy: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: DS.spacing[3],
    paddingBottom: DS.spacing[3],
    gap: 8,
  },
  cardMetaRow: {
    flexDirection: "row",
  },
  cardCategoryPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: HAIRLINE,
    borderColor: "rgba(255,255,255,0.14)",
  },
  cardCategoryText: {
    color: "#fafafa",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  cardTitle: {
    color: DS.colors.textPrimary,
    ...DS.typography.cardTitle,
  },
  cardStyle: {
    color: "#d4d4d8",
    ...DS.typography.bodySm,
    fontWeight: "600",
    lineHeight: 19,
  },
});
