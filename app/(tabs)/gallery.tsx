import { useAuth } from "@clerk/expo";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { MotiView } from "moti";
import { memo, useCallback, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Diamond, X } from "lucide-react-native";

import { LuxPressable } from "../../components/lux-pressable";
import { useViewerCredits } from "../../components/viewer-credits-context";
import { useWorkspaceDraft } from "../../components/workspace-context";
import {
  DISCOVER_SECTIONS,
  type DiscoverSectionId,
  type DiscoverTile,
} from "../../lib/data";
import { HAIRLINE } from "../../lib/design-system";
import { ENABLE_GUEST_WIZARD_TEST_MODE } from "../../lib/guest-testing";
import { triggerHaptic } from "../../lib/haptics";
import { withWorkspaceFlowId } from "../../lib/try-it-flow";
import { fonts } from "../../styles/typography";

const SCREEN_BG = "#FFFFFF";
const PRIMARY_TEXT = "#0A0A0A";
const SECONDARY_TEXT = "#5F5F67";
const TAB_INACTIVE = "#8D8D96";
const SCREEN_SIDE_MARGIN = 24;
const SECTION_GAP = 28;
const CATEGORY_BAR_PADDING = 6;
const CATEGORY_BAR_GAP = 6;
const CAROUSEL_CARD_GAP = 14;

type DiscoverTabConfig = {
  id: "interior" | "exterior" | "garden" | "wall" | "floor";
  label: string;
  sectionIds: DiscoverSectionId[];
};

type DiscoverTabId = DiscoverTabConfig["id"];

type DiscoverItemGroup = {
  id: string;
  title: string;
  items: DiscoverTile[];
  sortIndex: number;
};

const CATEGORY_TABS: DiscoverTabConfig[] = [
  { id: "interior", label: "Home (Interior)", sectionIds: ["home"] },
  { id: "garden", label: "Garden", sectionIds: ["garden"] },
  { id: "exterior", label: "Exterior Design", sectionIds: ["exterior"] },
  { id: "wall", label: "Wall", sectionIds: ["wall"] },
  { id: "floor", label: "Floor", sectionIds: ["floor"] },
] as const;

const INTERIOR_GROUP_ORDER = [
  "Kitchen",
  "Living Room",
  "Gaming Room",
  "Bedroom",
  "Bathroom",
  "Dining Room",
  "Home Office",
  "Home Theater",
  "Library",
  "Hall",
  "Laundry",
  "Nursery",
  "Study",
] as const;

function getCardTitle(item: DiscoverTile) {
  const title = item.title.trim();
  if (title.length > 0) return title;
  return item.spaceType.trim().length > 0 ? item.spaceType : "Curated Space";
}

function getCardStyle(item: DiscoverTile) {
  const style = item.style.trim();
  if (style.length > 0) return style;
  return "Featured";
}

function buildItemGroups(
  tabId: DiscoverTabId,
  sectionId: DiscoverSectionId,
  items: DiscoverTile[],
): DiscoverItemGroup[] {
  const groups = new Map<string, DiscoverItemGroup>();
  const preferredOrder = new Map(
    (tabId === "interior" ? INTERIOR_GROUP_ORDER : []).map((title, index) => [title.toLowerCase(), index]),
  );

  items.forEach((item, index) => {
    const title = item.spaceType.trim().length > 0 ? item.spaceType.trim() : "Featured";
    const key = title.toLowerCase();
    const existing = groups.get(key);

    if (existing) {
      existing.items.push(item);
      return;
    }

    groups.set(key, {
      id: `${sectionId}-${key.replace(/\s+/g, "-")}`,
      title,
      items: [item],
      sortIndex: index,
    });
  });

  return Array.from(groups.values()).sort((left, right) => {
    const leftPreferred = preferredOrder.get(left.title.toLowerCase());
    const rightPreferred = preferredOrder.get(right.title.toLowerCase());

    if (typeof leftPreferred === "number" || typeof rightPreferred === "number") {
      return (leftPreferred ?? Number.MAX_SAFE_INTEGER) - (rightPreferred ?? Number.MAX_SAFE_INTEGER);
    }

    return left.sortIndex - right.sortIndex;
  });
}

const DiscoverCategoryTabs = memo(function DiscoverCategoryTabs({
  activeTab,
  onSelectTab,
}: {
  activeTab: DiscoverTabId;
  onSelectTab: (tabId: DiscoverTabId) => void;
}) {
  const [tabLayouts, setTabLayouts] = useState<Partial<Record<DiscoverTabId, { x: number; width: number }>>>({});
  const activeLayout = tabLayouts[activeTab];

  return (
    <View style={styles.tabsRailShell}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRailContent}
        style={styles.tabsRail}
      >
        <View style={styles.tabsTrack}>
          {activeLayout ? (
            <MotiView
              animate={{ translateX: activeLayout.x, width: activeLayout.width }}
              transition={{ type: "timing", duration: 220 }}
              style={styles.tabActivePill}
            />
          ) : null}

          {CATEGORY_TABS.map((tab, index) => {
            const active = tab.id === activeTab;
            return (
              <LuxPressable
                key={tab.id}
                onPress={() => {
                  triggerHaptic();
                  onSelectTab(tab.id);
                }}
                className="cursor-pointer"
                pressableClassName="cursor-pointer"
                style={[
                  styles.tabButton,
                  index < CATEGORY_TABS.length - 1 ? styles.tabButtonGap : null,
                ]}
                glowColor="rgba(255,255,255,0.35)"
                scale={0.99}
              >
                <View
                  onLayout={(event) => {
                    const { x, width } = event.nativeEvent.layout;
                    setTabLayouts((current) => {
                      const previous = current[tab.id];
                      if (previous?.x === x && previous?.width === width) {
                        return current;
                      }

                      return {
                        ...current,
                        [tab.id]: { x, width },
                      };
                    });
                  }}
                  style={styles.tabButtonInner}
                >
                  <Text
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    style={[styles.tabLabel, active ? styles.tabLabelActive : null]}
                  >
                    {tab.label}
                  </Text>
                </View>
              </LuxPressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
});

const DiscoverCarouselCard = memo(function DiscoverCarouselCard({
  item,
  width,
  onPreview,
}: {
  item: DiscoverTile;
  width: number;
  onPreview: (item: DiscoverTile) => void;
}) {
  const title = getCardTitle(item);
  const styleName = getCardStyle(item);
  const imageHeight = Math.round(width * 1.22);

  return (
    <LuxPressable
      onPress={() => {
        triggerHaptic();
        onPreview(item);
      }}
      className="cursor-pointer"
      pressableClassName="cursor-pointer"
      style={[
        styles.carouselCard,
        {
          width,
          height: imageHeight,
        },
      ]}
      glowColor="rgba(15,23,42,0.08)"
      scale={0.985}
    >
      <Image
        source={item.image}
        style={styles.carouselImage}
        contentFit="cover"
        transition={120}
        cachePolicy="memory-disk"
      />

      <View style={styles.carouselOverlay}>
        <Text style={styles.carouselStyle}>{styleName}</Text>
        <Text numberOfLines={2} style={styles.carouselTitle}>
          {title}
        </Text>
      </View>
    </LuxPressable>
  );
});

const DiscoverCarouselGroup = memo(function DiscoverCarouselGroup({
  group,
  cardWidth,
  onPreview,
}: {
  group: DiscoverItemGroup;
  cardWidth: number;
  onPreview: (item: DiscoverTile) => void;
}) {
  return (
    <View style={styles.groupSection}>
      <Text style={styles.groupTitle}>{group.title}</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.groupScrollerContent}
      >
        {group.items.map((item, index) => (
          <View
            key={item.id}
            style={index < group.items.length - 1 ? styles.carouselCardGap : null}
          >
            <DiscoverCarouselCard item={item} width={cardWidth} onPreview={onPreview} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
});

function DiscoverPreviewModal({
  item,
  visible,
  topInset,
  bottomInset,
  onClose,
  onTryIt,
}: {
  item: DiscoverTile | null;
  visible: boolean;
  topInset: number;
  bottomInset: number;
  onClose: () => void;
  onTryIt: (item: DiscoverTile) => void;
}) {
  if (!item) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.previewOverlay}>
        <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />

        <View style={[styles.previewTopBar, { top: Math.max(topInset + 10, 22) }]}>
          <Pressable accessibilityRole="button" hitSlop={10} onPress={onClose} style={styles.previewCloseButton}>
            <X color="#FFFFFF" size={22} strokeWidth={2.3} />
          </Pressable>
        </View>

        <View style={styles.previewImageFrame}>
          <Image
            source={item.image}
            style={styles.previewImage}
            contentFit="contain"
            transition={120}
            cachePolicy="memory-disk"
          />
        </View>

        <View
          style={[
            styles.previewBottomBar,
            { paddingBottom: Math.max(bottomInset + 18, 28) },
          ]}
        >
          <View style={styles.previewCopy}>
            <Text style={styles.previewTitle}>{getCardTitle(item)}</Text>
            <Text style={styles.previewMeta}>{`${item.spaceType} / ${getCardStyle(item)}`}</Text>
          </View>

          <LuxPressable
            onPress={() => onTryIt(item)}
            className="cursor-pointer"
            pressableClassName="cursor-pointer"
            style={styles.previewActionButton}
            glowColor="rgba(255,255,255,0.24)"
            scale={0.97}
          >
            <Text style={styles.previewActionText}>Try It!</Text>
          </LuxPressable>
        </View>
      </View>
    </Modal>
  );
}

export default function GalleryScreen() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { clearDraft } = useWorkspaceDraft();
  const { credits: creditBalance, hasPaidAccess } = useViewerCredits();
  const [activeTab, setActiveTab] = useState<DiscoverTabId>("interior");
  const [previewItem, setPreviewItem] = useState<DiscoverTile | null>(null);
  const canCreateAsGuest = isSignedIn || ENABLE_GUEST_WIZARD_TEST_MODE;

  const carouselCardWidth = useMemo(
    () => Math.min(Math.max(width * 0.68, 220), 278),
    [width],
  );

  const sectionsForActiveTab = useMemo(() => {
    const activeSectionIds = CATEGORY_TABS.find((tab) => tab.id === activeTab)?.sectionIds ?? ["home"];
    return DISCOVER_SECTIONS.filter((section) => activeSectionIds.includes(section.id));
  }, [activeTab]);

  const itemGroups = useMemo(
    () => sectionsForActiveTab.flatMap((section) => buildItemGroups(activeTab, section.id, section.items)),
    [activeTab, sectionsForActiveTab],
  );

  const openDesignFlowPaywall = useCallback((redirectTo: string) => {
    router.push({
      pathname: "/paywall",
      params: {
        source: "design-flow",
        redirectTo,
      },
    } as any);
  }, [router]);

  const routeToToolFlow = useCallback(
    (redirectTo: string) => {
      if (hasPaidAccess || creditBalance > 0) {
        router.push(redirectTo as any);
        return;
      }

      openDesignFlowPaywall(redirectTo);
    },
    [creditBalance, hasPaidAccess, openDesignFlowPaywall, router],
  );

  const handleTryIt = useCallback(async (item: DiscoverTile) => {
    const serviceParam =
      item.service === "garden"
        ? "garden"
        : item.service === "exterior"
          ? "facade"
          : item.service === "paint"
            ? "paint"
            : item.service === "floor"
              ? "floor"
              : "interior";

    const params = new URLSearchParams({ service: serviceParam });

    if (item.startStep) {
      params.set("startStep", item.startStep);
    }
    if (item.presetStyle) {
      params.set("presetStyle", item.presetStyle);
    }
    if (item.presetRoom) {
      params.set("presetRoom", item.presetRoom);
    }

    clearDraft();
    return withWorkspaceFlowId(`/workspace?${params.toString()}`);
  }, [clearDraft]);

  const handleCardPress = useCallback(
    async (item: DiscoverTile) => {
      try {
        const redirectTo = await handleTryIt(item);

        if (!canCreateAsGuest) {
          router.push({ pathname: "/sign-in", params: { returnTo: redirectTo } });
          return;
        }

        routeToToolFlow(redirectTo);
      } catch (error) {
        Alert.alert("Try It unavailable", error instanceof Error ? error.message : "Please try again.");
      }
    },
    [canCreateAsGuest, handleTryIt, routeToToolFlow, router],
  );

  const handlePreviewOpen = useCallback((item: DiscoverTile) => {
    setPreviewItem(item);
  }, []);

  const handlePreviewClose = useCallback(() => {
    setPreviewItem(null);
  }, []);

  const handlePreviewTryIt = useCallback((item: DiscoverTile) => {
    setPreviewItem(null);
    void handleCardPress(item);
  }, [handleCardPress]);

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: Math.max(insets.bottom + 28, 36),
        }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
      >
        <View style={styles.hero}>
          <View style={styles.headerRow}>
            <View style={[styles.headerSide, styles.headerSideStart]}>
              <View style={styles.creditBadge}>
                <Diamond color="#FFFFFF" size={13} strokeWidth={2.1} />
                <Text style={styles.creditText}>{creditBalance}</Text>
              </View>
            </View>

            <View style={styles.headerCenter}>
              <Text style={styles.heroTitle}>Discover</Text>
            </View>

            <View style={[styles.headerSide, styles.headerSideEnd]} />
          </View>
        </View>

        <DiscoverCategoryTabs activeTab={activeTab} onSelectTab={setActiveTab} />

        <View style={styles.sectionsWrap}>
          {itemGroups.map((group) => (
            <DiscoverCarouselGroup
              key={group.id}
              group={group}
              cardWidth={carouselCardWidth}
              onPreview={handlePreviewOpen}
            />
          ))}
        </View>
      </ScrollView>

      <DiscoverPreviewModal
        item={previewItem}
        visible={Boolean(previewItem)}
        topInset={insets.top}
        bottomInset={insets.bottom}
        onClose={handlePreviewClose}
        onTryIt={handlePreviewTryIt}
      />
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
  hero: {
    paddingHorizontal: SCREEN_SIDE_MARGIN,
  },
  headerRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
  },
  headerSide: {
    width: 92,
    minHeight: 44,
    justifyContent: "center",
  },
  headerSideStart: {
    alignItems: "flex-start",
  },
  headerSideEnd: {
    alignItems: "flex-end",
  },
  headerCenter: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  creditBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    backgroundColor: "#0A0A0A",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: HAIRLINE,
    borderColor: "rgba(10,10,10,0.08)",
    shadowColor: "#0A0A0A",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  creditText: {
    color: "#FFFFFF",
    fontSize: 13,
    lineHeight: 13,
    ...fonts.bold,
  },
  heroTitle: {
    color: PRIMARY_TEXT,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.5,
    ...fonts.bold,
  },
  tabsRailShell: {
    marginTop: 24,
    marginHorizontal: SCREEN_SIDE_MARGIN,
  },
  tabsRail: {
    borderRadius: 999,
    borderWidth: HAIRLINE,
    borderColor: "#EBEBF0",
    backgroundColor: "#F3F3F6",
    minHeight: 60,
    shadowColor: "#0A0A0A",
    shadowOpacity: 0.04,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  tabsRailContent: {
    padding: CATEGORY_BAR_PADDING,
  },
  tabsTrack: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 60,
    position: "relative",
  },
  tabActivePill: {
    position: "absolute",
    top: CATEGORY_BAR_PADDING,
    bottom: CATEGORY_BAR_PADDING,
    left: 0,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: HAIRLINE,
    borderColor: "#ECECF1",
    shadowColor: "#0A0A0A",
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  tabButton: {
    minHeight: 48,
    borderRadius: 999,
  },
  tabButtonInner: {
    minHeight: 48,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  tabButtonGap: {
    marginRight: CATEGORY_BAR_GAP,
  },
  tabLabel: {
    color: TAB_INACTIVE,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.15,
    ...fonts.semibold,
  },
  tabLabelActive: {
    color: PRIMARY_TEXT,
    ...fonts.bold,
  },
  sectionsWrap: {
    marginTop: 30,
    gap: SECTION_GAP,
  },
  groupSection: {
    gap: 14,
  },
  groupTitle: {
    color: PRIMARY_TEXT,
    fontSize: 23,
    lineHeight: 28,
    paddingHorizontal: SCREEN_SIDE_MARGIN,
    ...fonts.bold,
  },
  groupScrollerContent: {
    paddingLeft: SCREEN_SIDE_MARGIN,
    paddingRight: SCREEN_SIDE_MARGIN,
  },
  carouselCardGap: {
    marginRight: CAROUSEL_CARD_GAP,
  },
  carouselCard: {
    overflow: "hidden",
    borderRadius: 26,
    backgroundColor: "#F2F2F4",
    borderWidth: HAIRLINE,
    borderColor: "#ECECF1",
    shadowColor: "rgba(15,23,42,0.08)",
    shadowOpacity: 1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
  carouselImage: {
    width: "100%",
    height: "100%",
  },
  carouselOverlay: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 18,
    backgroundColor: "rgba(10,10,10,0.55)",
    gap: 4,
  },
  carouselStyle: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 11,
    lineHeight: 14,
    textTransform: "uppercase",
    letterSpacing: 1,
    ...fonts.semibold,
  },
  carouselTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    lineHeight: 21,
    ...fonts.bold,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(10,10,10,0.96)",
  },
  previewTopBar: {
    position: "absolute",
    left: 24,
    right: 24,
    zIndex: 2,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  previewCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  previewImageFrame: {
    flex: 1,
    justifyContent: "center",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewBottomBar: {
    paddingHorizontal: 24,
    paddingTop: 18,
    gap: 18,
    backgroundColor: "rgba(10,10,10,0.76)",
  },
  previewCopy: {
    gap: 6,
  },
  previewTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    lineHeight: 27,
    ...fonts.bold,
  },
  previewMeta: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    lineHeight: 19,
    ...fonts.regular,
  },
  previewActionButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: "#FFFFFF",
  },
  previewActionText: {
    color: PRIMARY_TEXT,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.3,
    textTransform: "uppercase",
    ...fonts.bold,
  },
});
