import {Plus, X} from "@/components/material-icons";
import {useMutation, useQuery} from "convex/react";
import {Asset} from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import {Image} from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import {useRouter} from "expo-router";
import {MotiView} from "moti";
import {useCallback, useEffect, useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {ActivityIndicator, Alert, ScrollView, Share, StyleSheet, Text, View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {uploadLocalFileToCloud} from "../lib/native-upload";
import {getLayoutWizardExamplePhotos, type WizardExamplePhoto} from "../lib/wizard-example-photos";
import {spacing} from "../styles/spacing";
import {fonts} from "../styles/typography";
import {DIAMOND_PILL_BLUE} from "./diamond-credit-pill";
import {LuxPressable} from "./lux-pressable";
import {useProSuccess} from "./pro-success-context";
import {ServiceContinueButton} from "./service-continue-button";
import {ServiceProcessingScreen, useGenerationStatusMessages} from "./service-processing-screen";
import {ServiceWizardHeader} from "./service-wizard-header";
import {ServiceWizardStepScreen} from "./service-wizard-shared";
import {getStickyStepHeaderMetrics} from "./sticky-step-header";
import {useViewerCredits} from "./viewer-credits-context";
import {useViewerSession} from "./viewer-session-context";
import {useWorkspaceDraft} from "./workspace-context";

type WizardStep = "intake" | "processing" | "result";

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

type LayoutOptimizationWizardProps = {
  onFlowActiveChange?: (isFlowActive: boolean) => void;
  onProcessingStateChange?: (isProcessing: boolean) => void;
};

const TABS_HOME_ROUTE = "/(tabs)/index";
const MAX_LAYOUT_PHOTOS = 3;
const CANCELLED_GENERATION_MESSAGE = "Cancelled by user.";

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
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [isCancellingGeneration, setIsCancellingGeneration] = useState(false);
  const generationStatusMessages = useGenerationStatusMessages();
  const layoutExamples = useMemo(() => getLayoutWizardExamplePhotos(t), [i18n.language, t]);
  const localizedTitle = t("home.tools.smartSpacePlanning.title");
  const headerMetrics = useMemo(() => getStickyStepHeaderMetrics(insets.top), [insets.top]);

  const activeImage = selectedImages[activeIndex] ?? selectedImages[0] ?? null;
  const canContinue = selectedImages.length > 0 && !isGenerating;

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
      setGeneratedImageUrl(generation.imageUrl);
      setGenerationId(null);
      setIsGenerating(false);
      setIsCancellingGeneration(false);
      setProcessingComplete(true);
      setStep("result");
      return;
    }

    if (generation.status === "failed") {
      setGenerationId(null);
      setIsGenerating(false);
      setIsCancellingGeneration(false);

      if (generation.errorMessage === CANCELLED_GENERATION_MESSAGE) {
        setStep("intake");
        return;
      }

      setStep("intake");
      showToast(generation.errorMessage ?? "Unable to optimize the layout right now.");
    }
  }, [generationArchive, generationId, showToast]);

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
    setProcessingComplete(false);
    setGeneratedImageUrl(null);

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
        selection: "Furniture Rearrangement",
        roomType: "Room",
        displayStyle: "Layout Optimization",
        customPrompt: [
          "Optimize the furniture arrangement for maximum comfort, ergonomic spacing, and spatial fluidity.",
          "Preserve the same room architecture, window placement, lighting direction, and overall furniture inventory.",
          "Improve circulation paths, reduce visual clutter, create a stronger focal point, and keep the result believable and premium.",
          referenceImageStorageIds.length > 0 ? "Use the additional reference photos to understand adjacency, proportions, and circulation around the same room." : undefined,
        ].filter(Boolean).join(" "),
        aspectRatio: simplifyRatio(activeImage.width, activeImage.height),
        smartSuggest: true,
      });

      setGenerationId(response.generationId);
      setOptimisticCredits(response.creditsRemaining ?? Math.max(credits - 1, 0));
      setStep("processing");
    } catch (error) {
      setIsGenerating(false);
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

  const handleSaveResult = useCallback(async () => {
    if (!generatedImageUrl) {
      return;
    }

    let tempUri: string | null = null;
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Photo access needed", "Allow photo library access to save your render to the device.");
        return;
      }

      if (generatedImageUrl.startsWith("file://")) {
        await MediaLibrary.saveToLibraryAsync(generatedImageUrl);
        showToast(t("common.states.savedToGallery"));
        return;
      }

      const targetUri = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? ""}layout-optimization-${Date.now()}.jpg`;
      const download = await FileSystem.downloadAsync(generatedImageUrl, targetUri);
      tempUri = download.uri;
      await MediaLibrary.saveToLibraryAsync(download.uri);
      showToast(t("common.states.savedToGallery"));
    } catch (error) {
      Alert.alert("Save unavailable", error instanceof Error ? error.message : "Unable to save the result.");
    } finally {
      if (tempUri) {
        await FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => undefined);
      }
    }
  }, [generatedImageUrl, showToast, t]);

  const handleShareResult = useCallback(async () => {
    if (!generatedImageUrl) {
      return;
    }

    let tempUri: string | null = null;
    try {
      let shareUri = generatedImageUrl;
      if (!generatedImageUrl.startsWith("file://")) {
        const targetUri = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? ""}layout-optimization-share-${Date.now()}.jpg`;
        const download = await FileSystem.downloadAsync(generatedImageUrl, targetUri);
        tempUri = download.uri;
        shareUri = download.uri;
      }

      await Share.share({
        url: shareUri,
        message: "Layout Optimization result",
      });
    } catch (error) {
      Alert.alert("Share unavailable", error instanceof Error ? error.message : "Unable to share the result.");
    } finally {
      if (tempUri) {
        await FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => undefined);
      }
    }
  }, [generatedImageUrl]);

  const handleReset = useCallback(() => {
    setStep("intake");
    setSelectedImages([]);
    setActiveIndex(0);
    setGeneratedImageUrl(null);
    setGenerationId(null);
    setIsGenerating(false);
    setProcessingComplete(false);
    setIsCancellingGeneration(false);
    clearDraft();
  }, [clearDraft]);

  const handleClose = useCallback(() => {
    clearDraft();
    router.replace(TABS_HOME_ROUTE as any);
  }, [clearDraft, router]);

  if (step === "processing") {
    return (
      <ServiceProcessingScreen
        imageUri={activeImage?.uri ?? null}
        resultImageUri={generatedImageUrl}
        subtitlePhrases={generationStatusMessages}
        onCancel={() => {
          void handleCancelGeneration();
        }}
        cancelDisabled={!generationId || isCancellingGeneration}
        complete={processingComplete}
      />
    );
  }

  if (step === "result") {
    return (
      <View style={styles.screen}>
        <ServiceWizardHeader
          title={localizedTitle}
          step={1}
          totalSteps={1}
          creditCount={me?.credits ?? credits}
          onClose={handleClose}
        />

        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            paddingHorizontal: spacing.md,
            paddingTop: headerMetrics.contentOffset,
            paddingBottom: Math.max(insets.bottom + 32, 48),
            gap: spacing.md,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.resultIntro}>
            <Text style={styles.resultTitle}>{localizedTitle}</Text>
            <Text style={styles.resultBody}>
              Your room has been rearranged for better circulation, stronger balance, and more comfortable spacing.
            </Text>
          </View>

          <View style={styles.resultFrame}>
            {generatedImageUrl ? (
              <Image source={{ uri: generatedImageUrl }} style={styles.resultImage} contentFit="cover" cachePolicy="memory-disk" transition={180} />
            ) : (
              <View style={styles.resultFallback}>
                <ActivityIndicator color={DIAMOND_PILL_BLUE} />
              </View>
            )}
          </View>

          {activeImage ? (
            <View style={styles.sourceCard}>
              <Text style={styles.sourceLabel}>Source Photo</Text>
              <View style={styles.sourcePreview}>
                <Image source={{ uri: activeImage.uri }} style={styles.sourcePreviewImage} contentFit="cover" cachePolicy="memory-disk" />
              </View>
            </View>
          ) : null}

          <View style={styles.resultActions}>
            <View style={styles.resultActionRow}>
              <View style={styles.resultActionButton}>
                <ServiceContinueButton
                  active
                  label={t("profile.saveToGallery")}
                  onPress={() => {
                    void handleSaveResult();
                  }}
                />
              </View>
              <View style={styles.resultActionButton}>
                <ServiceContinueButton
                  active
                  label={t("wizard.floorFlow.result.share")}
                  onPress={() => {
                    void handleShareResult();
                  }}
                />
              </View>
            </View>
            <View style={styles.retryButtonWrap}>
              <View style={styles.resultActionButton}>
                <ServiceContinueButton
                  active
                  label={t("wizard.floorFlow.result.tryAgain")}
                  onPress={handleReset}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ServiceWizardHeader
        title={localizedTitle}
        step={1}
        totalSteps={1}
        creditCount={me?.credits ?? credits}
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
          gap: spacing.md,
        }}
      >
        <View style={styles.introCopy}>
          <Text style={styles.introTitle}>{t("wizard.stepOne.title")}</Text>
          <Text style={styles.introBody}>
            Upload a photo to optimize your furniture layout and flow.
          </Text>
        </View>

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
                <Text style={styles.emptyPreviewTitle}>Add your room photo</Text>
                <Text style={styles.emptyPreviewBody}>Use one main image and up to two extra references.</Text>
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
                <LuxPressable
                  key={`${image.uri}-${index}`}
                  onPress={() => setActiveIndex(index)}
                  style={styles.thumbPressable}
                  scale={0.98}
                >
                  <View style={[styles.thumbFrame, active ? styles.thumbFrameActive : null]}>
                    <Image source={{ uri: image.uri }} style={styles.thumbImage} contentFit="cover" cachePolicy="memory-disk" transition={120} />
                    {index === 0 ? (
                      <View style={styles.sourceTag}>
                        <Text style={styles.sourceTagText}>Source</Text>
                      </View>
                    ) : null}
                  </View>
                </LuxPressable>
              );
            })}

            {selectedImages.length < MAX_LAYOUT_PHOTOS ? (
              <LuxPressable onPress={handleAddPhoto} style={styles.thumbPressable} scale={0.98}>
                <View style={styles.addThumbFrame}>
                  {isPickingImage ? (
                    <ActivityIndicator color={DIAMOND_PILL_BLUE} />
                  ) : (
                    <>
                      <Plus color={DIAMOND_PILL_BLUE} size={26} strokeWidth={2.1} />
                      <Text style={styles.addThumbLabel}>Add</Text>
                    </>
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
                    <View style={styles.exampleOverlay} />
                    <View style={styles.exampleCaption}>
                      <Text style={styles.exampleLabel}>{example.label}</Text>
                    </View>
                    {isLoadingExample === example.id ? (
                      <View style={styles.exampleLoading}>
                        <ActivityIndicator color="#FFFFFF" />
                      </View>
                    ) : null}
                  </View>
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
  introCopy: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  introTitle: {
    color: "#0F172A",
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.8,
    ...fonts.bold,
  },
  introBody: {
    color: "#475569",
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 340,
  },
  mainPreviewPressable: {
    width: "100%",
  },
  mainPreview: {
    width: "100%",
    aspectRatio: 1.05,
    borderRadius: 28,
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
    gap: spacing.md,
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
    fontSize: 22,
    lineHeight: 28,
    textAlign: "center",
    ...fonts.semibold,
  },
  emptyPreviewBody: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 260,
  },
  removeButton: {
    position: "absolute",
    top: 16,
    right: 16,
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
  thumbPressable: {
    width: 88,
    height: 88,
  },
  thumbFrame: {
    flex: 1,
    borderRadius: 22,
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
  sourceTag: {
    position: "absolute",
    left: 8,
    bottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.82)",
  },
  sourceTagText: {
    color: "#FFFFFF",
    fontSize: 10,
    lineHeight: 12,
    ...fonts.semibold,
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
    gap: 6,
  },
  addThumbLabel: {
    color: DIAMOND_PILL_BLUE,
    fontSize: 12,
    lineHeight: 16,
    ...fonts.semibold,
  },
  examplesBlock: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
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
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
  },
  exampleImage: {
    width: "100%",
    height: "100%",
  },
  exampleOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.08)",
  },
  exampleCaption: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
  },
  exampleLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 18,
    ...fonts.semibold,
  },
  exampleLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.22)",
  },
  footerWrap: {
    alignItems: "center",
  },
  centeredButton: {
    width: "100%",
    maxWidth: 280,
  },
  resultIntro: {
    gap: spacing.sm,
  },
  resultTitle: {
    color: "#0F172A",
    fontSize: 30,
    lineHeight: 36,
    ...fonts.bold,
  },
  resultBody: {
    color: "#475569",
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 340,
  },
  resultFrame: {
    width: "100%",
    aspectRatio: 1.05,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  resultImage: {
    width: "100%",
    height: "100%",
  },
  resultFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sourceCard: {
    gap: spacing.sm,
  },
  sourceLabel: {
    color: "#334155",
    fontSize: 13,
    lineHeight: 18,
    ...fonts.semibold,
  },
  sourcePreview: {
    width: 112,
    height: 112,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  sourcePreviewImage: {
    width: "100%",
    height: "100%",
  },
  resultActions: {
    gap: spacing.md,
    paddingTop: spacing.sm,
    alignItems: "center",
  },
  resultActionRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.md,
  },
  resultActionButton: {
    flex: 1,
    maxWidth: 180,
  },
  retryButtonWrap: {
    width: "100%",
    alignItems: "center",
  },
});
