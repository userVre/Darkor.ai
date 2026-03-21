import { useAuth } from "@clerk/expo";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery } from "convex/react";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Extrapolate,
  interpolate,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { Diamond, Folder, Heart, Plus, Search, Settings, X } from "lucide-react-native";

import { triggerHaptic } from "../../lib/haptics";
import { LUX_SPRING, staggerFadeUp } from "../../lib/motion";
import { DISCOVER_ITEMS, type DiscoverItem } from "../../lib/discover-data";
import { formatRewardCountdown } from "../../lib/rewards";
import { GlassBackdrop } from "../../components/glass-backdrop";
import { LuxPressable } from "../../components/lux-pressable";
import { useWorkspaceDraft } from "../../components/workspace-context";

type MeResponse = {
  credits?: number;
  plan?: string;
  lastRewardDate?: number;
};

type GenerationItem = {
  _id: string;
  imageUrl: string;
  prompt?: string;
  style?: string;
  createdAt?: number;
  isFavorite?: boolean;
  projectId?: string;
};

type ProjectItem = {
  _id: string;
  name: string;
  createdAt?: number;
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

  const isLeftColumn = index % NUM_COLUMNS === 0;

  return (
    <Animated.View style={[animatedStyle, { width: columnWidth, marginBottom: GAP, marginRight: isLeftColumn ? GAP : 0 }]}>
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

const GenerationCard = memo(function GenerationCard({
  item,
  index,
  columnWidth,
  onToggleFavorite,
  onMoveProject,
  projectLabel,
}: {
  item: GenerationItem;
  index: number;
  columnWidth: number;
  onToggleFavorite: (item: GenerationItem) => void;
  onMoveProject: (item: GenerationItem) => void;
  projectLabel?: string;
}) {
  const height = 220 + (index % 3) * 24;
  const isLeftColumn = index % NUM_COLUMNS === 0;

  return (
    <View style={{ width: columnWidth, marginBottom: GAP, marginRight: isLeftColumn ? GAP : 0 }}>
      <View className="overflow-hidden rounded-3xl border border-white/10 bg-black" style={{ borderWidth: 0.5 }}>
        <View style={{ height }}>
          <Image source={{ uri: item.imageUrl }} className="h-full w-full" contentFit="cover" transition={260} />
          <LuxPressable
            onPress={() => onMoveProject(item)}
            className="cursor-pointer absolute left-3 top-3 h-9 w-9 items-center justify-center rounded-full bg-black/60"
          >
            <Folder color="#e4e4e7" size={16} />
          </LuxPressable>
          <LuxPressable
            onPress={() => onToggleFavorite(item)}
            className="cursor-pointer absolute right-3 top-3 h-9 w-9 items-center justify-center rounded-full bg-black/60"
          >
            <Heart
              color={item.isFavorite ? "#f43f5e" : "#e4e4e7"}
              size={16}
              {...(item.isFavorite ? { fill: "#f43f5e" } : {})}
            />
          </LuxPressable>
          <BlurView
            intensity={70}
            tint="dark"
            className="absolute bottom-3 left-3 right-3 rounded-2xl border border-white/10 bg-black/40 px-3 py-2"
            style={{ borderWidth: 0.5, borderCurve: "continuous" }}
          >
            <Text className="text-[11px] font-semibold text-zinc-200">{item.style ?? "Darkor.ai Render"}</Text>
            <Text className="mt-1 text-[10px] text-zinc-400">
              {projectLabel ?? "Unassigned"} • {item.prompt ?? "AI redesign"}
            </Text>
          </BlurView>
        </View>
      </View>
    </View>
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

  const me = useQuery("users:me" as any, isSignedIn ? {} : "skip") as MeResponse | null | undefined;
  const ensureUser = useMutation("users:getOrCreateCurrentUser" as any);
  const archive = useQuery("generations:getUserArchive" as any, isSignedIn ? {} : "skip") as
    | GenerationItem[]
    | undefined;
  const projects = useQuery("projects:list" as any, isSignedIn ? {} : "skip") as ProjectItem[] | undefined;
  const toggleFavorite = useMutation("generations:toggleFavorite" as any);
  const setProject = useMutation("generations:setProject" as any);
  const createProject = useMutation("projects:create" as any);

  const [selectedItem, setSelectedItem] = useState<DiscoverItem | null>(null);
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [mode, setMode] = useState<"discover" | "gallery">("discover");
  const [searchQuery, setSearchQuery] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [selectedGeneration, setSelectedGeneration] = useState<GenerationItem | null>(null);
  const [projectName, setProjectName] = useState("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const styleSheetRef = useRef<BottomSheetModal>(null);
  const projectSheetRef = useRef<BottomSheetModal>(null);
  const createProjectRef = useRef<BottomSheetModal>(null);
  const searchInputRef = useRef<TextInput>(null);
  const isSmallScreen = height < 740;
  const snapPoints = useMemo(() => [isSmallScreen ? "95%" : "58%"], [isSmallScreen]);
  const projectSnapPoints = useMemo(() => [isSmallScreen ? "70%" : "45%"], [isSmallScreen]);
  const createProjectSnapPoints = useMemo(() => [isSmallScreen ? "60%" : "38%"], [isSmallScreen]);

  useEffect(() => {
    if (!isSignedIn) return;
    ensureUser({}).catch(() => undefined);
  }, [ensureUser, isSignedIn]);

  const credits = typeof me?.credits === "number" ? me.credits : 3;
  const rewardCountdown = formatRewardCountdown(me?.lastRewardDate);
  const columnWidth = useMemo(() => (width - H_PADDING * 2 - GAP) / NUM_COLUMNS, [width]);
  const scrollY = useSharedValue(0);

  const projectsById = useMemo(() => {
    const map = new Map<string, ProjectItem>();
    (projects ?? []).forEach((project) => {
      map.set(project._id, project);
    });
    return map;
  }, [projects]);

  const filteredArchive = useMemo(() => {
    let items = archive ?? [];
    if (favoritesOnly) {
      items = items.filter((item) => item.isFavorite);
    }
    if (activeProjectId) {
      items = items.filter((item) => item.projectId === activeProjectId);
    }
    return items;
  }, [activeProjectId, archive, favoritesOnly]);

  const filteredDiscover = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return DISCOVER_ITEMS;
    return DISCOVER_ITEMS.filter((item) => {
      const haystack = `${item.title} ${item.style} ${item.category}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [searchQuery]);

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
    searchInputRef.current?.focus();
  }, []);

  const handleResetSearch = useCallback(() => {
    triggerHaptic();
    setSearchQuery("");
    searchInputRef.current?.focus();
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
    styleSheetRef.current?.dismiss();
    router.push({
      pathname: "/workspace",
      params: { service, presetStyle: selectedItem.style, startStep: String(startStep) },
    });
  }, [draft.image, draft.room, router, selectedItem, setDraftStyle]);

  const handleToggleFavorite = useCallback(
    async (item: GenerationItem) => {
      triggerHaptic();
      try {
        await toggleFavorite({ id: item._id });
      } catch (error) {
        Alert.alert("Favorite failed", error instanceof Error ? error.message : "Please try again.");
      }
    },
    [toggleFavorite],
  );

  const handleOpenProjectSheet = useCallback((item: GenerationItem) => {
    triggerHaptic();
    setSelectedGeneration(item);
    requestAnimationFrame(() => projectSheetRef.current?.present());
  }, []);

  const handleSelectProject = useCallback(
    async (projectId: string | null) => {
      if (!selectedGeneration) return;
      triggerHaptic();
      try {
        await setProject({ id: selectedGeneration._id, projectId: projectId ?? undefined });
        projectSheetRef.current?.dismiss();
      } catch (error) {
        Alert.alert("Project update failed", error instanceof Error ? error.message : "Please try again.");
      }
    },
    [selectedGeneration, setProject],
  );

  const handleCreateProject = useCallback(async () => {
    const name = projectName.trim();
    if (!name) {
      Alert.alert("Project name required", "Enter a project name to continue.");
      return;
    }
    triggerHaptic();
    try {
      setIsCreatingProject(true);
      await createProject({ name });
      setProjectName("");
      createProjectRef.current?.dismiss();
    } catch (error) {
      Alert.alert("Create failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsCreatingProject(false);
    }
  }, [createProject, projectName]);

  const handleOpenCreateProject = useCallback(() => {
    triggerHaptic();
    if (!isSignedIn) {
      router.push({ pathname: "/sign-in", params: { returnTo: "/gallery" } });
      return;
    }
    createProjectRef.current?.present();
  }, [isSignedIn, router]);

  const header = useMemo(
    () => (
      <View className="px-4" style={{ paddingTop: insets.top + 12 }}>
        <MotiView {...staggerFadeUp(0)}>
          <BlurView
            intensity={90}
            tint="dark"
            className="mb-5 rounded-[28px] border border-white/10 bg-black/60 px-4 py-3"
            style={{ borderWidth: 0.5 }}
          >
            <View className="flex-row items-center justify-between">
              <LuxPressable
                onPress={handleOpenCredits}
                className="cursor-pointer flex-row items-center gap-1.5 rounded-full border border-white/20 bg-black/70 px-3 py-2"
                style={{ borderWidth: 0.5 }}
              >
                <Diamond color="#ffffff" size={16} />
                <Text className="text-xs font-semibold text-white">{credits}</Text>
              </LuxPressable>

              <Text className="text-2xl font-medium text-white">
                {mode === "discover" ? "Discover" : "Gallery"}
              </Text>

              <View className="flex-row items-center gap-2">
                <LuxPressable
                  onPress={handleSearch}
                  className="cursor-pointer h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60"
                  style={{ borderWidth: 0.5 }}
                >
                  <Search color="#ffffff" size={18} />
                </LuxPressable>
                <LuxPressable
                  onPress={handleOpenSettings}
                  className="cursor-pointer h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/60"
                  style={{ borderWidth: 0.5 }}
                >
                  <Settings color="#ffffff" size={18} />
                </LuxPressable>
              </View>
            </View>
          </BlurView>
        </MotiView>

        <MotiView {...staggerFadeUp(1)} className="mb-4">
          <View className="flex-row items-center gap-2 rounded-full border border-white/10 bg-white/5 p-1">
            <LuxPressable
              onPress={() => setMode("discover")}
              className={`cursor-pointer flex-1 rounded-full px-4 py-2 ${
                mode === "discover" ? "bg-white/15" : "bg-transparent"
              }`}
            >
              <Text className="text-center text-xs font-semibold text-white">Discover</Text>
            </LuxPressable>
            <LuxPressable
              onPress={() => setMode("gallery")}
              className={`cursor-pointer flex-1 rounded-full px-4 py-2 ${
                mode === "gallery" ? "bg-white/15" : "bg-transparent"
              }`}
            >
              <Text className="text-center text-xs font-semibold text-white">My Gallery</Text>
            </LuxPressable>
          </View>
        </MotiView>

        {mode === "discover" ? (
          <MotiView {...staggerFadeUp(2)} className="mb-4">
            <BlurView
              intensity={80}
              tint="dark"
              className="rounded-[22px] border border-white/10 bg-black/60 px-4 py-3"
              style={{ borderWidth: 0.5 }}
            >
              <View className="flex-row items-center gap-3">
                <Search color="#f4f4f5" size={16} />
                <TextInput
                  ref={searchInputRef}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search styles or rooms"
                  placeholderTextColor="rgba(148, 163, 184, 0.6)"
                  className="flex-1 text-sm text-white"
                />
                {searchQuery.length > 0 ? (
                  <LuxPressable
                    onPress={handleResetSearch}
                    className="h-7 w-7 items-center justify-center rounded-full bg-white/10"
                  >
                    <X color="#f4f4f5" size={12} />
                  </LuxPressable>
                ) : null}
              </View>
            </BlurView>
          </MotiView>
        ) : null}

        {mode === "discover" ? (
          <MotiView {...staggerFadeUp(3)} className="mb-6">
            <Text className="text-sm uppercase tracking-[3px] text-zinc-500">Darkor.ai Curated</Text>
            <Text className="mt-2 text-3xl font-medium text-white">Visual Heart</Text>
            <Text className="mt-2 text-sm text-zinc-400">
              Explore {filteredDiscover.length} cinematic spaces. Tap any style to launch the studio.
            </Text>
          </MotiView>
        ) : (
          <MotiView {...staggerFadeUp(2)} className="mb-6">
            <Text className="text-sm uppercase tracking-[3px] text-zinc-500">Your Studio</Text>
            <Text className="mt-2 text-3xl font-medium text-white">Organized Gallery</Text>
            <Text className="mt-2 text-sm text-zinc-400">
              Curate favorites, group projects, and revisit your best transformations.
            </Text>
          </MotiView>
        )}
      </View>
    ),
    [
      credits,
      filteredDiscover.length,
      handleOpenCredits,
      handleOpenSettings,
      handleResetSearch,
      handleSearch,
      insets.top,
      mode,
      searchQuery,
    ],
  );

  const galleryHeader = useMemo(
    () => (
      <View>
        {header}
        <View className="px-4 pb-4">
          <View className="flex-row items-center gap-2">
            <LuxPressable
              onPress={() => setFavoritesOnly(false)}
              className={`cursor-pointer rounded-full px-4 py-2 ${
                favoritesOnly ? "border border-white/10 bg-white/5" : "bg-white/15"
              }`}
              style={{ borderWidth: favoritesOnly ? 0.5 : 0 }}
            >
              <Text className="text-xs font-semibold text-white">All</Text>
            </LuxPressable>
            <LuxPressable
              onPress={() => setFavoritesOnly(true)}
              className={`cursor-pointer flex-row items-center gap-2 rounded-full px-4 py-2 ${
                favoritesOnly ? "bg-rose-500/20" : "border border-white/10 bg-white/5"
              }`}
              style={{ borderWidth: favoritesOnly ? 0 : 0.5 }}
            >
              <Heart color="#f43f5e" size={14} {...(favoritesOnly ? { fill: "#f43f5e" } : {})} />
              <Text className="text-xs font-semibold text-white">Favorites</Text>
            </LuxPressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
            <View className="flex-row items-center gap-2">
              <LuxPressable
                onPress={() => setActiveProjectId(null)}
                className={`cursor-pointer rounded-full px-4 py-2 ${
                  activeProjectId ? "border border-white/10 bg-white/5" : "bg-white/15"
                }`}
                style={{ borderWidth: activeProjectId ? 0.5 : 0 }}
              >
                <Text className="text-xs font-semibold text-white">All Projects</Text>
              </LuxPressable>

              {(projects ?? []).map((project) => {
                const active = project._id === activeProjectId;
                return (
                  <LuxPressable
                    key={project._id}
                    onPress={() => setActiveProjectId(project._id)}
                    className={`cursor-pointer rounded-full px-4 py-2 ${
                      active ? "bg-white/15" : "border border-white/10 bg-white/5"
                    }`}
                    style={{ borderWidth: active ? 0 : 0.5 }}
                  >
                    <Text className="text-xs font-semibold text-white">{project.name}</Text>
                  </LuxPressable>
                );
              })}

              <LuxPressable
                onPress={handleOpenCreateProject}
                className="cursor-pointer flex-row items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2"
                style={{ borderWidth: 0.5 }}
              >
                <Plus color="#f4f4f5" size={14} />
                <Text className="text-xs font-semibold text-white">New Project</Text>
              </LuxPressable>
            </View>
          </ScrollView>
        </View>
      </View>
    ),
    [activeProjectId, favoritesOnly, handleOpenCreateProject, header, projects],
  );

  return (
    <View className="flex-1 bg-black" style={{ backgroundColor: "#000000" }}>
      {mode === "discover" ? (
        <AnimatedFlashList
          data={filteredDiscover}
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
          contentContainerStyle={{ paddingHorizontal: H_PADDING, paddingBottom: 140 }}
          ListHeaderComponent={header}
          ListEmptyComponent={
            searchQuery.length > 0 ? (
              <View className="px-6 py-10">
                <Text className="text-center text-sm text-zinc-400">No styles found.</Text>
                <LuxPressable
                  onPress={handleResetSearch}
                  className="cursor-pointer mt-4 rounded-full border border-white/10 bg-white/5 px-4 py-3"
                  style={{ borderWidth: 0.5 }}
                >
                  <Text className="text-center text-xs font-semibold text-white">Reset search</Text>
                </LuxPressable>
              </View>
            ) : null
          }
          contentInsetAdjustmentBehavior="automatic"
        />
      ) : (
        <FlashList
          data={filteredArchive}
          keyExtractor={(item) => item._id}
          numColumns={NUM_COLUMNS}
          renderItem={({ item, index }) => (
            <GenerationCard
              item={item}
              index={index}
              columnWidth={columnWidth}
              onToggleFavorite={handleToggleFavorite}
              onMoveProject={handleOpenProjectSheet}
              projectLabel={item.projectId ? projectsById.get(item.projectId)?.name : undefined}
            />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: H_PADDING, paddingBottom: 140 }}
          ListHeaderComponent={galleryHeader}
          ListEmptyComponent={
            <View className="px-6 py-10">
              <Text className="text-center text-sm text-zinc-400">
                {isSignedIn ? "No generations yet. Create your first redesign." : "Sign in to view your saved renders."}
              </Text>
              {!isSignedIn ? (
                <LuxPressable
                  onPress={() => router.push({ pathname: "/sign-in", params: { returnTo: "/gallery" } })}
                  className="cursor-pointer mt-4 rounded-full border border-white/10 bg-white/5 px-4 py-3"
                  style={{ borderWidth: 0.5 }}
                >
                  <Text className="text-center text-xs font-semibold text-white">Sign in to continue</Text>
                </LuxPressable>
              ) : null}
            </View>
          }
          contentInsetAdjustmentBehavior="automatic"
        />
      )}

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
            <Text className="text-lg font-medium text-white">Style Preview</Text>
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
              <Text className="text-sm font-semibold text-white">Use this Style ?</Text>
            </LinearGradient>
          </LuxPressable>
        </View>
      </BottomSheetModal>

      <BottomSheetModal
        ref={projectSheetRef}
        snapPoints={projectSnapPoints}
        enablePanDownToClose
        backdropComponent={GlassBackdrop}
        onDismiss={() => setSelectedGeneration(null)}
        backgroundStyle={{ backgroundColor: "#050505" }}
        handleIndicatorStyle={{ backgroundColor: "rgba(255,255,255,0.4)" }}
      >
        <View className="flex-1 px-5 pb-8 pt-2">
          <Text className="text-lg font-medium text-white">Move to Project</Text>
          <Text className="mt-2 text-sm text-zinc-400">Organize this render into a project folder.</Text>

          <View className="mt-4 gap-3">
            <LuxPressable
              onPress={() => handleSelectProject(null)}
              className="cursor-pointer flex-row items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              style={{ borderWidth: 0.5 }}
            >
              <Text className="text-sm font-semibold text-white">Unassigned</Text>
              <Text className="text-xs text-zinc-400">Remove project</Text>
            </LuxPressable>

            {(projects ?? []).map((project) => (
              <LuxPressable
                key={project._id}
                onPress={() => handleSelectProject(project._id)}
                className="cursor-pointer flex-row items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                style={{ borderWidth: 0.5 }}
              >
                <Text className="text-sm font-semibold text-white">{project.name}</Text>
                {selectedGeneration?.projectId === project._id ? (
                  <Text className="text-xs text-emerald-300">Selected</Text>
                ) : (
                  <Text className="text-xs text-zinc-400">Move</Text>
                )}
              </LuxPressable>
            ))}
          </View>
        </View>
      </BottomSheetModal>

      <BottomSheetModal
        ref={createProjectRef}
        snapPoints={createProjectSnapPoints}
        enablePanDownToClose
        backdropComponent={GlassBackdrop}
        backgroundStyle={{ backgroundColor: "#050505" }}
        handleIndicatorStyle={{ backgroundColor: "rgba(255,255,255,0.4)" }}
      >
        <View className="flex-1 px-5 pb-8 pt-2">
          <Text className="text-lg font-medium text-white">Create Project</Text>
          <Text className="mt-2 text-sm text-zinc-400">Name the space you want to organize.</Text>
          <TextInput
            value={projectName}
            onChangeText={setProjectName}
            placeholder="e.g., Mom's House"
            placeholderTextColor="rgba(148, 163, 184, 0.6)"
            className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
            style={{ borderWidth: 0.5 }}
          />
          <LuxPressable
            onPress={handleCreateProject}
            disabled={isCreatingProject}
            className="cursor-pointer mt-5 overflow-hidden rounded-2xl"
          >
            <LinearGradient
              colors={["#f43f5e", "#d946ef"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ paddingVertical: 14, alignItems: "center", borderRadius: 16 }}
            >
              {isCreatingProject ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator color="#ffffff" />
                  <Text className="text-sm font-semibold text-white">Creating...</Text>
                </View>
              ) : (
                <Text className="text-sm font-semibold text-white">Create Project</Text>
              )}
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
              <Text className="mt-3 text-xs text-zinc-400">{rewardCountdown}</Text>
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



