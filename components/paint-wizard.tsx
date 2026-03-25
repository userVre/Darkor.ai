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
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path as SvgPath, Rect } from "react-native-svg";
import { captureRef } from "react-native-view-shot";
import {
  ArrowLeft,
  Camera,
  ChevronLeft,
  ImagePlus,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react-native";

import { triggerHaptic } from "../lib/haptics";
import { LuxPressable } from "./lux-pressable";

type WizardStep = "intake" | "mask" | "colors" | "processing" | "result";

type SelectedImage = {
  uri: string;
  width: number;
  height: number;
};

type PaintPoint = {
  x: number;
  y: number;
};

type PaintStroke = {
  id: string;
  width: number;
  points: PaintPoint[];
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

const HIGHLIGHT_COLOR = "rgba(217, 70, 239, 0.4)";
const DEFAULT_COLOR = "#F1ECE3";
const DETECT_DURATION_MS = 1800;

const COLOR_CATEGORIES: ColorCategory[] = [
  {
    id: "neutral",
    title: "Neutral",
    colors: [
      { id: "alabaster", label: "Alabaster Veil", value: "#F1ECE3" },
      { id: "greige", label: "Soft Greige", value: "#D6CDC0" },
      { id: "stone", label: "Stone Mist", value: "#C3BBAF" },
      { id: "charcoal", label: "Gallery Charcoal", value: "#444348" },
    ],
  },
  {
    id: "bold",
    title: "Bold",
    colors: [
      { id: "cobalt", label: "Cobalt Current", value: "#2E58D6" },
      { id: "merlot", label: "Merlot Luxe", value: "#7A2438" },
      { id: "forest", label: "Forest Tailor", value: "#2F5C43" },
      { id: "ink", label: "Midnight Ink", value: "#1F2740" },
    ],
  },
  {
    id: "pastel",
    title: "Pastel",
    colors: [
      { id: "blush", label: "Powder Blush", value: "#E6C4C6" },
      { id: "sky", label: "Sky Silk", value: "#C8DCF2" },
      { id: "mint", label: "Mint Wash", value: "#C7DED1" },
      { id: "lavender", label: "Lavender Haze", value: "#D7CDEE" },
    ],
  },
  {
    id: "earthy",
    title: "Earthy",
    colors: [
      { id: "terracotta", label: "Terracotta Clay", value: "#C56E4E" },
      { id: "ochre", label: "Golden Ochre", value: "#BE8A3D" },
      { id: "moss", label: "Moss Atelier", value: "#6E7A58" },
      { id: "sand", label: "Desert Sand", value: "#C8A98A" },
    ],
  },
];

function buildPaintPath(points: PaintPoint[]) {
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
  if (!response.ok) {
    throw new Error("Unable to load the selected image.");
  }
  return await response.blob();
}

const BrushPreview = memo(function BrushPreview({ width }: { width: number }) {
  return (
    <View
      style={{
        height: Math.max(width, 14),
        width: Math.max(width, 14),
        borderRadius: 999,
        backgroundColor: HIGHLIGHT_COLOR,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.18)",
      }}
    />
  );
});

const absoluteFill = {
  position: "absolute" as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

export function PaintWizard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { isSignedIn } = useAuth();

  const me = useQuery("users:me" as any, isSignedIn ? {} : "skip") as MeResponse | null | undefined;
  const generationArchive = useQuery("generations:getUserArchive" as any, isSignedIn ? {} : "skip") as
    | ArchiveGeneration[]
    | undefined;
  const createSourceUploadUrl = useMutation("generations:createSourceUploadUrl" as any);
  const startGeneration = useMutation("generations:startGeneration" as any);

  const [step, setStep] = useState<WizardStep>("intake");
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [paintStrokes, setPaintStrokes] = useState<PaintStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<PaintStroke | null>(null);
  const [brushWidth, setBrushWidth] = useState(26);
  const [selectedColorValue, setSelectedColorValue] = useState(DEFAULT_COLOR);
  const [isDetecting, setIsDetecting] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [sliderWidth, setSliderWidth] = useState(0);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const strokeIdRef = useRef(0);
  const currentStrokeRef = useRef<PaintStroke | null>(null);
  const detectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sourceCaptureRef = useRef<View>(null);
  const maskCaptureRef = useRef<View>(null);

  const selectedColor = useMemo(
    () =>
      COLOR_CATEGORIES.flatMap((category) => category.colors).find((color) => color.value === selectedColorValue) ??
      COLOR_CATEGORIES[0].colors[0],
    [selectedColorValue],
  );
  const renderedStrokes = useMemo(
    () => (currentStroke ? [...paintStrokes, currentStroke] : paintStrokes),
    [currentStroke, paintStrokes],
  );
  const hasMask = paintStrokes.length > 0;
  const brushProgress = sliderWidth > 0 ? (brushWidth - 12) / (58 - 12) : 0.3;
  const creditBalance = isSignedIn ? me?.credits ?? 0 : 0;
  const canApplyPaint = Boolean(selectedImage && hasMask && !isGenerating);
  const canvasHeight = Math.min(height * 0.62, 540);

  useEffect(() => {
    return () => {
      if (detectTimerRef.current) {
        clearTimeout(detectTimerRef.current);
      }
    };
  }, []);

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
      setIsGenerating(false);
      setStep("result");
      triggerHaptic();
      return;
    }

    if (generation.status === "failed") {
      setIsGenerating(false);
      setStep("colors");
      Alert.alert("Generation failed", generation.errorMessage ?? "Please try again.");
    }
  }, [generationArchive, generationId]);

  const resetDetection = useCallback(() => {
    if (detectTimerRef.current) {
      clearTimeout(detectTimerRef.current);
    }
    setIsDetecting(true);
    detectTimerRef.current = setTimeout(() => {
      setIsDetecting(false);
    }, DETECT_DURATION_MS);
  }, []);

  const resetProject = useCallback(() => {
    setStep("intake");
    setSelectedImage(null);
    setPaintStrokes([]);
    setCurrentStroke(null);
    currentStrokeRef.current = null;
    setGeneratedImageUrl(null);
    setGenerationId(null);
    setIsGenerating(false);
    setCanvasSize({ width: 0, height: 0 });
  }, []);

  const clampPoint = useCallback(
    (x: number, y: number) => ({
      x: Math.max(0, Math.min(x, canvasSize.width)),
      y: Math.max(0, Math.min(y, canvasSize.height)),
    }),
    [canvasSize.height, canvasSize.width],
  );

  const handleCanvasLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const nextWidth = Math.round(event.nativeEvent.layout.width);
      const nextHeight = Math.round(event.nativeEvent.layout.height);
      if (nextWidth !== canvasSize.width || nextHeight !== canvasSize.height) {
        setCanvasSize({ width: nextWidth, height: nextHeight });
      }
    },
    [canvasSize.height, canvasSize.width],
  );

  const uploadBlobToStorage = useCallback(
    async (uri: string) => {
      const uploadUrl = (await createSourceUploadUrl({})) as string;
      const blob = await readBlobFromUri(uri);
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Content-Type": blob.type || "image/png",
        },
        body: blob,
      });

      if (!response.ok) {
        throw new Error("Unable to upload the painted source to storage.");
      }

      const json = (await response.json()) as { storageId?: string };
      if (!json.storageId) {
        throw new Error("Storage upload completed without a storage id.");
      }

      return json.storageId;
    },
    [createSourceUploadUrl],
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

        if (result.canceled || !result.assets[0]) {
          return;
        }

        const asset = result.assets[0];
        setSelectedImage({
          uri: asset.uri,
          width: asset.width ?? 1080,
          height: asset.height ?? 1440,
        });
        setPaintStrokes([]);
        setCurrentStroke(null);
        currentStrokeRef.current = null;
        setGeneratedImageUrl(null);
        setGenerationId(null);
        setStep("mask");
        resetDetection();
      } catch (error) {
        Alert.alert("Unable to open media", error instanceof Error ? error.message : "Please try again.");
      }
    },
    [resetDetection],
  );

  const startStroke = useCallback(
    (x: number, y: number) => {
      if (isDetecting || canvasSize.width <= 0 || canvasSize.height <= 0) {
        return;
      }

      const point = clampPoint(x, y);
      const stroke: PaintStroke = {
        id: `stroke-${strokeIdRef.current++}`,
        width: brushWidth,
        points: [point],
      };
      currentStrokeRef.current = stroke;
      setCurrentStroke(stroke);
    },
    [brushWidth, canvasSize.height, canvasSize.width, clampPoint, isDetecting],
  );

  const extendStroke = useCallback(
    (x: number, y: number) => {
      const activeStroke = currentStrokeRef.current;
      if (!activeStroke) {
        return;
      }

      const point = clampPoint(x, y);
      const lastPoint = activeStroke.points[activeStroke.points.length - 1];
      if (lastPoint && Math.abs(lastPoint.x - point.x) < 1 && Math.abs(lastPoint.y - point.y) < 1) {
        return;
      }

      const nextStroke = {
        ...activeStroke,
        points: [...activeStroke.points, point],
      };
      currentStrokeRef.current = nextStroke;
      setCurrentStroke(nextStroke);
    },
    [clampPoint],
  );

  const finishStroke = useCallback(() => {
    const activeStroke = currentStrokeRef.current;
    if (!activeStroke) {
      return;
    }

    currentStrokeRef.current = null;
    setCurrentStroke(null);
    setPaintStrokes((current) => [...current, activeStroke]);
  }, []);

  const drawGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin((event) => {
          startStroke(event.x, event.y);
        })
        .onUpdate((event) => {
          extendStroke(event.x, event.y);
        })
        .onFinalize(() => {
          finishStroke();
        }),
    [extendStroke, finishStroke, startStroke],
  );

  const updateBrushWidth = useCallback(
    (x: number) => {
      if (sliderWidth <= 0) {
        return;
      }

      const ratio = Math.max(0, Math.min(x / sliderWidth, 1));
      const nextWidth = Math.round(12 + ratio * (58 - 12));
      setBrushWidth(nextWidth);
    },
    [sliderWidth],
  );

  const sliderGesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin((event) => {
          updateBrushWidth(event.x);
        })
        .onUpdate((event) => {
          updateBrushWidth(event.x);
        }),
    [updateBrushWidth],
  );

  const handleGenerate = useCallback(async () => {
    if (!selectedImage || !hasMask || !sourceCaptureRef.current || !maskCaptureRef.current) {
      Alert.alert("Paint the walls first", "Brush over the walls you want to recolor before applying paint.");
      return;
    }

    if (!isSignedIn) {
      Alert.alert("Sign in required", "Sign in to save this wall paint result to your board.", [
        { text: "Not now", style: "cancel" },
        {
          text: "Sign in",
          onPress: () => {
            router.push({ pathname: "/sign-in", params: { returnTo: "/workspace?service=paint" } });
          },
        },
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
        sourceStorageId,
        maskStorageId,
        roomType: "Room",
        style: `${selectedColor.label} Paint`,
        customPrompt: `Repaint only the walls selected by the mask to ${selectedColor.label} (${selectedColor.value}). Keep the room photorealistic, preserve furniture, flooring, trim, windows, doors, shadows, and original lighting.`,
        aspectRatio: simplifyRatio(selectedImage.width, selectedImage.height),
        colorPalette: selectedColor.label,
        modeLabel: "Masked Paint Edit",
        modePromptHint:
          "Use the provided wall mask exactly. Apply the new paint color only inside the masked wall region and preserve every unmasked area perfectly.",
        speedTier: "pro",
      })) as { generationId: string };

      setGenerationId(result.generationId);
    } catch (error) {
      setIsGenerating(false);
      setStep("colors");
      Alert.alert("Unable to apply paint", error instanceof Error ? error.message : "Please try again.");
    }
  }, [
    creditBalance,
    hasMask,
    isSignedIn,
    router,
    selectedColor.label,
    selectedColor.value,
    selectedImage,
    startGeneration,
    uploadBlobToStorage,
  ]);

  const handleBack = useCallback(() => {
    if (step === "intake") {
      router.back();
      return;
    }
    if (step === "mask") {
      setStep("intake");
      return;
    }
    if (step === "colors") {
      setStep("mask");
      return;
    }
    if (step === "result") {
      setStep("colors");
    }
  }, [router, step]);

  return (
    <View style={{ flex: 1, backgroundColor: "#050505" }}>
      {selectedImage && canvasSize.width > 0 && canvasSize.height > 0 ? (
        <View pointerEvents="none" style={{ position: "absolute", left: -10000, top: 0, opacity: 0.01 }}>
          <View
            ref={sourceCaptureRef}
            collapsable={false}
            style={{ width: canvasSize.width, height: canvasSize.height, backgroundColor: "#000000" }}
          >
            <Image source={{ uri: selectedImage.uri }} style={{ width: "100%", height: "100%" }} contentFit="contain" />
          </View>
          <View
            ref={maskCaptureRef}
            collapsable={false}
            style={{ marginTop: 8, width: canvasSize.width, height: canvasSize.height, backgroundColor: "#000000" }}
          >
            <Svg width={canvasSize.width} height={canvasSize.height}>
              <Rect x={0} y={0} width={canvasSize.width} height={canvasSize.height} fill="#000000" />
              {paintStrokes.map((stroke) => (
                <SvgPath
                  key={`mask-${stroke.id}`}
                  d={buildPaintPath(stroke.points)}
                  stroke="#FFFFFF"
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

      <View
        style={{
          paddingTop: Math.max(insets.top + 8, 18),
          paddingHorizontal: 18,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <LuxPressable
          onPress={handleBack}
          style={{
            height: 44,
            width: 44,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255,255,255,0.06)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          <ArrowLeft color="#ffffff" size={18} />
        </LuxPressable>

        <View style={{ alignItems: "center", gap: 4 }}>
          <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "700" }}>Smart Wall Paint</Text>
          <Text style={{ color: "#a1a1aa", fontSize: 12 }}>
            {step === "intake"
              ? "Upload a room photo"
              : step === "mask"
                ? "Brush over the walls"
                : step === "colors"
                  ? "Choose a premium color"
                  : step === "processing"
                    ? "Rendering your result"
                    : "Your painted room"}
          </Text>
        </View>

        <View
          style={{
            minWidth: 44,
            paddingHorizontal: 12,
            height: 44,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255,255,255,0.06)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.08)",
          }}
        >
          <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "700" }}>{isSignedIn ? `${creditBalance}` : "--"}</Text>
        </View>
      </View>

      {step === "intake" ? (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom + 28, 34),
            gap: 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={["#111113", "#0A0A0B"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              minHeight: 320,
              borderRadius: 34,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
              padding: 24,
              justifyContent: "space-between",
            }}
          >
            <View style={{ gap: 12 }}>
              <View
                style={{
                  height: 54,
                  width: 54,
                  borderRadius: 18,
                  backgroundColor: "rgba(217,70,239,0.14)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Sparkles color="#D946EF" size={24} />
              </View>
              <Text style={{ color: "#ffffff", fontSize: 32, fontWeight: "700", letterSpacing: -1 }}>
                Professional wall recoloring with a guided paint mask.
              </Text>
              <Text style={{ color: "#b4b4bb", fontSize: 15, lineHeight: 24 }}>
                Upload a room photo, brush over the walls you want to recolor, choose a premium swatch, and let Gemini apply the new paint while preserving the room.
              </Text>
            </View>

            <View style={{ gap: 12 }}>
              <LuxPressable onPress={() => handleSelectMedia("library")} style={{ width: "100%" }}>
                <LinearGradient
                  colors={["#D946EF", "#7C3AED"]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={{
                    minHeight: 58,
                    borderRadius: 24,
                    paddingHorizontal: 18,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                  }}
                >
                  <ImagePlus color="#ffffff" size={18} />
                  <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "700" }}>Upload Photo</Text>
                </LinearGradient>
              </LuxPressable>

              <LuxPressable onPress={() => handleSelectMedia("camera")} style={{ width: "100%" }}>
                <View
                  style={{
                    minHeight: 58,
                    borderRadius: 24,
                    paddingHorizontal: 18,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.12)",
                    backgroundColor: "rgba(255,255,255,0.03)",
                  }}
                >
                  <Camera color="#ffffff" size={18} />
                  <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "700" }}>Capture with Camera</Text>
                </View>
              </LuxPressable>
            </View>
          </LinearGradient>

          <View
            style={{
              borderRadius: 30,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
              backgroundColor: "#0B0B0D",
              padding: 20,
              gap: 14,
            }}
          >
            {[
              "1. Add a room photo from your camera or library.",
              "2. Brush only the wall surfaces you want to repaint.",
              "3. Choose a color from Neutral, Bold, Pastel, or Earthy.",
              "4. Apply paint and review the redesigned room.",
            ].map((line) => (
              <Text key={line} style={{ color: "#d4d4d8", fontSize: 14, lineHeight: 22 }}>
                {line}
              </Text>
            ))}
          </View>
        </ScrollView>
      ) : null}

      {step === "mask" ? (
        <View style={{ flex: 1, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom + 18, 22) }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
            <LuxPressable
              onPress={() => {
                setPaintStrokes((current) => current.slice(0, -1));
              }}
              disabled={!paintStrokes.length}
              style={{
                paddingHorizontal: 14,
                height: 42,
                borderRadius: 999,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: "rgba(255,255,255,0.04)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              <RotateCcw color="#ffffff" size={16} />
              <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "700" }}>Undo</Text>
            </LuxPressable>

            <LuxPressable
              onPress={() => {
                setPaintStrokes([]);
                setCurrentStroke(null);
                currentStrokeRef.current = null;
              }}
              disabled={!paintStrokes.length && !currentStroke}
              style={{
                paddingHorizontal: 14,
                height: 42,
                borderRadius: 999,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: "rgba(255,255,255,0.04)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.08)",
              }}
            >
              <Trash2 color="#ffffff" size={16} />
              <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "700" }}>Clear All</Text>
            </LuxPressable>
          </View>

          <View
            onLayout={handleCanvasLayout}
            style={{
              height: canvasHeight,
              borderRadius: 34,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
              backgroundColor: "#000000",
            }}
          >
            {selectedImage ? (
              <>
                <Image
                  source={{ uri: selectedImage.uri }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="contain"
                  transition={160}
                />
                <GestureDetector gesture={drawGesture}>
                  <View style={absoluteFill}>
                    <Svg width="100%" height="100%">
                      {renderedStrokes.map((stroke) => (
                        <SvgPath
                          key={stroke.id}
                          d={buildPaintPath(stroke.points)}
                          stroke={HIGHLIGHT_COLOR}
                          strokeWidth={stroke.width}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      ))}
                    </Svg>
                  </View>
                </GestureDetector>
                <View style={{ position: "absolute", left: 16, bottom: 16 }}>
                  <View style={{ borderRadius: 999, backgroundColor: "rgba(0,0,0,0.62)", paddingHorizontal: 12, paddingVertical: 8 }}>
                    <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "700" }}>
                      Paint the walls to build your AI mask
                    </Text>
                  </View>
                </View>
                <AnimatePresence>
                  {isDetecting ? (
                    <MotiView
                      from={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{
                        ...absoluteFill,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(5,5,6,0.48)",
                      }}
                    >
                      <MotiView
                        animate={{ scale: [0.92, 1.1, 0.92], opacity: [0.28, 0.62, 0.28] }}
                        transition={{ duration: 1800, loop: true }}
                        style={{
                          position: "absolute",
                          width: 220,
                          height: 220,
                          borderRadius: 999,
                          backgroundColor: "rgba(217,70,239,0.18)",
                        }}
                      />
                      <View style={{ alignItems: "center", gap: 12 }}>
                        <ActivityIndicator color="#ffffff" />
                        <Text style={{ color: "#ffffff", fontSize: 20, fontWeight: "700" }}>Detecting walls...</Text>
                        <Text style={{ color: "#d4d4d8", fontSize: 13, textAlign: "center", maxWidth: 250, lineHeight: 20 }}>
                          Preparing the surface so you can paint exactly where the color should go.
                        </Text>
                      </View>
                    </MotiView>
                  ) : null}
                </AnimatePresence>
              </>
            ) : null}
          </View>

          <View
            style={{
              marginTop: 14,
              borderRadius: 28,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
              backgroundColor: "#0A0A0C",
              padding: 18,
              gap: 16,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "700" }}>Brush Width</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <BrushPreview width={brushWidth} />
                <Text style={{ color: "#d4d4d8", fontSize: 13, fontWeight: "700" }}>{brushWidth}px</Text>
              </View>
            </View>

            <GestureDetector gesture={sliderGesture}>
              <View
                onLayout={(event) => setSliderWidth(event.nativeEvent.layout.width)}
                style={{
                  height: 38,
                  justifyContent: "center",
                }}
              >
                <View style={{ height: 6, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)" }} />
                <LinearGradient
                  colors={["#D946EF", "#F472B6"]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={{
                    position: "absolute",
                    left: 0,
                    width: Math.max(14, sliderWidth * brushProgress),
                    height: 6,
                    borderRadius: 999,
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    left: Math.max(0, sliderWidth * brushProgress - 16),
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    backgroundColor: "#ffffff",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View style={{ width: 14, height: 14, borderRadius: 999, backgroundColor: "#D946EF" }} />
                </View>
              </View>
            </GestureDetector>

            <LuxPressable
              onPress={() => setStep("colors")}
              disabled={!hasMask || isDetecting}
              style={{ width: "100%" }}
            >
              <LinearGradient
                colors={["#D946EF", "#7C3AED"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{
                  minHeight: 58,
                  borderRadius: 24,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "700" }}>Continue to Colors</Text>
              </LinearGradient>
            </LuxPressable>
          </View>
        </View>
      ) : null}

      {step === "colors" ? (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 18,
            paddingTop: 6,
            paddingBottom: Math.max(insets.bottom + 24, 30),
            gap: 18,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              height: Math.min(height * 0.34, 290),
              borderRadius: 32,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
              backgroundColor: "#000000",
            }}
          >
            {selectedImage ? (
              <>
                <Image source={{ uri: selectedImage.uri }} style={{ width: "100%", height: "100%" }} contentFit="contain" />
                <Svg width="100%" height="100%" style={absoluteFill}>
                  {paintStrokes.map((stroke) => (
                    <SvgPath
                      key={`preview-${stroke.id}`}
                      d={buildPaintPath(stroke.points)}
                      stroke={selectedColor.value}
                      strokeOpacity={0.45}
                      strokeWidth={stroke.width}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  ))}
                </Svg>
              </>
            ) : null}
          </View>

          {COLOR_CATEGORIES.map((category) => (
            <View
              key={category.id}
              style={{
                borderRadius: 28,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.08)",
                backgroundColor: "#0A0A0C",
                padding: 16,
                gap: 14,
              }}
            >
              <Text style={{ color: "#ffffff", fontSize: 18, fontWeight: "700" }}>{category.title}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                {category.colors.map((color) => {
                  const active = color.id === selectedColor.id;
                  return (
                    <LuxPressable
                      key={color.id}
                      onPress={() => {
                        setSelectedColorValue(color.value);
                        triggerHaptic();
                      }}
                      style={{
                        width: (width - 72) / 2,
                        borderRadius: 22,
                        borderWidth: 1.5,
                        borderColor: active ? "#D946EF" : "rgba(255,255,255,0.08)",
                        backgroundColor: active ? "rgba(217,70,239,0.08)" : "rgba(255,255,255,0.02)",
                        padding: 14,
                        gap: 12,
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <View
                          style={{
                            width: 42,
                            height: 42,
                            borderRadius: 999,
                            backgroundColor: color.value,
                            borderWidth: 2,
                            borderColor: "rgba(255,255,255,0.85)",
                          }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "700" }}>{color.label}</Text>
                          <Text style={{ color: "#a1a1aa", fontSize: 12 }}>{color.value}</Text>
                        </View>
                      </View>
                    </LuxPressable>
                  );
                })}
              </View>
            </View>
          ))}

          <LuxPressable onPress={handleGenerate} disabled={!canApplyPaint} style={{ width: "100%" }}>
            <LinearGradient
              colors={["#D946EF", "#7C3AED"]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{
                minHeight: 60,
                borderRadius: 24,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 10,
              }}
            >
              <Sparkles color="#ffffff" size={18} />
              <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "700" }}>Apply Paint</Text>
            </LinearGradient>
          </LuxPressable>
        </ScrollView>
      ) : null}

      {step === "processing" ? (
        <View style={{ flex: 1, paddingHorizontal: 22, alignItems: "center", justifyContent: "center" }}>
          <MotiView
            animate={{ scale: [0.92, 1.08, 0.92], opacity: [0.22, 0.62, 0.22] }}
            transition={{ duration: 1800, loop: true }}
            style={{
              position: "absolute",
              width: 240,
              height: 240,
              borderRadius: 999,
              backgroundColor: "rgba(217,70,239,0.2)",
            }}
          />
          <View style={{ alignItems: "center", gap: 12 }}>
            <ActivityIndicator size="small" color="#ffffff" />
            <Text style={{ color: "#ffffff", fontSize: 24, fontWeight: "700", textAlign: "center" }}>
              Applying paint to your walls...
            </Text>
            <Text style={{ color: "#c4c4cc", fontSize: 14, textAlign: "center", lineHeight: 22, maxWidth: 320 }}>
              Gemini is using your painted mask and selected swatch to recolor only the chosen wall surfaces.
            </Text>
          </View>
        </View>
      ) : null}

      {step === "result" ? (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 18,
            paddingTop: 6,
            paddingBottom: Math.max(insets.bottom + 24, 30),
            gap: 18,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={{
              borderRadius: 34,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
              backgroundColor: "#000000",
            }}
          >
            {generatedImageUrl ? (
              <Image
                source={{ uri: generatedImageUrl }}
                style={{ width: "100%", height: Math.min(height * 0.6, 560) }}
                contentFit="contain"
              />
            ) : (
              <View style={{ height: 320, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator color="#ffffff" />
              </View>
            )}
          </View>

          <View
            style={{
              borderRadius: 28,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.08)",
              backgroundColor: "#0A0A0C",
              padding: 18,
              gap: 10,
            }}
          >
            <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: "700" }}>{selectedColor.label}</Text>
            <Text style={{ color: "#b4b4bb", fontSize: 14, lineHeight: 22 }}>
              Your room has been recolored using the wall mask you painted, with structure, decor, and lighting preserved.
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <LuxPressable onPress={() => setStep("colors")} style={{ flex: 1 }}>
              <View
                style={{
                  minHeight: 56,
                  borderRadius: 22,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.1)",
                  backgroundColor: "rgba(255,255,255,0.03)",
                }}
              >
                <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "700" }}>Try Another Color</Text>
              </View>
            </LuxPressable>
            <LuxPressable onPress={() => setStep("mask")} style={{ flex: 1 }}>
              <View
                style={{
                  minHeight: 56,
                  borderRadius: 22,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.1)",
                  backgroundColor: "rgba(255,255,255,0.03)",
                }}
              >
                <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "700" }}>Refine Mask</Text>
              </View>
            </LuxPressable>
          </View>

          <LuxPressable onPress={resetProject} style={{ width: "100%" }}>
            <View
              style={{
                minHeight: 56,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.1)",
                backgroundColor: "rgba(255,255,255,0.03)",
                flexDirection: "row",
                gap: 8,
              }}
            >
              <ChevronLeft color="#ffffff" size={16} />
              <Text style={{ color: "#ffffff", fontSize: 14, fontWeight: "700" }}>Start New Room</Text>
            </View>
          </LuxPressable>
        </ScrollView>
      ) : null}
    </View>
  );
}
