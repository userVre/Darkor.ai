import {Plus, X} from "@/components/material-icons";
import {useMutation, useQuery} from "convex/react";
import {Asset} from "expo-asset";
import {Image} from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {useRouter} from "expo-router";
import {MotiView} from "moti";
import {useCallback, useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {uploadLocalFileToCloud} from "../lib/native-upload";
import {getLayoutWizardExamplePhotos, type WizardExamplePhoto} from "../lib/wizard-example-photos";
import {spacing} from "../styles/spacing";
import {fonts} from "../styles/typography";
import {DiamondCreditIcon} from "./diamond-credit-pill";
import {DIAMOND_PILL_BLUE} from "./diamond-credit-pill";
import {LuxPressable} from "./lux-pressable";
import {useProSuccess} from "./pro-success-context";
import {ServiceContinueButton} from "./service-continue-button";
import {ServiceProcessingScreen} from "./service-processing-screen";
import {ServiceWizardHeader} from "./service-wizard-header";
import {ServiceWizardStepScreen} from "./service-wizard-shared";
import {getStickyStepHeaderMetricsWithProgress} from "./sticky-step-header";
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
const MAX_LAYOUT_PHOTOS = 3;
const CANCELLED_GENERATION_MESSAGE = "Cancelled by user.";
const FREE_LAYOUT_COOLDOWN_MS = 5_000;
const SMART_SPACE_PLANNING_TITLE = "Smart Space Planning";
const SMART_SPACE_PLANNING_PROMPT =
  "Furniture Rearrangement instructions for Azure GPT-Image-1: Rearrange the furniture layout to maximize usable floor area and everyday comfort while preserving the core architecture. Keep walls, windows, doors, and the room structure intact. Improve circulation flow and spatial balance while maintaining a realistic, high-end photorealistic result.";
const SMART_SPACE_PROCESSING_STATUSES = [
  "Analyzing spatial flow...",
  "Optimizing furniture placement...",
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
  const insets = useSafeAreaInsets();
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
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [isCancellingGeneration, setIsCancellingGeneration] = useState(false);
  const [processingStartedAt, setProcessingStartedAt] = useState<number | null>(null);
  const [cooldownRemainingMs, setCooldownRemainingMs] = useState(0);
  const [readyGeneration, setReadyGeneration] = useState<ReadyGeneration | null>(null);
  const layoutExamples = useMemo(() => getLayoutWizardExamplePhotos(t), [i18n.language, t]);
  const headerMetrics = useMemo(() => getStickyStepHeaderMetricsWithProgress(insets.top, false), [insets.top]);
  const isProViewer = Boolean(me?.hasPaidAccess || (me?.subscriptionType && me.subscriptionType !== "free"));
  const processingStatusMessages = useMemo(
    () => SMART_SPACE_PROCESSING_STATUSES.map((status) => status),
    [],
  );

  const activeImage = selectedImages[activeIndex] ?? selectedImages[0] ?? null;
  const canContinue = selectedImages.length > 0 && !isGenerating;

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
    if (step !== "processing" || !processingStartedAt || isProViewer) {
      setCooldownRemainingMs(0);
      return;
    }

    const syncRemaining = () => {
      setCooldownRemainingMs(Math.max(processingStartedAt + FREE_LAYOUT_COOLDOWN_MS - Date.now(), 0));
    };

    syncRemaining();
    const interval = setInterval(syncRemaining, 250);

    return () => clearInterval(interval);
  }, [isProViewer, processingStartedAt, step]);

  useEffect(() => {
    if (!readyGeneration) {
      return;
    }

    const remainingMs = isProViewer || !processingStartedAt
      ? 0
      : Math.max(processingStartedAt + FREE_LAYOUT_COOLDOWN_MS - Date.now(), 0);

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
  }, [isProViewer, navigateToPortfolioEditor, processingStartedAt, readyGeneration]);

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
      return;
    }

    setIsPickingImage(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Photo access needed", "Enable photo library access to upload room photos.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
        allowsEditing: false,
        allowsMultipleSelection: remainingSlots > 1,
        selectionLimit: remainingSlots,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const nextImages = result.assets.slice(0, remainingSlots).map((asset, index) => ({
        uri: asset.uri,
        width: asset.width ?? 1200,
        height: asset.height ?? 1200,
        label: index === 0 && selectedImages.length === 0 ? "Source Photo" : `Reference ${selectedImages.length + index}`,
      }));

      syncSelectedImages((current) => [...current, ...nextImages].slice(0, MAX_LAYOUT_PHOTOS));
    } finally {
      setIsPickingImage(false);
    }
  }, [selectedImages.length, syncSelectedImages]);

  const handleTakePhoto = useCallback(async () => {
    if (selectedImages.length >= MAX_LAYOUT_PHOTOS) {
      return;
    }

    setIsPickingImage(true);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Camera access needed", "Enable camera access to capture a room photo.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 1,
        allowsEditing: false,
      });

      if (result.canceled || result.assets.length === 0) {
        return;
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
    } finally {
      setIsPickingImage(false);
    }
  }, [selectedImages.length, syncSelectedImages]);

  const handleAddPhoto = useCallback(() => {
    Alert.alert("Add photo", "Choose how to add a room photo.", [
      { text: t("common.actions.cancel"), style: "cancel" },
      { text: t("common.actions.takePhoto"), onPress: () => void handleTakePhoto() },
      { text: "Photo Library", onPress: () => void handleAddLibraryPhotos() },
    ]);
  }, [handleAddLibraryPhotos, handleTakePhoto, t]);

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
    setCooldownRemainingMs(isProViewer ? 0 : FREE_LAYOUT_COOLDOWN_MS);

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
        selection: "Smart Space Planning",
        roomType: "Room",
        displayStyle: SMART_SPACE_PLANNING_TITLE,
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
      setStep("processing");
    } catch (error) {
      setIsGenerating(false);
      setProcessingStartedAt(null);
      setCooldownRemainingMs(0);
      Alert.alert("Generation unavailable", error instanceof Error ? error.message : "Unable to optimize the layout right now.");
    }
  }, [
    activeImage,
    anonymousId,
    createSourceUploadUrl,
    credits,
    isProViewer,
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
    const processingEtaLabel = isProViewer
      ? "Pro render unlocked instantly."
      : readyGeneration
        ? `Finalizing your free render${cooldownSeconds > 0 ? ` in ${cooldownSeconds}s` : "..." }`
        : `Free render unlocks in ${Math.max(cooldownSeconds, 1)}s`;

    return (
      <ServiceProcessingScreen
        imageUri={activeImage?.uri ?? null}
        resultImageUri={null}
        subtitlePhrases={processingStatusMessages}
        title="AI is crafting your architectural masterpiece..."
        etaLabel={processingEtaLabel}
        previewLabel="Before"
        onCancel={() => {
          void handleCancelGeneration();
        }}
        cancelDisabled={!generationId || isCancellingGeneration}
        complete={Boolean(readyGeneration)}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <ServiceWizardHeader
        title={SMART_SPACE_PLANNING_TITLE}
        step={1}
        totalSteps={1}
        showProgress={false}
        creditCount={me?.credits ?? credits}
        leftAccessory={(
          <View style={styles.headerDiamondWrap}>
            <DiamondCreditIcon primaryColor={DIAMOND_PILL_BLUE} size={20} />
          </View>
        )}
        onClose={handleClose}
      />

      <ServiceWizardStepScreen
        footer={
          <View style={styles.footerWrap}>
            <View style={styles.centeredButton}>
              <ServiceContinueButton
                active={canContinue}
                attention={canContinue}
                pulse={canContinue}
                loading={isGenerating}
                label={t("common.actions.continue")}
                onPress={() => {
                  void handleGenerate();
                }}
              />
            </View>
          </View>
        }
        footerOffset={Math.max(insets.bottom + 8, 18)}
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingTop: headerMetrics.contentOffset,
          paddingBottom: spacing.xl,
          gap: spacing.lg,
        }}
      >
        <LuxPressable
          onPress={() => {
            if (!activeImage) {
              handleAddPhoto();
            }
          }}
          disabled={Boolean(activeImage)}
          style={styles.mainPreviewPressable}
          scale={activeImage ? 1 : 0.985}
        >
          <View style={styles.mainPreview}>
            {activeImage ? (
              <>
                <Image source={{ uri: activeImage.uri }} style={styles.mainPreviewImage} contentFit="cover" cachePolicy="memory-disk" transition={140} />
                <LuxPressable
                  onPress={() => handleRemovePhoto(activeIndex)}
                  style={styles.removeButton}
                  scale={0.96}
                >
                  <View style={styles.removeButtonInner}>
                    <X color="#0F172A" size={16} strokeWidth={2.2} />
                  </View>
                </LuxPressable>
              </>
            ) : (
              <View style={styles.emptyPreviewState}>
                <View style={styles.emptyPlusBadge}>
                  <Plus color={DIAMOND_PILL_BLUE} size={28} strokeWidth={2.1} />
                </View>
                <Text style={styles.emptyPreviewTitle}>Begin Your Transformation</Text>
                <Text style={styles.emptyPreviewBody}>Gain More Space</Text>
                <View style={styles.uploadCta}>
                  <Text style={styles.uploadCtaText}>+ Upload</Text>
                </View>
              </View>
            )}
          </View>
        </LuxPressable>

        <View style={styles.thumbnailRailWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbnailRail}
            decelerationRate="fast"
          >
            {selectedImages.map((image, index) => {
              const active = index === activeIndex;
              return (
                <View key={`${image.uri}-${index}`} style={styles.thumbItem}>
                  <LuxPressable
                    onPress={() => setActiveIndex(index)}
                    style={styles.thumbPressable}
                    scale={0.98}
                  >
                    <View style={[styles.thumbFrame, active ? styles.thumbFrameActive : null]}>
                      <Image source={{ uri: image.uri }} style={styles.thumbImage} contentFit="cover" cachePolicy="memory-disk" transition={120} />
                    </View>
                  </LuxPressable>
                  <LuxPressable
                    onPress={() => handleRemovePhoto(index)}
                    style={styles.thumbRemoveButton}
                    scale={0.96}
                  >
                    <View style={styles.thumbRemoveButtonInner}>
                      <X color="#FFFFFF" size={10} strokeWidth={2.6} />
                    </View>
                  </LuxPressable>
                </View>
              );
            })}

            {selectedImages.length < MAX_LAYOUT_PHOTOS ? (
              <LuxPressable onPress={handleAddPhoto} style={styles.thumbPressable} scale={0.98}>
                <View style={styles.addThumbFrame}>
                  {isPickingImage ? (
                    <ActivityIndicator color={DIAMOND_PILL_BLUE} />
                  ) : (
                    <Plus color={DIAMOND_PILL_BLUE} size={26} strokeWidth={2.1} />
                  )}
                </View>
              </LuxPressable>
            ) : null}
          </ScrollView>
        </View>

        <View style={styles.examplesBlock}>
          <Text style={styles.examplesTitle}>Example Photos</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            contentContainerStyle={styles.examplesRail}
          >
            {layoutExamples.map((example, index) => (
              <MotiView
                key={example.id}
                from={{ opacity: 0, translateX: 12 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{ duration: 280, delay: index * 40, type: "timing" }}
              >
                <LuxPressable
                  onPress={() => {
                    void handleExamplePress(example);
                  }}
                  style={styles.examplePressable}
                  scale={0.985}
                >
                  <View style={styles.exampleCard}>
                    <Image source={example.source} style={styles.exampleImage} contentFit="cover" cachePolicy="memory-disk" transition={120} />
                    {isLoadingExample === example.id ? (
                      <View style={styles.exampleLoading}>
                        <ActivityIndicator color="#FFFFFF" />
                      </View>
                    ) : null}
                  </View>
                  <LuxPressable
                    onPress={() => {
                      void handleExamplePress(example);
                    }}
                    style={styles.exampleAddButton}
                    scale={0.96}
                  >
                    <View style={styles.exampleAddButtonInner}>
                      <Plus color="#FFFFFF" size={14} strokeWidth={2.5} />
                    </View>
                  </LuxPressable>
                </LuxPressable>
              </MotiView>
            ))}
          </ScrollView>
        </View>
      </ServiceWizardStepScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  headerDiamondWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  mainPreviewPressable: {
    width: "100%",
  },
  mainPreview: {
    width: "100%",
    aspectRatio: 1.05,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    backgroundColor: "#F8FAFC",
    overflow: "hidden",
  },
  mainPreviewImage: {
    width: "100%",
    height: "100%",
  },
  emptyPreviewState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  emptyPlusBadge: {
    width: 84,
    height: 84,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(37, 99, 235, 0.08)",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(37, 99, 235, 0.42)",
  },
  emptyPreviewTitle: {
    color: "#0F172A",
    fontSize: 24,
    lineHeight: 30,
    textAlign: "center",
    ...fonts.semibold,
  },
  emptyPreviewBody: {
    color: "#64748B",
    fontSize: 15,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 260,
  },
  uploadCta: {
    marginTop: spacing.sm,
    minHeight: 48,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0F172A",
  },
  uploadCtaText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 18,
    ...fonts.semibold,
  },
  removeButton: {
    position: "absolute",
    top: 14,
    right: 14,
  },
  removeButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  thumbnailRailWrap: {
    marginTop: 2,
  },
  thumbnailRail: {
    gap: 12,
    paddingRight: 4,
  },
  thumbItem: {
    width: 88,
    height: 88,
  },
  thumbPressable: {
    width: "100%",
    height: "100%",
  },
  thumbFrame: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(148, 163, 184, 0.3)",
    backgroundColor: "#F8FAFC",
  },
  thumbFrameActive: {
    borderColor: DIAMOND_PILL_BLUE,
    boxShadow: "0px 0px 0px 1px rgba(37,99,235,0.14), 0px 14px 28px rgba(37,99,235,0.18)",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  thumbRemoveButton: {
    position: "absolute",
    top: -5,
    right: -5,
  },
  thumbRemoveButtonInner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.92)",
  },
  addThumbFrame: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(37,99,235,0.42)",
    backgroundColor: "rgba(37,99,235,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  examplesBlock: {
    gap: spacing.md,
  },
  examplesTitle: {
    color: "#0F172A",
    fontSize: 18,
    lineHeight: 22,
    ...fonts.bold,
  },
  examplesRail: {
    gap: 14,
    paddingRight: 6,
  },
  examplePressable: {
    width: 176,
    height: 208,
  },
  exampleCard: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    borderRadius: 20,
  },
  exampleImage: {
    width: "100%",
    height: "100%",
  },
  exampleLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.22)",
  },
  exampleAddButton: {
    position: "absolute",
    right: 10,
    bottom: 10,
  },
  exampleAddButtonInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.78)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
  },
  footerWrap: {
    alignItems: "center",
  },
  centeredButton: {
    width: "100%",
    maxWidth: 280,
  },
});
