import { useAuth } from "@clerk/expo";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { skip, useMutation, useQuery } from "convex/react";
import { Asset } from "expo-asset";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AnimatePresence, MotiView } from "moti";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import {
  ArrowLeft,
  Download,
  Image as ImageIcon,
  Layers,
  Lock,
  Paintbrush,
  Send,
  Sparkles,
  SwatchBook,
  ThumbsDown,
  ThumbsUp,
  MoveHorizontal,
  Wand2,
} from "lucide-react-native";

import { generateImage } from "../../lib/api";
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
  plan: "free" | "trial" | "pro" | "premium" | "ultra";
  credits: number;
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

const EXAMPLE_PHOTOS: ExamplePhoto[] = [
  {
    id: "modern-living",
    label: "Modern Living Room",
    source: require("../../assets/media/empty-room.jpg"),
  },
  {
    id: "raw-penthouse",
    label: "Raw Penthouse",
    source: require("../../assets/media/before-empty-room.png"),
  },
  {
    id: "backyard",
    label: "Backyard",
    source: require("../../assets/media/garden-before.jpg"),
  },
  {
    id: "old-facade",
    label: "Old Facade",
    source: require("../../assets/media/staging-before.jpg"),
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
  ],
  exterior: [
    "Modern House",
    "Luxury Villa",
    "Office Building",
    "Apartment Block",
    "Retail Store",
    "Garage",
  ],
  garden: ["Backyard", "Front yard", "Patio", "Swimming Pool Area", "Terrace"],
} as const;

const STYLE_OPTIONS = [
  "Modern",
  "Luxury",
  "Japandi",
  "Cyberpunk",
  "Tropical",
  "Industrial",
  "Minimalist",
  "Scandinavian",
  "Bohemian",
  "Midcentury Modern",
  "Art Deco",
  "Zen",
  "Coastal",
  "Rustic",
  "Vintage",
  "Mediterranean",
  "Glam",
  "Shabby Chic",
  "French Country",
  "Brutalist",
  "Hollywood Regency",
  "Neo-classic",
  "Sketch",
  "Art Nouveau",
];

const PALETTE_OPTIONS: PaletteOption[] = [
  { id: "surprise", label: "Surprise Me", colors: ["#f8fafc", "#0f172a", "#22d3ee", "#f472b6"] },
  { id: "gray", label: "Millennial Gray", colors: ["#e5e7eb", "#cbd5f5", "#9ca3af", "#6b7280"] },
  { id: "sunset", label: "Neon Sunset", colors: ["#fb7185", "#f59e0b", "#f97316", "#a855f7"] },
  { id: "forest", label: "Forest Hues", colors: ["#14532d", "#166534", "#22c55e", "#a3e635"] },
  { id: "peach", label: "Peach Orchard", colors: ["#fed7aa", "#fdba74", "#f97316", "#fef3c7"] },
  { id: "fuschia", label: "Fuschia Blossom", colors: ["#fbcfe8", "#f472b6", "#ec4899", "#f9a8d4"] },
  { id: "emerald", label: "Emerald Gem", colors: ["#34d399", "#10b981", "#059669", "#065f46"] },
  { id: "pastel", label: "Pastel Breeze", colors: ["#d8b4fe", "#bae6fd", "#fbcfe8", "#fef9c3"] },
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

const SERVICE_LABELS: Record<string, string> = {
  interior: "Interior Redesign",
  exterior: "Exterior Redesign",
  garden: "Garden Redesign",
  floor: "Floor Restyle",
  paint: "Wall Paint",
};

const EDIT_ACTIONS = ["Replace", "Paint", "Floor"] as const;
const FEEDBACK_REASONS = ["Blurry", "Wrong Style", "Lighting", "Layout", "Artifacts"];
const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;

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

export default function WorkspaceScreen() {
  const router = useRouter();
  const { service, presetStyle, startStep } = useLocalSearchParams<{
    service?: string;
    presetStyle?: string;
    startStep?: string;
  }>();
  const { isSignedIn, getToken } = useAuth();
  const diagnostic = DIAGNOSTIC_BYPASS;
  const effectiveSignedIn = diagnostic ? true : isSignedIn;
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { draft, setDraftAspectRatio, setDraftImage, setDraftPalette, setDraftPrompt, setDraftRoom, setDraftStyle } =
    useWorkspaceDraft();
  const { showToast } = useProSuccess();

  const me = useQuery(
    "users:me" as any,
    diagnostic ? skip : isSignedIn ? {} : skip,
  ) as MeResponse | null | undefined;
  const ensureUser = useMutation("users:getOrCreateCurrentUser" as any);
  const trackGeneration = useMutation("users:trackGeneration" as any);
  const markReviewPrompted = useMutation("users:markReviewPrompted" as any);
  const submitFeedback = useMutation("feedback:submit" as any);
  const submitGenerationFeedback = useMutation("generations:submitFeedback" as any);

  const [workflowStep, setWorkflowStep] = useState(0);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedPaletteId, setSelectedPaletteId] = useState<string | null>(null);
  const [selectedAspectRatioId, setSelectedAspectRatioId] = useState<AspectRatioOption["id"]>("post");
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSharingStory, setIsSharingStory] = useState(false);
  const [isDownloading, setIsDownloading] = useState<"standard" | "ultra" | null>(null);
  const [isLoadingExample, setIsLoadingExample] = useState<string | null>(null);
  const [activeEditAction, setActiveEditAction] = useState<(typeof EDIT_ACTIONS)[number]>("Replace");
  const [editBarWidth, setEditBarWidth] = useState(0);
  const [reviewPromptOpen, setReviewPromptOpen] = useState(false);
  const [ratePromptOpen, setRatePromptOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackState, setFeedbackState] = useState<"liked" | "disliked" | null>(null);
  const [feedbackReason, setFeedbackReason] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [lastGenerationCount, setLastGenerationCount] = useState<number | null>(null);
  const [showResumeToast, setShowResumeToast] = useState(false);
  const [awaitingAuth, setAwaitingAuth] = useState(false);

  const reviewSheetRef = useRef<BottomSheetModal>(null);
  const rateSheetRef = useRef<BottomSheetModal>(null);
  const feedbackSheetRef = useRef<BottomSheetModal>(null);
  const imageContainerRef = useRef<View>(null);
  const storyRef = useRef<View>(null);
  const hasAppliedStartStepRef = useRef(false);
  const reviewHandledRef = useRef(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sliderX = useSharedValue(0);
  const sliderWidth = useSharedValue(0);
  const sliderStart = useSharedValue(0);

  const isSmallScreen = height < 740;
  const reviewSnapPoints = useMemo(() => ["38%"], []);
  const rateSnapPoints = useMemo(() => ["36%"], []);
  const feedbackSnapPoints = useMemo(() => [isSmallScreen ? "95%" : "58%"], [isSmallScreen]);

  useEffect(() => {
    console.log("[Screen] Workspace mounted");
    return () => console.log("[Screen] Workspace unmounted");
  }, []);

  useEffect(() => {
    if (diagnostic) return;
    if (!isSignedIn) return;
    ensureUser({}).catch(() => undefined);
  }, [diagnostic, ensureUser, isSignedIn]);

  useEffect(() => {
    if (draft.image && !selectedImage) {
      setSelectedImage(draft.image);
    }
  }, [draft.image, selectedImage]);

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
    if (selectedImage) {
      setDraftImage(selectedImage);
    }
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
    if (workflowStep === 5 && generatedImageUrl) {
      triggerHaptic();
    }
  }, [generatedImageUrl, workflowStep]);

  const serviceKey = String(service ?? "interior").toLowerCase();
  const serviceType = getServiceType(serviceKey);
  const serviceLabel = SERVICE_LABELS[serviceType] ?? "Interior Redesign";

  const selectedPalette = useMemo(
    () => PALETTE_OPTIONS.find((palette) => palette.id === selectedPaletteId) ?? null,
    [selectedPaletteId],
  );

  const selectedAspectRatio = useMemo(
    () => ASPECT_RATIO_OPTIONS.find((option) => option.id === selectedAspectRatioId) ?? ASPECT_RATIO_OPTIONS[0],
    [selectedAspectRatioId],
  );

  const ratioSpec = useMemo(() => resolveAspectRatio(selectedAspectRatio), [selectedAspectRatio]);

  const spaceOptions = useMemo(() => {
    if (serviceType === "exterior") return SPACE_OPTIONS.exterior;
    if (serviceType === "garden") return SPACE_OPTIONS.garden;
    return SPACE_OPTIONS.interior;
  }, [serviceType]);

  const plan = diagnostic ? "premium" : me?.plan ?? "free";
  const isPaidPlan = plan !== "free" && plan !== "trial";
  const planUsed =
    plan === "premium" || plan === "ultra" ? plan : plan === "pro" ? "pro" : plan === "trial" ? "trial" : "free";
  const canUpscale = isPaidPlan;
  const ignoreReviewCooldown = __DEV__ || process.env.EXPO_PUBLIC_REVIEW_FORCE === "1";
  const editGap = 12;
  const activeEditIndex = EDIT_ACTIONS.indexOf(activeEditAction);
  const editItemWidth =
    editBarWidth > 0 ? (editBarWidth - editGap * (EDIT_ACTIONS.length - 1)) / EDIT_ACTIONS.length : 0;
  const isDownloadingStandard = isDownloading === "standard";
  const isDownloadingUltra = isDownloading === "ultra";
  const sliderSpring = useMemo(() => ({ damping: 15, stiffness: 100 }), []);

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

  const promptText = useMemo(() => {
    if (!selectedRoom || !selectedStyle || !selectedPalette || !selectedAspectRatio) return "";
    const instruction = customPrompt.trim().length > 0 ? customPrompt.trim() : "No additional instructions.";
    return `${selectedRoom} in ${selectedStyle} style, following these instructions: ${instruction}, with a ${selectedPalette.label} color vibe. The output image must have a ${ratioSpec.ratioLabel} aspect ratio. Target resolution: ${ratioSpec.targetWidth}x${ratioSpec.targetHeight}. 8k resolution, photorealistic masterpiece.`;
  }, [customPrompt, ratioSpec.ratioLabel, ratioSpec.targetHeight, ratioSpec.targetWidth, selectedAspectRatio, selectedPalette, selectedRoom, selectedStyle]);

  const canContinue = useMemo(() => {
    if (workflowStep === 0) return Boolean(selectedImage);
    if (workflowStep === 1) return Boolean(selectedRoom);
    if (workflowStep === 2) return Boolean(selectedStyle);
    if (workflowStep === 3) return Boolean(selectedPaletteId && selectedAspectRatioId);
    return false;
  }, [selectedAspectRatioId, selectedImage, selectedPaletteId, selectedRoom, selectedStyle, workflowStep]);

  const handlePickPhoto = useCallback(async () => {
    triggerHaptic();
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Please allow photo access to continue.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      base64: true,
      quality: 0.9,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setSelectedImage({
        uri: asset.uri,
        base64: asset.base64 ?? undefined,
        label: "Uploaded Photo",
      });
    }
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
      const base64 = await readBase64FromUri(uri);
      setSelectedImage({ uri, base64, label: example.label });
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

  const handleShare = useCallback(async () => {
    triggerHaptic();
    if (!generatedImageUrl) {
      Alert.alert("Nothing to share", "Generate an image first.");
      return;
    }
    await Share.share({ message: generatedImageUrl });
  }, [generatedImageUrl]);

  const handleShareStory = useCallback(async () => {
    triggerHaptic();
    if (!generatedImageUrl || !selectedImage) {
      Alert.alert("Nothing to share", "Generate a render first.");
      return;
    }
    if (!storyRef.current) {
      Alert.alert("Story unavailable", "Please try again.");
      return;
    }
    try {
      setIsSharingStory(true);
      const uri = await captureRef(storyRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
        width: STORY_WIDTH,
        height: STORY_HEIGHT,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri);
      } else {
        await Share.share({ message: "Designed with Darkor.ai", url: uri });
      }
    } catch (error) {
      Alert.alert("Share failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsSharingStory(false);
    }
  }, [generatedImageUrl, selectedImage]);

  const handleUpgrade = useCallback(() => {
    triggerHaptic();
    router.push("/paywall");
  }, [router]);

  const handleDownloadStandard = useCallback(async () => {
    triggerHaptic();
    if (!generatedImageUrl) {
      Alert.alert("Nothing to download", "Generate an image first.");
      return;
    }

    try {
      setIsDownloading("standard");
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "Please allow photo access to save your render.");
        return;
      }

      if (!imageContainerRef.current) {
        throw new Error("Preview not ready. Please try again.");
      }

      const previousSlider = sliderX.value;
      if (sliderWidth.value > 0) {
        sliderX.value = sliderWidth.value;
      }
      await new Promise((resolve) => setTimeout(resolve, 80));
      const fileUri = await captureRef(imageContainerRef, { format: "png", quality: 1, result: "tmpfile" });
      if (sliderWidth.value > 0) {
        sliderX.value = previousSlider;
      }
      await MediaLibrary.saveToLibraryAsync(fileUri);
      Alert.alert("Saved", "Your render has been saved to your library.");
    } catch (error) {
      Alert.alert("Download failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsDownloading(null);
    }
  }, [generatedImageUrl, imageContainerRef, sliderWidth, sliderX]);

  const handleDownloadUltra = useCallback(async () => {
    triggerHaptic();
    if (!generatedImageUrl) {
      Alert.alert("Nothing to download", "Generate an image first.");
      return;
    }

    if (!isPaidPlan) {
      handleUpgrade();
      return;
    }

    try {
      setIsDownloading("ultra");
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "Please allow photo access to save your render.");
        return;
      }

      const targetUri = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? ""}darkor-${Date.now()}.jpg`;
      const download = await FileSystem.downloadAsync(generatedImageUrl, targetUri);
      await MediaLibrary.saveToLibraryAsync(download.uri);
      Alert.alert("Saved", "Your 4K render has been saved to your library.");
    } catch (error) {
      Alert.alert("Download failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsDownloading(null);
    }
  }, [generatedImageUrl, handleUpgrade, isPaidPlan]);

  const handleUpscale = useCallback(() => {
    triggerHaptic();
    if (!canUpscale) {
      Alert.alert("Upgrade to Pro", "Upscale to 4K is available on Pro and higher.");
      return;
    }
    Alert.alert("Upscale", "Your 4K upscale is queued.");
  }, [canUpscale]);

  const handleEditAction = useCallback((label: (typeof EDIT_ACTIONS)[number]) => {
    triggerHaptic();
    setActiveEditAction(label);
    Alert.alert(label, "Editing tools are coming next.");
  }, []);

  const handleLike = useCallback(async () => {
    if (!generationId || feedbackSubmitted) return;
    triggerHaptic();
    setFeedbackState("liked");
    setFeedbackSubmitted(true);
    try {
      await submitGenerationFeedback({ id: generationId, sentiment: "liked" });
      showToast("Glad you like it! ✨");
    } catch (error) {
      Alert.alert("Feedback failed", error instanceof Error ? error.message : "Please try again.");
    }
  }, [feedbackSubmitted, generationId, showToast, submitGenerationFeedback]);

  const handleDislike = useCallback(() => {
    if (!generationId || feedbackSubmitted) return;
    triggerHaptic();
    setFeedbackState("disliked");
  }, [feedbackSubmitted, generationId]);

  const handleSubmitDislike = useCallback(async () => {
    if (!generationId || feedbackSubmitted) return;
    const reason = feedbackReason.trim();
    if (!reason) {
      Alert.alert("Tell us more", "Choose a reason or add a short note.");
      return;
    }
    triggerHaptic();
    setIsSendingFeedback(true);
    try {
      const result = (await submitGenerationFeedback({
        id: generationId,
        sentiment: "disliked",
        reason,
      })) as { retryGranted?: boolean };
      setFeedbackSubmitted(true);
      showToast(
        result?.retryGranted
          ? "Thanks for the feedback. A free retry credit was added."
          : "Thanks for the feedback. We'll improve the next render.",
      );
    } catch (error) {
      Alert.alert("Feedback failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsSendingFeedback(false);
    }
  }, [feedbackReason, feedbackSubmitted, generationId, showToast, submitGenerationFeedback]);

  const handleGenerate = useCallback(async () => {
    if (!selectedImage || !selectedRoom || !selectedStyle || !selectedPalette) {
      Alert.alert("Complete the steps", "Please finish the previous steps first.");
      return;
    }

    if (!effectiveSignedIn) {
      setAwaitingAuth(true);
      router.push({ pathname: "/sign-in", params: { returnTo: "/workspace" } });
      return;
    }

      const effectiveCredits = diagnostic ? 10 : me?.credits;
      if (typeof effectiveCredits === "number" && effectiveCredits <= 0) {
        Alert.alert("Refill Credits", "You have no credits left.");
        return;
      }

      try {
        setFeedbackState(null);
        setFeedbackReason("");
        setFeedbackSubmitted(false);
        setGenerationId(null);
        setIsGenerating(true);
        setWorkflowStep(4);

      const base64 = selectedImage.base64 ?? (await readBase64FromUri(selectedImage.uri));
      const token = diagnostic ? null : await getToken();

      const response = await generateImage(
        {
          imageBase64: base64,
          prompt: promptText,
          style: selectedStyle,
          planUsed,
          aspectRatio: ratioSpec.ratioLabel,
          targetWidth: ratioSpec.targetWidth,
          targetHeight: ratioSpec.targetHeight,
        },
        token,
      );

        setGeneratedImageUrl(response.imageUrl);
        setGenerationId(response.generationId ?? null);
        setWorkflowStep(5);

      try {
        const reviewState = (await trackGeneration({ ignoreCooldown: ignoreReviewCooldown })) as {
          count: number;
          shouldPrompt: boolean;
        };
        setLastGenerationCount(reviewState.count);
          if (reviewState.shouldPrompt) {
            reviewHandledRef.current = false;
            setReviewPromptOpen(true);
            requestAnimationFrame(() => reviewSheetRef.current?.present());
          }
      } catch {
        // Ignore review tracking failures.
      }
    } catch (error) {
      setWorkflowStep(3);
      Alert.alert("Generation failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [diagnostic, effectiveSignedIn, getToken, me?.credits, planUsed, promptText, ratioSpec, router, selectedImage, selectedPalette, selectedRoom, selectedStyle]);

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

  const handleSelectStyle = useCallback((value: string) => {
    triggerHaptic();
    setSelectedStyle(value);
  }, []);

  const handleSelectPalette = useCallback((value: string) => {
    triggerHaptic();
    setSelectedPaletteId(value);
  }, []);

  const handleSelectAspectRatio = useCallback((value: AspectRatioOption["id"]) => {
    triggerHaptic();
    setSelectedAspectRatioId(value);
  }, []);

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

  if (workflowStep === 4) {
    const maxFrameWidth = width * 0.7;
    const maxFrameHeight = height * 0.55;
    const frameByWidth = maxFrameWidth / ratioSpec.ratioValue;
    const frameWidth = frameByWidth <= maxFrameHeight ? maxFrameWidth : maxFrameHeight * ratioSpec.ratioValue;
    const frameHeight = frameWidth / ratioSpec.ratioValue;
    const scanMin = -frameHeight * 0.45;
    const scanMax = frameHeight * 0.45;

    return (
      <View className="flex-1 bg-black" style={{ backgroundColor: "#000000" }}>
        <View className="flex-1 items-center justify-center overflow-hidden">
          {selectedImage ? (
            <Image source={{ uri: selectedImage.uri }} className="absolute inset-0 h-full w-full" contentFit="cover" />
          ) : null}
          <View className="absolute inset-0 bg-black/70" />

          <View
            className="items-center justify-center rounded-3xl border border-white/10 bg-black/40"
            style={{ width: frameWidth, height: frameHeight, borderWidth: 0.5 }}
          >
            {selectedImage ? (
              <Image
                source={{ uri: selectedImage.uri }}
                style={{ width: frameWidth, height: frameHeight, borderRadius: 24 }}
                contentFit="cover"
              />
            ) : null}
            <View className="absolute inset-0 rounded-3xl bg-black/50" />

            <MotiView
              animate={{ opacity: [0.15, 0.65, 0.15], scale: [1, 1.04, 1] }}
              transition={{ ...LUX_SPRING, loop: true }}
              style={{
                position: "absolute",
                width: frameWidth,
                height: frameHeight * 0.3,
                transform: [{ translateY: scanMin }],
              }}
            />

            <MotiView
              animate={{ translateY: [scanMin, scanMax] }}
              transition={{ ...LUX_SPRING, loop: true }}
              style={{ position: "absolute", width: frameWidth, height: frameHeight * 0.3 }}
            >
              <View className="absolute inset-0 bg-cyan-400/10" />
              <LinearGradient
                colors={["rgba(34, 211, 238, 0)", "rgba(34, 211, 238, 0.35)", "rgba(34, 211, 238, 0)"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={{ position: "absolute", inset: 0, opacity: 0.7 }}
              />
              <View
                className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 bg-cyan-300/90"
                style={{ boxShadow: "0 0 35px rgba(34, 211, 238, 0.9)" }}
              />
              <View
                className="absolute inset-x-0 top-1/2 h-5 -translate-y-1/2 bg-cyan-200/10"
                style={{ boxShadow: "0 0 60px rgba(34, 211, 238, 0.35)" }}
              />
            </MotiView>
          </View>

          <View className="items-center gap-3 px-6">
            <View className="h-16 w-16 items-center justify-center rounded-full border border-cyan-200/40 bg-cyan-500/20">
              <Wand2 color="#67e8f9" size={26} />
            </View>
            <Text className="text-2xl font-medium text-white">Processing...</Text>
            <Text className="text-center text-sm text-zinc-400">
              Rendering in {ratioSpec.ratioLabel} · {selectedAspectRatio?.descriptor}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black" style={{ backgroundColor: "#000000" }}>
      {showResumeToast ? (
        <MotiView
          from={{ opacity: 0, translateY: -12 }}
          animate={{ opacity: 1, translateY: 0 }}
          exit={{ opacity: 0, translateY: -12 }}
          transition={LUX_SPRING}
          className="absolute left-6 right-6 z-20"
          style={{ top: insets.top + 8 }}
          pointerEvents="none"
        >
          <BlurView
            intensity={80}
            tint="dark"
            className="rounded-2xl border border-white/10 bg-black/70 px-4 py-3"
            style={{ borderWidth: 0.5 }}
          >
            <Text className="text-center text-sm font-semibold text-white">{"\u2728"} Resuming with your current draft.</Text>
          </BlurView>
        </MotiView>
      ) : null}
      <ScrollView
        className="flex-1 bg-black"
        style={{ backgroundColor: "#000000" }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 140, minHeight: height }}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View className="flex-row items-center gap-3">
          <LuxPressable
            onPress={handleBack}
            className="cursor-pointer h-10 w-10 items-center justify-center rounded-full border border-white/10"
          >
            <ArrowLeft color="#e4e4e7" size={18} />
          </LuxPressable>
          <View>
            <Text className="text-xs uppercase tracking-[3px] text-cyan-200/80">Darkor.ai</Text>
            <Text className="text-2xl font-medium text-white">{serviceLabel}</Text>
          </View>
        </View>

        <View className="mt-5 flex-row gap-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <View
              key={`step-${index}`}
              className={`h-1 flex-1 rounded-full ${index <= workflowStep ? "bg-cyan-400" : "bg-white/10"}`}
            />
          ))}
        </View>

        <AnimatePresence exitBeforeEnter>
          {workflowStep === 0 ? (
            <MotiView
              key="step-photo"
              from={{ opacity: 0, translateY: 16 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: -12 }}
              transition={stepTransition}
              className="mt-8 gap-5"
            >
              <View>
                <Text className="text-xl font-semibold text-white">Add a Photo</Text>
                <Text className="mt-2 text-sm text-zinc-400">
                  Start your redesign by uploading a clear photo or choosing an example.
                </Text>
              </View>

              <LuxPressable
                onPress={handlePickPhoto}
                className="cursor-pointer items-center justify-center rounded-3xl border border-dashed border-white/25 bg-white/5 px-6 py-10"
              >
                <View className="h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-white/5">
                  <ImageIcon color="#e4e4e7" size={24} />
                </View>
                <Text className="mt-4 text-sm font-semibold text-white">Add a Photo +</Text>
                <Text className="mt-2 text-xs text-zinc-500">Camera or gallery</Text>
              </LuxPressable>

              {selectedImage ? (
                <View className="overflow-hidden rounded-3xl border border-white/10">
                  <Image source={{ uri: selectedImage.uri }} className="h-48 w-full" contentFit="cover" />
                  <View className="bg-black/60 px-4 py-3">
                    <Text className="text-sm font-semibold text-white">{selectedImage.label ?? "Selected Photo"}</Text>
                  </View>
                </View>
              ) : null}

              <Text className="text-xs uppercase tracking-[2px] text-zinc-400">Example Photos</Text>
              <View className="flex-row flex-wrap gap-3">
                {EXAMPLE_PHOTOS.map((example, index) => {
                  const isActive = selectedImage?.label === example.label;
                  const isLoading = isLoadingExample === example.id;
                  return (
                    <MotiView key={example.id} {...staggerFadeUp(index, 70)}>
                      <LuxPressable
                        onPress={() => void handleSelectExample(example)}
                        className={`cursor-pointer w-[48%] overflow-hidden rounded-2xl border ${
                          isActive ? "border-cyan-300" : "border-white/10"
                        }`}
                        style={{ borderWidth: 0.5 }}
                      >
                        <Image source={example.source} className="h-24 w-full" contentFit="cover" />
                        <View className="bg-black/60 px-3 py-2">
                          <Text className="text-xs font-semibold text-white">{example.label}</Text>
                          {isLoading ? <Text className="mt-1 text-[10px] text-zinc-400">Loading...</Text> : null}
                        </View>
                      </LuxPressable>
                    </MotiView>
                  );
                })}
              </View>
            </MotiView>
          ) : null}

          {workflowStep === 1 ? (
            <MotiView
              key="step-space"
              from={{ opacity: 0, translateY: 16 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: -12 }}
              transition={stepTransition}
              className="mt-8 gap-5"
            >
              <View>
                <Text className="text-xl font-semibold text-white">Choose Space Type</Text>
                <Text className="mt-2 text-sm text-zinc-400">Select the space you want to redesign.</Text>
              </View>

              <View className="flex-row flex-wrap gap-3">
                {spaceOptions.map((option, index) => {
                  const active = selectedRoom === option;
                  return (
                    <MotiView key={option} {...staggerFadeUp(index, 60)}>
                      <LuxPressable
                        onPress={() => handleSelectRoom(option)}
                        className={`cursor-pointer w-[48%] rounded-2xl border px-3 py-4 ${
                          active ? "border-cyan-300/70 bg-cyan-400/10" : "border-white/10 bg-white/5"
                        }`}
                        style={{ borderWidth: 0.5 }}
                      >
                        <Text className={`text-sm font-semibold ${active ? "text-cyan-100" : "text-zinc-200"}`}>
                          {option}
                        </Text>
                        <Text className="mt-2 text-xs text-zinc-500">Tap to select</Text>
                      </LuxPressable>
                    </MotiView>
                  );
                })}
              </View>
            </MotiView>
          ) : null}

          {workflowStep === 2 ? (
            <MotiView
              key="step-style"
              from={{ opacity: 0, translateY: 16 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: -12 }}
              transition={stepTransition}
              className="mt-8 gap-5"
            >
              <View>
                <Text className="text-xl font-semibold text-white">Select Your Style</Text>
                <Text className="mt-2 text-sm text-zinc-400">Choose one of the 24 curated aesthetics.</Text>
              </View>

              <View className="flex-row flex-wrap gap-3">
                {STYLE_OPTIONS.map((style, index) => {
                  const active = selectedStyle === style;
                  return (
                    <MotiView key={style} {...staggerFadeUp(index, 40)}>
                      <LuxPressable
                        onPress={() => handleSelectStyle(style)}
                        className={`cursor-pointer w-[31%] overflow-hidden rounded-2xl border ${
                          active ? "border-cyan-300 bg-cyan-400/10" : "border-white/10 bg-white/5"
                        }`}
                        style={{ borderWidth: 0.5 }}
                      >
                        <View className="h-16 w-full bg-white/5" />
                        <Text className={`px-3 py-2 text-[11px] font-semibold ${active ? "text-cyan-100" : "text-zinc-200"}`}>
                          {style}
                        </Text>
                      </LuxPressable>
                    </MotiView>
                  );
                })}
              </View>
            </MotiView>
          ) : null}

          {workflowStep === 3 ? (
            <MotiView
              key="step-custom"
              from={{ opacity: 0, translateY: 16 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: -12 }}
              transition={stepTransition}
              className="mt-8 gap-5"
            >
              <View>
                <Text className="text-xl font-semibold text-white">Personalize Your Vision</Text>
                <Text className="mt-2 text-sm text-zinc-400">Refine the look with AI instructions and palettes.</Text>
              </View>

              <View className="gap-3">
                <Text className="text-sm font-semibold text-white">Refine with AI Instructions</Text>
                <TextInput
                  value={customPrompt}
                  onChangeText={setCustomPrompt}
                  placeholder="e.g., Add a large marble fireplace, or replace the rug with a dark gray velvet one."
                  placeholderTextColor="rgba(148, 163, 184, 0.65)"
                  multiline
                  textAlignVertical="top"
                  className="min-h-[140px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
                />
              </View>

              <View className="gap-3">
                <Text className="text-sm font-semibold text-white">Color Palette Picker</Text>
                <View className="flex-row flex-wrap gap-3">
                  {PALETTE_OPTIONS.map((palette, index) => {
                    const active = selectedPaletteId === palette.id;
                    return (
                      <MotiView key={palette.id} {...staggerFadeUp(index, 60)}>
                        <LuxPressable
                          onPress={() => handleSelectPalette(palette.id)}
                          className={`cursor-pointer w-[48%] rounded-2xl border px-3 py-3 ${
                            active ? "border-cyan-300 bg-cyan-400/10" : "border-white/10 bg-white/5"
                          }`}
                          style={{ borderWidth: 0.5 }}
                        >
                          <View className="flex-row gap-2">
                            {palette.colors.map((color) => (
                              <View
                                key={color}
                                className="h-5 flex-1 rounded-lg"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </View>
                          <Text className={`mt-2 text-xs font-semibold ${active ? "text-cyan-100" : "text-zinc-200"}`}>
                            {palette.label}
                          </Text>
                        </LuxPressable>
                      </MotiView>
                    );
                  })}
                </View>
              </View>

              <View className="gap-3">
                <Text className="text-sm font-semibold text-white">Aspect Ratio</Text>
                <View className="flex-row flex-wrap gap-3">
                  {ASPECT_RATIO_OPTIONS.map((option, index) => {
                    const active = selectedAspectRatioId === option.id;
                    return (
                      <MotiView key={option.id} {...staggerFadeUp(index, 60)}>
                        <LuxPressable
                          onPress={() => handleSelectAspectRatio(option.id)}
                          className={`cursor-pointer w-[31%] rounded-2xl border px-3 py-3 ${
                            active ? "border-cyan-300 bg-cyan-400/10" : "border-white/10 bg-white/5"
                          }`}
                          style={{ borderWidth: 0.5 }}
                        >
                          <View className="items-center gap-2">
                            <View
                              style={{
                                width: option.preview.width,
                                height: option.preview.height,
                                borderRadius: 6,
                                borderWidth: 1,
                                borderColor: active ? "rgba(34,211,238,0.9)" : "rgba(255,255,255,0.35)",
                              }}
                            />
                            <Text className={`text-[11px] font-semibold ${active ? "text-cyan-100" : "text-zinc-200"}`}>
                              {option.label}
                            </Text>
                            <Text className="text-[10px] text-zinc-500">{option.descriptor}</Text>
                          </View>
                        </LuxPressable>
                      </MotiView>
                    );
                  })}
                </View>
              </View>
            </MotiView>
          ) : null}

          {workflowStep === 5 ? (
            <MotiView
              key="step-result"
              from={{ opacity: 0, translateY: 16 }}
              animate={{ opacity: 1, translateY: 0 }}
              exit={{ opacity: 0, translateY: -12 }}
              transition={stepTransition}
              className="mt-8 gap-5"
            >
              <View>
                <Text className="text-xl font-semibold text-white">The Designer Studio</Text>
                <Text className="mt-2 text-sm text-zinc-400">Review your render and refine the space.</Text>
              </View>

              <View className="relative overflow-hidden rounded-3xl border border-white/10" style={{ borderWidth: 0.5 }}>
                <View
                  ref={imageContainerRef}
                  collapsable={false}
                  onLayout={handleSliderLayout}
                  className="relative h-80 w-full"
                >
                  {generatedImageUrl ? (
                    <MotiView
                      key={generatedImageUrl}
                      from={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={LUX_SPRING}
                      className="h-80 w-full"
                    >
                      <View className="absolute inset-0">
                        <Image
                          source={{ uri: selectedImage?.uri ?? generatedImageUrl }}
                          className="h-80 w-full"
                          contentFit="cover"
                        />
                      </View>
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
                        <Image source={{ uri: generatedImageUrl }} className="h-80 w-full" contentFit="cover" />
                      </Animated.View>
                      <GestureDetector gesture={sliderGesture}>
                        <Animated.View
                          style={[
                            {
                              position: "absolute",
                              top: 0,
                              bottom: 0,
                              width: 44,
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
                              backgroundColor: "rgba(255,255,255,0.75)",
                            }}
                          />
                          <View className="h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-black/60">
                            <MoveHorizontal color="#ffffff" size={14} />
                          </View>
                        </Animated.View>
                      </GestureDetector>
                    </MotiView>
                  ) : (
                    <View className="h-80 w-full items-center justify-center gap-2 bg-white/5">
                      <Sparkles color="#a1a1aa" size={32} />
                      <Text className="text-sm text-zinc-400">No render yet.</Text>
                    </View>
                  )}
                  {!isPaidPlan && generatedImageUrl ? (
                    <View className="absolute bottom-3 right-3">
                      <Logo size={44} style={{ opacity: 0.6 }} />
                    </View>
                  ) : null}
                </View>

                <BlurView
                  intensity={80}
                  tint="dark"
                  className="absolute bottom-4 left-1/2 flex-row -translate-x-1/2 items-center gap-2 rounded-full border border-white/20 bg-black/60 px-3 py-2"
                  style={{ borderWidth: 0.5 }}
                >
                  <LuxPressable
                    onPress={handleUpscale}
                    className={`cursor-pointer rounded-full px-3 py-1 ${
                      canUpscale ? "bg-white/10" : "bg-white/5"
                    }`}
                  >
                    <View className="flex-row items-center gap-1">
                      {isPaidPlan ? <Sparkles color="#f5d0fe" size={12} /> : <Lock color="#facc15" size={12} />}
                      <Text className="text-[11px] font-semibold text-white">Upscale</Text>
                    </View>
                  </LuxPressable>
                  <LuxPressable
                    onPress={handleShareStory}
                    className="cursor-pointer flex-row items-center gap-1 rounded-full bg-white/10 px-3 py-1"
                  >
                    {isSharingStory ? <ActivityIndicator size="small" color="#f8fafc" /> : <Send color="#f8fafc" size={12} />}
                    <Text className="text-[11px] font-semibold text-white">Story</Text>
                  </LuxPressable>
                  <LuxPressable onPress={handleShare} className="cursor-pointer rounded-full bg-white/10 px-3 py-1">
                    <Text className="text-[11px] font-semibold text-white">Share</Text>
                  </LuxPressable>
                </BlurView>
              </View>

              <View className="flex-row items-center justify-center gap-3">
                <LuxPressable
                  onPress={handleLike}
                  disabled={feedbackSubmitted || !generationId}
                  className={`cursor-pointer flex-row items-center gap-2 rounded-full border px-4 py-2 ${
                    feedbackState === "liked" ? "border-emerald-300 bg-emerald-400/15" : "border-white/10 bg-white/5"
                  }`}
                  style={{ borderWidth: 0.5 }}
                >
                  <ThumbsUp color="#bbf7d0" size={16} />
                  <Text className="text-xs font-semibold text-white">Like</Text>
                </LuxPressable>
                <LuxPressable
                  onPress={handleDislike}
                  disabled={feedbackSubmitted || !generationId}
                  className={`cursor-pointer flex-row items-center gap-2 rounded-full border px-4 py-2 ${
                    feedbackState === "disliked" ? "border-rose-300 bg-rose-400/15" : "border-white/10 bg-white/5"
                  }`}
                  style={{ borderWidth: 0.5 }}
                >
                  <ThumbsDown color="#fecdd3" size={16} />
                  <Text className="text-xs font-semibold text-white">Dislike</Text>
                </LuxPressable>
              </View>

              {feedbackState === "disliked" && !feedbackSubmitted ? (
                <View className="gap-3 rounded-2xl border border-white/10 bg-white/5 p-4" style={{ borderWidth: 0.5 }}>
                  <Text className="text-sm font-semibold text-white">What went wrong?</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {FEEDBACK_REASONS.map((reason) => {
                      const active = feedbackReason === reason;
                      return (
                        <LuxPressable
                          key={reason}
                          onPress={() => setFeedbackReason(reason)}
                          className={`cursor-pointer rounded-full border px-3 py-1 ${
                            active ? "border-rose-300 bg-rose-400/20" : "border-white/10 bg-white/5"
                          }`}
                          style={{ borderWidth: 0.5 }}
                        >
                          <Text className="text-[11px] font-semibold text-zinc-100">{reason}</Text>
                        </LuxPressable>
                      );
                    })}
                  </View>
                  <TextInput
                    value={feedbackReason}
                    onChangeText={setFeedbackReason}
                    placeholder="Share more details (optional)"
                    placeholderTextColor="rgba(148, 163, 184, 0.6)"
                    className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white"
                    style={{ borderWidth: 0.5 }}
                  />
                  <LuxPressable
                    onPress={handleSubmitDislike}
                    disabled={isSendingFeedback}
                    className="cursor-pointer flex-row items-center justify-center gap-2 rounded-2xl bg-white/10 py-2.5"
                  >
                    {isSendingFeedback ? <ActivityIndicator color="#f8fafc" /> : null}
                    <Text className="text-xs font-semibold text-white">Send feedback</Text>
                  </LuxPressable>
                </View>
              ) : null}

              <View className="gap-3">
                {!isPaidPlan ? (
                  <>
                    <LuxPressable
                      onPress={handleDownloadStandard}
                      disabled={isDownloadingStandard}
                      className="cursor-pointer rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                      style={{ borderWidth: 0.5 }}
                    >
                      <View className="flex-row items-center justify-between">
                        <View>
                          <Text className="text-sm font-semibold text-white">Standard HD Download</Text>
                          <Text className="mt-1 text-xs text-zinc-400">For free trial users</Text>
                        </View>
                        {isDownloadingStandard ? (
                          <ActivityIndicator color="#f8fafc" />
                        ) : (
                          <Download color="#f8fafc" size={18} />
                        )}
                      </View>
                    </LuxPressable>

                    <LuxPressable
                      onPress={handleUpgrade}
                      className="cursor-pointer rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                      style={{ borderWidth: 0.5 }}
                    >
                      <View className="flex-row items-center justify-between">
                        <View>
                          <Text className="text-sm font-semibold text-white">4K Ultra HD Download</Text>
                          <Text className="mt-1 text-xs text-zinc-400">Pro users only</Text>
                        </View>
                        <Lock color="#facc15" size={18} />
                      </View>
                    </LuxPressable>
                  </>
                ) : (
                  <LuxPressable
                    onPress={handleDownloadUltra}
                    disabled={isDownloadingUltra}
                    className="cursor-pointer rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                    style={{ borderWidth: 0.5 }}
                  >
                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text className="text-sm font-semibold text-white">Download 4K Ultra HD</Text>
                        <Text className="mt-1 text-xs text-zinc-400">Watermark-free, max resolution</Text>
                      </View>
                      {isDownloadingUltra ? (
                        <ActivityIndicator color="#f8fafc" />
                      ) : (
                        <Download color="#f8fafc" size={18} />
                      )}
                    </View>
                  </LuxPressable>
                )}
              </View>

              <View
                className="relative flex-row gap-3"
                onLayout={(event) => setEditBarWidth(event.nativeEvent.layout.width)}
              >
                {editItemWidth > 0 ? (
                  <MotiView
                    animate={{ translateX: activeEditIndex * (editItemWidth + editGap) }}
                    transition={LUX_SPRING}
                    className="absolute bottom-0 top-0 rounded-2xl bg-white/10"
                    style={{ width: editItemWidth }}
                  />
                ) : null}
                {EDIT_ACTIONS.map((action) => (
                  <LuxPressable
                    key={action}
                    onPress={() => handleEditAction(action)}
                    className="cursor-pointer flex-1 min-w-[120px] flex-row items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3"
                    style={{ borderWidth: 0.5 }}
                  >
                    {action === "Replace" ? <Layers color="#e4e4e7" size={16} /> : null}
                    {action === "Paint" ? <Paintbrush color="#e4e4e7" size={16} /> : null}
                    {action === "Floor" ? <SwatchBook color="#e4e4e7" size={16} /> : null}
                    <Text className="text-xs font-semibold text-zinc-100">{action}</Text>
                  </LuxPressable>
                ))}
              </View>

              </MotiView>
          ) : null}
        </AnimatePresence>
      </ScrollView>

      {workflowStep <= 3 ? (
        <BlurView
          intensity={90}
          tint="dark"
          className="absolute bottom-5 left-5 right-5 flex-row items-center justify-between rounded-full border border-white/15 bg-black/60 px-4 py-3"
          style={{ borderWidth: 0.5 }}
        >
          <LuxPressable
            onPress={handleBack}
            className="cursor-pointer rounded-full border border-white/10 px-4 py-2"
            style={{ borderWidth: 0.5 }}
          >
            <Text className="text-xs font-semibold text-zinc-200">Back</Text>
          </LuxPressable>
          <LuxPressable
            onPress={handleContinue}
            disabled={!canContinue || isGenerating}
            className={`cursor-pointer rounded-full px-5 py-2 ${
              canContinue && !isGenerating ? "bg-cyan-400" : "bg-zinc-700"
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                canContinue && !isGenerating ? "text-zinc-900" : "text-zinc-300"
              }`}
            >
              {workflowStep === 3 ? "Generate Renders" : "Continue"}
            </Text>
          </LuxPressable>
        </BlurView>
      ) : null}

      <BottomSheetModal
        ref={reviewSheetRef}
        snapPoints={reviewSnapPoints}
        enablePanDownToClose
        backdropComponent={GlassBackdrop}
        onDismiss={() => {
          if (!reviewHandledRef.current && reviewPromptOpen) {
            markReviewPrompted({}).catch(() => undefined);
          }
          setReviewPromptOpen(false);
        }}
        backgroundStyle={{ backgroundColor: "#050505" }}
        handleIndicatorStyle={{ backgroundColor: "rgba(255,255,255,0.4)" }}
      >
        <View className="flex-1 px-5 pb-8 pt-2">
          <Text className="text-lg font-medium text-white">Are you happy with your AI redesign?</Text>
          <Text className="mt-2 text-sm text-zinc-400">Your feedback helps Darkor.ai improve.</Text>
          <View className="mt-5 flex-row gap-3">
            <LuxPressable
              onPress={handleReviewNo}
              className="flex-1 rounded-2xl border border-white/15 bg-white/5 px-4 py-3"
              style={{ borderWidth: 0.5 }}
            >
              <Text className="text-center text-sm font-semibold text-zinc-200">No</Text>
            </LuxPressable>
            <LuxPressable onPress={handleReviewYes} className="flex-1 rounded-2xl bg-cyan-400 px-4 py-3">
              <Text className="text-center text-sm font-semibold text-zinc-900">Yes</Text>
            </LuxPressable>
          </View>
        </View>
      </BottomSheetModal>

      <BottomSheetModal
        ref={rateSheetRef}
        snapPoints={rateSnapPoints}
        enablePanDownToClose
        backdropComponent={GlassBackdrop}
        onDismiss={() => setRatePromptOpen(false)}
        backgroundStyle={{ backgroundColor: "#050505" }}
        handleIndicatorStyle={{ backgroundColor: "rgba(255,255,255,0.4)" }}
      >
        <View className="flex-1 px-5 pb-8 pt-2">
          <Text className="text-lg font-medium text-white">Would you rate Darkor.ai?</Text>
          <Text className="mt-2 text-sm text-zinc-400">A quick review helps us reach more creators.</Text>
          <View className="mt-5 flex-row gap-3">
            <LuxPressable
              onPress={handleRateLater}
              className="flex-1 rounded-2xl border border-white/15 bg-white/5 px-4 py-3"
              style={{ borderWidth: 0.5 }}
            >
              <Text className="text-center text-sm font-semibold text-zinc-200">Later</Text>
            </LuxPressable>
            <LuxPressable onPress={handleRateNow} className="flex-1 overflow-hidden rounded-2xl">
              <LinearGradient
                colors={["#f43f5e", "#d946ef"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ paddingVertical: 12, alignItems: "center" }}
              >
                <Text className="text-center text-sm font-semibold text-white">Rate Now</Text>
              </LinearGradient>
            </LuxPressable>
          </View>
        </View>
      </BottomSheetModal>

      <BottomSheetModal
        ref={feedbackSheetRef}
        snapPoints={feedbackSnapPoints}
        enablePanDownToClose
        backdropComponent={GlassBackdrop}
        onDismiss={() => setFeedbackOpen(false)}
        backgroundStyle={{ backgroundColor: "#050505" }}
        handleIndicatorStyle={{ backgroundColor: "rgba(255,255,255,0.4)" }}
      >
        <View className="flex-1 px-5 pb-8 pt-2">
          <Text className="text-lg font-medium text-white">Tell us what went wrong</Text>
          <Text className="mt-2 text-sm text-zinc-400">We'll use this to improve your next redesign.</Text>
          <TextInput
            value={feedbackMessage}
            onChangeText={setFeedbackMessage}
            placeholder="Share what you expected or what felt off..."
            placeholderTextColor="rgba(148, 163, 184, 0.6)"
            multiline
            textAlignVertical="top"
            className="mt-4 min-h-[120px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
            style={{ borderWidth: 0.5 }}
          />
          <View className="mt-5 flex-row gap-3">
            <LuxPressable
              onPress={() => {
                triggerHaptic();
                setFeedbackOpen(false);
                feedbackSheetRef.current?.dismiss();
              }}
              className="flex-1 rounded-2xl border border-white/15 bg-white/5 px-4 py-3"
              style={{ borderWidth: 0.5 }}
            >
              <Text className="text-center text-sm font-semibold text-zinc-200">Cancel</Text>
            </LuxPressable>
            <LuxPressable
              onPress={handleSubmitFeedback}
              className="flex-1 rounded-2xl bg-cyan-400 px-4 py-3"
              disabled={isSubmittingFeedback}
            >
              {isSubmittingFeedback ? (
                <View className="flex-row items-center justify-center gap-2">
                  <ActivityIndicator color="#0f172a" />
                  <Text className="text-sm font-semibold text-zinc-900">Sending...</Text>
                </View>
              ) : (
                <Text className="text-center text-sm font-semibold text-zinc-900">Send</Text>
              )}
            </LuxPressable>
          </View>
        </View>
      </BottomSheetModal>

      <View
        ref={storyRef}
        collapsable={false}
        pointerEvents="none"
        style={{
          position: "absolute",
          left: -9999,
          top: -9999,
          width: STORY_WIDTH,
          height: STORY_HEIGHT,
          backgroundColor: "#000000",
        }}
      >
        <View style={{ height: STORY_HEIGHT / 2, width: "100%" }}>
          {selectedImage ? (
            <Image source={{ uri: selectedImage.uri }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
          ) : (
            <View className="h-full w-full bg-black" />
          )}
        </View>
        <View style={{ height: STORY_HEIGHT / 2, width: "100%" }}>
          {generatedImageUrl ? (
            <Image source={{ uri: generatedImageUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
          ) : (
            <View className="h-full w-full bg-black" />
          )}
        </View>
        <View className="absolute bottom-16 left-0 right-0 items-center gap-2">
          <Logo size={76} style={{ opacity: 0.9 }} />
          <Text className="text-sm font-semibold text-white">Designed with Darkor.ai</Text>
        </View>
      </View>
    </View>
  );
}












