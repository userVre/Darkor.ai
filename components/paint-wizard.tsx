import { useAuth } from "@clerk/expo";
import { useAction, useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AnimatePresence, MotiView } from "moti";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image as NativeImage, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle as SvgCircle, Defs, G, Mask as SvgMask, Path as SvgPath, Rect } from "react-native-svg";
import { captureRef } from "react-native-view-shot";
import { spacing } from "../styles/spacing";
import {
  Box,
  BrushCleaning,
  Check,
  ChevronLeft,
  Eraser,
  Redo2,
  Undo2,
  X,
} from "lucide-react-native";
import { fonts } from "../styles/typography";

import { triggerHaptic } from "../lib/haptics";
import { uploadLocalFileToCloud } from "../lib/native-upload";
import { WALL_COLOR_OPTIONS } from "../lib/data";
import { GENERATION_FAILED_TOAST } from "../lib/generation-errors";
import { runWithFriendlyRetry } from "../lib/generation-retry";
import {
  GUEST_TESTING_STARTER_CREDITS,
  isGuestWizardTestingSession,
  resolveGuestWizardViewerId,
} from "../lib/guest-testing";
import { SERVICE_WIZARD_THEME } from "../lib/service-wizard-theme";
import { PAINT_WIZARD_EXAMPLE_PHOTOS } from "../lib/wizard-example-photos";
import { PaintIntroScreen, type PaintIntroExamplePhoto } from "./paint-intro-screen";
import { useProSuccess } from "./pro-success-context";
import { ServiceContinueButton } from "./service-continue-button";
import { ServiceProcessingScreen } from "./service-processing-screen";
import { ServiceWizardHeader } from "./service-wizard-header";
import {
  ServiceSelectionCard,
  ServiceSelectionGrid,
  ServiceWizardStepScreen,
} from "./service-wizard-shared";
import { LuxPressable } from "./lux-pressable";
import { useMaskDrawing } from "./use-mask-drawing";
import { useViewerSession } from "./viewer-session-context";

type WizardStep = "intake" | "mask" | "colors" | "finish" | "processing" | "result";
type MaskTool = "brush" | "eraser" | "surface";

type SelectedImage = {
  uri: string;
  photoUri?: string | null;
  width: number;
  height: number;
};

type MeResponse = {
  credits: number;
};

type ArchiveGeneration = {
  _id: string;
  imageUrl?: string | null;
  status?: "processing" | "ready" | "failed";
  errorMessage?: string | null;
};

type FinishOption = {
  id: string;
  label: string;
  description: string;
};

type PaintWizardProps = {
  onProcessingStateChange?: (isProcessing: boolean) => void;
};

const pointerClassName = "cursor-pointer";
const OLED_BLACK = "#000000";
const CARD_BLACK = SERVICE_WIZARD_THEME.colors.surfaceRaised;
const CARD_BLACK_SOFT = SERVICE_WIZARD_THEME.colors.surfaceSoft;
const MASK_COLOR = "rgba(255,59,48,0.42)";
const MASK_ACCENT = "#FF3B30";
const MASK_CAPTURE_COLOR = "#FFFFFF";
const BRUSH_MIN = 14;
const BRUSH_MAX = 64;
const DETECT_DURATION_MS = 1700;
const FIXED_FOOTER_OFFSET = 96;
const AUTO_DETECT_SUCCESS_MESSAGE = "Walls detected - brush to refine if needed";
const AUTO_DETECT_FAILURE_MESSAGE = "Auto-detect couldn't run � please brush manually.";
const CANCELLED_GENERATION_MESSAGE = "Cancelled by user.";
const CANCEL_SUCCESS_TOAST = "Generation canceled. Your credit was kept.";

const FINISH_OPTIONS: FinishOption[] = [
  {
    id: "matte",
    label: "Matte",
    description: "Soft, gallery-grade color payoff with the least surface glare.",
  },
  {
    id: "satin",
    label: "Satin",
    description: "Balanced sheen for modern interiors with a subtle designer glow.",
  },
  {
    id: "glossy",
    label: "Glossy",
    description: "A polished reflective finish for bold, high-contrast statement walls.",
  },
];

const absoluteFill = StyleSheet.absoluteFillObject;

function simplifyRatio(width: number, height: number) {
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  if (safeWidth === safeHeight) return "1:1";
  const reduced = `${safeWidth / gcd(safeWidth, safeHeight)}:${safeHeight / gcd(safeWidth, safeHeight)}`;
  if (safeWidth > safeHeight) return reduced.startsWith("4:3") ? "4:3" : "16:9";
  return reduced.startsWith("3:4") ? "3:4" : "9:16";
}

function mapDetectionPointToCanvas(
  point: { x: number; y: number },
  imageSize: { width: number; height: number },
  canvas: { width: number; height: number },
  contentFit: "contain" | "cover",
) {
  const scale =
    contentFit === "cover"
      ? Math.max(canvas.width / imageSize.width, canvas.height / imageSize.height)
      : Math.min(canvas.width / imageSize.width, canvas.height / imageSize.height);
  const renderedWidth = imageSize.width * scale;
  const renderedHeight = imageSize.height * scale;
  const offsetX = (canvas.width - renderedWidth) / 2;
  const offsetY = (canvas.height - renderedHeight) / 2;

  return {
    x: offsetX + (point.x / 1000) * renderedWidth,
    y: offsetY + (point.y / 1000) * renderedHeight,
  };
}

function logAutoDetectFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown auto-detect failure";
  console.log("[PaintWizard] Auto-detect failed", { message });
}

const BrushPreview = memo(function BrushPreview({ width }: { width: number }) {
  return (
    <View
      style={{
        width: Math.max(width, 16),
        height: Math.max(width, 16),
        borderRadius: 999,
        backgroundColor: MASK_ACCENT,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.18)",
      }}
    />
  );
});

const FinishPreview = memo(function FinishPreview({ finishId }: { finishId: FinishOption["id"] }) {
  if (finishId === "matte") {
    return <View style={[styles.finishPreviewBase, styles.finishPreviewMatte]} />;
  }

  if (finishId === "satin") {
    return (
      <View style={styles.finishPreviewBase}>
        <LinearGradient
          colors={["#ECE8FF", "#B49AFA", "#6D4FD1"]}
          locations={[0, 0.42, 1]}
          start={{ x: 0.12, y: 0.1 }}
          end={{ x: 0.88, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.finishPreviewSatinGlow} />
      </View>
    );
  }

  return (
    <View style={styles.finishPreviewBase}>
      <LinearGradient
        colors={["#FAF8FF", "#C2B4FF", "#5A35CB", "#1E1448"]}
        locations={[0, 0.18, 0.6, 1]}
        start={{ x: 0.08, y: 0.06 }}
        end={{ x: 0.92, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.finishPreviewGlossyHighlight} />
      <View style={styles.finishPreviewGlossyReflection} />
    </View>
  );
});

const FinishCard = memo(function FinishCard({
  option,
  active,
  onPress,
}: {
  option: FinishOption;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <LuxPressable
      onPress={onPress}
      className={pointerClassName}
      style={{ width: "100%" }}
      glowColor={active ? "rgba(217,70,239,0.2)" : "rgba(255,255,255,0.04)"}
      scale={0.985}
    >
      <View style={[styles.finishCard, active ? styles.finishCardActive : null]}>
        <FinishPreview finishId={option.id} />
        <View style={styles.finishCopy}>
          <Text style={[styles.finishTitle, active ? styles.finishTitleActive : null]}>{option.label}</Text>
          <Text style={styles.finishText}>{option.description}</Text>
        </View>
        <View style={[styles.finishCheck, active ? styles.finishCheckActive : null]}>
          {active ? <Check color="#ffffff" size={16} /> : null}
        </View>
      </View>
    </LuxPressable>
  );
});

export function PaintWizard({ onProcessingStateChange }: PaintWizardProps) {
  const router = useRouter();
  const { presetStyle, startStep } = useLocalSearchParams<{ presetStyle?: string; startStep?: string }>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { isSignedIn } = useAuth();
  const { anonymousId, isReady: viewerReady } = useViewerSession();
  const guestWizardTestingSession = isGuestWizardTestingSession(isSignedIn);
  const effectiveSignedIn = isSignedIn || guestWizardTestingSession;
  const viewerId = useMemo(() => resolveGuestWizardViewerId(anonymousId, isSignedIn), [anonymousId, isSignedIn]);
  const { showToast } = useProSuccess();
  const viewerArgs = useMemo(() => (viewerId ? { anonymousId: viewerId } : {}), [viewerId]);

  const me = useQuery("users:me" as any, viewerReady ? viewerArgs : "skip") as MeResponse | null | undefined;
  const generationArchive = useQuery("generations:getUserArchive" as any, viewerReady ? viewerArgs : "skip") as
    | ArchiveGeneration[]
    | undefined;
  const detectEditMask = useAction("ai:detectEditMask" as any);
  const createSourceUploadUrl = useMutation("generations:createSourceUploadUrl" as any);
  const cancelGeneration = useMutation("generations:cancelGeneration" as any);
  const startGeneration = useMutation("generations:startGeneration" as any);

  const [step, setStep] = useState<WizardStep>("intake");
  const [maskTool, setMaskTool] = useState<MaskTool>("brush");
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [selectedColorValue, setSelectedColorValue] = useState<string | null>(null);
  const [selectedFinishId, setSelectedFinishId] = useState(FINISH_OPTIONS[0].id);
  const [isDetecting, setIsDetecting] = useState(false);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [awaitingAuth, setAwaitingAuth] = useState(false);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [detectedSourceStorageId, setDetectedSourceStorageId] = useState<string | null>(null);
  const [isCancellingGeneration, setIsCancellingGeneration] = useState(false);
  const [loadingContinueStep, setLoadingContinueStep] = useState<"intake" | "mask" | "colors" | null>(null);
  const initialSelectionAppliedRef = useRef(false);
  const detectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const continueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sourceCaptureRef = useRef<View>(null);
  const maskCaptureRef = useRef<View>(null);

  const {
    strokes: paintStrokes,
    renderedStrokes,
    brushWidth,
    brushProgress,
    canvasSize,
    sliderWidth,
    setSliderWidth,
    activePoint,
    isDrawing,
    hasMask,
    handleCanvasLayout,
    clearMask,
    undoLastStroke,
    redoLastStroke,
    replaceMaskWithRegions,
    resetMaskDrawing,
    drawGesture,
    sliderGesture,
    loupeMetrics,
    canRedo,
  } = useMaskDrawing({
    disabled: isDetecting || isAutoDetecting || maskTool === "surface",
    toolMode: maskTool === "eraser" ? "eraser" : "brush",
    initialBrushWidth: 24,
    minBrushWidth: BRUSH_MIN,
    maxBrushWidth: BRUSH_MAX,
  });

  const selectedColor = useMemo(
    () => WALL_COLOR_OPTIONS.find((option) => option.value === selectedColorValue) ?? null,
    [selectedColorValue],
  );
  const selectedFinish = useMemo(
    () => FINISH_OPTIONS.find((option) => option.id === selectedFinishId) ?? FINISH_OPTIONS[0],
    [selectedFinishId],
  );
  const availableCredits = viewerReady ? me?.credits ?? GUEST_TESTING_STARTER_CREDITS : GUEST_TESTING_STARTER_CREDITS;
  const canGenerate = Boolean(selectedImage && hasMask && selectedColor && !isGenerating);
  const currentStepNumber =
    step === "intake" ? 1 : step === "mask" ? 2 : step === "colors" ? 3 : 4;
  const intakeHeading = selectedImage ? "Photo added � mark the wall area next." : "Add a Photo of your Room";
  const intakeSubtext = selectedImage
    ? "Your photo is locked in. Next, brush the wall surfaces so the recolor stays precise around trim, furniture, and decor."
    : "Upload a room photo for precise wall recoloring.";
  const canContinueFromMask = hasMask && !isDetecting && !isAutoDetecting;
  const canContinueFromColors = Boolean(selectedColor && selectedImage && hasMask);
  const activeMaskTool = maskTool === "surface" ? "brush" : maskTool;
  const maskWidthLabel = activeMaskTool === "eraser" ? "Eraser Width" : "Brush Width";
  const colorCardSize = Math.max((width - 46) / 2, 154);
  const frameAspectRatio = selectedImage ? selectedImage.width / Math.max(selectedImage.height, 1) : 1;
  const previewHeight = Math.min(Math.max((width - 32) / Math.max(frameAspectRatio, 0.6), 240), height * 0.54);
  const maskPreviewHeight = Math.min(previewHeight, Math.max(height * 0.4, 248));
  const maskCanvasWidth = Math.min(width - 48, 412);
  const maskCanvasHeight = Math.min(Math.max(height * 0.45, 352), 416);

  useEffect(() => {
    return () => {
      if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
      if (continueTimerRef.current) clearTimeout(continueTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (initialSelectionAppliedRef.current) {
      return;
    }

    if (typeof presetStyle === "string") {
      const normalized = presetStyle.trim().toLowerCase();
      const matched = WALL_COLOR_OPTIONS.find((option) => option.title.toLowerCase() === normalized);
      if (matched) {
        setSelectedColorValue(matched.value);
      }
    }

    initialSelectionAppliedRef.current = true;
  }, [presetStyle, startStep]);

  useEffect(() => {
    if (!generationId || !generationArchive) return;
    const generation = generationArchive.find((item) => item._id === generationId);
    if (!generation) return;

    if (generation.status === "ready" && generation.imageUrl) {
      setGeneratedImageUrl(generation.imageUrl);
      setIsGenerating(false);
      setIsCancellingGeneration(false);
      triggerHaptic();
      if (effectiveSignedIn) {
        router.replace({ pathname: "/workspace", params: { boardView: "board" } });
        return;
      }
      setStep("result");
      return;
    }

    if (generation.status === "failed") {
      setIsGenerating(false);
      setIsCancellingGeneration(false);
      if (generation.errorMessage === CANCELLED_GENERATION_MESSAGE) {
        return;
      }
      setStep("finish");
      showToast(GENERATION_FAILED_TOAST);
    }
  }, [effectiveSignedIn, generationArchive, generationId, router, showToast]);

  const resetDetection = useCallback(() => {
    if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
    setIsDetecting(true);
    detectTimerRef.current = setTimeout(() => {
      setIsDetecting(false);
    }, DETECT_DURATION_MS);
  }, []);

  const resetProject = useCallback(() => {
    setStep("intake");
    setMaskTool("brush");
    setSelectedImage(null);
    setGeneratedImageUrl(null);
    setGenerationId(null);
    setIsGenerating(false);
    setIsAutoDetecting(false);
    setDetectedSourceStorageId(null);
    setIsCancellingGeneration(false);
    resetMaskDrawing({ resetBrush: true });
    if (typeof presetStyle === "string") {
      const normalized = presetStyle.trim().toLowerCase();
      const matched = WALL_COLOR_OPTIONS.find((option) => option.title.toLowerCase() === normalized);
      setSelectedColorValue(matched?.value ?? null);
    } else {
      setSelectedColorValue(null);
    }
    setSelectedFinishId(FINISH_OPTIONS[0].id);
  }, [presetStyle, resetMaskDrawing]);

  const handleClose = useCallback(() => {
    triggerHaptic();
    if (step === "intake") {
      resetProject();
      router.replace("/(tabs)");
      return;
    }
    resetProject();
  }, [resetProject, router, step]);

  const uploadBlobToStorage = useCallback(
    async (uri: string) => {
      const uploadUrl = (await createSourceUploadUrl(viewerArgs)) as string;
      return await uploadLocalFileToCloud(uploadUrl, uri, {
        fallbackMimeType: "image/png",
        errorLabel: "wall-paint assets",
      });
    },
    [createSourceUploadUrl, viewerArgs],
  );

  const ensureDetectableSourceStorageId = useCallback(async () => {
    if (!selectedImage) {
      throw new Error("Select a room photo before using Auto-Detect.");
    }

    if (detectedSourceStorageId) {
      return detectedSourceStorageId;
    }

    if (!selectedImage.photoUri) {
      throw new Error("No uploaded room photo is available for auto-detect.");
    }

    const storageId = await uploadBlobToStorage(selectedImage.photoUri);
    setDetectedSourceStorageId(storageId);
    return storageId;
  }, [detectedSourceStorageId, selectedImage, uploadBlobToStorage]);

  const applySelectedImage = useCallback(
    (nextImage: SelectedImage) => {
      setMaskTool("brush");
      setSelectedImage(nextImage);
      setGeneratedImageUrl(null);
      setGenerationId(null);
      setDetectedSourceStorageId(null);
      setIsAutoDetecting(false);
      setIsCancellingGeneration(false);
      resetMaskDrawing({ resetBrush: true });
      setSelectedFinishId(FINISH_OPTIONS[0].id);
    },
    [resetMaskDrawing],
  );

  const advanceToMaskStep = useCallback(() => {
    triggerHaptic();
    setStep("mask");
    resetDetection();
  }, [resetDetection]);

  const handleContinueFromIntake = useCallback(() => {
    if (!selectedImage) {
      return;
    }
    triggerHaptic();
    setStep("mask");
    resetDetection();
  }, [resetDetection, selectedImage]);

  const runDeferredContinue = useCallback(
    (key: "intake" | "mask" | "colors", action: () => void) => {
      if (loadingContinueStep) return;
      if (continueTimerRef.current) clearTimeout(continueTimerRef.current);

      setLoadingContinueStep(key);
      continueTimerRef.current = setTimeout(() => {
        continueTimerRef.current = null;
        action();
        setLoadingContinueStep(null);
      }, 140);
    },
    [loadingContinueStep],
  );

  const handleClearSelectedImage = useCallback(() => {
    triggerHaptic();
    setMaskTool("brush");
    setSelectedImage(null);
    setGeneratedImageUrl(null);
    setGenerationId(null);
    setIsGenerating(false);
    setIsAutoDetecting(false);
    setDetectedSourceStorageId(null);
    setIsCancellingGeneration(false);
    resetMaskDrawing({ resetBrush: true });
  }, [resetMaskDrawing]);

  const handleAutoDetectMask = useCallback(async () => {
    try {
      if (!viewerReady) {
        showToast("Preparing your session. Please try again in a moment.");
        return;
      }

      if (!selectedImage || canvasSize.width <= 0 || canvasSize.height <= 0 || isAutoDetecting || isDetecting) {
        return;
      }

      setIsAutoDetecting(true);
      const imageStorageId = await ensureDetectableSourceStorageId();
      const detection = (await detectEditMask({
        imageStorageId,
        target: "paint",
      })) as {
        confidence?: number;
        polygons?: Array<Array<{ x: number; y: number }>>;
      };

      const polygons = Array.isArray(detection.polygons) ? detection.polygons : [];
      const confidence = typeof detection.confidence === "number" ? detection.confidence : 0;

      if (confidence < 70 || polygons.length === 0) {
        showToast(AUTO_DETECT_FAILURE_MESSAGE);
        return;
      }

      const mappedRegions = polygons
        .map((polygon) =>
          polygon.map((point) =>
            mapDetectionPointToCanvas(point, selectedImage, canvasSize, "contain"),
          ),
        )
        .filter((polygon) => polygon.length >= 3);

      if (!mappedRegions.length) {
        showToast(AUTO_DETECT_FAILURE_MESSAGE);
        return;
      }

      replaceMaskWithRegions(mappedRegions);
      triggerHaptic();
      showToast(AUTO_DETECT_SUCCESS_MESSAGE);
    } catch (error) {
      logAutoDetectFailure(error);
      showToast(AUTO_DETECT_FAILURE_MESSAGE);
    } finally {
      setIsAutoDetecting(false);
    }
  }, [
    canvasSize.height,
    canvasSize.width,
    detectEditMask,
    ensureDetectableSourceStorageId,
    isAutoDetecting,
    isDetecting,
    replaceMaskWithRegions,
    selectedImage,
    showToast,
    viewerReady,
    ]);

  const handleSelectMaskTool = useCallback(
    (tool: MaskTool) => {
      triggerHaptic();
      setMaskTool(tool);

      if (tool === "surface") {
        void handleAutoDetectMask();
      }
    },
    [handleAutoDetectMask],
  );

  const handleSelectMedia = useCallback(
    async (source: "camera" | "library") => {
      try {
        const permission =
          source === "camera"
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          Alert.alert(
            source === "camera" ? "Camera access needed" : "Photo access needed",
            source === "camera"
              ? "Please enable camera access to capture a room photo."
              : "Please enable photo library access to upload a room photo.",
          );
          return false;
        }

        const result =
          source === "camera"
            ? await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 1,
              })
            : await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 1,
              });

        if (result.canceled || !result.assets[0]) return false;

        const asset = result.assets[0];
        applySelectedImage({
          uri: asset.uri,
          photoUri: asset.uri,
          width: asset.width ?? 1080,
          height: asset.height ?? 1440,
        });
        advanceToMaskStep();
        return true;
      } catch (error) {
        Alert.alert("Unable to open media", error instanceof Error ? error.message : "Please try again.");
        return false;
      }
    },
    [advanceToMaskStep, applySelectedImage],
  );

  const handleSelectExample = useCallback(
    (example: PaintIntroExamplePhoto) => {
      const resolved = NativeImage.resolveAssetSource(example.source);
      if (!resolved?.uri) {
        Alert.alert("Example unavailable", "This example photo could not be opened.");
        return;
      }

      applySelectedImage({
        uri: resolved.uri,
        photoUri: null,
        width: resolved.width ?? 1080,
        height: resolved.height ?? 1440,
      });
      advanceToMaskStep();
    },
    [advanceToMaskStep, applySelectedImage],
  );

  const handleGenerate = useCallback(async () => {
    if (!viewerReady) {
      Alert.alert("Preparing your session", "Your guest profile is still loading. Please try again in a moment.");
      return;
    }

    if (!selectedImage || !hasMask || !sourceCaptureRef.current || !maskCaptureRef.current) {
      Alert.alert("Mark the walls first", "Brush over the wall surfaces you want to repaint before generating.");
      return;
    }

    if (!selectedColor) {
      Alert.alert("Pick a color", "Choose a wall color before continuing.");
      return;
    }

    if (availableCredits <= 0) {
      if (!effectiveSignedIn) {
        setAwaitingAuth(true);
        router.push({ pathname: "/sign-in", params: { returnTo: "/workspace?service=paint" } });
        return;
      }

      router.push("/paywall");
      return;
    }

    try {
      setIsGenerating(true);
      setStep("processing");

      const result = (await runWithFriendlyRetry(
        async () => {
          const sourceUri = await captureRef(sourceCaptureRef, {
            format: "png",
            quality: 1,
            result: "tmpfile",
          });
          const maskUri = await captureRef(maskCaptureRef, {
            format: "png",
            quality: 1,
            result: "tmpfile",
          });

          const [sourceStorageId, maskStorageId] = await Promise.all([
            uploadBlobToStorage(sourceUri),
            uploadBlobToStorage(maskUri),
          ]);

          return (await startGeneration({
            anonymousId: viewerId,
            imageStorageId: sourceStorageId,
            maskStorageId,
            serviceType: "paint",
            selection: `${selectedColor.title} (${selectedColor.value}) with a realistic ${selectedFinish.label.toLowerCase()} finish`,
            roomType: "Room",
            displayStyle: `${selectedColor.title} Paint`,
            customPrompt: "Preserve trim, ceilings, furniture, windows, doors, floors, artwork, reflections, and the original lighting exactly.",
            aspectRatio: simplifyRatio(selectedImage.width, selectedImage.height),
          })) as { generationId: string };
        },
        showToast,
      )) as { generationId: string };

      setGenerationId(result.generationId);
    } catch (error) {
      setIsGenerating(false);
      setStep("finish");
      const rawMessage = error instanceof Error ? error.message : "Please try again.";
      if (rawMessage === "Payment Required") {
        if (!effectiveSignedIn) {
          setAwaitingAuth(true);
          router.push({ pathname: "/sign-in", params: { returnTo: "/workspace?service=paint" } });
          return;
        }
        router.push("/paywall");
        return;
      }
      showToast(GENERATION_FAILED_TOAST);
    }
  }, [
    anonymousId,
    availableCredits,
    hasMask,
    isSignedIn,
    router,
    selectedFinish.label,
    selectedImage,
    startGeneration,
    showToast,
    uploadBlobToStorage,
    viewerId,
    viewerReady,
    selectedColor,
  ]);

  const handleCancelGeneration = useCallback(async () => {
    if (!generationId || isCancellingGeneration) {
      return;
    }

    try {
      setIsCancellingGeneration(true);
      const result = (await cancelGeneration({
        anonymousId: viewerId,
        id: generationId,
      })) as { cancelled?: boolean };

      if (!result.cancelled) {
        showToast("This render is already finishing up.");
        return;
      }

      triggerHaptic();
      setIsGenerating(false);
      setGenerationId(null);
      setGeneratedImageUrl(null);
      setStep("finish");
      showToast(CANCEL_SUCCESS_TOAST);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to cancel right now.");
    } finally {
      setIsCancellingGeneration(false);
    }
  }, [cancelGeneration, generationId, isCancellingGeneration, showToast, viewerId]);

  useEffect(() => {
    if (!awaitingAuth || !effectiveSignedIn || !viewerReady || !canGenerate) {
      return;
    }

    setAwaitingAuth(false);
    const timer = setTimeout(() => {
      void handleGenerate();
    }, 300);
    return () => clearTimeout(timer);
  }, [awaitingAuth, canGenerate, effectiveSignedIn, handleGenerate, viewerReady]);

  useEffect(() => {
    onProcessingStateChange?.(step === "processing");

    return () => {
      onProcessingStateChange?.(false);
    };
  }, [onProcessingStateChange, step]);

  const handleBack = useCallback(() => {
    triggerHaptic();
    if (step === "intake") return;
    if (step === "mask") return setStep("intake");
    if (step === "colors") return setStep("mask");
    if (step === "finish") return setStep("colors");
    if (step === "processing") return setStep("finish");
    if (step === "result") return setStep("finish");
  }, [step]);

  return (
    <View style={styles.screen}>
      {selectedImage && canvasSize.width > 0 && canvasSize.height > 0 ? (
        <View pointerEvents="none" style={styles.captureStage}>
          <View
            ref={sourceCaptureRef}
            collapsable={false}
            style={{ width: canvasSize.width, height: canvasSize.height, backgroundColor: OLED_BLACK }}
          >
            <Image source={{ uri: selectedImage.uri }} style={styles.captureImage} contentFit="contain" />
          </View>
          <View
            ref={maskCaptureRef}
            collapsable={false}
            style={{ width: canvasSize.width, height: canvasSize.height, marginTop: spacing.sm, backgroundColor: OLED_BLACK }}
          >
            <Svg width={canvasSize.width} height={canvasSize.height}>
              <Rect x={0} y={0} width={canvasSize.width} height={canvasSize.height} fill={OLED_BLACK} />
              {renderedStrokes.map((stroke) => (
                <SvgPath
                  key={`mask-${stroke.id}`}
                  d={stroke.path}
                  stroke={stroke.kind === "region" ? "none" : stroke.tool === "eraser" ? OLED_BLACK : MASK_CAPTURE_COLOR}
                  strokeWidth={stroke.kind === "region" ? 0 : stroke.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill={stroke.kind === "region" ? MASK_CAPTURE_COLOR : stroke.tool === "eraser" ? OLED_BLACK : "none"}
                />
              ))}
            </Svg>
          </View>
        </View>
      ) : null}

      {step !== "processing" && step !== "intake" && step !== "mask" ? (
        <ServiceWizardHeader
          title="Paint"
          step={currentStepNumber}
          canGoBack={currentStepNumber > 1}
          onBack={handleBack}
          onClose={handleClose}
        />
      ) : null}

      {step === "intake" ? (
        <PaintIntroScreen
          creditCount={availableCredits}
          examples={PAINT_WIZARD_EXAMPLE_PHOTOS}
          onTakePhoto={() => handleSelectMedia("camera")}
          onChooseFromGallery={() => handleSelectMedia("library")}
          onExamplePress={handleSelectExample}
          onExit={handleClose}
        />
      ) : null}

      {step === "mask" ? (
        <View style={styles.maskScreen}>
          <StatusBar style="dark" />

          <Pressable accessibilityRole="button" onPress={handleBack} style={[styles.maskBackButton, { top: Math.max(insets.top + 18, 70) }]}>
            <ChevronLeft color="#0A0A0A" size={22} strokeWidth={2.4} />
          </Pressable>

          <Text style={[styles.maskHeaderTitle, { top: Math.max(insets.top + 20, 72) }]}>Select Area to Paint</Text>

          <Pressable accessibilityRole="button" onPress={handleClose} style={[styles.maskCloseButton, { top: Math.max(insets.top + 18, 70) }]}>
            <X color="#0A0A0A" size={20} strokeWidth={2.4} />
          </Pressable>

          <View style={[styles.maskCanvasWrap, { marginTop: Math.max(insets.top + 104, 156) }]}>
            <View onLayout={handleCanvasLayout} style={[styles.maskCanvasFrame, { width: maskCanvasWidth, height: maskCanvasHeight }]}>
              {selectedImage ? (
                <>
                  <Image source={{ uri: selectedImage.uri }} style={styles.photoImage} contentFit="contain" transition={160} />

                  <GestureDetector gesture={drawGesture}>
                    <View style={absoluteFill}>
                      <Svg width="100%" height="100%">
                        <Defs>
                          <SvgMask id="paint-mask">
                            <Rect x="0" y="0" width="100%" height="100%" fill="#000000" />
                            {renderedStrokes.map((stroke) => (
                              <SvgPath
                                key={`paint-mask-${stroke.id}`}
                                d={stroke.path}
                                stroke={stroke.kind === "region" ? "none" : stroke.tool === "eraser" ? "#000000" : "#FFFFFF"}
                                strokeWidth={stroke.kind === "region" ? 0 : stroke.width}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                fill={stroke.kind === "region" ? "#FFFFFF" : stroke.tool === "eraser" ? "#000000" : "none"}
                              />
                            ))}
                          </SvgMask>
                        </Defs>
                        <Rect x="0" y="0" width="100%" height="100%" fill={MASK_COLOR} mask="url(#paint-mask)" />
                      </Svg>
                    </View>
                  </GestureDetector>

                  {activePoint ? (
                    <MotiView
                      pointerEvents="none"
                      animate={{
                        width: brushWidth,
                        height: brushWidth,
                        opacity: 1,
                        scale: [0.96, 1, 0.96],
                      }}
                      transition={{ duration: 140, type: "timing" }}
                      style={[
                        styles.maskCursor,
                        {
                          left: Math.max(12, Math.min(activePoint.x - brushWidth / 2, Math.max(canvasSize.width - brushWidth - 12, 12))),
                          top: Math.max(12, Math.min(activePoint.y - brushWidth / 2, Math.max(canvasSize.height - brushWidth - 12, 12))),
                          borderColor: activeMaskTool === "eraser" ? "rgba(10,10,10,0.86)" : "rgba(255,255,255,0.82)",
                          backgroundColor: activeMaskTool === "eraser" ? "rgba(255,255,255,0.2)" : MASK_COLOR,
                        },
                      ]}
                    />
                  ) : null}

                  {selectedImage && loupeMetrics ? (
                    <View pointerEvents="none" style={[styles.loupe, { left: loupeMetrics.left, top: loupeMetrics.top, width: loupeMetrics.size, height: loupeMetrics.size }]}>
                      <View style={styles.loupeInner}>
                        <Image
                          source={{ uri: selectedImage.uri }}
                          style={{
                            position: "absolute",
                            width: canvasSize.width * loupeMetrics.zoom,
                            height: canvasSize.height * loupeMetrics.zoom,
                            left: loupeMetrics.translateX,
                            top: loupeMetrics.translateY,
                          }}
                          contentFit="contain"
                        />
                        <Svg width={loupeMetrics.size} height={loupeMetrics.size} style={absoluteFill}>
                          <Defs>
                            <SvgMask id="paint-loupe-mask">
                              <Rect x="0" y="0" width={loupeMetrics.size} height={loupeMetrics.size} fill="#000000" />
                              <G transform={`translate(${loupeMetrics.translateX} ${loupeMetrics.translateY}) scale(${loupeMetrics.zoom})`}>
                                {renderedStrokes.map((stroke) => (
                                  <SvgPath
                                    key={`loupe-mask-${stroke.id}`}
                                    d={stroke.path}
                                    stroke={stroke.kind === "region" ? "none" : stroke.tool === "eraser" ? "#000000" : "#FFFFFF"}
                                    strokeWidth={stroke.kind === "region" ? 0 : stroke.width}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    fill={stroke.kind === "region" ? "#FFFFFF" : stroke.tool === "eraser" ? "#000000" : "none"}
                                  />
                                ))}
                              </G>
                            </SvgMask>
                          </Defs>
                          <Rect x="0" y="0" width={loupeMetrics.size} height={loupeMetrics.size} fill={MASK_COLOR} mask="url(#paint-loupe-mask)" />
                          <SvgCircle cx={loupeMetrics.size / 2} cy={loupeMetrics.size / 2} r={8} fill="none" stroke="#ffffff" strokeWidth={1.5} />
                          <SvgPath d={`M ${loupeMetrics.size / 2 - 14} ${loupeMetrics.size / 2} L ${loupeMetrics.size / 2 + 14} ${loupeMetrics.size / 2}`} stroke="#ffffff" strokeWidth={1} />
                          <SvgPath d={`M ${loupeMetrics.size / 2} ${loupeMetrics.size / 2 - 14} L ${loupeMetrics.size / 2} ${loupeMetrics.size / 2 + 14}`} stroke="#ffffff" strokeWidth={1} />
                        </Svg>
                      </View>
                    </View>
                  ) : null}

                  <AnimatePresence>
                    {isDetecting || isAutoDetecting ? (
                      <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={styles.detectOverlay}>
                        <MotiView
                          animate={{ scale: [0.92, 1.08, 0.92], opacity: [0.14, 0.46, 0.14] }}
                          transition={{ duration: 1700, loop: true }}
                          style={styles.detectPulse}
                        />
                        <View style={styles.detectCopy}>
                          <ActivityIndicator color="#ffffff" />
                          <Text style={styles.detectTitle}>
                            {isAutoDetecting ? "Detecting paintable surfaces..." : "Preparing your masking surface..."}
                          </Text>
                          <Text style={styles.detectText}>
                            {isAutoDetecting
                              ? "Darkor.ai is tracing repaintable wall surfaces while leaving windows, furniture, trim, and flooring untouched."
                              : "Darkor.ai is refining the canvas so you can paint crisp edges around built-ins, windows, and furniture."}
                          </Text>
                        </View>
                      </MotiView>
                    ) : null}
                  </AnimatePresence>
                </>
              ) : null}
            </View>
          </View>

          <View style={styles.maskToolBar}>
            <Pressable
              accessibilityRole="button"
              onPress={() => handleSelectMaskTool("brush")}
              style={[styles.maskToolButton, { left: 24 }, maskTool === "brush" ? styles.maskToolButtonActive : null]}
            >
              <BrushCleaning color={maskTool === "brush" ? "#FFFFFF" : "#0A0A0A"} size={20} strokeWidth={2} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => handleSelectMaskTool("eraser")}
              style={[styles.maskToolButton, { left: 124 }, maskTool === "eraser" ? styles.maskToolButtonActive : null]}
            >
              <Eraser color={maskTool === "eraser" ? "#FFFFFF" : "#0A0A0A"} size={20} strokeWidth={2} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => handleSelectMaskTool("surface")}
              style={[styles.maskToolButton, { left: 208 }, maskTool === "surface" || isAutoDetecting ? styles.maskToolButtonActive : null]}
            >
              {isAutoDetecting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Box color={maskTool === "surface" ? "#FFFFFF" : "#0A0A0A"} size={20} strokeWidth={2} />
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={!paintStrokes.length}
              onPress={undoLastStroke}
              style={[styles.maskToolButton, styles.maskHistoryButton, { right: 88 }, !paintStrokes.length ? styles.maskToolButtonDisabled : null]}
            >
              <Undo2 color={!paintStrokes.length ? "#B8B8B8" : "#0A0A0A"} size={20} strokeWidth={2} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={!canRedo}
              onPress={redoLastStroke}
              style={[styles.maskToolButton, styles.maskHistoryButton, { right: 24 }, !canRedo ? styles.maskToolButtonDisabled : null]}
            >
              <Redo2 color={!canRedo ? "#B8B8B8" : "#0A0A0A"} size={20} strokeWidth={2} />
            </Pressable>
          </View>

          <View style={styles.maskSliderSection}>
            <View style={styles.maskSliderHeader}>
              <Text style={styles.maskSliderLabel}>{maskWidthLabel}</Text>
              <View style={styles.maskSliderValueWrap}>
                <View
                  style={[
                    styles.maskSliderPreview,
                    {
                      width: Math.max(brushWidth, 12),
                      height: Math.max(brushWidth, 12),
                      backgroundColor: activeMaskTool === "eraser" ? "rgba(255,255,255,0.28)" : MASK_COLOR,
                      borderColor: activeMaskTool === "eraser" ? "rgba(10,10,10,0.82)" : "rgba(255,255,255,0.78)",
                    },
                  ]}
                />
                <Text style={styles.maskSliderValue}>{brushWidth}px</Text>
              </View>
            </View>

            <GestureDetector gesture={sliderGesture}>
              <View onLayout={(event) => setSliderWidth(event.nativeEvent.layout.width)} style={styles.maskSliderWrap}>
                <View style={styles.maskSliderTrack} />
                <LinearGradient colors={[MASK_ACCENT, MASK_ACCENT]} style={[styles.maskSliderFill, { width: Math.max(16, sliderWidth * brushProgress) }]} />
                <MotiView
                  animate={{ left: Math.max(0, sliderWidth * brushProgress - 16) }}
                  transition={{ duration: 120, type: "timing" }}
                  style={styles.maskSliderThumb}
                >
                  <View style={styles.maskSliderThumbDot} />
                </MotiView>
              </View>
            </GestureDetector>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={!canContinueFromMask}
            onPress={() => {
              if (!canContinueFromMask) {
                return;
              }

              runDeferredContinue("mask", () => {
                triggerHaptic();
                setStep("colors");
              });
            }}
            style={[
              styles.maskContinueButton,
              {
                bottom: Math.max(insets.bottom + 44, 44),
                backgroundColor: canContinueFromMask ? MASK_ACCENT : "#E8E8E8",
              },
            ]}
          >
            {loadingContinueStep === "mask" ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={[styles.maskContinueText, { color: canContinueFromMask ? "#FFFFFF" : "#A0A0A0" }]}>Continue</Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {step === "colors" ? (
        <ServiceWizardStepScreen
          footerOffset={FIXED_FOOTER_OFFSET}
          contentContainerStyle={{
            paddingHorizontal: spacing.md,
            paddingTop: spacing.sm,
            gap: spacing.md,
          }}
          footer={
            <ServiceContinueButton
              active={canContinueFromColors}
              label={selectedColor ? "Generate My Design \u2192" : "Select a Color"}
              loading={loadingContinueStep === "colors"}
              onPress={() => {
                if (!canContinueFromColors) {
                  return;
                }

                runDeferredContinue("colors", () => {
                  triggerHaptic();
                  setStep("finish");
                });
              }}
            />
          }
        >
          <View>
            <Text style={styles.stepTitle}>Color & Surface</Text>
            <Text style={styles.stepText}>
              Pick from the real wall-finish thumbnails so Darkor.ai carries the exact tone into the final render.
            </Text>

            <View style={styles.roomReferenceFrame}>
              {selectedImage ? (
                <>
                  <Image source={{ uri: selectedImage.uri }} style={styles.photoImage} contentFit="cover" transition={160} />
                  <View style={styles.roomReferenceBadge}>
                    <Text style={styles.roomReferenceBadgeText}>Your Room</Text>
                  </View>
                </>
              ) : null}
            </View>

            <ServiceSelectionGrid>
              {WALL_COLOR_OPTIONS.map((option) => (
                <ServiceSelectionCard
                  key={option.id}
                  title={option.title}
                  description={option.description}
                  image={option.image}
                  active={option.id === selectedColor?.id}
                  width={colorCardSize}
                  onPress={() => {
                    setSelectedColorValue(option.value);
                    triggerHaptic();
                  }}
                />
              ))}
            </ServiceSelectionGrid>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Selected Color</Text>
              <Text style={styles.summaryTitle}>{selectedColor?.title ?? "No wall color selected"}</Text>
              <Text style={styles.summaryText}>
                {selectedColor?.description ?? "Choose a wall color thumbnail to unlock the finish step."}
              </Text>
            </View>
          </View>
        </ServiceWizardStepScreen>
      ) : null}

      {step === "finish" ? (
        <ServiceWizardStepScreen
          footerOffset={FIXED_FOOTER_OFFSET}
          contentContainerStyle={{
            paddingHorizontal: spacing.md,
            paddingTop: spacing.sm,
            gap: spacing.md,
          }}
          footer={
            <ServiceContinueButton
              active={canGenerate}
              label="Paint My Walls ?"
              loading={isGenerating}
              onPress={() => {
                if (!canGenerate) {
                  return;
                }

                void handleGenerate();
              }}
              pulse={canGenerate}
              supportingText={`Uses 1 credit \u00b7 ${Math.max(availableCredits - 1, 0)} remaining`}
            />
          }
        >
          <View>
            <Text style={styles.stepTitle}>Finish Type</Text>
            <Text style={styles.stepText}>
              Choose how the paint should catch light so the walls read correctly in a polished, designer-grade render.
            </Text>

            <View style={[styles.summaryCard, styles.finishSummaryCard]}>
              {selectedColor ? (
                <Image source={selectedColor.image} style={styles.finishSelectionThumb} contentFit="cover" transition={120} />
              ) : (
                <View style={[styles.summarySwatch, { backgroundColor: "#ffffff" }]} />
              )}
              <View style={styles.summaryCopy}>
                <Text style={styles.summaryLabel}>Selected Color</Text>
                <Text style={styles.summaryTitle}>{selectedColor?.title ?? "No color selected"}</Text>
                <Text style={styles.summaryText}>
                  {selectedColor?.description ?? "Wall color is locked. Now choose the final sheen profile for the render."}
                </Text>
              </View>
            </View>

            <View style={styles.finishList}>
              {FINISH_OPTIONS.map((option) => (
                <FinishCard
                  key={option.id}
                  option={option}
                  active={option.id === selectedFinish.id}
                  onPress={() => {
                    setSelectedFinishId(option.id);
                    triggerHaptic();
                  }}
                />
              ))}
            </View>
          </View>
        </ServiceWizardStepScreen>
      ) : null}

      {step === "processing" ? (
        <ServiceProcessingScreen
          imageUri={selectedImage?.uri ?? null}
          subtitlePhrases={[
            "Analyzing your room geometry...",
            `Applying ${selectedColor?.title ?? "your selected color"}...`,
            "Rendering final lighting...",
          ]}
          onCancel={() => {
            void handleCancelGeneration();
          }}
          cancelDisabled={!generationId || isCancellingGeneration}
        />
      ) : null}

      {step === "result" ? (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.md,
            paddingTop: spacing.sm,
            paddingBottom: Math.max(insets.bottom + 28, 34),
            gap: spacing.md,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.resultIntro}>
            <Text style={styles.resultHeading}>Behold your new interior</Text>
            <Text style={styles.resultSubheading}>
              A polished wall concept, composed to preserve the room's structure, furnishing layout, and natural light.
            </Text>
          </View>

          <View style={[styles.canvasFrame, { height: Math.min(height * 0.56, 460) }]}>
            {generatedImageUrl ? (
              <Image source={{ uri: generatedImageUrl }} style={styles.photoImage} contentFit="contain" />
            ) : (
              <View style={styles.resultFallback}>
                <ActivityIndicator color="#ffffff" />
              </View>
            )}
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Applied Finish</Text>
            <Text style={styles.summaryTitle}>{`${selectedColor?.title ?? "Selected Color"} � ${selectedFinish.label}`}</Text>
            <Text style={styles.summaryText}>
              Your walls were recolored from the mask you painted while preserving the structure, furnishings, trim, and natural light of the room.
            </Text>
          </View>

          <View style={styles.resultRow}>
            <LuxPressable
              onPress={() => setStep("colors")}
              className={pointerClassName}
              style={{ flex: 1 }}
              glowColor="rgba(255,255,255,0.04)"
              scale={0.99}
            >
              <View style={styles.secondaryAction}>
                <Text style={styles.secondaryActionText}>Try Another Color</Text>
              </View>
            </LuxPressable>
            <LuxPressable
              onPress={() => setStep("mask")}
              className={pointerClassName}
              style={{ flex: 1 }}
              glowColor="rgba(255,255,255,0.04)"
              scale={0.99}
            >
              <View style={styles.secondaryAction}>
                <Text style={styles.secondaryActionText}>Refine Mask</Text>
              </View>
            </LuxPressable>
          </View>

          <LuxPressable
            onPress={resetProject}
            className={pointerClassName}
            style={{ width: "100%" }}
            glowColor="rgba(255,255,255,0.04)"
            scale={0.99}
          >
            <View style={styles.restartButton}>
              <ChevronLeft color="#ffffff" size={16} />
              <Text style={styles.restartText}>Start New Room</Text>
            </View>
          </LuxPressable>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SERVICE_WIZARD_THEME.colors.background,
  },
  captureStage: {
    position: "absolute",
    left: -10000,
    top: 0,
    opacity: 0.01,
  },
  captureImage: {
    width: "100%",
    height: "100%",
  },
  topBar: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  topButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: SERVICE_WIZARD_THEME.colors.border,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  topCopy: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
  },
  topTitle: {
    color: "#ffffff",
    fontSize: 19,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  topSubtitle: {
    color: "#a1a1aa",
    fontSize: 12,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
  },
  progressTrack: {
    width: "100%",
    maxWidth: 170,
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  progressFillWrap: {
    height: "100%",
    overflow: "hidden",
    borderRadius: 999,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  stepRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  stepPill: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  stepPillActive: {
    backgroundColor: "rgba(217,70,239,0.22)",
    borderColor: "rgba(217,70,239,0.42)",
  },
  stepPillText: {
    color: "#d4d4d8",
    fontSize: 12,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
  },
  stepPillTextActive: {
    color: "#ffffff",
  },
  creditPill: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: spacing.sm,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: SERVICE_WIZARD_THEME.colors.border,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  creditText: {
    color: "#ffffff",
    fontSize: 12,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
  },
  heroCard: {
    borderRadius: 34,
    borderWidth: 1,
    borderColor: SERVICE_WIZARD_THEME.colors.border,
    backgroundColor: CARD_BLACK,
    padding: spacing.lg,
    gap: spacing.md,
  },
  heroTitle: {
    color: SERVICE_WIZARD_THEME.colors.textPrimary,
    ...SERVICE_WIZARD_THEME.typography.heroTitle,
  },
  heroText: {
    color: SERVICE_WIZARD_THEME.colors.textMuted,
    ...SERVICE_WIZARD_THEME.typography.bodyText,
    maxWidth: 320,
  },
  uploadSquarePressable: {
    width: "100%",
  },
  uploadSquare: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: SERVICE_WIZARD_THEME.colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  plusOrb: {
    width: 82,
    height: 82,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadCopy: {
    alignItems: "center",
    gap: spacing.sm,
  },
  uploadTitle: {
    color: "#ffffff",
    fontSize: 19,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
  },
  uploadText: {
    color: "#a1a1aa",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "left",
  },
  secondaryButton: {
    minHeight: 56,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.03)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  secondaryText: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
  },
  notesCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: SERVICE_WIZARD_THEME.colors.border,
    backgroundColor: CARD_BLACK_SOFT,
    padding: spacing.md,
    gap: spacing.sm,
  },
  notesTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
  },
  notesText: {
    color: "#a1a1aa",
    fontSize: 14,
    lineHeight: 22,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  stepTitle: {
    color: SERVICE_WIZARD_THEME.colors.textPrimary,
    ...SERVICE_WIZARD_THEME.typography.sectionTitle,
  },
  stepText: {
    color: SERVICE_WIZARD_THEME.colors.textMuted,
    ...SERVICE_WIZARD_THEME.typography.compactBodyText,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  maskScreen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  maskBackButton: {
    position: "absolute",
    left: 24,
    zIndex: 4,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  maskHeaderTitle: {
    position: "absolute",
    left: 72,
    right: 144,
    zIndex: 4,
    color: "#0A0A0A",
    fontSize: 20,
    lineHeight: 24,
    ...fonts.bold,
  },
  maskCloseButton: {
    position: "absolute",
    right: 40,
    zIndex: 4,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  maskCanvasWrap: {
    alignItems: "center",
  },
  maskCanvasFrame: {
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#050505",
  },
  maskCursor: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1.5,
  },
  maskToolBar: {
    marginTop: 40,
    height: 56,
  },
  maskToolButton: {
    position: "absolute",
    top: 0,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E3E3E3",
    backgroundColor: "#FFFFFF",
  },
  maskToolButtonActive: {
    borderColor: MASK_ACCENT,
    backgroundColor: MASK_ACCENT,
  },
  maskToolButtonDisabled: {
    borderColor: "#ECECEC",
    backgroundColor: "#F4F4F4",
  },
  maskHistoryButton: {
    top: 4,
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  maskSliderSection: {
    marginTop: 36,
    marginHorizontal: 24,
    gap: 16,
  },
  maskSliderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  maskSliderLabel: {
    color: "#0A0A0A",
    fontSize: 16,
    lineHeight: 20,
    ...fonts.bold,
  },
  maskSliderValueWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  maskSliderPreview: {
    borderRadius: 999,
    borderWidth: 1.5,
  },
  maskSliderValue: {
    color: "#6A6A6A",
    fontSize: 13,
    lineHeight: 16,
    ...fonts.semibold,
  },
  maskSliderWrap: {
    height: 36,
    justifyContent: "center",
  },
  maskSliderTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "#E5E5E5",
  },
  maskSliderFill: {
    position: "absolute",
    left: 0,
    height: 6,
    borderRadius: 999,
  },
  maskSliderThumb: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: MASK_ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  maskSliderThumbDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },
  maskContinueButton: {
    position: "absolute",
    left: 24,
    right: 24,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  maskContinueText: {
    fontSize: 16,
    lineHeight: 20,
    ...fonts.semibold,
  },
  canvasFrame: {
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#020203",
    overflow: "hidden",
    zIndex: 0,
  },
  canvasToolbar: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    flexDirection: "row",
    gap: spacing.sm,
  },
  canvasToolbarButton: {
    minHeight: 40,
    flex: 1,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(10,10,12,0.82)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  canvasToolbarText: {
    color: "#ffffff",
    fontSize: 11,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
    flexShrink: 1,
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  loupe: {
    position: "absolute",
    width: 116,
    height: 116,
    borderRadius: 999,
    padding: spacing.xs,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    shadowColor: "#000000",
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  loupeInner: {
    flex: 1,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#060607",
  },
  hintPill: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.62)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  hintText: {
    color: "#ffffff",
    fontSize: 12,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "600",
    textAlign: "left",
  },
  detectOverlay: {
    ...absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  detectPulse: {
    position: "absolute",
    width: 230,
    height: 230,
    borderRadius: 999,
    backgroundColor: "rgba(255,59,48,0.18)",
  },
  detectCopy: {
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  detectTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
    textAlign: "left",
  },
  detectText: {
    color: "#d4d4d8",
    fontSize: 13,
    lineHeight: 21,
    textAlign: "left",
    maxWidth: 280,
  },
  maskControlCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: CARD_BLACK_SOFT,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  brushRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brushTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
  },
  brushMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  brushMetaText: {
    color: "#d4d4d8",
    fontSize: 12,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
  },
  sliderWrap: {
    height: 32,
    justifyContent: "center",
  },
  sliderTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  sliderFill: {
    position: "absolute",
    left: 0,
    height: 5,
    borderRadius: 999,
  },
  sliderThumb: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: MASK_ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  sliderThumbDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonLarge: {
    minHeight: 58,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  disabledButtonLarge: {
    minHeight: 58,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SERVICE_WIZARD_THEME.colors.disabledSurface,
    opacity: 0.5,
  },
  primaryText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "800",
    letterSpacing: -0.2,
    textAlign: "left",
  },
  disabledButtonText: {
    color: "#9ca3af",
    fontSize: 16,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "800",
    letterSpacing: -0.2,
    textAlign: "left",
  },
  roomReferenceFrame: {
    height: 120,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#020203",
    overflow: "hidden",
  },
  roomReferenceBadge: {
    position: "absolute",
    left: 12,
    top: 12,
    minHeight: 28,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
  },
  roomReferenceBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  selectionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  selectionCard: {
    borderRadius: 30,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: CARD_BLACK_SOFT,
  },
  selectionCardActive: {
    borderColor: SERVICE_WIZARD_THEME.colors.accent,
    backgroundColor: SERVICE_WIZARD_THEME.colors.accentSurface,
  },
  selectionPreview: {
    aspectRatio: 1,
    backgroundColor: "#101012",
  },
  selectionSample: {
    flex: 1,
  },
  selectionOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
  },
  selectionCopy: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
  },
  selectionTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "800",
  },
  selectionDescription: {
    color: "#d4d4d8",
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  selectionDescriptionActive: {
    color: SERVICE_WIZARD_THEME.colors.accentText,
  },
  paletteCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: CARD_BLACK_SOFT,
    padding: spacing.md,
    gap: spacing.md,
  },
  paletteTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
  },
  swatchGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  swatchButton: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  swatchOuter: {
    width: 84,
    height: 84,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  swatchOuterActive: {
    borderColor: SERVICE_WIZARD_THEME.colors.accent,
    backgroundColor: SERVICE_WIZARD_THEME.colors.accentSurface,
    shadowColor: SERVICE_WIZARD_THEME.colors.accent,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  swatchInner: {
    width: 64,
    height: 64,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.82)",
  },
  swatchLabel: {
    color: "#d4d4d8",
    fontSize: 13,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "600",
    textAlign: "left",
  },
  swatchLabelActive: {
    color: "#ffffff",
  },
  finishSummaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  summaryCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: CARD_BLACK_SOFT,
    padding: spacing.md,
    gap: spacing.sm,
  },
  summarySwatch: {
    width: 54,
    height: 54,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.7)",
  },
  finishSelectionThumb: {
    width: 72,
    height: 72,
    borderRadius: 22,
  },
  summaryCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  summaryLabel: {
    color: "#a1a1aa",
    fontSize: 12,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  summaryTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  summaryText: {
    color: "#a1a1aa",
    fontSize: 14,
    lineHeight: 22,
  },
  finishCard: {
    minHeight: 94,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: CARD_BLACK_SOFT,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  finishCardActive: {
    borderColor: "rgba(217,70,239,0.42)",
    backgroundColor: "rgba(217,70,239,0.08)",
  },
  finishPreviewBase: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#1A1138",
  },
  finishPreviewMatte: {
    backgroundColor: "#7C5BE7",
  },
  finishPreviewSatinGlow: {
    position: "absolute",
    top: 7,
    left: 8,
    right: 8,
    height: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  finishPreviewGlossyHighlight: {
    position: "absolute",
    top: 4,
    left: 5,
    width: 24,
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.72)",
    transform: [{ rotate: "-18deg" }],
  },
  finishPreviewGlossyReflection: {
    position: "absolute",
    right: -2,
    bottom: 2,
    width: 26,
    height: 18,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    transform: [{ rotate: "-24deg" }],
  },
  finishCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  finishTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
  },
  finishTitleActive: {
    color: "#ffffff",
  },
  finishText: {
    color: "#a1a1aa",
    fontSize: 13,
    lineHeight: 21,
  },
  finishCheck: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: MASK_ACCENT,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  finishCheckActive: {
    borderColor: MASK_ACCENT,
    backgroundColor: MASK_ACCENT,
  },
  finishList: {
    gap: spacing.sm,
  },
  processingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  processingGlow: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: "rgba(217,70,239,0.18)",
  },
  processingFrame: {
    width: 220,
    height: 260,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.03)",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  processingImage: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
  },
  processingScrim: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.42)",
  },
  processingScan: {
    position: "absolute",
    left: 10,
    right: 10,
    height: 72,
    borderRadius: 20,
    backgroundColor: "rgba(217,70,239,0.12)",
    borderWidth: 1,
    borderColor: "rgba(217,70,239,0.24)",
  },
  processingChip: {
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.58)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  processingChipSwatch: {
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
  },
  processingChipText: {
    color: "#ffffff",
    fontSize: 12,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
  },
  processingCopy: {
    alignItems: "center",
    gap: spacing.sm,
  },
  processingTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "800",
    letterSpacing: -0.7,
    textAlign: "left",
    maxWidth: 340,
  },
  processingText: {
    color: "#a1a1aa",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "left",
    maxWidth: 320,
  },
  resultIntro: {
    alignItems: "center",
    gap: spacing.sm,
  },
  resultHeading: {
    color: "#ffffff",
    fontSize: 28,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "800",
    letterSpacing: -0.8,
    textAlign: "left",
  },
  resultSubheading: {
    color: "#b4b4bb",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "left",
    maxWidth: 360,
  },
  resultFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  resultRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  secondaryAction: {
    minHeight: 56,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionText: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
  },
  restartButton: {
    minHeight: 56,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.03)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  restartText: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
  },
});
