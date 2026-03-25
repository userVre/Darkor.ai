
import { useAuth } from "@clerk/expo";
import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { AnimatePresence, MotiView } from "moti";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path as SvgPath, Rect } from "react-native-svg";
import { captureRef } from "react-native-view-shot";
import { ArrowLeft, Camera, ChevronLeft, ImagePlus, MoveHorizontal, RotateCcw, Sparkles, Trash2 } from "lucide-react-native";

import { triggerHaptic } from "../lib/haptics";
import { LuxPressable } from "./lux-pressable";
import { useViewerSession } from "./viewer-session-context";

type WizardStep = "intake" | "mask" | "materials" | "processing" | "result";
type SelectedImage = { uri: string; width: number; height: number };
type MaskPoint = { x: number; y: number };
type MaskStroke = { id: string; width: number; points: MaskPoint[] };
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
const MASK_COLOR = "rgba(245,158,11,0.4)";
const MIN_BRUSH = 10;
const MAX_BRUSH = 54;
const DETECT_MS = 1500;
const absoluteFill = { position: "absolute" as const, top: 0, right: 0, bottom: 0, left: 0 };

const MATERIALS: MaterialOption[] = [
  { id: "hardwood", title: "Hardwood", subtitle: "Wide-plank warmth with luxury matte depth.", promptLabel: "premium wide-plank hardwood flooring", paletteLabel: "Hardwood", colors: ["#6F4A32", "#A06E47", "#D0A173"], sample: "hardwood" },
  { id: "marble", title: "Marble", subtitle: "Polished stone veining with upscale contrast.", promptLabel: "polished marble flooring with refined natural veining", paletteLabel: "Marble", colors: ["#F1EEEA", "#D4D0CB", "#B7B2AB"], sample: "marble" },
  { id: "tile", title: "Tile", subtitle: "Large-format tile with crisp premium joints.", promptLabel: "large-format designer tile flooring", paletteLabel: "Tile", colors: ["#E2D3C1", "#BFA689", "#8F7255"], sample: "tile" },
  { id: "concrete", title: "Concrete", subtitle: "Architectural grey with seamless texture.", promptLabel: "polished concrete flooring", paletteLabel: "Concrete", colors: ["#4F5660", "#767D87", "#A7AEB6"], sample: "concrete" },
  { id: "parquet", title: "Parquet", subtitle: "Boutique parquet geometry with rich movement.", promptLabel: "luxury parquet flooring with refined pattern direction", paletteLabel: "Parquet", colors: ["#4E3021", "#7F5438", "#BA8157"], sample: "parquet" },
] as const;

function buildPath(points: MaskPoint[]) {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y} L ${points[0].x} ${points[0].y}`;
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
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
    <LuxPressable onPress={onPress} className={pointerClassName} style={{ width }} glowColor={active ? "rgba(245,158,11,0.18)" : "rgba(255,255,255,0.04)"} scale={0.99}>
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
  const viewerArgs = useMemo(() => (anonymousId ? { anonymousId } : {}), [anonymousId]);

  const me = useQuery("users:me" as any, viewerReady ? viewerArgs : "skip") as MeResponse | null | undefined;
  const generationArchive = useQuery("generations:getUserArchive" as any, viewerReady ? viewerArgs : "skip") as
    | ArchiveGeneration[]
    | undefined;
  const createSourceUploadUrl = useMutation("generations:createSourceUploadUrl" as any);
  const startGeneration = useMutation("generations:startGeneration" as any);

  const [step, setStep] = useState<WizardStep>("intake");
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [strokes, setStrokes] = useState<MaskStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<MaskStroke | null>(null);
  const [brushWidth, setBrushWidth] = useState(24);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [sliderWidth, setSliderWidth] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [activePoint, setActivePoint] = useState<MaskPoint | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState(MATERIALS[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [awaitingAuth, setAwaitingAuth] = useState(false);
  const [comparisonPosition, setComparisonPosition] = useState(0.52);

  const detectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const strokeIdRef = useRef(0);
  const currentStrokeRef = useRef<MaskStroke | null>(null);
  const sourceCaptureRef = useRef<View>(null);
  const maskCaptureRef = useRef<View>(null);

  const selectedMaterial = useMemo(() => MATERIALS.find((m) => m.id === selectedMaterialId) ?? MATERIALS[0], [selectedMaterialId]);
  const renderedStrokes = useMemo(() => (currentStroke ? [...strokes, currentStroke] : strokes), [currentStroke, strokes]);
  const hasMask = strokes.length > 0;
  const brushProgress = sliderWidth > 0 ? (brushWidth - MIN_BRUSH) / (MAX_BRUSH - MIN_BRUSH) : 0.34;
  const creditBalance = viewerReady ? me?.credits ?? 3 : 3;
  const aspectRatio = useMemo(() => {
    if (!selectedImage) return 1.15;
    const r = selectedImage.width / Math.max(selectedImage.height, 1);
    return Math.max(0.78, Math.min(r, 1.55));
  }, [selectedImage]);
  const materialCardWidth = Math.max((width - 46) / 2, 154);
  const resultFrameWidth = Math.max(width - 32, 320);

  useEffect(() => () => { if (detectTimerRef.current) clearTimeout(detectTimerRef.current); }, []);

  useEffect(() => {
    if (!generationId || !generationArchive) return;
    const generation = generationArchive.find((item) => item._id === generationId);
    if (!generation) return;
    if (generation.status === "ready" && generation.imageUrl) {
      setGeneratedImageUrl(generation.imageUrl);
      setStep("result");
      setIsGenerating(false);
      setComparisonPosition(0.52);
      triggerHaptic();
      return;
    }
    if (generation.status === "failed") {
      setIsGenerating(false);
      setStep("materials");
      Alert.alert("Generation failed", generation.errorMessage ?? "Please try again.");
    }
  }, [generationArchive, generationId]);

  const resetDetection = useCallback(() => {
    if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
    setIsDetecting(true);
    detectTimerRef.current = setTimeout(() => setIsDetecting(false), DETECT_MS);
  }, []);

  const resetProject = useCallback(() => {
    setStep("intake");
    setSelectedImage(null);
    setStrokes([]);
    setCurrentStroke(null);
    currentStrokeRef.current = null;
    setGeneratedImageUrl(null);
    setGenerationId(null);
    setIsGenerating(false);
    setActivePoint(null);
    setCanvasSize({ width: 0, height: 0 });
  }, []);

  const clampPoint = useCallback((x: number, y: number) => ({ x: Math.max(0, Math.min(x, canvasSize.width)), y: Math.max(0, Math.min(y, canvasSize.height)) }), [canvasSize.height, canvasSize.width]);
  const handleCanvasLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    setCanvasSize((current) => current.width === nextWidth && current.height === nextHeight ? current : { width: nextWidth, height: nextHeight });
  }, []);

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
      setStrokes([]);
      setCurrentStroke(null);
      currentStrokeRef.current = null;
      setGeneratedImageUrl(null);
      setGenerationId(null);
      setStep("mask");
      resetDetection();
    } catch (error) {
      Alert.alert("Unable to open media", error instanceof Error ? error.message : "Please try again.");
    }
  }, [resetDetection]);

  const startStroke = useCallback((x: number, y: number) => {
    if (isDetecting || canvasSize.width <= 0 || canvasSize.height <= 0) return;
    const point = clampPoint(x, y);
    const stroke: MaskStroke = { id: `floor-stroke-${strokeIdRef.current++}`, width: brushWidth, points: [point] };
    currentStrokeRef.current = stroke;
    setCurrentStroke(stroke);
    setActivePoint(point);
  }, [brushWidth, canvasSize.height, canvasSize.width, clampPoint, isDetecting]);

  const extendStroke = useCallback((x: number, y: number) => {
    const activeStroke = currentStrokeRef.current;
    if (!activeStroke) return;
    const rawPoint = clampPoint(x, y);
    const lastPoint = activeStroke.points[activeStroke.points.length - 1] ?? rawPoint;
    const nextPoint = { x: lastPoint.x + (rawPoint.x - lastPoint.x) * 0.42, y: lastPoint.y + (rawPoint.y - lastPoint.y) * 0.42 };
    if (Math.abs(lastPoint.x - nextPoint.x) < 0.8 && Math.abs(lastPoint.y - nextPoint.y) < 0.8) {
      setActivePoint(rawPoint);
      return;
    }
    const stroke = { ...activeStroke, points: [...activeStroke.points, nextPoint] };
    currentStrokeRef.current = stroke;
    setCurrentStroke(stroke);
    setActivePoint(rawPoint);
  }, [clampPoint]);

  const finishStroke = useCallback(() => {
    const activeStroke = currentStrokeRef.current;
    if (!activeStroke) return;
    currentStrokeRef.current = null;
    setCurrentStroke(null);
    setActivePoint(null);
    setStrokes((current) => [...current, activeStroke]);
  }, []);

  const updateBrushWidth = useCallback((x: number) => {
    if (sliderWidth <= 0) return;
    const ratio = Math.max(0, Math.min(x / sliderWidth, 1));
    setBrushWidth(Math.round(MIN_BRUSH + ratio * (MAX_BRUSH - MIN_BRUSH)));
  }, [sliderWidth]);

  const updateComparisonSlider = useCallback((x: number) => {
    const ratio = Math.max(0.05, Math.min(x / resultFrameWidth, 0.95));
    setComparisonPosition(ratio);
  }, [resultFrameWidth]);

  const clearMask = useCallback(() => {
    setStrokes([]);
    setCurrentStroke(null);
    currentStrokeRef.current = null;
    setActivePoint(null);
  }, []);

  const drawGesture = useMemo(() => Gesture.Pan().minDistance(0).onBegin((e) => runOnJS(startStroke)(e.x, e.y)).onUpdate((e) => runOnJS(extendStroke)(e.x, e.y)).onFinalize(() => runOnJS(finishStroke)()), [extendStroke, finishStroke, startStroke]);
  const sliderGesture = useMemo(() => Gesture.Pan().onBegin((e) => runOnJS(updateBrushWidth)(e.x)).onUpdate((e) => runOnJS(updateBrushWidth)(e.x)), [updateBrushWidth]);
  const comparisonGesture = useMemo(() => Gesture.Pan().onBegin((e) => runOnJS(updateComparisonSlider)(e.x)).onUpdate((e) => runOnJS(updateComparisonSlider)(e.x)), [updateComparisonSlider]);

  const handleGenerate = useCallback(async () => {
    if (!viewerReady) {
      Alert.alert("Preparing your session", "Your guest profile is still loading. Please try again in a moment.");
      return;
    }

    if (!selectedImage || !hasMask || !sourceCaptureRef.current || !maskCaptureRef.current) {
      Alert.alert("Mark the floor first", "Brush over the floor area you want to restyle before continuing.");
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
      const [sourceUri, maskUri] = await Promise.all([captureRef(sourceCaptureRef, { format: "png", quality: 1, result: "tmpfile" }), captureRef(maskCaptureRef, { format: "png", quality: 1, result: "tmpfile" })]);
      const [sourceStorageId, maskStorageId] = await Promise.all([uploadBlobToStorage(sourceUri), uploadBlobToStorage(maskUri)]);
      const result = (await startGeneration({ anonymousId, sourceStorageId, maskStorageId, roomType: "Room", style: `${selectedMaterial.title} Floor`, customPrompt: `Analyze only the masked floor area in this room and replace it with ${selectedMaterial.promptLabel}. Preserve perspective, lighting, furniture placement, baseboards, wall lines, reflections, and every unmasked detail exactly.`, aspectRatio: simplifyRatio(selectedImage.width, selectedImage.height), colorPalette: selectedMaterial.paletteLabel, modeLabel: "Floor Restyle", modePromptHint: "Respect the provided mask exactly. Restyle only the floor plane and keep the room premium, photorealistic, and structurally unchanged outside the mask.", speedTier: "pro" })) as { generationId: string };
      setGenerationId(result.generationId);
    } catch (error) {
      setIsGenerating(false);
      setStep("materials");
      Alert.alert("Unable to restyle the floor", error instanceof Error ? error.message : "Please try again.");
    }
  }, [anonymousId, creditBalance, hasMask, isSignedIn, router, selectedImage, selectedMaterial.paletteLabel, selectedMaterial.promptLabel, selectedMaterial.title, startGeneration, uploadBlobToStorage, viewerReady]);

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
              {strokes.map((stroke) => <SvgPath key={`mask-${stroke.id}`} d={buildPath(stroke.points)} stroke="#FFFFFF" strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" fill="none" />)}
            </Svg>
          </View>
        </View>
      ) : null}

      <View style={[styles.topBar, { paddingTop: Math.max(insets.top + 8, 18) }]}>
        <LuxPressable onPress={handleBack} className={pointerClassName} style={styles.topButton} glowColor="rgba(255,255,255,0.06)" scale={0.97}><ArrowLeft color="#ffffff" size={18} /></LuxPressable>
        <View style={styles.topCopy}>
          <Text style={styles.topTitle}>Floor Restyle</Text>
          <View style={styles.stepRow}>{[1, 2, 3, 4].map((n) => {
            const active = (step === "intake" && n === 1) || (step === "mask" && n === 2) || (step === "materials" && n === 3) || ((step === "processing" || step === "result") && n === 4);
            return <View key={n} style={[styles.stepPill, active ? styles.stepPillActive : null]}><Text style={[styles.stepPillText, active ? styles.stepPillTextActive : null]}>{n}</Text></View>;
          })}</View>
        </View>
        <View style={styles.creditPill}><Text style={styles.creditText}>{creditBalance}</Text></View>
      </View>

      {step === "intake" ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: Math.max(insets.bottom + 28, 34), gap: 18 }} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={["#111214", "#050505"]} style={styles.heroCard}>
            <View style={styles.heroIcon}><Sparkles color="#F59E0B" size={22} /></View>
            <Text style={styles.heroTitle}>Add a photo of your floor</Text>
            <Text style={styles.heroText}>Upload a clean room image so Home AI can read the floor plane, preserve furniture placement, and map new materials with real estate-grade precision.</Text>
            <View style={styles.tipCard}><Text style={styles.tipLabel}>Tip</Text><Text style={styles.tipText}>For best results, make sure the floor is clearly visible.</Text></View>
            <LuxPressable onPress={() => handleSelectMedia("library")} className={pointerClassName} style={{ width: "100%" }} glowColor="rgba(245,158,11,0.18)" scale={0.99}><LinearGradient colors={["#F59E0B", "#D97706"]} style={styles.primaryButton}><ImagePlus color="#ffffff" size={18} /><Text style={styles.primaryText}>Upload Photo</Text></LinearGradient></LuxPressable>
            <LuxPressable onPress={() => handleSelectMedia("camera")} className={pointerClassName} style={{ width: "100%" }} glowColor="rgba(255,255,255,0.05)" scale={0.99}><View style={styles.secondaryButton}><Camera color="#ffffff" size={18} /><Text style={styles.secondaryText}>Capture with Camera</Text></View></LuxPressable>
          </LinearGradient>
        </ScrollView>
      ) : null}

      {step === "mask" ? (
        <View style={[styles.content, { paddingBottom: Math.max(insets.bottom + 18, 22) }]}>
          <Text style={styles.stepTitle}>Mark the area to restyle</Text>
          <Text style={styles.stepText}>Brush directly over the visible floor. Keep walls, furniture, and built-ins untouched so the restyle stays precise.</Text>
          <View style={styles.toolbarRow}>
            <LuxPressable onPress={() => setStrokes((current) => current.slice(0, -1))} disabled={!strokes.length} className={pointerClassName} style={styles.toolbarButton} glowColor="rgba(255,255,255,0.04)" scale={0.98}><RotateCcw color="#ffffff" size={16} /><Text style={styles.toolbarText}>Undo</Text></LuxPressable>
            <LuxPressable onPress={clearMask} disabled={!strokes.length && !currentStroke} className={pointerClassName} style={styles.toolbarButton} glowColor="rgba(255,255,255,0.04)" scale={0.98}><Trash2 color="#ffffff" size={16} /><Text style={styles.toolbarText}>Clear All</Text></LuxPressable>
          </View>
          <View onLayout={handleCanvasLayout} style={[styles.frame, { aspectRatio }]}>
            {selectedImage ? (
              <>
                <Image source={{ uri: selectedImage.uri }} style={styles.photoImage} contentFit="cover" transition={160} />
                <GestureDetector gesture={drawGesture}><View style={absoluteFill}><Svg width="100%" height="100%">{renderedStrokes.map((stroke) => <SvgPath key={stroke.id} d={buildPath(stroke.points)} stroke={MASK_COLOR} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" fill="none" />)}</Svg></View></GestureDetector>
                {activePoint ? <View pointerEvents="none" style={{ position: "absolute", left: Math.max(14, Math.min(activePoint.x - brushWidth * 0.5, Math.max(canvasSize.width - brushWidth - 14, 14))), top: Math.max(14, Math.min(activePoint.y - brushWidth * 0.5, Math.max(canvasSize.height - brushWidth - 14, 14))), width: brushWidth, height: brushWidth, borderRadius: 999, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.78)", backgroundColor: "rgba(245,158,11,0.10)" }} /> : null}
                <View style={styles.hintPill}><Text style={styles.hintText}>Paint only the floor zone you want Home AI to replace.</Text></View>
                <AnimatePresence>{isDetecting ? <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={styles.detectOverlay}><MotiView animate={{ scale: [0.92, 1.08, 0.92], opacity: [0.16, 0.52, 0.16] }} transition={{ duration: 1800, loop: true }} style={styles.detectPulse} /><View style={styles.detectCopy}><ActivityIndicator color="#ffffff" /><Text style={styles.detectTitle}>Preparing the floor plane...</Text><Text style={styles.detectText}>Setting up a precise masking surface so the material map stays clean around furniture and edges.</Text></View></MotiView> : null}</AnimatePresence>
              </>
            ) : null}
          </View>
          <View style={styles.panel}>
            <View style={styles.brushRow}><Text style={styles.brushTitle}>Brush Width</Text><View style={styles.brushMeta}><View style={{ width: Math.max(brushWidth, 14), height: Math.max(brushWidth, 14), borderRadius: 999, backgroundColor: MASK_COLOR, borderWidth: 1, borderColor: "rgba(255,255,255,0.22)" }} /><Text style={styles.brushMetaText}>{brushWidth}px</Text></View></View>
            <GestureDetector gesture={sliderGesture}><View onLayout={(event) => setSliderWidth(event.nativeEvent.layout.width)} style={styles.sliderWrap}><View style={styles.sliderTrack} /><LinearGradient colors={["#F59E0B", "#F97316"]} style={[styles.sliderFill, { width: Math.max(14, sliderWidth * brushProgress) }]} /><View style={[styles.sliderThumb, { left: Math.max(0, sliderWidth * brushProgress - 16) }]}><View style={styles.sliderThumbDot} /></View></View></GestureDetector>
            <LuxPressable onPress={() => setStep("materials")} disabled={!hasMask || isDetecting} className={pointerClassName} style={{ width: "100%" }} glowColor="rgba(245,158,11,0.16)" scale={0.99}><LinearGradient colors={["#F59E0B", "#D97706"]} style={styles.primaryButton}><Text style={styles.primaryText}>Continue to Material</Text></LinearGradient></LuxPressable>
          </View>
        </View>
      ) : null}

      {step === "materials" ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: Math.max(insets.bottom + 26, 32), gap: 18 }} showsVerticalScrollIndicator={false}>
          <Text style={styles.stepTitle}>Select Material</Text>
          <Text style={styles.stepText}>Choose a premium finish engineered to feel photoreal, perspective-aware, and market-ready in a modern listing presentation.</Text>
          <View style={styles.grid}>{MATERIALS.map((option) => <MaterialCard key={option.id} option={option} active={option.id === selectedMaterial.id} width={materialCardWidth} onPress={() => { setSelectedMaterialId(option.id); triggerHaptic(); }} />)}</View>
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Selected</Text><Text style={styles.summaryTitle}>{selectedMaterial.title}</Text><Text style={styles.summaryText}>{selectedMaterial.subtitle}</Text></View>
          <LuxPressable onPress={handleGenerate} disabled={!hasMask || isGenerating} className={pointerClassName} style={{ width: "100%" }} glowColor="rgba(245,158,11,0.18)" scale={0.99}><LinearGradient colors={["#F59E0B", "#D97706"]} style={styles.primaryButtonLarge}><Sparkles color="#ffffff" size={18} /><Text style={styles.primaryText}>{"Restyle Floor \u{1F680}"}</Text></LinearGradient></LuxPressable>
        </ScrollView>
      ) : null}

      {step === "processing" ? (
        <View style={styles.processingScreen}><MotiView animate={{ scale: [0.92, 1.08, 0.92], opacity: [0.16, 0.52, 0.16] }} transition={{ duration: 1900, loop: true }} style={styles.processingPulse} /><MotiView animate={{ translateY: [-28, 84], opacity: [0, 0.32, 0] }} transition={{ duration: 1600, loop: true }} style={styles.processingBeam} /><View style={styles.processingCopy}><ActivityIndicator size="small" color="#ffffff" /><Text style={styles.processingTitle}>Analyzing floor perspective &amp; mapping textures...</Text><Text style={styles.processingText}>Home AI is reading the geometry of the room, matching texture scale, and restyling only the area you marked.</Text></View></View>
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
          <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Material Applied</Text><Text style={styles.summaryTitle}>{selectedMaterial.title}</Text><Text style={styles.summaryText}>Your floor has been restyled while preserving room geometry, furniture alignment, and natural light behavior.</Text></View>
          <View style={styles.resultRow}><LuxPressable onPress={() => setStep("mask")} className={pointerClassName} style={{ flex: 1 }} glowColor="rgba(255,255,255,0.04)" scale={0.99}><View style={styles.secondaryAction}><Text style={styles.secondaryActionText}>Refine Mask</Text></View></LuxPressable><LuxPressable onPress={() => setStep("materials")} className={pointerClassName} style={{ flex: 1 }} glowColor="rgba(255,255,255,0.04)" scale={0.99}><View style={styles.secondaryAction}><Text style={styles.secondaryActionText}>Change Material</Text></View></LuxPressable></View>
          <LuxPressable onPress={resetProject} className={pointerClassName} style={{ width: "100%" }} glowColor="rgba(255,255,255,0.04)" scale={0.99}><View style={styles.restartButton}><ChevronLeft color="#ffffff" size={16} /><Text style={styles.restartText}>Start New Floor</Text></View></LuxPressable>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#000000" },
  captureStage: { position: "absolute", left: -10000, top: 0, opacity: 0.01 },
  topBar: { paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  topButton: { height: 44, width: 44, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  topCopy: { flex: 1, alignItems: "center", gap: 6 },
  topTitle: { color: "#ffffff", fontSize: 19, fontWeight: "800", letterSpacing: -0.3 },
  stepRow: { flexDirection: "row", gap: 8 },
  stepPill: { height: 24, width: 24, borderRadius: 999, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" },
  stepPillActive: { borderColor: "rgba(245,158,11,0.4)", backgroundColor: "rgba(245,158,11,0.18)" },
  stepPillText: { color: "#71717a", fontSize: 11, fontWeight: "800" },
  stepPillTextActive: { color: "#ffffff" },
  creditPill: { minWidth: 44, height: 44, paddingHorizontal: 12, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  creditText: { color: "#ffffff", fontSize: 12, fontWeight: "800" },
  heroCard: { minHeight: 360, borderRadius: 34, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: 24, gap: 18, backgroundColor: "#050505" },
  heroIcon: { height: 54, width: 54, borderRadius: 18, backgroundColor: "rgba(245,158,11,0.16)", alignItems: "center", justifyContent: "center" },
  heroTitle: { color: "#ffffff", fontSize: 31, lineHeight: 34, fontWeight: "800", letterSpacing: -1 },
  heroText: { color: "#a1a1aa", fontSize: 14, lineHeight: 22 },
  tipCard: { borderRadius: 24, borderWidth: 1, borderColor: "rgba(245,158,11,0.18)", backgroundColor: "rgba(245,158,11,0.08)", paddingHorizontal: 16, paddingVertical: 14, gap: 4 },
  tipLabel: { color: "#fbbf24", fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  tipText: { color: "#f4f4f5", fontSize: 13, lineHeight: 19, fontWeight: "600" },
  primaryButton: { minHeight: 58, borderRadius: 24, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  primaryButtonLarge: { minHeight: 62, borderRadius: 24, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  primaryText: { color: "#ffffff", fontSize: 15, fontWeight: "800" },
  secondaryButton: { minHeight: 58, borderRadius: 24, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.03)" },
  secondaryText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
  content: { flex: 1, paddingHorizontal: 16, gap: 14 },
  stepTitle: { color: "#ffffff", fontSize: 31, lineHeight: 34, fontWeight: "800", letterSpacing: -1 },
  stepText: { color: "#a1a1aa", fontSize: 14, lineHeight: 22 },
  toolbarRow: { flexDirection: "row", gap: 12 },
  toolbarButton: { flex: 1, height: 44, borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  toolbarText: { color: "#ffffff", fontSize: 13, fontWeight: "700" },
  frame: { width: "100%", borderRadius: 34, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#000000" },
  photoImage: { width: "100%", height: "100%" },
  hintPill: { position: "absolute", left: 16, right: 16, bottom: 16, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.66)", paddingHorizontal: 14, paddingVertical: 9 },
  hintText: { color: "#ffffff", fontSize: 12, fontWeight: "700", textAlign: "center" },
  detectOverlay: { ...absoluteFill, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(5,5,6,0.52)" },
  detectPulse: { position: "absolute", width: 220, height: 220, borderRadius: 999, backgroundColor: "rgba(245,158,11,0.18)" },
  detectCopy: { alignItems: "center", gap: 12, paddingHorizontal: 24 },
  detectTitle: { color: "#ffffff", fontSize: 20, fontWeight: "800", textAlign: "center" },
  detectText: { color: "#d4d4d8", fontSize: 13, lineHeight: 20, textAlign: "center", maxWidth: 270 },
  panel: { borderRadius: 28, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#0a0a0c", padding: 18, gap: 16 },
  brushRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brushTitle: { color: "#ffffff", fontSize: 16, fontWeight: "800" },
  brushMeta: { flexDirection: "row", alignItems: "center", gap: 10 },
  brushMetaText: { color: "#d4d4d8", fontSize: 13, fontWeight: "700" },
  sliderWrap: { height: 38, justifyContent: "center" },
  sliderTrack: { height: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)" },
  sliderFill: { position: "absolute", left: 0, height: 6, borderRadius: 999 },
  sliderThumb: { position: "absolute", width: 32, height: 32, borderRadius: 999, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center" },
  sliderThumbDot: { width: 14, height: 14, borderRadius: 999, backgroundColor: "#F59E0B" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  materialCard: { borderRadius: 30, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#0a0a0c" },
  materialCardActive: { borderColor: "#F59E0B", backgroundColor: "rgba(245,158,11,0.08)" },
  materialPreview: { aspectRatio: 1, backgroundColor: "#101012" },
  previewOverlay: { position: "absolute", left: 0, right: 0, bottom: 0, height: 96 },
  previewCopy: { position: "absolute", left: 14, right: 14, bottom: 14 },
  materialTitle: { color: "#ffffff", fontSize: 18, fontWeight: "800" },
  materialSubtitle: { color: "#d4d4d8", fontSize: 12, lineHeight: 18, marginTop: 4 },
  materialSubtitleActive: { color: "#fde68a" },
  sample: { flex: 1 },
  hardwoodSample: { paddingHorizontal: 8, paddingVertical: 10, gap: 8 },
  tileRow: { flex: 1, flexDirection: "row", gap: 6, paddingHorizontal: 8, paddingTop: 8 },
  tileBlock: { flex: 1, borderRadius: 16 },
  summaryCard: { borderRadius: 28, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#0a0a0c", padding: 18, gap: 8 },
  summaryLabel: { color: "#f59e0b", fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  summaryTitle: { color: "#ffffff", fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  summaryText: { color: "#b4b4bb", fontSize: 14, lineHeight: 22 },
  processingScreen: { flex: 1, paddingHorizontal: 22, alignItems: "center", justifyContent: "center" },
  processingPulse: { position: "absolute", width: 250, height: 250, borderRadius: 999, backgroundColor: "rgba(245,158,11,0.18)" },
  processingBeam: { position: "absolute", left: 24, right: 24, height: 120, borderRadius: 28, backgroundColor: "rgba(245,158,11,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
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
