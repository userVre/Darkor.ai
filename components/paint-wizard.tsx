import { useAuth } from "@clerk/expo";
import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { AnimatePresence, MotiView } from "moti";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle as SvgCircle, G, Path as SvgPath, Rect } from "react-native-svg";
import { captureRef } from "react-native-view-shot";
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronLeft,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react-native";

import { triggerHaptic } from "../lib/haptics";
import { useProSuccess } from "./pro-success-context";
import { LuxPressable } from "./lux-pressable";
import { useMaskDrawing } from "./use-mask-drawing";
import { useViewerSession } from "./viewer-session-context";

type WizardStep = "intake" | "mask" | "colors" | "finish" | "processing" | "result";

type SelectedImage = {
  uri: string;
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

type ColorSwatch = {
  id: string;
  label: string;
  value: string;
};

type ColorCategory = {
  id: string;
  title: string;
  colors: ColorSwatch[];
};

type FinishOption = {
  id: string;
  label: string;
  description: string;
};

const pointerClassName = "cursor-pointer";
const OLED_BLACK = "#000000";
const CARD_BLACK = "#08080A";
const CARD_BLACK_SOFT = "#0B0B0E";
const MASK_COLOR = "rgba(217, 70, 239, 0.72)";
const MASK_CAPTURE_COLOR = "#FFFFFF";
const BRUSH_MIN = 14;
const BRUSH_MAX = 64;
const DETECT_DURATION_MS = 1700;

const COLOR_CATEGORIES: ColorCategory[] = [
  {
    id: "modern-neutrals",
    title: "Modern Neutrals",
    colors: [
      { id: "misty-gray", label: "Misty Gray", value: "#C8C4BE" },
      { id: "warm-beige", label: "Warm Beige", value: "#D8C1A6" },
      { id: "off-white", label: "Off-White", value: "#F3EEE6" },
      { id: "soft-taupe", label: "Soft Taupe", value: "#B5A89A" },
    ],
  },
  {
    id: "bold-dark",
    title: "Bold & Dark",
    colors: [
      { id: "royal-navy", label: "Royal Navy", value: "#223A66" },
      { id: "charcoal-ink", label: "Charcoal Ink", value: "#3B3E45" },
      { id: "deep-olive", label: "Deep Olive", value: "#4C5540" },
      { id: "aubergine", label: "Aubergine", value: "#4B314A" },
    ],
  },
  {
    id: "soft-pastels",
    title: "Soft Pastels",
    colors: [
      { id: "dusty-rose", label: "Dusty Rose", value: "#DAB4B5" },
      { id: "powder-blue", label: "Powder Blue", value: "#C8D7E8" },
      { id: "pale-sage", label: "Pale Sage", value: "#C3D2C1" },
      { id: "lavender-mist", label: "Lavender Mist", value: "#D9D2E8" },
    ],
  },
  {
    id: "nature-inspired",
    title: "Nature Inspired",
    colors: [
      { id: "sage-green", label: "Sage Green", value: "#8EA486" },
      { id: "terracotta", label: "Terracotta", value: "#C86F4C" },
      { id: "olive-grove", label: "Olive Grove", value: "#6C7752" },
      { id: "sandstone", label: "Sandstone", value: "#C7A78B" },
    ],
  },
];

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

async function readBlobFromUri(uri: string) {
  const response = await fetch(uri);
  if (!response.ok) throw new Error("Unable to load the selected image.");
  return await response.blob();
}

const BrushPreview = memo(function BrushPreview({ width }: { width: number }) {
  return (
    <View
      style={{
        width: Math.max(width, 16),
        height: Math.max(width, 16),
        borderRadius: 999,
        backgroundColor: MASK_COLOR,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.18)",
      }}
    />
  );
});

const ColorSwatchButton = memo(function ColorSwatchButton({
  color,
  active,
  size,
  onPress,
}: {
  color: ColorSwatch;
  active: boolean;
  size: number;
  onPress: () => void;
}) {
  return (
    <LuxPressable
      onPress={onPress}
      pressableClassName={pointerClassName}
      className={pointerClassName}
      style={[styles.swatchButton, { width: size }]}
      glowColor={active ? "rgba(217,70,239,0.22)" : "rgba(255,255,255,0.04)"}
      scale={0.97}
    >
      <View style={[styles.swatchOuter, active ? styles.swatchOuterActive : null]}>
        <View style={[styles.swatchInner, { backgroundColor: color.value }]} />
      </View>
      <Text style={[styles.swatchLabel, active ? styles.swatchLabelActive : null]}>{color.label}</Text>
    </LuxPressable>
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

export function PaintWizard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { isSignedIn } = useAuth();
  const { anonymousId, isReady: viewerReady } = useViewerSession();
  const { showToast } = useProSuccess();
  const viewerArgs = useMemo(() => (anonymousId ? { anonymousId } : {}), [anonymousId]);

  const me = useQuery("users:me" as any, viewerReady ? viewerArgs : "skip") as MeResponse | null | undefined;
  const generationArchive = useQuery("generations:getUserArchive" as any, viewerReady ? viewerArgs : "skip") as
    | ArchiveGeneration[]
    | undefined;
  const createSourceUploadUrl = useMutation("generations:createSourceUploadUrl" as any);
  const startGeneration = useMutation("generations:startGeneration" as any);

  const [step, setStep] = useState<WizardStep>("intake");
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [selectedColorValue, setSelectedColorValue] = useState<string | null>(null);
  const [selectedFinishId, setSelectedFinishId] = useState(FINISH_OPTIONS[0].id);
  const [isDetecting, setIsDetecting] = useState(false);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [awaitingAuth, setAwaitingAuth] = useState(false);
  const detectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    hasMask,
    handleCanvasLayout,
    clearMask,
    undoLastStroke,
    resetMaskDrawing,
    drawGesture,
    sliderGesture,
    loupeMetrics,
  } = useMaskDrawing({
    disabled: isDetecting,
    initialBrushWidth: 24,
    minBrushWidth: BRUSH_MIN,
    maxBrushWidth: BRUSH_MAX,
  });

  const selectedColor = useMemo(
    () => COLOR_CATEGORIES.flatMap((category) => category.colors).find((color) => color.value === selectedColorValue) ?? null,
    [selectedColorValue],
  );
  const selectedFinish = useMemo(
    () => FINISH_OPTIONS.find((option) => option.id === selectedFinishId) ?? FINISH_OPTIONS[0],
    [selectedFinishId],
  );
  const creditBalance = viewerReady ? me?.credits ?? 3 : 3;
  const canGenerate = Boolean(selectedImage && hasMask && selectedColor && !isGenerating);
  const currentStepNumber =
    step === "intake" ? 1 : step === "mask" ? 2 : step === "colors" ? 3 : 4;
  const headerStepLabel = `Step ${currentStepNumber}/4`;
  const progressWidth = (170 * currentStepNumber) / 4;
  const canContinueFromColors = Boolean(selectedColor && selectedImage && hasMask && !isGenerating);
  const colorCardSize = Math.max(94, Math.floor((width - 72) / 3));
  const frameAspectRatio = selectedImage ? selectedImage.width / Math.max(selectedImage.height, 1) : 1;
  const previewHeight = Math.min(Math.max((width - 32) / Math.max(frameAspectRatio, 0.6), 240), height * 0.54);

  useEffect(() => {
    return () => {
      if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!generationId || !generationArchive) return;
    const generation = generationArchive.find((item) => item._id === generationId);
    if (!generation) return;

    if (generation.status === "ready" && generation.imageUrl) {
      setGeneratedImageUrl(generation.imageUrl);
      setIsGenerating(false);
      triggerHaptic();
      if (isSignedIn) {
        router.replace({ pathname: "/workspace", params: { boardView: "editor", boardItemId: generation._id } });
        return;
      }
      setStep("result");
      return;
    }

    if (generation.status === "failed") {
      setIsGenerating(false);
      setStep("colors");
      showToast(generation.errorMessage ?? "Unable to paint the walls right now.");
    }
  }, [generationArchive, generationId, isSignedIn, router, showToast]);

  const resetDetection = useCallback(() => {
    if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
    setIsDetecting(true);
    detectTimerRef.current = setTimeout(() => {
      setIsDetecting(false);
    }, DETECT_DURATION_MS);
  }, []);

  const resetProject = useCallback(() => {
    setStep("intake");
    setSelectedImage(null);
    setGeneratedImageUrl(null);
    setGenerationId(null);
    setIsGenerating(false);
    resetMaskDrawing({ resetBrush: true });
    setSelectedColorValue(null);
    setSelectedFinishId(FINISH_OPTIONS[0].id);
  }, [resetMaskDrawing]);

  const uploadBlobToStorage = useCallback(
    async (uri: string) => {
      const uploadUrl = (await createSourceUploadUrl(viewerArgs)) as string;
      const blob = await readBlobFromUri(uri);
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type || "image/png" },
        body: blob,
      });

      if (!response.ok) {
        throw new Error("Unable to upload the wall-paint assets to storage.");
      }

      const json = (await response.json()) as { storageId?: string };
      if (!json.storageId) {
        throw new Error("Storage upload completed without a storage id.");
      }

      return json.storageId;
    },
    [createSourceUploadUrl, viewerArgs],
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
          return;
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

        if (result.canceled || !result.assets[0]) return;

        const asset = result.assets[0];
        setSelectedImage({
          uri: asset.uri,
          width: asset.width ?? 1080,
          height: asset.height ?? 1440,
        });
        setGeneratedImageUrl(null);
        setGenerationId(null);
        resetMaskDrawing({ resetBrush: true });
        setSelectedColorValue(null);
        setSelectedFinishId(FINISH_OPTIONS[0].id);
        setStep("mask");
        resetDetection();
      } catch (error) {
        Alert.alert("Unable to open media", error instanceof Error ? error.message : "Please try again.");
      }
    },
    [resetDetection, resetMaskDrawing],
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

    if (creditBalance <= 0) {
      if (!isSignedIn) {
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

      const result = (await startGeneration({
        anonymousId,
        imageStorageId: sourceStorageId,
        maskStorageId,
        serviceType: "paint",
        selection: `${selectedColor.label} (${selectedColor.value}) with a realistic ${selectedFinish.label.toLowerCase()} finish`,
        roomType: "Room",
        displayStyle: `${selectedColor.label} Paint`,
        customPrompt: "Preserve trim, ceilings, furniture, windows, doors, floors, artwork, reflections, and the original lighting exactly.",
        aspectRatio: simplifyRatio(selectedImage.width, selectedImage.height),
      })) as { generationId: string };

      setGenerationId(result.generationId);
    } catch (error) {
      setIsGenerating(false);
      setStep("colors");
      const message = error instanceof Error ? error.message : "Please try again.";
      if (message === "Payment Required") {
        if (!isSignedIn) {
          setAwaitingAuth(true);
          router.push({ pathname: "/sign-in", params: { returnTo: "/workspace?service=paint" } });
          return;
        }
        router.push("/paywall");
        return;
      }
      showToast(message);
    }
  }, [
    anonymousId,
    creditBalance,
    hasMask,
    isSignedIn,
    router,
    selectedFinish.label,
    selectedImage,
    startGeneration,
    showToast,
    uploadBlobToStorage,
    viewerReady,
    selectedColor,
  ]);

  useEffect(() => {
    if (!awaitingAuth || !isSignedIn || !viewerReady || !canGenerate) {
      return;
    }

    setAwaitingAuth(false);
    const timer = setTimeout(() => {
      void handleGenerate();
    }, 300);
    return () => clearTimeout(timer);
  }, [awaitingAuth, canGenerate, handleGenerate, isSignedIn, viewerReady]);

  const handleBack = useCallback(() => {
    if (step === "intake") {
      router.back();
      return;
    }
    if (step === "mask") return setStep("intake");
    if (step === "colors") return setStep("mask");
    if (step === "finish") return setStep("colors");
    if (step === "result") return setStep("colors");
  }, [router, step]);

  const stepSubtitle = headerStepLabel;

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
            style={{ width: canvasSize.width, height: canvasSize.height, marginTop: 8, backgroundColor: OLED_BLACK }}
          >
            <Svg width={canvasSize.width} height={canvasSize.height}>
              <Rect x={0} y={0} width={canvasSize.width} height={canvasSize.height} fill={OLED_BLACK} />
              {paintStrokes.map((stroke) => (
                <SvgPath
                  key={`mask-${stroke.id}`}
                  d={stroke.path}
                  stroke={MASK_CAPTURE_COLOR}
                  strokeWidth={stroke.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ))}
            </Svg>
          </View>
        </View>
      ) : null}

      <View style={[styles.topBar, { paddingTop: Math.max(insets.top + 8, 18) }]}> 
        <LuxPressable
          onPress={handleBack}
          className={pointerClassName}
          style={styles.topButton}
          glowColor="rgba(255,255,255,0.06)"
          scale={0.97}
        >
          <ArrowLeft color="#ffffff" size={18} />
        </LuxPressable>

        <View style={styles.topCopy}>
          <Text style={styles.topTitle}>Smart Wall Paint</Text>
          <Text style={styles.topSubtitle}>{stepSubtitle}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFillWrap, { width: progressWidth }]}>
              <LinearGradient
                colors={["#D946EF", "#EC4899", "#7C3AED"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.progressFill}
              />
            </View>
          </View>
        </View>

        <View style={styles.creditPill}>
          <Text style={styles.creditText}>{creditBalance}</Text>
        </View>
      </View>

      {step === "intake" ? (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 18,
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom + 28, 34),
            gap: 18,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Add a Photo</Text>
            <Text style={styles.heroText}>
              Upload a room photo where walls are clearly visible for the best AI color application.
            </Text>

            <LuxPressable
              onPress={() => handleSelectMedia("library")}
              className={pointerClassName}
              style={styles.uploadSquarePressable}
              glowColor="rgba(255,255,255,0.06)"
              scale={0.985}
            >
              <LinearGradient colors={["#111113", "#050506"]} style={styles.uploadSquare}>
                <View style={styles.plusOrb}>
                  <Plus color="#ffffff" size={28} strokeWidth={2.4} />
                </View>
                <View style={styles.uploadCopy}>
                  <Text style={styles.uploadTitle}>Upload Room Photo</Text>
                  <Text style={styles.uploadText}>Start with a clean wall view so Darkor.ai can paint with precision.</Text>
                </View>
              </LinearGradient>
            </LuxPressable>

            <LuxPressable
              onPress={() => handleSelectMedia("camera")}
              className={pointerClassName}
              style={{ width: "100%" }}
              glowColor="rgba(255,255,255,0.04)"
              scale={0.99}
            >
              <View style={styles.secondaryButton}>
                <Camera color="#ffffff" size={18} />
                <Text style={styles.secondaryText}>Capture with Camera</Text>
              </View>
            </LuxPressable>
          </View>

          <View style={styles.notesCard}>
            <Text style={styles.notesTitle}>Designer Workflow</Text>
            <Text style={styles.notesText}>Mark only the wall planes you want to recolor so windows, furniture, art, and trim stay untouched.</Text>
            <Text style={styles.notesText}>Choose from curated premium palettes, then set the finish type that best matches the room’s mood and lighting.</Text>
          </View>
        </ScrollView>
      ) : null}

      {step === "mask" ? (
        <View style={[styles.content, { paddingBottom: Math.max(insets.bottom + 18, 22) }]}>
          <Text style={styles.stepTitle}>Mark the walls you want to repaint</Text>
          <Text style={styles.stepText}>
            Brush only over the wall surfaces. Use the loupe to stay clean around furniture, windows, trim, and decor.
          </Text>

          <View style={styles.toolbarRow}>
            <LuxPressable
              onPress={undoLastStroke}
              disabled={!paintStrokes.length}
              className={pointerClassName}
              style={styles.toolbarButton}
              glowColor="rgba(255,255,255,0.04)"
              scale={0.98}
            >
              <RotateCcw color="#ffffff" size={16} />
              <Text style={styles.toolbarText}>Undo</Text>
            </LuxPressable>
            <LuxPressable
              onPress={clearMask}
              disabled={!paintStrokes.length}
              className={pointerClassName}
              style={styles.toolbarButton}
              glowColor="rgba(255,255,255,0.04)"
              scale={0.98}
            >
              <Trash2 color="#ffffff" size={16} />
              <Text style={styles.toolbarText}>Clear All</Text>
            </LuxPressable>
          </View>

          <View onLayout={handleCanvasLayout} style={[styles.canvasFrame, { height: previewHeight }]}> 
            {selectedImage ? (
              <>
                <Image source={{ uri: selectedImage.uri }} style={styles.photoImage} contentFit="contain" transition={160} />
                <GestureDetector gesture={drawGesture}>
                  <View style={absoluteFill}>
                    <Svg width="100%" height="100%">
                      {renderedStrokes.map((stroke) => (
                        <SvgPath
                          key={stroke.id}
                          d={stroke.path}
                          stroke={MASK_COLOR}
                          strokeWidth={stroke.width}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      ))}
                    </Svg>
                  </View>
                </GestureDetector>

                {activePoint && loupeMetrics ? (
                  <>
                    <View
                      pointerEvents="none"
                      style={{
                        position: "absolute",
                        left: Math.max(12, Math.min(activePoint.x - brushWidth / 2, Math.max(canvasSize.width - brushWidth - 12, 12))),
                        top: Math.max(12, Math.min(activePoint.y - brushWidth / 2, Math.max(canvasSize.height - brushWidth - 12, 12))),
                        width: brushWidth,
                        height: brushWidth,
                        borderRadius: 999,
                        borderWidth: 1.5,
                        borderColor: "rgba(255,255,255,0.8)",
                        backgroundColor: "rgba(217,70,239,0.16)",
                      }}
                    />

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
                          <G transform={`translate(${loupeMetrics.translateX} ${loupeMetrics.translateY}) scale(${loupeMetrics.zoom})`}>
                            {renderedStrokes.map((stroke) => (
                              <SvgPath
                                key={`loupe-${stroke.id}`}
                                d={stroke.path}
                                stroke={MASK_COLOR}
                                strokeWidth={stroke.width}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                fill="none"
                              />
                            ))}
                          </G>
                          <SvgCircle cx={loupeMetrics.size / 2} cy={loupeMetrics.size / 2} r={8} fill="none" stroke="#ffffff" strokeWidth={1.5} />
                          <SvgPath d={`M ${loupeMetrics.size / 2 - 14} ${loupeMetrics.size / 2} L ${loupeMetrics.size / 2 + 14} ${loupeMetrics.size / 2}`} stroke="#ffffff" strokeWidth={1} />
                          <SvgPath d={`M ${loupeMetrics.size / 2} ${loupeMetrics.size / 2 - 14} L ${loupeMetrics.size / 2} ${loupeMetrics.size / 2 + 14}`} stroke="#ffffff" strokeWidth={1} />
                        </Svg>
                      </View>
                    </View>
                  </>
                ) : null}

                <View style={styles.hintPill}>
                  <Text style={styles.hintText}>Use the fuchsia mask to cover only repaintable wall areas.</Text>
                </View>

                <AnimatePresence>
                  {isDetecting ? (
                    <MotiView
                      from={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={styles.detectOverlay}
                    >
                      <MotiView
                        animate={{ scale: [0.92, 1.08, 0.92], opacity: [0.14, 0.46, 0.14] }}
                        transition={{ duration: 1700, loop: true }}
                        style={styles.detectPulse}
                      />
                      <View style={styles.detectCopy}>
                        <ActivityIndicator color="#ffffff" />
                        <Text style={styles.detectTitle}>Preparing your masking surface...</Text>
                        <Text style={styles.detectText}>
                          Home AI is tuning the canvas so you can paint precise edges around built-ins, windows, and furniture.
                        </Text>
                      </View>
                    </MotiView>
                  ) : null}
                </AnimatePresence>
              </>
            ) : null}
          </View>

          <View style={styles.panel}>
            <View style={styles.brushRow}>
              <Text style={styles.brushTitle}>Brush Size</Text>
              <View style={styles.brushMeta}>
                <BrushPreview width={brushWidth} />
                <Text style={styles.brushMetaText}>{brushWidth}px</Text>
              </View>
            </View>

            <GestureDetector gesture={sliderGesture}>
              <View onLayout={(event) => setSliderWidth(event.nativeEvent.layout.width)} style={styles.sliderWrap}>
                <View style={styles.sliderTrack} />
                <LinearGradient colors={["#D946EF", "#EC4899"]} style={[styles.sliderFill, { width: Math.max(16, sliderWidth * brushProgress) }]} />
                <View style={[styles.sliderThumb, { left: Math.max(0, sliderWidth * brushProgress - 16) }]}> 
                  <View style={styles.sliderThumbDot} />
                </View>
              </View>
            </GestureDetector>

            <LuxPressable
              onPress={() => setStep("colors")}
              disabled={!hasMask || isDetecting}
              className={pointerClassName}
              style={{ width: "100%" }}
              glowColor="rgba(217,70,239,0.2)"
              scale={0.99}
            >
              <LinearGradient colors={["#D946EF", "#EC4899", "#7C3AED"]} style={styles.primaryButton}>
                <Text style={styles.primaryText}>Continue to Color</Text>
              </LinearGradient>
            </LuxPressable>
          </View>
        </View>
      ) : null}

      {step === "colors" ? (
        <>
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 10,
              paddingBottom: Math.max(insets.bottom + 122, 138),
              gap: 18,
            }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.stepTitle}>Select Color</Text>
            <Text style={styles.stepText}>
              Explore a premium palette hub designed to feel intentional, market-ready, and photoreal in upscale interiors.
            </Text>

            <View style={[styles.canvasFrame, { height: Math.min(previewHeight, 280) }]}>
              {selectedImage ? (
                <>
                  <Image source={{ uri: selectedImage.uri }} style={styles.photoImage} contentFit="contain" />
                  <Svg width="100%" height="100%" style={absoluteFill}>
                  {paintStrokes.map((stroke) => (
                    <SvgPath
                      key={`preview-${stroke.id}`}
                      d={stroke.path}
                      stroke={selectedColor?.value ?? "#FFFFFF"}
                        strokeOpacity={selectedColor ? 0.52 : 0.18}
                        strokeWidth={stroke.width}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    ))}
                  </Svg>
                  <View style={styles.previewBadge}>
                    <View style={[styles.previewSwatch, selectedColor ? { backgroundColor: selectedColor.value } : styles.previewSwatchEmpty]} />
                    <Text style={styles.previewBadgeText}>{selectedColor?.label ?? "Choose a wall color"}</Text>
                  </View>
                </>
              ) : null}
            </View>

            {COLOR_CATEGORIES.map((category) => (
              <View key={category.id} style={styles.paletteCard}>
                <Text style={styles.paletteTitle}>{category.title}</Text>
                <View style={styles.swatchGrid}>
                  {category.colors.map((color) => (
                    <ColorSwatchButton
                      key={color.id}
                      color={color}
                      active={color.id === selectedColor?.id}
                      size={colorCardSize}
                      onPress={() => {
                        setSelectedColorValue(color.value);
                        triggerHaptic();
                      }}
                    />
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={[styles.fixedContinueBar, { paddingBottom: Math.max(insets.bottom + 12, 24) }]}>
            <LuxPressable
              onPress={() => {
                void handleGenerate();
              }}
              disabled={!canContinueFromColors}
              pressableClassName={pointerClassName}
              className={pointerClassName}
              style={{ width: "100%" }}
              glowColor="rgba(217,70,239,0.22)"
              scale={0.99}
            >
              {canContinueFromColors ? (
                <LinearGradient colors={["#D946EF", "#EC4899", "#7C3AED"]} style={styles.primaryButtonLarge}>
                  <Text style={styles.primaryText}>Continue</Text>
                </LinearGradient>
              ) : (
                <View style={styles.disabledButtonLarge}>
                  <Text style={styles.primaryText}>Continue</Text>
                </View>
              )}
            </LuxPressable>
          </View>
        </>
      ) : null}

      {step === "finish" ? (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom + 28, 34),
            gap: 18,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.stepTitle}>Finish Type</Text>
          <Text style={styles.stepText}>
            Choose how the paint should catch light so the walls read correctly in a polished, designer-grade render.
          </Text>

          <View style={[styles.summaryCard, styles.finishSummaryCard]}>
              <View style={[styles.summarySwatch, { backgroundColor: selectedColor?.value ?? "#ffffff" }]} />
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryLabel}>Selected Color</Text>
              <Text style={styles.summaryTitle}>{selectedColor?.label ?? "No color selected"}</Text>
              <Text style={styles.summaryText}>Wall color is locked. Now choose the final sheen profile for the render.</Text>
            </View>
          </View>

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

          <LuxPressable
            onPress={handleGenerate}
            disabled={!canGenerate}
            className={pointerClassName}
            style={{ width: "100%" }}
            glowColor="rgba(217,70,239,0.26)"
            scale={0.99}
          >
            <LinearGradient colors={["#D946EF", "#EC4899", "#7C3AED"]} style={styles.primaryButtonLarge}>
              <Sparkles color="#ffffff" size={18} />
              <Text style={styles.primaryText}>{"Paint My Walls \u2728"}</Text>
            </LinearGradient>
          </LuxPressable>
        </ScrollView>
      ) : null}

      {step === "processing" ? (
        <View style={styles.processingScreen}>
          <MotiView
            animate={{ scale: [0.94, 1.06, 0.94], opacity: [0.18, 0.48, 0.18] }}
            transition={{ duration: 1900, loop: true }}
            style={styles.processingGlow}
          />
          <View style={styles.processingFrame}>
            {selectedImage ? (
              <Image source={{ uri: selectedImage.uri }} style={styles.processingImage} contentFit="cover" />
            ) : null}
            <View style={styles.processingScrim} />
            <MotiView
              animate={{ translateY: [-160, 180], opacity: [0, 1, 0] }}
              transition={{ duration: 1700, loop: true }}
              style={styles.processingScan}
            />
            <View style={styles.processingChip}>
              <View style={[styles.processingChipSwatch, { backgroundColor: selectedColor?.value ?? "#ffffff" }]} />
              <Text style={styles.processingChipText}>{selectedFinish.label} Finish</Text>
            </View>
          </View>
          <View style={styles.processingCopy}>
            <ActivityIndicator size="small" color="#ffffff" />
            <Text style={styles.processingTitle}>AI is analyzing your wall paint...</Text>
            <Text style={styles.processingText}>
              Nano Banana is locking the room structure, isolating the masked walls, and applying {selectedColor?.label ?? "your color"} with a premium finish.
            </Text>
          </View>
        </View>
      ) : null}

      {step === "result" ? (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom + 28, 34),
            gap: 18,
          }}
          showsVerticalScrollIndicator={false}
        >
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
            <Text style={styles.summaryTitle}>{`${selectedColor?.label ?? "Selected Color"} • ${selectedFinish.label}`}</Text>
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
    backgroundColor: OLED_BLACK,
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
    paddingHorizontal: 18,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  topButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  topCopy: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  topTitle: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  topSubtitle: {
    color: "#a1a1aa",
    fontSize: 12,
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
    gap: 6,
    marginTop: 2,
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
    fontWeight: "700",
  },
  stepPillTextActive: {
    color: "#ffffff",
  },
  creditPill: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  creditText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  heroCard: {
    borderRadius: 34,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: CARD_BLACK,
    padding: 22,
    gap: 18,
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 31,
    fontWeight: "800",
    letterSpacing: -1.1,
  },
  heroText: {
    color: "#a1a1aa",
    fontSize: 15,
    lineHeight: 24,
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
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    paddingHorizontal: 28,
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
    gap: 8,
  },
  uploadTitle: {
    color: "#ffffff",
    fontSize: 19,
    fontWeight: "700",
  },
  uploadText: {
    color: "#a1a1aa",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
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
    gap: 10,
  },
  secondaryText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  notesCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: CARD_BLACK_SOFT,
    padding: 18,
    gap: 10,
  },
  notesTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  notesText: {
    color: "#a1a1aa",
    fontSize: 14,
    lineHeight: 22,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  stepTitle: {
    color: "#ffffff",
    fontSize: 29,
    fontWeight: "800",
    letterSpacing: -0.9,
  },
  stepText: {
    color: "#a1a1aa",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 14,
  },
  toolbarRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  toolbarButton: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  toolbarText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  canvasFrame: {
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#020203",
    overflow: "hidden",
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
    padding: 5,
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.62)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  hintText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
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
    backgroundColor: "rgba(217,70,239,0.18)",
  },
  detectCopy: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 28,
  },
  detectTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  detectText: {
    color: "#d4d4d8",
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 280,
  },
  panel: {
    marginTop: 14,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: CARD_BLACK_SOFT,
    padding: 18,
    gap: 16,
  },
  brushRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brushTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  brushMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brushMetaText: {
    color: "#d4d4d8",
    fontSize: 13,
    fontWeight: "700",
  },
  sliderWrap: {
    height: 38,
    justifyContent: "center",
  },
  sliderTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  sliderFill: {
    position: "absolute",
    left: 0,
    height: 6,
    borderRadius: 999,
  },
  sliderThumb: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  sliderThumbDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: "#D946EF",
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonLarge: {
    minHeight: 62,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  disabledButtonLarge: {
    minHeight: 62,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(39,39,42,0.92)",
    opacity: 0.58,
  },
  primaryText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  previewBadge: {
    position: "absolute",
    left: 14,
    top: 14,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.66)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previewSwatch: {
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
  },
  previewSwatchEmpty: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  previewBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  fixedContinueBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    backgroundColor: OLED_BLACK,
  },
  paletteCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: CARD_BLACK_SOFT,
    padding: 16,
    gap: 16,
  },
  paletteTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  swatchGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  swatchButton: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 2,
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
    borderColor: "#D946EF",
    backgroundColor: "rgba(217,70,239,0.1)",
    shadowColor: "#D946EF",
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
    fontWeight: "600",
    textAlign: "center",
  },
  swatchLabelActive: {
    color: "#ffffff",
  },
  finishSummaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  summaryCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: CARD_BLACK_SOFT,
    padding: 18,
    gap: 8,
  },
  summarySwatch: {
    width: 54,
    height: 54,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.7)",
  },
  summaryCopy: {
    flex: 1,
    gap: 4,
  },
  summaryLabel: {
    color: "#a1a1aa",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  summaryTitle: {
    color: "#ffffff",
    fontSize: 24,
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
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  finishCardActive: {
    borderColor: "rgba(217,70,239,0.42)",
    backgroundColor: "rgba(217,70,239,0.08)",
  },
  finishCopy: {
    flex: 1,
    gap: 4,
  },
  finishTitle: {
    color: "#ffffff",
    fontSize: 18,
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
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  finishCheckActive: {
    borderColor: "#D946EF",
    backgroundColor: "#D946EF",
  },
  processingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 20,
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
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.58)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
    fontWeight: "700",
  },
  processingCopy: {
    alignItems: "center",
    gap: 12,
  },
  processingTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.7,
    textAlign: "center",
    maxWidth: 340,
  },
  processingText: {
    color: "#a1a1aa",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 320,
  },
  resultFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  resultRow: {
    flexDirection: "row",
    gap: 12,
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
    gap: 8,
  },
  restartText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
