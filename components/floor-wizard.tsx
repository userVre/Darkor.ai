import { spacing } from "../styles/spacing";

import { useAuth } from "@clerk/expo";
import { useAction, useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AnimatePresence, MotiView } from "moti";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image as NativeImage, Linking, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path as SvgPath, Rect } from "react-native-svg";
import { captureRef } from "react-native-view-shot";
import { ChevronLeft, MoveHorizontal, X } from "lucide-react-native";

import { GENERATION_FAILED_TOAST } from "../lib/generation-errors";
import { canUserGenerate as canUserGenerateNow } from "../lib/generation-access";
import { triggerHaptic } from "../lib/haptics";
import { uploadLocalFileToCloud } from "../lib/native-upload";
import { FLOOR_MATERIAL_OPTIONS } from "../lib/data";
import { runWithFriendlyRetry } from "../lib/generation-retry";
import { hasGenerationImage, resolveGenerationStatus } from "../lib/generation-status";
import {
  GUEST_TESTING_STARTER_CREDITS,
  isGuestWizardTestingSession,
  resolveGuestWizardViewerId,
} from "../lib/guest-testing";
import { SERVICE_WIZARD_THEME } from "../lib/service-wizard-theme";
import { FLOOR_WIZARD_EXAMPLE_PHOTOS } from "../lib/wizard-example-photos";
import { FloorIntroScreen, type FloorIntroExamplePhoto } from "./floor-intro-screen";
import { LuxPressable } from "./lux-pressable";
import { ServiceContinueButton } from "./service-continue-button";
import { GENERATION_STATUS_MESSAGES, ServiceProcessingScreen } from "./service-processing-screen";
import { ServiceWizardHeader } from "./service-wizard-header";
import {
  ServiceSelectionCard,
  ServiceSelectionGrid,
  ServiceWizardStepScreen,
} from "./service-wizard-shared";
import { useProSuccess } from "./pro-success-context";
import { useMaskDrawing } from "./use-mask-drawing";
import { useViewerCredits } from "./viewer-credits-context";
import { useViewerSession } from "./viewer-session-context";
import { fonts } from "../styles/typography";

type WizardStep = "intake" | "mask" | "materials" | "processing" | "result";
type SelectedImage = { uri: string; photoUri?: string | null; width: number; height: number };
type MeResponse = {
  credits: number;
  imagesRemaining?: number;
  hasPaidAccess?: boolean;
  subscriptionType?: "free" | "weekly" | "yearly";
  generationStatusMessage?: string;
  canGenerateNow?: boolean;
};
type ArchiveGeneration = { _id: string; imageUrl?: string | null; status?: "processing" | "ready" | "failed"; errorMessage?: string | null };

type FloorWizardProps = {
  onProcessingStateChange?: (isProcessing: boolean) => void;
};

const pointerClassName = "cursor-pointer";
const MASK_ACCENT = "#7C3AED";
const MIN_BRUSH = 10;
const MAX_BRUSH = 54;
const DETECT_MS = 1500;
const FIXED_FOOTER_OFFSET = 96;
const MASK_SCREEN_REFERENCE_WIDTH = 456;
const MASK_SCREEN_REFERENCE_HEIGHT = 932;
const absoluteFill = { position: "absolute" as const, top: 0, right: 0, bottom: 0, left: 0 };
const AUTO_DETECT_SUCCESS_MESSAGE = "Floor masked and ready.";
const AUTO_DETECT_FAILURE_MESSAGE = "Auto-detect couldn't run — please brush manually.";
const CANCELLED_GENERATION_MESSAGE = "Cancelled by user.";
const CANCEL_SUCCESS_TOAST = "Generation canceled. Your credit was kept.";
const FLOOR_PROMPT_EXAMPLES = [
  "Lay warm natural oak planks with a matte finish while preserving the room layout and lighting.",
  "Restyle the floor in polished Carrara marble with crisp veining and premium editorial contrast.",
  "Apply a soft concrete floor with subtle texture and realistic reflections for a modern gallery feel.",
  "Introduce light travertine flooring with soft natural variation and warm afternoon light response.",
  "Design a refined herringbone walnut floor that feels luxurious, grounded, and photorealistic.",
] as const;

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
  void error;
}

function scaleMaskValue(value: number, scale: number) {
  return value * scale;
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
  const { setOptimisticCredits } = useViewerCredits();
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
  const [processingComplete, setProcessingComplete] = useState(false);
  const [awaitingAuth, setAwaitingAuth] = useState(false);
  const [comparisonPosition, setComparisonPosition] = useState(0.52);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [detectedSourceStorageId, setDetectedSourceStorageId] = useState<string | null>(null);
  const [isCancellingGeneration, setIsCancellingGeneration] = useState(false);
  const [loadingContinueStep, setLoadingContinueStep] = useState<"intake" | "mask" | "materials" | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [customPromptDraft, setCustomPromptDraft] = useState("");
  const [isCustomPromptOpen, setIsCustomPromptOpen] = useState(false);
  const initialSelectionAppliedRef = useRef(false);
  const autoMaskAttemptKeyRef = useRef<string | null>(null);

  const detectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const continueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sourceCaptureRef = useRef<View>(null);
  const maskCaptureRef = useRef<View>(null);

  const {
    renderedStrokes,
    canvasSize,
    hasMask,
    handleCanvasLayout,
    replaceMaskWithRegions,
    resetMaskDrawing,
  } = useMaskDrawing({
    disabled: isDetecting || isAutoDetecting,
    initialBrushWidth: 24,
    minBrushWidth: MIN_BRUSH,
    maxBrushWidth: MAX_BRUSH,
  });

  const selectedMaterial = useMemo(
    () => FLOOR_MATERIAL_OPTIONS.find((material) => material.id === selectedMaterialId) ?? null,
    [selectedMaterialId],
  );
  const availableCredits = viewerReady ? me?.credits ?? GUEST_TESTING_STARTER_CREDITS : GUEST_TESTING_STARTER_CREDITS;
  const generationAccess = canUserGenerateNow(me);
  const currentStepNumber =
    step === "intake" ? 1 : step === "mask" ? 2 : step === "materials" ? 3 : 4;
  const canContinueFromMask = customPrompt.trim().length > 0;
  const aspectRatio = useMemo(() => {
    if (!selectedImage) return 1.15;
    const r = selectedImage.width / Math.max(selectedImage.height, 1);
    return Math.max(0.78, Math.min(r, 1.55));
  }, [selectedImage]);
  const materialCardWidth = Math.max((width - 46) / 2, 154);
  const resultFrameWidth = Math.max(width - 32, 320);
  const canContinueFromMaterials = Boolean(selectedImage && hasMask && selectedMaterial && !isGenerating);
  const maskLayoutScale = Math.min(width / MASK_SCREEN_REFERENCE_WIDTH, height / MASK_SCREEN_REFERENCE_HEIGHT, 1);
  const maskTitleTop = Math.max(insets.top + scaleMaskValue(16, maskLayoutScale), scaleMaskValue(72, maskLayoutScale));
  const maskImageTop = maskTitleTop + scaleMaskValue(60, maskLayoutScale);
  const maskPreviewHeight = scaleMaskValue(412, maskLayoutScale);
  const promptCardTop = maskImageTop + maskPreviewHeight + scaleMaskValue(132, maskLayoutScale);
  const promptLabelTop = promptCardTop - scaleMaskValue(28, maskLayoutScale);
  const maskButtonBottom = Math.max(insets.bottom + scaleMaskValue(12, maskLayoutScale), scaleMaskValue(44, maskLayoutScale));
  const promptModalTitleTop = Math.max(insets.top + scaleMaskValue(12, maskLayoutScale), scaleMaskValue(92, maskLayoutScale));
  const promptModalInputTop = promptModalTitleTop + scaleMaskValue(32, maskLayoutScale);
  const promptModalExamplesTitleTop = promptModalInputTop + scaleMaskValue(208, maskLayoutScale) + scaleMaskValue(32, maskLayoutScale);
  const promptModalButtonsTop = promptModalExamplesTitleTop + scaleMaskValue(44, maskLayoutScale);
  const promptModalSaveBottom = Math.max(insets.bottom + scaleMaskValue(12, maskLayoutScale), scaleMaskValue(12, maskLayoutScale));
  const canSaveCustomPrompt = customPromptDraft.trim().length > 0;

  useEffect(() => () => {
    if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
    if (continueTimerRef.current) clearTimeout(continueTimerRef.current);
  }, []);

  const clearDetectTimer = useCallback(() => {
    if (detectTimerRef.current) {
      clearTimeout(detectTimerRef.current);
      detectTimerRef.current = null;
    }
    setIsDetecting(false);
  }, []);

  const clearContinueTimer = useCallback(() => {
    if (continueTimerRef.current) {
      clearTimeout(continueTimerRef.current);
      continueTimerRef.current = null;
    }
    setLoadingContinueStep(null);
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
    const resultImageUrl = generation.imageUrl ?? null;
    const generationStatus = resolveGenerationStatus(generation.status, resultImageUrl);
    const hasResultImage = hasGenerationImage(resultImageUrl);
    if (generationStatus === "ready" && hasResultImage) {
      setGenerationId(null);
      setGeneratedImageUrl(resultImageUrl);
      setIsGenerating(false);
      setIsCancellingGeneration(false);
      setComparisonPosition(0.52);
      setProcessingComplete(true);
      const revealTimer = setTimeout(() => {
        triggerHaptic();
        if (effectiveSignedIn) {
          router.replace({ pathname: "/workspace", params: { boardView: "board" } });
          return;
        }
        setStep("result");
      }, 180);
      return () => clearTimeout(revealTimer);
    }
    if (generationStatus === "failed" && !hasResultImage) {
      setGenerationId(null);
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
    clearDetectTimer();
    clearContinueTimer();
    setStep("intake");
    setSelectedImage(null);
    setGeneratedImageUrl(null);
    setGenerationId(null);
    setIsGenerating(false);
    setIsAutoDetecting(false);
    setDetectedSourceStorageId(null);
    setIsCancellingGeneration(false);
    setCustomPrompt("");
    setCustomPromptDraft("");
    setIsCustomPromptOpen(false);
    autoMaskAttemptKeyRef.current = null;
    resetMaskDrawing({ resetBrush: true });
    if (typeof presetStyle === "string") {
      const normalized = presetStyle.trim().toLowerCase();
      const matched = FLOOR_MATERIAL_OPTIONS.find((material) => material.title.toLowerCase() === normalized);
      setSelectedMaterialId(matched?.id ?? null);
      return;
    }
    setSelectedMaterialId(null);
    }, [clearContinueTimer, clearDetectTimer, presetStyle, resetMaskDrawing]);

  const promptOpenSettings = useCallback((title: string, message: string) => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Open Settings",
        onPress: () => {
          void Linking.openSettings();
        },
      },
    ]);
  }, []);

  const prepareGeneratedImageFile = useCallback(async () => {
    if (!generatedImageUrl) {
      throw new Error("Generate an image first.");
    }

    if (generatedImageUrl.startsWith("file://")) {
      return { uri: generatedImageUrl, temporary: false };
    }

    const targetUri = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? ""}darkor-floor-result-${Date.now()}.jpg`;
    const download = await FileSystem.downloadAsync(generatedImageUrl, targetUri);
    return { uri: download.uri, temporary: true };
  }, [generatedImageUrl]);

  const cleanupTempFile = useCallback(async (uri: string | null | undefined, temporary: boolean) => {
    if (!uri || !temporary) {
      return;
    }

    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {
      // ignore cleanup errors
    }
  }, []);

  const handleSaveResult = useCallback(async () => {
    triggerHaptic();

    let tempUri: string | null = null;
    let temporary = false;
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        promptOpenSettings("Photo Access Needed", "Please allow photo library access to save your result to the device gallery.");
        return;
      }

      const prepared = await prepareGeneratedImageFile();
      tempUri = prepared.uri;
      temporary = prepared.temporary;
      await MediaLibrary.saveToLibraryAsync(prepared.uri);
      showToast("Saved to your gallery");
    } catch (error) {
      Alert.alert("Save failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      await cleanupTempFile(tempUri, temporary);
    }
  }, [cleanupTempFile, prepareGeneratedImageFile, promptOpenSettings, showToast]);

  const handleShareResult = useCallback(async () => {
    triggerHaptic();

    let tempUri: string | null = null;
    let temporary = false;
    try {
      const prepared = await prepareGeneratedImageFile();
      tempUri = prepared.uri;
      temporary = prepared.temporary;
      await Share.share({
        message: "Designed with Darkor.ai",
        url: prepared.uri,
      });
    } catch (error) {
      Alert.alert("Share failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      await cleanupTempFile(tempUri, temporary);
    }
  }, [cleanupTempFile, prepareGeneratedImageFile]);

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

    const sourceUri = selectedImage.photoUri ?? selectedImage.uri;
    if (!sourceUri) {
      throw new Error("No room photo is available for auto-detect.");
    }

    const storageId = await uploadBlobToStorage(sourceUri);
    setDetectedSourceStorageId(storageId);
    return storageId;
  }, [detectedSourceStorageId, selectedImage, uploadBlobToStorage]);

  const applySelectedImage = useCallback((nextImage: SelectedImage) => {
    clearDetectTimer();
    clearContinueTimer();
    setSelectedImage(nextImage);
    setGeneratedImageUrl(null);
    setGenerationId(null);
    setDetectedSourceStorageId(null);
    setIsAutoDetecting(false);
    setIsCancellingGeneration(false);
    setCustomPrompt("");
    setCustomPromptDraft("");
    setIsCustomPromptOpen(false);
    autoMaskAttemptKeyRef.current = null;
    resetMaskDrawing({ resetBrush: true });
  }, [clearContinueTimer, clearDetectTimer, resetMaskDrawing]);

  const advanceToMaskStep = useCallback(() => {
    triggerHaptic();
    autoMaskAttemptKeyRef.current = null;
    setStep("mask");
    resetDetection();
  }, [resetDetection]);

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

  const handleOpenCustomPrompt = useCallback(() => {
    triggerHaptic();
    setCustomPromptDraft(customPrompt);
    setIsCustomPromptOpen(true);
  }, [customPrompt]);

  const handleCloseCustomPrompt = useCallback(() => {
    triggerHaptic();
    setCustomPromptDraft(customPrompt);
    setIsCustomPromptOpen(false);
  }, [customPrompt]);

  const handleClearCustomPromptDraft = useCallback(() => {
    triggerHaptic();
    setCustomPromptDraft("");
  }, []);

  const handleChangeCustomPrompt = useCallback((value: string) => {
    setCustomPromptDraft(value);
  }, []);

  const handleSelectCustomPromptExample = useCallback((value: string) => {
    triggerHaptic();
    setCustomPromptDraft(value);
  }, []);

  const handleApplyCustomPrompt = useCallback(() => {
    const trimmed = customPromptDraft.trim();
    if (!trimmed) {
      Alert.alert("Add a prompt", "Describe the exact floor transformation you want before continuing.");
      return;
    }

    triggerHaptic();
    setCustomPrompt(trimmed);
    setCustomPromptDraft(trimmed);
    setIsCustomPromptOpen(false);
  }, [customPromptDraft]);

  const handleAutoDetectMask = useCallback(async () => {
    try {
      if (!viewerReady) {
        showToast("Preparing your session. Please try again in a moment.");
        return;
      }

      if (!selectedImage || canvasSize.width <= 0 || canvasSize.height <= 0 || isAutoDetecting) {
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
    replaceMaskWithRegions,
    selectedImage,
    showToast,
    viewerReady,
  ]);

  useEffect(() => {
    if (step !== "mask" || !selectedImage || canvasSize.width <= 0 || canvasSize.height <= 0 || hasMask || isAutoDetecting) {
      return;
    }

    const attemptKey = `${selectedImage.uri}:${Math.round(canvasSize.width)}x${Math.round(canvasSize.height)}`;
    if (autoMaskAttemptKeyRef.current === attemptKey) {
      return;
    }

    autoMaskAttemptKeyRef.current = attemptKey;
    void handleAutoDetectMask();
  }, [canvasSize.height, canvasSize.width, handleAutoDetectMask, hasMask, isAutoDetecting, selectedImage, step]);

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
              ? "Please enable camera access to capture a floor photo."
              : "Please enable photo library access to upload a floor photo.",
          );
          return false;
        }
        const result =
          source === "camera"
            ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 })
            : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
        if (result.canceled || !result.assets[0]) return false;
        const asset = result.assets[0];
        applySelectedImage({ uri: asset.uri, photoUri: asset.uri, width: asset.width ?? 1080, height: asset.height ?? 1440 });
        advanceToMaskStep();
        return true;
      } catch (error) {
        Alert.alert("Unable to open media", error instanceof Error ? error.message : "Please try again.");
        return false;
      }
    },
    [advanceToMaskStep, applySelectedImage],
  );

  const handleSelectExample = useCallback((example: FloorIntroExamplePhoto) => {
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
  }, [advanceToMaskStep, applySelectedImage]);

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
    if (!customPrompt.trim()) {
      Alert.alert("Add a prompt", "Choose a custom floor prompt before generating.");
      return;
    }
    if (!selectedMaterial) {
      Alert.alert("Pick a material", "Choose a flooring material before continuing.");
      return;
    }
    if (!generationAccess.allowed) {
      if (generationAccess.reason === "paywall" && !effectiveSignedIn) {
        setAwaitingAuth(true);
        router.push({ pathname: "/sign-in", params: { returnTo: "/workspace?service=floor" } });
        return;
      }

      if (generationAccess.reason === "paywall") {
        router.push({ pathname: "/paywall", params: { source: "generate" } } as any);
        return;
      }

      showToast(generationAccess.message || "Limit Reached");
      return;
    }
    try {
      setIsGenerating(true);
      setProcessingComplete(false);
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
            customPrompt: `${customPrompt.trim()}\n\nPreserve perspective, lighting, furniture placement, baseboards, wall lines, reflections, and every unmasked detail exactly.`,
            aspectRatio: simplifyRatio(selectedImage.width, selectedImage.height),
          })) as { generationId: string; creditsRemaining?: number };
        },
        showToast,
      )) as { generationId: string; creditsRemaining?: number };
      if (typeof result.creditsRemaining === "number") {
        setOptimisticCredits(result.creditsRemaining);
      }
      setGenerationId(result.generationId);
    } catch (error) {
      setIsGenerating(false);
      setStep("materials");
      const rawMessage = error instanceof Error ? error.message : "Please try again.";
      if (rawMessage.toLowerCase().includes("limit reached")) {
        showToast(rawMessage);
        return;
      }
      if (rawMessage === "Payment Required") {
        if (!effectiveSignedIn) {
          setAwaitingAuth(true);
          router.push({ pathname: "/sign-in", params: { returnTo: "/workspace?service=floor" } });
          return;
        }
        router.push({ pathname: "/paywall", params: { source: "generate" } } as any);
        return;
      }
      showToast(GENERATION_FAILED_TOAST);
    }
  }, [customPrompt, effectiveSignedIn, generationAccess.allowed, generationAccess.message, generationAccess.reason, hasMask, router, selectedImage, selectedMaterial, setOptimisticCredits, showToast, startGeneration, uploadBlobToStorage, viewerId, viewerReady]);

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
    clearDetectTimer();
    clearContinueTimer();
    if (step === "intake") return;
    if (step === "mask") return setStep("intake");
    if (step === "materials") return setStep("mask");
    if (step === "processing") return setStep("materials");
    if (step === "result") return setStep("materials");
  }, [clearContinueTimer, clearDetectTimer, step]);

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

      {step !== "processing" && step !== "intake" && step !== "mask" ? (
        <ServiceWizardHeader
          title="Floor Restyle"
          step={currentStepNumber}
          canGoBack={currentStepNumber > 1}
          onBack={handleBack}
          onClose={handleClose}
        />
      ) : null}

      {step === "intake" ? (
        <FloorIntroScreen
          creditCount={availableCredits}
          examples={FLOOR_WIZARD_EXAMPLE_PHOTOS}
          onTakePhoto={() => handleSelectMedia("camera")}
          onChooseFromGallery={() => handleSelectMedia("library")}
          onExamplePress={handleSelectExample}
          onExit={handleClose}
        />
      ) : null}

      {step === "mask" ? (
        <View style={styles.maskScreen}>
          <Text style={[styles.maskScreenTitle, { top: maskTitleTop }]}>Floor Restyle</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to floor upload"
            onPress={handleBack}
            style={[styles.maskNavButton, { top: maskTitleTop - scaleMaskValue(2, maskLayoutScale), left: scaleMaskValue(24, maskLayoutScale) }]}
          >
            <ChevronLeft color="#0A0A0A" size={22} strokeWidth={2.4} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close floor restyle flow"
            onPress={handleClose}
            style={[styles.maskNavButton, { top: maskTitleTop - scaleMaskValue(2, maskLayoutScale), right: scaleMaskValue(40, maskLayoutScale) }]}
          >
            <X color="#0A0A0A" size={20} strokeWidth={2.4} />
          </Pressable>

          <View
            onLayout={handleCanvasLayout}
            style={[
              styles.maskPreviewFrame,
              {
                top: maskImageTop,
                left: scaleMaskValue(24, maskLayoutScale),
                right: scaleMaskValue(24, maskLayoutScale),
                height: maskPreviewHeight,
              },
            ]}
          >
            {selectedImage ? (
              <>
                <Image source={{ uri: selectedImage.uri }} style={styles.photoImage} contentFit="cover" transition={160} />
                <View pointerEvents="none" style={absoluteFill}>
                  <Svg width="100%" height="100%">
                    {renderedStrokes.map((stroke) => (
                      <SvgPath
                        key={stroke.id}
                        d={stroke.path}
                        stroke={stroke.kind === "region" ? "none" : "rgba(255,59,48,0.58)"}
                        strokeWidth={stroke.kind === "region" ? 0 : stroke.width}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill={stroke.kind === "region" ? "rgba(255,59,48,0.58)" : "none"}
                      />
                    ))}
                  </Svg>
                </View>
                <AnimatePresence>
                  {isDetecting || isAutoDetecting ? (
                    <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={styles.maskDetectOverlay}>
                      <ActivityIndicator color="#FFFFFF" />
                      <Text style={styles.maskDetectTitle}>Masking your floor...</Text>
                    </MotiView>
                  ) : null}
                </AnimatePresence>
              </>
            ) : null}
          </View>

          <Text style={[styles.maskPromptLabel, { top: promptLabelTop, left: scaleMaskValue(24, maskLayoutScale) }]}>Enter Prompt</Text>

          <Pressable
            accessibilityRole="button"
            onPress={handleOpenCustomPrompt}
            style={[
              styles.maskPromptCard,
              {
                top: promptCardTop,
                left: scaleMaskValue(24, maskLayoutScale),
                right: scaleMaskValue(24, maskLayoutScale),
                minHeight: scaleMaskValue(112, maskLayoutScale),
              },
            ]}
          >
            {customPrompt.trim().length > 0 ? (
              <Text numberOfLines={3} style={styles.maskPromptValue}>{customPrompt}</Text>
            ) : null}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (!canContinueFromMask) {
                return;
              }

              if (!hasMask || isAutoDetecting || isDetecting) {
                showToast("Preparing the automatic floor mask. Please wait a moment.");
                return;
              }

              runDeferredContinue("mask", () => {
                triggerHaptic();
                setStep("materials");
              });
            }}
            style={[
              styles.maskContinueButton,
              {
                left: scaleMaskValue(24, maskLayoutScale),
                right: scaleMaskValue(24, maskLayoutScale),
                bottom: maskButtonBottom,
                height: scaleMaskValue(60, maskLayoutScale),
                backgroundColor: canContinueFromMask ? "#FF3B30" : "#E7E7E7",
              },
            ]}
          >
            <Text style={[styles.maskContinueText, { color: canContinueFromMask ? "#FFFFFF" : "#9CA3AF" }]}>Continue</Text>
          </Pressable>

          <AnimatePresence>
            {isCustomPromptOpen ? (
              <MotiView
                key="floor-custom-prompt-modal"
                from={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={styles.promptModalScreen}
              >
                <Text
                  style={[
                    styles.promptModalTitle,
                    {
                      top: promptModalTitleTop,
                      left: scaleMaskValue(20, maskLayoutScale),
                    },
                  ]}
                >
                  Custom Prompt
                </Text>

                <Pressable
                  accessibilityRole="button"
                  onPress={handleCloseCustomPrompt}
                  style={[
                    styles.promptModalCloseButton,
                    {
                      top: promptModalTitleTop,
                      right: scaleMaskValue(28, maskLayoutScale),
                    },
                  ]}
                >
                  <X color="#0A0A0A" size={18} strokeWidth={2.3} />
                </Pressable>

                <View
                  style={[
                    styles.promptModalInputWrap,
                    {
                      top: promptModalInputTop,
                      left: scaleMaskValue(20, maskLayoutScale),
                      right: scaleMaskValue(20, maskLayoutScale),
                      height: scaleMaskValue(208, maskLayoutScale),
                    },
                  ]}
                >
                  <Text style={styles.promptModalInputLabel}>Enter Prompt</Text>
                  <View style={styles.promptModalTextField}>
                    <TextInput
                      value={customPromptDraft}
                      onChangeText={handleChangeCustomPrompt}
                      multiline
                      placeholder="Type here a detailed description of what you want to see in your home design"
                      placeholderTextColor="#9CA3AF"
                      textAlignVertical="top"
                      style={styles.promptModalInput}
                    />
                    {customPromptDraft.length > 0 ? (
                      <Pressable accessibilityRole="button" onPress={handleClearCustomPromptDraft} style={styles.promptModalClearButton}>
                        <X color="#0A0A0A" size={14} strokeWidth={2.4} />
                      </Pressable>
                    ) : null}
                  </View>
                </View>

                <Text
                  style={[
                    styles.promptExampleTitle,
                    {
                      top: promptModalExamplesTitleTop,
                      left: scaleMaskValue(24, maskLayoutScale),
                    },
                  ]}
                >
                  Example prompts
                </Text>

                <View
                  style={[
                    styles.promptExampleList,
                    {
                      top: promptModalButtonsTop,
                      left: scaleMaskValue(24, maskLayoutScale),
                      right: scaleMaskValue(24, maskLayoutScale),
                    },
                  ]}
                >
                  {FLOOR_PROMPT_EXAMPLES.map((prompt) => (
                    <Pressable
                      key={prompt}
                      accessibilityRole="button"
                      onPress={() => handleSelectCustomPromptExample(prompt)}
                      style={styles.promptExampleChip}
                    >
                      <Text style={styles.promptExampleText}>{prompt}</Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  accessibilityRole="button"
                  disabled={!canSaveCustomPrompt}
                  onPress={() => {
                    if (!canSaveCustomPrompt) {
                      return;
                    }
                    handleApplyCustomPrompt();
                  }}
                  style={[
                    styles.promptModalSaveButton,
                    {
                      left: scaleMaskValue(20, maskLayoutScale),
                      right: scaleMaskValue(20, maskLayoutScale),
                      bottom: promptModalSaveBottom,
                      height: scaleMaskValue(60, maskLayoutScale),
                      backgroundColor: canSaveCustomPrompt ? "#FF3B30" : "#E7E7E7",
                    },
                  ]}
                >
                  <Text style={[styles.promptModalSaveText, { color: canSaveCustomPrompt ? "#FFFFFF" : "#9CA3AF" }]}>Save</Text>
                </Pressable>
              </MotiView>
            ) : null}
          </AnimatePresence>
        </View>
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
          subtitlePhrases={GENERATION_STATUS_MESSAGES}
          onCancel={() => {
            void handleCancelGeneration();
          }}
          cancelDisabled={!generationId || isCancellingGeneration}
          complete={processingComplete}
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
            <View style={styles.resultActions}>
              <LuxPressable onPress={handleSaveResult} className={pointerClassName} style={{ width: "100%" }} scale={0.99}>
                <View style={[styles.resultActionButton, styles.resultActionSave]}>
                  <Text style={styles.resultActionSaveText}>Save to Gallery</Text>
                </View>
              </LuxPressable>
              <LuxPressable onPress={handleShareResult} className={pointerClassName} style={{ width: "100%" }} scale={0.99}>
                <View style={[styles.resultActionButton, styles.resultActionShare]}>
                  <Text style={styles.resultActionShareText}>Share</Text>
                </View>
              </LuxPressable>
              <LuxPressable onPress={resetProject} className={pointerClassName} style={{ width: "100%" }} scale={0.99}>
                <View style={[styles.resultActionButton, styles.resultActionRetry]}>
                  <Text style={styles.resultActionRetryText}>Try Again</Text>
                </View>
              </LuxPressable>
            </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: SERVICE_WIZARD_THEME.colors.background },
  captureStage: { position: "absolute", left: -10000, top: 0, opacity: 0.01 },
  maskScreen: { flex: 1, backgroundColor: "#FFFFFF" },
  maskScreenTitle: { position: "absolute", left: 0, right: 0, textAlign: "center", color: "#0A0A0A", fontSize: 20, lineHeight: 24, fontWeight: "700", zIndex: 2 },
  maskNavButton: { position: "absolute", zIndex: 2, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  maskPreviewFrame: { position: "absolute", borderRadius: 28, overflow: "hidden", backgroundColor: "#0F0F10" },
  maskDetectOverlay: { ...absoluteFill, alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: "rgba(8,8,8,0.28)" },
  maskDetectTitle: { color: "#FFFFFF", fontSize: 16, lineHeight: 20, fontWeight: "600" },
  maskPromptLabel: { position: "absolute", color: "#0A0A0A", fontSize: 16, lineHeight: 20, fontWeight: "600" },
  maskPromptCard: { position: "absolute", borderRadius: 24, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#F6F7F8", paddingTop: 28, paddingHorizontal: 20, paddingBottom: 16 },
  maskPromptValue: { color: "#111827", fontSize: 15, lineHeight: 22 },
  maskContinueButton: { position: "absolute", borderRadius: 22, alignItems: "center", justifyContent: "center" },
  maskContinueText: { fontSize: 16, lineHeight: 20, fontWeight: "700" },
  promptModalScreen: { ...StyleSheet.absoluteFillObject, backgroundColor: "#FFFFFF", zIndex: 10 },
  promptModalTitle: { position: "absolute", color: "#0A0A0A", fontSize: 24, lineHeight: 28, fontWeight: "700" },
  promptModalCloseButton: { position: "absolute", width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  promptModalInputWrap: { position: "absolute", borderRadius: 24, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#F8F8F8" },
  promptModalInputLabel: { position: "absolute", top: 28, left: 20, color: "#0A0A0A", fontSize: 16, lineHeight: 20, fontWeight: "600" },
  promptModalTextField: { position: "absolute", top: 72, left: 20, right: 20, bottom: 20 },
  promptModalInput: { flex: 1, color: "#111827", fontSize: 15, lineHeight: 22, padding: 0, paddingRight: 24 },
  promptModalClearButton: { position: "absolute", top: 24, right: 24, width: 18, height: 18, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  promptExampleTitle: { position: "absolute", color: "#0A0A0A", fontSize: 16, lineHeight: 20, fontWeight: "600" },
  promptExampleList: { position: "absolute", gap: 16 },
  promptExampleChip: { height: 48, borderRadius: 999, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#F8F8F8", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  promptExampleText: { color: "#6B7280", fontSize: 14, lineHeight: 18, textAlign: "center" },
  promptModalSaveButton: { position: "absolute", borderRadius: 22, alignItems: "center", justifyContent: "center" },
  promptModalSaveText: { fontSize: 16, lineHeight: 20, fontWeight: "700" },
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
  resultActions: { gap: 12 },
  resultActionButton: {
    marginHorizontal: 20,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  resultActionSave: { backgroundColor: "#E53935" },
  resultActionShare: { backgroundColor: "#0A0A0A" },
  resultActionRetry: { backgroundColor: "#F0F0F0" },
  resultActionSaveText: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 20,
    ...fonts.semibold,
  },
  resultActionShareText: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 20,
    ...fonts.semibold,
  },
  resultActionRetryText: {
    color: "#0A0A0A",
    fontSize: 16,
    lineHeight: 20,
    ...fonts.semibold,
  },
  secondaryAction: { minHeight: 56, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.03)" },
  secondaryActionText: { color: "#ffffff", fontSize: 14, fontWeight: "700" },
  restartButton: { minHeight: 56, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.03)", flexDirection: "row", gap: spacing.sm },
  restartText: { color: "#ffffff", fontSize: 14, fontWeight: "700" },
});
