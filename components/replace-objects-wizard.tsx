import {
  BrushCleaning,
  Eraser,
  MoveHorizontal,
  Redo2,
  Undo2,
} from "@/components/material-icons";
import {useAuth} from "@clerk/expo";
import {useMutation, useQuery} from "convex/react";
import * as FileSystem from "expo-file-system/legacy";
import {Image} from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import {useRouter} from "expo-router";
import {StatusBar} from "expo-status-bar";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Image as NativeImage,
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
import {Gesture, GestureDetector} from "react-native-gesture-handler";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import Svg, {
  Circle as SvgCircle,
  Defs,
  G,
  Mask as SvgMask,
  Path as SvgPath,
  Rect,
} from "react-native-svg";
import {captureRef} from "react-native-view-shot";

import {canUserGenerate as canUserGenerateNow} from "../lib/generation-access";
import {GENERATION_FAILED_TOAST, getFriendlyGenerationError} from "../lib/generation-errors";
import {runWithFriendlyRetry} from "../lib/generation-retry";
import {hasGenerationImage, resolveGenerationStatus} from "../lib/generation-status";
import {
  isGuestWizardTestingSession,
  resolveGuestWizardViewerId,
} from "../lib/guest-testing";
import {triggerHaptic} from "../lib/haptics";
import {uploadLocalFileToCloud} from "../lib/native-upload";
import {SERVICE_WIZARD_THEME} from "../lib/service-wizard-theme";
import {getReplaceWizardExamplePhotos} from "../lib/wizard-example-photos";
import {spacing} from "../styles/spacing";
import {fonts} from "../styles/typography";
import {useDiamondStore} from "./diamond-store-context";
import {DIAMOND_PILL_BLUE} from "./diamond-credit-pill";
import {InteriorRedesignStepOne} from "./interior-redesign-step-one";
import {LuxPressable} from "./lux-pressable";
import {useProSuccess} from "./pro-success-context";
import {ServiceContinueButton} from "./service-continue-button";
import {ServiceProcessingScreen, useGenerationStatusMessages} from "./service-processing-screen";
import {ServiceWizardHeader} from "./service-wizard-header";
import {ServiceWizardStepScreen} from "./service-wizard-shared";
import {getStickyStepHeaderMetrics} from "./sticky-step-header";
import {useMaskDrawing} from "./use-mask-drawing";
import {useViewerCredits} from "./viewer-credits-context";
import {useViewerSession} from "./viewer-session-context";

type WizardStep = "intake" | "mask" | "prompt" | "processing" | "result";
type MaskTool = "brush" | "eraser";

type SelectedImage = {
  uri: string;
  photoUri?: string | null;
  width: number;
  height: number;
};

type MeResponse = {
  credits: number;
  imagesRemaining?: number;
  hasPaidAccess?: boolean;
  subscriptionType?: "free" | "weekly" | "yearly";
  generationStatusMessage?: string;
  canGenerateNow?: boolean;
};

type ArchiveGeneration = {
  _id: string;
  imageUrl?: string | null;
  status?: "processing" | "ready" | "failed";
  errorMessage?: string | null;
};

type ReplaceObjectsWizardProps = {
  onFlowActiveChange?: (isFlowActive: boolean) => void;
  onProcessingStateChange?: (isProcessing: boolean) => void;
};

const TABS_HOME_ROUTE = "/(tabs)/index";
const CANCELLED_GENERATION_MESSAGE = "Cancelled by user.";
const pointerClassName = "cursor-pointer";
const MASK_TINT = "rgba(255,59,48,0.42)";
const MASK_CAPTURE_COLOR = "#FFFFFF";
const MASK_BACKGROUND = "#000000";
const BRUSH_MIN = 14;
const BRUSH_MAX = 68;
const TOTAL_STEPS = 3;
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

export function ReplaceObjectsWizard({
  onFlowActiveChange,
  onProcessingStateChange,
}: ReplaceObjectsWizardProps) {
  const {t, i18n} = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {width, height} = useWindowDimensions();
  const {isSignedIn} = useAuth();
  const {anonymousId, isReady: viewerReady} = useViewerSession();
  const guestWizardTestingSession = isGuestWizardTestingSession(isSignedIn);
  const effectiveSignedIn = isSignedIn || guestWizardTestingSession;
  const viewerId = useMemo(() => resolveGuestWizardViewerId(anonymousId, isSignedIn), [anonymousId, isSignedIn]);
  const {showToast} = useProSuccess();
  const {credits: sharedCredits, setOptimisticCredits} = useViewerCredits();
  const {openStore} = useDiamondStore();
  const viewerArgs = useMemo(() => (viewerId ? {anonymousId: viewerId} : {}), [viewerId]);

  const me = useQuery("users:me" as any, viewerReady ? viewerArgs : "skip") as MeResponse | null | undefined;
  const generationArchive = useQuery("generations:getUserArchive" as any, viewerReady ? viewerArgs : "skip") as
    | ArchiveGeneration[]
    | undefined;
  const createSourceUploadUrl = useMutation("generations:createSourceUploadUrl" as any);
  const startGeneration = useMutation("generations:startGeneration" as any);
  const cancelGeneration = useMutation("generations:cancelGeneration" as any);

  const [step, setStep] = useState<WizardStep>("intake");
  const [maskTool, setMaskTool] = useState<MaskTool>("brush");
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [prompt, setPrompt] = useState("");
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [awaitingAuth, setAwaitingAuth] = useState(false);
  const [isCancellingGeneration, setIsCancellingGeneration] = useState(false);
  const [comparisonPosition, setComparisonPosition] = useState(0.52);

  const sourceCaptureRef = useRef<View>(null);
  const maskCaptureRef = useRef<View>(null);
  const handledGenerationCompletionRef = useRef<string | null>(null);

  const {
    renderedStrokes,
    brushWidth,
    brushProgress,
    canvasSize,
    sliderWidth,
    setSliderWidth,
    activePoint,
    hasMask,
    handleCanvasLayout,
    undoLastStroke,
    redoLastStroke,
    resetMaskDrawing,
    drawGesture,
    sliderGesture,
    loupeMetrics,
    canRedo,
  } = useMaskDrawing({
    disabled: false,
    toolMode: maskTool,
    initialBrushWidth: 26,
    minBrushWidth: BRUSH_MIN,
    maxBrushWidth: BRUSH_MAX,
  });

  const generationStatusMessages = useGenerationStatusMessages();
  const replaceExamplePhotos = useMemo(() => getReplaceWizardExamplePhotos(t), [i18n.language, t]);
  const stickyHeaderMetrics = getStickyStepHeaderMetrics(insets.top);
  const availableCredits = sharedCredits;
  const generationAccess = canUserGenerateNow(me);
  const generationSpeedTier = useMemo<"standard" | "pro" | "ultra">(() => {
    if (me?.subscriptionType === "yearly") {
      return "ultra";
    }
    if (me?.hasPaidAccess) {
      return "pro";
    }
    return "standard";
  }, [me?.hasPaidAccess, me?.subscriptionType]);
  const currentStepNumber = step === "intake" ? 1 : step === "mask" ? 2 : 3;
  const stepLabel = t("wizard.headers.stepProgress", {
    current: currentStepNumber,
    total: TOTAL_STEPS,
  });
  const maskCanvasWidth = Math.min(width - 48, 412);
  const maskCanvasHeight = Math.min(Math.max(height * 0.42, 340), 420);
  const promptCanGenerate = prompt.trim().length > 0 && hasMask && Boolean(selectedImage);
  const creditsRemainingLabel = t("wizard.replaceFlow.creditsRemaining", {
    count: Math.max(availableCredits - 1, 0),
  });
  const resultFrameWidth = Math.max(width - 32, 320);
  const aspectRatio = useMemo(() => {
    if (!selectedImage) return 1.15;
    const ratio = selectedImage.width / Math.max(selectedImage.height, 1);
    return Math.max(0.78, Math.min(ratio, 1.55));
  }, [selectedImage]);

  useEffect(() => {
    if (!generationId || !generationArchive) {
      return;
    }

    const generation = generationArchive.find((item) => item._id === generationId);
    if (!generation) {
      return;
    }

    const resultImageUrl = generation.imageUrl ?? null;
    const generationStatus = resolveGenerationStatus(generation.status, resultImageUrl);
    const hasResultImage = hasGenerationImage(resultImageUrl);

    if (generationStatus === "ready" && hasResultImage) {
      if (handledGenerationCompletionRef.current === generation._id) {
        return;
      }

      handledGenerationCompletionRef.current = generation._id;
      setGenerationId(null);
      setGeneratedImageUrl(resultImageUrl);
      setIsGenerating(false);
      setIsCancellingGeneration(false);
      setComparisonPosition(0.52);
      setProcessingComplete(true);

      const revealTimer = setTimeout(() => {
        triggerHaptic();
        if (effectiveSignedIn) {
          router.replace({pathname: "/workspace", params: {boardView: "board"}});
          return;
        }
        setStep("result");
      }, 180);

      return () => clearTimeout(revealTimer);
    }

    if (generationStatus === "failed" && !hasResultImage) {
      if (handledGenerationCompletionRef.current === generation._id) {
        return;
      }

      handledGenerationCompletionRef.current = generation._id;
      setGenerationId(null);
      setIsGenerating(false);
      setIsCancellingGeneration(false);

      if (generation.errorMessage === CANCELLED_GENERATION_MESSAGE) {
        return;
      }

      setStep("prompt");
      showToast(getFriendlyGenerationError(generation.errorMessage ?? GENERATION_FAILED_TOAST));
    }
  }, [effectiveSignedIn, generationArchive, generationId, router, showToast]);

  useEffect(() => {
    onProcessingStateChange?.(step === "processing");
  }, [onProcessingStateChange, step]);

  useEffect(() => {
    onFlowActiveChange?.(step !== "processing" && step !== "result");
  }, [onFlowActiveChange, step]);

  useEffect(() => {
    return () => {
      onProcessingStateChange?.(false);
      onFlowActiveChange?.(false);
    };
  }, [onFlowActiveChange, onProcessingStateChange]);

  const cleanupTempFile = useCallback(async (uri: string | null | undefined, temporary: boolean) => {
    if (!uri || !temporary) {
      return;
    }

    try {
      await FileSystem.deleteAsync(uri, {idempotent: true});
    } catch {
      // ignore cleanup errors
    }
  }, []);

  const prepareGeneratedImageFile = useCallback(async () => {
    if (!generatedImageUrl) {
      throw new Error(t("workspace.download.generateFirst"));
    }

    if (generatedImageUrl.startsWith("file://")) {
      return {uri: generatedImageUrl, temporary: false};
    }

    const targetUri = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? ""}homedecor-replace-result-${Date.now()}.jpg`;
    const download = await FileSystem.downloadAsync(generatedImageUrl, targetUri);
    return {uri: download.uri, temporary: true};
  }, [generatedImageUrl, t]);

  const uploadBlobToStorage = useCallback(async (localUri: string) => {
    const uploadUrl = await createSourceUploadUrl({anonymousId: viewerId});
    return await uploadLocalFileToCloud(uploadUrl, localUri, {
      fallbackMimeType: "image/png",
      errorLabel: "replace objects image",
    });
  }, [createSourceUploadUrl, viewerId]);

  const handleOpenPaywall = useCallback(() => {
    triggerHaptic();
    openStore();
  }, [openStore]);

  const handleClose = useCallback(() => {
    router.replace(TABS_HOME_ROUTE as any);
  }, [router]);

  const handleMaskClose = useCallback(() => {
    triggerHaptic();
    setStep("intake");
  }, []);

  const applySelectedImage = useCallback((image: SelectedImage) => {
    handledGenerationCompletionRef.current = null;
    setSelectedImage(image);
    setGeneratedImageUrl(null);
    setGenerationId(null);
    setProcessingComplete(false);
    setPrompt("");
    setMaskTool("brush");
    setComparisonPosition(0.52);
    resetMaskDrawing({resetBrush: true});
  }, [resetMaskDrawing]);

  const resetProject = useCallback(() => {
    handledGenerationCompletionRef.current = null;
    setStep("intake");
    setSelectedImage(null);
    setPrompt("");
    setGenerationId(null);
    setGeneratedImageUrl(null);
    setIsGenerating(false);
    setProcessingComplete(false);
    setAwaitingAuth(false);
    setIsCancellingGeneration(false);
    setMaskTool("brush");
    setComparisonPosition(0.52);
    resetMaskDrawing({resetBrush: true});
  }, [resetMaskDrawing]);

  const advanceToMaskStep = useCallback(() => {
    triggerHaptic();
    setStep("mask");
  }, []);

  const handleSelectMedia = useCallback(async (source: "camera" | "library") => {
    try {
      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          source === "camera" ? t("wizard.replaceFlow.cameraAccessTitle") : t("wizard.replaceFlow.photoAccessTitle"),
          source === "camera" ? t("wizard.replaceFlow.cameraAccessBody") : t("wizard.replaceFlow.photoAccessBody"),
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

      if (result.canceled || !result.assets[0]) {
        return false;
      }

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
      Alert.alert(
        t("wizard.replaceFlow.mediaUnavailableTitle"),
        error instanceof Error ? error.message : t("common.actions.tryAgain"),
      );
      return false;
    }
  }, [advanceToMaskStep, applySelectedImage, t]);

  const handleSelectExample = useCallback((example: {source: number}) => {
    const resolved = NativeImage.resolveAssetSource(example.source);
    if (!resolved?.uri) {
      Alert.alert(t("workspace.media.exampleUnavailableTitle"), t("wizard.replaceFlow.exampleUnavailableBody"));
      return;
    }

    applySelectedImage({
      uri: resolved.uri,
      photoUri: null,
      width: resolved.width ?? 1080,
      height: resolved.height ?? 1440,
    });
    advanceToMaskStep();
  }, [advanceToMaskStep, applySelectedImage, t]);

  const handleBack = useCallback(() => {
    triggerHaptic();
    if (step === "mask") {
      setStep("intake");
      return;
    }
    if (step === "prompt") {
      setStep("mask");
      return;
    }
    if (step === "processing" || step === "result") {
      setStep("prompt");
    }
  }, [step]);

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

  const handleSaveResult = useCallback(async () => {
    triggerHaptic();

    let tempUri: string | null = null;
    let temporary = false;
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t("wizard.replaceFlow.savePermissionTitle"), t("wizard.replaceFlow.savePermissionBody"), [
          {text: t("common.actions.cancel"), style: "cancel"},
          {
            text: t("common.actions.openSettings"),
            onPress: () => {
              void Linking.openSettings();
            },
          },
        ]);
        return;
      }

      const prepared = await prepareGeneratedImageFile();
      tempUri = prepared.uri;
      temporary = prepared.temporary;
      await MediaLibrary.saveToLibraryAsync(prepared.uri);
      showToast(t("common.states.savedToGallery"));
    } catch (error) {
      Alert.alert(t("workspace.download.failedTitle"), error instanceof Error ? error.message : t("common.actions.tryAgain"));
    } finally {
      await cleanupTempFile(tempUri, temporary);
    }
  }, [cleanupTempFile, prepareGeneratedImageFile, showToast, t]);

  const handleShareResult = useCallback(async () => {
    triggerHaptic();

    let tempUri: string | null = null;
    let temporary = false;
    try {
      const prepared = await prepareGeneratedImageFile();
      tempUri = prepared.uri;
      temporary = prepared.temporary;
      await Share.share({
        url: prepared.uri,
        message: t("workspace.share.message"),
      });
    } catch (error) {
      Alert.alert(t("workspace.share.failedTitle"), error instanceof Error ? error.message : t("common.actions.tryAgain"));
    } finally {
      await cleanupTempFile(tempUri, temporary);
    }
  }, [cleanupTempFile, prepareGeneratedImageFile, t]);

  const handleGenerate = useCallback(async () => {
    if (isGenerating) {
      return;
    }

    if (!viewerReady) {
      Alert.alert(t("workspace.generation.preparingSessionTitle"), t("workspace.generation.preparingSessionBody"));
      return;
    }

    if (!selectedImage || !hasMask || !sourceCaptureRef.current || !maskCaptureRef.current) {
      Alert.alert(t("wizard.replaceFlow.markObjectTitle"), t("wizard.replaceFlow.markObjectBody"));
      return;
    }

    if (!prompt.trim()) {
      Alert.alert(t("wizard.replaceFlow.addPromptTitle"), t("wizard.replaceFlow.addPromptBody"));
      return;
    }

    if (!generationAccess.allowed) {
      if (generationAccess.reason === "paywall" && !effectiveSignedIn) {
        setAwaitingAuth(true);
        router.push({pathname: "/sign-in", params: {returnTo: "/workspace?service=replace"}} as any);
        return;
      }

      if (generationAccess.reason === "paywall") {
        openStore("empty_balance");
        return;
      }

      showToast(generationAccess.message || t("workspace.generation.limitReached"));
      return;
    }

    try {
      setIsGenerating(true);
      setProcessingComplete(false);
      setStep("processing");

      const result = (await runWithFriendlyRetry(
        async () => {
          let sourceUri: string | null = null;
          let maskUri: string | null = null;

          try {
            [sourceUri, maskUri] = await Promise.all([
              captureRef(sourceCaptureRef, {format: "png", quality: 1, result: "tmpfile"}),
              captureRef(maskCaptureRef, {format: "png", quality: 1, result: "tmpfile"}),
            ]);

            const [sourceStorageId, maskStorageId] = await Promise.all([
              uploadBlobToStorage(sourceUri),
              uploadBlobToStorage(maskUri),
            ]);

            return (await startGeneration({
              anonymousId: viewerId,
              imageStorageId: sourceStorageId,
              maskStorageId,
              serviceType: "replace",
              selection: prompt.trim(),
              roomType: "Room",
              displayStyle: "Object Replacement",
              customPrompt: prompt.trim(),
              aspectRatio: simplifyRatio(selectedImage.width, selectedImage.height),
              speedTier: generationSpeedTier,
            })) as {generationId: string; creditsRemaining?: number};
          } finally {
            await Promise.all([
              cleanupTempFile(sourceUri, true),
              cleanupTempFile(maskUri, true),
            ]);
          }
        },
        showToast,
      )) as {generationId: string; creditsRemaining?: number};

      if (typeof result.creditsRemaining === "number") {
        setOptimisticCredits(result.creditsRemaining);
      }

      handledGenerationCompletionRef.current = null;
      setGenerationId(result.generationId);
    } catch (error) {
      setIsGenerating(false);
      setStep("prompt");
      const rawMessage = error instanceof Error ? error.message : t("common.actions.tryAgain");
      if (rawMessage.toLowerCase().includes("limit reached")) {
        showToast(rawMessage);
        return;
      }
      if (rawMessage === "Payment Required") {
        if (!effectiveSignedIn) {
          setAwaitingAuth(true);
          router.push({pathname: "/sign-in", params: {returnTo: "/workspace?service=replace"}} as any);
          return;
        }
        openStore("empty_balance");
        return;
      }
      showToast(getFriendlyGenerationError(rawMessage));
    }
  }, [
    cleanupTempFile,
    effectiveSignedIn,
    generationAccess.allowed,
    generationAccess.message,
    generationAccess.reason,
    generationSpeedTier,
    hasMask,
    isGenerating,
    openStore,
    prompt,
    router,
    selectedImage,
    setOptimisticCredits,
    showToast,
    startGeneration,
    t,
    uploadBlobToStorage,
    viewerId,
    viewerReady,
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
      })) as {cancelled?: boolean};

      if (!result.cancelled) {
        showToast(t("wizard.replaceFlow.renderFinishing"));
        return;
      }

      triggerHaptic();
      setIsGenerating(false);
      setGenerationId(null);
      setGeneratedImageUrl(null);
      setStep("prompt");
      showToast(t("wizard.replaceFlow.cancelSuccess"));
    } catch (error) {
      showToast(getFriendlyGenerationError(error instanceof Error ? error.message : t("wizard.replaceFlow.cancelUnavailable")));
    } finally {
      setIsCancellingGeneration(false);
    }
  }, [cancelGeneration, generationId, isCancellingGeneration, showToast, t, viewerId]);

  useEffect(() => {
    if (!awaitingAuth || !effectiveSignedIn || !viewerReady || !promptCanGenerate) {
      return;
    }

    setAwaitingAuth(false);
    const timer = setTimeout(() => {
      void handleGenerate();
    }, 300);
    return () => clearTimeout(timer);
  }, [awaitingAuth, effectiveSignedIn, handleGenerate, promptCanGenerate, viewerReady]);

  return (
    <View style={styles.screen}>
      {selectedImage && canvasSize.width > 0 && canvasSize.height > 0 ? (
        <View pointerEvents="none" style={styles.captureStage}>
          <View
            ref={sourceCaptureRef}
            collapsable={false}
            style={{width: canvasSize.width, height: canvasSize.height, backgroundColor: MASK_BACKGROUND}}
          >
            <Image source={{uri: selectedImage.uri}} style={styles.photoImage} contentFit="contain" />
          </View>
          <View
            ref={maskCaptureRef}
            collapsable={false}
            style={{width: canvasSize.width, height: canvasSize.height, marginTop: spacing.sm, backgroundColor: MASK_BACKGROUND}}
          >
            <Svg width={canvasSize.width} height={canvasSize.height}>
              <Rect x={0} y={0} width={canvasSize.width} height={canvasSize.height} fill={MASK_BACKGROUND} />
              {renderedStrokes.map((stroke) => (
                <SvgPath
                  key={`mask-${stroke.id}`}
                  d={stroke.path}
                  stroke={stroke.kind === "region" ? "none" : stroke.tool === "eraser" ? MASK_BACKGROUND : MASK_CAPTURE_COLOR}
                  strokeWidth={stroke.kind === "region" ? 0 : stroke.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill={stroke.kind === "region" ? MASK_CAPTURE_COLOR : stroke.tool === "eraser" ? MASK_BACKGROUND : "none"}
                />
              ))}
            </Svg>
          </View>
        </View>
      ) : null}

      {step !== "processing" && step !== "result" && step !== "intake" ? (
        <ServiceWizardHeader
          title={stepLabel}
          step={currentStepNumber}
          totalSteps={TOTAL_STEPS}
          creditCount={availableCredits}
          onCreditsPress={handleOpenPaywall}
          canGoBack={currentStepNumber > 1}
          onBack={handleBack}
          onClose={step === "mask" ? handleMaskClose : handleClose}
        />
      ) : null}

      {step === "intake" ? (
        <InteriorRedesignStepOne
          creditCount={availableCredits}
          headerTitle={stepLabel}
          bodyTitle={t("wizard.replaceFlow.intakeTitle")}
          totalSteps={TOTAL_STEPS}
          emptyStateSubtitle={t("wizard.replaceFlow.intakeBody")}
          selectedPhotos={selectedImage ? [{uri: selectedImage.uri}] : []}
          currentDisplayIndex={0}
          examplePhotos={replaceExamplePhotos}
          onTakePhoto={() => handleSelectMedia("camera")}
          onChooseFromGallery={() => handleSelectMedia("library")}
          onRemovePhoto={() => {
            triggerHaptic();
            resetProject();
          }}
          onFocusPhoto={() => undefined}
          onSelectExample={(example) => {
            handleSelectExample(example);
          }}
          onContinue={advanceToMaskStep}
          onCreditsPress={handleOpenPaywall}
          onExit={handleClose}
          maxPhotos={1}
          showPhotoCount={false}
        />
      ) : null}

      {step === "mask" ? (
        <ServiceWizardStepScreen
          footerOffset={96}
          scrollEnabled={false}
          contentContainerStyle={{
            paddingHorizontal: spacing.md,
            paddingTop: stickyHeaderMetrics.contentOffset,
            paddingBottom: spacing.lg,
            gap: spacing.md,
          }}
          footer={
            <ServiceContinueButton
              active={hasMask}
              label={t("common.actions.continue")}
              onPress={() => {
                if (!hasMask) {
                  return;
                }
                triggerHaptic();
                setStep("prompt");
              }}
              pulse={hasMask}
              supportingText={t("wizard.replaceFlow.maskSupportingText")}
            />
          }
        >
          <StatusBar style="dark" />
          <View style={styles.copyBlock}>
            <Text style={styles.stepTitle}>{t("wizard.replaceFlow.maskTitle")}</Text>
            <Text style={styles.stepText}>{t("wizard.replaceFlow.maskBody")}</Text>
          </View>

          <View style={[styles.maskWorkspace, {width: maskCanvasWidth}]}>
            <Text style={styles.maskInstruction}>{t("wizard.replaceFlow.maskInstruction")}</Text>

            <View style={styles.maskCanvasWrap}>
              <View onLayout={handleCanvasLayout} style={[styles.maskCanvasFrame, {width: maskCanvasWidth, height: maskCanvasHeight}]}>
                {selectedImage ? (
                  <>
                    <Image source={{uri: selectedImage.uri}} style={styles.photoImage} contentFit="contain" transition={160} />

                    <GestureDetector gesture={drawGesture}>
                      <View style={absoluteFill}>
                        <Svg width="100%" height="100%">
                          <Defs>
                            <SvgMask id="replace-mask">
                              <Rect x="0" y="0" width="100%" height="100%" fill="#000000" />
                              {renderedStrokes.map((stroke) => (
                                <SvgPath
                                  key={`replace-mask-${stroke.id}`}
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
                          <Rect x="0" y="0" width="100%" height="100%" fill={MASK_TINT} mask="url(#replace-mask)" />
                        </Svg>
                      </View>
                    </GestureDetector>

                    {activePoint ? (
                      <View
                        pointerEvents="none"
                        style={[
                          styles.maskCursor,
                          {
                            width: brushWidth,
                            height: brushWidth,
                            left: Math.max(12, Math.min(activePoint.x - brushWidth / 2, Math.max(canvasSize.width - brushWidth - 12, 12))),
                            top: Math.max(12, Math.min(activePoint.y - brushWidth / 2, Math.max(canvasSize.height - brushWidth - 12, 12))),
                            borderColor: maskTool === "eraser" ? "rgba(10,10,10,0.86)" : "rgba(255,255,255,0.82)",
                            backgroundColor: maskTool === "eraser" ? "rgba(255,255,255,0.2)" : MASK_TINT,
                          },
                        ]}
                      />
                    ) : null}

                    {selectedImage && loupeMetrics ? (
                      <View
                        pointerEvents="none"
                        style={[
                          styles.loupe,
                          {
                            left: loupeMetrics.left,
                            top: loupeMetrics.top,
                            width: loupeMetrics.size,
                            height: loupeMetrics.size,
                          },
                        ]}
                      >
                        <View style={styles.loupeInner}>
                          <Image
                            source={{uri: selectedImage.uri}}
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
                              <SvgMask id="replace-loupe-mask">
                                <Rect x="0" y="0" width={loupeMetrics.size} height={loupeMetrics.size} fill="#000000" />
                                <G transform={`translate(${loupeMetrics.translateX} ${loupeMetrics.translateY}) scale(${loupeMetrics.zoom})`}>
                                  {renderedStrokes.map((stroke) => (
                                    <SvgPath
                                      key={`replace-loupe-${stroke.id}`}
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
                            <Rect x="0" y="0" width={loupeMetrics.size} height={loupeMetrics.size} fill={MASK_TINT} mask="url(#replace-loupe-mask)" />
                            <SvgCircle cx={loupeMetrics.size / 2} cy={loupeMetrics.size / 2} r={8} fill="none" stroke="#ffffff" strokeWidth={1.5} />
                            <SvgPath d={`M ${loupeMetrics.size / 2 - 14} ${loupeMetrics.size / 2} L ${loupeMetrics.size / 2 + 14} ${loupeMetrics.size / 2}`} stroke="#ffffff" strokeWidth={1} />
                            <SvgPath d={`M ${loupeMetrics.size / 2} ${loupeMetrics.size / 2 - 14} L ${loupeMetrics.size / 2} ${loupeMetrics.size / 2 + 14}`} stroke="#ffffff" strokeWidth={1} />
                          </Svg>
                        </View>
                      </View>
                    ) : null}
                  </>
                ) : null}
              </View>
            </View>

            <View style={styles.maskToolBar}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  triggerHaptic();
                  setMaskTool("brush");
                }}
                style={[styles.maskToolButton, maskTool === "brush" ? styles.maskToolButtonActive : null]}
              >
                <BrushCleaning color={maskTool === "brush" ? "#FFFFFF" : "#0A0A0A"} size={20} strokeWidth={2} />
                <Text style={[styles.maskToolLabel, maskTool === "brush" ? styles.maskToolLabelActive : null]}>Brush</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  triggerHaptic();
                  setMaskTool("eraser");
                }}
                style={[styles.maskToolButton, maskTool === "eraser" ? styles.maskToolButtonActive : null]}
              >
                <Eraser color={maskTool === "eraser" ? "#FFFFFF" : "#0A0A0A"} size={20} strokeWidth={2} />
                <Text style={[styles.maskToolLabel, maskTool === "eraser" ? styles.maskToolLabelActive : null]}>Eraser</Text>
              </Pressable>

              <Pressable accessibilityRole="button" onPress={undoLastStroke} style={[styles.maskToolButton, styles.maskHistoryButton]}>
                <Undo2 color="#0A0A0A" size={18} strokeWidth={2.1} />
                <Text style={styles.maskToolLabel}>Undo</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={redoLastStroke}
                disabled={!canRedo}
                style={[styles.maskToolButton, styles.maskHistoryButton, !canRedo ? styles.maskToolButtonDisabled : null]}
              >
                <Redo2 color={canRedo ? "#0A0A0A" : "#A3A3A3"} size={18} strokeWidth={2.1} />
                <Text style={[styles.maskToolLabel, !canRedo ? styles.maskToolLabelDisabled : null]}>Redo</Text>
              </Pressable>
            </View>

            <View style={styles.maskSliderSection}>
              <View style={styles.maskSliderHeader}>
                <Text style={styles.maskSliderLabel}>
                  {maskTool === "eraser" ? t("wizard.replaceFlow.eraserWidth") : t("wizard.replaceFlow.brushWidth")}
                </Text>
                <View style={styles.maskSliderValueWrap}>
                  <View
                    style={[
                      styles.maskSliderPreview,
                      {
                        width: brushWidth,
                        height: brushWidth,
                        borderRadius: brushWidth / 2,
                        borderColor: maskTool === "eraser" ? "#0A0A0A" : DIAMOND_PILL_BLUE,
                        backgroundColor: maskTool === "eraser" ? "#FFFFFF" : MASK_TINT,
                      },
                    ]}
                  />
                  <Text style={styles.maskSliderValue}>{Math.round(brushWidth)}</Text>
                </View>
              </View>

                <View
                  style={styles.maskSliderCard}
                >
                  <GestureDetector gesture={sliderGesture}>
                    <View
                      style={styles.maskSliderWrap}
                      onLayout={(event) => {
                        const nextWidth = Math.round(event.nativeEvent.layout.width);
                        setSliderWidth((current) => (current === nextWidth ? current : nextWidth));
                      }}
                    >
                      <View style={styles.maskSliderTrack} />
                      <View
                        style={[
                          styles.maskSliderFill,
                          {
                            width: `${brushProgress * 100}%`,
                            backgroundColor: DIAMOND_PILL_BLUE,
                          },
                        ]}
                      />
                      <View
                        style={[
                          styles.maskSliderThumb,
                          {
                            left: Math.max(0, Math.min(brushProgress * sliderWidth - 16, Math.max(sliderWidth - 32, 0))),
                          },
                        ]}
                      >
                        <View style={styles.maskSliderThumbDot} />
                      </View>
                    </View>
                  </GestureDetector>
                </View>
              </View>
          </View>
        </ServiceWizardStepScreen>
      ) : null}

      {step === "prompt" ? (
        <ServiceWizardStepScreen
          footerOffset={96}
          contentContainerStyle={{
            paddingHorizontal: spacing.md,
            paddingTop: stickyHeaderMetrics.contentOffset,
            gap: spacing.md,
          }}
          footer={
            <ServiceContinueButton
              active={promptCanGenerate}
              label={t("wizard.replaceFlow.generateCta")}
              loading={isGenerating}
              onPress={handleGenerate}
              pulse={promptCanGenerate}
              supportingText={t("wizard.replaceFlow.supportingText", {creditsRemaining: creditsRemainingLabel})}
            />
          }
        >
          <StatusBar style="dark" />
          <View style={styles.copyBlock}>
            <Text style={styles.stepTitle}>{t("wizard.replaceFlow.promptTitle")}</Text>
            <Text style={styles.stepText}>{t("wizard.replaceFlow.promptBody")}</Text>
          </View>

          <View style={styles.promptCard}>
            <Text style={styles.promptLabel}>{t("wizard.replaceFlow.promptInputLabel")}</Text>
            <TextInput
              value={prompt}
              onChangeText={setPrompt}
              multiline
              placeholder={t("wizard.replaceFlow.promptPlaceholder")}
              placeholderTextColor="#9CA3AF"
              textAlignVertical="top"
              style={styles.promptInput}
            />
          </View>
        </ServiceWizardStepScreen>
      ) : null}

      {step === "processing" ? (
        <ServiceProcessingScreen
          imageUri={selectedImage?.uri ?? null}
          resultImageUri={generatedImageUrl}
          subtitlePhrases={generationStatusMessages}
          onCancel={() => {
            void handleCancelGeneration();
          }}
          cancelDisabled={!generationId || isCancellingGeneration}
          complete={processingComplete}
        />
      ) : null}

      {step === "result" ? (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: spacing.md,
            paddingTop: spacing.sm,
            paddingBottom: Math.max(34, 28),
            gap: spacing.md,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.resultIntro}>
            <Text style={styles.resultHeading}>{t("wizard.replaceFlow.result.heading")}</Text>
            <Text style={styles.resultSubheading}>{t("wizard.replaceFlow.result.subheading")}</Text>
          </View>

          <View style={styles.resultFrame}>
            {selectedImage && generatedImageUrl ? (
              <View style={{width: resultFrameWidth, aspectRatio, alignSelf: "center"}}>
                <Image source={{uri: selectedImage.uri}} style={styles.photoImage} contentFit="cover" />
                <View style={[absoluteFill, {width: `${comparisonPosition * 100}%`, overflow: "hidden"}]}>
                  <Image source={{uri: generatedImageUrl}} style={{width: resultFrameWidth, height: "100%"}} contentFit="cover" />
                </View>
                <GestureDetector gesture={comparisonGesture}>
                  <View style={{position: "absolute", top: 0, bottom: 0, left: `${comparisonPosition * 100}%`, marginLeft: -26, width: 52, alignItems: "center", justifyContent: "center"}}>
                    <View style={styles.resultDivider} />
                    <View style={styles.resultHandle}>
                      <MoveHorizontal color="#ffffff" size={18} />
                    </View>
                  </View>
                </GestureDetector>
              </View>
            ) : (
              <View style={styles.resultFallback}>
                <ActivityIndicator color="#ffffff" />
              </View>
            )}
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{t("wizard.replaceFlow.result.summaryLabel")}</Text>
            <Text style={styles.summaryTitle}>{prompt.trim()}</Text>
            <Text style={styles.summaryText}>{t("wizard.replaceFlow.result.summary")}</Text>
          </View>

          <View style={styles.resultActions}>
            <LuxPressable onPress={handleSaveResult} className={pointerClassName} style={{width: "100%"}} scale={0.99}>
              <View style={[styles.resultActionButton, styles.resultActionSave]}>
                <Text style={styles.resultActionSaveText}>{t("wizard.replaceFlow.result.saveToGallery")}</Text>
              </View>
            </LuxPressable>

            <LuxPressable onPress={handleShareResult} className={pointerClassName} style={{width: "100%"}} scale={0.99}>
              <View style={[styles.resultActionButton, styles.resultActionShare]}>
                <Text style={styles.resultActionShareText}>{t("wizard.replaceFlow.result.share")}</Text>
              </View>
            </LuxPressable>

            <LuxPressable onPress={resetProject} className={pointerClassName} style={{width: "100%"}} scale={0.99}>
              <View style={[styles.resultActionButton, styles.resultActionRetry]}>
                <Text style={styles.resultActionRetryText}>{t("wizard.replaceFlow.result.tryAgain")}</Text>
              </View>
            </LuxPressable>
          </View>
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
  copyBlock: {
    gap: spacing.sm,
  },
  stepTitle: {
    color: SERVICE_WIZARD_THEME.colors.textPrimary,
    ...SERVICE_WIZARD_THEME.typography.sectionTitle,
  },
  stepText: {
    color: SERVICE_WIZARD_THEME.colors.textMuted,
    ...SERVICE_WIZARD_THEME.typography.compactBodyText,
  },
  maskWorkspace: {
    alignSelf: "center",
    gap: spacing.md,
  },
  maskInstruction: {
    color: DIAMOND_PILL_BLUE,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    ...fonts.semibold,
  },
  maskCanvasWrap: {
    alignItems: "center",
  },
  maskCanvasFrame: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#050505",
    alignItems: "center",
    justifyContent: "center",
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  maskCursor: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1.5,
  },
  loupe: {
    position: "absolute",
    borderRadius: 14,
    padding: spacing.xs,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  loupeInner: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#060607",
  },
  maskToolBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    width: "100%",
  },
  maskToolButton: {
    flex: 1,
    minHeight: 62,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#E3E3E3",
    backgroundColor: "#FFFFFF",
  },
  maskToolLabel: {
    color: "#0A0A0A",
    fontSize: 11,
    lineHeight: 14,
    ...fonts.semibold,
  },
  maskToolLabelActive: {
    color: "#FFFFFF",
  },
  maskToolLabelDisabled: {
    color: "#A3A3A3",
  },
  maskToolButtonActive: {
    borderColor: DIAMOND_PILL_BLUE,
    backgroundColor: DIAMOND_PILL_BLUE,
  },
  maskToolButtonDisabled: {
    borderColor: "#ECECEC",
    backgroundColor: "#F4F4F4",
  },
  maskHistoryButton: {
    minHeight: 62,
  },
  maskSliderSection: {
    gap: 12,
  },
  maskSliderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  maskSliderCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    borderWidth: 1.5,
    alignSelf: "center",
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
    borderRadius: 14,
    backgroundColor: "#E5E5E5",
  },
  maskSliderFill: {
    position: "absolute",
    left: 0,
    height: 6,
    borderRadius: 14,
  },
  maskSliderThumb: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 14,
    backgroundColor: "#121212",
    alignItems: "center",
    justifyContent: "center",
  },
  maskSliderThumbDot: {
    width: 12,
    height: 12,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  promptCard: {
    minHeight: 220,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 14,
  },
  promptLabel: {
    color: "#0A0A0A",
    fontSize: 16,
    lineHeight: 20,
    ...fonts.semibold,
  },
  promptInput: {
    flex: 1,
    minHeight: 140,
    color: "#111827",
    fontSize: 15,
    lineHeight: 24,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  resultIntro: {
    alignItems: "center",
    gap: spacing.sm,
  },
  resultHeading: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.8,
    textAlign: "center",
  },
  resultSubheading: {
    color: "#b4b4bb",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 360,
  },
  resultFrame: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#000000",
  },
  resultDivider: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  resultHandle: {
    height: 46,
    width: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  resultFallback: {
    height: 320,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#0a0a0c",
    padding: spacing.md,
    gap: spacing.sm,
  },
  summaryLabel: {
    color: SERVICE_WIZARD_THEME.colors.accentText,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  summaryTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  summaryText: {
    color: "#b4b4bb",
    fontSize: 14,
    lineHeight: 22,
  },
  resultActions: {
    gap: 12,
  },
  resultActionButton: {
    marginHorizontal: 20,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  resultActionSave: {
    backgroundColor: DIAMOND_PILL_BLUE,
  },
  resultActionShare: {
    backgroundColor: "#05070A",
  },
  resultActionRetry: {
    backgroundColor: "#F0F0F0",
  },
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
});
