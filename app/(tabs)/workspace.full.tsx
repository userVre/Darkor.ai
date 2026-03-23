import { useAuth } from "@clerk/expo";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useMutation, useQuery } from "convex/react";
import { Asset } from "expo-asset";
import { BlurView } from "expo-blur";
import { Camera as ExpoCamera } from "expo-camera";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { AnimatePresence, MotiView } from "moti";
import { memo, startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
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
  X as Close,
  Bath,
  Baby,
  BedDouble,
  Building2,
  Camera,
  CarFront,
  CookingPot,
  Download,
  DoorOpen,
  Fence,
  Flower2,
  History,
  House,
  Image as ImageIcon,
  Plus,
  Monitor,
  PaintRoller,
  Projector,
  Send,
  Sofa,
  Sparkles,
  Store,
  SunMedium,
  Trees,
  UtensilsCrossed,
  MoveHorizontal,
  Wand2,
} from "lucide-react-native";

import { DIAGNOSTIC_BYPASS } from "../../lib/diagnostics";
import { triggerHaptic } from "../../lib/haptics";
import { LUX_SPRING, staggerFadeUp } from "../../lib/motion";
import { requestStoreReview } from "../../lib/store-review";
import { GlassBackdrop } from "../../components/glass-backdrop";
import { LuxPressable } from "../../components/lux-pressable";
import { useWorkspaceDraft } from "../../components/workspace-context";
import { useProSuccess } from "../../components/pro-success-context";
import Logo from "../../components/logo";
import { captureRef } from "react-native-view-shot";
type MeResponse = {
  plan: "free" | "trial" | "pro";
  credits: number;
  subscriptionType?: "free" | "weekly" | "yearly";
  subscriptionEnd?: number;
  imageGenerationCount?: number;
  lastResetDate?: number;
  imageGenerationLimit?: number;
  imagesRemaining?: number;
  subscriptionActive?: boolean;
  generationLimitReached?: boolean;
  generationStatusLabel?: string;
  generationStatusMessage?: string;
};

type SelectedImage = {
  uri: string;
  base64?: string;
  label?: string;
};

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
            <View className="h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/35">
              <ActivityIndicator size="small" color="#ffffff" />
            </View>
            <Text className="text-sm font-semibold text-white">Generating...</Text>
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
          <Text className="mt-1 text-xs text-zinc-300">
            {isProcessing
              ? "Generating with Gemini..."
              : isFailed
                ? "Generation failed. Tap for details."
                : "Tap to open your design editor"}
          </Text>
        </View>
      </LuxPressable>
    </View>
  );
});

const EXAMPLE_PHOTOS: ExamplePhoto[] = [
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
    "Luxury Villa",
    "Office Building",
    "Apartment Block",
    "Retail Store",
    "Garage",
  ],
  garden: ["Backyard", "Front yard", "Patio", "Swimming Pool", "Terrace", "Deck"],
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

const CUSTOM_STYLE_EXAMPLE_PROMPTS = [
  "Design a farmhouse kitchen with rustic oak cabinetry, aged brass fixtures, and warm layered lighting.",
  "Create a moody luxury living room with sculptural seating, smoked glass accents, and hotel-level ambiance.",
  "Transform this into a serene Japandi bedroom with soft limestone tones, natural wood, and tactile textiles.",
  "Reimagine the patio as a Mediterranean outdoor lounge with curved built-ins, olive trees, and sunset warmth.",
];

const PALETTE_OPTIONS: PaletteOption[] = [
  {
    id: "surprise",
    label: "Surprise Me",
    colors: ["#f7f7f5", "#f4d7a6", "#fd5d82", "#6b8afd", "#121212"],
    description: "Unexpected yet balanced.",
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
    label: "Neon Sunset",
    colors: ["#f59e0b", "#ff4db8", "#8b00ff", "#fff04d", "#ffd8a8"],
    description: "High-contrast playful glow.",
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

const ROOM_CARD_META = {
  "Living Room": { icon: Sofa, description: "Layered lounge refinement." },
  Bedroom: { icon: BedDouble, description: "A calmer, hotel-like retreat." },
  Kitchen: { icon: CookingPot, description: "Sharper culinary flow and finishes." },
  Bathroom: { icon: Bath, description: "Spa-driven comfort and texture." },
  "Home Office": { icon: Monitor, description: "Focused executive atmosphere." },
  "Dining Room": { icon: UtensilsCrossed, description: "Gathering-ready statement dining." },
  Nursery: { icon: Baby, description: "Soft comfort with practical balance." },
  "Home Theater": { icon: Projector, description: "Immersive cinematic ambiance." },
  "Modern House": { icon: House, description: "Contemporary curbside presence." },
  "Luxury Villa": { icon: Sparkles, description: "Resort-inspired exterior drama." },
  "Office Building": { icon: Building2, description: "Sharper executive frontage." },
  "Apartment Block": { icon: Building2, description: "Refined urban facade refresh." },
  "Retail Store": { icon: Store, description: "Street-facing brand appeal." },
  Garage: { icon: CarFront, description: "Polished practical shell." },
  Backyard: { icon: Trees, description: "Outdoor entertaining retreat." },
  "Front yard": { icon: Fence, description: "First-impression landscaping." },
  Patio: { icon: SunMedium, description: "Relaxed open-air layering." },
  "Swimming Pool Area": { icon: Flower2, description: "Resort-style poolside calm." },
  Terrace: { icon: DoorOpen, description: "Elevated lounge with a view." },
} as const;

const MODE_OPTIONS: ModeOption[] = [
  {
    id: "preserve",
    title: "Structural Preservation",
    description: "Follow your room's structure closely.",
    promptHint:
      "Preserve the original architecture, room structure, camera angle, and layout as closely as possible while upgrading furniture, finishes, and mood.",
    icon: PaintRoller,
  },
  {
    id: "renovate",
    title: "Renovation Design",
    description: "Have more freedom to change your space.",
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
  paint: "Wall Paint",
};


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
  const { service, presetStyle, presetRoom, startStep } = useLocalSearchParams<{
    service?: string;
    presetStyle?: string;
    presetRoom?: string;
    startStep?: string;
  }>();
  const { isSignedIn } = useAuth();
  const diagnostic = DIAGNOSTIC_BYPASS;
  const effectiveSignedIn = isSignedIn;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { draft, setDraftAspectRatio, setDraftImage, setDraftPalette, setDraftPrompt, setDraftRoom, setDraftStyle } =
    useWorkspaceDraft();
  const { showToast } = useProSuccess();

  const me = useQuery(
    "users:me" as any,
    diagnostic ? "skip" : isSignedIn ? {} : "skip",
  ) as MeResponse | null | undefined;
  const generationArchive = useQuery(
    "generations:getUserArchive" as any,
    diagnostic ? "skip" : isSignedIn ? {} : "skip",
  ) as ArchiveGeneration[] | undefined;
  const ensureUser = useMutation("users:getOrCreateCurrentUser" as any);
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
  const [selectedModeId, setSelectedModeId] = useState<ModeOption["id"] | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [customPromptDraft, setCustomPromptDraft] = useState("");
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

  const reviewSheetRef = useRef<BottomSheetModal>(null);
  const rateSheetRef = useRef<BottomSheetModal>(null);
  const feedbackSheetRef = useRef<BottomSheetModal>(null);
  const photoSourceSheetRef = useRef<BottomSheetModal>(null);
  const customPromptSheetRef = useRef<BottomSheetModal>(null);
  const imageContainerRef = useRef<View>(null);
  const hasAppliedStartStepRef = useRef(false);
  const reviewHandledRef = useRef(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationAlertedFailureRef = useRef<string | null>(null);
  const sliderX = useSharedValue(0);
  const sliderWidth = useSharedValue(0);
  const sliderStart = useSharedValue(0);
  const likeScale = useSharedValue(1);
  const dislikeScale = useSharedValue(1);

  const isSmallScreen = height < 740;
  const reviewSnapPoints = useMemo(() => ["38%"], []);
  const rateSnapPoints = useMemo(() => ["36%"], []);
  const feedbackSnapPoints = useMemo(() => [isSmallScreen ? "95%" : "58%"], [isSmallScreen]);
  const photoSourceSnapPoints = useMemo(() => [isSmallScreen ? "38%" : "34%"], [isSmallScreen]);
  const customPromptSnapPoints = useMemo(() => [isSmallScreen ? "90%" : "74%"], [isSmallScreen]);
  const serviceKey = String(service ?? "interior").toLowerCase();
  const serviceType = getServiceType(serviceKey);
  const serviceLabel = SERVICE_LABELS[serviceType] ?? "Interior Redesign";
  const presetRoomOptions =
    serviceType === "exterior"
      ? SPACE_OPTIONS.exterior
      : serviceType === "garden"
        ? SPACE_OPTIONS.garden
        : SPACE_OPTIONS.interior;

  useEffect(() => {
    if (diagnostic) return;
    if (!isSignedIn) return;
    ensureUser({}).catch(() => undefined);
  }, [diagnostic, ensureUser, isSignedIn]);

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
    const matched = STYLE_OPTIONS.find((style) => style.toLowerCase() === normalized);
    if (matched) {
      setSelectedStyle(matched);
    }
  }, [presetStyle, selectedStyle]);

  useEffect(() => {
    if (!presetRoom || selectedRoom) return;
    const normalized = String(presetRoom).trim().toLowerCase();
    const matched = presetRoomOptions.find((room) => room.toLowerCase() === normalized);
    if (matched) {
      setSelectedRoom(matched);
    }
  }, [presetRoom, presetRoomOptions, selectedRoom]);

  useEffect(() => {
    if (workflowStep === 5 && generatedImageUrl) {
      triggerHaptic();
    }
  }, [generatedImageUrl, workflowStep]);

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
  const wizardCardWidth = useMemo(() => Math.max((width - 48 - wizardColumnGap) / 2, 148), [width]);
  const wizardStyleGap = 12;
  const wizardStyleCardWidth = useMemo(() => Math.max((width - 40 - wizardStyleGap * 2) / 3, 98), [width]);
  const wizardPaletteGap = 12;
  const wizardPaletteCardWidth = useMemo(() => Math.max((width - 40 - wizardPaletteGap * 2) / 3, 98), [width]);
  const wizardExampleCardSize = useMemo(() => Math.min(Math.max(width * 0.27, 92), 118), [width]);
  const wizardUploadSize = useMemo(() => Math.max(Math.min(width - 56, 336), 252), [width]);

  const spaceOptions = useMemo(() => {
    if (serviceType === "exterior") return SPACE_OPTIONS.exterior;
    if (serviceType === "garden") return SPACE_OPTIONS.garden;
    return SPACE_OPTIONS.interior;
  }, [serviceType]);

  const plan = diagnostic ? "pro" : me?.plan ?? "free";
  const isProPlan = plan === "pro";
  const planUsed = plan === "pro" ? "pro" : plan === "trial" ? "trial" : "free";
  const generationSpeedTier = useMemo<GenerationSpeedTier>(() => {
    if (me?.subscriptionType === "yearly") {
      return "ultra";
    }
    if (plan === "pro") {
      return "pro";
    }
    return "standard";
  }, [me?.subscriptionType, plan]);
  const imagesRemaining = diagnostic ? 999 : me?.imagesRemaining ?? 0;
  const imageGenerationLimit = diagnostic ? 999 : me?.imageGenerationLimit ?? 0;
  const generationStatusLabel = diagnostic ? "Unlimited diagnostic" : me?.generationStatusLabel ?? "0 / 0 images left";
  const generationStatusMessage = diagnostic ? "Diagnostic access enabled." : me?.generationStatusMessage ?? "Limit Reached - Upgrade or Wait";
  const generationBlocked = !diagnostic && (!(me?.subscriptionActive ?? false) || (me?.generationLimitReached ?? true));
  const ignoreReviewCooldown = __DEV__ || process.env.EXPO_PUBLIC_REVIEW_FORCE === "1";
  const isDownloadingStandard = isDownloading === "standard";
  const isDownloadingUltra = isDownloading === "ultra";
  const activeEditorImageUrl = activeBoardItem?.imageUrl ?? generatedImageUrl;
  const sliderSpring = useMemo(() => ({ damping: 15, stiffness: 100 }), []);

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

      if (activeBoardItemId !== currentGeneration.id) {
        setActiveBoardItemId(currentGeneration.id);
      }

      if (workflowStep !== 5) {
        setWorkflowStep(5);
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
      Alert.alert("Generation failed", currentGeneration.errorMessage ?? "Please try again.");
    }
  }, [activeBoardItemId, boardItems, generatedImageUrl, generationId, pendingReviewState, workflowStep]);

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
      if (selectedStyle === "Custom") {
        return customPrompt.trim().length > 0;
      }
      return Boolean(selectedStyle);
    }
    if (workflowStep === 3) return Boolean(selectedModeId && selectedPaletteId);
    return false;
  }, [customPrompt, selectedImage, selectedModeId, selectedPaletteId, selectedRoom, selectedStyle, workflowStep]);

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
    const current = await ExpoCamera.getCameraPermissionsAsync();
    if (current.granted) return true;

    const next = current.canAskAgain ? await ExpoCamera.requestCameraPermissionsAsync() : current;
    if (next.granted) return true;

    showPermissionAlert();
    return false;
  }, [showPermissionAlert]);

  const ensurePhotoIntakePermissions = useCallback(async () => {
    const hasCameraPermission = await ensureCameraPermission();
    if (!hasCameraPermission) {
      return false;
    }

    const hasMediaLibraryPermission = await ensureMediaLibraryPermission();
    if (!hasMediaLibraryPermission) {
      return false;
    }

    return true;
  }, [ensureCameraPermission, ensureMediaLibraryPermission]);

  const applyPickedAsset = useCallback(async (asset: ImagePicker.ImagePickerAsset, label: string) => {
    startTransition(() => {
      setSelectedImage({
        uri: asset.uri,
        label,
      });
    });
  }, []);

  const launchPhotoSource = useCallback(
    async (source: "camera" | "library") => {
      photoSourceSheetRef.current?.dismiss();
      await new Promise((resolve) => setTimeout(resolve, 180));

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
        await applyPickedAsset(asset, source === "camera" ? "Captured Photo" : "Uploaded Photo");
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

  const handlePickPhoto = useCallback(async () => {
    triggerHaptic();
    setIsSelectingPhoto(true);
    try {
      const hasPermissions = await ensurePhotoIntakePermissions();
      if (!hasPermissions) {
        return;
      }

      photoSourceSheetRef.current?.present();
    } finally {
      setIsSelectingPhoto(false);
    }
  }, [ensurePhotoIntakePermissions]);

  const handleClearSelectedImage = useCallback(() => {
    triggerHaptic();
    startTransition(() => {
      setSelectedImage(null);
    });
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
      setWorkflowStep(3);
      return;
    }
    setWorkflowStep((prev) => Math.max(prev - 1, 0));
  }, [router, workflowStep]);

  const handleResetWizard = useCallback(() => {
    triggerHaptic();
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
    });
    setIsLoadingExample(null);
    setIsSelectingPhoto(false);
    setCustomPromptDraft("");
    customPromptSheetRef.current?.dismiss();
    setReviewPromptOpen(false);
    setRatePromptOpen(false);
    setFeedbackOpen(false);
    setAwaitingAuth(false);
  }, [setDraftAspectRatio, setDraftImage, setDraftPalette, setDraftPrompt, setDraftRoom, setDraftStyle]);

  const handleCloseWizard = useCallback(() => {
    handleResetWizard();
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/workspace");
  }, [handleResetWizard, router]);

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
    if (isProPlan) {
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
  }, [activeEditorImageUrl, imageContainerRef, isProPlan, sliderWidth, sliderX]);

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

    if (!isProPlan) {
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
  }, [activeEditorImageUrl, cleanupTempFile, ensureGallerySavePermission, exportCurrentRender, handleUpgrade, isProPlan, showToast]);



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
      await submitGenerationFeedback({ id: generationId, sentiment: "liked" });
      showToast("Feedback saved. We will lean into results like this.");
    } catch (error) {
      setFeedbackState(null);
      setFeedbackSubmitted(false);
      Alert.alert("Feedback failed", error instanceof Error ? error.message : "Please try again.");
    }
  }, [animateFeedbackButton, feedbackSubmitted, generationId, showToast, submitGenerationFeedback]);

  const handleDislike = useCallback(async () => {
    if (!generationId || feedbackSubmitted) return;
    triggerHaptic();
    animateFeedbackButton("disliked");
    setFeedbackState("disliked");
    setFeedbackSubmitted(true);
    try {
      const result = (await submitGenerationFeedback({
        id: generationId,
        sentiment: "disliked",
      })) as { retryGranted?: boolean };
      showToast(
        result?.retryGranted
          ? "Feedback saved. A retry credit was added to your account."
          : "Feedback saved. We will use it to improve future renders.",
      );
    } catch (error) {
      setFeedbackState(null);
      setFeedbackSubmitted(false);
      Alert.alert("Feedback failed", error instanceof Error ? error.message : "Please try again.");
    }
  }, [animateFeedbackButton, feedbackSubmitted, generationId, showToast, submitGenerationFeedback]);


  const uploadSelectedImageToStorage = useCallback(async (image: SelectedImage) => {
    const uploadUrl = (await createSourceUploadUrl({})) as string;
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
  }, [createSourceUploadUrl]);

  const handleGenerate = useCallback(async (options?: { regenerate?: boolean }) => {
    if (!selectedImage || !selectedRoom || !selectedStyle || !selectedPalette || !selectedMode) {
      Alert.alert("Complete the steps", "Please finish the previous steps first.");
      return;
    }

    if (!effectiveSignedIn) {
      setAwaitingAuth(true);
      router.push({ pathname: "/sign-in", params: { returnTo: "/workspace" } });
      return;
    }

    if (!diagnostic && generationBlocked) {
      Alert.alert("Limit Reached", generationStatusMessage);
      return;
    }

    try {
      setFeedbackState(null);
      setFeedbackSubmitted(false);
      setGeneratedImageUrl(null);
      setGenerationId(null);
      generationAlertedFailureRef.current = null;
      setPendingReviewState(null);
      setIsGenerating(true);
      setWorkflowStep(4);

      const sourceStorageId = await uploadSelectedImageToStorage(selectedImage);
      const startResult = (await startGeneration({
        sourceStorageId,
        roomType: selectedRoom,
        style: selectedStyle,
        customPrompt: customPrompt.trim().length > 0 ? customPrompt.trim() : undefined,
        aspectRatio: ratioSpec.ratioLabel,
        colorPalette: selectedPalette.label,
        modeLabel: selectedMode.title,
        modePromptHint: selectedMode.promptHint,
        regenerate: options?.regenerate ?? false,
        ignoreReviewCooldown,
        speedTier: generationSpeedTier,
      })) as {
        generationId: string;
        reviewState?: { count: number; shouldPrompt: boolean };
      };

      const nextBoardItem: BoardRenderItem = {
        id: startResult.generationId,
        imageUrl: null,
        originalImageUrl: selectedImage.uri,
        styleLabel: selectedStyle,
        roomLabel: selectedRoom,
        generationId: startResult.generationId,
        status: "processing",
        errorMessage: null,
        createdAt: Date.now(),
      };

      setPendingBoardItems((current) => [nextBoardItem, ...current.filter((item) => item.id !== nextBoardItem.id)]);
      setGenerationId(startResult.generationId);
      setPendingReviewState(startResult.reviewState ?? null);
      if (startResult.reviewState) {
        setLastGenerationCount(startResult.reviewState.count);
      }
      setActiveBoardItemId(null);
      setWorkflowStep(5);
    } catch (error) {
      setWorkflowStep(3);
      Alert.alert("Generation failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [
    createSourceUploadUrl,
    customPrompt,
    diagnostic,
    effectiveSignedIn,
    generationBlocked,
    generationSpeedTier,
    generationStatusMessage,
    ignoreReviewCooldown,
    ratioSpec.ratioLabel,
    router,
    selectedImage,
    selectedMode,
    selectedPalette,
    selectedRoom,
    selectedStyle,
    startGeneration,
    uploadSelectedImageToStorage,
  ]);

  useEffect(() => {
    if (!effectiveSignedIn || !awaitingAuth) return;
    if (!canContinue) {
      setAwaitingAuth(false);
      return;
    }
    setAwaitingAuth(false);
    const timer = setTimeout(() => {
      void handleGenerate();
    }, 300);
    return () => clearTimeout(timer);
  }, [awaitingAuth, canContinue, effectiveSignedIn, handleGenerate]);

  const handleContinue = useCallback(() => {
    triggerHaptic();
    if (!canContinue) {
      Alert.alert("Complete this step", "Please make a selection to continue.");
      return;
    }

    if (workflowStep === 3) {
      void handleGenerate();
      return;
    }

    setWorkflowStep((prev) => Math.min(prev + 1, 5));
  }, [canContinue, handleGenerate, workflowStep]);

  const handleSelectRoom = useCallback((value: string) => {
    triggerHaptic();
    setSelectedRoom(value);
  }, []);

  const handleOpenCustomStyle = useCallback(() => {
    triggerHaptic();
    setCustomPromptDraft(customPrompt);
    customPromptSheetRef.current?.present();
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
    startTransition(() => {
      setCustomPrompt(trimmed);
      setSelectedStyle("Custom");
    });
    customPromptSheetRef.current?.dismiss();
  }, [customPromptDraft]);

  const handleSelectStyle = useCallback((value: string) => {
    triggerHaptic();
    startTransition(() => {
      setSelectedStyle(value);
      if (value === "Custom") {
        setCustomPromptDraft(customPrompt);
      }
    });
  }, [customPrompt]);

  const handleChangeCustomPrompt = useCallback((value: string) => {
    setCustomPrompt(value);
    setCustomPromptDraft(value);
    if (selectedStyle !== "Custom") {
      setSelectedStyle("Custom");
    }
  }, [selectedStyle]);

  const handleSelectCustomPromptExample = useCallback((value: string) => {
    triggerHaptic();
    startTransition(() => {
      setSelectedStyle("Custom");
      setCustomPrompt(value);
      setCustomPromptDraft(value);
    });
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
    if (item.status === "processing") {
      showToast("Your redesign is still processing.");
      return;
    }

    if (item.status === "failed" || !item.imageUrl) {
      Alert.alert("Generation failed", item.errorMessage ?? "This redesign did not finish. Please try generating again.");
      return;
    }

    triggerHaptic();
    setActiveBoardItemId(item.id);
    setGeneratedImageUrl(item.imageUrl);
    setGenerationId(item.generationId ?? null);
    setShowBeforeOnly(false);
    setFeedbackState(null);
    setFeedbackSubmitted(false);
    if (sliderWidth.value > 0) {
      sliderX.value = withSpring(sliderWidth.value / 2, sliderSpring);
    }
  }, [showToast, sliderSpring, sliderWidth, sliderX]);

  const handleCloseBoardEditor = useCallback(() => {
    triggerHaptic();
    setActiveBoardItemId(null);
    setShowBeforeOnly(false);
  }, []);

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
        await deleteGeneration({ id: item.generationId });
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
  }, [activeBoardItem, deleteGeneration, showToast]);

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
      await markReviewPrompted({});
    } catch {
      // noop
    }
    setRatePromptOpen(true);
    requestAnimationFrame(() => rateSheetRef.current?.present());
  }, [markReviewPrompted]);

  const handleReviewNo = useCallback(async () => {
    triggerHaptic();
    reviewHandledRef.current = true;
    setReviewPromptOpen(false);
    reviewSheetRef.current?.dismiss();
    try {
      await markReviewPrompted({});
    } catch {
      // noop
    }
    setFeedbackOpen(true);
    requestAnimationFrame(() => feedbackSheetRef.current?.present());
  }, [markReviewPrompted]);

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
  }, [feedbackMessage, lastGenerationCount, submitFeedback]);

  const stepTransition = LUX_SPRING;
  const isPhotoPreviewBusy = isSelectingPhoto || isLoadingExample !== null;

  if (workflowStep <= 3) {
    const currentStepNumber = workflowStep + 1;
    const isFinalWizardStep = workflowStep === 3;
    const isPhotoStep = workflowStep === 0;
    const hasSelectedPhoto = Boolean(selectedImage);
    const wizardBackgroundColor = isPhotoStep ? "#000000" : "#ffffff";
    const wizardPrimaryTextColor = isPhotoStep ? "#ffffff" : "#09090b";
    const progressTrackColor = isPhotoStep ? "#26262b" : "#d4d4d8";
    const uploadTileSize = wizardUploadSize;
    const stepOneExampleCardWidth = Math.min(Math.max(width * 0.36, 132), 152);
    const stepContentMinHeight = Math.max(
      height - Math.max(insets.top + (isPhotoStep ? 18 : 8), isPhotoStep ? 24 : 20) - Math.max(insets.bottom + (isPhotoStep ? 148 : 124), isPhotoStep ? 176 : 144),
      isPhotoStep ? 520 : 460,
    );
    const isContinueDisabled = !canContinue || (isFinalWizardStep && (isGenerating || generationBlocked));
    const continueLabel = isFinalWizardStep
      ? generationBlocked
        ? "Limit Reached - Upgrade or Wait"
        : isGenerating
          ? "Processing..."
          : "Continue"
      : "Continue";

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
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: isPhotoStep ? 24 : 20,
            paddingTop: Math.max(insets.top + (isPhotoStep ? 14 : 8), isPhotoStep ? 22 : 20),
            paddingBottom: Math.max(insets.bottom + (isPhotoStep ? 148 : 124), isPhotoStep ? 176 : 144),
            minHeight: height,
          }}
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flex: 1, gap: 24 }}>
            {isPhotoStep ? (
              <View style={{ gap: 16 }}>
                <View className="flex-row" style={{ gap: 8 }}>
                  {[0, 1, 2, 3].map((index) => (
                    <MotiView
                      key={`wizard-progress-${index}`}
                      from={{ opacity: 0.78, scaleX: 0.96 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      transition={{ ...LUX_SPRING, delay: 40 + index * 32 }}
                      style={{
                        flex: 1,
                        height: 4,
                        borderRadius: 999,
                        backgroundColor: index === 0 ? "#d946ef" : progressTrackColor,
                      }}
                    />
                  ))}
                </View>

                <View className="items-end">
                  <LuxPressable
                    onPress={handleCloseWizard}
                    className="cursor-pointer h-11 w-11 items-center justify-center rounded-full"
                    style={{
                      borderWidth: 0.5,
                      borderColor: "rgba(255,255,255,0.12)",
                      backgroundColor: "rgba(255,255,255,0.04)",
                    }}
                  >
                    <Close color="#ffffff" size={20} strokeWidth={2.2} />
                  </LuxPressable>
                </View>
              </View>
            ) : (
              <>
                <View className="flex-row items-center justify-between">
                  <View style={{ width: 44, alignItems: "flex-start" }}>
                    {workflowStep > 0 ? (
                      <LuxPressable onPress={handleBack} className="cursor-pointer h-11 w-11 items-center justify-center rounded-full">
                        <ArrowLeft color={wizardPrimaryTextColor} size={22} strokeWidth={2.1} />
                      </LuxPressable>
                    ) : null}
                  </View>
                  <Text style={{ color: wizardPrimaryTextColor, fontSize: 18, fontWeight: "700", letterSpacing: -0.3 }}>
                    {`Step ${currentStepNumber} / 4`}
                  </Text>
                  <View style={{ width: 44, alignItems: "flex-end" }}>
                    <LuxPressable onPress={handleCloseWizard} className="cursor-pointer h-11 w-11 items-center justify-center rounded-full">
                      <Close color={wizardPrimaryTextColor} size={22} strokeWidth={2.1} />
                    </LuxPressable>
                  </View>
                </View>

                <View className="flex-row gap-3">
                  {[0, 1, 2, 3].map((index) => {
                    const active = index <= workflowStep;
                    return (
                      <View
                        key={`wizard-progress-${index}`}
                        style={{
                          flex: 1,
                          height: 6,
                          borderRadius: 999,
                          overflow: "hidden",
                          backgroundColor: progressTrackColor,
                        }}
                      >
                        <MotiView
                          animate={{ width: active ? "100%" : "0%" }}
                          transition={LUX_SPRING}
                          style={{ height: "100%", borderRadius: 999, backgroundColor: "#d946ef" }}
                        />
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            <AnimatePresence exitBeforeEnter>
              <MotiView
                key={`wizard-step-${workflowStep}`}
                from={{ opacity: 0, translateX: 18, scale: 0.99 }}
                animate={{ opacity: 1, translateX: 0, scale: 1 }}
                exit={{ opacity: 0, translateX: -14, scale: 0.99 }}
                transition={stepTransition}
                style={isPhotoStep ? { flex: 1, minHeight: stepContentMinHeight, gap: 24 } : { gap: 24 }}
              >
                {workflowStep === 0 ? (
                  <View style={{ flex: 1, gap: 24 }}>
                    <View style={{ gap: 10 }}>
                      <Text
                        style={{
                          color: "#ffffff",
                          fontSize: 30,
                          fontWeight: "800",
                          letterSpacing: -0.8,
                          textAlign: "center",
                        }}
                      >
                        Start Redesigning
                      </Text>
                      <Text
                        style={{
                          color: "#a1a1aa",
                          fontSize: 15,
                          lineHeight: 22,
                          textAlign: "center",
                          paddingHorizontal: 14,
                        }}
                      >
                        Upload a room photo to begin Step 1 of 4.
                      </Text>
                    </View>

                    <MotiView
                      key={selectedImage?.uri ?? "empty-upload"}
                      from={{ opacity: 0, scale: 0.985, translateY: 14 }}
                      animate={{ opacity: 1, scale: 1, translateY: 0 }}
                      transition={LUX_SPRING}
                      style={{ alignItems: "center", justifyContent: "center", paddingVertical: 8 }}
                    >
                      <LuxPressable
                        onPress={handlePickPhoto}
                        className="cursor-pointer self-center"
                        style={{
                          width: uploadTileSize,
                          height: uploadTileSize,
                          borderRadius: 32,
                          borderWidth: hasSelectedPhoto ? 1 : 2,
                          borderColor: hasSelectedPhoto ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.3)",
                          borderStyle: hasSelectedPhoto ? "solid" : "dashed",
                          overflow: "hidden",
                          alignSelf: "center",
                          backgroundColor: "#0a0a0a",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        {hasSelectedPhoto ? (
                          <>
                            <Image
                              source={{ uri: selectedImage?.uri ?? "" }}
                              style={{ width: "100%", height: "100%" }}
                              contentFit="cover"
                              transition={180}
                              cachePolicy="memory-disk"
                            />
                            <View
                              pointerEvents="none"
                              style={{
                                position: "absolute",
                                left: 0,
                                right: 0,
                                bottom: 0,
                                paddingHorizontal: 16,
                                paddingVertical: 16,
                                backgroundColor: "rgba(0,0,0,0.36)",
                              }}
                            >
                              <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "700" }}>Photo Ready</Text>
                              <Text style={{ color: "#d4d4d8", fontSize: 12, marginTop: 4 }}>
                                Continue to choose your room type.
                              </Text>
                            </View>
                            <LuxPressable
                              onPress={(event) => {
                                event.stopPropagation();
                                handleClearSelectedImage();
                              }}
                              className="cursor-pointer absolute right-4 top-4 h-10 w-10 items-center justify-center rounded-full"
                              style={{
                                borderWidth: 1,
                                borderColor: "rgba(255,255,255,0.18)",
                                backgroundColor: "rgba(0,0,0,0.62)",
                              }}
                            >
                              <Close color="#ffffff" size={18} strokeWidth={2.4} />
                            </LuxPressable>
                            {isPhotoPreviewBusy ? (
                              <View
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  alignItems: "center",
                                  justifyContent: "center",
                                  backgroundColor: "rgba(0,0,0,0.22)",
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
                              paddingHorizontal: 24,
                              paddingVertical: 24,
                            }}
                          >
                            <View
                              style={{
                                width: 64,
                                height: 64,
                                borderRadius: 32,
                                borderWidth: 1.5,
                                borderColor: "rgba(255,255,255,0.24)",
                                backgroundColor: "rgba(255,255,255,0.06)",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Plus color="#ffffff" size={24} strokeWidth={2.5} />
                            </View>
                            <Text
                              style={{
                                color: "#ffffff",
                                fontSize: 24,
                                fontWeight: "800",
                                textAlign: "center",
                                marginTop: 18,
                              }}
                            >
                              Start Redesigning
                            </Text>
                            <Text
                              style={{
                                color: "#a1a1aa",
                                fontSize: 14,
                                lineHeight: 21,
                                textAlign: "center",
                                marginTop: 8,
                                maxWidth: 220,
                              }}
                            >
                              Tap to take a photo or upload
                            </Text>
                            {isPhotoPreviewBusy ? (
                              <ActivityIndicator style={{ marginTop: 16 }} size="small" color="#ffffff" />
                            ) : null}
                          </View>
                        )}
                      </LuxPressable>
                    </MotiView>

                    <View style={{ gap: 12 }}>
                      <Text
                        style={{
                          color: "#ffffff",
                          fontSize: 18,
                          fontWeight: "700",
                          paddingHorizontal: 2,
                        }}
                      >
                        Example Photos
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
                          contentContainerStyle={{ paddingRight: 4, gap: 14 }}
                        >
                          {EXAMPLE_PHOTOS.slice(0, 4).map((example, index) => {
                            const active = selectedImage?.label === example.label;
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
                                    borderRadius: 24,
                                    borderWidth: active ? 1.5 : 1,
                                    borderColor: active ? "#d946ef" : "rgba(255,255,255,0.14)",
                                    backgroundColor: "#111111",
                                    overflow: "hidden",
                                  }}
                                >
                                  <View style={{ height: 118, backgroundColor: "#1a1a1a" }}>
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
                                          backgroundColor: "rgba(0,0,0,0.24)",
                                        }}
                                      >
                                        <ActivityIndicator size="small" color="#ffffff" />
                                      </View>
                                    ) : null}
                                  </View>
                                  <View style={{ paddingHorizontal: 12, paddingVertical: 12 }}>
                                    <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "700" }}>
                                      {example.label}
                                    </Text>
                                    <Text
                                      style={{
                                        color: "#a1a1aa",
                                        fontSize: 12,
                                        marginTop: 4,
                                      }}
                                    >
                                      Tap to use this as your main photo
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
                    <View style={{ gap: 12 }}>
                      <Text style={{ color: "#09090b", fontSize: 34, fontWeight: "700", letterSpacing: -1.1 }}>Choose Space</Text>
                      <Text style={{ color: "#71717a", fontSize: 15, lineHeight: 24, maxWidth: 340 }}>
                        Tell Darkor.ai what kind of room or area you want to transform.
                      </Text>
                    </View>

                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: wizardColumnGap }}>
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
                              className="cursor-pointer rounded-[24px] border px-4 py-4"
                              style={{
                                minHeight: 148,
                                borderWidth: active ? 1.5 : 1,
                                borderColor: active ? "#d946ef" : "#e4e4e7",
                                backgroundColor: active ? "rgba(217,70,239,0.08)" : "#fafafa",
                              }}
                            >
                              <View className="flex-row items-start justify-between">
                                <View className="h-12 w-12 items-center justify-center rounded-[16px] bg-white" style={{ borderWidth: 1, borderColor: active ? "rgba(217,70,239,0.22)" : "#e4e4e7" }}>
                                  <RoomIcon color={active ? "#d946ef" : "#18181b"} size={22} strokeWidth={2} />
                                </View>
                                {active ? <BadgeCheck color="#d946ef" size={18} strokeWidth={2} /> : null}
                              </View>
                              <View style={{ marginTop: 16, gap: 6 }}>
                                <Text className="text-lg font-semibold text-zinc-950">{option}</Text>
                                <Text className="text-sm leading-6 text-zinc-500">{meta.description}</Text>
                              </View>
                            </LuxPressable>
                          </MotiView>
                        );
                      })}
                    </View>
                  </>
                ) : null}

                {workflowStep === 2 ? (
                  <>
                    <View style={{ gap: 12 }}>
                      <Text style={{ color: "#09090b", fontSize: 34, fontWeight: "700", letterSpacing: -1.1 }}>Select Style</Text>
                      <Text style={{ color: "#71717a", fontSize: 15, lineHeight: 24, maxWidth: 340 }}>
                        Choose one of the design styles below, or write your own custom brief.
                      </Text>
                    </View>

                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: wizardStyleGap }}>
                      {[{ id: "custom", title: "Custom", image: null }, ...STYLE_LIBRARY].map((style, index) => {
                        const isCustomCard = style.title === "Custom";
                        const active = selectedStyle === style.title;
                        return (
                          <MotiView key={style.id} {...staggerFadeUp(index, 18)} style={{ width: wizardStyleCardWidth }}>
                            <LuxPressable
                              onPress={() => handleSelectStyle(style.title)}
                              className="cursor-pointer overflow-hidden rounded-[24px] border"
                              style={{
                                borderWidth: active ? 1.5 : 1,
                                borderColor: active ? "#d946ef" : "#e4e4e7",
                                backgroundColor: "#ffffff",
                              }}
                            >
                              {isCustomCard ? (
                                <LinearGradient
                                  colors={["#fde7ff", "#f8fafc"]}
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
                                <Text className="text-sm font-semibold text-zinc-950" numberOfLines={2}>{style.title}</Text>
                                {isCustomCard && customPrompt.trim().length > 0 ? (
                                  <Text className="mt-2 text-xs leading-5 text-zinc-500" numberOfLines={2}>{customPrompt}</Text>
                                ) : null}
                              </View>
                              {active ? (
                                <View className="absolute right-2 top-2 rounded-full bg-white p-1.5" style={{ borderWidth: 1, borderColor: "rgba(217,70,239,0.22)" }}>
                                  <BadgeCheck color="#d946ef" size={16} strokeWidth={2} />
                                </View>
                              ) : null}
                            </LuxPressable>
                          </MotiView>
                        );
                      })}
                    </View>

                    {selectedStyle === "Custom" ? (
                      <View className="overflow-hidden rounded-[28px] border bg-white" style={{ borderWidth: 1, borderColor: "#e4e4e7" }}>
                        <View style={{ padding: 18, gap: 14 }}>
                          <Text className="text-lg font-semibold text-zinc-950">Custom Prompt</Text>
                          <View className="rounded-[22px] border bg-zinc-50 px-4 py-4" style={{ borderWidth: 1, borderColor: "#e4e4e7" }}>
                            <TextInput
                              value={customPrompt}
                              onChangeText={handleChangeCustomPrompt}
                              multiline
                              placeholder="Describe the look you want, key materials, lighting, furniture direction, and standout features."
                              placeholderTextColor="#71717a"
                              textAlignVertical="top"
                              style={{ color: "#09090b", fontSize: 15, lineHeight: 24, minHeight: 132 }}
                            />
                          </View>
                          <View style={{ gap: 10 }}>
                            <Text className="text-sm font-semibold text-zinc-950">Example Prompts</Text>
                            <View style={{ gap: 10 }}>
                              {CUSTOM_STYLE_EXAMPLE_PROMPTS.map((prompt) => (
                                <LuxPressable key={prompt} onPress={() => handleSelectCustomPromptExample(prompt)} className="cursor-pointer rounded-[20px] border bg-zinc-50 px-4 py-4" style={{ borderWidth: 1, borderColor: "#e4e4e7" }}>
                                  <Text className="text-sm leading-6 text-zinc-600">{prompt}</Text>
                                </LuxPressable>
                              ))}
                            </View>
                          </View>
                        </View>
                      </View>
                    ) : null}
                  </>
                ) : null}

                {workflowStep === 3 ? (
                  <>
                    <View style={{ gap: 12 }}>
                      <Text style={{ color: "#09090b", fontSize: 34, fontWeight: "700", letterSpacing: -1.1 }}>Personalize</Text>
                      <Text style={{ color: "#71717a", fontSize: 15, lineHeight: 24, maxWidth: 340 }}>
                        Pick the redesign mode and color palette before generating your result.
                      </Text>
                    </View>

                    <View style={{ gap: 12 }}>
                      <Text style={{ color: "#09090b", fontSize: 22, fontWeight: "700", letterSpacing: -0.4 }}>Mode</Text>
                      <View style={{ flexDirection: "row", gap: 12 }}>
                        {MODE_OPTIONS.map((mode, index) => {
                          const active = selectedModeId === mode.id;
                          const ModeIcon = mode.icon;
                          return (
                            <MotiView key={mode.id} {...staggerFadeUp(index, 40)} style={{ flex: 1 }}>
                              <LuxPressable
                                onPress={() => handleSelectMode(mode.id)}
                                className="cursor-pointer rounded-[26px] border px-5 py-5"
                                style={{
                                  minHeight: 188,
                                  borderWidth: active ? 1.5 : 1,
                                  borderColor: active ? "#d946ef" : "#e4e4e7",
                                  backgroundColor: active ? "rgba(217,70,239,0.08)" : "#fafafa",
                                }}
                              >
                                <View className="flex-row items-start justify-between">
                                  <View className="h-14 w-14 items-center justify-center rounded-[18px] bg-white" style={{ borderWidth: 1, borderColor: active ? "rgba(217,70,239,0.22)" : "#e4e4e7" }}>
                                    <ModeIcon color={active ? "#d946ef" : "#18181b"} size={24} strokeWidth={2} />
                                  </View>
                                  {active ? <BadgeCheck color="#d946ef" size={19} strokeWidth={2.1} /> : null}
                                </View>
                                <View style={{ marginTop: 18, gap: 8 }}>
                                  <Text className="text-[21px] font-semibold leading-7 text-zinc-950">{mode.title}</Text>
                                  <Text className="text-sm leading-6 text-zinc-500">{mode.description}</Text>
                                </View>
                              </LuxPressable>
                            </MotiView>
                          );
                        })}
                      </View>
                    </View>

                    <View style={{ gap: 12 }}>
                      <Text style={{ color: "#09090b", fontSize: 22, fontWeight: "700", letterSpacing: -0.4 }}>Palette</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: wizardPaletteGap }}>
                        {PALETTE_OPTIONS.slice(0, 8).map((palette, index) => {
                          const active = selectedPaletteId === palette.id;
                          return (
                            <MotiView key={palette.id} {...staggerFadeUp(index, 18)} style={{ width: wizardPaletteCardWidth }}>
                              <LuxPressable
                                onPress={() => handleSelectPalette(palette.id)}
                                className="cursor-pointer overflow-hidden rounded-[22px] border"
                                style={{
                                  borderWidth: active ? 1.5 : 1,
                                  borderColor: active ? "#d946ef" : "#e4e4e7",
                                  backgroundColor: "#ffffff",
                                }}
                              >
                                <View style={{ height: 74, flexDirection: "row" }}>
                                  {palette.colors.map((color) => (
                                    <View key={color} style={{ flex: 1, backgroundColor: color }} />
                                  ))}
                                </View>
                                <View style={{ paddingHorizontal: 12, paddingVertical: 12 }}>
                                  <Text className="text-sm font-semibold text-zinc-950" numberOfLines={2}>{palette.label}</Text>
                                </View>
                                {active ? (
                                  <View className="absolute right-2 top-2 rounded-full bg-white p-1.5" style={{ borderWidth: 1, borderColor: "rgba(217,70,239,0.22)" }}>
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
                ) : null}
              </MotiView>
            </AnimatePresence>
          </View>
        </ScrollView>

        <View
          className="absolute inset-x-0 bottom-0 px-5 pt-4"
          style={{
            paddingBottom: Math.max(insets.bottom + (isPhotoStep ? 16 : 12), isPhotoStep ? 28 : 24),
            borderTopWidth: 1,
            borderTopColor: isPhotoStep ? "rgba(255,255,255,0.06)" : "#f4f4f5",
            backgroundColor: wizardBackgroundColor,
            shadowColor: "#000000",
            shadowOpacity: isPhotoStep ? 0.28 : 0.06,
            shadowRadius: isPhotoStep ? 24 : 18,
            shadowOffset: { width: 0, height: isPhotoStep ? -10 : -8 },
            elevation: 14,
          }}
        >
          <LuxPressable onPress={handleContinue} disabled={isContinueDisabled} className="cursor-pointer">
            {canContinue && !(isFinalWizardStep && generationBlocked) ? (
              <LinearGradient
                colors={["#d946ef", "#7c3aed"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                className="items-center justify-center"
                style={{
                  minHeight: isPhotoStep ? 64 : 62,
                  borderRadius: isPhotoStep ? 28 : 24,
                  opacity: isPhotoStep ? (hasSelectedPhoto ? 1 : 0.5) : 1,
                }}
              >
                <Text style={{ color: "#ffffff", fontSize: 17, fontWeight: "600" }}>
                  {continueLabel}
                </Text>
              </LinearGradient>
            ) : (
              <View
                className="items-center justify-center"
                style={{
                  minHeight: isPhotoStep ? 64 : 62,
                  borderRadius: isPhotoStep ? 28 : 24,
                  backgroundColor: isPhotoStep ? "#27272a" : "#e4e4e7",
                  opacity: isPhotoStep ? (hasSelectedPhoto ? 1 : 0.5) : 1,
                  borderWidth: isPhotoStep ? 1 : 0,
                  borderColor: isPhotoStep ? "rgba(255,255,255,0.1)" : "transparent",
                }}
              >
                <Text style={{ color: isPhotoStep ? "#ffffff" : "#a1a1aa", fontSize: 17, fontWeight: "600" }}>
                  {generationBlocked && isFinalWizardStep ? "Limit Reached - Upgrade or Wait" : continueLabel}
                </Text>
              </View>
            )}
          </LuxPressable>
        </View>

        <BottomSheetModal
          ref={customPromptSheetRef}
          snapPoints={customPromptSnapPoints}
          enablePanDownToClose
          backdropComponent={GlassBackdrop}
          backgroundStyle={{ backgroundColor: "#050505" }}
          handleIndicatorStyle={{ backgroundColor: "rgba(255,255,255,0.4)" }}
        >
          <View className="flex-1 px-5 pb-8 pt-2">
            <View className="flex-row items-start justify-between gap-4">
              <View className="flex-1">
                <Text className="text-xl font-semibold text-white">Custom Style Prompt</Text>
                <Text className="mt-2 text-sm leading-6 text-zinc-400">Direct the redesign with your own materials, mood, furniture language, lighting cues, and standout details.</Text>
              </View>
              <LuxPressable
                onPress={() => customPromptSheetRef.current?.dismiss()}
                className="cursor-pointer h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5"
                style={{ borderWidth: 0.5 }}
              >
                <Close color="#f4f4f5" size={16} strokeWidth={2.2} />
              </LuxPressable>
            </View>

            <View className="mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03]" style={{ borderWidth: 0.5 }}>
              <View style={{ minHeight: 220, padding: 18 }}>
                <View className="mb-3 flex-row items-center justify-between">
                  <Text className="text-xs font-semibold uppercase tracking-[2px] text-zinc-500">Design Brief</Text>
                  {customPromptDraft.length > 0 ? (
                    <LuxPressable onPress={handleClearCustomPromptDraft} className="cursor-pointer h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5" style={{ borderWidth: 0.5 }}>
                      <Close color="#f4f4f5" size={14} strokeWidth={2.3} />
                    </LuxPressable>
                  ) : null}
                </View>
                <TextInput
                  value={customPromptDraft}
                  onChangeText={setCustomPromptDraft}
                  multiline
                  placeholder="Example: Turn this into a warm luxury living room with curved seating, walnut wall panels, smoked brass lighting, and a dramatic stone fireplace focal point."
                  placeholderTextColor="#71717a"
                  textAlignVertical="top"
                  style={{ color: "#ffffff", fontSize: 15, lineHeight: 24, minHeight: 156 }}
                />
              </View>
            </View>

            <View className="mt-6 gap-3">
              <Text className="text-sm font-semibold text-white">Example Prompts</Text>
              <View className="gap-3">
                {CUSTOM_STYLE_EXAMPLE_PROMPTS.map((prompt) => (
                  <LuxPressable
                    key={prompt}
                    onPress={() => setCustomPromptDraft(prompt)}
                    className="cursor-pointer rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4"
                    style={{ borderWidth: 0.5 }}
                  >
                    <Text className="text-sm leading-6 text-zinc-200">{prompt}</Text>
                  </LuxPressable>
                ))}
              </View>
            </View>

            <LuxPressable onPress={handleApplyCustomPrompt} className="cursor-pointer mt-6">
              <LinearGradient
                colors={["#d946ef", "#6366f1"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                className="rounded-[24px]"
                style={{ minHeight: 58 }}
              >
                <View className="flex-1 flex-row items-center justify-center gap-3">
                  <Text className="text-[16px] font-semibold text-white">Apply Custom Style</Text>
                  <ArrowRight color="#ffffff" size={18} strokeWidth={2.3} />
                </View>
              </LinearGradient>
            </LuxPressable>
          </View>
        </BottomSheetModal>

        <BottomSheetModal
          ref={photoSourceSheetRef}
          snapPoints={photoSourceSnapPoints}
          enablePanDownToClose
          backdropComponent={GlassBackdrop}
          backgroundStyle={{ backgroundColor: "#050505" }}
          handleIndicatorStyle={{ backgroundColor: "rgba(255,255,255,0.4)" }}
        >
          <View className="flex-1 px-5 pb-8 pt-2">
            <Text className="text-lg font-medium text-white">Start Redesigning</Text>
            <Text className="mt-2 text-sm text-zinc-400">Choose how you'd like to bring your space into the wizard.</Text>

            <View className="mt-5 gap-3">
              <LuxPressable
                onPress={() => void launchPhotoSource("camera")}
                className="cursor-pointer flex-row items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                style={{ borderWidth: 0.5 }}
                >
                <View className="h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/5">
                  <Camera color="#f8fafc" size={20} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-white">Take a Photo</Text>
                  <Text className="mt-1 text-xs text-zinc-400">Capture a fresh room photo with your camera.</Text>
                </View>
              </LuxPressable>

              <LuxPressable
                onPress={() => void launchPhotoSource("library")}
                className="cursor-pointer flex-row items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                style={{ borderWidth: 0.5 }}
                >
                <View className="h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/5">
                  <ImageIcon color="#f8fafc" size={20} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-white">Choose from Library</Text>
                  <Text className="mt-1 text-xs text-zinc-400">Import an existing interior or exterior photo from your device.</Text>
                </View>
              </LuxPressable>
            </View>
          </View>
        </BottomSheetModal>
      </View>
    );
  }

  if (workflowStep === 4) {
    const boardCardWidth = Math.max((width - 52) / 2, 150);

    return (
      <View className="flex-1 bg-black" style={{ backgroundColor: "#000000" }}>
        <ScrollView
          className="flex-1 bg-black"
          style={{ backgroundColor: "#000000" }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: Math.max(insets.top + 14, 28),
            paddingBottom: Math.max(insets.bottom + 32, 40),
          }}
          contentInsetAdjustmentBehavior="never"
        >
          <View className="flex-row items-center justify-between">
            <View style={{ width: 42 }} />
            <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: "700", letterSpacing: -0.5 }}>Your Board</Text>
            <View style={{ width: 42 }} />
          </View>

          <View style={{ marginTop: 28, flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <MotiView style={{ width: boardCardWidth }} from={{ opacity: 0.5, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={LUX_SPRING}>
              <View
                className="overflow-hidden rounded-[28px] border border-white/10 bg-zinc-950"
                style={{ height: 236, borderWidth: 0.5 }}
              >
                {selectedImage ? (
                  <Image source={{ uri: selectedImage.uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" cachePolicy="memory-disk" transition={120} />
                ) : null}
                <View className="absolute inset-0 bg-black/60" />
                <View className="absolute inset-0 items-center justify-center gap-3">
                  <MotiView animate={{ opacity: [0.5, 1, 0.5], scale: [0.96, 1, 0.96] }} transition={{ ...LUX_SPRING, loop: true }}>
                    <View className="h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/10">
                      <ActivityIndicator size="small" color="#ffffff" />
                    </View>
                  </MotiView>
                  <Text className="text-base font-semibold text-white">Processing...</Text>
                  <Text className="text-sm text-zinc-300">Nano Banana is rendering your board.</Text>
                </View>
              </View>
            </MotiView>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (workflowStep === 5) {
    const boardCardWidth = Math.max((width - 52) / 2, 150);
    const editorImageUrl = activeBoardItem?.imageUrl ?? generatedImageUrl;
    const beforeImageUrl = activeBoardItem ? activeBoardItem.originalImageUrl ?? editorImageUrl : selectedImage?.uri ?? editorImageUrl;
    const editorStyleLabel = activeBoardItem?.styleLabel ?? selectedStyle ?? "Custom";
    const editorRoomLabel = activeBoardItem?.roomLabel ?? selectedRoom ?? serviceLabel;

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
              <Text className="text-sm font-semibold text-white">{"Credits " + imagesRemaining}</Text>
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
                {editorImageUrl && beforeImageUrl ? (
                  <MotiView
                    key={editorImageUrl}
                    from={{ opacity: 0, scale: 0.985 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={LUX_SPRING}
                    className="h-full w-full"
                  >
                    <Image source={{ uri: beforeImageUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" cachePolicy="memory-disk" transition={120} />
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
                      <Image source={{ uri: editorImageUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" cachePolicy="memory-disk" transition={120} />
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
                ) : editorImageUrl ? (
                  <Image source={{ uri: editorImageUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" cachePolicy="memory-disk" transition={120} />
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
                    <Text className="text-xs font-semibold uppercase tracking-[1.6px] text-white/85">After</Text>
                  </View>
                </View>

                {!isProPlan ? (
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

                {!isProPlan && editorImageUrl ? (
                  <View className="absolute bottom-24 right-4">
                    <Logo size={44} style={{ opacity: 0.6 }} />
                  </View>
                ) : null}
              </View>
            </View>
          </MotiView>

          <View className="mt-5">
            <Text className="text-lg font-semibold text-white">{editorStyleLabel + " " + editorRoomLabel}</Text>
            <Text className="mt-1 text-sm text-zinc-400">Curated inside your premium Darkor board.</Text>
          </View>

          <View className="mt-6 flex-row gap-4">
            {[
              {
                id: "save",
                label: "Save",
                icon: Download,
                onPress: isProPlan ? handleDownloadUltra : handleDownloadStandard,
                loading: isProPlan ? isDownloadingUltra : isDownloadingStandard,
              },
              {
                id: "share",
                label: "Share",
                icon: Send,
                onPress: handleShare,
                loading: isSharingResult,
              },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <LuxPressable key={action.id} onPress={action.onPress} disabled={action.loading} className="cursor-pointer flex-1">
                  <View
                    className="flex-row items-center justify-center gap-3 rounded-[22px] border border-white/10 bg-zinc-950 px-5 py-4"
                    style={{ borderWidth: 0.5, opacity: action.loading ? 0.72 : 1 }}
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











