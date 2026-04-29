import {useMutation, useQuery} from "convex/react";
import {Asset} from "expo-asset";
import * as ImagePicker from "expo-image-picker";
import {useRouter} from "expo-router";
import {useCallback, useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {Alert} from "react-native";

import {uploadLocalFileToCloud} from "../lib/native-upload";
import {getLayoutWizardExamplePhotos, type WizardExamplePhoto} from "../lib/wizard-example-photos";
import {InteriorRedesignStepOne} from "./interior-redesign-step-one";
import {useProSuccess} from "./pro-success-context";
import {ServiceProcessingScreen} from "./service-processing-screen";
import {useViewerCredits} from "./viewer-credits-context";
import {useViewerSession} from "./viewer-session-context";
import {useWorkspaceDraft} from "./workspace-context";

type WizardStep = "intake" | "processing";

type SelectedImage = {
  uri: string;
  width: number;
  height: number;
  label?: string;
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

type ReadyGeneration = {
  generationId: string;
};

type LayoutOptimizationWizardProps = {
  onFlowActiveChange?: (isFlowActive: boolean) => void;
  onProcessingStateChange?: (isProcessing: boolean) => void;
};

const TABS_HOME_ROUTE = "/(tabs)/index";
const WORKSPACE_ROUTE = "/(tabs)/workspace";
const MAX_LAYOUT_PHOTOS = 6;
const CANCELLED_GENERATION_MESSAGE = "Cancelled by user.";
const SMART_SPACE_SCAN_MS = 5_000;
const SMART_SPACE_PLANNING_TITLE = "Smart Space Planning";
const SMART_SPACE_PLANNING_UPLOAD_BODY =
  "Gain more space and optimize your room's flow.";
const SMART_SPACE_PLANNING_PROMPT =
  "Spatial Optimization prompt for Azure GPT-Image-1: Re-arrange furniture to gain more space and fluid circulation. Maximize usable floor area and everyday comfort while preserving the exact architectural shell. Keep walls, windows, doors, fixed cabinetry, lighting direction, and room structure intact. Improve circulation paths, clearance around furniture, spatial balance, and visual calm while maintaining a realistic, high-end photorealistic result.";
const SMART_SPACE_PROCESSING_STATUSES = [
  "Launching neural render pipeline...",
  "Analyzing spatial flow...",
  "Optimizing furniture placement...",
  "Checking circulation clearance...",
] as const;

async function resolveExampleAsset(example: WizardExamplePhoto) {
  const asset = Asset.fromModule(example.source);
  if (!asset.localUri) {
    await asset.downloadAsync();
  }

  const uri = asset.localUri ?? asset.uri;
  if (!uri) {
    throw new Error("Example photo is unavailable.");
  }

  return {
    uri,
    width: asset.width ?? 1200,
    height: asset.height ?? 1200,
    label: example.label,
  } satisfies SelectedImage;
}

function simplifyRatio(width: number, height: number) {
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  if (w === h) return "1:1";
  const reduced = `${w / gcd(w, h)}:${h / gcd(w, h)}`;
  if (w > h) return reduced.startsWith("4:3") ? "4:3" : "16:9";
  return reduced.startsWith("3:4") ? "3:4" : "9:16";
}

export function LayoutOptimizationWizard({
  onFlowActiveChange,
  onProcessingStateChange,
}: LayoutOptimizationWizardProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { anonymousId, isReady: viewerReady } = useViewerSession();
  const { credits, setOptimisticCredits } = useViewerCredits();
  const { showToast } = useProSuccess();
  const {
    setDraftImage,
    setDraftImages,
    clearDraft,
  } = useWorkspaceDraft();

  const viewerArgs = useMemo(() => (anonymousId ? { anonymousId } : {}), [anonymousId]);
  const me = useQuery("users:me" as any, viewerReady ? viewerArgs : "skip") as MeResponse | null | undefined;
  const generationArchive = useQuery("generations:getUserArchive" as any, viewerReady ? viewerArgs : "skip") as
    | ArchiveGeneration[]
    | undefined;
  const createSourceUploadUrl = useMutation("generations:createSourceUploadUrl" as any);
  const startGeneration = useMutation("generations:startGeneration" as any);
  const cancelGeneration = useMutation("generations:cancelGeneration" as any);

  const [step, setStep] = useState<WizardStep>("intake");
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoadingExample, setIsLoadingExample] = useState<string | null>(null);
  const [, setIsPickingImage] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [isCancellingGeneration, setIsCancellingGeneration] = useState(false);
  const [processingStartedAt, setProcessingStartedAt] = useState<number | null>(null);
  const [cooldownRemainingMs, setCooldownRemainingMs] = useState(0);
  const [readyGeneration, setReadyGeneration] = useState<ReadyGeneration | null>(null);
  const layoutExamples = useMemo(() => getLayoutWizardExamplePhotos(t), [i18n.language, t]);
  const processingStatusMessages = useMemo(
    () => SMART_SPACE_PROCESSING_STATUSES.map((status) => status),
    [],
  );

  const activeImage = selectedImages[activeIndex] ?? selectedImages[0] ?? null;
  const navigateToPortfolioEditor = useCallback((nextGenerationId: string) => {
    clearDraft();
    router.replace({
      pathname: WORKSPACE_ROUTE as any,
      params: {
        service: "layout",
        boardView: "editor",
        boardItemId: nextGenerationId,
        entrySource: "smart-space-planning",
      },
    });
  }, [clearDraft, router]);

  useEffect(() => {
    setDraftImages(selectedImages.length > 0 ? selectedImages.map((image) => ({ uri: image.uri, label: image.label })) : null);
    setDraftImage(activeImage ? { uri: activeImage.uri, label: activeImage.label } : null);
  }, [activeImage, selectedImages, setDraftImage, setDraftImages]);

  useEffect(() => {
    onFlowActiveChange?.(true);
    return () => onFlowActiveChange?.(false);
  }, [onFlowActiveChange]);

  useEffect(() => {
    onProcessingStateChange?.(step === "processing");
  }, [onProcessingStateChange, step]);

  useEffect(() => {
    if (!generationId || !generationArchive) {
      return;
    }

    const generation = generationArchive.find((item) => item._id === generationId);
    if (!generation) {
      return;
    }

    if (generation.status === "ready" && generation.imageUrl) {
      setIsGenerating(false);
      setIsCancellingGeneration(false);
      setReadyGeneration({
        generationId: generation._id,
      });
      return;
    }

    if (generation.status === "failed") {
      setGenerationId(null);
      setIsGenerating(false);
      setIsCancellingGeneration(false);

      if (generation.errorMessage === CANCELLED_GENERATION_MESSAGE) {
        setProcessingStartedAt(null);
        setCooldownRemainingMs(0);
        setReadyGeneration(null);
        setStep("intake");
        return;
      }

      setProcessingStartedAt(null);
      setCooldownRemainingMs(0);
      setReadyGeneration(null);
      setStep("intake");
      showToast(generation.errorMessage ?? "Unable to optimize the layout right now.");
    }
  }, [generationArchive, generationId, showToast]);

  useEffect(() => {
    if (step !== "processing" || !processingStartedAt) {
      setCooldownRemainingMs(0);
      return;
    }

    const syncRemaining = () => {
      setCooldownRemainingMs(Math.max(processingStartedAt + SMART_SPACE_SCAN_MS - Date.now(), 0));
    };

    syncRemaining();
    const interval = setInterval(syncRemaining, 250);

    return () => clearInterval(interval);
  }, [processingStartedAt, step]);

  useEffect(() => {
    if (!readyGeneration) {
      return;
    }

    const remainingMs = !processingStartedAt
      ? 0
      : Math.max(processingStartedAt + SMART_SPACE_SCAN_MS - Date.now(), 0);

    if (remainingMs <= 0) {
      setGenerationId(null);
      navigateToPortfolioEditor(readyGeneration.generationId);
      return;
    }

    const timeout = setTimeout(() => {
      setGenerationId(null);
      navigateToPortfolioEditor(readyGeneration.generationId);
    }, remainingMs);

    return () => clearTimeout(timeout);
  }, [navigateToPortfolioEditor, processingStartedAt, readyGeneration]);

  const syncSelectedImages = useCallback((updater: (current: SelectedImage[]) => SelectedImage[]) => {
    setSelectedImages((current) => {
      const next = updater(current);
      if (next.length === 0) {
        setActiveIndex(0);
        return [];
      }

      setActiveIndex((currentIndex) => Math.min(currentIndex, next.length - 1));
      return next;
    });
  }, []);

  const handleAddLibraryPhotos = useCallback(async () => {
    const remainingSlots = MAX_LAYOUT_PHOTOS - selectedImages.length;
    if (remainingSlots <= 0) {
      return false;
    }

    setIsPickingImage(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Photo access needed", "Enable photo library access to upload room photos.");
        return false;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
        allowsEditing: false,
        allowsMultipleSelection: remainingSlots > 1,
        selectionLimit: remainingSlots,
      });

      if (result.canceled || result.assets.length === 0) {
        return false;
      }

      const nextImages = result.assets.slice(0, remainingSlots).map((asset, index) => ({
        uri: asset.uri,
        width: asset.width ?? 1200,
        height: asset.height ?? 1200,
        label: index === 0 && selectedImages.length === 0 ? "Source Photo" : `Reference ${selectedImages.length + index}`,
      }));

      syncSelectedImages((current) => [...current, ...nextImages].slice(0, MAX_LAYOUT_PHOTOS));
      return true;
    } finally {
      setIsPickingImage(false);
    }
  }, [selectedImages.length, syncSelectedImages]);

  const handleTakePhoto = useCallback(async () => {
    if (selectedImages.length >= MAX_LAYOUT_PHOTOS) {
      return false;
    }

    setIsPickingImage(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Camera access needed", "Enable camera access to capture a room photo.");
        return false;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 1,
        allowsEditing: false,
      });

      if (result.canceled || result.assets.length === 0) {
        return false;
      }

      const asset = result.assets[0];
      syncSelectedImages((current) => [
        ...current,
        {
          uri: asset.uri,
          width: asset.width ?? 1200,
          height: asset.height ?? 1200,
          label: current.length === 0 ? "Source Photo" : `Reference ${current.length}`,
        },
      ].slice(0, MAX_LAYOUT_PHOTOS));
      return true;
    } finally {
      setIsPickingImage(false);
    }
  }, [selectedImages.length, syncSelectedImages]);

  const handleExamplePress = useCallback(async (example: WizardExamplePhoto) => {
    setIsLoadingExample(example.id);
    try {
      const resolved = await resolveExampleAsset(example);
      setSelectedImages([resolved]);
      setActiveIndex(0);
    } catch (error) {
      Alert.alert("Example unavailable", error instanceof Error ? error.message : "This example photo could not be opened.");
    } finally {
      setIsLoadingExample(null);
    }
  }, []);

  const handleRemovePhoto = useCallback((index: number) => {
    syncSelectedImages((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }, [syncSelectedImages]);

  const handleCancelGeneration = useCallback(async () => {
    if (!generationId || isCancellingGeneration) {
      return;
    }

    setIsCancellingGeneration(true);
    try {
      await cancelGeneration({ anonymousId: anonymousId ?? undefined, id: generationId });
      setOptimisticCredits(Math.max(credits, 0));
    } catch {
      showToast("Unable to cancel right now.");
    } finally {
      setIsCancellingGeneration(false);
    }
  }, [anonymousId, cancelGeneration, credits, generationId, isCancellingGeneration, setOptimisticCredits, showToast]);

  const handleGenerate = useCallback(async () => {
    if (!viewerReady || !activeImage || selectedImages.length === 0 || isGenerating) {
      return;
    }

    setIsGenerating(true);
    setReadyGeneration(null);
    setProcessingStartedAt(Date.now());
    setCooldownRemainingMs(SMART_SPACE_SCAN_MS);
    setStep("processing");

    try {
      const sourceUploadUrl = await createSourceUploadUrl({ anonymousId: anonymousId ?? undefined });
      const sourceImageStorageId = await uploadLocalFileToCloud(sourceUploadUrl, selectedImages[0]!.uri, {
        fallbackMimeType: "image/jpeg",
        errorLabel: "source image",
      });

      const referenceImageStorageIds: string[] = [];
      for (const image of selectedImages.slice(1)) {
        const referenceUploadUrl = await createSourceUploadUrl({ anonymousId: anonymousId ?? undefined });
        const storageId = await uploadLocalFileToCloud(referenceUploadUrl, image.uri, {
          fallbackMimeType: "image/jpeg",
          errorLabel: "reference image",
        });
        referenceImageStorageIds.push(storageId);
      }

      const response = await startGeneration({
        anonymousId: anonymousId ?? undefined,
        imageStorageId: sourceImageStorageId,
        referenceImageStorageIds: referenceImageStorageIds.length > 0 ? referenceImageStorageIds : undefined,
        serviceType: "layout",
        selection: "Spatial Optimization",
        roomType: "Room",
        displayStyle: "Spatial Optimization",
        customPrompt: [
          SMART_SPACE_PLANNING_PROMPT,
          referenceImageStorageIds.length > 0
            ? "Use the additional reference photos to understand adjacency, proportions, and circulation around the same room."
            : undefined,
        ].filter(Boolean).join(" "),
        aspectRatio: simplifyRatio(activeImage.width, activeImage.height),
        smartSuggest: true,
      });

      setGenerationId(response.generationId);
      setOptimisticCredits(response.creditsRemaining ?? Math.max(credits - 1, 0));
    } catch (error) {
      setIsGenerating(false);
      setProcessingStartedAt(null);
      setCooldownRemainingMs(0);
      setStep("intake");
      Alert.alert("Generation unavailable", error instanceof Error ? error.message : "Unable to optimize the layout right now.");
    }
  }, [
    activeImage,
    anonymousId,
    createSourceUploadUrl,
    credits,
    isGenerating,
    selectedImages,
    setOptimisticCredits,
    startGeneration,
    viewerReady,
  ]);

  const handleClose = useCallback(() => {
    clearDraft();
    router.replace(TABS_HOME_ROUTE as any);
  }, [clearDraft, router]);

  if (step === "processing") {
    const cooldownSeconds = Math.ceil(cooldownRemainingMs / 1000);
    const processingEtaLabel = readyGeneration
      ? `Finalizing spatial optimization${cooldownSeconds > 0 ? ` in ${cooldownSeconds}s` : "..." }`
      : `Neural scan completes in ${Math.max(cooldownSeconds, 1)}s`;

    return (
      <ServiceProcessingScreen
        imageUri={activeImage?.uri ?? null}
        resultImageUri={null}
        subtitlePhrases={processingStatusMessages}
        title="Neural Render Pipeline"
        etaLabel={processingEtaLabel}
        previewLabel="Before"
        scanDurationMs={SMART_SPACE_SCAN_MS}
        onCancel={() => {
          void handleCancelGeneration();
        }}
        cancelDisabled={!generationId || isCancellingGeneration}
        complete={Boolean(readyGeneration)}
      />
    );
  }

  return (
    <InteriorRedesignStepOne
      creditCount={me?.credits ?? credits}
      currentDisplayIndex={activeIndex}
      emptyStateSubtitle={SMART_SPACE_PLANNING_UPLOAD_BODY}
      examplePhotos={layoutExamples}
      headerTitle={SMART_SPACE_PLANNING_TITLE}
      loadingExampleId={isLoadingExample}
      onChooseFromGallery={handleAddLibraryPhotos}
      onContinue={() => {
        void handleGenerate();
      }}
      onExit={handleClose}
      onFocusPhoto={setActiveIndex}
      onRemovePhoto={handleRemovePhoto}
      onSelectExample={(example) => {
        void handleExamplePress(example);
      }}
      onTakePhoto={handleTakePhoto}
      selectedPhotos={selectedImages}
      maxPhotos={MAX_LAYOUT_PHOTOS}
      showPhotoCount={false}
      totalSteps={4}
    />
  );
}
