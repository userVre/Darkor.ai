import { useAuth } from "@clerk/expo";
import { useMutation, useQuery } from "convex/react";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { AnimatePresence, MotiView } from "moti";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Line, Path as SvgPath, Rect } from "react-native-svg";
import { captureRef } from "react-native-view-shot";
import { ArrowLeft, Camera, ChevronLeft, ImagePlus, MoveHorizontal, RotateCcw, Sparkles, Trash2 } from "lucide-react-native";

import { triggerHaptic } from "../lib/haptics";
import { LuxPressable } from "./lux-pressable";

type WizardStep = "intake" | "mask" | "materials" | "processing" | "result";
type SelectedImage = { uri: string; width: number; height: number };
type MaskPoint = { x: number; y: number };
type MaskStroke = { id: string; width: number; points: MaskPoint[] };
type MeResponse = { credits: number };
type ArchiveGeneration = {
  _id: string;
  imageUrl?: string | null;
  status?: "processing" | "ready" | "failed";
  errorMessage?: string | null;
};
type MaterialOption = {
  id: string;
  title: string;
  subtitle: string;
  promptLabel: string;
  paletteLabel: string;
  colors: [string, string, string];
  preview: "wood-oak" | "wood-walnut" | "marble-white" | "marble-black" | "concrete" | "tile" | "herringbone";
};

const FLOOR_MASK_COLOR = "rgba(245, 158, 11, 0.38)";
const DETECT_DURATION_MS = 1600;
const LOUPE_SIZE = 112;
const LOUPE_SCALE = 2.4;
const MIN_BRUSH = 10;
const MAX_BRUSH = 52;

const MATERIAL_OPTIONS: MaterialOption[] = [
  { id: "oak", title: "Hardwood Oak", subtitle: "Wide-plank oak with warm matte realism.", promptLabel: "wide-plank oak hardwood flooring", paletteLabel: "Oak Hardwood", colors: ["#8B5A3C", "#B78156", "#D6A97B"], preview: "wood-oak" },
  { id: "walnut", title: "Hardwood Walnut", subtitle: "Deep walnut planks with tailored contrast.", promptLabel: "luxury walnut hardwood flooring", paletteLabel: "Walnut Hardwood", colors: ["#3D271A", "#66422D", "#8D6142"], preview: "wood-walnut" },
  { id: "marble-white", title: "White Marble", subtitle: "Polished white stone with soft veining.", promptLabel: "white marble flooring with elegant grey veining", paletteLabel: "White Marble", colors: ["#F1EFEB", "#D5D2CE", "#B8B4AF"], preview: "marble-white" },
  { id: "marble-black", title: "Black Marble", subtitle: "Statement black marble with luminous veining.", promptLabel: "black marble flooring with premium natural veining", paletteLabel: "Black Marble", colors: ["#18181B", "#30303A", "#6B7280"], preview: "marble-black" },
  { id: "concrete", title: "Polished Concrete", subtitle: "Seamless architectural grey with subtle sheen.", promptLabel: "polished concrete flooring", paletteLabel: "Polished Concrete", colors: ["#4A4F57", "#747A83", "#A7ADB6"], preview: "concrete" },
  { id: "tile", title: "Ceramic Tiles", subtitle: "Large-format ceramic tiles with crisp grout.", promptLabel: "large-format ceramic tile flooring", paletteLabel: "Ceramic Tiles", colors: ["#DCCCB9", "#BCA88C", "#8B745B"], preview: "tile" },
  { id: "herringbone", title: "Herringbone Pattern", subtitle: "Boutique parquet geometry with rich movement.", promptLabel: "herringbone parquet flooring", paletteLabel: "Herringbone Parquet", colors: ["#4B2F21", "#815439", "#B77B52"], preview: "herringbone" },
];

function buildPath(points: MaskPoint[]) {
  if (points.length === 0) return "";
  if (points.length === 1) {
    const point = points[0];
    return `M ${point.x} ${point.y} L ${point.x} ${point.y}`;
  }
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

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

const absoluteFill = { position: "absolute" as const, top: 0, right: 0, bottom: 0, left: 0 };

function MaterialTexture({ option }: { option: MaterialOption }) {
  const [c1, c2, c3] = option.colors;

  if (option.preview === "tile") {
    return (
      <View style={{ flex: 1, backgroundColor: c1, padding: 8, gap: 6 }}>
        {[0, 1].map((row) => (
          <View key={row} style={{ flex: 1, flexDirection: "row", gap: 6 }}>
            {[0, 1].map((column) => (
              <View key={column} style={{ flex: 1, borderRadius: 16, backgroundColor: column % 2 === 0 ? c2 : c3 }} />
            ))}
          </View>
        ))}
      </View>
    );
  }

  if (option.preview === "concrete") {
    return (
      <LinearGradient colors={[c1, c2, c3]} style={{ flex: 1 }}>
        {[0, 1, 2, 3, 4].map((index) => (
          <View
            key={index}
            style={{
              position: "absolute",
              top: 18 + index * 22,
              left: 10 + index * 8,
              width: 96 - index * 10,
              height: 10,
              borderRadius: 999,
              backgroundColor: index % 2 === 0 ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
            }}
          />
        ))}
      </LinearGradient>
    );
  }

  if (option.preview === "marble-white" || option.preview === "marble-black") {
    return (
      <LinearGradient colors={[c1, c2]} style={{ flex: 1 }}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={{
              position: "absolute",
              top: index * 28 - 8,
              left: index % 2 === 0 ? 10 : 52,
              width: 64,
              height: 96,
              borderRadius: 40,
              backgroundColor: "rgba(255,255,255,0.08)",
              transform: [{ rotate: `${index % 2 === 0 ? 34 : -28}deg` }],
            }}
          />
        ))}
      </LinearGradient>
    );
  }

  if (option.preview === "herringbone") {
    return (
      <LinearGradient colors={[c1, c2, c3]} style={{ flex: 1, backgroundColor: c1 }}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={`left-${index}`}
            style={{
              position: "absolute",
              top: 8 + index * 26,
              left: 14,
              width: 48,
              height: 14,
              borderRadius: 8,
              backgroundColor: "rgba(255,255,255,0.1)",
              transform: [{ rotate: "38deg" }],
            }}
          />
        ))}
        {[0, 1, 2, 3].map((index) => (
          <View
            key={`right-${index}`}
            style={{
              position: "absolute",
              top: 8 + index * 26,
              right: 14,
              width: 48,
              height: 14,
              borderRadius: 8,
              backgroundColor: "rgba(0,0,0,0.16)",
              transform: [{ rotate: "-38deg" }],
            }}
          />
        ))}
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[c1, c2, c3]} style={{ flex: 1, paddingHorizontal: 8, paddingVertical: 10, gap: 8 }}>
      {[0, 1, 2, 3].map((index) => (
        <View
          key={index}
          style={{
            flex: 1,
            borderRadius: 12,
            backgroundColor: index % 2 === 0 ? "rgba(255,255,255,0.11)" : "rgba(0,0,0,0.14)",
          }}
        />
      ))}
    </LinearGradient>
  );
}

const BrushPreview = memo(function BrushPreview({ width }: { width: number }) {
  return (
    <View
      style={{
        width,
        height: width,
        borderRadius: 999,
        backgroundColor: FLOOR_MASK_COLOR,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.22)",
      }}
    />
  );
});

export function FloorWizard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { isSignedIn } = useAuth();

  const me = useQuery("users:me" as any, isSignedIn ? {} : "skip") as MeResponse | null | undefined;
  const generationArchive = useQuery("generations:getUserArchive" as any, isSignedIn ? {} : "skip") as ArchiveGeneration[] | undefined;
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
  const [precisionMode, setPrecisionMode] = useState(false);
  const [activePoint, setActivePoint] = useState<MaskPoint | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(MATERIAL_OPTIONS[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(0.5);

  const detectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const strokeIdRef = useRef(0);
  const currentStrokeRef = useRef<MaskStroke | null>(null);
  const sourceCaptureRef = useRef<View>(null);
  const maskCaptureRef = useRef<View>(null);

  const selectedMaterial = useMemo(
    () => MATERIAL_OPTIONS.find((option) => option.id === selectedMaterialId) ?? MATERIAL_OPTIONS[0],
    [selectedMaterialId],
  );
  const renderedStrokes = useMemo(() => (currentStroke ? [...strokes, currentStroke] : strokes), [currentStroke, strokes]);
  const hasMask = strokes.length > 0;
  const brushProgress = sliderWidth > 0 ? (brushWidth - MIN_BRUSH) / (MAX_BRUSH - MIN_BRUSH) : 0.35;
  const canvasHeight = Math.min(height * 0.6, 520);
  const creditBalance = isSignedIn ? me?.credits ?? 0 : 0;
  const resultImageWidth = Math.max(width - 36, 320);

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
      setStep("result");
      setIsGenerating(false);
      setSliderPosition(0.5);
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
    detectTimerRef.current = setTimeout(() => setIsDetecting(false), DETECT_DURATION_MS);
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

  const clampPoint = useCallback(
    (x: number, y: number) => ({ x: Math.max(0, Math.min(x, canvasSize.width)), y: Math.max(0, Math.min(y, canvasSize.height)) }),
    [canvasSize.height, canvasSize.width],
  );

  const handleCanvasLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    setCanvasSize((current) => (current.width === nextWidth && current.height === nextHeight ? current : { width: nextWidth, height: nextHeight }));
  }, []);

  const uploadBlobToStorage = useCallback(async (uri: string) => {
    const uploadUrl = (await createSourceUploadUrl({})) as string;
    const blob = await readBlobFromUri(uri);
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": blob.type || "image/png" },
      body: blob,
    });
    if (!response.ok) throw new Error("Unable to upload the selected floor image.");
    const json = (await response.json()) as { storageId?: string };
    if (!json.storageId) throw new Error("Convex did not return a storage id.");
    return json.storageId;
  }, [createSourceUploadUrl]);

  const handleSelectMedia = useCallback(async (source: "camera" | "library") => {
    try {
      const permission = source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(source === "camera" ? "Camera access needed" : "Photo access needed", source === "camera" ? "Please enable camera access to capture a room photo." : "Please enable photo library access to upload a room photo.");
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
    setActivePoint(point);
    const stroke: MaskStroke = { id: `floor-stroke-${strokeIdRef.current++}`, width: brushWidth, points: [point] };
    currentStrokeRef.current = stroke;
    setCurrentStroke(stroke);
  }, [brushWidth, canvasSize.height, canvasSize.width, clampPoint, isDetecting]);

  const extendStroke = useCallback((x: number, y: number) => {
    const activeStroke = currentStrokeRef.current;
    if (!activeStroke) return;
    const rawPoint = clampPoint(x, y);
    const lastPoint = activeStroke.points[activeStroke.points.length - 1] ?? rawPoint;
    const nextPoint = precisionMode
      ? { x: lastPoint.x + (rawPoint.x - lastPoint.x) * 0.28, y: lastPoint.y + (rawPoint.y - lastPoint.y) * 0.28 }
      : rawPoint;

    if (Math.abs(lastPoint.x - nextPoint.x) < 0.9 && Math.abs(lastPoint.y - nextPoint.y) < 0.9) {
      setActivePoint(rawPoint);
      return;
    }

    const stroke = { ...activeStroke, points: [...activeStroke.points, nextPoint] };
    currentStrokeRef.current = stroke;
    setCurrentStroke(stroke);
    setActivePoint(rawPoint);
  }, [clampPoint, precisionMode]);

  const finishStroke = useCallback(() => {
    const activeStroke = currentStrokeRef.current;
    if (!activeStroke) return;
    currentStrokeRef.current = null;
    setCurrentStroke(null);
    setActivePoint(null);
    setStrokes((current) => [...current, activeStroke]);
  }, []);

  const drawGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin((event) => startStroke(event.x, event.y))
        .onUpdate((event) => extendStroke(event.x, event.y))
        .onFinalize(() => finishStroke()),
    [extendStroke, finishStroke, startStroke],
  );

  const sliderGesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin((event) => {
          if (sliderWidth <= 0) return;
          const ratio = Math.max(0, Math.min(event.x / sliderWidth, 1));
          setBrushWidth(Math.round(MIN_BRUSH + ratio * (MAX_BRUSH - MIN_BRUSH)));
        })
        .onUpdate((event) => {
          if (sliderWidth <= 0) return;
          const ratio = Math.max(0, Math.min(event.x / sliderWidth, 1));
          setBrushWidth(Math.round(MIN_BRUSH + ratio * (MAX_BRUSH - MIN_BRUSH)));
        }),
    [sliderWidth],
  );

  const comparisonGesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin((event) => {
          const ratio = Math.max(0, Math.min(event.x / resultImageWidth, 1));
          setSliderPosition(ratio);
        })
        .onUpdate((event) => {
          const ratio = Math.max(0, Math.min(event.x / resultImageWidth, 1));
          setSliderPosition(ratio);
        }),
    [resultImageWidth],
  );

  const handleGenerate = useCallback(async () => {
    if (!selectedImage || !hasMask || !sourceCaptureRef.current || !maskCaptureRef.current) {
      Alert.alert("Mask the floor first", "Mark the floor area you want to change before continuing.");
      return;
    }
    if (!isSignedIn) {
      Alert.alert("Sign in required", "Sign in to save this floor restyle to your board.", [
        { text: "Not now", style: "cancel" },
        { text: "Sign in", onPress: () => router.push({ pathname: "/sign-in", params: { returnTo: "/workspace?service=floor" } }) },
      ]);
      return;
    }
    if (creditBalance <= 0) {
      router.push("/paywall");
      return;
    }

    try {
      setIsGenerating(true);
      setStep("processing");

      const [sourceUri, maskUri] = await Promise.all([
        captureRef(sourceCaptureRef, { format: "png", quality: 1, result: "tmpfile" }),
        captureRef(maskCaptureRef, { format: "png", quality: 1, result: "tmpfile" }),
      ]);
      const [sourceStorageId, maskStorageId] = await Promise.all([uploadBlobToStorage(sourceUri), uploadBlobToStorage(maskUri)]);

      const result = (await startGeneration({
        sourceStorageId,
        maskStorageId,
        roomType: "Room",
        style: `${selectedMaterial.title} Floor`,
        customPrompt: `Replace only the masked floor area with ${selectedMaterial.promptLabel}. Preserve floor perspective, spacing, shadows under furniture, reflections, walls, rugs not covered by the mask, and every unmasked object exactly.`,
        aspectRatio: simplifyRatio(selectedImage.width, selectedImage.height),
        colorPalette: selectedMaterial.paletteLabel,
        modeLabel: "Masked Floor Edit",
        modePromptHint: "Use the supplied floor mask precisely. Map the material naturally across the floor plane with realistic perspective, scale, grout or plank alignment, and lighting continuity.",
        speedTier: "pro",
      })) as { generationId: string };

      setGenerationId(result.generationId);
    } catch (error) {
      setIsGenerating(false);
      setStep("materials");
      Alert.alert("Unable to restyle floor", error instanceof Error ? error.message : "Please try again.");
    }
  }, [creditBalance, hasMask, isSignedIn, router, selectedImage, selectedMaterial.paletteLabel, selectedMaterial.promptLabel, selectedMaterial.title, startGeneration, uploadBlobToStorage]);

  const handleBack = useCallback(() => {
    if (step === "intake") return router.back();
    if (step === "mask") return setStep("intake");
    if (step === "materials") return setStep("mask");
    if (step === "result") return setStep("materials");
  }, [router, step]);

  return (
    <View style={{ flex: 1, backgroundColor: "#020202" }}>
      {selectedImage && canvasSize.width > 0 && canvasSize.height > 0 ? (
        <View pointerEvents="none" style={{ position: "absolute", left: -10000, top: 0, opacity: 0.01 }}>
          <View ref={sourceCaptureRef} collapsable={false} style={{ width: canvasSize.width, height: canvasSize.height, backgroundColor: "#000000" }}>
            <Image source={{ uri: selectedImage.uri }} style={{ width: "100%", height: "100%" }} contentFit="contain" />
          </View>
          <View ref={maskCaptureRef} collapsable={false} style={{ marginTop: 8, width: canvasSize.width, height: canvasSize.height, backgroundColor: "#000000" }}>
            <Svg width={canvasSize.width} height={canvasSize.height}>
              <Rect x={0} y={0} width={canvasSize.width} height={canvasSize.height} fill="#000000" />
              {strokes.map((stroke) => (
                <SvgPath key={stroke.id} d={buildPath(stroke.points)} stroke="#FFFFFF" strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              ))}
            </Svg>
          </View>
        </View>
      ) : null}

      <View style={{ paddingTop: Math.max(insets.top + 8, 18), paddingHorizontal: 18, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <LuxPressable onPress={handleBack} style={{ height: 44, width: 44, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          <ArrowLeft color="#ffffff" size={18} />
        </LuxPressable>
        <View style={{ alignItems: "center", gap: 4 }}>
          <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "700" }}>Floor Restyle</Text>
          <Text style={{ color: "#a1a1aa", fontSize: 12 }}>
            {step === "intake" ? "Upload a room photo" : step === "mask" ? "Mark the floor area you want to change" : step === "materials" ? "Choose Flooring Material" : step === "processing" ? "Rendering floor texture" : "Before / After result"}
          </Text>
        </View>
        <View style={{ minWidth: 44, paddingHorizontal: 12, height: 44, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
          <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "700" }}>{isSignedIn ? `${creditBalance}` : "--"}</Text>
        </View>
      </View>

      {step === "intake" ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: Math.max(insets.bottom + 28, 34), gap: 20 }} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={["#111214", "#050505"]} style={{ minHeight: 320, borderRadius: 34, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", padding: 24, justifyContent: "space-between" }}>
            <View style={{ gap: 12 }}>
              <View style={{ height: 54, width: 54, borderRadius: 18, backgroundColor: "rgba(245,158,11,0.16)", alignItems: "center", justifyContent: "center" }}>
                <Sparkles color="#F59E0B" size={24} />
              </View>
              <Text style={{ color: "#ffffff", fontSize: 32, fontWeight: "700", letterSpacing: -1 }}>High-accuracy floor replacement with manual masking and texture mapping.</Text>
              <Text style={{ color: "#b4b4bb", fontSize: 15, lineHeight: 24 }}>Upload a room photo, mark the visible floor around furniture, choose a premium flooring material, and restyle it with realistic perspective and texture scale.</Text>
            </View>
            <View style={{ gap: 12 }}>
              <LuxPressable onPress={() => handleSelectMedia("library")} style={{ width: "100%" }}>
                <LinearGradient colors={["#F59E0B", "#D97706"]} style={{ minHeight: 58, borderRadius: 24, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <ImagePlus color="#ffffff" size={18} />
                  <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "700" }}>Upload Photo</Text>
                </LinearGradient>
              </LuxPressable>
              <LuxPressable onPress={() => handleSelectMedia("camera")} style={{ width: "100%" }}>
                <View style={{ minHeight: 58, borderRadius: 24, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.03)" }}>
                  <Camera color="#ffffff" size={18} />
                  <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "700" }}>Capture with Camera</Text>
                </View>
              </LuxPressable>
            </View>
          </LinearGradient>
        </ScrollView>
      ) : null}

      {step === "mask" ? (
        <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom + 18, 22) }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
            <LuxPressable onPress={() => setStrokes((current) => current.slice(0, -1))} disabled={!strokes.length} style={{ paddingHorizontal: 14, height: 42, borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
              <RotateCcw color="#ffffff" size={16} />
              <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "700" }}>Undo</Text>
            </LuxPressable>
            <LuxPressable onPress={() => { setStrokes([]); setCurrentStroke(null); currentStrokeRef.current = null; }} disabled={!strokes.length && !currentStroke} style={{ paddingHorizontal: 14, height: 42, borderRadius: 999, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
              <Trash2 color="#ffffff" size={16} />
              <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "700" }}>Clear All</Text>
            </LuxPressable>
          </View>

          <View onLayout={handleCanvasLayout} style={{ height: canvasHeight, borderRadius: 34, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#000000" }}>
            {selectedImage ? (
              <>
                <Image source={{ uri: selectedImage.uri }} style={{ width: "100%", height: "100%" }} contentFit="contain" transition={160} />
                <GestureDetector gesture={drawGesture}>
                  <View style={absoluteFill}>
                    <Svg width="100%" height="100%">
                      {renderedStrokes.map((stroke) => (
                        <SvgPath key={stroke.id} d={buildPath(stroke.points)} stroke={FLOOR_MASK_COLOR} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                      ))}
                    </Svg>
                  </View>
                </GestureDetector>
                <View style={{ position: "absolute", left: 16, bottom: 16, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.62)", paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "700" }}>Mark the floor area you want to change</Text>
                </View>

                <AnimatePresence>
                  {isDetecting ? (
                    <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ ...absoluteFill, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(5,5,6,0.48)" }}>
                      <MotiView animate={{ scale: [0.92, 1.08, 0.92], opacity: [0.18, 0.48, 0.18] }} transition={{ duration: 1800, loop: true }} style={{ position: "absolute", width: 220, height: 220, borderRadius: 999, backgroundColor: "rgba(245,158,11,0.18)" }} />
                      <View style={{ alignItems: "center", gap: 12 }}>
                        <ActivityIndicator color="#ffffff" />
                        <Text style={{ color: "#ffffff", fontSize: 20, fontWeight: "700" }}>Detecting floor plane...</Text>
                        <Text style={{ color: "#d4d4d8", fontSize: 13, textAlign: "center", maxWidth: 250, lineHeight: 20 }}>Preparing a precise floor workspace so you can mask around furniture and edges.</Text>
                      </View>
                    </MotiView>
                  ) : null}
                </AnimatePresence>

                {activePoint ? (
                  <View pointerEvents="none" style={{ position: "absolute", left: Math.max(12, Math.min(activePoint.x - LOUPE_SIZE * 0.5, canvasSize.width - LOUPE_SIZE - 12)), top: Math.max(12, activePoint.y - LOUPE_SIZE - 22), width: LOUPE_SIZE, height: LOUPE_SIZE, borderRadius: 999, overflow: "hidden", borderWidth: 2, borderColor: "rgba(255,255,255,0.85)", backgroundColor: "#0a0a0a" }}>
                    <View style={{ flex: 1 }}>
                      <Image source={{ uri: selectedImage.uri }} style={{ width: "100%", height: "100%", transform: [{ scale: LOUPE_SCALE }, { translateX: -((activePoint.x / Math.max(canvasSize.width, 1)) * LOUPE_SIZE) + LOUPE_SIZE / 2 }, { translateY: -((activePoint.y / Math.max(canvasSize.height, 1)) * LOUPE_SIZE) + LOUPE_SIZE / 2 }] }} contentFit="cover" />
                      <Svg width={LOUPE_SIZE} height={LOUPE_SIZE} style={absoluteFill}>
                        {renderedStrokes.map((stroke) => (
                          <SvgPath key={`loupe-${stroke.id}`} d={buildPath(stroke.points.map((point) => ({ x: point.x * (LOUPE_SIZE / Math.max(canvasSize.width, 1)), y: point.y * (LOUPE_SIZE / Math.max(canvasSize.height, 1)) })))} stroke={FLOOR_MASK_COLOR} strokeWidth={Math.max(2, stroke.width * (LOUPE_SIZE / Math.max(canvasSize.width, 1)))} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        ))}
                        <Line x1={LOUPE_SIZE / 2} y1={14} x2={LOUPE_SIZE / 2} y2={LOUPE_SIZE - 14} stroke="rgba(255,255,255,0.9)" strokeWidth={1.5} />
                        <Line x1={14} y1={LOUPE_SIZE / 2} x2={LOUPE_SIZE - 14} y2={LOUPE_SIZE / 2} stroke="rgba(255,255,255,0.9)" strokeWidth={1.5} />
                      </Svg>
                    </View>
                  </View>
                ) : null}
              </>
            ) : null}
          </View>

          <View style={{ marginTop: 14, borderRadius: 28, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#0A0A0C", padding: 18, gap: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "700" }}>Brush Width</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <BrushPreview width={Math.max(brushWidth, 14)} />
                <Text style={{ color: "#d4d4d8", fontSize: 13, fontWeight: "700" }}>{brushWidth}px</Text>
              </View>
            </View>

            <GestureDetector gesture={sliderGesture}>
              <View onLayout={(event) => setSliderWidth(event.nativeEvent.layout.width)} style={{ height: 38, justifyContent: "center" }}>
                <View style={{ height: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)" }} />
                <LinearGradient colors={["#F59E0B", "#F97316"]} style={{ position: "absolute", left: 0, width: Math.max(14, sliderWidth * brushProgress), height: 6, borderRadius: 999 }} />
                <View style={{ position: "absolute", left: Math.max(0, sliderWidth * brushProgress - 16), width: 32, height: 32, borderRadius: 999, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center" }}>
                  <View style={{ width: 14, height: 14, borderRadius: 999, backgroundColor: "#F59E0B" }} />
                </View>
              </View>
            </GestureDetector>

            <View style={{ borderRadius: 22, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)", paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flex: 1, paddingRight: 14 }}>
                <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "700" }}>Precision Mode</Text>
                <Text style={{ color: "#a1a1aa", fontSize: 12, lineHeight: 18, marginTop: 4 }}>Slows the brush movement for tricky corners and furniture edges.</Text>
              </View>
              <Switch value={precisionMode} onValueChange={setPrecisionMode} thumbColor="#ffffff" trackColor={{ false: "#3f3f46", true: "#F59E0B" }} />
            </View>

            <LuxPressable onPress={() => setStep("materials")} disabled={!hasMask || isDetecting} style={{ width: "100%" }}>
              <LinearGradient colors={["#F59E0B", "#D97706"]} style={{ minHeight: 58, borderRadius: 24, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "700" }}>Choose Flooring Material</Text>
              </LinearGradient>
            </LuxPressable>
          </View>
        </View>
      ) : null}

      {step === "materials" ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: Math.max(insets.bottom + 24, 30), gap: 18 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 8 }}>
            <Text style={{ color: "#ffffff", fontSize: 28, fontWeight: "700", letterSpacing: -0.8 }}>Choose Flooring Material</Text>
            <Text style={{ color: "#a1a1aa", fontSize: 14, lineHeight: 22 }}>Premium surfaces with texture mapping tuned for perspective, spacing, and realism.</Text>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
            {MATERIAL_OPTIONS.map((option) => {
              const active = option.id === selectedMaterial.id;
              return (
                <LuxPressable key={option.id} onPress={() => { setSelectedMaterialId(option.id); triggerHaptic(); }} style={{ width: (width - 50) / 2 }}>
                  <View style={{ borderRadius: 28, overflow: "hidden", borderWidth: active ? 1.5 : 1, borderColor: active ? "#F59E0B" : "rgba(255,255,255,0.08)", backgroundColor: active ? "rgba(245,158,11,0.08)" : "#0A0A0C" }}>
                    <View style={{ aspectRatio: 1, backgroundColor: "#111111" }}>
                      <MaterialTexture option={option} />
                      <LinearGradient colors={["transparent", "rgba(0,0,0,0.66)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 82 }} />
                      <View style={{ position: "absolute", left: 14, right: 14, bottom: 14 }}>
                        <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "700" }}>{option.title}</Text>
                        <Text style={{ color: active ? "#fde68a" : "#d4d4d8", fontSize: 12, lineHeight: 18, marginTop: 4 }}>{option.subtitle}</Text>
                      </View>
                    </View>
                  </View>
                </LuxPressable>
              );
            })}
          </View>

          <LuxPressable onPress={handleGenerate} disabled={!hasMask || isGenerating} style={{ width: "100%" }}>
            <LinearGradient colors={["#F59E0B", "#D97706"]} style={{ minHeight: 60, borderRadius: 24, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10 }}>
              <Sparkles color="#ffffff" size={18} />
              <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "700" }}>Restyle Floor 🚀</Text>
            </LinearGradient>
          </LuxPressable>
        </ScrollView>
      ) : null}

      {step === "processing" ? (
        <View style={{ flex: 1, paddingHorizontal: 22, alignItems: "center", justifyContent: "center" }}>
          <MotiView animate={{ scale: [0.92, 1.08, 0.92], opacity: [0.18, 0.56, 0.18] }} transition={{ duration: 1800, loop: true }} style={{ position: "absolute", width: 250, height: 250, borderRadius: 999, backgroundColor: "rgba(245,158,11,0.18)" }} />
          <View style={{ alignItems: "center", gap: 12 }}>
            <ActivityIndicator size="small" color="#ffffff" />
            <Text style={{ color: "#ffffff", fontSize: 24, fontWeight: "700", textAlign: "center" }}>Analyzing Floor Perspective & Applying Texture...</Text>
            <Text style={{ color: "#c4c4cc", fontSize: 14, textAlign: "center", lineHeight: 22, maxWidth: 320 }}>We’re mapping your selected material across the masked floor plane with perspective-aware texture scale and realistic lighting.</Text>
          </View>
        </View>
      ) : null}

      {step === "result" ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8, paddingBottom: Math.max(insets.bottom + 24, 30), gap: 18 }} showsVerticalScrollIndicator={false}>
          <View style={{ borderRadius: 34, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#000000" }}>
            {selectedImage && generatedImageUrl ? (
              <View style={{ width: resultImageWidth, height: Math.min(height * 0.58, 520), alignSelf: "center" }}>
                <Image source={{ uri: selectedImage.uri }} style={{ width: "100%", height: "100%" }} contentFit="contain" />
                <View style={{ ...absoluteFill, width: `${sliderPosition * 100}%`, overflow: "hidden" }}>
                  <Image source={{ uri: generatedImageUrl }} style={{ width: resultImageWidth, height: "100%" }} contentFit="contain" />
                </View>
                <GestureDetector gesture={comparisonGesture}>
                  <View style={{ position: "absolute", top: 0, bottom: 0, left: `${sliderPosition * 100}%`, marginLeft: -26, width: 52, alignItems: "center", justifyContent: "center" }}>
                    <View style={{ position: "absolute", top: 0, bottom: 0, width: 2, backgroundColor: "rgba(255,255,255,0.92)" }} />
                    <View style={{ height: 46, width: 46, borderRadius: 999, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.65)", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)" }}>
                      <MoveHorizontal color="#ffffff" size={18} />
                    </View>
                  </View>
                </GestureDetector>
                <View style={{ position: "absolute", left: 14, top: 14, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.45)", paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "700" }}>Before</Text>
                </View>
                <View style={{ position: "absolute", right: 14, top: 14, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.45)", paddingHorizontal: 12, paddingVertical: 8 }}>
                  <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "700" }}>After</Text>
                </View>
              </View>
            ) : (
              <View style={{ height: 320, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator color="#ffffff" />
              </View>
            )}
          </View>

          <View style={{ borderRadius: 28, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#0A0A0C", padding: 18, gap: 10 }}>
            <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: "700" }}>{selectedMaterial.title}</Text>
            <Text style={{ color: "#b4b4bb", fontSize: 14, lineHeight: 22 }}>Your room is now previewing {selectedMaterial.paletteLabel.toLowerCase()} with a default before/after slider so you can verify the floor mapping immediately.</Text>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <LuxPressable onPress={() => setStep("mask")} style={{ flex: 1 }}>
              <View style={{ minHeight: 56, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.03)" }}>
                <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "700" }}>Refine</Text>
              </View>
            </LuxPressable>
            <LuxPressable onPress={() => setStep("materials")} style={{ flex: 1 }}>
              <View style={{ minHeight: 56, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.03)" }}>
                <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "700" }}>Try Another Material</Text>
              </View>
            </LuxPressable>
          </View>

          <LuxPressable onPress={resetProject} style={{ width: "100%" }}>
            <View style={{ minHeight: 56, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.03)", flexDirection: "row", gap: 8 }}>
              <ChevronLeft color="#ffffff" size={16} />
              <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "700" }}>Start New Room</Text>
            </View>
          </LuxPressable>
        </ScrollView>
      ) : null}
    </View>
  );
}
