import {Check, ImagePlus, X} from "@/components/material-icons";
import {light as colors} from "@/styles/theme";
import {useMutation, useQuery} from "convex/react";
import {Asset} from "expo-asset";
import * as ImagePicker from "expo-image-picker";
import {Image} from "expo-image";
import {StatusBar} from "expo-status-bar";
import {useRouter} from "expo-router";
import {useCallback, useEffect, useMemo, useState} from "react";
import {
  Alert,
  Image as RNImage,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

import {DS, ambientShadow, glowShadow} from "../lib/design-system";
import {type DiscoverTile, useDiscoverGroups} from "../lib/discover-catalog";
import {uploadLocalFileToCloud} from "../lib/native-upload";
import {SERVICE_WIZARD_THEME} from "../lib/service-wizard-theme";
import {spacing} from "../styles/spacing";
import {fonts} from "../styles/typography";
import {DESIGN_WIZARD_SELECTION_BLUE, DESIGN_WIZARD_SELECTION_BLUE_GLOW} from "./design-wizard-primitives";
import {LuxPressable} from "./lux-pressable";
import {ServiceContinueButton} from "./service-continue-button";
import {ServiceProcessingScreen} from "./service-processing-screen";
import {ServiceWizardHeader} from "./service-wizard-header";
import {ServiceWizardStepScreen} from "./service-wizard-shared";
import {useProSuccess} from "./pro-success-context";
import {useViewerCredits} from "./viewer-credits-context";
import {useViewerSession} from "./viewer-session-context";
import {useWorkspaceDraft} from "./workspace-context";

type WizardStep = "intake" | "processing";
type UploadTarget = "room" | "inspiration";
type UploadSource = "camera" | "library";

type SelectedImage = {
  uri: string;
  width: number;
  height: number;
  label: string;
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

type ReadyGeneration = {
  generationId: string;
};

type ReferenceStyleWizardProps = {
  onFlowActiveChange?: (isFlowActive: boolean) => void;
  onProcessingStateChange?: (isProcessing: boolean) => void;
};

const pointerClassName = "cursor-pointer";
const TABS_HOME_ROUTE = "/(tabs)/index";
const WORKSPACE_ROUTE = "/(tabs)/workspace";
const REFERENCE_STYLE_STEP_COUNT = 2;
const REFERENCE_STYLE_SCAN_MS = 6_000;
const CANCELLED_GENERATION_MESSAGE = "Cancelled by user.";
const REFERENCE_STYLE_TITLE = "Reference Style";
const REFERENCE_STYLE_PROMPT =
  "Use the uploaded inspiration image as the primary style reference. Reimagine the source room with the same design language, palette, materials, furniture mood, lighting character, and styling cues while preserving the source room's architecture, perspective, windows, doors, and overall realism.";
const REFERENCE_STYLE_PROCESSING_STATUSES = [
  "Analyzing your room geometry...",
  "Reading the inspiration style cues...",
  "Mapping palette and materials...",
  "Rendering your styled redesign...",
] as const;
const DISCOVER_SHEET_MAX_WIDTH = 560;

function simplifyRatio(width: number, height: number) {
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  if (w === h) return "1:1";
  const reduced = `${w / gcd(w, h)}:${h / gcd(w, h)}`;
  if (w > h) return reduced.startsWith("4:3") ? "4:3" : "16:9";
  return reduced.startsWith("3:4") ? "3:4" : "9:16";
}

type UploadCardProps = {
  title: string;
  subtitle: string;
  image: SelectedImage | null;
  busy: boolean;
  onUpload: () => void;
  onClear: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  secondaryActionActive?: boolean;
};

function UploadCard({
  title,
  subtitle,
  image,
  busy,
  onUpload,
  onClear,
  secondaryActionLabel,
  onSecondaryAction,
  secondaryActionActive = false,
}: UploadCardProps) {
  return (
    <View style={styles.uploadCard}>
      <View style={styles.uploadCardHeaderRow}>
        <View style={styles.uploadCardCopy}>
          <Text selectable style={styles.uploadCardTitle}>{title}</Text>
          <Text selectable style={styles.uploadCardSubtitle}>{subtitle}</Text>
        </View>
        {secondaryActionLabel && onSecondaryAction ? (
          <LuxPressable
            onPress={onSecondaryAction}
            className={pointerClassName}
            pressableClassName={pointerClassName}
            style={[
              styles.secondaryActionButton,
              secondaryActionActive ? styles.secondaryActionButtonActive : null,
            ]}
            glowColor={DESIGN_WIZARD_SELECTION_BLUE_GLOW}
            scale={0.98}
          >
            <Text
              selectable
              style={[
                styles.secondaryActionText,
                secondaryActionActive ? styles.secondaryActionTextActive : null,
              ]}
            >
              {secondaryActionLabel}
            </Text>
          </LuxPressable>
        ) : null}
      </View>

      <View style={styles.uploadFrame}>
        {image ? (
          <>
            <Image
              source={{ uri: image.uri }}
              style={styles.uploadPreview}
              contentFit="cover"
              transition={140}
              cachePolicy="memory-disk"
            />
            <View style={styles.previewOverlay} />
            <View style={styles.previewTopRow}>
              <View style={styles.readyBadge}>
                <Check color={colors.textSuccess} size={14} strokeWidth={2.7} />
                <Text selectable style={styles.readyBadgeText}>Ready</Text>
              </View>
              <LuxPressable
                onPress={onClear}
                className={pointerClassName}
                pressableClassName={pointerClassName}
                style={styles.clearButton}
                glowColor={colors.surfaceHigh}
                scale={0.96}
              >
                <X color={colors.textPrimary} size={16} strokeWidth={2.4} />
              </LuxPressable>
            </View>
            <View style={styles.previewBottomRow}>
              <Text selectable numberOfLines={1} style={styles.previewLabel}>{image.label}</Text>
            </View>
          </>
        ) : null}

        <View style={[styles.dashedUploadFrame, image ? styles.dashedUploadFrameFilled : null]}>
          {!image ? (
            <>
              <View style={styles.uploadIconWrap}>
                <View style={styles.uploadIconBadge}>
                  <ImagePlus color={colors.textPrimary} size={28} strokeWidth={1.9} />
                </View>
              </View>
              <View style={styles.uploadEmptyCopy}>
                <Text selectable style={styles.uploadEmptyTitle}>Drop your image</Text>
                <Text selectable style={styles.uploadEmptyText}>Clean, front-facing photos give the best transfer.</Text>
              </View>
            </>
          ) : null}
        </View>

        <LuxPressable
          onPress={onUpload}
          className={pointerClassName}
          pressableClassName={pointerClassName}
          style={styles.uploadButtonPressable}
          glowColor={SERVICE_WIZARD_THEME.colors.accentGlowSoft}
          scale={0.985}
        >
          <View style={styles.uploadButton}>
            <Text selectable style={styles.uploadButtonText}>{busy ? "Uploading..." : "+ Upload"}</Text>
          </View>
        </LuxPressable>
      </View>
    </View>
  );
}

type DiscoverMiniGalleryProps = {
  visible: boolean;
  items: DiscoverTile[];
  selectedImageUri?: string | null;
  selectedImageLabel?: string | null;
  onSelect: (item: DiscoverTile) => void;
  onClose: () => void;
};

function DiscoverMiniGallery({
  visible,
  items,
  selectedImageUri,
  selectedImageLabel,
  onSelect,
  onClose,
}: DiscoverMiniGalleryProps) {
  const { width, height } = useWindowDimensions();
  const sheetWidth = Math.min(width - spacing.lg * 2, DISCOVER_SHEET_MAX_WIDTH);
  const tileWidth = Math.floor((sheetWidth - spacing.lg * 2 - spacing.sm) / 2);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.discoverModalRoot}>
        <Pressable onPress={onClose} style={styles.discoverBackdrop} />
        <View pointerEvents="box-none" style={styles.discoverSheetWrap}>
          <View style={[styles.discoverSheet, { width: sheetWidth, maxHeight: height * 0.72 }]}>
            <View style={styles.discoverHandle} />
            <View style={styles.discoverSheetHeader}>
              <View style={styles.discoverHeaderCopy}>
                <Text selectable style={styles.discoverSheetTitle}>Pick from Discover</Text>
                <Text selectable style={styles.discoverSheetSubtitle}>Use any Discover image as your inspiration reference.</Text>
              </View>
              <Pressable accessibilityRole="button" hitSlop={10} onPress={onClose} style={styles.discoverCloseButton}>
                <X color={colors.textPrimary} size={18} strokeWidth={2.2} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.discoverGrid}
            >
              {items.map((item) => {
                const resolved = RNImage.resolveAssetSource(item.image);
                const isSelected = Boolean(
                  (selectedImageUri && resolved?.uri === selectedImageUri)
                  || (selectedImageLabel && selectedImageLabel === item.title),
                );

                return (
                  <LuxPressable
                    key={item.id}
                    onPress={() => {
                      onSelect(item);
                    }}
                    className={pointerClassName}
                    pressableClassName={pointerClassName}
                    style={[
                      styles.discoverTile,
                      { width: tileWidth },
                      isSelected ? styles.discoverTileActive : null,
                    ]}
                    glowColor={DESIGN_WIZARD_SELECTION_BLUE_GLOW}
                    scale={0.985}
                  >
                    <View>
                      <View style={styles.discoverTileImageWrap}>
                        <Image
                          source={item.image}
                          style={[styles.discoverTileImage, { height: Math.round(tileWidth * 1.15) }]}
                          contentFit="cover"
                          transition={120}
                          cachePolicy="memory-disk"
                        />
                        {isSelected ? (
                          <View style={styles.discoverTileBadge}>
                            <Check color="#FFFFFF" size={14} strokeWidth={2.6} />
                          </View>
                        ) : null}
                      </View>
                      <Text selectable numberOfLines={1} style={styles.discoverTileLabel}>{item.title}</Text>
                    </View>
                  </LuxPressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function ReferenceStyleWizard({
  onFlowActiveChange,
  onProcessingStateChange,
}: ReferenceStyleWizardProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { anonymousId, isReady: viewerReady } = useViewerSession();
  const { credits, setOptimisticCredits } = useViewerCredits();
  const { showToast } = useProSuccess();
  const { clearDraft, setDraftImage, setDraftImages } = useWorkspaceDraft();
  const discoverGroups = useDiscoverGroups();
  const viewerArgs = useMemo(() => (anonymousId ? { anonymousId } : {}), [anonymousId]);
  const me = useQuery("users:me" as any, viewerReady ? viewerArgs : "skip") as MeResponse | null | undefined;
  const generationArchive = useQuery("generations:getUserArchive" as any, viewerReady ? viewerArgs : "skip") as
    | ArchiveGeneration[]
    | undefined;
  const createSourceUploadUrl = useMutation("generations:createSourceUploadUrl" as any);
  const startGeneration = useMutation("generations:startGeneration" as any);
  const cancelGeneration = useMutation("generations:cancelGeneration" as any);

  const [step, setStep] = useState<WizardStep>("intake");
  const [roomImage, setRoomImage] = useState<SelectedImage | null>(null);
  const [inspirationImage, setInspirationImage] = useState<SelectedImage | null>(null);
  const [busyTarget, setBusyTarget] = useState<UploadTarget | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [isCancellingGeneration, setIsCancellingGeneration] = useState(false);
  const [processingStartedAt, setProcessingStartedAt] = useState<number | null>(null);
  const [cooldownRemainingMs, setCooldownRemainingMs] = useState(0);
  const [readyGeneration, setReadyGeneration] = useState<ReadyGeneration | null>(null);
  const [isDiscoverPickerVisible, setIsDiscoverPickerVisible] = useState(false);

  const creditCount = me?.credits ?? credits;
  const canGenerate = Boolean(roomImage && inspirationImage);
  const cardWidth = Math.min(width - spacing.lg * 2, 560);
  const discoverTiles = useMemo(() => discoverGroups.flatMap((group) => group.items), [discoverGroups]);

  useEffect(() => {
    onFlowActiveChange?.(true);
    return () => onFlowActiveChange?.(false);
  }, [onFlowActiveChange]);

  useEffect(() => {
    onProcessingStateChange?.(step === "processing");
  }, [onProcessingStateChange, step]);

  useEffect(() => {
    const images = [roomImage, inspirationImage]
      .filter((image): image is SelectedImage => Boolean(image))
      .map((image) => ({ uri: image.uri, label: image.label }));
    setDraftImage(roomImage ? { uri: roomImage.uri, label: roomImage.label } : null);
    setDraftImages(images.length > 0 ? images : null);
  }, [inspirationImage, roomImage, setDraftImage, setDraftImages]);

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
      setReadyGeneration({ generationId: generation._id });
      return;
    }

    if (generation.status === "failed") {
      setGenerationId(null);
      setIsGenerating(false);
      setIsCancellingGeneration(false);
      setProcessingStartedAt(null);
      setCooldownRemainingMs(0);
      setReadyGeneration(null);

      if (generation.errorMessage === CANCELLED_GENERATION_MESSAGE) {
        setStep("intake");
        return;
      }

      setStep("intake");
      showToast(generation.errorMessage ?? "Unable to generate your reference-style redesign right now.");
    }
  }, [generationArchive, generationId, showToast]);

  useEffect(() => {
    if (step !== "processing" || !processingStartedAt) {
      setCooldownRemainingMs(0);
      return;
    }

    const syncRemaining = () => {
      setCooldownRemainingMs(Math.max(processingStartedAt + REFERENCE_STYLE_SCAN_MS - Date.now(), 0));
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
      : Math.max(processingStartedAt + REFERENCE_STYLE_SCAN_MS - Date.now(), 0);

    if (remainingMs <= 0) {
      clearDraft();
      setGenerationId(null);
      router.replace({
        pathname: WORKSPACE_ROUTE as any,
        params: {
          service: "interior",
          boardView: "editor",
          boardItemId: readyGeneration.generationId,
        },
      });
      return;
    }

    const timeout = setTimeout(() => {
      clearDraft();
      setGenerationId(null);
      router.replace({
        pathname: WORKSPACE_ROUTE as any,
        params: {
          service: "interior",
          boardView: "editor",
          boardItemId: readyGeneration.generationId,
        },
      });
    }, remainingMs);

    return () => clearTimeout(timeout);
  }, [clearDraft, processingStartedAt, readyGeneration, router]);

  const assignImage = useCallback((target: UploadTarget, image: SelectedImage | null) => {
    if (target === "room") {
      setRoomImage(image);
      return;
    }

    setInspirationImage(image);
  }, []);

  const handleSelectImage = useCallback(async (target: UploadTarget, source: UploadSource) => {
    setBusyTarget(target);
    try {
      const permission =
        source === "camera"
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          source === "camera" ? "Camera access needed" : "Photo access needed",
          source === "camera"
            ? "Enable camera access to capture an image."
            : "Enable photo library access to upload an image.",
        );
        return;
      }

      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ["images"],
              quality: 1,
              allowsEditing: false,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              quality: 1,
              allowsEditing: false,
              selectionLimit: 1,
            });

      if (result.canceled || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      assignImage(target, {
        uri: asset.uri,
        width: asset.width ?? 1200,
        height: asset.height ?? 1200,
        label: target === "room" ? "Your Room" : "Inspiration",
      });
    } finally {
      setBusyTarget((current) => (current === target ? null : current));
    }
  }, [assignImage]);

  const promptUploadSource = useCallback((target: UploadTarget) => {
    const targetLabel = target === "room" ? "your room" : "your inspiration";
    Alert.alert(
      "Choose image source",
      `Upload ${targetLabel} from your camera or gallery.`,
      [
        {
          text: "Take Photo",
          onPress: () => {
            void handleSelectImage(target, "camera");
          },
        },
        {
          text: "Choose from Gallery",
          onPress: () => {
            void handleSelectImage(target, "library");
          },
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
  }, [handleSelectImage]);

  const handleSelectDiscoverImage = useCallback(async (item: DiscoverTile) => {
    setBusyTarget("inspiration");
    try {
      const resolved = RNImage.resolveAssetSource(item.image);
      const assetSource =
        typeof item.image === "number"
          ? item.image
          : resolved?.uri
            ? {
                uri: resolved.uri,
                width: resolved.width ?? 1200,
                height: resolved.height ?? 1200,
              }
            : null;

      if (!assetSource) {
        throw new Error("Unable to load this Discover image.");
      }

      const asset = Asset.fromModule(assetSource);
      if (!asset.localUri) {
        await asset.downloadAsync();
      }

      const assetUri = asset.localUri ?? asset.uri ?? resolved?.uri;

      if (!assetUri) {
        throw new Error("Unable to load this Discover image.");
      }

      assignImage("inspiration", {
        uri: assetUri,
        width: asset.width ?? resolved?.width ?? 1200,
        height: asset.height ?? resolved?.height ?? 1200,
        label: item.title,
      });
      setIsDiscoverPickerVisible(false);
    } catch (error) {
      Alert.alert(
        "Discover image unavailable",
        error instanceof Error ? error.message : "Unable to use this Discover image right now.",
      );
    } finally {
      setBusyTarget((current) => (current === "inspiration" ? null : current));
    }
  }, [assignImage]);

  const handleGenerate = useCallback(async () => {
    if (!viewerReady || !roomImage || !inspirationImage || isGenerating) {
      return;
    }

    setIsGenerating(true);
    setReadyGeneration(null);
    setGenerationId(null);
    setProcessingStartedAt(Date.now());
    setCooldownRemainingMs(REFERENCE_STYLE_SCAN_MS);
    setStep("processing");

    try {
      const roomUploadUrl = await createSourceUploadUrl({ anonymousId: anonymousId ?? undefined });
      const roomStorageId = await uploadLocalFileToCloud(roomUploadUrl, roomImage.uri, {
        fallbackMimeType: "image/jpeg",
        errorLabel: "room image",
      });

      const inspirationUploadUrl = await createSourceUploadUrl({ anonymousId: anonymousId ?? undefined });
      const inspirationStorageId = await uploadLocalFileToCloud(inspirationUploadUrl, inspirationImage.uri, {
        fallbackMimeType: "image/jpeg",
        errorLabel: "reference image",
      });

      const response = await startGeneration({
        anonymousId: anonymousId ?? undefined,
        imageStorageId: roomStorageId,
        referenceImageStorageIds: [inspirationStorageId],
        serviceType: "redesign",
        selection: "Reference Style",
        roomType: "Room",
        displayStyle: "Designer-Inspired Redesign",
        customPrompt: REFERENCE_STYLE_PROMPT,
        aspectRatio: simplifyRatio(roomImage.width, roomImage.height),
      });

      setGenerationId(response.generationId);
      setOptimisticCredits(response.creditsRemaining ?? Math.max(credits - 1, 0));
    } catch (error) {
      setIsGenerating(false);
      setProcessingStartedAt(null);
      setCooldownRemainingMs(0);
      setStep("intake");
      Alert.alert(
        "Generation unavailable",
        error instanceof Error ? error.message : "Unable to generate your reference-style redesign right now.",
      );
    }
  }, [
    anonymousId,
    createSourceUploadUrl,
    credits,
    inspirationImage,
    isGenerating,
    roomImage,
    setOptimisticCredits,
    startGeneration,
    viewerReady,
  ]);

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

  const handleClose = useCallback(() => {
    clearDraft();
    router.replace(TABS_HOME_ROUTE as any);
  }, [clearDraft, router]);

  if (step === "processing") {
    const cooldownSeconds = Math.ceil(cooldownRemainingMs / 1000);
    const etaLabel = readyGeneration
      ? `Finalizing your redesign${cooldownSeconds > 0 ? ` in ${cooldownSeconds}s` : "..."}`
      : `Style transfer completes in ${Math.max(cooldownSeconds, 1)}s`;

    return (
      <ServiceProcessingScreen
        imageUri={roomImage?.uri ?? null}
        title="Applying Reference Style"
        subtitlePhrases={REFERENCE_STYLE_PROCESSING_STATUSES}
        etaLabel={etaLabel}
        previewLabel="Your Room"
        scanDurationMs={REFERENCE_STYLE_SCAN_MS}
        progressStep={2}
        progressTotalSteps={REFERENCE_STYLE_STEP_COUNT}
        progressVariant="segmented"
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
      <StatusBar style="dark" />
      <ServiceWizardHeader
        title={REFERENCE_STYLE_TITLE}
        step={1}
        totalSteps={REFERENCE_STYLE_STEP_COUNT}
        progressVariant="segmented"
        creditCount={creditCount}
        onClose={handleClose}
      />

      <ServiceWizardStepScreen
        footerOffset={24}
        contentContainerStyle={styles.stepContent}
        footer={canGenerate ? (
          <ServiceContinueButton
            label="Generate"
            active
            attention
            onPress={() => {
              void handleGenerate();
            }}
            supportingText="Both uploads are locked in."
          />
        ) : null}
      >
        <View style={styles.heroSection}>
          <Text selectable style={styles.eyebrow}>Upload</Text>
          <Text selectable style={styles.heroTitle}>{REFERENCE_STYLE_TITLE}</Text>
        </View>

        <View style={[styles.uploadStack, { width: cardWidth }]}>
          <UploadCard
            title="Upload Your Room"
            subtitle="Source photo"
            image={roomImage}
            busy={busyTarget === "room"}
            onUpload={() => {
              promptUploadSource("room");
            }}
            onClear={() => {
              assignImage("room", null);
            }}
          />

          <UploadCard
            title="Upload Inspiration"
            subtitle="The style you want to copy"
            image={inspirationImage}
            busy={busyTarget === "inspiration"}
            onUpload={() => {
              promptUploadSource("inspiration");
            }}
            onClear={() => {
              assignImage("inspiration", null);
            }}
            secondaryActionLabel="Pick from Discover"
            onSecondaryAction={() => {
              setIsDiscoverPickerVisible(true);
            }}
            secondaryActionActive={isDiscoverPickerVisible}
          />
        </View>
      </ServiceWizardStepScreen>

      <DiscoverMiniGallery
        visible={isDiscoverPickerVisible}
        items={discoverTiles}
        selectedImageUri={inspirationImage?.uri ?? null}
        selectedImageLabel={inspirationImage?.label ?? null}
        onClose={() => {
          setIsDiscoverPickerVisible(false);
        }}
        onSelect={(item) => {
          void handleSelectDiscoverImage(item);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SERVICE_WIZARD_THEME.colors.background,
  },
  stepContent: {
    alignItems: "center",
    gap: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  heroSection: {
    width: "100%",
    maxWidth: 560,
    gap: spacing.xs,
  },
  eyebrow: {
    color: SERVICE_WIZARD_THEME.colors.accentStrong,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    ...fonts.semibold,
  },
  heroTitle: {
    color: SERVICE_WIZARD_THEME.colors.textPrimary,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.9,
    ...fonts.bold,
  },
  uploadStack: {
    alignSelf: "center",
    gap: spacing.xl,
  },
  uploadCard: {
    gap: spacing.md,
  },
  uploadCardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  uploadCardCopy: {
    gap: spacing.xs,
    flex: 1,
  },
  uploadCardTitle: {
    color: SERVICE_WIZARD_THEME.colors.textPrimary,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.5,
    ...fonts.bold,
  },
  uploadCardSubtitle: {
    color: SERVICE_WIZARD_THEME.colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    ...fonts.regular,
  },
  secondaryActionButton: {
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.22)",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionButtonActive: {
    borderColor: DESIGN_WIZARD_SELECTION_BLUE,
    backgroundColor: "rgba(37,99,235,0.08)",
  },
  secondaryActionText: {
    color: "#1D4ED8",
    fontSize: 12,
    lineHeight: 16,
    ...fonts.semibold,
  },
  secondaryActionTextActive: {
    color: DESIGN_WIZARD_SELECTION_BLUE,
  },
  uploadFrame: {
    minHeight: 292,
    borderRadius: DS.radius.lg,
    borderWidth: 1,
    borderColor: SERVICE_WIZARD_THEME.colors.border,
    backgroundColor: colors.surfaceHigh,
    padding: spacing.md,
    gap: spacing.md,
    overflow: "hidden",
    ...ambientShadow(),
  },
  uploadPreview: {
    ...StyleSheet.absoluteFillObject,
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.12)",
  },
  previewTopRow: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  previewBottomRow: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.xxl + 56,
  },
  previewLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
    ...fonts.semibold,
  },
  readyBadge: {
    minHeight: 34,
    borderRadius: DS.radius.md,
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.brandSurface,
    ...ambientShadow(0.04, 8, 8),
  },
  readyBadgeText: {
    color: colors.textSuccess,
    fontSize: 12,
    lineHeight: 16,
    ...fonts.bold,
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: DS.radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dashedUploadFrame: {
    flex: 1,
    borderRadius: DS.radius.lg,
    borderWidth: 1.5,
    borderStyle: "solid",
    borderColor: DESIGN_WIZARD_SELECTION_BLUE,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 196,
    ...glowShadow(DESIGN_WIZARD_SELECTION_BLUE_GLOW, 18),
  },
  dashedUploadFrameFilled: {
    backgroundColor: "transparent",
    borderColor: "rgba(255,255,255,0.72)",
  },
  uploadIconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  uploadIconBadge: {
    width: 92,
    height: 92,
    borderRadius: DS.radius.lg,
    backgroundColor: colors.surfaceHigh,
    alignItems: "center",
    justifyContent: "center",
    ...ambientShadow(),
  },
  uploadEmptyCopy: {
    alignItems: "center",
    gap: spacing.xs,
    maxWidth: 250,
  },
  uploadEmptyTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    lineHeight: 26,
    textAlign: "center",
    ...fonts.bold,
  },
  uploadEmptyText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    ...fonts.regular,
  },
  uploadButtonPressable: {
    width: "100%",
  },
  uploadButton: {
    minHeight: 52,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.textPrimary,
  },
  uploadButtonText: {
    color: colors.textInverse,
    fontSize: 15,
    lineHeight: 20,
    ...fonts.semibold,
  },
  discoverModalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  discoverBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.42)",
  },
  discoverSheetWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    alignItems: "center",
  },
  discoverSheet: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.16)",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.md,
    ...ambientShadow(0.08, 18, 12),
  },
  discoverHandle: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(148, 163, 184, 0.4)",
    alignSelf: "center",
  },
  discoverSheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  discoverHeaderCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  discoverSheetTitle: {
    color: SERVICE_WIZARD_THEME.colors.textPrimary,
    fontSize: 22,
    lineHeight: 28,
    ...fonts.bold,
  },
  discoverSheetSubtitle: {
    color: SERVICE_WIZARD_THEME.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    ...fonts.regular,
  },
  discoverCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceHigh,
    borderWidth: 1,
    borderColor: colors.border,
  },
  discoverGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  discoverTile: {
    borderRadius: DS.radius.lg,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    backgroundColor: "#FFFFFF",
    padding: 8,
    gap: spacing.xs,
  },
  discoverTileActive: {
    borderColor: DESIGN_WIZARD_SELECTION_BLUE,
    backgroundColor: "rgba(37,99,235,0.04)",
  },
  discoverTileImageWrap: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: colors.surfaceHigh,
  },
  discoverTileImage: {
    width: "100%",
  },
  discoverTileBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DESIGN_WIZARD_SELECTION_BLUE,
  },
  discoverTileLabel: {
    color: SERVICE_WIZARD_THEME.colors.textPrimary,
    fontSize: 12,
    lineHeight: 16,
    ...fonts.semibold,
  },
});
