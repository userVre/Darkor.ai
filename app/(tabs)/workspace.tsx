import { useAuth } from "@clerk/expo";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useMutation, useQuery } from "convex/react";
import { Asset } from "expo-asset";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { AnimatePresence, MotiView } from "moti";
import { memo, startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  ActionSheetIOS,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BoxSelect,
  X as Close,
  Bath,
  Baby,
  BedDouble,
  Building2,
  Check,
  CarFront,
  ChevronDown,
  CookingPot,
  Download,
  DoorOpen,
  Droplet,
  Eraser,
  Fence,
  Flower2,
  History,
  House,
  Plus,
  Monitor,
  Package2,
  Paintbrush,
  PaintRoller,
  Projector,
  Redo2,
  Send,
  Sofa,
  Sparkles,
  Store,
  SunMedium,
  Trees,
  Undo2,
  UtensilsCrossed,
  MoveHorizontal,
  Wand2,
} from "lucide-react-native";
import Svg, { Defs, Mask, Path as SvgPath, Rect } from "react-native-svg";

import { DIAGNOSTIC_BYPASS } from "../../lib/diagnostics";
import { triggerHaptic } from "../../lib/haptics";
import { LUX_SPRING, staggerFadeUp } from "../../lib/motion";
import { requestStoreReview } from "../../lib/store-review";
import { GlassBackdrop } from "../../components/glass-backdrop";
import { FloorWizard } from "../../components/floor-wizard";
import { LuxPressable } from "../../components/lux-pressable";
import { PaintWizard } from "../../components/paint-wizard";
import { ServiceWizardHeader } from "../../components/service-wizard-header";
import { useWorkspaceDraft } from "../../components/workspace-context";
import { useViewerSession } from "../../components/viewer-session-context";
import { useProSuccess } from "../../components/pro-success-context";
import Logo from "../../components/logo";
import { captureRef } from "react-native-view-shot";
import { SERVICE_WIZARD_THEME } from "../../lib/service-wizard-theme";
type MeResponse = {
  plan: "free" | "trial" | "pro";
  credits: number;
  subscriptionType?: "free" | "weekly" | "yearly";
  subscriptionEnd?: number;
  imageLimit?: number;
  imageGenerationCount?: number;
  lastResetDate?: number;
  imageGenerationLimit?: number;
  imagesRemaining?: number;
  subscriptionActive?: boolean;
  generationLimitReached?: boolean;
  generationStatusLabel?: string;
  generationStatusMessage?: string;
  hasPaidAccess?: boolean;
  canExport4k?: boolean;
  canRemoveWatermark?: boolean;
  canVirtualStage?: boolean;
  canEditDesigns?: boolean;
};

type SelectedImage = {
  uri: string;
  base64?: string;
  label?: string;
};

type PhotoSource = "camera" | "library";

type ExamplePhoto = {
  id: string;
  label: string;
  source: number;
};

type PaletteOption = {
  id: string;
  label: string;
  colors: string[];
  description?: string;
};

type AspectRatioOption = {
  id: "post" | "story" | "landscape";
  label: string;
  ratio: string;
  descriptor: string;
  width: number;
  height: number;
  preview: { width: number; height: number };
};

type StyleLibraryItem = {
  id: string;
  title: string;
  description: string;
  image: number;
};

type ExteriorStyleItem = {
  id: string;
  title: string;
  description: string;
  icon: any;
  colors: [string, string];
};

type GenerationStatus = "processing" | "ready" | "failed";
type GenerationSpeedTier = "standard" | "pro" | "ultra";

type ArchiveGeneration = {
  _id: string;
  _creationTime: number;
  imageUrl?: string | null;
  sourceImageUrl?: string | null;
  style?: string | null;
  roomType?: string | null;
  status?: GenerationStatus;
  errorMessage?: string | null;
  createdAt?: number;
};

type BoardRenderItem = {
  id: string;
  imageUrl?: string | null;
  originalImageUrl?: string | null;
  styleLabel: string;
  roomLabel: string;
  serviceType?: string | null;
  generationId?: string | null;
  status: GenerationStatus;
  errorMessage?: string | null;
  createdAt: number;
};

type ModeOption = {
  id: "preserve" | "renovate";
  title: string;
  description: string;
  promptHint: string;
  icon: any;
};

type RoomCardMeta = {
  icon: any;
  description: string;
  image?: number;
};

type PaintTool = "brush" | "eraser" | "object";

type PaintPoint = {
  x: number;
  y: number;
};

type PaintStroke = {
  id: string;
  tool: PaintTool;
  width: number;
  points: PaintPoint[];
};

type PaintSurfaceOption = {
  value: "Auto" | "Brick" | "Cabinet" | "Door" | "Wall" | "Outside Wall";
  label: string;
};

type PaintColorSwatch = {
  id: string;
  label: string;
  value: string;
};

type WallColorOption = {
  id: string;
  title: string;
  value: string;
  description: string;
};

type FloorMaterialOption = {
  id: string;
  title: string;
  description: string;
  promptLabel: string;
  colors: [string, string, string];
};

type FinishOption = {
  id: "matte" | "glossy" | "satin";
  title: string;
  description: string;
  promptLabel: string;
  accentColor: string;
};

const BoardGridCard = memo(function BoardGridCard({
  item,
  width,
  index,
  onPress,
}: {
  item: BoardRenderItem;
  width: number;
  index: number;
  onPress: (item: BoardRenderItem) => void;
}) {
  const previewImage = item.imageUrl ?? item.originalImageUrl ?? null;
  const isProcessing = item.status === "processing";
  const isFailed = item.status === "failed";
  const itemServiceType = item.serviceType ?? inferBoardServiceType(item.styleLabel, item.roomLabel);
  const processingLabel = getProcessingLabel(itemServiceType);
  const statusCopy = isProcessing
    ? getProcessingStatusCopy(itemServiceType)
    : isFailed
      ? "Generation failed. Tap for details."
      : "Tap to open your design editor";

  return (
    <View style={{ width, marginBottom: 12, marginRight: index % 2 === 0 ? 12 : 0 }}>
      <LuxPressable
        onPress={() => onPress(item)}
        className="cursor-pointer overflow-hidden rounded-[28px] border border-white/10 bg-zinc-950"
        style={{ height: 236, borderWidth: 0.5, opacity: isFailed ? 0.92 : 1 }}
      >
        {previewImage ? (
          <Image source={{ uri: previewImage }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={120} cachePolicy="memory-disk" />
        ) : (
          <View className="h-full w-full items-center justify-center bg-zinc-900">
            <Sparkles color="#71717a" size={28} />
          </View>
        )}

        <View
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: isFailed ? "rgba(20,0,8,0.58)" : isProcessing ? "rgba(0,0,0,0.42)" : "rgba(0,0,0,0.14)",
          }}
        />

        {isProcessing ? (
          <View className="absolute inset-0 items-center justify-center gap-3">
            <MotiView animate={{ opacity: [0.52, 1, 0.52], scale: [0.96, 1.03, 0.96] }} transition={{ ...LUX_SPRING, loop: true }}>
              <View className="h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/35">
                <ActivityIndicator size="small" color="#ffffff" />
              </View>
            </MotiView>
            <Text className="px-6 text-center text-sm font-semibold leading-5 text-white">{processingLabel}</Text>
          </View>
        ) : null}

        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.84)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 108 }}
        />
        <View style={{ position: "absolute", left: 14, right: 14, bottom: 14 }}>
          <Text className="text-base font-semibold text-white">{item.styleLabel + " " + item.roomLabel}</Text>
          <Text className="mt-1 text-xs text-zinc-300">{statusCopy}</Text>
        </View>
      </LuxPressable>
    </View>
  );
});

const INTERIOR_EXAMPLE_PHOTOS: ExamplePhoto[] = [
  {
    id: "living-room",
    label: "Living Room",
    source: require("../../assets/media/discover/home/home-living-room.jpg"),
  },
  {
    id: "bedroom",
    label: "Bedroom",
    source: require("../../assets/media/discover/home/home-master-suite.jpg"),
  },
  {
    id: "kitchen",
    label: "Kitchen",
    source: require("../../assets/media/discover/home/home-kitchen.jpg"),
  },
  {
    id: "bathroom",
    label: "Bathroom",
    source: require("../../assets/media/discover/home/home-bathroom.jpg"),
  },
];

const EXTERIOR_EXAMPLE_PHOTOS: ExamplePhoto[] = [
  {
    id: "modern-house",
    label: "Modern House",
    source: require("../../assets/media/discover/exterior/exterior-modern-villa.jpg"),
  },
  {
    id: "villa",
    label: "Villa",
    source: require("../../assets/media/discover/exterior/exterior-pool-house.jpg"),
  },
  {
    id: "apartment",
    label: "Apartment",
    source: require("../../assets/media/discover/exterior/exterior-apartment-block.jpg"),
  },
  {
    id: "office",
    label: "Office",
    source: require("../../assets/media/discover/exterior/exterior-glass-office.jpg"),
  },
];

const GARDEN_EXAMPLE_PHOTOS: ExamplePhoto[] = [
  {
    id: "backyard",
    label: "Backyard",
    source: require("../../assets/media/discover/garden/garden-backyard.jpg"),
  },
  {
    id: "front-yard",
    label: "Front yard",
    source: require("../../assets/media/discover/garden/garden-front-yard.jpg"),
  },
  {
    id: "patio",
    label: "Patio",
    source: require("../../assets/media/discover/garden/garden-fireside-patio.jpg"),
  },
  {
    id: "pool",
    label: "Pool",
    source: require("../../assets/media/discover/garden/garden-swimming-pool.jpg"),
  },
];

const FLOOR_EXAMPLE_PHOTOS: ExamplePhoto[] = [
  {
    id: "floor-concrete",
    label: "Concrete",
    source: require("../../assets/media/discover/home/home-living-room.jpg"),
  },
  {
    id: "floor-tile",
    label: "Tile",
    source: require("../../assets/media/discover/home/home-kitchen.jpg"),
  },
  {
    id: "floor-carpet",
    label: "Carpet",
    source: require("../../assets/media/discover/home/home-master-suite.jpg"),
  },
  {
    id: "floor-hardwood",
    label: "Hardwood",
    source: require("../../assets/media/discover/home/home-dining-room.jpg"),
  },
];

const PAINT_EXAMPLE_PHOTOS: ExamplePhoto[] = [
  {
    id: "paint-living-room",
    label: "Living Room",
    source: require("../../assets/media/discover/home/home-living-room.jpg"),
  },
  {
    id: "paint-bedroom",
    label: "Bedroom",
    source: require("../../assets/media/discover/home/home-master-suite.jpg"),
  },
  {
    id: "paint-kitchen",
    label: "Kitchen",
    source: require("../../assets/media/discover/home/home-kitchen.jpg"),
  },
  {
    id: "paint-hall",
    label: "Hall",
    source: require("../../assets/media/discover/home/home-hall.jpg"),
  },
];

const PAINT_SURFACE_OPTIONS: PaintSurfaceOption[] = [
  { value: "Auto", label: "Auto" },
  { value: "Brick", label: "Brick" },
  { value: "Cabinet", label: "Cabinet" },
  { value: "Door", label: "Door" },
  { value: "Wall", label: "Wall" },
  { value: "Outside Wall", label: "Outside Wall" },
];

const PAINT_COLOR_SWATCHES: PaintColorSwatch[] = [
  { id: "fuchsia", label: "Fuchsia Veil", value: "#d946ef" },
  { id: "indigo", label: "Indigo Bloom", value: "#4f46e5" },
  { id: "terracotta", label: "Terracotta", value: "#c2410c" },
  { id: "sage", label: "Sage", value: "#6b8f71" },
  { id: "navy", label: "Midnight Navy", value: "#1e3a8a" },
  { id: "sand", label: "Warm Sand", value: "#d6b890" },
  { id: "charcoal", label: "Graphite", value: "#3f3f46" },
  { id: "cream", label: "Soft Cream", value: "#f5f1e8" },
  { id: "coral", label: "Coral Clay", value: "#fb7185" },
  { id: "olive", label: "Olive Moss", value: "#4d5d3d" },
  { id: "sky", label: "Sky Blue", value: "#60a5fa" },
  { id: "wine", label: "Merlot", value: "#7f1d1d" },
];

const WALL_COLOR_OPTIONS: WallColorOption[] = [
  { id: "sage-green", title: "Sage Green", value: "#7C9174", description: "Soft botanical calm for airy living spaces." },
  { id: "navy-blue", title: "Navy Blue", value: "#223A5E", description: "Deep tailored contrast with a crisp modern feel." },
  { id: "terracotta", title: "Terracotta", value: "#C96F4A", description: "Sun-warmed clay tones with grounded warmth." },
  { id: "soft-ivory", title: "Soft Ivory", value: "#F2EBDD", description: "A bright neutral that keeps rooms open and elegant." },
  { id: "charcoal", title: "Charcoal", value: "#3B3E45", description: "Gallery-style drama with restrained sophistication." },
  { id: "dusty-rose", title: "Dusty Rose", value: "#C98A91", description: "Muted blush warmth with a refined boutique edge." },
  { id: "mist-blue", title: "Mist Blue", value: "#8FA8C5", description: "Cool coastal softness without losing depth." },
  { id: "olive-moss", title: "Olive Moss", value: "#5E6D4E", description: "Earthy depth that reads rich and architectural." },
];

const FLOOR_MATERIAL_OPTIONS: FloorMaterialOption[] = [
  {
    id: "hardwood",
    title: "Hardwood",
    description: "Wide-plank oak warmth with natural grain movement.",
    promptLabel: "wide-plank hardwood flooring",
    colors: ["#4A2F1F", "#8A5A35", "#C79262"],
  },
  {
    id: "marble",
    title: "Marble",
    description: "Bright veining and polished stone luxury.",
    promptLabel: "luxury marble flooring with soft natural veining",
    colors: ["#EDEAE4", "#D8D4CE", "#B8B4AF"],
  },
  {
    id: "polished-concrete",
    title: "Polished Concrete",
    description: "Sleek industrial grey with a seamless modern finish.",
    promptLabel: "polished concrete flooring",
    colors: ["#4A4D54", "#6B7077", "#989DA4"],
  },
  {
    id: "herringbone-parquet",
    title: "Parquet",
    description: "Classic parquet geometry with boutique-hotel richness.",
    promptLabel: "luxury parquet flooring",
    colors: ["#513424", "#7A5136", "#B67A53"],
  },
];

const FINISH_OPTIONS: FinishOption[] = [
  {
    id: "matte",
    title: "Matte",
    description: "Soft low-sheen realism with a calm, velvety read.",
    promptLabel: "matte",
    accentColor: "#A78BFA",
  },
  {
    id: "glossy",
    title: "Glossy",
    description: "Sharper reflections and a more polished visual finish.",
    promptLabel: "glossy",
    accentColor: "#60A5FA",
  },
  {
    id: "satin",
    title: "Satin",
    description: "Balanced sheen that keeps texture visible and refined.",
    promptLabel: "satin",
    accentColor: "#d946ef",
  },
];

const SPACE_OPTIONS = {
  interior: [
    "Living Room",
    "Bedroom",
    "Kitchen",
    "Bathroom",
    "Home Office",
    "Dining Room",
    "Nursery",
    "Home Theater",
    "Gaming Room",
    "Hall",
    "Library",
    "Laundry",
  ],
  exterior: [
    "Modern House",
    "Villa",
    "Apartment",
    "Office",
    "Retail",
    "Garage",
  ],
  garden: ["Backyard", "Front yard", "Patio", "Pool", "Terrace", "Deck"],
} as const;

const STYLE_LIBRARY: StyleLibraryItem[] = [
  {
    id: "modern",
    title: "Modern",
    description: "Clean architectural lines with a polished, airy palette.",
    image: require("../../assets/media/styles/style-modern.jpg"),
  },
  {
    id: "luxury",
    title: "Luxury",
    description: "Statement chandeliers, marble drama, and bespoke warmth.",
    image: require("../../assets/media/styles/style-luxury.jpg"),
  },
  {
    id: "japandi",
    title: "Japandi",
    description: "Soft natural calm with minimal Nordic restraint.",
    image: require("../../assets/media/styles/style-japandi.jpg"),
  },
  {
    id: "cyberpunk",
    title: "Cyberpunk",
    description: "Futuristic neon ambiance with cinematic contrast.",
    image: require("../../assets/media/styles/style-cyberpunk.jpg"),
  },
  {
    id: "tropical",
    title: "Tropical",
    description: "Lush greenery and resort-style sunshine energy.",
    image: require("../../assets/media/styles/style-tropical.jpg"),
  },
  {
    id: "minimalist",
    title: "Minimalist",
    description: "Quiet forms, negative space, and effortless clarity.",
    image: require("../../assets/media/styles/style-minimalist.jpg"),
  },
  {
    id: "scandinavian",
    title: "Scandinavian",
    description: "Warm woods, bright light, and soft layered comfort.",
    image: require("../../assets/media/styles/style-scandinavian.jpg"),
  },
  {
    id: "bohemian",
    title: "Bohemian",
    description: "Relaxed eclectic styling with earthy texture and soul.",
    image: require("../../assets/media/styles/style-bohemian.jpg"),
  },
  {
    id: "midcentury",
    title: "Midcentury",
    description: "Retro silhouettes balanced with timeless modern flow.",
    image: require("../../assets/media/styles/style-midcentury.jpg"),
  },
  {
    id: "art-deco",
    title: "Art Deco",
    description: "Geometric glamour, rich finishes, and layered elegance.",
    image: require("../../assets/media/styles/style-art-deco.jpg"),
  },
  {
    id: "coastal",
    title: "Coastal",
    description: "Fresh seaside calm with bright textures and light.",
    image: require("../../assets/media/styles/style-coastal.jpg"),
  },
  {
    id: "rustic",
    title: "Rustic",
    description: "Natural stone, timber warmth, and a grounded mood.",
    image: require("../../assets/media/styles/style-rustic.jpg"),
  },
  {
    id: "vintage",
    title: "Vintage",
    description: "Collected charm with classic furniture and moody glow.",
    image: require("../../assets/media/styles/style-vintage.jpg"),
  },
  {
    id: "mediterranean",
    title: "Mediterranean",
    description: "Sun-washed elegance with warm earth tones and arches.",
    image: require("../../assets/media/styles/style-mediterranean.jpg"),
  },
  {
    id: "glam",
    title: "Glam",
    description: "Polished sparkle, plush seating, and upscale softness.",
    image: require("../../assets/media/styles/style-glam.jpg"),
  },
  {
    id: "coastal-retreat",
    title: "Coastal Retreat",
    description: "A softer coastal variation with lounge-forward comfort.",
    image: require("../../assets/media/styles/style-coastal-alt.jpg"),
  },
  {
    id: "rustic-manor",
    title: "Rustic Manor",
    description: "Traditional hearth energy with richer, heritage details.",
    image: require("../../assets/media/styles/style-rustic-alt.jpg"),
  },
  {
    id: "hollywood-regency",
    title: "Hollywood Regency",
    description: "High-contrast drama with glamorous old-school polish.",
    image: require("../../assets/media/styles/style-hollywood-regency.jpg"),
  },
  {
    id: "neo-classic",
    title: "Neo-Classic",
    description: "Symmetry, ornament, and an elevated tailored calm.",
    image: require("../../assets/media/styles/style-neo-classic.jpg"),
  },
  {
    id: "shabby-chic",
    title: "Shabby Chic",
    description: "Light-toned romance with vintage softness and ease.",
    image: require("../../assets/media/styles/style-shabby-chic.jpg"),
  },
  {
    id: "french-country",
    title: "French Country",
    description: "Refined countryside warmth with timeless cozy detail.",
    image: require("../../assets/media/styles/style-french-country.jpg"),
  },
  {
    id: "brutalist",
    title: "Brutalist",
    description: "Raw concrete texture shaped into calm sculptural space.",
    image: require("../../assets/media/styles/style-brutalist.jpg"),
  },
  {
    id: "hollywood-regency-noir",
    title: "Hollywood Regency Noir",
    description: "A darker regency take with richer contrast and edge.",
    image: require("../../assets/media/styles/style-hollywood-regency-alt.jpg"),
  },
  {
    id: "art-nouveau",
    title: "Art Nouveau",
    description: "Curved classicism and decorative flourishes with warmth.",
    image: require("../../assets/media/styles/style-art-nouveau.jpg"),
  },
];

const STYLE_OPTIONS = STYLE_LIBRARY.map((style) => style.title);

const EXTERIOR_STYLE_LIBRARY: ExteriorStyleItem[] = [
  {
    id: "modern",
    title: "Modern",
    description: "Crisp lines, warm lighting, and clean facade geometry.",
    icon: House,
    colors: ["rgba(255,255,255,0.08)", "rgba(99,102,241,0.2)"],
  },
  {
    id: "luxury",
    title: "Luxury",
    description: "High-end frontage with dramatic glazing and premium materials.",
    icon: Sparkles,
    colors: ["rgba(217,70,239,0.16)", "rgba(249,115,22,0.18)"],
  },
  {
    id: "minimalist",
    title: "Minimalist",
    description: "Quiet massing, fewer gestures, and gallery-like restraint.",
    icon: DoorOpen,
    colors: ["rgba(255,255,255,0.08)", "rgba(148,163,184,0.16)"],
  },
  {
    id: "mediterranean",
    title: "Mediterranean",
    description: "Sun-washed stucco, arches, and resort-level softness.",
    icon: SunMedium,
    colors: ["rgba(251,191,36,0.14)", "rgba(249,115,22,0.14)"],
  },
  {
    id: "brutalist",
    title: "Brutalist",
    description: "Stronger concrete forms with a sculpted urban presence.",
    icon: Building2,
    colors: ["rgba(82,82,91,0.18)", "rgba(161,161,170,0.12)"],
  },
  {
    id: "gothic",
    title: "Gothic",
    description: "Vertical drama, ornamental silhouettes, and moody depth.",
    icon: BadgeCheck,
    colors: ["rgba(88,28,135,0.16)", "rgba(17,24,39,0.24)"],
  },
  {
    id: "italianate",
    title: "Italianate",
    description: "Balanced classical rhythms with refined villa detailing.",
    icon: House,
    colors: ["rgba(180,83,9,0.16)", "rgba(251,191,36,0.12)"],
  },
  {
    id: "chinese",
    title: "Chinese",
    description: "Layered rooflines and elegant symmetry with cultural detail.",
    icon: Store,
    colors: ["rgba(220,38,38,0.16)", "rgba(245,158,11,0.12)"],
  },
  {
    id: "neo-classical",
    title: "Neo Classical",
    description: "Monumental balance with columns, order, and polished stone.",
    icon: Building2,
    colors: ["rgba(226,232,240,0.08)", "rgba(148,163,184,0.18)"],
  },
];

const EXTERIOR_STYLE_OPTIONS = EXTERIOR_STYLE_LIBRARY.map((style) => style.title);

const GARDEN_STYLE_LIBRARY: ExteriorStyleItem[] = [
  {
    id: "tropical",
    title: "Tropical",
    description: "Lush planting, resort warmth, and layered outdoor comfort.",
    icon: Trees,
    colors: ["rgba(34,197,94,0.16)", "rgba(250,204,21,0.1)"],
  },
  {
    id: "zen",
    title: "Zen",
    description: "Calm geometry, stone balance, and quiet meditative rhythm.",
    icon: Flower2,
    colors: ["rgba(148,163,184,0.16)", "rgba(226,232,240,0.08)"],
  },
  {
    id: "mediterranean",
    title: "Mediterranean",
    description: "Sunlit terraces, olive tones, and warm natural textures.",
    icon: SunMedium,
    colors: ["rgba(249,115,22,0.16)", "rgba(251,191,36,0.12)"],
  },
  {
    id: "coastal",
    title: "Coastal",
    description: "Airy poolside light with soft stone and sea-toned calm.",
    icon: Sparkles,
    colors: ["rgba(56,189,248,0.14)", "rgba(226,232,240,0.08)"],
  },
  {
    id: "modern",
    title: "Modern",
    description: "Sharpened hardscape lines with minimal landscape structure.",
    icon: House,
    colors: ["rgba(255,255,255,0.08)", "rgba(99,102,241,0.16)"],
  },
  {
    id: "japandi",
    title: "Japandi",
    description: "Natural wood, low-profile planting, and restrained warmth.",
    icon: Fence,
    colors: ["rgba(120,113,108,0.18)", "rgba(245,245,244,0.08)"],
  },
  {
    id: "rustic",
    title: "Rustic",
    description: "Weathered stone, timber detail, and relaxed outdoor texture.",
    icon: Trees,
    colors: ["rgba(120,53,15,0.18)", "rgba(217,119,6,0.12)"],
  },
  {
    id: "luxury",
    title: "Luxury",
    description: "Hotel-level outdoor staging with premium fire-and-water drama.",
    icon: Sparkles,
    colors: ["rgba(217,70,239,0.14)", "rgba(249,115,22,0.14)"],
  },
];

const GARDEN_STYLE_OPTIONS = GARDEN_STYLE_LIBRARY.map((style) => style.title);

const EXTERIOR_BUILDING_PRESET_ALIASES: Record<string, string> = {
  "modern house": "Modern House",
  "modern villa": "Villa",
  "luxury villa": "Villa",
  villa: "Villa",
  apartment: "Apartment",
  "apartment block": "Apartment",
  "urban apartments": "Apartment",
  office: "Office",
  "office building": "Office",
  "glass office": "Office",
  retail: "Retail",
  "retail store": "Retail",
  "retail frontage": "Retail",
  garage: "Garage",
  "garage studio": "Garage",
};

const GARDEN_AREA_PRESET_ALIASES: Record<string, string> = {
  backyard: "Backyard",
  "front yard": "Front yard",
  patio: "Patio",
  pool: "Pool",
  "swimming pool": "Pool",
  "pool courtyard": "Pool",
  terrace: "Terrace",
  deck: "Deck",
  "sunset lounge": "Patio",
};

const CUSTOM_STYLE_EXAMPLE_PROMPTS = [
  "Design a farmhouse kitchen with rustic oak cabinetry, aged brass fixtures, and warm layered lighting.",
  "Create a moody luxury living room with sculptural seating, smoked glass accents, and hotel-level ambiance.",
  "Transform this into a serene Japandi bedroom with soft limestone tones, natural wood, and tactile textiles.",
  "Reimagine the patio as a Mediterranean outdoor lounge with curved built-ins, olive trees, and sunset warmth.",
];

const FLOOR_PROMPT_CHIPS = [
  "smooth polished concrete flooring with subtle matte finish",
  "luxury hardwood parquet flooring with herringbone pattern",
  "high-end white Carrara marble flooring with soft grey veins",
  "rustic farmhouse style natural stone tile flooring",
  "red and beige glossy marble flooring",
];

const FLOOR_MASK_PATH = "M 0 100 L 0 76 L 11 67 L 28 58 L 46 54 L 67 56 L 84 63 L 96 73 L 100 84 L 100 100 Z";
const FLOOR_MASK_EDGE_PATH = "M 10 67 C 24 58 41 53 57 54 C 73 55 86 62 96 73";

const PALETTE_OPTIONS: PaletteOption[] = [
  {
    id: "surprise",
    label: "Curated Mix",
    colors: ["#f7f7f5", "#f4d7a6", "#fd5d82", "#6b8afd", "#121212"],
    description: "An editor's balanced palette composition.",
  },
  {
    id: "gray",
    label: "Millennial Gray",
    colors: ["#f5f5f4", "#d6d3d1", "#a8a29e", "#78716c", "#44403c"],
    description: "Quiet urban neutrals.",
  },
  {
    id: "terracotta",
    label: "Terracotta Mirage",
    colors: ["#fff7ed", "#fed7aa", "#fdba74", "#fb923c", "#ea580c"],
    description: "Warm Mediterranean depth.",
  },
  {
    id: "forest",
    label: "Forest Hues",
    colors: ["#ecfccb", "#cbd5b1", "#9caf88", "#6f8f72", "#334d36"],
    description: "Calm natural layering.",
  },
  {
    id: "peach",
    label: "Peach Orchard",
    colors: ["#fff7ed", "#fde1d3", "#fac9b8", "#f3b49f", "#e68a73"],
    description: "Soft sunlit warmth.",
  },
  {
    id: "fuchsia",
    label: "Fuchsia Blossom",
    colors: ["#fdf2f8", "#fbcfe8", "#f9a8d4", "#ec4899", "#be185d"],
    description: "Bold couture energy.",
  },
  {
    id: "emerald",
    label: "Emerald Gem",
    colors: ["#e8f5ec", "#bfd8c2", "#7aa182", "#425a41", "#1f2f23"],
    description: "Refined botanical richness.",
  },
  {
    id: "pastel",
    label: "Pastel Breeze",
    colors: ["#e0f2fe", "#fffbea", "#eef6f0", "#f5f4f7", "#e9d5ff"],
    description: "Airy and softly polished.",
  },
  {
    id: "ocean",
    label: "Ocean Mist",
    colors: ["#304766", "#6587a7", "#a7c7e1", "#f8f7f2", "#d4d6d1"],
    description: "Coastal light with depth.",
  },
  {
    id: "velvet",
    label: "Velvet Dusk",
    colors: ["#6b4b59", "#957785", "#c1a7b1", "#e7d8d0", "#f5efe9"],
    description: "Moody evening elegance.",
  },
  {
    id: "amethyst",
    label: "Amethyst Dream",
    colors: ["#e9d5ff", "#d8b4fe", "#c084fc", "#9333ea", "#6b21a8"],
    description: "Jewel-box statement tones.",
  },
  {
    id: "sunset",
    label: "Fuchsia Noir",
    colors: ["#16081f", "#4c1d95", "#7c3aed", "#d946ef", "#f5d0fe"],
    description: "A couture fuchsia-to-indigo statement.",
  },
];

const ASPECT_RATIO_OPTIONS: AspectRatioOption[] = [
  {
    id: "post",
    label: "Post (1:1)",
    ratio: "1:1",
    descriptor: "Best for Social",
    width: 1,
    height: 1,
    preview: { width: 28, height: 28 },
  },
  {
    id: "story",
    label: "Story (9:16)",
    ratio: "9:16",
    descriptor: "Best for Phone",
    width: 9,
    height: 16,
    preview: { width: 22, height: 34 },
  },
  {
    id: "landscape",
    label: "Landscape (16:9)",
    ratio: "16:9",
    descriptor: "Best for PC",
    width: 16,
    height: 9,
    preview: { width: 34, height: 22 },
  },
];

const ROOM_CARD_META: Record<string, RoomCardMeta> = {
  "Living Room": { icon: Sofa, description: "Layered lounge refinement." },
  Bedroom: { icon: BedDouble, description: "A calmer, hotel-like retreat." },
  Kitchen: { icon: CookingPot, description: "Sharper culinary flow and finishes." },
  Bathroom: { icon: Bath, description: "Spa-driven comfort and texture." },
  "Home Office": { icon: Monitor, description: "Focused executive atmosphere." },
  "Dining Room": { icon: UtensilsCrossed, description: "Gathering-ready statement dining." },
  Nursery: { icon: Baby, description: "Soft comfort with practical balance." },
  "Home Theater": { icon: Projector, description: "Immersive cinematic ambiance." },
  "Modern House": {
    icon: House,
    description: "Contemporary curbside presence.",
    image: require("../../assets/media/discover/exterior/exterior-modern-villa.jpg"),
  },
  Villa: {
    icon: Sparkles,
    description: "Resort-inspired exterior drama.",
    image: require("../../assets/media/discover/exterior/exterior-pool-house.jpg"),
  },
  Apartment: {
    icon: Building2,
    description: "Refined urban facade refresh.",
    image: require("../../assets/media/discover/exterior/exterior-apartment-block.jpg"),
  },
  Office: {
    icon: Building2,
    description: "Sharper executive frontage.",
    image: require("../../assets/media/discover/exterior/exterior-glass-office.jpg"),
  },
  Retail: {
    icon: Store,
    description: "Street-facing brand appeal.",
    image: require("../../assets/media/discover/exterior/exterior-retail-store.jpg"),
  },
  Garage: {
    icon: CarFront,
    description: "Polished practical shell.",
    image: require("../../assets/media/discover/exterior/exterior-garage-suite.jpg"),
  },
  Backyard: {
    icon: Trees,
    description: "Outdoor entertaining retreat.",
    image: require("../../assets/media/discover/garden/garden-backyard.jpg"),
  },
  "Front yard": {
    icon: Fence,
    description: "First-impression landscaping.",
    image: require("../../assets/media/discover/garden/garden-front-yard.jpg"),
  },
  Patio: {
    icon: SunMedium,
    description: "Relaxed open-air layering.",
    image: require("../../assets/media/discover/garden/garden-fireside-patio.jpg"),
  },
  Pool: {
    icon: Flower2,
    description: "Resort-style poolside calm.",
    image: require("../../assets/media/discover/garden/garden-swimming-pool.jpg"),
  },
  Terrace: {
    icon: DoorOpen,
    description: "Elevated lounge with a view.",
    image: require("../../assets/media/discover/garden/garden-terrace.jpg"),
  },
  Deck: {
    icon: Fence,
    description: "Refined open-air lounge platform.",
    image: require("../../assets/media/discover/garden/garden-deck.jpg"),
  },
} as const;

const MODE_OPTIONS: ModeOption[] = [
  {
    id: "preserve",
    title: "Structural Preservation",
    description: "Respect the architecture while elevating materials, mood, and styling.",
    promptHint:
      "Preserve the original architecture, room structure, camera angle, and layout as closely as possible while upgrading furniture, finishes, and mood.",
    icon: PaintRoller,
  },
  {
    id: "renovate",
    title: "Renovation Design",
    description: "Introduce a bolder transformation while keeping the result coherent and believable.",
    promptHint:
      "Allow a more transformative renovation approach with stronger upgrades to built-ins, focal elements, and materials while keeping the result realistic and coherent.",
    icon: Wand2,
  },
];

const WIZARD_CARD_SHADOW = {
  shadowColor: "#111827",
  shadowOpacity: 0.08,
  shadowRadius: 22,
  shadowOffset: { width: 0, height: 12 },
  elevation: 4,
} as const;

const SERVICE_LABELS: Record<string, string> = {
  interior: "Interior Redesign",
  exterior: "Exterior Redesign",
  garden: "Garden Redesign",
  floor: "Floor Restyle",
  paint: "Smart Wall Paint",
};

function inferBoardServiceType(styleLabel?: string | null, roomLabel?: string | null) {
  const combined = `${styleLabel ?? ""} ${roomLabel ?? ""}`.toLowerCase();
  if (combined.includes("paint")) return "paint";
  if (combined.includes("floor")) return "floor";
  return null;
}

function getProcessingLabel(serviceType?: string | null) {
  return "AI is crafting your masterpiece...";
}

function getProcessingStatusCopy(serviceType?: string | null) {
  if (serviceType === "paint") {
    return "Darkor.ai is isolating the wall planes and layering your selected finish with gallery-grade realism.";
  }
  if (serviceType === "floor") {
    return "Darkor.ai is reading perspective, locking the floor plane, and composing the new material with premium detail.";
  }
  return "Darkor.ai is preserving the architecture while composing a refined redesign.";
}

const FloorMaterialPreview = memo(function FloorMaterialPreview({
  material,
  active,
}: {
  material: FloorMaterialOption;
  active: boolean;
}) {
  const borderColor = active ? "rgba(255,255,255,0.24)" : "rgba(255,255,255,0.1)";

  return (
    <View
      style={{
        aspectRatio: 1,
        overflow: "hidden",
        borderRadius: 24,
        borderWidth: 1,
        borderColor,
        backgroundColor: "#0d0d0f",
      }}
    >
      <LinearGradient
        colors={material.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", inset: 0 }}
      />

      {material.id === "hardwood" ? (
        <View style={{ flex: 1, flexDirection: "row", opacity: 0.72 }}>
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <View
              key={index}
              style={{
                flex: 1,
                borderRightWidth: index === 5 ? 0 : 1,
                borderRightColor: "rgba(255,255,255,0.08)",
                backgroundColor: index % 2 === 0 ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.03)",
              }}
            />
          ))}
        </View>
      ) : null}

      {material.id === "marble" ? (
        <>
          {[
            { top: 26, left: -12, width: 132, rotate: "-14deg", opacity: 0.34 },
            { top: 74, left: 24, width: 118, rotate: "18deg", opacity: 0.24 },
            { top: 118, left: -8, width: 148, rotate: "-12deg", opacity: 0.22 },
          ].map((vein, index) => (
            <View
              key={index}
              style={{
                position: "absolute",
                top: vein.top,
                left: vein.left,
                width: vein.width,
                height: 3,
                borderRadius: 999,
                backgroundColor: `rgba(255,255,255,${vein.opacity})`,
                transform: [{ rotate: vein.rotate }],
              }}
            />
          ))}
        </>
      ) : null}

      {material.id === "polished-concrete" ? (
        <>
          {[{ top: 30, left: 34 }, { top: 92, left: 98 }, { top: 138, left: 54 }].map((speckle, index) => (
            <View
              key={index}
              style={{
                position: "absolute",
                top: speckle.top,
                left: speckle.left,
                height: 34,
                width: 34,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.06)",
              }}
            />
          ))}
        </>
      ) : null}

      {material.id === "ceramic-tile" ? (
        <View style={{ flex: 1, justifyContent: "space-between" }}>
          {[0, 1, 2].map((row) => (
            <View key={row} style={{ flex: 1, flexDirection: "row" }}>
              {[0, 1, 2].map((column) => (
                <View
                  key={`${row}-${column}`}
                  style={{
                    flex: 1,
                    marginRight: column === 2 ? 0 : 2,
                    marginBottom: row === 2 ? 0 : 2,
                    backgroundColor:
                      (row + column) % 2 === 0 ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)",
                  }}
                />
              ))}
            </View>
          ))}
        </View>
      ) : null}

      {material.id === "herringbone-parquet" ? (
        <>
          {[0, 1, 2, 3].map((index) => (
            <View
              key={`left-${index}`}
              style={{
                position: "absolute",
                top: index * 44 - 10,
                left: 18,
                width: 56,
                height: 18,
                borderRadius: 8,
                backgroundColor: "rgba(255,255,255,0.1)",
                transform: [{ rotate: "42deg" }],
              }}
            />
          ))}
          {[0, 1, 2, 3].map((index) => (
            <View
              key={`right-${index}`}
              style={{
                position: "absolute",
                top: index * 44 - 6,
                right: 18,
                width: 56,
                height: 18,
                borderRadius: 8,
                backgroundColor: "rgba(0,0,0,0.12)",
                transform: [{ rotate: "-42deg" }],
              }}
            />
          ))}
        </>
      ) : null}
    </View>
  );
});

function resolveAspectRatio(option: AspectRatioOption | null) {
  if (!option) return { ratioValue: 1, ratioLabel: "1:1", targetWidth: 1024, targetHeight: 1024 };
  const ratioValue = option.width / option.height;
  const base = 1024;
  const targetWidth = Math.round(ratioValue >= 1 ? base * ratioValue : base);
  const targetHeight = Math.round(ratioValue >= 1 ? base : base / ratioValue);
  return { ratioValue, ratioLabel: option.ratio, targetWidth, targetHeight };
}

function getServiceType(serviceKey: string) {
  if (serviceKey.includes("facade") || serviceKey.includes("exterior")) return "exterior";
  if (serviceKey.includes("garden")) return "garden";
  if (serviceKey.includes("floor")) return "floor";
  if (serviceKey.includes("paint")) return "paint";
  return "interior";
}

function getPromptBlocks(value: string) {
  return value
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function togglePromptBlock(value: string, block: string) {
  const nextBlocks = getPromptBlocks(value);
  const existingIndex = nextBlocks.indexOf(block);

  if (existingIndex >= 0) {
    nextBlocks.splice(existingIndex, 1);
    return nextBlocks.join("\n\n");
  }

  nextBlocks.push(block);
  return nextBlocks.join("\n\n");
}

function buildPaintPath(points: PaintPoint[]) {
  if (points.length === 0) {
    return "";
  }

  if (points.length === 1) {
    const point = points[0];
    return `M ${point.x} ${point.y} L ${point.x} ${point.y}`;
  }

  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function normalizeHexColor(value: string) {
  const trimmed = value.trim();
  const normalized = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (/^#([0-9a-fA-F]{6})$/.test(normalized)) {
    return normalized.toUpperCase();
  }
  return null;
}

async function readBase64FromUri(uri: string) {
  if (uri.startsWith("file://")) {
    return await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  }

  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error("Unable to load the selected image.");
  }

  const blob = await response.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Unable to read image data."));
    reader.readAsDataURL(blob);
  });

  const marker = "base64,";
  const markerIndex = dataUrl.indexOf(marker);
  return markerIndex === -1 ? dataUrl : dataUrl.slice(markerIndex + marker.length);
}

async function readBlobFromUri(uri: string) {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error("Unable to load the selected image.");
  }

  return await response.blob();
}

const PHOTO_PERMISSION_ALERT_TITLE = "Permission Required";
const PHOTO_PERMISSION_ALERT_MESSAGE =
  "Please enable camera/photo access in your system settings to continue.";

export default function WorkspaceScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { service, presetStyle, presetRoom, startStep, boardView, boardItemId, entrySource } = useLocalSearchParams<{
    service?: string;
    presetStyle?: string;
    presetRoom?: string;
    startStep?: string;
    boardView?: string;
    boardItemId?: string;
    entrySource?: string;
  }>();
  const { isSignedIn } = useAuth();
  const { anonymousId, isReady: viewerReady } = useViewerSession();
  const diagnostic = DIAGNOSTIC_BYPASS;
  const effectiveSignedIn = isSignedIn;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { draft, setDraftAspectRatio, setDraftImage, setDraftPalette, setDraftPrompt, setDraftRoom, setDraftStyle } =
    useWorkspaceDraft();
  const { showToast } = useProSuccess();
  const viewerArgs = useMemo(() => (anonymousId ? { anonymousId } : {}), [anonymousId]);

  const me = useQuery(
    "users:me" as any,
    diagnostic ? "skip" : viewerReady ? viewerArgs : "skip",
  ) as MeResponse | null | undefined;
  const generationArchive = useQuery(
    "generations:getUserArchive" as any,
    diagnostic ? "skip" : viewerReady ? viewerArgs : "skip",
  ) as ArchiveGeneration[] | undefined;
  const createSourceUploadUrl = useMutation("generations:createSourceUploadUrl" as any);
  const startGeneration = useMutation("generations:startGeneration" as any);
  const markReviewPrompted = useMutation("users:markReviewPrompted" as any);
  const submitFeedback = useMutation("feedback:submit" as any);
  const submitGenerationFeedback = useMutation("generations:submitFeedback" as any);
  const deleteGeneration = useMutation("generations:deleteGeneration" as any);

  const [workflowStep, setWorkflowStep] = useState(0);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedFinishId, setSelectedFinishId] = useState<FinishOption["id"] | null>(null);
  const [selectedModeId, setSelectedModeId] = useState<ModeOption["id"] | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [customPromptDraft, setCustomPromptDraft] = useState("");
  const [isCustomPromptViewOpen, setIsCustomPromptViewOpen] = useState(false);
  const [selectedPaletteId, setSelectedPaletteId] = useState<string | null>(null);
  const [selectedAspectRatioId, setSelectedAspectRatioId] = useState<AspectRatioOption["id"]>("post");
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [pendingBoardItems, setPendingBoardItems] = useState<BoardRenderItem[]>([]);
  const [activeBoardItemId, setActiveBoardItemId] = useState<string | null>(null);
  const [showBeforeOnly, setShowBeforeOnly] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeletingGeneration, setIsDeletingGeneration] = useState(false);
  const [isSharingResult, setIsSharingResult] = useState(false);
  const [isDownloading, setIsDownloading] = useState<"standard" | "ultra" | null>(null);
  const [isLoadingExample, setIsLoadingExample] = useState<string | null>(null);
  const [isSelectingPhoto, setIsSelectingPhoto] = useState(false);
  const [reviewPromptOpen, setReviewPromptOpen] = useState(false);
  const [ratePromptOpen, setRatePromptOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackState, setFeedbackState] = useState<"liked" | "disliked" | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [lastGenerationCount, setLastGenerationCount] = useState<number | null>(null);
  const [showResumeToast, setShowResumeToast] = useState(false);
  const [awaitingAuth, setAwaitingAuth] = useState(false);
  const [pendingReviewState, setPendingReviewState] = useState<{ count: number; shouldPrompt: boolean } | null>(null);
  const [wizardNavDirection, setWizardNavDirection] = useState<1 | -1>(1);
  const [isHeaderClosePressed, setIsHeaderClosePressed] = useState(false);
  const [paintTool, setPaintTool] = useState<PaintTool>("brush");
  const [paintBrushWidth, setPaintBrushWidth] = useState(28);
  const [paintColor, setPaintColor] = useState("#D946EF");
  const [paintColorDraft, setPaintColorDraft] = useState("#D946EF");
  const [paintSurface, setPaintSurface] = useState<PaintSurfaceOption["value"]>("Auto");
  const [paintStrokes, setPaintStrokes] = useState<PaintStroke[]>([]);
  const [paintRedoStrokes, setPaintRedoStrokes] = useState<PaintStroke[]>([]);
  const [paintCurrentStroke, setPaintCurrentStroke] = useState<PaintStroke | null>(null);
  const [paintTutorialOpen, setPaintTutorialOpen] = useState(false);
  const [paintTutorialSeen, setPaintTutorialSeen] = useState(false);
  const [paintColorPickerOpen, setPaintColorPickerOpen] = useState(false);
  const [paintSurfacePickerOpen, setPaintSurfacePickerOpen] = useState(false);
  const [paintCanvasSize, setPaintCanvasSize] = useState({ width: 0, height: 0 });
  const [paintSliderWidth, setPaintSliderWidth] = useState(0);

  const reviewSheetRef = useRef<BottomSheetModal>(null);
  const rateSheetRef = useRef<BottomSheetModal>(null);
  const feedbackSheetRef = useRef<BottomSheetModal>(null);
  const imageContainerRef = useRef<View>(null);
  const hasAppliedStartStepRef = useRef(false);
  const handledBoardRouteRef = useRef<string | null>(null);
  const reviewHandledRef = useRef(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationAlertedFailureRef = useRef<string | null>(null);
  const paintStrokeIdRef = useRef(0);
  const paintCurrentStrokeRef = useRef<PaintStroke | null>(null);
  const sliderX = useSharedValue(0);
  const sliderWidth = useSharedValue(0);
  const sliderStart = useSharedValue(0);
  const likeScale = useSharedValue(1);
  const dislikeScale = useSharedValue(1);

  const isSmallScreen = height < 740;
  const reviewSnapPoints = useMemo(() => ["38%"], []);
  const rateSnapPoints = useMemo(() => ["36%"], []);
  const feedbackSnapPoints = useMemo(() => [isSmallScreen ? "95%" : "58%"], [isSmallScreen]);
  const serviceKey = String(service ?? "interior").toLowerCase();
  const serviceType = getServiceType(serviceKey);
  const serviceLabel = SERVICE_LABELS[serviceType] ?? "Interior Redesign";
  const isExteriorService = serviceType === "exterior";
  const isGardenService = serviceType === "garden";
  const isFloorService = serviceType === "floor";
  const isPaintService = serviceType === "paint";
  const isLeanGenerationService = isExteriorService || isGardenService;
  const presetRoomOptions =
    serviceType === "exterior"
      ? SPACE_OPTIONS.exterior
      : serviceType === "garden"
        ? SPACE_OPTIONS.garden
        : SPACE_OPTIONS.interior;

  useEffect(() => {
    if (draft.room && !selectedRoom) {
      setSelectedRoom(draft.room);
    }
  }, [draft.room, selectedRoom]);

  useEffect(() => {
    if (draft.style && !selectedStyle) {
      setSelectedStyle(draft.style);
    }
  }, [draft.style, selectedStyle]);

  useEffect(() => {
    if (draft.paletteId && !selectedPaletteId) {
      setSelectedPaletteId(draft.paletteId);
    }
  }, [draft.paletteId, selectedPaletteId]);

  useEffect(() => {
    if (draft.prompt && customPrompt.length === 0) {
      setCustomPrompt(draft.prompt);
      setCustomPromptDraft(draft.prompt);
    }
  }, [customPrompt.length, draft.prompt]);

  useEffect(() => {
    if (draft.aspectRatio && draft.aspectRatio !== selectedAspectRatioId) {
      setSelectedAspectRatioId(draft.aspectRatio as AspectRatioOption["id"]);
    }
  }, [draft.aspectRatio, selectedAspectRatioId]);

  useEffect(() => {
    setDraftImage(selectedImage ?? null);
  }, [selectedImage, setDraftImage]);

  useEffect(() => {
    if (selectedRoom) {
      setDraftRoom(selectedRoom);
    }
  }, [selectedRoom, setDraftRoom]);

  useEffect(() => {
    if (selectedStyle) {
      setDraftStyle(selectedStyle);
    }
  }, [selectedStyle, setDraftStyle]);

  useEffect(() => {
    setDraftPalette(selectedPaletteId ?? null);
  }, [selectedPaletteId, setDraftPalette]);

  useEffect(() => {
    const nextPrompt = customPrompt.trim();
    setDraftPrompt(nextPrompt.length > 0 ? customPrompt : null);
  }, [customPrompt, setDraftPrompt]);

  useEffect(() => {
    setDraftAspectRatio(selectedAspectRatioId ?? null);
  }, [selectedAspectRatioId, setDraftAspectRatio]);

  useEffect(() => {
    if (!startStep || hasAppliedStartStepRef.current) return;
    const canSkip = Boolean(draft.image && draft.room);
    const hasStyle = Boolean(presetStyle || draft.style || selectedStyle);
    if (canSkip && hasStyle) {
      const parsed = Number(startStep);
      const nextStep = Number.isFinite(parsed) ? Math.max(0, Math.min(parsed, 3)) : 3;
      setWorkflowStep(nextStep);
      setShowResumeToast(true);
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
      toastTimeoutRef.current = setTimeout(() => setShowResumeToast(false), 2200);
    }
    hasAppliedStartStepRef.current = true;
  }, [draft.image, draft.room, draft.style, presetStyle, selectedStyle, startStep]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!presetStyle || selectedStyle) return;
    const normalized = String(presetStyle).trim().toLowerCase();
    const stylePool =
      serviceType === "exterior"
        ? EXTERIOR_STYLE_OPTIONS
        : serviceType === "garden"
          ? GARDEN_STYLE_OPTIONS
          : serviceType === "paint"
            ? WALL_COLOR_OPTIONS.map((option) => option.title)
            : serviceType === "floor"
              ? FLOOR_MATERIAL_OPTIONS.map((option) => option.title)
          : STYLE_OPTIONS;
    const matched = stylePool.find((style) => style.toLowerCase() === normalized);
    if (matched) {
      setSelectedStyle(matched);
    }
  }, [presetStyle, selectedStyle, serviceType]);

  useEffect(() => {
    if (!presetRoom || selectedRoom) return;
    const normalized = String(presetRoom).trim().toLowerCase();
    const normalizedExteriorValue = serviceType === "exterior" ? EXTERIOR_BUILDING_PRESET_ALIASES[normalized] ?? null : null;
    const normalizedGardenValue = serviceType === "garden" ? GARDEN_AREA_PRESET_ALIASES[normalized] ?? null : null;
    const matched = presetRoomOptions.find(
      (room) =>
        room.toLowerCase() === normalized ||
        (normalizedExteriorValue ? room === normalizedExteriorValue : false) ||
        (normalizedGardenValue ? room === normalizedGardenValue : false),
    );
    if (matched) {
      setSelectedRoom(matched);
    }
  }, [presetRoom, presetRoomOptions, selectedRoom, serviceType]);

  useEffect(() => {
    if (workflowStep === 5 && generatedImageUrl) {
      triggerHaptic();
    }
  }, [generatedImageUrl, workflowStep]);

  useEffect(() => {
    if (!isPaintService) {
      return;
    }

    paintCurrentStrokeRef.current = null;
    setPaintCurrentStroke(null);
    setPaintStrokes([]);
    setPaintRedoStrokes([]);
    setPaintTutorialOpen(false);
    setPaintTutorialSeen(false);
    setPaintSurface("Auto");
    setPaintTool("brush");
    setPaintBrushWidth(28);
    setPaintColor("#D946EF");
    setPaintColorDraft("#D946EF");
  }, [isPaintService, selectedImage?.uri]);

  const selectedPalette = useMemo(
    () => PALETTE_OPTIONS.find((palette) => palette.id === selectedPaletteId) ?? null,
    [selectedPaletteId],
  );

  const selectedMode = useMemo(
    () => MODE_OPTIONS.find((mode) => mode.id === selectedModeId) ?? null,
    [selectedModeId],
  );

  const selectedAspectRatio = useMemo(
    () => ASPECT_RATIO_OPTIONS.find((option) => option.id === selectedAspectRatioId) ?? ASPECT_RATIO_OPTIONS[0],
    [selectedAspectRatioId],
  );

  const archivedBoardItems = useMemo<BoardRenderItem[]>(() => {
    return (generationArchive ?? []).map((generation) => ({
      id: generation._id,
      imageUrl: generation.imageUrl ?? null,
      originalImageUrl: generation.sourceImageUrl ?? null,
      styleLabel: generation.style ?? "Custom",
      roomLabel: generation.roomType ?? serviceLabel,
      serviceType: inferBoardServiceType(generation.style, generation.roomType),
      generationId: generation._id,
      status: generation.status ?? ((generation.imageUrl ?? "").length > 0 ? "ready" : "processing"),
      errorMessage: generation.errorMessage ?? null,
      createdAt: generation.createdAt ?? generation._creationTime,
    }));
  }, [generationArchive, serviceLabel]);

  const boardItems = useMemo<BoardRenderItem[]>(() => {
    const merged = new Map<string, BoardRenderItem>();
    for (const item of archivedBoardItems) {
      merged.set(item.id, item);
    }
    for (const item of pendingBoardItems) {
      if (!merged.has(item.id)) {
        merged.set(item.id, item);
      }
    }
    return Array.from(merged.values()).sort((left, right) => right.createdAt - left.createdAt);
  }, [archivedBoardItems, pendingBoardItems]);

  const activeBoardItem = useMemo(
    () => boardItems.find((item) => item.id === activeBoardItemId) ?? null,
    [activeBoardItemId, boardItems],
  );

  const ratioSpec = useMemo(() => resolveAspectRatio(selectedAspectRatio), [selectedAspectRatio]);
  const wizardColumnGap = 16;
  const wizardGridMaxWidth = useMemo(() => Math.min(width - 40, 980), [width]);
  const wizardCardColumns = width >= 1100 ? 3 : 2;
  const wizardCardWidth = useMemo(
    () =>
      Math.max(
        Math.min((wizardGridMaxWidth - wizardColumnGap * (wizardCardColumns - 1)) / wizardCardColumns, 312),
        148,
      ),
    [wizardCardColumns, wizardColumnGap, wizardGridMaxWidth],
  );
  const wizardStyleGap = 12;
  const wizardStyleColumns = width >= 1100 ? 3 : 2;
  const wizardStyleCardWidth = useMemo(
    () =>
      Math.max(
        Math.min((wizardGridMaxWidth - wizardStyleGap * (wizardStyleColumns - 1)) / wizardStyleColumns, 252),
        132,
      ),
    [wizardGridMaxWidth, wizardStyleColumns, wizardStyleGap],
  );
  const wizardPaletteGap = 12;
  const wizardPaletteColumns = width >= 1100 ? 3 : 2;
  const wizardPaletteCardWidth = useMemo(
    () =>
      Math.max(
        Math.min((wizardGridMaxWidth - wizardPaletteGap * (wizardPaletteColumns - 1)) / wizardPaletteColumns, 228),
        136,
      ),
    [wizardGridMaxWidth, wizardPaletteColumns, wizardPaletteGap],
  );
  const wizardModeGap = 12;
  const wizardModeGridMaxWidth = Math.min(wizardGridMaxWidth, 760);
  const wizardModeCardWidth = useMemo(
    () => Math.max((wizardModeGridMaxWidth - wizardModeGap) / 2, 148),
    [wizardModeGap, wizardModeGridMaxWidth],
  );
  const wizardExampleCardSize = useMemo(() => Math.min(Math.max(width * 0.27, 92), 118), [width]);
  const wizardUploadSize = useMemo(() => Math.max(Math.min(width - 56, 336), 252), [width]);

  const spaceOptions = useMemo(() => {
    if (serviceType === "exterior") return SPACE_OPTIONS.exterior;
    if (serviceType === "garden") return SPACE_OPTIONS.garden;
    return SPACE_OPTIONS.interior;
  }, [serviceType]);
  const examplePhotos = useMemo(() => {
    if (serviceType === "exterior") return EXTERIOR_EXAMPLE_PHOTOS;
    if (serviceType === "garden") return GARDEN_EXAMPLE_PHOTOS;
    if (serviceType === "floor") return FLOOR_EXAMPLE_PHOTOS;
    if (serviceType === "paint") return PAINT_EXAMPLE_PHOTOS;
    return INTERIOR_EXAMPLE_PHOTOS;
  }, [serviceType]);
  const styleOptions = useMemo(() => {
    if (serviceType === "exterior") return EXTERIOR_STYLE_OPTIONS;
    if (serviceType === "garden") return GARDEN_STYLE_OPTIONS;
    if (serviceType === "floor") return [] as string[];
    if (serviceType === "paint") return [] as string[];
    return STYLE_OPTIONS;
  }, [serviceType]);
  const selectedPaletteOrDefault = useMemo(
    () => selectedPalette ?? (isLeanGenerationService ? PALETTE_OPTIONS[0] : null),
    [isLeanGenerationService, selectedPalette],
  );
  const selectedModeOrDefault = useMemo(
    () => selectedMode ?? (isLeanGenerationService ? MODE_OPTIONS[0] : null),
    [isLeanGenerationService, selectedMode],
  );

  const plan = diagnostic ? "pro" : me?.plan ?? "free";
  const planUsed = plan === "pro" ? "pro" : plan === "trial" ? "trial" : "free";
  const hasPaidAccess = diagnostic ? true : me?.hasPaidAccess ?? false;
  const canExport4k = diagnostic ? true : me?.canExport4k ?? false;
  const canRemoveWatermark = diagnostic ? true : me?.canRemoveWatermark ?? false;
  const canEditDesigns = diagnostic ? true : me?.canEditDesigns ?? false;
  const generationSpeedTier = useMemo<GenerationSpeedTier>(() => {
    if (me?.subscriptionType === "yearly") {
      return "ultra";
    }
    if (hasPaidAccess) {
      return "pro";
    }
    return "standard";
  }, [hasPaidAccess, me?.subscriptionType]);
  const creditBalance = diagnostic ? 999 : viewerReady ? me?.credits ?? 3 : 3;
  const hasGenerationCredits = creditBalance > 0;
  const ignoreReviewCooldown = __DEV__ || process.env.EXPO_PUBLIC_REVIEW_FORCE === "1";
  const isDownloadingStandard = isDownloading === "standard";
  const isDownloadingUltra = isDownloading === "ultra";
  const openAuthWall = useCallback(
    (returnTo: string, resumeGeneration = false) => {
      setAwaitingAuth(resumeGeneration);
      router.push({ pathname: "/sign-in", params: { returnTo } });
    },
    [router],
  );
  const paintColorMeta = useMemo(
    () => PAINT_COLOR_SWATCHES.find((swatch) => swatch.value.toLowerCase() === paintColor.toLowerCase()) ?? null,
    [paintColor],
  );
  const selectedFinishOption = useMemo(
    () => FINISH_OPTIONS.find((option) => option.id === selectedFinishId) ?? null,
    [selectedFinishId],
  );
  const selectedWallColorOption = useMemo(
    () => WALL_COLOR_OPTIONS.find((option) => option.title === selectedStyle) ?? null,
    [selectedStyle],
  );
  const selectedFloorMaterialOption = useMemo(
    () => FLOOR_MATERIAL_OPTIONS.find((option) => option.title === selectedStyle) ?? null,
    [selectedStyle],
  );
  const paintSurfaceLabel = paintSurface === "Auto" ? "Wall" : paintSurface;
  const paintHasMask = useMemo(() => paintStrokes.some((stroke) => stroke.tool !== "eraser"), [paintStrokes]);
  const paintRenderedStrokes = useMemo(
    () => (paintCurrentStroke ? [...paintStrokes, paintCurrentStroke] : paintStrokes),
    [paintCurrentStroke, paintStrokes],
  );
  const paintBrushRatio = useMemo(() => (paintBrushWidth - 12) / (68 - 12), [paintBrushWidth]);
  const paintPreviewOverlayColor = useMemo(
    () => (paintColor.length === 7 ? `${paintColor}66` : "#ff000066"),
    [paintColor],
  );
  const activeEditorImageUrl = activeBoardItem?.imageUrl ?? generatedImageUrl;
  const sliderSpring = useMemo(() => ({ damping: 15, stiffness: 100 }), []);

  useEffect(() => {
    if (!boardView) {
      handledBoardRouteRef.current = null;
      return;
    }

    if (!viewerReady) {
      return;
    }

    const routeSignature = `${boardView}:${boardItemId ?? ""}:${entrySource ?? ""}`;
    if (handledBoardRouteRef.current === routeSignature) {
      return;
    }

    if (!effectiveSignedIn) {
      handledBoardRouteRef.current = routeSignature;
      router.replace("/workspace");
      return;
    }

    if (boardView === "board") {
      handledBoardRouteRef.current = routeSignature;
      setWorkflowStep(4);
      setActiveBoardItemId(null);
      setShowBeforeOnly(false);
      return;
    }

    if (boardView !== "editor" || !boardItemId) {
      return;
    }

    const targetItem = boardItems.find((item) => item.id === boardItemId || item.generationId === boardItemId) ?? null;
    if (!targetItem) {
      return;
    }

    handledBoardRouteRef.current = routeSignature;
    setWorkflowStep(5);
    setActiveBoardItemId(targetItem.id);
    setGeneratedImageUrl(targetItem.imageUrl ?? null);
    setGenerationId(targetItem.generationId ?? null);
    setShowBeforeOnly(false);
    setFeedbackState(null);
    setFeedbackSubmitted(false);
    if (sliderWidth.value > 0) {
      sliderX.value = withSpring(sliderWidth.value / 2, sliderSpring);
    }
  }, [boardItemId, boardItems, boardView, effectiveSignedIn, entrySource, openAuthWall, router, sliderSpring, sliderWidth, sliderX, viewerReady]);

  useEffect(() => {
    if (pendingBoardItems.length === 0 || archivedBoardItems.length === 0) {
      return;
    }

    setPendingBoardItems((current) =>
      current.filter((item) => !archivedBoardItems.some((archivedItem) => archivedItem.id === item.id)),
    );
  }, [archivedBoardItems, pendingBoardItems.length]);

  useEffect(() => {
    if (!generationId) {
      return;
    }

    const currentGeneration = boardItems.find((item) => item.generationId === generationId || item.id === generationId) ?? null;
    if (!currentGeneration) {
      return;
    }

    if (currentGeneration.status === "ready" && currentGeneration.imageUrl) {
      if (generatedImageUrl !== currentGeneration.imageUrl) {
        setGeneratedImageUrl(currentGeneration.imageUrl);
      }

      if (pendingReviewState) {
        setLastGenerationCount(pendingReviewState.count);
        if (pendingReviewState.shouldPrompt) {
          reviewHandledRef.current = false;
          setReviewPromptOpen(true);
          requestAnimationFrame(() => reviewSheetRef.current?.present());
        }
        setPendingReviewState(null);
      }
      return;
    }

    if (currentGeneration.status === "failed" && generationAlertedFailureRef.current !== currentGeneration.id) {
      generationAlertedFailureRef.current = currentGeneration.id;
      setPendingReviewState(null);
      showToast(currentGeneration.errorMessage ?? "Unable to generate your design right now.");
    }
  }, [boardItems, generatedImageUrl, generationId, pendingReviewState, showToast]);

  const handleSliderLayout = useCallback(
    (event: { nativeEvent: { layout: { width: number } } }) => {
      const width = event.nativeEvent.layout.width;
      if (!width || width === sliderWidth.value) return;
      sliderWidth.value = width;
      sliderX.value = withSpring(width / 2, sliderSpring);
    },
    [sliderSpring, sliderWidth, sliderX],
  );

  const sliderGesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          sliderStart.value = sliderX.value;
          runOnJS(setShowBeforeOnly)(false);
        })
        .onUpdate((event) => {
          const next = sliderStart.value + event.translationX;
          const max = sliderWidth.value || 1;
          sliderX.value = Math.max(0, Math.min(next, max));
        }),
    [sliderStart, sliderWidth, sliderX],
  );

  const afterImageStyle = useAnimatedStyle(() => ({
    width: sliderX.value,
  }));

  const sliderBarStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sliderX.value - 1 }],
  }));

  const likeButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const dislikeButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dislikeScale.value }],
  }));

  const canContinue = useMemo(() => {
    if (workflowStep === 0) return Boolean(selectedImage);
    if (workflowStep === 1) return Boolean(selectedRoom);
    if (workflowStep === 2) {
      if (!isPaintService && !isFloorService && selectedStyle === "Custom") {
        return customPrompt.trim().length > 0;
      }
      return Boolean(selectedStyle);
    }
    if (workflowStep === 3) {
      if (isPaintService || isFloorService) {
        return Boolean(selectedFinishId);
      }
      if (isLeanGenerationService) {
        return Boolean(selectedImage && selectedRoom && selectedStyle);
      }
      return Boolean(selectedModeId && selectedPaletteId);
    }
    return false;
  }, [
    customPrompt,
    isFloorService,
    isLeanGenerationService,
    isPaintService,
    selectedFinishId,
    selectedImage,
    selectedModeId,
    selectedPaletteId,
    selectedRoom,
    selectedStyle,
    workflowStep,
  ]);

  const openSystemSettings = useCallback(() => {
    Linking.openSettings().catch(() => undefined);
  }, []);

  const showPermissionAlert = useCallback(() => {
    Alert.alert(PHOTO_PERMISSION_ALERT_TITLE, PHOTO_PERMISSION_ALERT_MESSAGE, [
      { text: "Not now", style: "cancel" },
      { text: "Open Settings", onPress: openSystemSettings },
    ]);
  }, [openSystemSettings]);

  const ensureMediaLibraryPermission = useCallback(async () => {
    const current = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (current.granted) return true;

    const next = current.canAskAgain ? await ImagePicker.requestMediaLibraryPermissionsAsync() : current;
    if (next.granted) return true;

    showPermissionAlert();
    return false;
  }, [showPermissionAlert]);

  const ensureCameraPermission = useCallback(async () => {
    const current = await ImagePicker.getCameraPermissionsAsync();
    if (current.granted) return true;

    const next = current.canAskAgain ? await ImagePicker.requestCameraPermissionsAsync() : current;
    if (next.granted) return true;

    showPermissionAlert();
    return false;
  }, [showPermissionAlert]);

  const applyPickedAsset = useCallback((asset: ImagePicker.ImagePickerAsset, label: string) => {
    startTransition(() => {
      setSelectedImage({
        uri: asset.uri,
        label,
      });
    });
  }, []);

  const launchPhotoSource = useCallback(
    async (source: PhotoSource) => {
      const hasPermission =
        source === "camera" ? await ensureCameraPermission() : await ensureMediaLibraryPermission();
      if (!hasPermission) {
        return;
      }

      triggerHaptic();
      setIsSelectingPhoto(true);

      try {
        const result =
          source === "camera"
            ? await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.82,
                exif: false,
                cameraType: ImagePicker.CameraType.back,
              })
            : await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.82,
                exif: false,
              });

        if (result.canceled || !result.assets?.[0]) {
          return;
        }

        const asset = result.assets[0];
        applyPickedAsset(asset, source === "camera" ? "Captured Photo" : "Uploaded Photo");
      } catch (error) {
        Alert.alert(
          "Photo Intake Unavailable",
          error instanceof Error ? error.message : "We couldn't open your camera or photo library. Please try again.",
        );
      } finally {
        setIsSelectingPhoto(false);
      }
    },
    [applyPickedAsset, ensureCameraPermission, ensureMediaLibraryPermission],
  );

  const presentPhotoSourceMenu = useCallback(() => {
    const openSource = (source: PhotoSource) => {
      if (isSelectingPhoto) {
        return;
      }
      void launchPhotoSource(source);
    };

    if (process.env.EXPO_OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: "Add Room Photo",
          message: "Choose how you'd like to start Step 1.",
          options: ["Cancel", "📸 Take Photo", "🖼️ Upload from Gallery"],
          cancelButtonIndex: 0,
          userInterfaceStyle: "dark",
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            openSource("camera");
            return;
          }

          if (buttonIndex === 2) {
            openSource("library");
          }
        },
      );
      return;
    }

    Alert.alert("Add Room Photo", "Choose how you'd like to start Step 1.", [
      { text: "Cancel", style: "cancel" },
      { text: "📸 Take Photo", onPress: () => openSource("camera") },
      { text: "🖼️ Upload from Gallery", onPress: () => openSource("library") },
    ]);
  }, [isSelectingPhoto, launchPhotoSource]);

  const handlePickPhoto = useCallback(() => {
    if (isSelectingPhoto) {
      return;
    }
    triggerHaptic();
    presentPhotoSourceMenu();
  }, [isSelectingPhoto, presentPhotoSourceMenu]);

  const handleClearSelectedImage = useCallback(() => {
    triggerHaptic();
    startTransition(() => {
      setSelectedImage(null);
    });
    paintCurrentStrokeRef.current = null;
    setPaintCurrentStroke(null);
    setPaintStrokes([]);
    setPaintRedoStrokes([]);
    setIsLoadingExample(null);
    setIsSelectingPhoto(false);
  }, []);

  const handleSelectExample = useCallback(async (example: ExamplePhoto) => {
    try {
      triggerHaptic();
      setIsLoadingExample(example.id);
      const asset = Asset.fromModule(example.source);
      await asset.downloadAsync();
      const uri = asset.localUri ?? asset.uri;
      if (!uri) {
        throw new Error("Example image unavailable.");
      }
      startTransition(() => {
        setSelectedImage({ uri, label: example.label });
      });
    } catch (error) {
      Alert.alert("Example unavailable", error instanceof Error ? error.message : "Please try another image.");
    } finally {
      setIsLoadingExample(null);
    }
  }, []);

  const clampPaintPoint = useCallback(
    (x: number, y: number) => ({
      x: Math.max(0, Math.min(x, paintCanvasSize.width)),
      y: Math.max(0, Math.min(y, paintCanvasSize.height)),
    }),
    [paintCanvasSize.height, paintCanvasSize.width],
  );

  const startPaintStroke = useCallback(
    (x: number, y: number) => {
      if (!isPaintService || paintCanvasSize.width <= 0 || paintCanvasSize.height <= 0) {
        return;
      }

      const point = clampPaintPoint(x, y);
      const width = paintTool === "object" ? Math.max(paintBrushWidth * 2.35, 58) : paintBrushWidth;
      const stroke: PaintStroke = {
        id: `paint-stroke-${paintStrokeIdRef.current++}`,
        tool: paintTool,
        width,
        points: [point],
      };
      paintCurrentStrokeRef.current = stroke;
      setPaintCurrentStroke(stroke);
    },
    [clampPaintPoint, isPaintService, paintBrushWidth, paintCanvasSize.height, paintCanvasSize.width, paintTool],
  );

  const extendPaintStroke = useCallback(
    (x: number, y: number) => {
      const activeStroke = paintCurrentStrokeRef.current;
      if (!activeStroke) {
        return;
      }

      const nextPoint = clampPaintPoint(x, y);
      const nextStroke = {
        ...activeStroke,
        points: [...activeStroke.points, nextPoint],
      };
      paintCurrentStrokeRef.current = nextStroke;
      setPaintCurrentStroke(nextStroke);
    },
    [clampPaintPoint],
  );

  const finishPaintStroke = useCallback(() => {
    const activeStroke = paintCurrentStrokeRef.current;
    if (!activeStroke) {
      return;
    }

    const committedStroke =
      activeStroke.points.length === 1
        ? {
            ...activeStroke,
            points: [...activeStroke.points, activeStroke.points[0]],
          }
        : activeStroke;

    paintCurrentStrokeRef.current = null;
    setPaintCurrentStroke(null);
    setPaintRedoStrokes([]);
    setPaintStrokes((current) => [...current, committedStroke]);
  }, []);

  const handleSelectPaintTool = useCallback((tool: PaintTool) => {
    triggerHaptic();
    setPaintTool(tool);
  }, []);

  const handlePaintUndo = useCallback(() => {
    triggerHaptic();
    setPaintStrokes((current) => {
      if (current.length === 0) {
        return current;
      }
      const previous = current[current.length - 1];
      setPaintRedoStrokes((redo) => [previous, ...redo]);
      return current.slice(0, -1);
    });
  }, []);

  const handlePaintRedo = useCallback(() => {
    triggerHaptic();
    setPaintRedoStrokes((current) => {
      if (current.length === 0) {
        return current;
      }
      const [nextStroke, ...remaining] = current;
      setPaintStrokes((strokes) => [...strokes, nextStroke]);
      return remaining;
    });
  }, []);

  const updatePaintBrushWidth = useCallback((locationX: number) => {
    if (paintSliderWidth <= 0) {
      return;
    }
    const ratio = Math.max(0, Math.min(locationX / paintSliderWidth, 1));
    const nextWidth = Math.round(12 + ratio * (68 - 12));
    setPaintBrushWidth(nextWidth);
  }, [paintSliderWidth]);

  const handleOpenPaintColorPicker = useCallback(() => {
    triggerHaptic();
    setPaintColorDraft(paintColor);
    setPaintColorPickerOpen(true);
  }, [paintColor]);

  const handleClosePaintColorPicker = useCallback(() => {
    triggerHaptic();
    setPaintColorPickerOpen(false);
    setPaintColorDraft(paintColor);
  }, [paintColor]);

  const handleSelectPaintSwatch = useCallback((value: string) => {
    triggerHaptic();
    setPaintColorDraft(value.toUpperCase());
  }, []);

  const handleApplyPaintColor = useCallback(() => {
    const normalized = normalizeHexColor(paintColorDraft);
    if (!normalized) {
      Alert.alert("Invalid color", "Enter a valid 6-digit hex color like #D946EF.");
      return;
    }
    triggerHaptic();
    setPaintColor(normalized);
    setPaintColorPickerOpen(false);
  }, [paintColorDraft]);

  const handleSelectPaintSurface = useCallback((value: PaintSurfaceOption["value"]) => {
    triggerHaptic();
    setPaintSurface(value);
    setPaintSurfacePickerOpen(false);
  }, []);

  const handleDismissPaintTutorial = useCallback(() => {
    triggerHaptic();
    setPaintTutorialOpen(false);
  }, []);

  const paintGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin((event) => {
          runOnJS(startPaintStroke)(event.x, event.y);
        })
        .onUpdate((event) => {
          runOnJS(extendPaintStroke)(event.x, event.y);
        })
        .onEnd(() => {
          runOnJS(finishPaintStroke)();
        })
        .onFinalize(() => {
          runOnJS(finishPaintStroke)();
        }),
    [extendPaintStroke, finishPaintStroke, startPaintStroke],
  );

  const paintSliderGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin((event) => {
          runOnJS(updatePaintBrushWidth)(event.x);
        })
        .onUpdate((event) => {
          runOnJS(updatePaintBrushWidth)(event.x);
        }),
    [updatePaintBrushWidth],
  );

  const handleBack = useCallback(() => {
    triggerHaptic();
    if (workflowStep === 0) {
      router.back();
      return;
    }
    if (workflowStep === 4) {
      return;
    }
    if (workflowStep === 5) {
      setWizardNavDirection(-1);
      setWorkflowStep(effectiveSignedIn ? 4 : 3);
      return;
    }
    setWizardNavDirection(-1);
    setWorkflowStep((prev) => Math.max(prev - 1, 0));
  }, [effectiveSignedIn, router, workflowStep]);

  const handleResetWizard = useCallback(() => {
    triggerHaptic();
    setWizardNavDirection(-1);
    setDraftImage(null);
    setDraftRoom(null);
    setDraftStyle(null);
    setDraftPalette(null);
    setDraftPrompt(null);
    setDraftAspectRatio(null);
    startTransition(() => {
      setWorkflowStep(0);
      setSelectedImage(null);
      setSelectedRoom(null);
      setSelectedStyle(null);
      setSelectedFinishId(null);
      setSelectedModeId(null);
      setCustomPrompt("");
      setSelectedPaletteId(null);
      setSelectedAspectRatioId("post");
      setGeneratedImageUrl(null);
      setGenerationId(null);
      generationAlertedFailureRef.current = null;
      setPendingReviewState(null);
      setActiveBoardItemId(null);
      setShowBeforeOnly(false);
      setFeedbackMessage("");
      setFeedbackState(null);
      setFeedbackSubmitted(false);
      setLastGenerationCount(null);
      setPaintTool("brush");
      setPaintBrushWidth(28);
      setPaintColor("#D946EF");
      setPaintColorDraft("#D946EF");
      setPaintSurface("Auto");
      setPaintStrokes([]);
      setPaintRedoStrokes([]);
      setPaintCurrentStroke(null);
      paintCurrentStrokeRef.current = null;
      setPaintTutorialOpen(false);
      setPaintTutorialSeen(false);
      setPaintColorPickerOpen(false);
      setPaintSurfacePickerOpen(false);
    });
    setIsLoadingExample(null);
    setIsSelectingPhoto(false);
    setCustomPromptDraft("");
    setIsCustomPromptViewOpen(false);
    setReviewPromptOpen(false);
    setRatePromptOpen(false);
    setFeedbackOpen(false);
    setAwaitingAuth(false);
  }, [setDraftAspectRatio, setDraftImage, setDraftPalette, setDraftPrompt, setDraftRoom, setDraftStyle]);

  const handleCloseWizard = useCallback(() => {
    handleResetWizard();
  }, [handleResetWizard]);

  const cleanupTempFile = useCallback(async (uri: string | null | undefined) => {
    if (!uri) {
      return;
    }
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {
      // ignore temp cleanup errors
    }
  }, []);

  const ensureGallerySavePermission = useCallback(async () => {
    const permission = await MediaLibrary.requestPermissionsAsync();
    if (permission.granted) {
      return true;
    }

    Alert.alert("Permission required", "Please allow photo access to save your render.");
    return false;
  }, []);

  const exportCurrentRender = useCallback(async () => {
    if (canRemoveWatermark) {
      if (!activeEditorImageUrl) {
        throw new Error("Render unavailable. Please try again.");
      }
      const targetUri = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? ""}darkor-share-${Date.now()}.jpg`;
      const download = await FileSystem.downloadAsync(activeEditorImageUrl, targetUri);
      return download.uri;
    }

    if (!imageContainerRef.current) {
      throw new Error("Preview not ready. Please try again.");
    }

    const previousSlider = sliderX.value;
    if (sliderWidth.value > 0) {
      sliderX.value = sliderWidth.value;
    }
    await new Promise((resolve) => setTimeout(resolve, 80));
    try {
      const fileUri = await captureRef(imageContainerRef, { format: "png", quality: 1, result: "tmpfile" });
      return fileUri;
    } finally {
      if (sliderWidth.value > 0) {
        sliderX.value = previousSlider;
      }
    }
  }, [activeEditorImageUrl, canRemoveWatermark, imageContainerRef, sliderWidth, sliderX]);

  const handleShare = useCallback(async () => {
    triggerHaptic();
    if (!activeEditorImageUrl) {
      Alert.alert("Nothing to share", "Generate an image first.");
      return;
    }

    let tempUri: string | null = null;
    try {
      setIsSharingResult(true);
      tempUri = await exportCurrentRender();
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(tempUri, { dialogTitle: "Share your Darkor design" });
      } else {
        await Share.share({ message: "Designed with Darkor.ai", url: tempUri });
      }
    } catch (error) {
      Alert.alert("Share failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      await cleanupTempFile(tempUri);
      setIsSharingResult(false);
    }
  }, [activeEditorImageUrl, cleanupTempFile, exportCurrentRender]);


  const handleUpgrade = useCallback(() => {
    triggerHaptic();
    router.push("/paywall");
  }, [router]);

  const handleDownloadStandard = useCallback(async () => {
    triggerHaptic();
    if (!activeEditorImageUrl) {
      Alert.alert("Nothing to download", "Generate an image first.");
      return;
    }

    let tempUri: string | null = null;
    try {
      setIsDownloading("standard");
      const granted = await ensureGallerySavePermission();
      if (!granted) {
        return;
      }

      tempUri = await exportCurrentRender();
      await MediaLibrary.saveToLibraryAsync(tempUri);
      showToast("Saved to Photos");
    } catch (error) {
      Alert.alert("Download failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      await cleanupTempFile(tempUri);
      setIsDownloading(null);
    }
  }, [activeEditorImageUrl, cleanupTempFile, ensureGallerySavePermission, exportCurrentRender, showToast]);

  const handleDownloadUltra = useCallback(async () => {
    triggerHaptic();
    if (!activeEditorImageUrl) {
      Alert.alert("Nothing to download", "Generate an image first.");
      return;
    }

    if (!canExport4k) {
      handleUpgrade();
      return;
    }

    let tempUri: string | null = null;
    try {
      setIsDownloading("ultra");
      const granted = await ensureGallerySavePermission();
      if (!granted) {
        return;
      }

      tempUri = await exportCurrentRender();
      await MediaLibrary.saveToLibraryAsync(tempUri);
      showToast("Saved to Photos");
    } catch (error) {
      Alert.alert("Download failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      await cleanupTempFile(tempUri);
      setIsDownloading(null);
    }
  }, [activeEditorImageUrl, canExport4k, cleanupTempFile, ensureGallerySavePermission, exportCurrentRender, handleUpgrade, showToast]);



  const animateFeedbackButton = useCallback((target: "liked" | "disliked") => {
    const scale = target === "liked" ? likeScale : dislikeScale;
    scale.value = withSequence(withSpring(1.14, { damping: 11, stiffness: 260 }), withSpring(1, { damping: 13, stiffness: 220 }));
  }, [dislikeScale, likeScale]);

  const handleLike = useCallback(async () => {
    if (!generationId || feedbackSubmitted) return;
    triggerHaptic();
    animateFeedbackButton("liked");
    setFeedbackState("liked");
    setFeedbackSubmitted(true);
    try {
      await submitGenerationFeedback({ anonymousId, id: generationId, sentiment: "liked" });
      showToast("Feedback saved. We will lean into results like this.");
    } catch (error) {
      setFeedbackState(null);
      setFeedbackSubmitted(false);
      Alert.alert("Feedback failed", error instanceof Error ? error.message : "Please try again.");
    }
  }, [animateFeedbackButton, anonymousId, feedbackSubmitted, generationId, showToast, submitGenerationFeedback]);

  const handleDislike = useCallback(async () => {
    if (!generationId || feedbackSubmitted) return;
    triggerHaptic();
    animateFeedbackButton("disliked");
    setFeedbackState("disliked");
    setFeedbackSubmitted(true);
    try {
      await submitGenerationFeedback({
        anonymousId,
        id: generationId,
        sentiment: "disliked",
      });
      showToast("Feedback saved. We will use it to improve future renders.");
    } catch (error) {
      setFeedbackState(null);
      setFeedbackSubmitted(false);
      Alert.alert("Feedback failed", error instanceof Error ? error.message : "Please try again.");
    }
  }, [animateFeedbackButton, anonymousId, feedbackSubmitted, generationId, showToast, submitGenerationFeedback]);


  const uploadSelectedImageToStorage = useCallback(async (image: SelectedImage) => {
    const uploadUrl = (await createSourceUploadUrl(viewerArgs)) as string;
    const blob = await readBlobFromUri(image.uri);
    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": blob.type || "image/jpeg",
      },
      body: blob,
    });

    if (!uploadResponse.ok) {
      throw new Error("Unable to upload the source image to Convex Storage.");
    }

    const uploadResult = (await uploadResponse.json()) as { storageId?: string };
    if (!uploadResult.storageId) {
      throw new Error("Convex did not return a storage id for the uploaded source image.");
    }

    return uploadResult.storageId;
  }, [createSourceUploadUrl, viewerArgs]);

  const handleGenerate = useCallback(async (options?: { regenerate?: boolean; customPromptOverride?: string }) => {
    if (!diagnostic && !viewerReady) {
      Alert.alert("Preparing your session", "Your guest profile is still loading. Please try again in a moment.");
      return;
    }

    if (isFloorService) {
      if (!selectedImage || !selectedRoom || !selectedStyle || !selectedFinishOption || !selectedFloorMaterialOption) {
        Alert.alert("Complete the steps", "Add a room photo, select your space type, curate a material, and choose a finish before continuing.");
        return;
      }
    } else if (isPaintService) {
      if (!selectedImage || !selectedRoom || !selectedStyle || !selectedFinishOption || !selectedWallColorOption) {
        Alert.alert("Complete the steps", "Add a room photo, select your space type, curate a wall color, and choose a finish before continuing.");
        return;
      }
    } else if (!selectedImage || !selectedRoom || !selectedStyle || !selectedPaletteOrDefault || !selectedModeOrDefault) {
      Alert.alert("Complete the steps", "Please finish the previous steps first.");
      return;
    }

    if (!diagnostic && !hasGenerationCredits) {
      if (!effectiveSignedIn) {
        openAuthWall("/workspace", true);
        return;
      }

      router.push("/paywall");
      return;
    }

    const requestStartedAt = Date.now();
    const activeSelectedImage = selectedImage;
    if (!activeSelectedImage) {
      return;
    }
    const temporaryBoardId = `pending-${requestStartedAt}`;
    const selectedSpaceLabel = selectedRoom ?? serviceLabel;
    const finishLabel = selectedFinishOption?.title ?? "Matte";
    const paintColorLabel = selectedWallColorOption?.title ?? selectedStyle ?? "Sage Green";
    const paintColorValue = selectedWallColorOption?.value ?? "#7C9174";
    const paintStyleLabel = `${paintColorLabel} Paint`;
    const floorMaterialLabel = selectedFloorMaterialOption?.title ?? selectedStyle ?? "Hardwood";
    const floorStyleLabel = `${floorMaterialLabel} Flooring`;
    const generationSelection = isFloorService
      ? `${selectedFloorMaterialOption?.promptLabel ?? floorMaterialLabel} with a ${finishLabel.toLowerCase()} finish`
      : isPaintService
        ? `${paintColorLabel} (${paintColorValue}) with a ${finishLabel.toLowerCase()} finish`
        : selectedStyle!;
    const generationDisplayStyle = isFloorService ? floorStyleLabel : isPaintService ? paintStyleLabel : selectedStyle!;
    const generationCustomPrompt = isFloorService
      ? `Preserve the walls, furniture, decor, cabinetry, windows, doors, ceiling, lighting, shadows, and camera framing exactly while applying a ${finishLabel.toLowerCase()} surface read.`
      : isPaintService
        ? "Preserve the flooring, furniture, decor, windows, doors, ceiling, lighting, shadows, and camera framing exactly while keeping the repaint photorealistic."
        : selectedStyle === "Custom" && customPrompt.trim().length > 0
          ? customPrompt.trim()
          : undefined;
    const backendServiceType = isFloorService || isPaintService ? serviceType : "redesign";
    const processingBoardItem: BoardRenderItem = {
      id: temporaryBoardId,
      imageUrl: null,
      originalImageUrl: activeSelectedImage.uri,
      styleLabel: generationDisplayStyle,
      roomLabel: selectedSpaceLabel,
      serviceType,
      generationId: null,
      status: "processing",
      errorMessage: null,
      createdAt: requestStartedAt,
    };

    try {
      setFeedbackState(null);
      setFeedbackSubmitted(false);
      setGeneratedImageUrl(null);
      setGenerationId(null);
      generationAlertedFailureRef.current = null;
      setPendingReviewState(null);
      setIsGenerating(true);
      setActiveBoardItemId(temporaryBoardId);
      setPendingBoardItems((current) => [processingBoardItem, ...current.filter((item) => item.id !== temporaryBoardId)]);
      setWorkflowStep(5);

      const imageStorageId = await uploadSelectedImageToStorage(activeSelectedImage);
      const startResult = (await startGeneration({
        anonymousId,
        imageStorageId,
        serviceType: backendServiceType,
        selection: generationSelection,
        roomType: selectedSpaceLabel,
        displayStyle: generationDisplayStyle,
        customPrompt: generationCustomPrompt,
        aspectRatio: ratioSpec.ratioLabel,
        regenerate: options?.regenerate ?? false,
        ignoreReviewCooldown,
      })) as {
        generationId: string;
        reviewState?: { count: number; shouldPrompt: boolean };
      };

      setPendingBoardItems((current) =>
        current.map((item) =>
          item.id === temporaryBoardId
            ? {
                ...item,
                id: startResult.generationId,
                generationId: startResult.generationId,
              }
            : item,
        ),
      );
      setActiveBoardItemId((current) => (current === temporaryBoardId ? startResult.generationId : current));
      setGenerationId(startResult.generationId);
      setPendingReviewState(startResult.reviewState ?? null);
      if (startResult.reviewState) {
        setLastGenerationCount(startResult.reviewState.count);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";
      const isPaymentRequired = message === "Payment Required";
      if (!diagnostic && !hasGenerationCredits) {
        setPendingBoardItems((current) => current.filter((item) => item.id !== temporaryBoardId));
        if (!effectiveSignedIn) {
          openAuthWall("/workspace", true);
          return;
        }
        router.push("/paywall");
        return;
      }
      setPendingBoardItems((current) =>
        current.map((item) =>
          item.id === temporaryBoardId
            ? {
                ...item,
                status: "failed",
                errorMessage: message,
              }
            : item,
        ),
      );
      if (isPaymentRequired) {
        setPendingBoardItems((current) => current.filter((item) => item.id !== temporaryBoardId));
        if (!effectiveSignedIn) {
          openAuthWall("/workspace", true);
          return;
        }
        router.push("/paywall");
        return;
      }
      showToast(message);
    } finally {
      setIsGenerating(false);
    }
  }, [
    createSourceUploadUrl,
    customPrompt,
    diagnostic,
    anonymousId,
    effectiveSignedIn,
    isFloorService,
    generationSpeedTier,
    hasGenerationCredits,
    ignoreReviewCooldown,
    isPaintService,
    openAuthWall,
    ratioSpec.ratioLabel,
    router,
    selectedFinishOption,
    selectedFloorMaterialOption,
    selectedImage,
    selectedModeOrDefault,
    selectedPaletteOrDefault,
    selectedRoom,
    selectedStyle,
    selectedWallColorOption,
    serviceLabel,
    serviceType,
    showToast,
    startGeneration,
    uploadSelectedImageToStorage,
    viewerReady,
  ]);

  useEffect(() => {
    if (!effectiveSignedIn || !awaitingAuth || !viewerReady) return;
    if (!canContinue) {
      setAwaitingAuth(false);
      return;
    }
    setAwaitingAuth(false);
    const timer = setTimeout(() => {
      void handleGenerate();
    }, 300);
    return () => clearTimeout(timer);
  }, [awaitingAuth, canContinue, effectiveSignedIn, handleGenerate, viewerReady]);

  const handleContinue = useCallback(() => {
    triggerHaptic();
    if (!canContinue) {
      Alert.alert("Complete this step", "Please make a selection to continue.");
      return;
    }

    if (workflowStep === 3) {
      if (!diagnostic && !hasGenerationCredits) {
        if (!effectiveSignedIn) {
          openAuthWall("/workspace", true);
          return;
        }
        router.push("/paywall");
        return;
      }
      void handleGenerate();
      return;
    }

    setWizardNavDirection(1);
    startTransition(() => {
      setWorkflowStep((prev) => Math.min(prev + 1, 3));
    });
  }, [canContinue, diagnostic, effectiveSignedIn, handleGenerate, hasGenerationCredits, openAuthWall, router, workflowStep]);

  const handleSelectRoom = useCallback((value: string) => {
    triggerHaptic();
    setSelectedRoom((current) => (current === value ? null : value));
  }, []);

  const handleCloseCustomStyle = useCallback(() => {
    triggerHaptic();
    setIsCustomPromptViewOpen(false);
    setCustomPromptDraft(customPrompt);
  }, [customPrompt]);

  const handleClearCustomPromptDraft = useCallback(() => {
    triggerHaptic();
    setCustomPromptDraft("");
  }, []);

  const handleApplyCustomPrompt = useCallback(() => {
    const trimmed = customPromptDraft.trim();
    if (!trimmed) {
      Alert.alert("Add a custom prompt", "Describe the exact design direction you want before applying it.");
      return;
    }

    triggerHaptic();
    setWizardNavDirection(1);
    startTransition(() => {
      setCustomPrompt(trimmed);
      setSelectedStyle("Custom");
      setIsCustomPromptViewOpen(false);
      setWorkflowStep(3);
    });
  }, [customPromptDraft]);

  const handleSelectStyle = useCallback((value: string) => {
    triggerHaptic();
    if (value === "Custom") {
      setCustomPromptDraft(customPrompt);
      setIsCustomPromptViewOpen(true);
      return;
    }
    startTransition(() => {
      setSelectedStyle((current) => (current === value ? null : value));
    });
  }, [customPrompt]);

  const handleChangeCustomPrompt = useCallback((value: string) => {
    setCustomPromptDraft(value);
  }, []);

  const handleSelectCustomPromptExample = useCallback((value: string) => {
    triggerHaptic();
    setCustomPromptDraft((current) => togglePromptBlock(current, value));
  }, []);

  const handleSelectFinish = useCallback((value: FinishOption["id"]) => {
    triggerHaptic();
    setSelectedFinishId((current) => (current === value ? null : value));
  }, []);

  const handleSelectPalette = useCallback((value: string) => {
    triggerHaptic();
    setSelectedPaletteId(value);
  }, []);

  const handleSelectMode = useCallback((value: ModeOption["id"]) => {
    triggerHaptic();
    setSelectedModeId(value);
  }, []);

  const handleSelectAspectRatio = useCallback((value: AspectRatioOption["id"]) => {
    triggerHaptic();
    setSelectedAspectRatioId(value);
  }, []);

  const handleOpenBoardItem = useCallback((item: BoardRenderItem) => {
    if (!effectiveSignedIn) {
      openAuthWall(`/workspace?boardView=editor&boardItemId=${encodeURIComponent(item.id)}`);
      return;
    }

    if (item.status === "processing") {
      showToast("Your redesign is still processing.");
      return;
    }

    if (item.status === "failed" || !item.imageUrl) {
      Alert.alert("Generation failed", item.errorMessage ?? "This redesign did not finish. Please try generating again.");
      return;
    }

    if (!canEditDesigns) {
      router.push("/paywall");
      return;
    }

    triggerHaptic();
    setWizardNavDirection(1);
    setWorkflowStep(5);
    setActiveBoardItemId(item.id);
    setGeneratedImageUrl(item.imageUrl);
    setGenerationId(item.generationId ?? null);
    setShowBeforeOnly(false);
    setFeedbackState(null);
    setFeedbackSubmitted(false);
    if (sliderWidth.value > 0) {
      sliderX.value = withSpring(sliderWidth.value / 2, sliderSpring);
    }
  }, [canEditDesigns, effectiveSignedIn, openAuthWall, router, showToast, sliderSpring, sliderWidth, sliderX]);

  const handleCloseBoardEditor = useCallback(() => {
    triggerHaptic();
    if (entrySource === "gallery") {
      router.replace("/gallery");
      return;
    }
    if (entrySource === "profile") {
      router.replace("/profile");
      return;
    }
    setWizardNavDirection(-1);
    setWorkflowStep(effectiveSignedIn ? (isFloorService ? 2 : 4) : 3);
    setActiveBoardItemId(null);
    setShowBeforeOnly(false);
  }, [effectiveSignedIn, entrySource, isFloorService, router]);

  const handleToggleBeforePreview = useCallback(() => {
    triggerHaptic();
    const nextValue = !showBeforeOnly;
    setShowBeforeOnly(nextValue);
    if (sliderWidth.value > 0) {
      sliderX.value = withSpring(nextValue ? 0 : sliderWidth.value / 2, sliderSpring);
    }
  }, [showBeforeOnly, sliderSpring, sliderWidth, sliderX]);

  const performDeleteBoardItem = useCallback(async () => {
    const item = activeBoardItem;
    if (!item) {
      return;
    }

    try {
      setIsDeletingGeneration(true);
      if (item.generationId) {
        await deleteGeneration({ anonymousId, id: item.generationId });
      }

      setPendingBoardItems((current) => current.filter((entry) => entry.id !== item.id));
      setActiveBoardItemId(null);
      setGeneratedImageUrl(null);
      setGenerationId(null);
      generationAlertedFailureRef.current = null;
      setPendingReviewState(null);
      setShowBeforeOnly(false);
      showToast("Design removed from your board.");
    } catch (error) {
      Alert.alert("Delete failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsDeletingGeneration(false);
    }
  }, [activeBoardItem, anonymousId, deleteGeneration, showToast]);

  const handleDeleteBoardItem = useCallback(() => {
    const item = activeBoardItem;
    if (!item) {
      return;
    }

    triggerHaptic();
    Alert.alert(
      "Delete design",
      "This will remove the design from your board and delete it from your gallery.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void performDeleteBoardItem();
          },
        },
      ],
    );
  }, [activeBoardItem, performDeleteBoardItem]);

  const handleBoardHistory = useCallback(() => {
    triggerHaptic();
    showToast("Generation history is coming next.");
  }, [showToast]);

  const handleReviewYes = useCallback(async () => {
    triggerHaptic();
    reviewHandledRef.current = true;
    setReviewPromptOpen(false);
    reviewSheetRef.current?.dismiss();
    try {
      await markReviewPrompted({ anonymousId });
    } catch {
      // noop
    }
    setRatePromptOpen(true);
    requestAnimationFrame(() => rateSheetRef.current?.present());
  }, [anonymousId, markReviewPrompted]);

  const handleReviewNo = useCallback(async () => {
    triggerHaptic();
    reviewHandledRef.current = true;
    setReviewPromptOpen(false);
    reviewSheetRef.current?.dismiss();
    try {
      await markReviewPrompted({ anonymousId });
    } catch {
      // noop
    }
    setFeedbackOpen(true);
    requestAnimationFrame(() => feedbackSheetRef.current?.present());
  }, [anonymousId, markReviewPrompted]);

  const handleRateNow = useCallback(async () => {
    triggerHaptic();
    setRatePromptOpen(false);
    rateSheetRef.current?.dismiss();
    await requestStoreReview();
  }, []);

  const handleRateLater = useCallback(() => {
    triggerHaptic();
    setRatePromptOpen(false);
    rateSheetRef.current?.dismiss();
  }, []);

  const handleSubmitFeedback = useCallback(async () => {
    if (feedbackMessage.trim().length < 3) {
      Alert.alert("Feedback", "Please add a few words so we can help.");
      return;
    }
    triggerHaptic();
    setIsSubmittingFeedback(true);
    try {
      await submitFeedback({
        anonymousId,
        message: feedbackMessage.trim(),
        generationCount: lastGenerationCount ?? undefined,
      });
        setFeedbackMessage("");
        setFeedbackOpen(false);
        feedbackSheetRef.current?.dismiss();
      Alert.alert("Thank you", "Your feedback helps us improve quickly.");
    } catch (error) {
      Alert.alert("Feedback", error instanceof Error ? error.message : "Unable to send feedback.");
    } finally {
      setIsSubmittingFeedback(false);
    }
  }, [anonymousId, feedbackMessage, lastGenerationCount, submitFeedback]);

  const stepTransition = LUX_SPRING;
  const isPhotoPreviewBusy = isSelectingPhoto || isLoadingExample !== null;

  if (isPaintService) {
    return <PaintWizard />;
  }

  if (isFloorService) {
    return <FloorWizard />;
  }

  if (workflowStep <= 3) {
    const currentStepNumber = workflowStep + 1;
    const totalWizardSteps = 4;
    const isFinalWizardStep = workflowStep === 3;
    const isPhotoStep = workflowStep === 0;
    const isSpaceStep = workflowStep === 1;
    const isPaintSelectionStep = isPaintService && workflowStep === 2;
    const isFloorSelectionStep = isFloorService && workflowStep === 2;
    const isStyleStep = workflowStep === 2;
    const isServiceFinishStep = (isPaintService || isFloorService) && workflowStep === 3;
    const isLeanGenerateStep = isLeanGenerationService && workflowStep === 3;
    const isTabbedWorkspaceRoute = pathname === "/workspace";
    const displayedSelectedImage = selectedImage;
    const hasSelectedPhoto = Boolean(selectedImage);
    const hasVisiblePhoto = Boolean(displayedSelectedImage);
    const activeExampleLabel = selectedImage?.label ?? null;
    const wizardBackgroundColor = SERVICE_WIZARD_THEME.colors.background;
    const wizardPrimaryTextColor = SERVICE_WIZARD_THEME.colors.textPrimary;
    const wizardMutedTextColor = SERVICE_WIZARD_THEME.colors.textMuted;
    const wizardSurfaceColor = SERVICE_WIZARD_THEME.colors.surface;
    const wizardSurfaceBorderColor = SERVICE_WIZARD_THEME.colors.borderStrong;
    const wizardActiveSurfaceColor = SERVICE_WIZARD_THEME.colors.accentSurface;
    const headerButtonBorderColor = SERVICE_WIZARD_THEME.colors.borderStrong;
    const headerButtonBackgroundColor = "rgba(255,255,255,0.04)";
    const uploadTileSize = wizardUploadSize;
    const stepOneExampleCardWidth = Math.min(Math.max(width * 0.28, 112), 126);
    const stepOneExampleCardHeight = Math.round(stepOneExampleCardWidth * 1.2);
    const bottomBarOffset = isTabbedWorkspaceRoute ? 86 : 0;
    const stepContentMinHeight = Math.max(
      height -
        Math.max(insets.top + (isPhotoStep ? 18 : 8), isPhotoStep ? 24 : 20) -
        Math.max(
          insets.bottom + bottomBarOffset + (isPhotoStep ? 148 : 124),
          bottomBarOffset + (isPhotoStep ? 176 : 144),
        ),
      isPhotoStep ? 520 : 460,
    );
    const continueButtonHeight = isPhotoStep ? 64 : 62;
    const continueButtonRadius = isPhotoStep ? 20 : 24;
    const isContinueDisabled = !canContinue || (isFinalWizardStep && isGenerating);
    const isContinueActive = canContinue && !isContinueDisabled;
    const shouldPulseContinue = (isPhotoStep || isServiceFinishStep) ? isContinueActive : false;
    const continueButtonOpacity = isContinueActive ? 1 : 0.58;
    const selectedCustomPromptBlocks = new Set(getPromptBlocks(customPromptDraft));
    const stepOneTitle = isFloorService ? "Floor Restyle" : isPaintService ? "Add a Photo" : isGardenService ? "Add a Garden Photo" : isExteriorService ? "Add an Exterior Photo" : "Add a Photo";
    const emptyUploadTitle = isFloorService ? "Add Floor Photo" : isPaintService ? "Add a Photo" : isGardenService ? "Start Your Garden Redesign" : isExteriorService ? "Start Exterior Redesign" : "Start Redesigning";
    const stepOneDescription = isGardenService
      ? "Upload an outdoor scene so Darkor.ai can elevate the landscape with a composed, architectural point of view."
      : isFloorService
        ? "Upload a room image so Darkor.ai can read the floor plane and stage a premium material transformation."
      : isPaintService
        ? "Upload a room photo and Darkor.ai will prepare it for a precise, designer-led wall recoloring."
      : isExteriorService
        ? "Upload a building photo so Darkor.ai can reimagine the facade with a polished architectural language."
        : "Upload a room photo so Darkor.ai can compose a coherent, elevated redesign.";
    const stepTwoTitle = "Select your space type";
    const stepTwoDescription = isExteriorService
      ? "Choose the architectural envelope that best matches the facade you want to reimagine."
      : isGardenService
        ? "Choose the outdoor zone you want Darkor.ai to elevate first."
        : "Tell Darkor.ai which room typology it should redesign so the proposal stays architecturally grounded.";
    const stepThreeTitle = isPaintService
      ? "Curate the wall color"
      : isFloorService
        ? "Curate the floor material"
        : "Curate the style direction";
    const stepThreeDescription = isPaintService
      ? "Select the wall tone Darkor.ai should introduce once the masked surfaces are refined."
      : isFloorService
        ? "Select the flooring material Darkor.ai should compose into the visible floor plane."
        : isExteriorService
      ? "Choose the architectural language that should guide the exterior transformation."
      : isGardenService
        ? "Choose the landscape expression Darkor.ai should use for the garden redesign."
        : "Choose a curated design direction, or write a custom architectural brief.";
    const stepFourTitle = isPaintService ? "Refine the finish" : isFloorService ? "Refine the finish" : "Refine the creative direction";
    const stepFourDescription = isPaintService
      ? "Choose how the selected wall color should catch light so the render feels tailored, realistic, and high-end."
      : isFloorService
        ? "Choose how the selected flooring material should read under light once Darkor.ai maps it into the space."
        : "Choose the design intensity and palette family before Darkor.ai unveils the final composition.";
    const wizardSectionHeaderStyle = { gap: 12, alignItems: "center" as const };
    const wizardSectionBodyStyle = {
      color: wizardMutedTextColor,
      fontSize: 15,
      lineHeight: 24,
      maxWidth: Math.min(wizardGridMaxWidth, 720),
      textAlign: "center" as const,
    };
    const wizardCenteredGridStyle = {
      width: "100%" as const,
      maxWidth: wizardGridMaxWidth,
      alignSelf: "center" as const,
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      justifyContent: "center" as const,
      gap: wizardColumnGap,
    };
    const wizardPaletteGridStyle = {
      width: "100%" as const,
      maxWidth: wizardGridMaxWidth,
      alignSelf: "center" as const,
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      justifyContent: "center" as const,
      gap: wizardPaletteGap,
    };
    const wizardModeGridStyle = {
      width: "100%" as const,
      maxWidth: wizardModeGridMaxWidth,
      alignSelf: "center" as const,
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      justifyContent: "center" as const,
      gap: wizardModeGap,
    };
    const showContinueBar = !isCustomPromptViewOpen;
    const continueLabel = isPhotoStep
      ? "Continue"
      : isFinalWizardStep
      ? isGenerating
        ? "Generating..."
        : isLeanGenerateStep || isServiceFinishStep
          ? hasGenerationCredits
            ? "Generate Render"
            : "Get more credits"
          : hasGenerationCredits
            ? "Generate Renders"
            : "Get more credits"
      : isSpaceStep && (isPaintService || isFloorService)
        ? "Continue to Step 3"
      : isPaintSelectionStep || isFloorSelectionStep
        ? "Continue to Refine"
        : `Continue to Step ${currentStepNumber + 1}`;

    return (
      <View className="flex-1" style={{ backgroundColor: wizardBackgroundColor }}>
        {showResumeToast ? (
          <MotiView
            from={{ opacity: 0, translateY: -12 }}
            animate={{ opacity: 1, translateY: 0 }}
            exit={{ opacity: 0, translateY: -12 }}
            transition={LUX_SPRING}
            className="absolute left-5 right-5 z-20"
            style={{ top: insets.top + 8 }}
            pointerEvents="none"
          >
            <View
              className="rounded-[22px] px-4 py-3"
              style={{
                borderWidth: 1,
                borderColor: isPhotoStep ? "rgba(255,255,255,0.08)" : "rgba(9,9,11,0.06)",
                backgroundColor: isPhotoStep ? "rgba(17,17,19,0.94)" : "#ffffff",
              }}
            >
              <Text className="text-center text-sm font-semibold" style={{ color: wizardPrimaryTextColor }}>
                Resuming your saved wizard draft.
              </Text>
            </View>
          </MotiView>
        ) : null}

        <ScrollView
          className="flex-1"
          style={{ backgroundColor: wizardBackgroundColor }}
          scrollEnabled
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: isPhotoStep ? 24 : 20,
            paddingTop: Math.max(insets.top + (isPhotoStep ? 14 : 8), isPhotoStep ? 22 : 20),
            paddingBottom: Math.max(
              insets.bottom + bottomBarOffset + (isPhotoStep ? 148 : 124),
              bottomBarOffset + (isPhotoStep ? 176 : 144),
            ),
            minHeight: height,
          }}
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flex: 1, gap: 24 }}>
            <View style={{ gap: isPhotoStep ? 18 : 14 }}>
              <ServiceWizardHeader
                title={serviceLabel}
                step={currentStepNumber}
                totalSteps={totalWizardSteps}
                topInset={0}
                leftAccessory={
                  workflowStep > 0 ? (
                    <LuxPressable
                      onPress={handleBack}
                      className="cursor-pointer h-11 w-11 items-center justify-center rounded-full"
                      style={{
                        borderWidth: 0.5,
                        borderColor: headerButtonBorderColor,
                        backgroundColor: headerButtonBackgroundColor,
                      }}
                    >
                      <ArrowLeft color={wizardPrimaryTextColor} size={20} strokeWidth={2.2} />
                    </LuxPressable>
                  ) : (
                    <View style={{ height: 44, width: 44 }} />
                  )
                }
                rightAccessory={
                  <LuxPressable
                    onPress={handleCloseWizard}
                    onPressIn={() => setIsHeaderClosePressed(true)}
                    onPressOut={() => setIsHeaderClosePressed(false)}
                    pressableClassName="cursor-pointer"
                    className="cursor-pointer"
                    glowColor={SERVICE_WIZARD_THEME.colors.accentGlowSoft}
                    scale={0.96}
                  >
                    <MotiView
                      animate={{ scale: isHeaderClosePressed ? 0.94 : 1 }}
                      transition={{ type: "timing", duration: 140 }}
                      style={{
                        height: 44,
                        width: 44,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 999,
                        borderWidth: 0.5,
                        borderColor: headerButtonBorderColor,
                        backgroundColor: headerButtonBackgroundColor,
                      }}
                    >
                      <Close color={wizardPrimaryTextColor} size={20} strokeWidth={2.2} />
                    </MotiView>
                  </LuxPressable>
                }
              />
            </View>

            <AnimatePresence exitBeforeEnter>
              <MotiView
                key={`wizard-step-${workflowStep}`}
                from={{ opacity: 0, translateX: wizardNavDirection === 1 ? 18 : -18, scale: 0.99 }}
                animate={{ opacity: 1, translateX: 0, scale: 1 }}
                exit={{ opacity: 0, translateX: wizardNavDirection === 1 ? -14 : 14, scale: 0.99 }}
                transition={stepTransition}
                style={isPhotoStep ? { flex: 1, minHeight: stepContentMinHeight, gap: 24 } : { gap: 24 }}
              >
                {workflowStep === 0 ? (
                  <View style={{ flex: 1, gap: 24, paddingTop: 4 }}>
                    <View style={{ gap: 8, alignItems: "center" }}>
                      <Text
                        style={[
                          SERVICE_WIZARD_THEME.typography.heroTitle,
                          {
                            color: wizardPrimaryTextColor,
                            textAlign: "center",
                          },
                        ]}
                        >
                          {stepOneTitle}
                      </Text>
                      <Text
                        style={{
                          color: "#a1a1aa",
                          fontSize: 14,
                          lineHeight: 21,
                          textAlign: "center",
                          maxWidth: 280,
                        }}
                      >
                        {stepOneDescription}
                      </Text>
                    </View>

                    <MotiView
                      key={displayedSelectedImage?.uri ?? "empty-upload"}
                      from={{ opacity: 0, scale: 0.985, translateY: 12 }}
                      animate={{ opacity: 1, scale: 1, translateY: 0 }}
                      transition={LUX_SPRING}
                      style={{ alignItems: "center", justifyContent: "center" }}
                    >
                      <LuxPressable
                        onPress={handlePickPhoto}
                        className="cursor-pointer self-center"
                        style={{
                          width: uploadTileSize,
                          height: uploadTileSize,
                          borderRadius: isFloorService ? 28 : 34,
                          borderWidth: hasVisiblePhoto ? 1 : isFloorService ? 1 : 1.5,
                          borderColor: hasVisiblePhoto ? "rgba(255,255,255,0.14)" : isFloorService ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.18)",
                          borderStyle: "solid",
                          overflow: "hidden",
                          alignSelf: "center",
                          backgroundColor: "#0d0d0d",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        {hasVisiblePhoto ? (
                          <>
                            <Image
                              source={{ uri: displayedSelectedImage?.uri ?? "" }}
                              style={{ width: "100%", height: "100%" }}
                              contentFit="cover"
                              transition={180}
                              cachePolicy="memory-disk"
                            />
                            {isPhotoPreviewBusy ? (
                              <View
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  alignItems: "center",
                                  justifyContent: "center",
                                  backgroundColor: "rgba(0,0,0,0.18)",
                                }}
                              >
                                <ActivityIndicator size="small" color="#ffffff" />
                              </View>
                            ) : null}
                          </>
                        ) : (
                          <View
                            style={{
                              flex: 1,
                              alignItems: "center",
                              justifyContent: "center",
                              gap: isFloorService ? 18 : 14,
                              paddingHorizontal: 30,
                              paddingVertical: 30,
                            }}
                          >
                            <View
                              style={{
                                width: isFloorService ? 84 : 70,
                                height: isFloorService ? 84 : 70,
                                borderRadius: isFloorService ? 24 : 35,
                                borderWidth: 1,
                                borderColor: "rgba(255,255,255,0.16)",
                                backgroundColor: "rgba(255,255,255,0.04)",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Plus color="#ffffff" size={isFloorService ? 30 : 26} strokeWidth={2.4} />
                            </View>
                            {!isFloorService ? (
                              <View style={{ gap: 6, alignItems: "center" }}>
                                <Text
                                  style={{
                                    color: "#ffffff",
                                    fontSize: 22,
                                    fontWeight: "800",
                                    textAlign: "center",
                                  }}
                                >
                                  {emptyUploadTitle}
                                </Text>
                                <Text
                                  style={{
                                    color: "#a1a1aa",
                                    fontSize: 14,
                                    lineHeight: 21,
                                    textAlign: "center",
                                    maxWidth: 220,
                                  }}
                                >
                                  Tap to add a photo from your camera or library
                                </Text>
                              </View>
                            ) : null}
                            {isPhotoPreviewBusy ? <ActivityIndicator size="small" color="#ffffff" /> : null}
                          </View>
                        )}

                        {hasVisiblePhoto ? (
                            <Pressable
                              onPress={(event) => {
                                event.stopPropagation();
                                handleClearSelectedImage();
                              }}
                              style={{
                                position: "absolute",
                                right: 14,
                                top: 14,
                                zIndex: 20,
                                elevation: 20,
                                width: 40,
                                height: 40,
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: 999,
                                borderWidth: 1,
                                borderColor: "rgba(255,255,255,0.16)",
                                backgroundColor: "rgba(10,10,10,0.78)",
                              }}
                              android_ripple={{ color: "rgba(255,255,255,0.12)", borderless: false }}
                            >
                              <Close color="#ffffff" size={16} strokeWidth={2.4} />
                            </Pressable>
                        ) : null}
                      </LuxPressable>
                    </MotiView>

                    <View style={{ gap: 12 }}>
                      <Text
                        style={{
                          color: "#ffffff",
                          fontSize: 16,
                          fontWeight: "700",
                          letterSpacing: -0.2,
                        }}
                      >
                        {isFloorService ? "Floor-focused Examples" : "Example Photos"}
                      </Text>

                      <MotiView
                        from={{ opacity: 0, translateY: 12 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ ...LUX_SPRING, delay: 90 }}
                      >
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          decelerationRate="fast"
                          contentContainerStyle={{ paddingRight: 2, gap: 12 }}
                        >
                          {examplePhotos.slice(0, 4).map((example, index) => {
                            const active = activeExampleLabel === example.label;
                            const isLoading = isLoadingExample === example.id;
                            return (
                              <MotiView
                                key={example.id}
                                {...staggerFadeUp(index, 45)}
                                style={{ width: stepOneExampleCardWidth }}
                              >
                                <LuxPressable
                                  onPress={() => void handleSelectExample(example)}
                                  className="cursor-pointer"
                                  style={{
                                    width: stepOneExampleCardWidth,
                                    height: isFloorService ? Math.round(stepOneExampleCardWidth * 0.86) : stepOneExampleCardHeight,
                                    borderRadius: 22,
                                    borderWidth: active ? 1.5 : 1,
                                    borderColor: active ? SERVICE_WIZARD_THEME.colors.accent : "rgba(255,255,255,0.12)",
                                    backgroundColor: "#151515",
                                    overflow: "hidden",
                                  }}
                                >
                                  <Image
                                    source={example.source}
                                    style={{ width: "100%", height: "100%" }}
                                    contentFit="cover"
                                    transition={180}
                                    cachePolicy="memory-disk"
                                  />
                                  {isLoading ? (
                                    <View
                                      style={{
                                        position: "absolute",
                                        inset: 0,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        backgroundColor: "rgba(0,0,0,0.2)",
                                      }}
                                    >
                                      <ActivityIndicator size="small" color="#ffffff" />
                                    </View>
                                  ) : null}
                                  <LinearGradient
                                    colors={["rgba(0,0,0,0.04)", "rgba(0,0,0,0.74)"]}
                                    locations={[0.35, 1]}
                                    style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 64 }}
                                  />
                                  <View style={{ position: "absolute", left: 12, right: 12, bottom: 12 }}>
                                    <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "700" }} numberOfLines={1}>
                                      {example.label}
                                    </Text>
                                  </View>
                                </LuxPressable>
                              </MotiView>
                            );
                          })}
                        </ScrollView>
                      </MotiView>
                    </View>
                  </View>
                ) : null}
                {workflowStep === 1 ? (
                  <>
                      <View style={wizardSectionHeaderStyle}>
                        <Text style={[SERVICE_WIZARD_THEME.typography.sectionTitle, { color: wizardPrimaryTextColor, textAlign: "center" }]}>
                          {stepTwoTitle}
                        </Text>
                        <Text style={wizardSectionBodyStyle}>
                          {stepTwoDescription}
                        </Text>
                      </View>

                      <View style={wizardCenteredGridStyle}>
                        {spaceOptions.map((option, index) => {
                          const active = selectedRoom === option;
                          const meta = ROOM_CARD_META[option as keyof typeof ROOM_CARD_META] ?? {
                            icon: House,
                            description: "A polished redesign starting point.",
                          };
                          const RoomIcon = meta.icon;
                          return (
                            <MotiView key={option} {...staggerFadeUp(index, 40)} style={{ width: wizardCardWidth }}>
                              <LuxPressable
                                onPress={() => handleSelectRoom(option)}
                                className="cursor-pointer rounded-[32px] border px-5 py-5"
                                style={{
                                  minHeight: isExteriorService && meta.image ? 214 : 176,
                                  borderWidth: active ? 1.5 : 1,
                                  borderColor: active ? "#d946ef" : wizardSurfaceBorderColor,
                                  backgroundColor: active ? wizardActiveSurfaceColor : wizardSurfaceColor,
                                  shadowColor: "#d946ef",
                                  shadowOpacity: active ? 0.24 : 0,
                                  shadowRadius: active ? 18 : 0,
                                  shadowOffset: { width: 0, height: 0 },
                                  elevation: active ? 8 : 0,
                                }}
                              >
                                <View style={{ flex: 1, gap: 22 }}>
                                  {isExteriorService && meta.image ? (
                                    <View
                                      style={{
                                        height: 102,
                                        overflow: "hidden",
                                        borderRadius: 24,
                                        backgroundColor: "#0f0f10",
                                      }}
                                    >
                                      <Image source={meta.image} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={140} cachePolicy="memory-disk" />
                                      <LinearGradient
                                        colors={["rgba(0,0,0,0.02)", "rgba(0,0,0,0.18)", "rgba(0,0,0,0.62)"]}
                                        locations={[0, 0.52, 1]}
                                        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
                                      />
                                      <View
                                        style={{
                                          position: "absolute",
                                          left: 10,
                                          top: 10,
                                          height: 40,
                                          width: 40,
                                          alignItems: "center",
                                          justifyContent: "center",
                                          borderRadius: 14,
                                          borderWidth: 1,
                                          borderColor: active ? "rgba(217,70,239,0.28)" : "rgba(255,255,255,0.12)",
                                          backgroundColor: "rgba(10,10,10,0.5)",
                                        }}
                                      >
                                        <RoomIcon color={active ? "#d946ef" : "#ffffff"} size={18} strokeWidth={2} />
                                      </View>
                                    </View>
                                  ) : (
                                    <View
                                      style={{
                                        height: 50,
                                        width: 50,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        borderRadius: 20,
                                        borderWidth: 1,
                                        borderColor: active ? "rgba(217,70,239,0.28)" : "rgba(255,255,255,0.08)",
                                        backgroundColor: active ? "rgba(217,70,239,0.14)" : "rgba(255,255,255,0.03)",
                                      }}
                                    >
                                      <RoomIcon color={active ? "#d946ef" : "#ffffff"} size={22} strokeWidth={2} />
                                    </View>
                                  )}

                                  <View style={{ marginTop: "auto", gap: 8 }}>
                                    <Text style={{ color: "#ffffff", fontSize: 21, fontWeight: "700", letterSpacing: -0.45 }}>
                                      {option}
                                    </Text>
                                    <Text style={{ color: active ? "#f5d0fe" : wizardMutedTextColor, fontSize: 13, lineHeight: 19 }}>
                                      {meta.description}
                                    </Text>
                                  </View>
                                </View>
                              </LuxPressable>
                            </MotiView>
                          );
                        })}
                      </View>
                  </>
                ) : null}

                {workflowStep === 2 ? (
                  isPaintService ? (
                    <>
                      <View style={wizardSectionHeaderStyle}>
                        <Text style={[SERVICE_WIZARD_THEME.typography.sectionTitle, { color: wizardPrimaryTextColor, textAlign: "center" }]}>
                          {stepThreeTitle}
                        </Text>
                        <Text style={wizardSectionBodyStyle}>
                          {stepThreeDescription}
                        </Text>
                      </View>

                      <View style={wizardCenteredGridStyle}>
                        {WALL_COLOR_OPTIONS.map((option, index) => {
                          const active = selectedStyle === option.title;
                          return (
                            <MotiView key={option.id} {...staggerFadeUp(index, 24)} style={{ width: wizardCardWidth }}>
                              <LuxPressable
                                onPress={() => handleSelectStyle(option.title)}
                                className="cursor-pointer rounded-[32px] border"
                                style={{
                                  minHeight: 188,
                                  borderWidth: active ? 1.5 : 1,
                                  borderColor: active ? "#d946ef" : wizardSurfaceBorderColor,
                                  backgroundColor: active ? wizardActiveSurfaceColor : wizardSurfaceColor,
                                  paddingHorizontal: 18,
                                  paddingVertical: 18,
                                }}
                              >
                                <View style={{ flex: 1, gap: 18 }}>
                                  <View
                                    style={{
                                      height: 86,
                                      width: 86,
                                      alignItems: "center",
                                      justifyContent: "center",
                                      alignSelf: "center",
                                      borderRadius: 999,
                                      borderWidth: 3,
                                      borderColor: active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.18)",
                                      backgroundColor: option.value,
                                    }}
                                  />
                                  <View style={{ gap: 8 }}>
                                    <Text style={{ color: "#ffffff", fontSize: 20, fontWeight: "700", textAlign: "center", letterSpacing: -0.35 }}>
                                      {option.title}
                                    </Text>
                                    <Text style={{ color: active ? "#f5d0fe" : wizardMutedTextColor, fontSize: 13, lineHeight: 19, textAlign: "center" }}>
                                      {option.description}
                                    </Text>
                                  </View>
                                </View>
                                {active ? (
                                  <View className="absolute right-3 top-3 rounded-full p-1.5" style={{ borderWidth: 1, borderColor: "rgba(217,70,239,0.22)", backgroundColor: "#0f0f10" }}>
                                    <BadgeCheck color="#d946ef" size={16} strokeWidth={2} />
                                  </View>
                                ) : null}
                              </LuxPressable>
                            </MotiView>
                          );
                        })}
                      </View>
                    </>
                  ) : isFloorService ? (
                    <>
                      <View style={wizardSectionHeaderStyle}>
                        <Text style={[SERVICE_WIZARD_THEME.typography.sectionTitle, { color: wizardPrimaryTextColor, textAlign: "center" }]}>
                          {stepThreeTitle}
                        </Text>
                        <Text style={wizardSectionBodyStyle}>
                          {stepThreeDescription}
                        </Text>
                      </View>

                      <View style={wizardCenteredGridStyle}>
                        {FLOOR_MATERIAL_OPTIONS.map((material, index) => {
                          const active = selectedStyle === material.title;
                          return (
                            <MotiView key={material.id} {...staggerFadeUp(index, 24)} style={{ width: wizardCardWidth }}>
                              <LuxPressable
                                onPress={() => handleSelectStyle(material.title)}
                                className="cursor-pointer rounded-[32px] border"
                                style={{
                                  minHeight: 226,
                                  borderWidth: active ? 1.5 : 1,
                                  borderColor: active ? "#d946ef" : wizardSurfaceBorderColor,
                                  backgroundColor: active ? wizardActiveSurfaceColor : wizardSurfaceColor,
                                  paddingHorizontal: 14,
                                  paddingTop: 14,
                                  paddingBottom: 16,
                                  gap: 14,
                                }}
                              >
                                <FloorMaterialPreview material={material} active={active} />
                                <View style={{ gap: 8 }}>
                                  <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "700", letterSpacing: -0.35 }}>
                                    {material.title}
                                  </Text>
                                  <Text style={{ color: active ? "#f5d0fe" : wizardMutedTextColor, fontSize: 13, lineHeight: 19 }}>
                                    {material.description}
                                  </Text>
                                </View>
                                {active ? (
                                  <View className="absolute right-3 top-3 rounded-full p-1.5" style={{ borderWidth: 1, borderColor: "rgba(217,70,239,0.22)", backgroundColor: "#0f0f10" }}>
                                    <BadgeCheck color="#d946ef" size={16} strokeWidth={2} />
                                  </View>
                                ) : null}
                              </LuxPressable>
                            </MotiView>
                          );
                        })}
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={wizardSectionHeaderStyle}>
                        <Text style={[SERVICE_WIZARD_THEME.typography.sectionTitle, { color: wizardPrimaryTextColor, textAlign: "center" }]}>
                          {stepThreeTitle}
                        </Text>
                        <Text style={wizardSectionBodyStyle}>
                          {stepThreeDescription}
                        </Text>
                      </View>

                      {isLeanGenerationService ? (
                        <View style={wizardCenteredGridStyle}>
                          {(isExteriorService ? EXTERIOR_STYLE_LIBRARY : GARDEN_STYLE_LIBRARY).map((style, index) => {
                            const active = selectedStyle === style.title;
                            const StyleIcon = style.icon;
                            return (
                              <MotiView key={style.id} {...staggerFadeUp(index, 28)} style={{ width: wizardCardWidth }}>
                                <LuxPressable
                                  onPress={() => handleSelectStyle(style.title)}
                                  className="cursor-pointer rounded-[32px] border"
                                  style={{
                                    minHeight: 176,
                                    overflow: "hidden",
                                    borderWidth: active ? 1.5 : 1,
                                    borderColor: active ? "#d946ef" : wizardSurfaceBorderColor,
                                    backgroundColor: active ? wizardActiveSurfaceColor : wizardSurfaceColor,
                                  }}
                                >
                                  <LinearGradient
                                    colors={style.colors}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 18, flex: 1 }}
                                  >
                                    <View
                                      style={{
                                        height: 44,
                                        width: 44,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        borderRadius: 16,
                                        borderWidth: 1,
                                        borderColor: active ? "rgba(217,70,239,0.24)" : "rgba(255,255,255,0.08)",
                                        backgroundColor: "rgba(10,10,10,0.26)",
                                      }}
                                    >
                                      <StyleIcon color={active ? "#d946ef" : "#ffffff"} size={20} strokeWidth={2} />
                                    </View>

                                    <View style={{ marginTop: "auto", gap: 8 }}>
                                      <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "700", letterSpacing: -0.35 }}>
                                        {style.title}
                                      </Text>
                                      <Text style={{ color: active ? "#f5d0fe" : wizardMutedTextColor, fontSize: 13, lineHeight: 19 }}>
                                        {style.description}
                                      </Text>
                                    </View>
                                  </LinearGradient>

                                  {active ? (
                                    <View className="absolute right-2 top-2 rounded-full p-1.5" style={{ borderWidth: 1, borderColor: "rgba(217,70,239,0.22)", backgroundColor: "#0f0f10" }}>
                                      <BadgeCheck color="#d946ef" size={16} strokeWidth={2} />
                                    </View>
                                  ) : null}
                                </LuxPressable>
                              </MotiView>
                            );
                          })}
                        </View>
                      ) : (
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: wizardStyleGap }}>
                          {[{ id: "custom", title: "Custom", image: null }, ...STYLE_LIBRARY].map((style, index) => {
                            const isCustomCard = style.title === "Custom";
                            const active = selectedStyle === style.title;
                            return (
                              <MotiView key={style.id} {...staggerFadeUp(index, 18)} style={{ width: wizardStyleCardWidth }}>
                                <LuxPressable
                                  onPress={() => handleSelectStyle(style.title)}
                                  className="cursor-pointer overflow-hidden rounded-[32px] border"
                                  style={{
                                    borderWidth: active ? 1.5 : 1,
                                    borderColor: active ? "#d946ef" : wizardSurfaceBorderColor,
                                    backgroundColor: active ? wizardActiveSurfaceColor : wizardSurfaceColor,
                                  }}
                                >
                                  {isCustomCard ? (
                                    <LinearGradient
                                      colors={["rgba(217,70,239,0.16)", "rgba(255,255,255,0.04)"]}
                                      start={{ x: 0, y: 0 }}
                                      end={{ x: 1, y: 1 }}
                                      style={{ height: 120, alignItems: "center", justifyContent: "center" }}
                                    >
                                      <Sparkles color="#d946ef" size={28} strokeWidth={2.1} />
                                    </LinearGradient>
                                  ) : (
                                    <Image source={style.image} style={{ width: "100%", height: 120 }} contentFit="cover" transition={160} cachePolicy="memory-disk" />
                                  )}
                                  <View style={{ paddingHorizontal: 12, paddingVertical: 12 }}>
                                    <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "700" }} numberOfLines={2}>{style.title}</Text>
                                    {isCustomCard && customPrompt.trim().length > 0 ? (
                                      <Text style={{ marginTop: 8, color: wizardMutedTextColor, fontSize: 12, lineHeight: 18 }} numberOfLines={2}>{customPrompt}</Text>
                                    ) : null}
                                  </View>
                                  {active ? (
                                    <View className="absolute right-2 top-2 rounded-full p-1.5" style={{ borderWidth: 1, borderColor: "rgba(217,70,239,0.22)", backgroundColor: "#0f0f10" }}>
                                      <BadgeCheck color="#d946ef" size={16} strokeWidth={2} />
                                    </View>
                                  ) : null}
                                </LuxPressable>
                              </MotiView>
                            );
                          })}
                        </View>
                      )}
                    </>
                  )
                ) : null}

                {workflowStep === 3 ? (
                  isPaintService || isFloorService ? (
                    <>
                      <View style={wizardSectionHeaderStyle}>
                        <Text style={[SERVICE_WIZARD_THEME.typography.sectionTitle, { color: wizardPrimaryTextColor, textAlign: "center" }]}>
                          {stepFourTitle}
                        </Text>
                        <Text style={wizardSectionBodyStyle}>
                          {stepFourDescription}
                        </Text>
                      </View>

                      <View
                        style={{
                          width: "100%",
                          maxWidth: wizardGridMaxWidth,
                          alignSelf: "center",
                          borderRadius: 32,
                          borderWidth: 1,
                          borderColor: wizardSurfaceBorderColor,
                          backgroundColor: wizardSurfaceColor,
                          paddingHorizontal: 18,
                          paddingVertical: 18,
                          gap: 18,
                        }}
                      >
                        <View
                          style={{
                            borderRadius: 28,
                            borderWidth: 1,
                            borderColor: "rgba(255,255,255,0.08)",
                            backgroundColor: "rgba(255,255,255,0.03)",
                            paddingHorizontal: 18,
                            paddingVertical: 18,
                            gap: 10,
                          }}
                        >
                          <Text style={{ color: "#ffffff", fontSize: 23, fontWeight: "700", letterSpacing: -0.45 }}>
                            {isPaintService ? selectedWallColorOption?.title ?? selectedStyle ?? "Select a wall color" : selectedFloorMaterialOption?.title ?? selectedStyle ?? "Select a floor material"}
                          </Text>
                          <Text style={{ color: wizardMutedTextColor, fontSize: 14, lineHeight: 22 }}>
                            {selectedRoom
                              ? `Applying this selection to the ${selectedRoom.toLowerCase()} while preserving the existing structure and lighting.`
                              : "Select a space type to keep the material placement grounded."}
                          </Text>
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                            {[
                              { label: selectedRoom ?? "Space type not selected", active: Boolean(selectedRoom) },
                              { label: selectedStyle ?? (isPaintService ? "Wall color not selected" : "Material not selected"), active: Boolean(selectedStyle) },
                            ].map((item) => (
                              <View
                                key={item.label}
                                style={{
                                  borderRadius: 999,
                                  borderWidth: 1,
                                  borderColor: item.active ? "rgba(217,70,239,0.24)" : "rgba(255,255,255,0.08)",
                                  backgroundColor: item.active ? "rgba(217,70,239,0.12)" : "rgba(255,255,255,0.03)",
                                  paddingHorizontal: 12,
                                  paddingVertical: 8,
                                }}
                              >
                                <Text style={{ color: item.active ? "#f5d0fe" : "#d4d4d8", fontSize: 12, fontWeight: "600" }}>{item.label}</Text>
                              </View>
                            ))}
                          </View>
                        </View>

                        <View style={{ gap: 12 }}>
                          <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: "700", letterSpacing: -0.4 }}>Finish Type</Text>
                          <View style={{ gap: 12 }}>
                            {FINISH_OPTIONS.map((finish, index) => {
                              const active = selectedFinishId === finish.id;
                              return (
                                <MotiView key={finish.id} {...staggerFadeUp(index, 20)}>
                                  <LuxPressable
                                    onPress={() => handleSelectFinish(finish.id)}
                                    className="cursor-pointer rounded-[32px] border"
                                    style={{
                                      borderWidth: active ? 1.5 : 1,
                                      borderColor: active ? "#d946ef" : wizardSurfaceBorderColor,
                                      backgroundColor: active ? wizardActiveSurfaceColor : "rgba(255,255,255,0.03)",
                                      paddingHorizontal: 18,
                                      paddingVertical: 16,
                                    }}
                                  >
                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                                      <LinearGradient
                                        colors={[finish.accentColor, "rgba(255,255,255,0.1)"]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={{
                                          height: 54,
                                          width: 54,
                                          alignItems: "center",
                                          justifyContent: "center",
                                          borderRadius: 18,
                                        }}
                                      >
                                        <Sparkles color="#ffffff" size={20} strokeWidth={2} />
                                      </LinearGradient>
                                      <View style={{ flex: 1, gap: 4 }}>
                                        <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "700" }}>{finish.title}</Text>
                                        <Text style={{ color: active ? "#f5d0fe" : wizardMutedTextColor, fontSize: 13, lineHeight: 19 }}>
                                          {finish.description}
                                        </Text>
                                      </View>
                                      {active ? <BadgeCheck color="#d946ef" size={18} strokeWidth={2} /> : null}
                                    </View>
                                  </LuxPressable>
                                </MotiView>
                              );
                            })}
                          </View>
                        </View>
                      </View>
                    </>
                  ) : isLeanGenerationService ? (
                    <>
                      <View style={wizardSectionHeaderStyle}>
                        <Text style={[SERVICE_WIZARD_THEME.typography.sectionTitle, { color: wizardPrimaryTextColor, textAlign: "center" }]}>
                          Generate
                        </Text>
                        <Text style={wizardSectionBodyStyle}>
                          {isGardenService
                            ? effectiveSignedIn
                              ? "Review your garden selections, then generate a polished concept and send it to Your Board."
                              : "Review your garden selections, then generate instantly. Sign in later to preserve it in Your Board."
                            : effectiveSignedIn
                              ? "Review your exterior selections, then generate a polished concept and send it to Your Board."
                              : "Review your exterior selections, then generate instantly. Sign in later to preserve it in Your Board."}
                        </Text>
                      </View>

                      <View
                        style={{
                          width: "100%",
                          maxWidth: wizardGridMaxWidth,
                          alignSelf: "center",
                          borderRadius: 28,
                          borderWidth: 1,
                          borderColor: wizardSurfaceBorderColor,
                          backgroundColor: wizardSurfaceColor,
                          overflow: "hidden",
                        }}
                      >
                        {selectedImage ? (
                          <View style={{ height: 220 }}>
                            <Image source={{ uri: selectedImage.uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" transition={140} cachePolicy="memory-disk" />
                            <LinearGradient
                              colors={["rgba(0,0,0,0.02)", "rgba(0,0,0,0.16)", "rgba(0,0,0,0.76)"]}
                              locations={[0, 0.5, 1]}
                              style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
                            />
                          </View>
                        ) : (
                          <View style={{ height: 220, alignItems: "center", justifyContent: "center", backgroundColor: "#0f0f10" }}>
                            <House color="#71717a" size={30} />
                          </View>
                        )}

                        <View style={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 20, gap: 18 }}>
                          <View style={{ gap: 8 }}>
                            <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: "700", letterSpacing: -0.45 }}>
                              {selectedRoom ?? (isGardenService ? "Select a garden zone" : "Select a building type")}
                            </Text>
                            <Text style={{ color: wizardMutedTextColor, fontSize: 14, lineHeight: 22 }}>
                              {selectedStyle ? `${selectedStyle} architectural direction selected.` : "Select an exterior style to continue."}
                            </Text>
                          </View>

                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                            {[
                              { label: selectedRoom ?? "Building type not selected", active: Boolean(selectedRoom) },
                              { label: selectedStyle ?? "Style direction not selected", active: Boolean(selectedStyle) },
                            ].map((item) => (
                              <View
                                key={item.label}
                                style={{
                                  borderRadius: 999,
                                  borderWidth: 1,
                                  borderColor: item.active ? "rgba(217,70,239,0.24)" : "rgba(255,255,255,0.08)",
                                  backgroundColor: item.active ? "rgba(217,70,239,0.12)" : "rgba(255,255,255,0.03)",
                                  paddingHorizontal: 12,
                                  paddingVertical: 8,
                                }}
                              >
                                <Text style={{ color: item.active ? "#f5d0fe" : "#d4d4d8", fontSize: 13, fontWeight: "600" }}>{item.label}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={wizardSectionHeaderStyle}>
                        <Text style={[SERVICE_WIZARD_THEME.typography.sectionTitle, { color: wizardPrimaryTextColor, textAlign: "center" }]}>
                          Refine the creative direction
                        </Text>
                        <Text style={wizardSectionBodyStyle}>
                          Set the design intensity and palette family before Darkor.ai reveals your final composition.
                        </Text>
                      </View>

                      <View style={{ gap: 12, width: "100%", maxWidth: wizardGridMaxWidth, alignSelf: "center" }}>
                        <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: "700", letterSpacing: -0.4, textAlign: "center" }}>Mode</Text>
                        <View style={wizardModeGridStyle}>
                          {MODE_OPTIONS.map((mode, index) => {
                            const active = selectedModeId === mode.id;
                            const ModeIcon = mode.icon;
                            return (
                              <MotiView key={mode.id} {...staggerFadeUp(index, 40)} style={{ width: wizardModeCardWidth }}>
                                <LuxPressable
                                  onPress={() => handleSelectMode(mode.id)}
                                  className="cursor-pointer rounded-[26px] border px-5 py-5"
                                  style={{
                                    minHeight: 188,
                                    borderWidth: active ? 1.5 : 1,
                                    borderColor: active ? "#d946ef" : wizardSurfaceBorderColor,
                                    backgroundColor: active ? wizardActiveSurfaceColor : wizardSurfaceColor,
                                  }}
                                >
                                  <View className="flex-row items-start justify-between">
                                    <View className="h-14 w-14 items-center justify-center rounded-[18px]" style={{ borderWidth: 1, borderColor: active ? "rgba(217,70,239,0.22)" : "rgba(255,255,255,0.08)", backgroundColor: active ? "rgba(217,70,239,0.14)" : "rgba(255,255,255,0.03)" }}>
                                      <ModeIcon color={active ? "#d946ef" : "#ffffff"} size={24} strokeWidth={2} />
                                    </View>
                                    {active ? <BadgeCheck color="#d946ef" size={19} strokeWidth={2.1} /> : null}
                                  </View>
                                  <View style={{ marginTop: 18, gap: 8 }}>
                                    <Text style={{ color: "#ffffff", fontSize: 21, fontWeight: "700", lineHeight: 28 }}>{mode.title}</Text>
                                    <Text style={{ color: wizardMutedTextColor, fontSize: 14, lineHeight: 22 }}>{mode.description}</Text>
                                  </View>
                                </LuxPressable>
                              </MotiView>
                            );
                          })}
                        </View>
                      </View>

                      <View style={{ gap: 12, width: "100%", maxWidth: wizardGridMaxWidth, alignSelf: "center" }}>
                        <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: "700", letterSpacing: -0.4, textAlign: "center" }}>Palette</Text>
                        <View style={wizardPaletteGridStyle}>
                          {PALETTE_OPTIONS.slice(0, 8).map((palette, index) => {
                            const active = selectedPaletteId === palette.id;
                            return (
                              <MotiView key={palette.id} {...staggerFadeUp(index, 18)} style={{ width: wizardPaletteCardWidth }}>
                                <LuxPressable
                                  onPress={() => handleSelectPalette(palette.id)}
                                  className="cursor-pointer overflow-hidden rounded-[22px] border"
                                  style={{
                                    borderWidth: active ? 1.5 : 1,
                                    borderColor: active ? "#d946ef" : wizardSurfaceBorderColor,
                                    backgroundColor: active ? wizardActiveSurfaceColor : wizardSurfaceColor,
                                  }}
                                >
                                  <View style={{ height: 74, flexDirection: "row" }}>
                                    {palette.colors.map((color) => (
                                      <View key={color} style={{ flex: 1, backgroundColor: color }} />
                                    ))}
                                  </View>
                                  <View style={{ paddingHorizontal: 12, paddingVertical: 12 }}>
                                    <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "700" }} numberOfLines={2}>{palette.label}</Text>
                                  </View>
                                  {active ? (
                                    <View className="absolute right-2 top-2 rounded-full p-1.5" style={{ borderWidth: 1, borderColor: "rgba(217,70,239,0.22)", backgroundColor: "#0f0f10" }}>
                                      <BadgeCheck color="#d946ef" size={16} strokeWidth={2} />
                                    </View>
                                  ) : null}
                                </LuxPressable>
                              </MotiView>
                            );
                          })}
                        </View>
                      </View>
                    </>
                  )
                ) : null}
              </MotiView>
            </AnimatePresence>
          </View>
        </ScrollView>

        {isPaintService && paintTutorialOpen ? (
          <View
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 38,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0,0,0,0.66)",
              paddingHorizontal: 24,
            }}
          >
            <View
              style={{
                width: "100%",
                maxWidth: 360,
                borderRadius: 28,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.1)",
                backgroundColor: "#09090b",
                paddingHorizontal: 18,
                paddingVertical: 18,
                gap: 16,
              }}
            >
              <View style={{ gap: 6 }}>
                <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: "700", letterSpacing: -0.4 }}>Paint Tutorial</Text>
                <Text style={{ color: "#a1a1aa", fontSize: 14, lineHeight: 21 }}>
                  Draw directly over the wall or surface you want to recolor. Use the eraser if you overshoot before continuing.
                </Text>
              </View>

              <View
                style={{
                  height: 184,
                  overflow: "hidden",
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.08)",
                  backgroundColor: "#111114",
                }}
              >
                <LinearGradient
                  colors={["#f5f5f4", "#e7e5e4"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ position: "absolute", left: 18, right: 18, top: 18, bottom: 18, borderRadius: 18 }}
                />
                <MotiView
                  animate={{ translateX: [-84, 34, -84] }}
                  transition={{ duration: 2200, loop: true }}
                  style={{
                    position: "absolute",
                    left: 56,
                    top: 92,
                    height: 14,
                    width: 88,
                    borderRadius: 999,
                    backgroundColor: "#ff000066",
                  }}
                />
                <MotiView
                  animate={{ translateX: [-62, 54, -62], translateY: [18, -2, 18] }}
                  transition={{ duration: 2200, loop: true }}
                  style={{
                    position: "absolute",
                    left: 50,
                    top: 94,
                    height: 34,
                    width: 34,
                    borderRadius: 999,
                    borderWidth: 2,
                    borderColor: "rgba(255,255,255,0.14)",
                    backgroundColor: "rgba(10,10,10,0.86)",
                  }}
                />
              </View>

              <LuxPressable onPress={handleDismissPaintTutorial} className="cursor-pointer" style={{ width: "100%" }}>
                <LinearGradient
                  colors={["#d946ef", "#4f46e5"]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={{
                    minHeight: 56,
                    borderRadius: 20,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "700" }}>Got it!</Text>
                </LinearGradient>
              </LuxPressable>
            </View>
          </View>
        ) : null}

        {isPaintService && paintColorPickerOpen ? (
          <View
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 39,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0,0,0,0.72)",
              paddingHorizontal: 20,
            }}
          >
            <View
              style={{
                width: "100%",
                maxWidth: 380,
                borderRadius: 28,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.1)",
                backgroundColor: "#09090b",
                paddingHorizontal: 18,
                paddingVertical: 18,
                gap: 16,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View>
                  <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: "700", letterSpacing: -0.4 }}>Color Picker</Text>
                  <Text style={{ color: "#a1a1aa", fontSize: 13, marginTop: 4 }}>Choose the new paint tone for the masked surface.</Text>
                </View>
                <LuxPressable onPress={handleClosePaintColorPicker} className="cursor-pointer" style={{ height: 40, width: 40, alignItems: "center", justifyContent: "center", borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.03)" }}>
                  <Close color="#ffffff" size={18} strokeWidth={2.1} />
                </LuxPressable>
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                {PAINT_COLOR_SWATCHES.map((swatch) => {
                  const active = paintColorDraft.toLowerCase() === swatch.value.toLowerCase();
                  return (
                    <LuxPressable
                      key={swatch.id}
                      onPress={() => handleSelectPaintSwatch(swatch.value)}
                      className="cursor-pointer"
                      style={{
                        width: "22%",
                        minWidth: 68,
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor: active ? "rgba(217,70,239,0.32)" : "rgba(255,255,255,0.08)",
                        backgroundColor: active ? "rgba(217,70,239,0.1)" : "rgba(255,255,255,0.03)",
                        paddingHorizontal: 8,
                        paddingVertical: 10,
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <View style={{ height: 26, width: 26, borderRadius: 999, backgroundColor: swatch.value, borderWidth: 1, borderColor: "rgba(255,255,255,0.16)" }} />
                      <Text style={{ color: "#ffffff", fontSize: 11, fontWeight: "600", textAlign: "center" }} numberOfLines={2}>{swatch.label}</Text>
                    </LuxPressable>
                  );
                })}
              </View>

              <View style={{ gap: 8 }}>
                <Text style={{ color: "#d4d4d8", fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 }}>Custom Hex</Text>
                <TextInput
                  value={paintColorDraft}
                  onChangeText={setPaintColorDraft}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  placeholder="#D946EF"
                  placeholderTextColor="#71717a"
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.1)",
                    backgroundColor: "rgba(255,255,255,0.03)",
                    color: "#ffffff",
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                    fontSize: 15,
                    fontWeight: "600",
                  }}
                />
              </View>

              <LuxPressable onPress={handleApplyPaintColor} className="cursor-pointer" style={{ width: "100%" }}>
                <LinearGradient colors={["#d946ef", "#4f46e5"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ minHeight: 54, borderRadius: 20, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "700" }}>Apply Color</Text>
                </LinearGradient>
              </LuxPressable>
            </View>
          </View>
        ) : null}

        {isPaintService && paintSurfacePickerOpen ? (
          <View
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 39,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0,0,0,0.72)",
              paddingHorizontal: 20,
            }}
          >
            <View
              style={{
                width: "100%",
                maxWidth: 340,
                borderRadius: 28,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.1)",
                backgroundColor: "#09090b",
                paddingHorizontal: 18,
                paddingVertical: 18,
                gap: 12,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: "700", letterSpacing: -0.4 }}>Surface Type</Text>
                <LuxPressable onPress={() => setPaintSurfacePickerOpen(false)} className="cursor-pointer" style={{ height: 40, width: 40, alignItems: "center", justifyContent: "center", borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.03)" }}>
                  <Close color="#ffffff" size={18} strokeWidth={2.1} />
                </LuxPressable>
              </View>

              {PAINT_SURFACE_OPTIONS.map((option) => {
                const active = paintSurface === option.value;
                return (
                  <LuxPressable
                    key={option.value}
                    onPress={() => handleSelectPaintSurface(option.value)}
                    className="cursor-pointer"
                    style={{
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: active ? "rgba(217,70,239,0.32)" : "rgba(255,255,255,0.08)",
                      backgroundColor: active ? "rgba(217,70,239,0.1)" : "rgba(255,255,255,0.03)",
                      paddingHorizontal: 14,
                      paddingVertical: 14,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "600" }}>{option.label}</Text>
                    {active ? <Check color="#d946ef" size={16} strokeWidth={2.2} /> : null}
                  </LuxPressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {showContinueBar ? (
        <View
          className="absolute inset-x-0 bottom-0 px-5 pt-4"
          style={{
            bottom: bottomBarOffset,
            zIndex: 30,
            paddingBottom: Math.max(insets.bottom + (isPhotoStep ? 16 : 12), isPhotoStep ? 28 : 24),
            borderTopWidth: 1,
            borderTopColor: "rgba(255,255,255,0.06)",
            backgroundColor: wizardBackgroundColor,
            shadowColor: "#000000",
            shadowOpacity: 0.24,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: -8 },
            elevation: 14,
          }}
        >
          <View style={{ position: "relative" }}>
            <MotiView
              pointerEvents="none"
              animate={
                shouldPulseContinue
                  ? { opacity: [0.16, 0.32, 0.16], scale: [0.985, 1.02, 0.985] }
                  : { opacity: 0, scale: 1 }
              }
              transition={shouldPulseContinue ? { duration: 2100, loop: true } : { duration: 180 }}
              style={{
                position: "absolute",
                left: 4,
                right: 4,
                top: 2,
                bottom: 2,
                borderRadius: continueButtonRadius + 4,
                backgroundColor: "#d946ef",
              }}
            />

            <MotiView
              animate={shouldPulseContinue ? { scale: [1, 1.01, 1], translateY: [0, -1, 0] } : { scale: 1, translateY: 0 }}
              transition={shouldPulseContinue ? { duration: 2100, loop: true } : { duration: 180 }}
            >
              <LuxPressable
                onPress={handleContinue}
                disabled={isContinueDisabled}
                pressableClassName="cursor-pointer"
                className="cursor-pointer"
                style={{ width: "100%" }}
              >
                {isContinueActive ? (
                  <LinearGradient
                    colors={isPhotoStep ? ["#d946ef", "#4f46e5"] : ["#d946ef", "#7c3aed"]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={{
                      width: "100%",
                      minHeight: continueButtonHeight,
                      borderRadius: continueButtonRadius,
                      opacity: continueButtonOpacity,
                      overflow: "hidden",
                    }}
                  >
                    {isPhotoStep ? (
                      <MotiView
                        pointerEvents="none"
                        animate={shouldPulseContinue ? { translateX: [-140, 260], opacity: [0, 0.2, 0] } : { translateX: 0, opacity: 0 }}
                        transition={shouldPulseContinue ? { duration: 1800, loop: true } : { duration: 140 }}
                        style={{
                          position: "absolute",
                          top: -10,
                          bottom: -10,
                          width: 88,
                          backgroundColor: "rgba(255,255,255,0.26)",
                          transform: [{ skewX: "-18deg" }],
                        }}
                      />
                    ) : null}
                    <View
                      style={{
                        width: "100%",
                        minHeight: continueButtonHeight,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 20,
                      }}
                    >
                      <Text style={{ color: "#ffffff", fontSize: 17, fontWeight: "700", textAlign: "center" }}>
                        {continueLabel}
                      </Text>
                    </View>
                  </LinearGradient>
                ) : (
                  <View
                    style={{
                      width: "100%",
                      minHeight: continueButtonHeight,
                      borderRadius: continueButtonRadius,
                      backgroundColor: "rgba(39,39,42,0.82)",
                      opacity: continueButtonOpacity,
                      borderWidth: 0,
                      borderColor: "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: 20,
                    }}
                  >
                    <Text style={{ color: "#9ca3af", fontSize: 17, fontWeight: "600", textAlign: "center" }}>
                      {continueLabel}
                    </Text>
                  </View>
                )}
              </LuxPressable>
            </MotiView>
          </View>
        </View>
        ) : null}

        <AnimatePresence>
          {isCustomPromptViewOpen && isStyleStep ? (
            <MotiView
              key="custom-prompt-view"
              from={{ opacity: 0, translateX: 22 }}
              animate={{ opacity: 1, translateX: 0 }}
              exit={{ opacity: 0, translateX: 18 }}
              transition={LUX_SPRING}
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 40,
                backgroundColor: "#000000",
              }}
            >
              <View
                style={{
                  flex: 1,
                  paddingTop: Math.max(insets.top + 16, 26),
                  paddingBottom: Math.max(insets.bottom + bottomBarOffset + 20, bottomBarOffset + 32),
                }}
              >
                <ScrollView
                  style={{ flex: 1 }}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 160, gap: 22 }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                    <Text style={[SERVICE_WIZARD_THEME.typography.heroTitle, { color: wizardPrimaryTextColor }]}>Custom Prompt</Text>
                    <LuxPressable
                      onPress={handleCloseCustomStyle}
                      pressableClassName="cursor-pointer"
                      className="cursor-pointer"
                      glowColor={SERVICE_WIZARD_THEME.colors.accentGlowSoft}
                      scale={0.96}
                    >
                      <MotiView
                        animate={{ scale: 1 }}
                        style={{
                          height: 42,
                          width: 42,
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 999,
                          borderWidth: 0.5,
                          borderColor: "rgba(255,255,255,0.12)",
                          backgroundColor: "rgba(255,255,255,0.04)",
                        }}
                      >
                        <Close color="#ffffff" size={18} strokeWidth={2.2} />
                      </MotiView>
                    </LuxPressable>
                  </View>

                  <View style={{ gap: 12 }}>
                    <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "700" }}>Enter Prompt</Text>
                    <View
                      style={{
                        minHeight: 230,
                        borderRadius: 28,
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.1)",
                        backgroundColor: "rgba(255,255,255,0.04)",
                        paddingHorizontal: 18,
                        paddingTop: 18,
                        paddingBottom: 18,
                      }}
                    >
                      <TextInput
                        value={customPromptDraft}
                        onChangeText={handleChangeCustomPrompt}
                        multiline
                        placeholder="Design a cinematic minimalist living room with sculptural furniture, warm indirect lighting, walnut panels, and a soft limestone palette."
                        placeholderTextColor="#71717a"
                        textAlignVertical="top"
                        style={{
                          color: "#ffffff",
                          fontSize: 15,
                          lineHeight: 24,
                          minHeight: 176,
                          paddingRight: 42,
                        }}
                      />
                      {customPromptDraft.length > 0 ? (
                        <Pressable
                          onPress={handleClearCustomPromptDraft}
                          className="cursor-pointer"
                          style={{
                            position: "absolute",
                            right: 14,
                            top: 14,
                            height: 32,
                            width: 32,
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 999,
                            borderWidth: 1,
                            borderColor: "rgba(255,255,255,0.08)",
                            backgroundColor: "rgba(255,255,255,0.05)",
                          }}
                        >
                          <Close color="#ffffff" size={14} strokeWidth={2.2} />
                        </Pressable>
                      ) : null}
                    </View>
                  </View>

                  <View style={{ gap: 12 }}>
                    <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "700" }}>Example Prompts</Text>
                    <View style={{ gap: 10 }}>
                      {CUSTOM_STYLE_EXAMPLE_PROMPTS.map((prompt) => {
                        const active = selectedCustomPromptBlocks.has(prompt);
                        return (
                          <LuxPressable
                            key={prompt}
                            onPress={() => handleSelectCustomPromptExample(prompt)}
                            className="cursor-pointer rounded-[22px] border px-4 py-4"
                            style={{
                              borderWidth: 1,
                              borderColor: active ? "rgba(217,70,239,0.4)" : "rgba(255,255,255,0.1)",
                              backgroundColor: active ? "rgba(217,70,239,0.12)" : "rgba(255,255,255,0.03)",
                            }}
                          >
                            <Text style={{ color: active ? "#f5d0fe" : "#e4e4e7", fontSize: 14, lineHeight: 22 }}>
                              {prompt}
                            </Text>
                          </LuxPressable>
                        );
                      })}
                    </View>
                  </View>
                </ScrollView>

                <View
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    paddingHorizontal: 20,
                    paddingTop: 14,
                    paddingBottom: Math.max(insets.bottom + bottomBarOffset + 12, bottomBarOffset + 24),
                    borderTopWidth: 1,
                    borderTopColor: "rgba(255,255,255,0.06)",
                    backgroundColor: "#000000",
                  }}
                >
                  <LuxPressable onPress={handleApplyCustomPrompt} className="cursor-pointer" style={{ width: "100%" }}>
                    <LinearGradient
                      colors={["#d946ef", "#4f46e5"]}
                      start={{ x: 0, y: 0.5 }}
                      end={{ x: 1, y: 0.5 }}
                      style={{
                        width: "100%",
                        minHeight: 62,
                        borderRadius: 24,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 20,
                      }}
                    >
                      <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "700", textAlign: "center" }}>Save</Text>
                    </LinearGradient>
                  </LuxPressable>
                </View>
              </View>
            </MotiView>
          ) : null}
        </AnimatePresence>

      </View>
    );
  }

  if (workflowStep === 4) {
    const boardCardWidth = Math.max((width - 52) / 2, 150);

    return (
      <View className="flex-1 bg-black" style={{ backgroundColor: "#000000" }}>
        <FlashList
          data={boardItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <BoardGridCard item={item} width={boardCardWidth} index={index} onPress={handleOpenBoardItem} />
          )}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: Math.max(insets.top + 14, 28),
            paddingBottom: Math.max(insets.bottom + 32, 40),
          }}
          ListHeaderComponent={
            <View style={{ marginBottom: 28 }} className="flex-row items-center justify-between">
              <View style={{ width: 42 }} />
              <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: "700", letterSpacing: -0.5 }}>Your Board</Text>
              <LuxPressable
                onPress={handleResetWizard}
                className="cursor-pointer h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5"
                style={{ borderWidth: 0.5 }}
              >
                <Close color="#ffffff" size={18} strokeWidth={2.2} />
              </LuxPressable>
            </View>
          }
          ListEmptyComponent={
            <View
              className="items-center justify-center rounded-[28px] border border-white/10 bg-zinc-950"
              style={{ width: boardCardWidth, height: 236, borderWidth: 0.5 }}
            >
              <Sparkles color="#71717a" size={28} />
              <Text className="mt-4 text-base font-semibold text-white">Your first board appears here</Text>
              <Text className="mt-2 px-6 text-center text-sm leading-6 text-zinc-500">
                Generate a redesign to start building your collection.
              </Text>
            </View>
          }
          removeClippedSubviews
        />
      </View>
    );
  }

  if (workflowStep === 5) {
    const boardCardWidth = Math.max((width - 52) / 2, 150);
    const editorImageUrl = activeBoardItem?.imageUrl ?? generatedImageUrl;
    const beforeImageUrl = activeBoardItem ? activeBoardItem.originalImageUrl ?? editorImageUrl : selectedImage?.uri ?? editorImageUrl;
    const editorStyleLabel = activeBoardItem?.styleLabel ?? selectedStyle ?? "Custom";
    const editorRoomLabel = activeBoardItem?.roomLabel ?? selectedRoom ?? serviceLabel;
    const editorServiceType = activeBoardItem?.serviceType ?? inferBoardServiceType(editorStyleLabel, editorRoomLabel) ?? serviceType;
    const showSliderComparison = Boolean(editorImageUrl && beforeImageUrl);
    const isEditorProcessing = activeBoardItem?.status === "processing";
    const isEditorFailed = activeBoardItem?.status === "failed";
    const editorTitle = editorServiceType === "floor" ? "Floor Restyle" : editorServiceType === "paint" ? "Smart Wall Paint" : editorStyleLabel + " " + editorRoomLabel;
    const editorSubtitle = editorServiceType === "floor"
      ? isEditorProcessing
        ? getProcessingLabel(editorServiceType)
        : "Material-led floor transformation with a live before and after slider."
      : editorServiceType === "paint"
        ? isEditorProcessing
          ? getProcessingLabel(editorServiceType)
          : "Wall recoloring tuned to your selected finish and room lighting."
      : isEditorProcessing
        ? getProcessingLabel(editorServiceType)
        : "Curated inside your premium Darkor board.";
    const editorImageSource = editorImageUrl ? { uri: editorImageUrl } : null;
    const beforeImageSource = beforeImageUrl ? { uri: beforeImageUrl } : null;

    if (!activeBoardItem) {
      return (
        <View className="flex-1 bg-black" style={{ backgroundColor: "#000000" }}>
          <FlashList
            data={boardItems}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <BoardGridCard item={item} width={boardCardWidth} index={index} onPress={handleOpenBoardItem} />
            )}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: Math.max(insets.top + 14, 28),
              paddingBottom: Math.max(insets.bottom + 32, 40),
            }}
            ListHeaderComponent={
              <View style={{ marginBottom: 28 }} className="flex-row items-center justify-between">
                <View style={{ width: 42 }} />
                <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: "700", letterSpacing: -0.5 }}>Your Board</Text>
                <LuxPressable
                  onPress={handleResetWizard}
                  className="cursor-pointer h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5"
                  style={{ borderWidth: 0.5 }}
                >
                  <Close color="#ffffff" size={18} strokeWidth={2.2} />
                </LuxPressable>
              </View>
            }
            ListEmptyComponent={
              <View
                className="items-center justify-center rounded-[28px] border border-white/10 bg-zinc-950"
                style={{ width: boardCardWidth, height: 236, borderWidth: 0.5 }}
              >
                <Sparkles color="#71717a" size={28} />
                <Text className="mt-4 text-base font-semibold text-white">Your first board appears here</Text>
                <Text className="mt-2 px-6 text-center text-sm leading-6 text-zinc-500">
                  Generate a redesign to start building your collection.
                </Text>
              </View>
            }
            removeClippedSubviews
          />
        </View>
      );
    }

    return (
      <View className="flex-1 bg-black" style={{ backgroundColor: "#000000" }}>
        <View className="px-5" style={{ paddingTop: Math.max(insets.top + 10, 20) }}>
          <View className="flex-row items-center justify-between">
            <View className="rounded-full border border-white/10 bg-zinc-950 px-4 py-2" style={{ borderWidth: 0.5 }}>
              <Text className="text-sm font-semibold text-white">{"Diamonds " + creditBalance}</Text>
            </View>
            <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: "700", letterSpacing: -0.4 }}>Your Design</Text>
            <LuxPressable
              onPress={handleCloseBoardEditor}
              className="cursor-pointer h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5"
              style={{ borderWidth: 0.5 }}
            >
              <Close color="#ffffff" size={18} strokeWidth={2.2} />
            </LuxPressable>
          </View>
        </View>

        <ScrollView
          className="flex-1 bg-black"
          style={{ backgroundColor: "#000000" }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 22,
            paddingBottom: Math.max(insets.bottom + 34, 42),
          }}
          contentInsetAdjustmentBehavior="never"
        >
          <MotiView from={{ opacity: 0, scale: 0.96, translateY: 18 }} animate={{ opacity: 1, scale: 1, translateY: 0 }} transition={LUX_SPRING}>
            <View className="overflow-hidden rounded-[34px] border border-white/10 bg-zinc-950" style={{ borderWidth: 0.5 }}>
              <View ref={imageContainerRef} collapsable={false} onLayout={handleSliderLayout} className="relative h-[460px] w-full">
                {showSliderComparison && beforeImageSource && editorImageSource ? (
                  <MotiView
                    key={editorImageUrl}
                    from={{ opacity: 0, scale: 0.985 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={LUX_SPRING}
                    className="h-full w-full"
                  >
                    <Image source={beforeImageSource} style={{ width: "100%", height: "100%" }} contentFit="cover" cachePolicy="memory-disk" transition={120} />
                    <Animated.View
                      style={[
                        {
                          position: "absolute",
                          top: 0,
                          bottom: 0,
                          left: 0,
                          overflow: "hidden",
                        },
                        afterImageStyle,
                      ]}
                    >
                      <Image source={editorImageSource} style={{ width: "100%", height: "100%" }} contentFit="cover" cachePolicy="memory-disk" transition={120} />
                    </Animated.View>
                    <GestureDetector gesture={sliderGesture}>
                      <Animated.View
                        style={[
                          {
                            position: "absolute",
                            top: 0,
                            bottom: 0,
                            width: 52,
                            alignItems: "center",
                            justifyContent: "center",
                          },
                          sliderBarStyle,
                        ]}
                      >
                        <View
                          style={{
                            position: "absolute",
                            top: 0,
                            bottom: 0,
                            width: 2,
                            backgroundColor: "rgba(255,255,255,0.88)",
                          }}
                        />
                        <View className="h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/60">
                          <MoveHorizontal color="#ffffff" size={18} strokeWidth={2.2} />
                        </View>
                      </Animated.View>
                    </GestureDetector>
                  </MotiView>
                ) : beforeImageSource ? (
                  <Image source={beforeImageSource} style={{ width: "100%", height: "100%" }} contentFit="cover" cachePolicy="memory-disk" transition={120} />
                ) : editorImageSource ? (
                  <Image source={editorImageSource} style={{ width: "100%", height: "100%" }} contentFit="cover" cachePolicy="memory-disk" transition={120} />
                ) : (
                  <View className="h-full w-full items-center justify-center bg-zinc-900">
                    <Sparkles color="#71717a" size={28} />
                  </View>
                )}
                <View className="absolute inset-0 bg-black/10" />

                <View className="absolute left-4 right-4 top-4 flex-row items-center justify-between">
                  <View className="rounded-full border border-white/10 bg-black/40 px-3 py-1.5" style={{ borderWidth: 0.5 }}>
                    <Text className="text-xs font-semibold uppercase tracking-[1.6px] text-white/85">Before</Text>
                  </View>
                  <View className="rounded-full border border-white/10 bg-black/40 px-3 py-1.5" style={{ borderWidth: 0.5 }}>
                    <Text className="text-xs font-semibold uppercase tracking-[1.6px] text-white/85">
                      {showSliderComparison ? "After" : isEditorProcessing ? "Rendering" : "Preview"}
                    </Text>
                  </View>
                </View>

                {isEditorProcessing ? (
                  <View
                    style={{
                      position: "absolute",
                      inset: 0,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: 28,
                    }}
                  >
                    <MotiView
                      animate={{ scale: [0.92, 1.08, 0.92], opacity: [0.14, 0.28, 0.14] }}
                      transition={{ duration: 2100, loop: true }}
                      style={{
                        position: "absolute",
                        height: 210,
                        width: 210,
                        borderRadius: 999,
                        backgroundColor: "rgba(217,70,239,0.14)",
                      }}
                    />
                    <MotiView
                      animate={{ translateY: ["-22%", "110%"], opacity: [0, 0.28, 0] }}
                      transition={{ duration: 1800, loop: true }}
                      style={{
                        position: "absolute",
                        left: 18,
                        right: 18,
                        height: 120,
                        borderRadius: 28,
                        backgroundColor: "rgba(217,70,239,0.08)",
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.08)",
                      }}
                    />
                    <View
                      style={{
                        borderRadius: 28,
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.12)",
                        backgroundColor: "rgba(0,0,0,0.58)",
                        paddingHorizontal: 24,
                        paddingVertical: 20,
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <ActivityIndicator size="small" color="#ffffff" />
                      <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "700", textAlign: "center" }}>
                        {getProcessingLabel(editorServiceType)}
                      </Text>
                      <Text style={{ color: "#d4d4d8", fontSize: 13, lineHeight: 20, textAlign: "center" }}>
                        {getProcessingStatusCopy(editorServiceType)}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {isEditorFailed ? (
                  <View
                    style={{
                      position: "absolute",
                      left: 18,
                      right: 18,
                      bottom: 18,
                      borderRadius: 24,
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.08)",
                      backgroundColor: "rgba(10,10,10,0.82)",
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                    }}
                  >
                    <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "700" }}>Generation failed</Text>
                    <Text style={{ color: "#a1a1aa", fontSize: 13, lineHeight: 20, marginTop: 4 }}>
                      {activeBoardItem?.errorMessage ?? "Please go back and try another prompt."}
                    </Text>
                  </View>
                ) : null}

                {!canRemoveWatermark ? (
                  <View className="absolute bottom-5 right-4">
                    <MotiView animate={{ scale: [1, 1.03, 1], opacity: [1, 0.94, 1] }} transition={{ duration: 2200, loop: true }}>
                      <LuxPressable onPress={handleUpgrade} className="cursor-pointer">
                        <LinearGradient
                          colors={["#d946ef", "#6366f1"]}
                          start={{ x: 0, y: 0.5 }}
                          end={{ x: 1, y: 0.5 }}
                          style={{ borderRadius: 999, paddingHorizontal: 18, paddingVertical: 11 }}
                        >
                          <View className="flex-row items-center gap-2">
                            <Sparkles color="#ffffff" size={15} />
                            <Text className="text-sm font-semibold text-white">Remove Watermark</Text>
                          </View>
                        </LinearGradient>
                      </LuxPressable>
                    </MotiView>
                  </View>
                ) : null}

                {!canRemoveWatermark && editorImageUrl ? (
                  <View className="absolute bottom-24 right-4">
                    <Logo size={44} style={{ opacity: 0.6 }} />
                  </View>
                ) : null}
              </View>
            </View>
          </MotiView>

          <View className="mt-5">
            <Text className="text-lg font-semibold text-white">{editorTitle}</Text>
            <Text className="mt-1 text-sm text-zinc-400">{editorSubtitle}</Text>
          </View>

          <View className="mt-6 flex-row gap-4">
            {[
              {
                id: "save",
                label: "Save",
                icon: Download,
                onPress: canExport4k ? handleDownloadUltra : handleDownloadStandard,
                loading: canExport4k ? isDownloadingUltra : isDownloadingStandard,
                disabled: !editorImageUrl || isEditorProcessing || isEditorFailed,
              },
              {
                id: "share",
                label: "Share",
                icon: Send,
                onPress: handleShare,
                loading: isSharingResult,
                disabled: !editorImageUrl || isEditorProcessing || isEditorFailed,
              },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <LuxPressable key={action.id} onPress={action.onPress} disabled={action.loading || action.disabled} className="cursor-pointer flex-1">
                  <View
                    className="flex-row items-center justify-center gap-3 rounded-[22px] border border-white/10 bg-zinc-950 px-5 py-4"
                    style={{ borderWidth: 0.5, opacity: action.loading || action.disabled ? 0.52 : 1 }}
                  >
                    {action.loading ? <ActivityIndicator color="#ffffff" /> : <Icon color="#ffffff" size={20} strokeWidth={2.1} />}
                    <Text className="text-base font-semibold text-white">{action.label}</Text>
                  </View>
                </LuxPressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  }

}











