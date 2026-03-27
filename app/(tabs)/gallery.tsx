import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { memo, useCallback, useMemo } from "react";
import { FlatList, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LuxPressable } from "../../components/lux-pressable";
import { useWorkspaceDraft } from "../../components/workspace-context";
import { DISCOVER_SECTIONS, type DiscoverSection, type DiscoverTile } from "../../lib/data";
import { DS, HAIRLINE, SCREEN_SECTION_GAP, SCREEN_SIDE_PADDING, glowShadow } from "../../lib/design-system";
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
        <Text style={styles.cardTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.cardStyle} numberOfLines={1}>
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
  onCardPress,
}: {
  section: DiscoverSection;
  cardWidth: number;
  cardHeight: number;
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
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.sectionCountPill}>
            <Text style={styles.sectionCountText}>{section.items.length}</Text>
          </View>
        </View>
        <Text style={styles.sectionDescription}>{section.description}</Text>
      </View>

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
    </View>
  );
});

function ShelfSpacer() {
  return <View style={{ width: SHELF_GAP }} />;
}

export default function GalleryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { setDraftRoom, setDraftStyle } = useWorkspaceDraft();
  const totalOptions = useMemo(
    () => DISCOVER_SECTIONS.reduce((count, section) => count + section.items.length, 0),
    [],
  );

  const cardWidth = useMemo(() => {
    if (width >= 1200) return 320;
    return Math.min(280, Math.max(width - 44, 248));
  }, [width]);

  const cardHeight = useMemo(() => Math.round(cardWidth * 1.22), [cardWidth]);

  const handleCardPress = useCallback(
    (item: DiscoverTile) => {
      setDraftRoom(item.spaceType);
      setDraftStyle(item.style);
      router.push({
        pathname: "/wizard",
        params: {
          service: mapService(item.service),
          presetRoom: item.presetRoom ?? item.spaceType,
          presetStyle: item.presetStyle ?? item.style,
          startStep: item.startStep,
          entrySource: "discover",
        },
      });
    },
    [router, setDraftRoom, setDraftStyle],
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
        </View>

        {DISCOVER_SECTIONS.map((section) => (
          <DiscoverShelfSection
            key={section.id}
            section={section}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
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
  shelfContent: {
    paddingLeft: EDGE_PADDING,
    paddingRight: EDGE_PADDING,
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
    gap: 4,
  },
  cardTitle: {
    color: DS.colors.textPrimary,
    ...DS.typography.cardTitle,
  },
  cardStyle: {
    color: DS.colors.textSecondary,
    ...DS.typography.bodySm,
    fontWeight: "600",
  },
});
