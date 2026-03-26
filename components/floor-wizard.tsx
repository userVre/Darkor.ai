
import { useAuth } from "@clerk/expo";
import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { AnimatePresence, MotiView } from "moti";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle as SvgCircle, G, Path as SvgPath, Rect } from "react-native-svg";
import { captureRef } from "react-native-view-shot";
import { ArrowLeft, Camera, ChevronLeft, ImagePlus, MoveHorizontal, RotateCcw, Sparkles, Trash2 } from "lucide-react-native";

import { triggerHaptic } from "../lib/haptics";
import { runWithFriendlyRetry } from "../lib/generation-retry";
import { SERVICE_WIZARD_THEME } from "../lib/service-wizard-theme";
import { LuxPressable } from "./lux-pressable";
import { ServiceWizardHeader } from "./service-wizard-header";
import { useProSuccess } from "./pro-success-context";
import { useMaskDrawing } from "./use-mask-drawing";
import { useViewerSession } from "./viewer-session-context";

type WizardStep = "intake" | "mask" | "materials" | "processing" | "result";
type SelectedImage = { uri: string; width: number; height: number };
type MeResponse = { credits: number };
type ArchiveGeneration = { _id: string; imageUrl?: string | null; status?: "processing" | "ready" | "failed"; errorMessage?: string | null };
type MaterialOption = {
  id: string;
  title: string;
  subtitle: string;
  promptLabel: string;
  paletteLabel: string;
  colors: [string, string, string];
  sample: "hardwood" | "marble" | "tile" | "concrete" | "parquet";
};

const pointerClassName = "cursor-pointer";
const MASK_COLOR = "rgba(236, 72, 153, 0.58)";
const MIN_BRUSH = 10;
const MAX_BRUSH = 54;
const DETECT_MS = 1500;
const LOUPE_SIZE = 116;
const LOUPE_ZOOM = 1.8;
const absoluteFill = { position: "absolute" as const, top: 0, right: 0, bottom: 0, left: 0 };
const MASK_CONTINUE_GRADIENT = SERVICE_WIZARD_THEME.gradients.accent;

const MATERIALS: MaterialOption[] = [
  { id: "hardwood", title: "Hardwood", subtitle: "Wide-plank warmth with luxury matte depth.", promptLabel: "premium wide-plank hardwood flooring", paletteLabel: "Hardwood", colors: ["#6F4A32", "#A06E47", "#D0A173"], sample: "hardwood" },
  { id: "marble", title: "Marble", subtitle: "Polished stone veining with upscale contrast.", promptLabel: "polished marble flooring with refined natural veining", paletteLabel: "Marble", colors: ["#F1EEEA", "#D4D0CB", "#B7B2AB"], sample: "marble" },
  { id: "concrete", title: "Polished Concrete", subtitle: "Architectural grey with seamless gallery-grade texture.", promptLabel: "polished concrete flooring", paletteLabel: "Polished Concrete", colors: ["#4F5660", "#767D87", "#A7AEB6"], sample: "concrete" },
  { id: "parquet", title: "Parquet", subtitle: "Boutique parquet geometry with rich movement.", promptLabel: "luxury parquet flooring with refined pattern direction", paletteLabel: "Parquet", colors: ["#4E3021", "#7F5438", "#BA8157"], sample: "parquet" },
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

async function readBlobFromUri(uri: string) {
  const response = await fetch(uri);
  if (!response.ok) throw new Error("Unable to load the selected image.");
  return await response.blob();
}

function MaterialSample({ option }: { option: MaterialOption }) {
  const [c1, c2, c3] = option.colors;
  if (option.sample === "tile") {
    return <LinearGradient colors={[c1, c2]} style={styles.sample}>{[0, 1].map((r) => <View key={r} style={styles.tileRow}>{[0, 1].map((c) => <View key={`${r}-${c}`} style={[styles.tileBlock, { backgroundColor: (r + c) % 2 === 0 ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)" }]} />)}</View>)}</LinearGradient>;
  }
  if (option.sample === "concrete") {
    return <LinearGradient colors={[c1, c2, c3]} style={styles.sample}>{[0, 1, 2, 3, 4].map((i) => <View key={i} style={{ position: "absolute", top: 16 + i * 22, left: 12 + i * 7, width: 100 - i * 8, height: 10, borderRadius: 999, backgroundColor: i % 2 === 0 ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }} />)}</LinearGradient>;
  }
  if (option.sample === "marble") {
    return <LinearGradient colors={[c1, c2]} style={styles.sample}>{[0, 1, 2, 3].map((i) => <View key={i} style={{ position: "absolute", top: 10 + i * 28, left: i % 2 === 0 ? 18 : 66, width: 66, height: 108, borderRadius: 40, backgroundColor: i % 2 === 0 ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.05)", transform: [{ rotate: `${i % 2 === 0 ? 28 : -26}deg` }] }} />)}</LinearGradient>;
  }
  if (option.sample === "parquet") {
    return <LinearGradient colors={[c1, c2, c3]} style={styles.sample}>{[0, 1, 2, 3].map((i) => <View key={`l-${i}`} style={{ position: "absolute", top: 10 + i * 26, left: 18, width: 54, height: 15, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.11)", transform: [{ rotate: "38deg" }] }} />)}{[0, 1, 2, 3].map((i) => <View key={`r-${i}`} style={{ position: "absolute", top: 12 + i * 26, right: 18, width: 54, height: 15, borderRadius: 8, backgroundColor: "rgba(0,0,0,0.14)", transform: [{ rotate: "-38deg" }] }} />)}</LinearGradient>;
  }
  return <LinearGradient colors={[c1, c2, c3]} style={[styles.sample, styles.hardwoodSample]}>{[0, 1, 2, 3].map((i) => <View key={i} style={{ flex: 1, borderRadius: 14, backgroundColor: i % 2 === 0 ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.12)" }} />)}</LinearGradient>;
}

const MaterialCard = memo(function MaterialCard({ option, active, width, onPress }: { option: MaterialOption; active: boolean; width: number; onPress: () => void }) {
  return (
    <LuxPressable onPress={onPress} pressableClassName={pointerClassName} className={pointerClassName} style={{ width }} glowColor={active ? SERVICE_WIZARD_THEME.colors.accentGlowSoft : "rgba(255,255,255,0.04)"} scale={0.99}>
      <View style={[styles.materialCard, active ? styles.materialCardActive : null]}>
        <View style={styles.materialPreview}>
          <MaterialSample option={option} />
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.8)"]} style={styles.previewOverlay} />
          <View style={styles.previewCopy}>
            <Text style={styles.materialTitle}>{option.title}</Text>
            <Text style={[styles.materialSubtitle, active ? styles.materialSubtitleActive : null]} numberOfLines={2}>{option.subtitle}</Text>
          </View>
        </View>
      </View>
    </LuxPressable>
  );
});

export function FloorWizard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
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
  const [isDetecting, setIsDetecting] = useState(false);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [awaitingAuth, setAwaitingAuth] = useState(false);
  const [comparisonPosition, setComparisonPosition] = useState(0.52);

  const detectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    resetMaskDrawing,
    drawGesture,
    sliderGesture,
    loupeMetrics,
  } = useMaskDrawing({
    disabled: isDetecting,
    initialBrushWidth: 24,
    minBrushWidth: MIN_BRUSH,
    maxBrushWidth: MAX_BRUSH,
    loupeSize: LOUPE_SIZE,
    loupeZoom: LOUPE_ZOOM,
  });

  const selectedMaterial = useMemo(() => MATERIALS.find((m) => m.id === selectedMaterialId) ?? null, [selectedMaterialId]);
  const creditBalance = viewerReady ? me?.credits ?? 3 : 3;
  const currentStepNumber =
    step === "intake" ? 1 : step === "mask" ? 2 : step === "materials" ? 3 : 4;
  const canContinueFromMask = hasMask && !isDetecting;
  const aspectRatio = useMemo(() => {
    if (!selectedImage) return 1.15;
    const r = selectedImage.width / Math.max(selectedImage.height, 1);
    return Math.max(0.78, Math.min(r, 1.55));
  }, [selectedImage]);
  const materialCardWidth = Math.max((width - 46) / 2, 154);
  const resultFrameWidth = Math.max(width - 32, 320);
  const canContinueFromMaterials = Boolean(selectedImage && hasMask && selectedMaterial && !isGenerating);

  useEffect(() => () => { if (detectTimerRef.current) clearTimeout(detectTimerRef.current); }, []);

  useEffect(() => {
    if (!generationId || !generationArchive) return;
    const generation = generationArchive.find((item) => item._id === generationId);
    if (!generation) return;
    if (generation.status === "ready" && generation.imageUrl) {
      setGeneratedImageUrl(generation.imageUrl);
      setIsGenerating(false);
      setComparisonPosition(0.52);
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
      setStep("materials");
      showToast(generation.errorMessage ?? "Unable to restyle the floor right now.");
    }
  }, [generationArchive, generationId, isSignedIn, router, showToast]);

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
    resetMaskDrawing({ resetBrush: true });
    setSelectedMaterialId(null);
  }, [resetMaskDrawing]);

  const uploadBlobToStorage = useCallback(async (uri: string) => {
    const uploadUrl = (await createSourceUploadUrl(viewerArgs)) as string;
    const blob = await readBlobFromUri(uri);
    const response = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": blob.type || "image/png" }, body: blob });
    if (!response.ok) throw new Error("Unable to upload the selected floor image.");
    const json = (await response.json()) as { storageId?: string };
    if (!json.storageId) throw new Error("Convex did not return a storage id.");
    return json.storageId;
  }, [createSourceUploadUrl, viewerArgs]);

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
      setSelectedImage({ uri: asset.uri, width: asset.width ?? 1080, height: asset.height ?? 1440 });
      setGeneratedImageUrl(null);
      setGenerationId(null);
      resetMaskDrawing({ resetBrush: true });
      setSelectedMaterialId(null);
      setStep("mask");
      resetDetection();
    } catch (error) {
      Alert.alert("Unable to open media", error instanceof Error ? error.message : "Please try again.");
    }
  }, [resetDetection, resetMaskDrawing]);

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
    if (creditBalance <= 0) {
      if (!isSignedIn) {
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
            anonymousId,
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
      const message = error instanceof Error ? error.message : "Please try again.";
      if (message === "Payment Required") {
        if (!isSignedIn) {
          setAwaitingAuth(true);
          router.push({ pathname: "/sign-in", params: { returnTo: "/workspace?service=floor" } });
          return;
        }
        router.push("/paywall");
        return;
      }
      showToast(message);
    }
  }, [anonymousId, creditBalance, hasMask, isSignedIn, router, selectedImage, selectedMaterial, showToast, startGeneration, uploadBlobToStorage, viewerReady]);

  useEffect(() => {
    if (!awaitingAuth || !isSignedIn || !viewerReady || !selectedImage || !hasMask) {
      return;
    }

    setAwaitingAuth(false);
    const timer = setTimeout(() => {
      void handleGenerate();
    }, 300);
    return () => clearTimeout(timer);
  }, [awaitingAuth, handleGenerate, hasMask, isSignedIn, selectedImage, viewerReady]);

  const handleBack = useCallback(() => {
    if (step === "intake") return router.back();
    if (step === "mask") return setStep("intake");
    if (step === "materials") return setStep("mask");
    if (step === "result") return setStep("materials");
  }, [router, step]);

  return (
    <View style={styles.screen}>
      {selectedImage && canvasSize.width > 0 && canvasSize.height > 0 ? (
        <View pointerEvents="none" style={styles.captureStage}>
          <View ref={sourceCaptureRef} collapsable={false} style={{ width: canvasSize.width, height: canvasSize.height, backgroundColor: "#000000" }}>
            <Image source={{ uri: selectedImage.uri }} style={styles.photoImage} contentFit="cover" />
          </View>
          <View ref={maskCaptureRef} collapsable={false} style={{ marginTop: 8, width: canvasSize.width, height: canvasSize.height, backgroundColor: "#000000" }}>
            <Svg width={canvasSize.width} height={canvasSize.height}>
              <Rect x={0} y={0} width={canvasSize.width} height={canvasSize.height} fill="#000000" />
              {renderedStrokes.map((stroke) => <SvgPath key={`mask-${stroke.id}`} d={stroke.path} stroke="#FFFFFF" strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" fill="none" />)}
            </Svg>
          </View>
        </View>
      ) : null}

      <ServiceWizardHeader
        title="Floor Restyle"
        step={currentStepNumber}
        topInset={insets.top}
        leftAccessory={
          <LuxPressable onPress={handleBack} className={pointerClassName} style={styles.topButton} glowColor="rgba(255,255,255,0.06)" scale={0.97}>
            <ArrowLeft color="#ffffff" size={18} />
          </LuxPressable>
        }
        rightAccessory={
          <View style={styles.creditPill}>
            <Text style={styles.creditText}>{creditBalance}</Text>
          </View>
        }
      />

      {step === "intake" ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: Math.max(insets.bottom + 28, 34), gap: 18 }} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={SERVICE_WIZARD_THEME.gradients.hero} style={styles.heroCard}>
            <View style={styles.heroIcon}><Sparkles color={SERVICE_WIZARD_THEME.colors.accent} size={22} /></View>
            <Text style={styles.heroTitle}>Add a Photo</Text>
            <Text style={styles.heroText}>Upload a clean room image so Home AI can read the floor plane, preserve furniture placement, and map new materials with real estate-grade precision.</Text>
            <View style={styles.tipCard}><Text style={styles.tipLabel}>Tip</Text><Text style={styles.tipText}>For best results, make sure the floor is clearly visible.</Text></View>
            <LuxPressable onPress={() => handleSelectMedia("library")} className={pointerClassName} style={{ width: "100%" }} glowColor={SERVICE_WIZARD_THEME.colors.accentGlowSoft} scale={0.99}><LinearGradient colors={SERVICE_WIZARD_THEME.gradients.accentButton} style={styles.primaryButton}><ImagePlus color="#ffffff" size={18} /><Text style={styles.primaryText}>Upload Photo</Text></LinearGradient></LuxPressable>
            <LuxPressable onPress={() => handleSelectMedia("camera")} className={pointerClassName} style={{ width: "100%" }} glowColor="rgba(255,255,255,0.05)" scale={0.99}><View style={styles.secondaryButton}><Camera color="#ffffff" size={18} /><Text style={styles.secondaryText}>Capture with Camera</Text></View></LuxPressable>
          </LinearGradient>
        </ScrollView>
      ) : null}

      {step === "mask" ? (
        <>
          <ScrollView
            scrollEnabled={!isDrawing}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 10,
              paddingBottom: Math.max(insets.bottom + 244, 268),
              gap: 16,
            }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.stepTitle}>Mark Area</Text>
            <Text style={styles.stepText}>Brush directly over the visible floor. Keep walls, furniture, and built-ins untouched so the restyle stays precise.</Text>
            <View onLayout={handleCanvasLayout} style={[styles.frame, { aspectRatio }]}>
              {selectedImage ? (
                <>
                  <Image source={{ uri: selectedImage.uri }} style={styles.photoImage} contentFit="cover" transition={160} />
                  <GestureDetector gesture={drawGesture}><View style={absoluteFill}><Svg width="100%" height="100%">{renderedStrokes.map((stroke) => <SvgPath key={stroke.id} d={stroke.path} stroke={MASK_COLOR} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" fill="none" />)}</Svg></View></GestureDetector>
                  {activePoint ? <View pointerEvents="none" style={{ position: "absolute", left: Math.max(14, Math.min(activePoint.x - brushWidth * 0.5, Math.max(canvasSize.width - brushWidth - 14, 14))), top: Math.max(14, Math.min(activePoint.y - brushWidth * 0.5, Math.max(canvasSize.height - brushWidth - 14, 14))), width: brushWidth, height: brushWidth, borderRadius: 999, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.78)", backgroundColor: "rgba(255,0,0,0.18)" }} /> : null}
                  {selectedImage && loupeMetrics ? (
                    <View pointerEvents="none" style={[styles.loupe, { left: loupeMetrics.left, top: loupeMetrics.top, width: loupeMetrics.size, height: loupeMetrics.size }]}>
                      <View style={styles.loupeInner}>
                        <Image source={{ uri: selectedImage.uri }} style={{ position: "absolute", width: canvasSize.width * loupeMetrics.zoom, height: canvasSize.height * loupeMetrics.zoom, left: loupeMetrics.translateX, top: loupeMetrics.translateY }} contentFit="cover" />
                        <Svg width={loupeMetrics.size} height={loupeMetrics.size} style={absoluteFill}>
                          <G transform={`translate(${loupeMetrics.translateX} ${loupeMetrics.translateY}) scale(${loupeMetrics.zoom})`}>
                            {renderedStrokes.map((stroke) => <SvgPath key={`loupe-${stroke.id}`} d={stroke.path} stroke={MASK_COLOR} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" fill="none" />)}
                          </G>
                          <SvgCircle cx={loupeMetrics.size / 2} cy={loupeMetrics.size / 2} r={8} fill="none" stroke="#ffffff" strokeWidth={1.5} />
                          <SvgPath d={`M ${loupeMetrics.size / 2 - 14} ${loupeMetrics.size / 2} L ${loupeMetrics.size / 2 + 14} ${loupeMetrics.size / 2}`} stroke="#ffffff" strokeWidth={1} />
                          <SvgPath d={`M ${loupeMetrics.size / 2} ${loupeMetrics.size / 2 - 14} L ${loupeMetrics.size / 2} ${loupeMetrics.size / 2 + 14}`} stroke="#ffffff" strokeWidth={1} />
                        </Svg>
                      </View>
                    </View>
                  ) : null}
                  <View style={styles.canvasToolbar}>
                    <LuxPressable onPress={undoLastStroke} disabled={!strokes.length} className={pointerClassName} style={styles.canvasToolbarButton} glowColor="rgba(255,255,255,0.04)" scale={0.98}><RotateCcw color="#ffffff" size={16} /><Text style={styles.canvasToolbarText}>Undo</Text></LuxPressable>
                    <LuxPressable onPress={clearMask} disabled={!strokes.length} className={pointerClassName} style={styles.canvasToolbarButton} glowColor="rgba(255,255,255,0.04)" scale={0.98}><Trash2 color="#ffffff" size={16} /><Text style={styles.canvasToolbarText}>Clear All</Text></LuxPressable>
                  </View>
                  <View pointerEvents="none" style={styles.hintPill}><Text style={styles.hintText}>Brush only the floor plane. The loupe follows your finger for cleaner edges.</Text></View>
                  <AnimatePresence>{isDetecting ? <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={styles.detectOverlay}><MotiView animate={{ scale: [0.92, 1.08, 0.92], opacity: [0.16, 0.52, 0.16] }} transition={{ duration: 1800, loop: true }} style={styles.detectPulse} /><View style={styles.detectCopy}><ActivityIndicator color="#ffffff" /><Text style={styles.detectTitle}>Preparing the floor plane...</Text><Text style={styles.detectText}>Setting up a precise masking surface so the material map stays clean around furniture and edges.</Text></View></MotiView> : null}</AnimatePresence>
                </>
              ) : null}
            </View>
          </ScrollView>

          <View style={[styles.fixedContinueBar, styles.maskContinueBar, { paddingBottom: Math.max(insets.bottom + 12, 24) }]}>
            <View style={styles.maskControlCard}>
              <View style={styles.brushRow}><Text style={styles.brushTitle}>Brush Size</Text><View style={styles.brushMeta}><View style={{ width: Math.max(brushWidth, 14), height: Math.max(brushWidth, 14), borderRadius: 999, backgroundColor: MASK_COLOR, borderWidth: 1, borderColor: "rgba(255,255,255,0.22)" }} /><Text style={styles.brushMetaText}>{brushWidth}px</Text></View></View>
              <GestureDetector gesture={sliderGesture}><View onLayout={(event) => setSliderWidth(event.nativeEvent.layout.width)} style={styles.sliderWrap}><View style={styles.sliderTrack} /><LinearGradient colors={MASK_CONTINUE_GRADIENT} style={[styles.sliderFill, { width: Math.max(14, sliderWidth * brushProgress) }]} /><View style={[styles.sliderThumb, { left: Math.max(0, sliderWidth * brushProgress - 16) }]}><View style={styles.sliderThumbDot} /></View></View></GestureDetector>
            </View>
            <LuxPressable onPress={() => { triggerHaptic(); setStep("materials"); }} disabled={!canContinueFromMask} pressableClassName={pointerClassName} className={pointerClassName} style={{ width: "100%" }} glowColor={SERVICE_WIZARD_THEME.colors.accentGlow} scale={0.99}>
              {canContinueFromMask ? (
                <LinearGradient colors={MASK_CONTINUE_GRADIENT} style={styles.primaryButtonLarge}><Text style={styles.primaryText}>Continue</Text></LinearGradient>
              ) : (
                <View style={styles.disabledButtonLarge}><Text style={styles.primaryText}>Continue</Text></View>
              )}
            </LuxPressable>
          </View>
        </>
      ) : null}

      {step === "materials" ? (
        <>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: Math.max(insets.bottom + 122, 138), gap: 18 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.stepTitle}>Select Material</Text>
            <Text style={styles.stepText}>Choose a premium finish engineered to feel photoreal, perspective-aware, and market-ready in a modern listing presentation.</Text>
            <View style={styles.grid}>{MATERIALS.map((option) => <MaterialCard key={option.id} option={option} active={option.id === selectedMaterial?.id} width={materialCardWidth} onPress={() => { setSelectedMaterialId(option.id); triggerHaptic(); }} />)}</View>
            <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Selected</Text><Text style={styles.summaryTitle}>{selectedMaterial?.title ?? "No material selected"}</Text><Text style={styles.summaryText}>{selectedMaterial?.subtitle ?? "Choose a flooring material to unlock the AI restyle."}</Text></View>
          </ScrollView>

          <View style={[styles.fixedContinueBar, { paddingBottom: Math.max(insets.bottom + 12, 24) }]}>
            <LuxPressable onPress={() => { void handleGenerate(); }} disabled={!canContinueFromMaterials} pressableClassName={pointerClassName} className={pointerClassName} style={{ width: "100%" }} glowColor={SERVICE_WIZARD_THEME.colors.accentGlowSoft} scale={0.99}>
              {canContinueFromMaterials ? (
                <LinearGradient colors={SERVICE_WIZARD_THEME.gradients.accentButton} style={styles.primaryButtonLarge}><Text style={styles.primaryText}>Continue</Text></LinearGradient>
              ) : (
                <View style={styles.disabledButtonLarge}><Text style={styles.primaryText}>Continue</Text></View>
              )}
            </LuxPressable>
          </View>
        </>
      ) : null}

      {step === "processing" ? (
        <View style={styles.processingScreen}>
          <MotiView animate={{ scale: [0.92, 1.08, 0.92], opacity: [0.16, 0.52, 0.16] }} transition={{ duration: 1900, loop: true }} style={styles.processingPulse} />
          <View style={styles.processingFrame}>
            {selectedImage ? <Image source={{ uri: selectedImage.uri }} style={styles.processingImage} contentFit="cover" /> : null}
            <View style={styles.processingScrim} />
            <MotiView animate={{ translateY: [-28, 168], opacity: [0, 0.32, 0] }} transition={{ duration: 1600, loop: true }} style={styles.processingBeam} />
          </View>
          <View style={styles.processingCopy}>
            <ActivityIndicator size="small" color="#ffffff" />
            <Text style={styles.processingTitle}>AI is analyzing your floor restyle...</Text>
            <Text style={styles.processingText}>Nano Banana is reading the room geometry, locking the floor plane, and mapping your selected material with realistic scale and reflections.</Text>
          </View>
        </View>
      ) : null}

      {step === "result" ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: Math.max(insets.bottom + 28, 34), gap: 18 }} showsVerticalScrollIndicator={false}>
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
  topBar: { paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  topButton: { height: 44, width: 44, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: SERVICE_WIZARD_THEME.colors.border },
  topCopy: { flex: 1, alignItems: "center", gap: 6 },
  topTitle: { color: "#ffffff", fontSize: 19, fontWeight: "800", letterSpacing: -0.3 },
  topSubtitle: { color: "#a1a1aa", fontSize: 12, fontWeight: "700" },
  progressTrack: { width: "100%", maxWidth: 170, height: 8, borderRadius: 999, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.12)" },
  progressFillWrap: { height: "100%", overflow: "hidden", borderRadius: 999 },
  progressFill: { height: "100%", borderRadius: 999 },
  stepRow: { flexDirection: "row", gap: 8 },
  stepPill: { height: 24, width: 24, borderRadius: 999, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" },
  stepPillActive: { borderColor: SERVICE_WIZARD_THEME.colors.accentBorderStrong, backgroundColor: SERVICE_WIZARD_THEME.colors.accentSurfaceStrong },
  stepPillText: { color: "#71717a", fontSize: 11, fontWeight: "800" },
  stepPillTextActive: { color: "#ffffff" },
  creditPill: { minWidth: 44, height: 44, paddingHorizontal: 12, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: SERVICE_WIZARD_THEME.colors.border },
  creditText: { color: "#ffffff", fontSize: 12, fontWeight: "800" },
  heroCard: { minHeight: 360, borderRadius: 34, borderWidth: 1, borderColor: SERVICE_WIZARD_THEME.colors.border, padding: 24, gap: 18, backgroundColor: SERVICE_WIZARD_THEME.colors.surfaceOverlay },
  heroIcon: { height: 54, width: 54, borderRadius: 18, backgroundColor: SERVICE_WIZARD_THEME.colors.accentSurfaceStrong, alignItems: "center", justifyContent: "center" },
  heroTitle: { color: SERVICE_WIZARD_THEME.colors.textPrimary, lineHeight: 34, ...SERVICE_WIZARD_THEME.typography.heroTitle },
  heroText: { color: SERVICE_WIZARD_THEME.colors.textMuted, ...SERVICE_WIZARD_THEME.typography.compactBodyText },
  tipCard: { borderRadius: 24, borderWidth: 1, borderColor: SERVICE_WIZARD_THEME.colors.accentBorder, backgroundColor: SERVICE_WIZARD_THEME.colors.accentSurface, paddingHorizontal: 16, paddingVertical: 14, gap: 4 },
  tipLabel: { color: SERVICE_WIZARD_THEME.colors.accentText, fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  tipText: { color: "#f4f4f5", fontSize: 13, lineHeight: 19, fontWeight: "600" },
  primaryButton: { minHeight: 58, borderRadius: 24, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  primaryButtonLarge: { minHeight: 62, borderRadius: 24, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  disabledButtonLarge: { minHeight: 62, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: SERVICE_WIZARD_THEME.colors.disabledSurface, opacity: 0.58 },
  primaryText: { color: "#ffffff", fontSize: 15, fontWeight: "800" },
  secondaryButton: { minHeight: 58, borderRadius: 24, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.03)" },
  secondaryText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
  content: { flex: 1, paddingHorizontal: 16, gap: 14 },
  stepTitle: { color: SERVICE_WIZARD_THEME.colors.textPrimary, lineHeight: 34, ...SERVICE_WIZARD_THEME.typography.sectionTitle },
  stepText: { color: SERVICE_WIZARD_THEME.colors.textMuted, ...SERVICE_WIZARD_THEME.typography.compactBodyText },
  toolbarRow: { flexDirection: "row", gap: 12 },
  toolbarButton: { flex: 1, height: 44, borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  toolbarText: { color: "#ffffff", fontSize: 13, fontWeight: "700" },
  frame: { width: "100%", borderRadius: 34, overflow: "hidden", borderWidth: 1, borderColor: SERVICE_WIZARD_THEME.colors.border, backgroundColor: "#000000" },
  canvasToolbar: { position: "absolute", top: 14, right: 14, flexDirection: "row", gap: 8 },
  canvasToolbarButton: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(10,10,12,0.82)", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  canvasToolbarText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
  photoImage: { width: "100%", height: "100%" },
  loupe: { position: "absolute", width: 116, height: 116, borderRadius: 999, padding: 5, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", shadowColor: "#000000", shadowOpacity: 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  loupeInner: { flex: 1, borderRadius: 999, overflow: "hidden", backgroundColor: "#060607" },
  hintPill: { position: "absolute", left: 16, right: 16, bottom: 16, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.66)", paddingHorizontal: 14, paddingVertical: 9 },
  hintText: { color: "#ffffff", fontSize: 12, fontWeight: "700", textAlign: "center" },
  detectOverlay: { ...absoluteFill, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(5,5,6,0.52)" },
  detectPulse: { position: "absolute", width: 220, height: 220, borderRadius: 999, backgroundColor: SERVICE_WIZARD_THEME.colors.accentGlowSoft },
  detectCopy: { alignItems: "center", gap: 12, paddingHorizontal: 24 },
  detectTitle: { color: "#ffffff", fontSize: 20, fontWeight: "800", textAlign: "center" },
  detectText: { color: "#d4d4d8", fontSize: 13, lineHeight: 20, textAlign: "center", maxWidth: 270 },
  maskControlCard: { borderRadius: 24, borderWidth: 1, borderColor: SERVICE_WIZARD_THEME.colors.border, backgroundColor: "#0a0a0c", paddingHorizontal: 18, paddingVertical: 16, gap: 14 },
  brushRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brushTitle: { color: "#ffffff", fontSize: 16, fontWeight: "800" },
  brushMeta: { flexDirection: "row", alignItems: "center", gap: 10 },
  brushMetaText: { color: "#d4d4d8", fontSize: 13, fontWeight: "700" },
  sliderWrap: { height: 38, justifyContent: "center" },
  sliderTrack: { height: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)" },
  sliderFill: { position: "absolute", left: 0, height: 6, borderRadius: 999 },
  sliderThumb: { position: "absolute", width: 32, height: 32, borderRadius: 999, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center" },
  sliderThumbDot: { width: 14, height: 14, borderRadius: 999, backgroundColor: SERVICE_WIZARD_THEME.colors.accent },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  materialCard: { borderRadius: 30, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#0a0a0c" },
  materialCardActive: { borderColor: SERVICE_WIZARD_THEME.colors.accent, backgroundColor: SERVICE_WIZARD_THEME.colors.accentSurface },
  materialPreview: { aspectRatio: 1, backgroundColor: "#101012" },
  previewOverlay: { position: "absolute", left: 0, right: 0, bottom: 0, height: 96 },
  previewCopy: { position: "absolute", left: 14, right: 14, bottom: 14 },
  materialTitle: { color: "#ffffff", fontSize: 18, fontWeight: "800" },
  materialSubtitle: { color: "#d4d4d8", fontSize: 12, lineHeight: 18, marginTop: 4 },
  materialSubtitleActive: { color: SERVICE_WIZARD_THEME.colors.accentText },
  sample: { flex: 1 },
  hardwoodSample: { paddingHorizontal: 8, paddingVertical: 10, gap: 8 },
  tileRow: { flex: 1, flexDirection: "row", gap: 6, paddingHorizontal: 8, paddingTop: 8 },
  tileBlock: { flex: 1, borderRadius: 16 },
  summaryCard: { borderRadius: 28, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#0a0a0c", padding: 18, gap: 8 },
  fixedContinueBar: { position: "absolute", left: 0, right: 0, bottom: 0, paddingTop: 14, paddingHorizontal: 16, gap: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)", backgroundColor: SERVICE_WIZARD_THEME.colors.background },
  maskContinueBar: { zIndex: 30, elevation: 30 },
  summaryLabel: { color: SERVICE_WIZARD_THEME.colors.accentText, fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  summaryTitle: { color: "#ffffff", fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  summaryText: { color: "#b4b4bb", fontSize: 14, lineHeight: 22 },
  processingScreen: { flex: 1, paddingHorizontal: 22, alignItems: "center", justifyContent: "center" },
  processingPulse: { position: "absolute", width: 250, height: 250, borderRadius: 999, backgroundColor: SERVICE_WIZARD_THEME.colors.accentGlowSoft },
  processingFrame: { width: 220, height: 280, borderRadius: 34, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#050505", alignItems: "center", justifyContent: "center", marginBottom: 22 },
  processingImage: { position: "absolute", inset: 0, width: "100%", height: "100%" },
  processingScrim: { position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.42)" },
  processingBeam: { position: "absolute", left: 14, right: 14, height: 120, borderRadius: 28, backgroundColor: SERVICE_WIZARD_THEME.colors.accentSurface, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  processingCopy: { alignItems: "center", gap: 12 },
  processingTitle: { color: "#ffffff", fontSize: 24, fontWeight: "800", textAlign: "center" },
  processingText: { color: "#c4c4cc", fontSize: 14, lineHeight: 22, textAlign: "center", maxWidth: 320 },
  resultFrame: { borderRadius: 34, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#000000" },
  resultDivider: { position: "absolute", top: 0, bottom: 0, width: 2, backgroundColor: "rgba(255,255,255,0.92)" },
  resultHandle: { height: 46, width: 46, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.65)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)" },
  badge: { position: "absolute", top: 14, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.45)", paddingHorizontal: 12, paddingVertical: 8 },
  badgeText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
  resultFallback: { height: 320, alignItems: "center", justifyContent: "center" },
  resultRow: { flexDirection: "row", gap: 12 },
  secondaryAction: { minHeight: 56, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.03)" },
  secondaryActionText: { color: "#ffffff", fontSize: 14, fontWeight: "700" },
  restartButton: { minHeight: 56, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.03)", flexDirection: "row", gap: 8 },
  restartText: { color: "#ffffff", fontSize: 14, fontWeight: "700" },
});
