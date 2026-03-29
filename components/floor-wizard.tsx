import { spacing } from "../styles/spacing";

import { useAuth } from "@clerk/expo";
import { useAction, useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AnimatePresence, MotiView } from "moti";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image as NativeImage, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle as SvgCircle, G, Path as SvgPath, Rect } from "react-native-svg";
import { captureRef } from "react-native-view-shot";
import { ChevronLeft, MoveHorizontal, RotateCcw, Sparkles, Trash2 } from "lucide-react-native";

import { GENERATION_FAILED_TOAST } from "../lib/generation-errors";
import { triggerHaptic } from "../lib/haptics";
import { uploadLocalFileToCloud } from "../lib/native-upload";
import { FLOOR_MATERIAL_OPTIONS } from "../lib/data";
import { runWithFriendlyRetry } from "../lib/generation-retry";
import {
  GUEST_TESTING_STARTER_CREDITS,
  isGuestWizardTestingSession,
  resolveGuestWizardViewerId,
} from "../lib/guest-testing";
import { SERVICE_WIZARD_THEME } from "../lib/service-wizard-theme";
import { FLOOR_WIZARD_EXAMPLE_PHOTOS } from "../lib/wizard-example-photos";
import { LuxPressable } from "./lux-pressable";
import { ServiceContinueButton } from "./service-continue-button";
import { ServiceProcessingScreen } from "./service-processing-screen";
import { ServiceWizardHeader } from "./service-wizard-header";
import {
  ServiceIntakeStep,
  ServiceSelectionCard,
  ServiceSelectionGrid,
  ServiceWizardStepScreen,
  type ServiceExamplePhoto,
} from "./service-wizard-shared";
import { useProSuccess } from "./pro-success-context";
import { useMaskDrawing } from "./use-mask-drawing";
import { useViewerSession } from "./viewer-session-context";

type WizardStep = "intake" | "mask" | "materials" | "processing" | "result";
type SelectedImage = { uri: string; photoUri?: string | null; width: number; height: number };
type MeResponse = { credits: number };
type ArchiveGeneration = { _id: string; imageUrl?: string | null; status?: "processing" | "ready" | "failed"; errorMessage?: string | null };

type FloorWizardProps = {
  onProcessingStateChange?: (isProcessing: boolean) => void;
};

const pointerClassName = "cursor-pointer";
const MASK_COLOR = "#7C3AED80";
const MASK_ACCENT = "#7C3AED";
const MIN_BRUSH = 10;
const MAX_BRUSH = 54;
const DETECT_MS = 1500;
const FIXED_FOOTER_OFFSET = 96;
const LOUPE_SIZE = 116;
const LOUPE_ZOOM = 1.8;
const absoluteFill = { position: "absolute" as const, top: 0, right: 0, bottom: 0, left: 0 };
const AUTO_DETECT_SUCCESS_MESSAGE = "Floor detected - brush to refine if needed";
const AUTO_DETECT_FAILURE_MESSAGE = "Auto-detect couldn't run — please brush manually.";
const CANCELLED_GENERATION_MESSAGE = "Cancelled by user.";
const CANCEL_SUCCESS_TOAST = "Generation canceled. Your credit was kept.";

function simplifyRatio(width: number, height: number) {
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  if (w === h) return "1:1";
  const reduced = `${w / gcd(w, h)}:${h / gcd(w, h)}`;
  if (w > h) return reduced.startsWith("4:3") ? "4:3" : "16:9";
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
  console.log("[FloorWizard] Auto-detect failed", { message });
}

export function FloorWizard({ onProcessingStateChange }: FloorWizardProps) {
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
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [awaitingAuth, setAwaitingAuth] = useState(false);
  const [comparisonPosition, setComparisonPosition] = useState(0.52);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [detectedSourceStorageId, setDetectedSourceStorageId] = useState<string | null>(null);
  const [isCancellingGeneration, setIsCancellingGeneration] = useState(false);
  const [loadingContinueStep, setLoadingContinueStep] = useState<"intake" | "mask" | "materials" | null>(null);
  const initialSelectionAppliedRef = useRef(false);

  const detectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const continueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sourceCaptureRef = useRef<View>(null);
  const maskCaptureRef = useRef<View>(null);

  const {
    strokes,
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
    replaceMaskWithRegions,
    resetMaskDrawing,
    drawGesture,
    sliderGesture,
    loupeMetrics,
  } = useMaskDrawing({
    disabled: isDetecting || isAutoDetecting,
    initialBrushWidth: 24,
    minBrushWidth: MIN_BRUSH,
    maxBrushWidth: MAX_BRUSH,
    loupeSize: LOUPE_SIZE,
    loupeZoom: LOUPE_ZOOM,
  });

  const selectedMaterial = useMemo(
    () => FLOOR_MATERIAL_OPTIONS.find((material) => material.id === selectedMaterialId) ?? null,
    [selectedMaterialId],
  );
  const availableCredits = viewerReady ? me?.credits ?? GUEST_TESTING_STARTER_CREDITS : GUEST_TESTING_STARTER_CREDITS;
  const currentStepNumber =
    step === "intake" ? 1 : step === "mask" ? 2 : step === "materials" ? 3 : 4;
  const intakeHeading = selectedImage ? "Photo added — mark the floor area next." : "Add a Photo of your Floor";
  const intakeSubtext = selectedImage
    ? "Your photo is locked in. Next, brush the floor plane so the material restyle lands cleanly around furniture, rugs, and walls."
    : "Upload a room photo to map new materials.";
  const canContinueFromMask = hasMask && !isDetecting && !isAutoDetecting;
  const aspectRatio = useMemo(() => {
    if (!selectedImage) return 1.15;
    const r = selectedImage.width / Math.max(selectedImage.height, 1);
    return Math.max(0.78, Math.min(r, 1.55));
  }, [selectedImage]);
  const materialCardWidth = Math.max((width - 46) / 2, 154);
  const resultFrameWidth = Math.max(width - 32, 320);
  const canContinueFromMaterials = Boolean(selectedImage && hasMask && selectedMaterial && !isGenerating);
  const maskPreviewHeight = Math.min((width - 32) / Math.max(aspectRatio, 0.72), Math.max(height * 0.4, 248));

  useEffect(() => () => {
    if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
    if (continueTimerRef.current) clearTimeout(continueTimerRef.current);
  }, []);

  useEffect(() => {
    if (initialSelectionAppliedRef.current) {
      return;
    }

    if (typeof presetStyle === "string") {
      const normalized = presetStyle.trim().toLowerCase();
      const matched = FLOOR_MATERIAL_OPTIONS.find((material) => material.title.toLowerCase() === normalized);
      if (matched) {
        setSelectedMaterialId(matched.id);
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
      setComparisonPosition(0.52);
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
      setStep("materials");
      showToast(GENERATION_FAILED_TOAST);
    }
  }, [effectiveSignedIn, generationArchive, generationId, router, showToast]);

  const resetDetection = useCallback(() => {
    if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
    setIsDetecting(true);
    detectTimerRef.current = setTimeout(() => setIsDetecting(false), DETECT_MS);
  }, []);

  const resetProject = useCallback(() => {
    setStep("intake");
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
      const matched = FLOOR_MATERIAL_OPTIONS.find((material) => material.title.toLowerCase() === normalized);
      setSelectedMaterialId(matched?.id ?? null);
      return;
    }
    setSelectedMaterialId(null);
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

  const uploadBlobToStorage = useCallback(async (uri: string) => {
    const uploadUrl = (await createSourceUploadUrl(viewerArgs)) as string;
    return await uploadLocalFileToCloud(uploadUrl, uri, {
      fallbackMimeType: "image/png",
      errorLabel: "selected floor image",
    });
  }, [createSourceUploadUrl, viewerArgs]);

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

  const applySelectedImage = useCallback((nextImage: SelectedImage) => {
    setSelectedImage(nextImage);
    setGeneratedImageUrl(null);
    setGenerationId(null);
    setDetectedSourceStorageId(null);
    setIsAutoDetecting(false);
    setIsCancellingGeneration(false);
    resetMaskDrawing({ resetBrush: true });
  }, [resetMaskDrawing]);

  const handleContinueFromIntake = useCallback(() => {
    if (!selectedImage) {
      return;
    }
    triggerHaptic();
    setStep("mask");
    resetDetection();
  }, [resetDetection, selectedImage]);

  const runDeferredContinue = useCallback(
    (key: "intake" | "mask", action: () => void) => {
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

  const runAsyncContinue = useCallback(
    async (key: "materials", action: () => Promise<void>) => {
      if (loadingContinueStep) return;
      setLoadingContinueStep(key);

      try {
        await new Promise((resolve) => {
          continueTimerRef.current = setTimeout(() => {
            continueTimerRef.current = null;
            resolve(undefined);
          }, 140);
        });
        await action();
      } finally {
        setLoadingContinueStep(null);
      }
    },
    [loadingContinueStep],
  );

  const handleClearSelectedImage = useCallback(() => {
    triggerHaptic();
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
        target: "floor",
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
            mapDetectionPointToCanvas(point, selectedImage, canvasSize, "cover"),
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

  const handleSelectMedia = useCallback(async (source: "camera" | "library") => {
    try {
      const permission = source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(source === "camera" ? "Camera access needed" : "Photo access needed", source === "camera" ? "Please enable camera access to capture a floor photo." : "Please enable photo library access to upload a floor photo.");
        return;
      }
      const result = source === "camera"
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      applySelectedImage({ uri: asset.uri, photoUri: asset.uri, width: asset.width ?? 1080, height: asset.height ?? 1440 });
    } catch (error) {
      Alert.alert("Unable to open media", error instanceof Error ? error.message : "Please try again.");
    }
  }, [applySelectedImage]);

  const handleSelectExample = useCallback((example: ServiceExamplePhoto) => {
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
  }, [applySelectedImage]);

  const updateComparisonSlider = useCallback((x: number) => {
    const ratio = Math.max(0.05, Math.min(x / resultFrameWidth, 0.95));
    setComparisonPosition(ratio);
  }, [resultFrameWidth]);

  const comparisonGesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .onBegin((event) => updateComparisonSlider(event.x))
        .onUpdate((event) => updateComparisonSlider(event.x)),
    [updateComparisonSlider],
  );

  const handleGenerate = useCallback(async () => {
    if (!viewerReady) {
      Alert.alert("Preparing your session", "Your guest profile is still loading. Please try again in a moment.");
      return;
    }

    if (!selectedImage || !hasMask || !sourceCaptureRef.current || !maskCaptureRef.current) {
      Alert.alert("Mark the floor first", "Brush over the floor area you want to restyle before continuing.");
      return;
    }
    if (!selectedMaterial) {
      Alert.alert("Pick a material", "Choose a flooring material before continuing.");
      return;
    }
    if (availableCredits <= 0) {
      if (!effectiveSignedIn) {
        setAwaitingAuth(true);
        router.push({ pathname: "/sign-in", params: { returnTo: "/workspace?service=floor" } });
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
          const [sourceUri, maskUri] = await Promise.all([
            captureRef(sourceCaptureRef, { format: "png", quality: 1, result: "tmpfile" }),
            captureRef(maskCaptureRef, { format: "png", quality: 1, result: "tmpfile" }),
          ]);
          const [sourceStorageId, maskStorageId] = await Promise.all([
            uploadBlobToStorage(sourceUri),
            uploadBlobToStorage(maskUri),
          ]);
          return (await startGeneration({
            anonymousId: viewerId,
            imageStorageId: sourceStorageId,
            maskStorageId,
            serviceType: "floor",
            selection: selectedMaterial.promptLabel,
            roomType: "Room",
            displayStyle: `${selectedMaterial.title} Floor`,
            customPrompt: "Preserve perspective, lighting, furniture placement, baseboards, wall lines, reflections, and every unmasked detail exactly.",
            aspectRatio: simplifyRatio(selectedImage.width, selectedImage.height),
          })) as { generationId: string };
        },
        showToast,
      )) as { generationId: string };
      setGenerationId(result.generationId);
    } catch (error) {
      setIsGenerating(false);
      setStep("materials");
      const rawMessage = error instanceof Error ? error.message : "Please try again.";
      if (rawMessage === "Payment Required") {
        if (!effectiveSignedIn) {
          setAwaitingAuth(true);
          router.push({ pathname: "/sign-in", params: { returnTo: "/workspace?service=floor" } });
          return;
        }
        router.push("/paywall");
        return;
      }
      showToast(GENERATION_FAILED_TOAST);
    }
  }, [availableCredits, effectiveSignedIn, hasMask, router, selectedImage, selectedMaterial, showToast, startGeneration, uploadBlobToStorage, viewerId, viewerReady]);

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
      setStep("materials");
      showToast(CANCEL_SUCCESS_TOAST);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to cancel right now.");
    } finally {
      setIsCancellingGeneration(false);
    }
  }, [cancelGeneration, generationId, isCancellingGeneration, showToast, viewerId]);

  useEffect(() => {
    if (!awaitingAuth || !effectiveSignedIn || !viewerReady || !selectedImage || !hasMask) {
      return;
    }

    setAwaitingAuth(false);
    const timer = setTimeout(() => {
      void handleGenerate();
    }, 300);
    return () => clearTimeout(timer);
  }, [awaitingAuth, effectiveSignedIn, handleGenerate, hasMask, selectedImage, viewerReady]);

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
    if (step === "materials") return setStep("mask");
    if (step === "processing") return setStep("materials");
    if (step === "result") return setStep("materials");
  }, [step]);

  return (
    <View style={styles.screen}>
      {selectedImage && canvasSize.width > 0 && canvasSize.height > 0 ? (
        <View pointerEvents="none" style={styles.captureStage}>
          <View ref={sourceCaptureRef} collapsable={false} style={{ width: canvasSize.width, height: canvasSize.height, backgroundColor: "#000000" }}>
            <Image source={{ uri: selectedImage.uri }} style={styles.photoImage} contentFit="cover" />
          </View>
          <View ref={maskCaptureRef} collapsable={false} style={{ marginTop: spacing.sm, width: canvasSize.width, height: canvasSize.height, backgroundColor: "#000000" }}>
            <Svg width={canvasSize.width} height={canvasSize.height}>
              <Rect x={0} y={0} width={canvasSize.width} height={canvasSize.height} fill="#000000" />
              {renderedStrokes.map((stroke) => (
                <SvgPath
                  key={`mask-${stroke.id}`}
                  d={stroke.path}
                  stroke={stroke.kind === "region" ? "none" : "#FFFFFF"}
                  strokeWidth={stroke.kind === "region" ? 0 : stroke.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill={stroke.kind === "region" ? "#FFFFFF" : "none"}
                />
              ))}
            </Svg>
          </View>
        </View>
      ) : null}

      {step !== "processing" ? (
        <ServiceWizardHeader
          title="Floor Restyle"
          step={currentStepNumber}
          canGoBack={currentStepNumber > 1}
          onBack={handleBack}
          onClose={handleClose}
        />
      ) : null}

      {step === "intake" ? (
        <ServiceWizardStepScreen
          footerOffset={FIXED_FOOTER_OFFSET}
          contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}
          footer={
            <ServiceContinueButton
              active={Boolean(selectedImage)}
              attention={Boolean(selectedImage)}
              label={selectedImage ? "Continue \u2192" : "Add a Photo to Start"}
              loading={loadingContinueStep === "intake"}
              onPress={() => {
                if (!selectedImage) {
                  return;
                }

                runDeferredContinue("intake", handleContinueFromIntake);
              }}
              secondaryActionLabel={selectedImage ? null : "or use camera"}
              onSecondaryAction={
                selectedImage
                  ? null
                  : () => {
                      void handleSelectMedia("camera");
                    }
              }
            />
          }
        >
          <View>
            <ServiceIntakeStep
              heading={intakeHeading}
              subtext={intakeSubtext}
              examples={FLOOR_WIZARD_EXAMPLE_PHOTOS}
              selectedImageUri={selectedImage?.uri ?? null}
              onClearSelection={handleClearSelectedImage}
              onUploadPress={() => {
                void handleSelectMedia("library");
              }}
              onCameraPress={() => {
                void handleSelectMedia("camera");
              }}
              onExamplePress={handleSelectExample}
            />
          </View>
        </ServiceWizardStepScreen>
      ) : null}

      {step === "mask" ? (
        <ServiceWizardStepScreen
          footerOffset={FIXED_FOOTER_OFFSET}
          scrollEnabled={!isDrawing}
          contentContainerStyle={{
            paddingHorizontal: spacing.md,
            paddingTop: spacing.sm,
            gap: spacing.md,
          }}
          footer={
            <>
              <View style={styles.maskControlCard}>
                <View style={styles.brushRow}>
                  <Text style={styles.brushTitle}>Brush Size</Text>
                  <View style={styles.brushMeta}>
                    <View style={{ width: Math.max(brushWidth, 14), height: Math.max(brushWidth, 14), borderRadius: 999, backgroundColor: MASK_ACCENT, borderWidth: 1, borderColor: "rgba(255,255,255,0.22)" }} />
                    <Text style={styles.brushMetaText}>{brushWidth}px</Text>
                  </View>
                </View>
                <GestureDetector gesture={sliderGesture}>
                  <View onLayout={(event) => setSliderWidth(event.nativeEvent.layout.width)} style={styles.sliderWrap}>
                    <View style={styles.sliderTrack} />
                    <LinearGradient colors={[MASK_ACCENT, MASK_ACCENT]} style={[styles.sliderFill, { width: Math.max(14, sliderWidth * brushProgress) }]} />
                    <View style={[styles.sliderThumb, { left: Math.max(0, sliderWidth * brushProgress - 16) }]}>
                      <View style={styles.sliderThumbDot} />
                    </View>
                  </View>
                </GestureDetector>
              </View>
              <ServiceContinueButton
                active={canContinueFromMask}
                label={canContinueFromMask ? "Continue \u2192" : "Brush the Area to Continue"}
                loading={loadingContinueStep === "mask"}
                onPress={() => {
                  if (!canContinueFromMask) {
                    return;
                  }

                  runDeferredContinue("mask", () => {
                    triggerHaptic();
                    setStep("materials");
                  });
                }}
              />
            </>
          }
        >
          <View>
            <Text style={styles.stepTitle}>Mark Area</Text>
            <Text style={styles.stepText}>Brush directly over the visible floor. Keep walls, furniture, and built-ins untouched so the restyle stays precise.</Text>
            <View onLayout={handleCanvasLayout} style={[styles.frame, { height: maskPreviewHeight }]}>
              {selectedImage ? (
                <>
                  <Image source={{ uri: selectedImage.uri }} style={styles.photoImage} contentFit="cover" transition={160} />
                  <GestureDetector gesture={drawGesture}>
                    <View style={absoluteFill}>
                      <Svg width="100%" height="100%">
                        {renderedStrokes.map((stroke) => (
                          <SvgPath
                            key={stroke.id}
                            d={stroke.path}
                            stroke={stroke.kind === "region" ? "none" : MASK_COLOR}
                            strokeWidth={stroke.kind === "region" ? 0 : stroke.width}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill={stroke.kind === "region" ? MASK_COLOR : "none"}
                          />
                        ))}
                      </Svg>
                    </View>
                  </GestureDetector>
                  {activePoint ? <View pointerEvents="none" style={{ position: "absolute", left: Math.max(14, Math.min(activePoint.x - brushWidth * 0.5, Math.max(canvasSize.width - brushWidth - 14, 14))), top: Math.max(14, Math.min(activePoint.y - brushWidth * 0.5, Math.max(canvasSize.height - brushWidth - 14, 14))), width: brushWidth, height: brushWidth, borderRadius: 999, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.78)", backgroundColor: MASK_COLOR }} /> : null}
                  {selectedImage && loupeMetrics ? (
                    <View pointerEvents="none" style={[styles.loupe, { left: loupeMetrics.left, top: loupeMetrics.top, width: loupeMetrics.size, height: loupeMetrics.size }]}>
                      <View style={styles.loupeInner}>
                        <Image source={{ uri: selectedImage.uri }} style={{ position: "absolute", width: canvasSize.width * loupeMetrics.zoom, height: canvasSize.height * loupeMetrics.zoom, left: loupeMetrics.translateX, top: loupeMetrics.translateY }} contentFit="cover" />
                        <Svg width={loupeMetrics.size} height={loupeMetrics.size} style={absoluteFill}>
                          <G transform={`translate(${loupeMetrics.translateX} ${loupeMetrics.translateY}) scale(${loupeMetrics.zoom})`}>
                            {renderedStrokes.map((stroke) => (
                              <SvgPath
                                key={`loupe-${stroke.id}`}
                                d={stroke.path}
                                stroke={stroke.kind === "region" ? "none" : MASK_COLOR}
                                strokeWidth={stroke.kind === "region" ? 0 : stroke.width}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                fill={stroke.kind === "region" ? MASK_COLOR : "none"}
                              />
                            ))}
                          </G>
                          <SvgCircle cx={loupeMetrics.size / 2} cy={loupeMetrics.size / 2} r={8} fill="none" stroke="#ffffff" strokeWidth={1.5} />
                          <SvgPath d={`M ${loupeMetrics.size / 2 - 14} ${loupeMetrics.size / 2} L ${loupeMetrics.size / 2 + 14} ${loupeMetrics.size / 2}`} stroke="#ffffff" strokeWidth={1} />
                          <SvgPath d={`M ${loupeMetrics.size / 2} ${loupeMetrics.size / 2 - 14} L ${loupeMetrics.size / 2} ${loupeMetrics.size / 2 + 14}`} stroke="#ffffff" strokeWidth={1} />
                        </Svg>
                      </View>
                    </View>
                  ) : null}
                  <View pointerEvents="box-none" style={styles.canvasToolbar}>
                    <LuxPressable
                      onPress={() => {
                        void handleAutoDetectMask();
                      }}
                      disabled={isAutoDetecting || isDetecting}
                      className={pointerClassName}
                      style={styles.canvasToolbarButton}
                      glowColor="rgba(255,255,255,0.04)"
                      scale={0.98}
                    >
                      {isAutoDetecting ? <ActivityIndicator color="#ffffff" size="small" /> : <Sparkles color="#ffffff" size={16} />}
                      <Text style={styles.canvasToolbarText}>Auto-Detect</Text>
                    </LuxPressable>
                    <LuxPressable onPress={undoLastStroke} disabled={!strokes.length} className={pointerClassName} style={styles.canvasToolbarButton} glowColor="rgba(255,255,255,0.04)" scale={0.98}><RotateCcw color="#ffffff" size={16} /><Text style={styles.canvasToolbarText}>Undo</Text></LuxPressable>
                    <LuxPressable onPress={clearMask} disabled={!strokes.length} className={pointerClassName} style={styles.canvasToolbarButton} glowColor="rgba(255,255,255,0.04)" scale={0.98}><Trash2 color="#ffffff" size={16} /><Text style={styles.canvasToolbarText}>Clear All</Text></LuxPressable>
                  </View>
                  <View pointerEvents="none" style={styles.hintPill}><Text style={styles.hintText}>Brush only the floor plane. The loupe follows your finger for cleaner edges.</Text></View>
                  <AnimatePresence>{isDetecting || isAutoDetecting ? <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={styles.detectOverlay}><MotiView animate={{ scale: [0.92, 1.08, 0.92], opacity: [0.16, 0.52, 0.16] }} transition={{ duration: 1800, loop: true }} style={styles.detectPulse} /><View style={styles.detectCopy}><ActivityIndicator color="#ffffff" /><Text style={styles.detectTitle}>{isAutoDetecting ? "Auto-detecting floors..." : "Preparing the floor plane..."}</Text><Text style={styles.detectText}>{isAutoDetecting ? "Darkor.ai is tracing the visible floor surface while leaving walls, rugs, and furniture untouched." : "Setting up a precise masking surface so the material map stays clean around furniture and edges."}</Text></View></MotiView> : null}</AnimatePresence>
                </>
              ) : null}
            </View>
          </View>
        </ServiceWizardStepScreen>
      ) : null}

      {step === "materials" ? (
        <ServiceWizardStepScreen
          footerOffset={FIXED_FOOTER_OFFSET}
          contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.md }}
          footer={
            <ServiceContinueButton
              active={canContinueFromMaterials}
              label={selectedMaterial ? "Generate My Design \u2192" : "Select a Material"}
              loading={loadingContinueStep === "materials"}
              onPress={async () => {
                if (!canContinueFromMaterials) {
                  return;
                }

                await runAsyncContinue("materials", handleGenerate);
              }}
              pulse={canContinueFromMaterials}
              supportingText={`Uses 1 credit \u00b7 ${Math.max(availableCredits - 1, 0)} remaining`}
            />
          }
        >
          <View>
            <Text style={styles.stepTitle}>Select Material</Text>
            <Text style={styles.stepText}>Select a premium material curated to read as photoreal, perspective-aware, and listing-ready.</Text>
            <ServiceSelectionGrid>
              {FLOOR_MATERIAL_OPTIONS.map((option) => (
                <ServiceSelectionCard
                  key={option.id}
                  title={option.title}
                  description={option.description}
                  image={option.image}
                  active={option.id === selectedMaterial?.id}
                  width={materialCardWidth}
                  onPress={() => {
                    setSelectedMaterialId(option.id);
                    triggerHaptic();
                  }}
                />
              ))}
            </ServiceSelectionGrid>
            <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Selected Material</Text><Text style={styles.summaryTitle}>{selectedMaterial?.title ?? "No material selected"}</Text><Text style={styles.summaryText}>{selectedMaterial?.description ?? "Select a flooring material to unlock the AI restyle."}</Text></View>
          </View>
        </ServiceWizardStepScreen>
      ) : null}

      {step === "processing" ? (
        <ServiceProcessingScreen
          imageUri={selectedImage?.uri ?? null}
          subtitlePhrases={[
            "Analyzing your room geometry...",
            `Applying ${selectedMaterial?.title ?? "your selected material"}...`,
            "Rendering final lighting...",
          ]}
          onCancel={() => {
            void handleCancelGeneration();
          }}
          cancelDisabled={!generationId || isCancellingGeneration}
        />
      ) : null}

      {step === "result" ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: Math.max(insets.bottom + 28, 34), gap: spacing.md }} showsVerticalScrollIndicator={false}>
          <View style={styles.resultIntro}>
            <Text style={styles.resultHeading}>Behold your new interior</Text>
            <Text style={styles.resultSubheading}>
              A material-led floor transformation designed to stay true to the room's perspective, furnishings, and natural light.
            </Text>
          </View>
          <View style={styles.resultFrame}>
            {selectedImage && generatedImageUrl ? (
              <View style={{ width: resultFrameWidth, aspectRatio, alignSelf: "center" }}>
                <Image source={{ uri: selectedImage.uri }} style={styles.photoImage} contentFit="cover" />
                <View style={[absoluteFill, { width: `${comparisonPosition * 100}%`, overflow: "hidden" }]}><Image source={{ uri: generatedImageUrl }} style={{ width: resultFrameWidth, height: "100%" }} contentFit="cover" /></View>
                <GestureDetector gesture={comparisonGesture}><View style={{ position: "absolute", top: 0, bottom: 0, left: `${comparisonPosition * 100}%`, marginLeft: -26, width: 52, alignItems: "center", justifyContent: "center" }}><View style={styles.resultDivider} /><View style={styles.resultHandle}><MoveHorizontal color="#ffffff" size={18} /></View></View></GestureDetector>
                <View style={[styles.badge, { left: 14 }]}><Text style={styles.badgeText}>Before</Text></View>
                <View style={[styles.badge, { right: 14 }]}><Text style={styles.badgeText}>After</Text></View>
              </View>
            ) : <View style={styles.resultFallback}><ActivityIndicator color="#ffffff" /></View>}
          </View>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Material Applied</Text><Text style={styles.summaryTitle}>{selectedMaterial?.title ?? "Material"}</Text><Text style={styles.summaryText}>Your floor has been restyled while preserving room geometry, furniture alignment, and natural light behavior.</Text></View>
          <View style={styles.resultRow}><LuxPressable onPress={() => setStep("mask")} className={pointerClassName} style={{ flex: 1 }} glowColor="rgba(255,255,255,0.04)" scale={0.99}><View style={styles.secondaryAction}><Text style={styles.secondaryActionText}>Refine Mask</Text></View></LuxPressable><LuxPressable onPress={() => setStep("materials")} className={pointerClassName} style={{ flex: 1 }} glowColor="rgba(255,255,255,0.04)" scale={0.99}><View style={styles.secondaryAction}><Text style={styles.secondaryActionText}>Change Material</Text></View></LuxPressable></View>
          <LuxPressable onPress={resetProject} className={pointerClassName} style={{ width: "100%" }} glowColor="rgba(255,255,255,0.04)" scale={0.99}><View style={styles.restartButton}><ChevronLeft color="#ffffff" size={16} /><Text style={styles.restartText}>Start New Floor</Text></View></LuxPressable>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SERVICE_WIZARD_THEME.colors.background },
  captureStage: { position: "absolute", left: -10000, top: 0, opacity: 0.01 },
  topBar: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  topButton: { height: 44, width: 44, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: SERVICE_WIZARD_THEME.colors.border },
  topCopy: { flex: 1, alignItems: "center", gap: spacing.xs },
  topTitle: { color: "#ffffff", fontSize: 19, fontWeight: "800", letterSpacing: -0.3 },
  topSubtitle: { color: "#a1a1aa", fontSize: 12, fontWeight: "700" },
  progressTrack: { width: "100%", maxWidth: 170, height: 8, borderRadius: 999, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.12)" },
  progressFillWrap: { height: "100%", overflow: "hidden", borderRadius: 999 },
  progressFill: { height: "100%", borderRadius: 999 },
  stepRow: { flexDirection: "row", gap: spacing.sm },
  stepPill: { height: 24, width: 24, borderRadius: 999, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" },
  stepPillActive: { borderColor: SERVICE_WIZARD_THEME.colors.accentBorderStrong, backgroundColor: SERVICE_WIZARD_THEME.colors.accentSurfaceStrong },
  stepPillText: { color: "#71717a", fontSize: 11, fontWeight: "800" },
  stepPillTextActive: { color: "#ffffff" },
  creditPill: { minWidth: 44, height: 44, paddingHorizontal: spacing.sm, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: SERVICE_WIZARD_THEME.colors.border },
  creditText: { color: "#ffffff", fontSize: 12, fontWeight: "800" },
  heroCard: { minHeight: 360, borderRadius: 34, borderWidth: 1, borderColor: SERVICE_WIZARD_THEME.colors.border, padding: spacing.lg, gap: spacing.md, backgroundColor: SERVICE_WIZARD_THEME.colors.surfaceOverlay },
  heroIcon: { height: 54, width: 54, borderRadius: 18, backgroundColor: SERVICE_WIZARD_THEME.colors.accentSurfaceStrong, alignItems: "center", justifyContent: "center" },
  heroTitle: { color: SERVICE_WIZARD_THEME.colors.textPrimary, lineHeight: 34, ...SERVICE_WIZARD_THEME.typography.heroTitle },
  heroText: { color: SERVICE_WIZARD_THEME.colors.textMuted, ...SERVICE_WIZARD_THEME.typography.compactBodyText },
  tipCard: { borderRadius: 24, borderWidth: 1, borderColor: SERVICE_WIZARD_THEME.colors.accentBorder, backgroundColor: SERVICE_WIZARD_THEME.colors.accentSurface, paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: spacing.xs },
  tipLabel: { color: SERVICE_WIZARD_THEME.colors.accentText, fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  tipText: { color: "#f4f4f5", fontSize: 13, lineHeight: 19, fontWeight: "600" },
  primaryButton: { minHeight: 58, borderRadius: 24, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  primaryButtonLarge: { minHeight: 58, borderRadius: 24, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  disabledButtonLarge: { minHeight: 58, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: SERVICE_WIZARD_THEME.colors.disabledSurface, opacity: 0.5 },
  primaryText: { color: "#ffffff", fontSize: 16, fontWeight: "800", textAlign: "left" },
  disabledButtonText: { color: "#9ca3af", fontSize: 16, fontWeight: "800", textAlign: "left" },
  secondaryButton: { minHeight: 58, borderRadius: 24, paddingHorizontal: spacing.md, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.03)" },
  secondaryText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
  content: { flex: 1, paddingHorizontal: spacing.md, gap: spacing.md },
  stepTitle: { color: SERVICE_WIZARD_THEME.colors.textPrimary, lineHeight: 34, ...SERVICE_WIZARD_THEME.typography.sectionTitle },
  stepText: { color: SERVICE_WIZARD_THEME.colors.textMuted, ...SERVICE_WIZARD_THEME.typography.compactBodyText },
  toolbarRow: { flexDirection: "row", gap: spacing.sm },
  toolbarButton: { flex: 1, height: 44, borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  toolbarText: { color: "#ffffff", fontSize: 13, fontWeight: "700" },
  frame: { width: "100%", borderRadius: 34, overflow: "hidden", borderWidth: 1, borderColor: SERVICE_WIZARD_THEME.colors.border, backgroundColor: "#000000", zIndex: 0 },
  canvasToolbar: { position: "absolute", top: 14, left: 14, right: 14, flexDirection: "row", gap: spacing.sm },
  canvasToolbarButton: { minHeight: 40, flex: 1, paddingHorizontal: spacing.md, borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(10,10,12,0.82)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  canvasToolbarText: { color: "#ffffff", fontSize: 11, fontWeight: "700", flexShrink: 1 },
  photoImage: { width: "100%", height: "100%" },
  loupe: { position: "absolute", width: 116, height: 116, borderRadius: 999, padding: spacing.xs, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", shadowColor: "#000000", shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  loupeInner: { flex: 1, borderRadius: 999, overflow: "hidden", backgroundColor: "#060607" },
  hintPill: { position: "absolute", left: 16, right: 16, bottom: 16, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.66)", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  hintText: { color: "#ffffff", fontSize: 12, fontWeight: "700", textAlign: "left" },
  detectOverlay: { ...absoluteFill, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(5,5,6,0.52)" },
  detectPulse: { position: "absolute", width: 220, height: 220, borderRadius: 999, backgroundColor: SERVICE_WIZARD_THEME.colors.accentGlowSoft },
  detectCopy: { alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg },
  detectTitle: { color: "#ffffff", fontSize: 20, fontWeight: "800", textAlign: "left" },
  detectText: { color: "#d4d4d8", fontSize: 13, lineHeight: 20, textAlign: "left", maxWidth: 270 },
  maskControlCard: { borderRadius: 22, borderWidth: 1, borderColor: SERVICE_WIZARD_THEME.colors.border, backgroundColor: "#0a0a0c", paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  brushRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brushTitle: { color: "#ffffff", fontSize: 14, fontWeight: "800" },
  brushMeta: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  brushMetaText: { color: "#d4d4d8", fontSize: 12, fontWeight: "700" },
  sliderWrap: { height: 32, justifyContent: "center" },
  sliderTrack: { height: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)" },
  sliderFill: { position: "absolute", left: 0, height: 5, borderRadius: 999 },
  sliderThumb: { position: "absolute", width: 28, height: 28, borderRadius: 999, backgroundColor: MASK_ACCENT, alignItems: "center", justifyContent: "center" },
  sliderThumbDot: { width: 12, height: 12, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.92)" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  materialCard: { borderRadius: 30, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#0a0a0c" },
  materialCardActive: { borderColor: SERVICE_WIZARD_THEME.colors.accent, backgroundColor: SERVICE_WIZARD_THEME.colors.accentSurface },
  materialPreview: { aspectRatio: 1, backgroundColor: "#101012" },
  previewOverlay: { position: "absolute", left: 0, right: 0, bottom: 0, height: 96 },
  previewCopy: { position: "absolute", left: 14, right: 14, bottom: 14 },
  materialTitle: { color: "#ffffff", fontSize: 18, fontWeight: "800" },
  materialSubtitle: { color: "#d4d4d8", fontSize: 12, lineHeight: 18, marginTop: spacing.xs },
  materialSubtitleActive: { color: SERVICE_WIZARD_THEME.colors.accentText },
  sample: { flex: 1 },
  hardwoodSample: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, gap: spacing.sm },
  tileRow: { flex: 1, flexDirection: "row", gap: spacing.xs, paddingHorizontal: spacing.sm, paddingTop: spacing.sm },
  tileBlock: { flex: 1, borderRadius: 16 },
  summaryCard: { borderRadius: 28, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#0a0a0c", padding: spacing.md, gap: spacing.sm },
  summaryLabel: { color: SERVICE_WIZARD_THEME.colors.accentText, fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  summaryTitle: { color: "#ffffff", fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  summaryText: { color: "#b4b4bb", fontSize: 14, lineHeight: 22 },
  processingScreen: { flex: 1, paddingHorizontal: spacing.lg, alignItems: "center", justifyContent: "center" },
  processingPulse: { position: "absolute", width: 250, height: 250, borderRadius: 999, backgroundColor: SERVICE_WIZARD_THEME.colors.accentGlowSoft },
  processingFrame: { width: 220, height: 280, borderRadius: 34, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#050505", alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
  processingImage: { position: "absolute", inset: 0, width: "100%", height: "100%" },
  processingScrim: { position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.42)" },
  processingBeam: { position: "absolute", left: 14, right: 14, height: 120, borderRadius: 28, backgroundColor: SERVICE_WIZARD_THEME.colors.accentSurface, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  processingCopy: { alignItems: "center", gap: spacing.sm },
  processingTitle: { color: "#ffffff", fontSize: 24, fontWeight: "800", textAlign: "left" },
  processingText: { color: "#c4c4cc", fontSize: 14, lineHeight: 22, textAlign: "left", maxWidth: 320 },
  resultIntro: { alignItems: "center", gap: spacing.sm },
  resultHeading: { color: "#ffffff", fontSize: 28, fontWeight: "800", letterSpacing: -0.8, textAlign: "left" },
  resultSubheading: { color: "#b4b4bb", fontSize: 14, lineHeight: 22, textAlign: "left", maxWidth: 360 },
  resultFrame: { borderRadius: 34, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#000000" },
  resultDivider: { position: "absolute", top: 0, bottom: 0, width: 2, backgroundColor: "rgba(255,255,255,0.92)" },
  resultHandle: { height: 46, width: 46, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.65)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)" },
  badge: { position: "absolute", top: 14, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.45)", paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  badgeText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
  resultFallback: { height: 320, alignItems: "center", justifyContent: "center" },
  resultRow: { flexDirection: "row", gap: spacing.sm },
  secondaryAction: { minHeight: 56, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.03)" },
  secondaryActionText: { color: "#ffffff", fontSize: 14, fontWeight: "700" },
  restartButton: { minHeight: 56, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.03)", flexDirection: "row", gap: spacing.sm },
  restartText: { color: "#ffffff", fontSize: 14, fontWeight: "700" },
});


