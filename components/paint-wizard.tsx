import {
Box,
BrickWall,
BrushCleaning,
Check,
ChevronLeft,
DoorOpen,
Eraser,
House,
LayoutPanelTop,
Redo2,
Undo2,
Wallpaper,
Wand2,
X,
} from "@/components/material-icons";
import {useAuth} from "@clerk/expo";
import {useAction, useMutation, useQuery} from "convex/react";
import * as FileSystem from "expo-file-system/legacy";
import {Image} from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {LinearGradient} from "expo-linear-gradient";
import * as MediaLibrary from "expo-media-library";
import {useLocalSearchParams, useRouter} from "expo-router";
import {StatusBar} from "expo-status-bar";
import {AnimatePresence, MotiView} from "moti";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {useTranslation} from "react-i18next";
import {ActivityIndicator, Alert, Linking, Image as NativeImage, Pressable, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions} from "react-native";
import {Gesture, GestureDetector} from "react-native-gesture-handler";
import Animated, {runOnJS, useAnimatedStyle, useSharedValue} from "react-native-reanimated";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import Svg, {Defs, G, Rect, Circle as SvgCircle, Mask as SvgMask, Path as SvgPath} from "react-native-svg";
import {captureRef} from "react-native-view-shot";
import {spacing} from "../styles/spacing";
import {fonts} from "../styles/typography";

import {WALL_COLOR_OPTIONS} from "../lib/data";
import {canUserGenerate as canUserGenerateNow} from "../lib/generation-access";
import {GENERATION_FAILED_TOAST, getFriendlyGenerationError} from "../lib/generation-errors";
import {runWithFriendlyRetry} from "../lib/generation-retry";
import {hasGenerationImage, resolveGenerationStatus} from "../lib/generation-status";
import {
isGuestWizardTestingSession,
resolveGuestWizardViewerId
} from "../lib/guest-testing";
import {triggerHaptic} from "../lib/haptics";
import {LUX_SPRING} from "../lib/motion";
import {uploadLocalFileToCloud} from "../lib/native-upload";
import {SERVICE_WIZARD_THEME} from "../lib/service-wizard-theme";
import {getPaintWizardExamplePhotos} from "../lib/wizard-example-photos";
import {getWizardFloatingButtonStyle} from "./design-wizard-primitives";
import {DIAMOND_PILL_BLUE} from "./diamond-credit-pill";
import {LuxPressable} from "./lux-pressable";
import {PaintIntroScreen, type PaintIntroExamplePhoto} from "./paint-intro-screen";
import {useProSuccess} from "./pro-success-context";
import {ServiceProcessingScreen, useGenerationStatusMessages} from "./service-processing-screen";
import {ServiceWizardHeader} from "./service-wizard-header";
import {getStickyStepHeaderMetrics} from "./sticky-step-header";
import {useMaskDrawing} from "./use-mask-drawing";
import {useViewerCredits} from "./viewer-credits-context";
import {useViewerSession} from "./viewer-session-context";

type WizardStep = "intake" | "mask" | "colors" | "processing" | "result";
type MaskTool = "brush" | "eraser" | "surface";

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

type PaintWizardProps = {
  onFlowActiveChange?: (isFlowActive: boolean) => void;
  onProcessingStateChange?: (isProcessing: boolean) => void;
};

type PaintSurfaceOption = {
  value: "Auto" | "Brick" | "Cabinet" | "Door" | "Wall" | "Outside Wall";
  label: string;
};

type RgbColor = {
  r: number;
  g: number;
  b: number;
};

type HsvColor = {
  hue: number;
  saturation: number;
  value: number;
};

const pointerClassName = "cursor-pointer";
const OLED_BLACK = "#000000";
const CARD_BLACK = SERVICE_WIZARD_THEME.colors.surfaceRaised;
const CARD_BLACK_SOFT = SERVICE_WIZARD_THEME.colors.surfaceSoft;
const MASK_COLOR = "rgba(255,59,48,0.42)";
const MASK_ACCENT = "#121212";
const MASK_CAPTURE_COLOR = "#FFFFFF";
const BRUSH_MIN = 14;
const BRUSH_MAX = 64;
const DETECT_DURATION_MS = 1700;
const CANCELLED_GENERATION_MESSAGE = "Cancelled by user.";
const CANCEL_SUCCESS_TOAST = "wizard.paintFlow.cancelSuccess";
const SELECTION_REFERENCE_WIDTH = 456;
const SELECTION_REFERENCE_HEIGHT = 932;
const COLOR_PICKER_DEFAULT_HEX = "#FF69B4";

const DEFAULT_FINISH_ID = "satin";
const DEFAULT_FINISH_LABEL = "Satin";

const COLOR_PICKER_PRESET_SWATCHES = [
  { id: "pink", value: "#FF69B4" },
  { id: "blue", value: "#3B82F6" },
  { id: "green", value: "#34C759" },
  { id: "yellow", value: "#FACC15" },
  { id: "gray", value: "#9CA3AF" },
  { id: "red", value: "#CC3333" },
] as const;
const TABS_HOME_ROUTE = "/(tabs)/index";

const absoluteFill = StyleSheet.absoluteFillObject;

function PaintSurfaceIcon({
  surface,
  color,
  size = 18,
}: {
  surface: PaintSurfaceOption["value"];
  color: string;
  size?: number;
}) {
  switch (surface) {
    case "Brick":
      return <BrickWall color={color} size={size} strokeWidth={2} />;
    case "Cabinet":
      return <LayoutPanelTop color={color} size={size} strokeWidth={2} />;
    case "Door":
      return <DoorOpen color={color} size={size} strokeWidth={2} />;
    case "Wall":
      return <Wallpaper color={color} size={size} strokeWidth={2} />;
    case "Outside Wall":
      return <House color={color} size={size} strokeWidth={2} />;
    default:
      return <Box color={color} size={size} strokeWidth={2} />;
  }
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

function scaleSelectionValue(value: number, scale: number) {
  return value * scale;
}

function resolveContrastTextColor(hexColor: string) {
  const normalized = hexColor.replace("#", "");
  if (normalized.length !== 6) {
    return "#0A0A0A";
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000;

  return luminance > 150 ? "#0A0A0A" : "#FFFFFF";
}

function clamp(value: number, min: number, max: number) {
  "worklet";
  return Math.min(Math.max(value, min), max);
}

function rgbToHex({ r, g, b }: RgbColor) {
  return `#${[r, g, b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

function hexToRgb(hexColor: string): RgbColor | null {
  const normalized = hexColor.trim().replace("#", "");
  if (!/^[0-9A-Fa-f]{6}$/.test(normalized)) {
    return null;
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function resolveColorCategoryLabel(
  hexColor: string,
  labels: Record<(typeof COLOR_PICKER_PRESET_SWATCHES)[number]["id"], string>,
) {
  const targetRgb = hexToRgb(hexColor);
  if (!targetRgb) {
    return null;
  }

  let bestMatch: (typeof COLOR_PICKER_PRESET_SWATCHES)[number]["id"] | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const swatch of COLOR_PICKER_PRESET_SWATCHES) {
    const swatchRgb = hexToRgb(swatch.value);
    if (!swatchRgb) {
      continue;
    }

    const distance =
      (targetRgb.r - swatchRgb.r) ** 2 +
      (targetRgb.g - swatchRgb.g) ** 2 +
      (targetRgb.b - swatchRgb.b) ** 2;

    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = swatch.id;
    }
  }

  return bestMatch ? labels[bestMatch] : null;
}

function hsvToRgb(hue: number, saturation: number, value: number): RgbColor {
  const normalizedHue = ((hue % 360) + 360) % 360;
  const safeSaturation = clamp(saturation, 0, 1);
  const safeValue = clamp(value, 0, 1);
  const chroma = safeValue * safeSaturation;
  const segment = normalizedHue / 60;
  const intermediate = chroma * (1 - Math.abs((segment % 2) - 1));
  const match = safeValue - chroma;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (segment >= 0 && segment < 1) {
    red = chroma;
    green = intermediate;
  } else if (segment >= 1 && segment < 2) {
    red = intermediate;
    green = chroma;
  } else if (segment >= 2 && segment < 3) {
    green = chroma;
    blue = intermediate;
  } else if (segment >= 3 && segment < 4) {
    green = intermediate;
    blue = chroma;
  } else if (segment >= 4 && segment < 5) {
    red = intermediate;
    blue = chroma;
  } else {
    red = chroma;
    blue = intermediate;
  }

  return {
    r: Math.round((red + match) * 255),
    g: Math.round((green + match) * 255),
    b: Math.round((blue + match) * 255),
  };
}

function rgbToHsv({ r, g, b }: RgbColor): HsvColor {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let hue = 0;

  if (delta !== 0) {
    if (max === red) {
      hue = 60 * (((green - blue) / delta) % 6);
    } else if (max === green) {
      hue = 60 * ((blue - red) / delta + 2);
    } else {
      hue = 60 * ((red - green) / delta + 4);
    }
  }

  return {
    hue: hue < 0 ? hue + 360 : hue,
    saturation: max === 0 ? 0 : delta / max,
    value: max,
  };
}

function hexToHsv(hexColor: string): HsvColor | null {
  const rgb = hexToRgb(hexColor);
  if (!rgb) {
    return null;
  }

  return rgbToHsv(rgb);
}

function formatRgbLabel(rgb: RgbColor) {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

function mapDetectionPointToCanvas(
  point: { x: number; y: number },
  imageSize: { width: number; height: number },
  canvas: { width: number; height: number },
  contentFit: "contain" | "cover",
) {
  const scale =
    contentFit === "cover"
      ? Math.max(canvas.width / imageSize.width, canvas.height / imageSize.height)
      : Math.min(canvas.width / imageSize.width, canvas.height / imageSize.height);
  const renderedWidth = imageSize.width * scale;
  const renderedHeight = imageSize.height * scale;
  const offsetX = (canvas.width - renderedWidth) / 2;
  const offsetY = (canvas.height - renderedHeight) / 2;

  return {
    x: offsetX + (point.x / 1000) * renderedWidth,
    y: offsetY + (point.y / 1000) * renderedHeight,
  };
}

function logAutoDetectFailure(error: unknown) {
  void error;
}


export function PaintWizard({ onFlowActiveChange, onProcessingStateChange }: PaintWizardProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { presetStyle, startStep } = useLocalSearchParams<{ presetStyle?: string; startStep?: string }>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { isSignedIn } = useAuth();
  const { anonymousId, isReady: viewerReady } = useViewerSession();
  const guestWizardTestingSession = isGuestWizardTestingSession(isSignedIn);
  const effectiveSignedIn = isSignedIn || guestWizardTestingSession;
  const viewerId = useMemo(() => resolveGuestWizardViewerId(anonymousId, isSignedIn), [anonymousId, isSignedIn]);
  const { showToast } = useProSuccess();
  const { credits: sharedCredits, setOptimisticCredits } = useViewerCredits();
  const viewerArgs = useMemo(() => (viewerId ? { anonymousId: viewerId } : {}), [viewerId]);
  const localizedSurfaceOptions = useMemo<PaintSurfaceOption[]>(
    () => [
      { value: "Auto", label: t("wizard.paintFlow.surfaces.auto") },
      { value: "Brick", label: t("wizard.paintFlow.surfaces.brick") },
      { value: "Cabinet", label: t("wizard.paintFlow.surfaces.cabinet") },
      { value: "Door", label: t("wizard.paintFlow.surfaces.door") },
      { value: "Wall", label: t("wizard.paintFlow.surfaces.wall") },
      { value: "Outside Wall", label: t("wizard.paintFlow.surfaces.outsideWall") },
    ],
    [i18n.language, t],
  );
  const localizedColorLabels = useMemo(
    () => ({
      pink: t("wizard.paintFlow.colorFamilies.pink"),
      blue: t("wizard.paintFlow.colorFamilies.blue"),
      green: t("wizard.paintFlow.colorFamilies.green"),
      yellow: t("wizard.paintFlow.colorFamilies.yellow"),
      gray: t("wizard.paintFlow.colorFamilies.gray"),
      red: t("wizard.paintFlow.colorFamilies.red"),
    }),
    [i18n.language, t],
  );
  const localizedWallColorOptions = useMemo(
    () =>
      WALL_COLOR_OPTIONS.map((option) => ({
        ...option,
        title: t(`wizard.paintFlow.colors.${option.id}.title`),
        description: t(`wizard.paintFlow.colors.${option.id}.description`),
      })),
    [i18n.language, t],
  );

  const me = useQuery("users:me" as any, viewerReady ? viewerArgs : "skip") as MeResponse | null | undefined;
  const generationArchive = useQuery("generations:getUserArchive" as any, viewerReady ? viewerArgs : "skip") as
    | ArchiveGeneration[]
    | undefined;
  const detectEditMask = useAction("ai:detectEditMask" as any);
  const createSourceUploadUrl = useMutation("generations:createSourceUploadUrl" as any);
  const cancelGeneration = useMutation("generations:cancelGeneration" as any);
  const startGeneration = useMutation("generations:startGeneration" as any);

  const [step, setStep] = useState<WizardStep>("intake");
  const [maskTool, setMaskTool] = useState<MaskTool>("brush");
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [selectedColorValue, setSelectedColorValue] = useState<string | null>(null);
  const [isAiColorSuggestionEnabled, setIsAiColorSuggestionEnabled] = useState(false);
  const [selectedSurface, setSelectedSurface] = useState<PaintSurfaceOption["value"]>("Auto");
  const [isColorConfirmed, setIsColorConfirmed] = useState(false);
  const [isSurfaceConfirmed, setIsSurfaceConfirmed] = useState(false);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isSurfacePickerOpen, setIsSurfacePickerOpen] = useState(false);
  const [surfacePickerDraft, setSurfacePickerDraft] = useState<PaintSurfaceOption["value"]>("Auto");
  const [colorPickerDraft, setColorPickerDraft] = useState(() => {
    const initialHsv = hexToHsv(COLOR_PICKER_DEFAULT_HEX) ?? { hue: 330, saturation: 0.588, value: 1 };
    return {
      ...initialHsv,
      hex: COLOR_PICKER_DEFAULT_HEX,
      rgbLabel: "rgb(255, 105, 180)",
    };
  });
  const [isDetecting, setIsDetecting] = useState(false);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [awaitingAuth, setAwaitingAuth] = useState(false);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [detectedSourceStorageId, setDetectedSourceStorageId] = useState<string | null>(null);
  const [isCancellingGeneration, setIsCancellingGeneration] = useState(false);
  const [loadingContinueStep, setLoadingContinueStep] = useState<"intake" | "mask" | "colors" | null>(null);
  const initialSelectionAppliedRef = useRef(false);
  const handledGenerationCompletionRef = useRef<string | null>(null);
  const detectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const continueTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sourceCaptureRef = useRef<View>(null);
  const maskCaptureRef = useRef<View>(null);
  const colorPickerHue = useSharedValue(colorPickerDraft.hue);
  const colorPickerSaturation = useSharedValue(colorPickerDraft.saturation);
  const colorPickerValue = useSharedValue(colorPickerDraft.value);

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
    undoLastStroke,
    redoLastStroke,
    replaceMaskWithRegions,
    resetMaskDrawing,
    drawGesture,
    sliderGesture,
    loupeMetrics,
    canRedo,
  } = useMaskDrawing({
    disabled: isDetecting || isAutoDetecting || maskTool === "surface",
    toolMode: maskTool === "eraser" ? "eraser" : "brush",
    initialBrushWidth: 24,
    minBrushWidth: BRUSH_MIN,
    maxBrushWidth: BRUSH_MAX,
  });

  const selectedColorOption = useMemo(
    () => localizedWallColorOptions.find((option) => option.value === selectedColorValue) ?? null,
    [localizedWallColorOptions, selectedColorValue],
  );
  const selectedColorRgb = useMemo(() => (selectedColorValue ? hexToRgb(selectedColorValue) : null), [selectedColorValue]);
  const selectedColorRgbLabel = useMemo(
    () => (selectedColorRgb ? formatRgbLabel(selectedColorRgb) : "rgb(255, 255, 255)"),
    [selectedColorRgb],
  );
  const selectedColorCategory = useMemo(
    () => (selectedColorValue ? resolveColorCategoryLabel(selectedColorValue, localizedColorLabels) : null),
    [localizedColorLabels, selectedColorValue],
  );
  const selectedSurfaceOption = useMemo(
    () => localizedSurfaceOptions.find((option) => option.value === selectedSurface) ?? localizedSurfaceOptions[0],
    [localizedSurfaceOptions, selectedSurface],
  );
  const selectedColorTitle = selectedColorOption?.title ?? (selectedColorValue ? selectedColorRgbLabel : t("wizard.paintFlow.noColorSelected"));
  const availableCredits = sharedCredits;
  const generationSpeedTier = useMemo<"standard" | "pro" | "ultra">(() => {
    if (me?.subscriptionType === "yearly") {
      return "ultra";
    }
    if (me?.hasPaidAccess) {
      return "pro";
    }
    return "standard";
  }, [me?.hasPaidAccess, me?.subscriptionType]);
  const generationAccess = canUserGenerateNow(me);
  const canGenerate = Boolean(selectedImage && hasMask && (selectedColorValue || isAiColorSuggestionEnabled) && !isGenerating);
  const currentStepNumber =
    step === "intake" ? 1 : step === "mask" ? 2 : step === "colors" ? 3 : 4;
  const paintWizardExamplePhotos = useMemo(() => getPaintWizardExamplePhotos(t), [i18n.language, t]);
  const generationStatusMessages = useGenerationStatusMessages();
  const stickyHeaderMetrics = getStickyStepHeaderMetrics(insets.top);
  const selectionLayoutScale = Math.min(width / SELECTION_REFERENCE_WIDTH, height / SELECTION_REFERENCE_HEIGHT, 1);
  const selectionTitleTop = stickyHeaderMetrics.contentOffset;
  const selectionPreviewWidth = Math.min(width - scaleSelectionValue(48, selectionLayoutScale), scaleSelectionValue(408, selectionLayoutScale));
  const selectionPreviewHeight = scaleSelectionValue(416, selectionLayoutScale);
  const selectionCardGap = scaleSelectionValue(12, selectionLayoutScale);
  const selectionCardWidth = Math.min(
    scaleSelectionValue(200, selectionLayoutScale),
    (width - scaleSelectionValue(48, selectionLayoutScale) - selectionCardGap) / 2,
  );
  const selectionCardHeight = scaleSelectionValue(116, selectionLayoutScale);
  const selectionFooterHeight = scaleSelectionValue(132, selectionLayoutScale) + insets.bottom;
  const colorPickerSheetHeight = Math.min(
    scaleSelectionValue(824, selectionLayoutScale) + insets.bottom,
    height - Math.max(insets.top - scaleSelectionValue(24, selectionLayoutScale), 0),
  );
  const surfacePickerSheetHeight = Math.min(
    scaleSelectionValue(868, selectionLayoutScale) + insets.bottom,
    height - Math.max(insets.top - scaleSelectionValue(24, selectionLayoutScale), 0),
  );
  const colorPickerSquareSize = scaleSelectionValue(408, selectionLayoutScale);
  const colorPickerHueSliderHeight = scaleSelectionValue(32, selectionLayoutScale);
  const colorPickerHandleSize = scaleSelectionValue(24, selectionLayoutScale);
  const colorPickerSwatchSize = scaleSelectionValue(24, selectionLayoutScale);
  const intakeHeading = selectedImage ? "Photo added. Mark the wall area next." : "Upload Your Vision";
  const intakeSubtext = selectedImage
    ? "Your photo is locked in. Next, brush the wall surfaces so the recolor stays precise around trim, furniture, and decor."
    : "Upload a room photo for precise wall recoloring.";
  void intakeHeading;
  void intakeSubtext;
  const canContinueFromSelection = Boolean((isAiColorSuggestionEnabled || (selectedColorValue && isColorConfirmed)) && isSurfaceConfirmed);
  const canContinueFromMask = hasMask && !isDetecting && !isAutoDetecting;
  const activeMaskTool = maskTool === "surface" ? "brush" : maskTool;
  const maskWidthLabel =
    activeMaskTool === "eraser" ? t("wizard.paintFlow.eraserWidth") : t("wizard.paintFlow.brushWidth");
  const maskCanvasWidth = Math.min(width - 48, 412);
  const maskCanvasHeight = Math.min(Math.max(height * 0.45, 352), 416);
  const previewColorButtonValue = isColorPickerOpen ? colorPickerDraft.hex : selectedColorValue;
  const previewColorOption = useMemo(
    () => (previewColorButtonValue ? localizedWallColorOptions.find((option) => option.value === previewColorButtonValue) ?? null : null),
    [localizedWallColorOptions, previewColorButtonValue],
  );
  const previewColorCategory = useMemo(
    () => (previewColorButtonValue ? resolveColorCategoryLabel(previewColorButtonValue, localizedColorLabels) : null),
    [localizedColorLabels, previewColorButtonValue],
  );
  const selectedColorButtonText = isAiColorSuggestionEnabled
    ? "AI Suggest"
    : (previewColorOption?.title
    ?? previewColorCategory
    ?? previewColorButtonValue
    ?? t("wizard.paintFlow.choose"));
  const selectedColorButtonBackground = isAiColorSuggestionEnabled ? "#F4E6B8" : (previewColorButtonValue ?? "#0A0A0A");
  const selectedColorButtonTextColor = isAiColorSuggestionEnabled
    ? "#2F2415"
    : (previewColorButtonValue ? resolveContrastTextColor(previewColorButtonValue) : "#FFFFFF");
  const selectedSurfaceButtonText = isSurfaceConfirmed ? selectedSurfaceOption.label : t("wizard.paintFlow.choose");
  const selectedSurfaceIconColor = isSurfaceConfirmed ? "#FFFFFF" : "#0A0A0A";

  useEffect(() => {
    return () => {
      if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
      if (continueTimerRef.current) clearTimeout(continueTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (initialSelectionAppliedRef.current) {
      return;
    }

    if (typeof presetStyle === "string") {
      const normalized = presetStyle.trim().toLowerCase();
      const matched = WALL_COLOR_OPTIONS.find((option) => option.title.toLowerCase() === normalized);
      if (matched) {
        setSelectedColorValue(matched.value);
        setIsColorConfirmed(true);
        setIsAiColorSuggestionEnabled(false);
      }
    }

    initialSelectionAppliedRef.current = true;
  }, [presetStyle, startStep]);

  useEffect(() => {
    if (!generationId || !generationArchive) return;
    const generation = generationArchive.find((item) => item._id === generationId);
    if (!generation) return;

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
      setProcessingComplete(true);
      const revealTimer = setTimeout(() => {
        triggerHaptic();
        if (effectiveSignedIn) {
          router.replace({ pathname: "/workspace", params: { boardView: "board" } });
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
      setStep("colors");
      showToast(getFriendlyGenerationError(generation.errorMessage ?? GENERATION_FAILED_TOAST));
    }
  }, [effectiveSignedIn, generationArchive, generationId, router, showToast]);

  const resetDetection = useCallback(() => {
    if (detectTimerRef.current) clearTimeout(detectTimerRef.current);
    setIsDetecting(true);
    detectTimerRef.current = setTimeout(() => {
      setIsDetecting(false);
    }, DETECT_DURATION_MS);
  }, []);

  const clearDetectTimer = useCallback(() => {
    if (detectTimerRef.current) {
      clearTimeout(detectTimerRef.current);
      detectTimerRef.current = null;
    }
    setIsDetecting(false);
  }, []);

  const clearContinueTimer = useCallback(() => {
    if (continueTimerRef.current) {
      clearTimeout(continueTimerRef.current);
      continueTimerRef.current = null;
    }
    setLoadingContinueStep(null);
  }, []);

  const resetProject = useCallback(() => {
    clearDetectTimer();
    clearContinueTimer();
    setStep("intake");
    setMaskTool("brush");
    setSelectedImage(null);
    setSelectedSurface("Auto");
    setIsSurfaceConfirmed(false);
    setGeneratedImageUrl(null);
    setGenerationId(null);
    setIsGenerating(false);
    setIsAutoDetecting(false);
    setDetectedSourceStorageId(null);
    setIsCancellingGeneration(false);
    setIsColorPickerOpen(false);
    setIsSurfacePickerOpen(false);
    resetMaskDrawing({ resetBrush: true });
    if (typeof presetStyle === "string") {
      const normalized = presetStyle.trim().toLowerCase();
      const matched = WALL_COLOR_OPTIONS.find((option) => option.title.toLowerCase() === normalized);
      setSelectedColorValue(matched?.value ?? null);
      setIsColorConfirmed(Boolean(matched));
    } else {
      setSelectedColorValue(null);
      setIsColorConfirmed(false);
    }
    }, [clearContinueTimer, clearDetectTimer, presetStyle, resetMaskDrawing]);

  const promptOpenSettings = useCallback((title: string, message: string) => {
    Alert.alert(title, message, [
      { text: t("common.actions.cancel"), style: "cancel" },
      {
        text: t("common.actions.openSettings"),
        onPress: () => {
          void Linking.openSettings();
        },
      },
    ]);
  }, [t]);

  const prepareGeneratedImageFile = useCallback(async () => {
    if (!generatedImageUrl) {
      throw new Error("Generate an image first.");
    }

    if (generatedImageUrl.startsWith("file://")) {
      return { uri: generatedImageUrl, temporary: false };
    }

    const targetUri = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? ""}homedecor-paint-result-${Date.now()}.jpg`;
    const download = await FileSystem.downloadAsync(generatedImageUrl, targetUri);
    return { uri: download.uri, temporary: true };
  }, [generatedImageUrl]);

  const cleanupTempFile = useCallback(async (uri: string | null | undefined, temporary: boolean) => {
    if (!uri || !temporary) {
      return;
    }

    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {
      // ignore cleanup errors
    }
  }, []);

  const handleSaveResult = useCallback(async () => {
    triggerHaptic();

    let tempUri: string | null = null;
    let temporary = false;
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        promptOpenSettings(t("wizard.paintFlow.savePermissionTitle"), t("wizard.paintFlow.savePermissionBody"));
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
  }, [cleanupTempFile, prepareGeneratedImageFile, promptOpenSettings, showToast, t]);

  const handleShareResult = useCallback(async () => {
    triggerHaptic();

    let tempUri: string | null = null;
    let temporary = false;
    try {
      const prepared = await prepareGeneratedImageFile();
      tempUri = prepared.uri;
      temporary = prepared.temporary;
      await Share.share({
        message: t("workspace.share.message"),
        url: prepared.uri,
      });
    } catch (error) {
      Alert.alert(t("workspace.share.failedTitle"), error instanceof Error ? error.message : t("common.actions.tryAgain"));
    } finally {
      await cleanupTempFile(tempUri, temporary);
    }
  }, [cleanupTempFile, prepareGeneratedImageFile, t]);

  const handleClose = useCallback(() => {
    triggerHaptic();
    resetProject();
    router.replace(TABS_HOME_ROUTE as any);
  }, [resetProject, router]);

  const handleOpenPaywall = useCallback(() => {
    triggerHaptic();
    router.push("/paywall" as any);
  }, [router]);

  const uploadBlobToStorage = useCallback(
    async (uri: string) => {
      const uploadUrl = (await createSourceUploadUrl(viewerArgs)) as string;
      return await uploadLocalFileToCloud(uploadUrl, uri, {
        fallbackMimeType: "image/png",
        errorLabel: "wall-paint assets",
      });
    },
    [createSourceUploadUrl, viewerArgs],
  );

  const ensureDetectableSourceStorageId = useCallback(async () => {
    if (!selectedImage) {
      throw new Error("Select a room photo before using Auto-Detect.");
    }

    if (detectedSourceStorageId) {
      return detectedSourceStorageId;
    }

    if (!selectedImage.photoUri) {
      throw new Error("No uploaded room photo is available for auto-detect.");
    }

    const storageId = await uploadBlobToStorage(selectedImage.photoUri);
    setDetectedSourceStorageId(storageId);
    return storageId;
  }, [detectedSourceStorageId, selectedImage, uploadBlobToStorage]);

  const applySelectedImage = useCallback(
    (nextImage: SelectedImage) => {
      clearDetectTimer();
      clearContinueTimer();
      setMaskTool("brush");
      setSelectedImage(nextImage);
      setSelectedColorValue(null);
      setIsColorConfirmed(false);
      setIsAiColorSuggestionEnabled(false);
      setSelectedSurface("Auto");
      setIsSurfaceConfirmed(false);
      setGeneratedImageUrl(null);
      setGenerationId(null);
      setDetectedSourceStorageId(null);
      setIsAutoDetecting(false);
      setIsCancellingGeneration(false);
      setIsColorPickerOpen(false);
      setIsSurfacePickerOpen(false);
      resetMaskDrawing({ resetBrush: true });
    },
    [clearContinueTimer, clearDetectTimer, resetMaskDrawing],
  );

  const advanceToMaskStep = useCallback(() => {
    triggerHaptic();
    setStep("mask");
  }, []);

  const runDeferredContinue = useCallback(
    (key: "intake" | "mask" | "colors", action: () => void) => {
      if (loadingContinueStep) return;
      if (continueTimerRef.current) clearTimeout(continueTimerRef.current);

      setLoadingContinueStep(key);
      continueTimerRef.current = setTimeout(() => {
        continueTimerRef.current = null;
        action();
        setLoadingContinueStep(null);
      }, 140);
    },
    [loadingContinueStep],
  );

  const syncColorPickerDraft = useCallback((hue: number, saturation: number, value: number) => {
    const rgb = hsvToRgb(hue, saturation, value);
    setColorPickerDraft({
      hue,
      saturation,
      value,
      hex: rgbToHex(rgb),
      rgbLabel: formatRgbLabel(rgb),
    });
  }, []);

  const primeColorPickerFromHex = useCallback(
    (hexColor: string | null) => {
      const normalizedHex = hexColor ?? selectedColorValue ?? COLOR_PICKER_DEFAULT_HEX;
      const nextHsv = hexToHsv(normalizedHex) ?? (hexToHsv(COLOR_PICKER_DEFAULT_HEX) as HsvColor);

      colorPickerHue.value = nextHsv.hue;
      colorPickerSaturation.value = nextHsv.saturation;
      colorPickerValue.value = nextHsv.value;
      syncColorPickerDraft(nextHsv.hue, nextHsv.saturation, nextHsv.value);
    },
    [colorPickerHue, colorPickerSaturation, colorPickerValue, selectedColorValue, syncColorPickerDraft],
  );

  const handleOpenColorPicker = useCallback(() => {
    triggerHaptic();
    primeColorPickerFromHex(selectedColorValue);
    setIsColorPickerOpen(true);
  }, [primeColorPickerFromHex, selectedColorValue]);

  const handleOpenSurfacePicker = useCallback(() => {
    triggerHaptic();
    setSurfacePickerDraft(selectedSurface);
    setIsSurfacePickerOpen(true);
  }, [selectedSurface]);

  const handleCloseColorPicker = useCallback(() => {
    triggerHaptic();
    setIsColorPickerOpen(false);
  }, []);

  const handleCloseSurfacePicker = useCallback(() => {
    triggerHaptic();
    setIsSurfacePickerOpen(false);
  }, []);

  const handleApplyColorPicker = useCallback(() => {
    triggerHaptic();
    setSelectedColorValue(colorPickerDraft.hex);
    setIsColorConfirmed(true);
    setIsAiColorSuggestionEnabled(false);
    setIsColorPickerOpen(false);
  }, [colorPickerDraft.hex]);

  const handleAiColorSuggestionPress = useCallback(() => {
    triggerHaptic();
    setIsAiColorSuggestionEnabled((current) => {
      const next = !current;
      if (next) {
        setSelectedColorValue(null);
        setIsColorConfirmed(true);
      }
      return next;
    });
  }, []);

  const handlePresetColorPress = useCallback(
    (hexColor: string) => {
      const nextHsv = hexToHsv(hexColor);
      if (!nextHsv) {
        return;
      }

      triggerHaptic();
      colorPickerHue.value = nextHsv.hue;
      colorPickerSaturation.value = nextHsv.saturation;
      colorPickerValue.value = nextHsv.value;
      syncColorPickerDraft(nextHsv.hue, nextHsv.saturation, nextHsv.value);
    },
    [colorPickerHue, colorPickerSaturation, colorPickerValue, syncColorPickerDraft],
  );

  const handleColorSquareGesture = useCallback(
    (x: number, y: number) => {
      const nextSaturation = clamp(x / colorPickerSquareSize, 0, 1);
      const nextValue = clamp(1 - y / colorPickerSquareSize, 0, 1);
      syncColorPickerDraft(colorPickerHue.value, nextSaturation, nextValue);
    },
    [colorPickerHue, colorPickerSquareSize, syncColorPickerDraft],
  );

  const handleHueSliderGesture = useCallback(
    (x: number) => {
      const nextHue = clamp(x / colorPickerSquareSize, 0, 1) * 360;
      syncColorPickerDraft(nextHue, colorPickerSaturation.value, colorPickerValue.value);
    },
    [colorPickerSaturation, colorPickerSquareSize, colorPickerValue, syncColorPickerDraft],
  );

  const handleSelectSurfaceDraft = useCallback((value: PaintSurfaceOption["value"]) => {
    triggerHaptic();
    setSurfacePickerDraft(value);
  }, []);

  const handleApplySurfacePicker = useCallback(() => {
    triggerHaptic();
    setSelectedSurface(surfacePickerDraft);
    setIsSurfaceConfirmed(true);
    setIsSurfacePickerOpen(false);
  }, [surfacePickerDraft]);

  const handleAutoDetectMask = useCallback(async () => {
    try {
    if (!viewerReady) {
      showToast(t("workspace.generation.preparingSessionBody"));
      return;
    }

      if (!selectedImage || canvasSize.width <= 0 || canvasSize.height <= 0 || isAutoDetecting || isDetecting) {
        return;
      }

      setIsAutoDetecting(true);
      const imageStorageId = await ensureDetectableSourceStorageId();
      const detection = (await detectEditMask({
        imageStorageId,
        target: "paint",
      })) as {
        confidence?: number;
        polygons?: Array<Array<{ x: number; y: number }>>;
      };

      const polygons = Array.isArray(detection.polygons) ? detection.polygons : [];
      const confidence = typeof detection.confidence === "number" ? detection.confidence : 0;

      if (confidence < 70 || polygons.length === 0) {
        showToast(t("wizard.paintFlow.autoDetectFailure"));
        return;
      }

      const mappedRegions = polygons
        .map((polygon) =>
          polygon.map((point) =>
            mapDetectionPointToCanvas(point, selectedImage, canvasSize, "contain"),
          ),
        )
        .filter((polygon) => polygon.length >= 3);

      if (!mappedRegions.length) {
        showToast(t("wizard.paintFlow.autoDetectFailure"));
        return;
      }

      replaceMaskWithRegions(mappedRegions);
      triggerHaptic();
      showToast(t("wizard.paintFlow.autoDetectSuccess"));
    } catch (error) {
      logAutoDetectFailure(error);
      showToast(t("wizard.paintFlow.autoDetectFailure"));
    } finally {
      setIsAutoDetecting(false);
    }
  }, [
    canvasSize.height,
    canvasSize.width,
    detectEditMask,
    ensureDetectableSourceStorageId,
    isAutoDetecting,
    isDetecting,
    replaceMaskWithRegions,
    selectedImage,
    showToast,
    t,
    viewerReady,
  ]);

  const handleSelectMaskTool = useCallback(
    (tool: MaskTool) => {
      triggerHaptic();
      setMaskTool(tool);

      if (tool === "surface") {
        void handleAutoDetectMask();
      }
    },
    [handleAutoDetectMask],
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
            source === "camera" ? t("wizard.paintFlow.cameraAccessTitle") : t("wizard.paintFlow.photoAccessTitle"),
            source === "camera"
              ? t("wizard.paintFlow.cameraAccessBody")
              : t("wizard.paintFlow.photoAccessBody"),
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

        if (result.canceled || !result.assets[0]) return false;

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
        Alert.alert(t("wizard.paintFlow.mediaUnavailableTitle"), error instanceof Error ? error.message : t("common.actions.tryAgain"));
        return false;
      }
    },
    [advanceToMaskStep, applySelectedImage, t],
  );

  const handleSelectExample = useCallback(
    (example: PaintIntroExamplePhoto) => {
      const resolved = NativeImage.resolveAssetSource(example.source);
      if (!resolved?.uri) {
        Alert.alert(t("workspace.media.exampleUnavailableTitle"), t("wizard.paintFlow.exampleUnavailableBody"));
        return;
      }

      applySelectedImage({
        uri: resolved.uri,
        photoUri: null,
        width: resolved.width ?? 1080,
        height: resolved.height ?? 1440,
      });
      advanceToMaskStep();
    },
    [advanceToMaskStep, applySelectedImage, t],
  );

  const handleGenerate = useCallback(async () => {
    if (isGenerating) {
      return;
    }

    if (!viewerReady) {
      Alert.alert(t("workspace.generation.preparingSessionTitle"), t("workspace.generation.preparingSessionBody"));
      return;
    }

    if (!selectedImage || !hasMask || !sourceCaptureRef.current || !maskCaptureRef.current) {
      Alert.alert(t("wizard.paintFlow.markWallsTitle"), t("wizard.paintFlow.markWallsBody"));
      return;
    }

    if (!selectedColorValue && !isAiColorSuggestionEnabled) {
      Alert.alert(t("wizard.paintFlow.pickColorTitle"), t("wizard.paintFlow.pickColorBody"));
      return;
    }

    if (!generationAccess.allowed) {
      if (generationAccess.reason === "paywall" && !effectiveSignedIn) {
        setAwaitingAuth(true);
        router.push({ pathname: "/sign-in", params: { returnTo: "/workspace?service=paint" } });
        return;
      }

      if (generationAccess.reason === "paywall") {
        router.push({ pathname: "/paywall", params: { source: "generate" } } as any);
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
            sourceUri = await captureRef(sourceCaptureRef, {
              format: "png",
              quality: 1,
              result: "tmpfile",
            });
            maskUri = await captureRef(maskCaptureRef, {
              format: "png",
              quality: 1,
              result: "tmpfile",
            });

            const [sourceStorageId, maskStorageId] = await Promise.all([
              uploadBlobToStorage(sourceUri),
              uploadBlobToStorage(maskUri),
            ]);

            return (await startGeneration({
              anonymousId: viewerId,
              imageStorageId: sourceStorageId,
              maskStorageId,
              serviceType: "paint",
              selection: isAiColorSuggestionEnabled
                ? `AI suggested professional wall color on the ${selectedSurface.toLowerCase()} surface with a realistic ${DEFAULT_FINISH_LABEL.toLowerCase()} finish`
                : `${selectedColorTitle} (${selectedColorRgbLabel}) on the ${selectedSurface.toLowerCase()} surface with a realistic ${DEFAULT_FINISH_LABEL.toLowerCase()} finish`,
              roomType: "Room",
              displayStyle: isAiColorSuggestionEnabled ? "AI Suggested Paint" : `${selectedColorTitle} Paint`,
              customPrompt: isAiColorSuggestionEnabled
                ? `Identify the room's current lighting and furniture, then choose the most complementary professional wall color for the selected ${selectedSurface.toLowerCase()} surface. Preserve trim, ceilings, furniture, windows, doors, floors, artwork, reflections, and the original lighting exactly.`
                : `Repaint only the selected ${selectedSurface.toLowerCase()} surface using ${selectedColorTitle} in ${selectedColorRgbLabel}. Preserve trim, ceilings, furniture, windows, doors, floors, artwork, reflections, and the original lighting exactly.`,
              targetColor: isAiColorSuggestionEnabled ? undefined : selectedColorRgbLabel,
              targetColorHex: isAiColorSuggestionEnabled ? undefined : selectedColorValue ?? undefined,
              targetColorCategory: isAiColorSuggestionEnabled ? "AI Suggested Color" : (selectedColorCategory ?? selectedColorTitle),
              targetSurface: selectedSurface,
              aspectRatio: simplifyRatio(selectedImage.width, selectedImage.height),
              finishId: DEFAULT_FINISH_ID,
              speedTier: generationSpeedTier,
              smartSuggest: isAiColorSuggestionEnabled,
            })) as { generationId: string; creditsRemaining?: number };
          } finally {
            await Promise.all([
              cleanupTempFile(sourceUri, true),
              cleanupTempFile(maskUri, true),
            ]);
          }
        },
        showToast,
      )) as { generationId: string; creditsRemaining?: number };

      if (typeof result.creditsRemaining === "number") {
        setOptimisticCredits(result.creditsRemaining);
      }
      handledGenerationCompletionRef.current = null;
      setGenerationId(result.generationId);
    } catch (error) {
      setIsGenerating(false);
      setStep("colors");
      const rawMessage = error instanceof Error ? error.message : t("common.actions.tryAgain");
      if (rawMessage.toLowerCase().includes("limit reached")) {
        showToast(rawMessage);
        return;
      }
      if (rawMessage === "Payment Required") {
        if (!effectiveSignedIn) {
          setAwaitingAuth(true);
          router.push({ pathname: "/sign-in", params: { returnTo: "/workspace?service=paint" } });
          return;
        }
        router.push({ pathname: "/paywall", params: { source: "generate" } } as any);
        return;
      }
      showToast(getFriendlyGenerationError(rawMessage));
    }
  }, [
    effectiveSignedIn,
    generationAccess.allowed,
    generationAccess.message,
    generationAccess.reason,
    hasMask,
    isAiColorSuggestionEnabled,
    isGenerating,
    router,
    selectedColorCategory,
    selectedColorRgbLabel,
    selectedColorTitle,
    selectedColorValue,
    selectedImage,
    selectedSurface,
    setOptimisticCredits,
    showToast,
    startGeneration,
    t,
    uploadBlobToStorage,
    viewerId,
    viewerReady,
    cleanupTempFile,
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
      })) as { cancelled?: boolean };

      if (!result.cancelled) {
        showToast(t("wizard.paintFlow.renderFinishing"));
        return;
      }

      triggerHaptic();
      setIsGenerating(false);
      setGenerationId(null);
      setGeneratedImageUrl(null);
      setStep("colors");
      showToast(t(CANCEL_SUCCESS_TOAST));
    } catch (error) {
      showToast(getFriendlyGenerationError(error instanceof Error ? error.message : t("wizard.paintFlow.cancelUnavailable")));
    } finally {
      setIsCancellingGeneration(false);
    }
  }, [cancelGeneration, generationId, isCancellingGeneration, showToast, t, viewerId]);

  useEffect(() => {
    if (!awaitingAuth || !effectiveSignedIn || !viewerReady || !canGenerate) {
      return;
    }

    setAwaitingAuth(false);
    const timer = setTimeout(() => {
      void handleGenerate();
    }, 300);
    return () => clearTimeout(timer);
  }, [awaitingAuth, canGenerate, effectiveSignedIn, handleGenerate, viewerReady]);

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

  const handleBack = useCallback(() => {
    triggerHaptic();
    clearDetectTimer();
    clearContinueTimer();
    if (step === "intake") return;
    if (step === "mask") return setStep("intake");
    if (step === "colors") return setStep("mask");
    if (step === "processing") return setStep("colors");
    if (step === "result") return setStep("colors");
  }, [clearContinueTimer, clearDetectTimer, step]);

  const colorPickerSquareGesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin((event) => {
          const clampedX = clamp(event.x, 0, colorPickerSquareSize);
          const clampedY = clamp(event.y, 0, colorPickerSquareSize);
          colorPickerSaturation.value = clampedX / colorPickerSquareSize;
          colorPickerValue.value = 1 - clampedY / colorPickerSquareSize;
          runOnJS(handleColorSquareGesture)(clampedX, clampedY);
        })
        .onUpdate((event) => {
          const clampedX = clamp(event.x, 0, colorPickerSquareSize);
          const clampedY = clamp(event.y, 0, colorPickerSquareSize);
          colorPickerSaturation.value = clampedX / colorPickerSquareSize;
          colorPickerValue.value = 1 - clampedY / colorPickerSquareSize;
          runOnJS(handleColorSquareGesture)(clampedX, clampedY);
        }),
    [colorPickerSaturation, colorPickerSquareSize, colorPickerValue, handleColorSquareGesture],
  );

  const colorPickerHueGesture = useMemo(
    () =>
      Gesture.Pan()
        .onBegin((event) => {
          const clampedX = clamp(event.x, 0, colorPickerSquareSize);
          colorPickerHue.value = (clampedX / colorPickerSquareSize) * 360;
          runOnJS(handleHueSliderGesture)(clampedX);
        })
        .onUpdate((event) => {
          const clampedX = clamp(event.x, 0, colorPickerSquareSize);
          colorPickerHue.value = (clampedX / colorPickerSquareSize) * 360;
          runOnJS(handleHueSliderGesture)(clampedX);
        }),
    [colorPickerHue, colorPickerSquareSize, handleHueSliderGesture],
  );

  const colorPickerSquareHandleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: colorPickerSaturation.value * colorPickerSquareSize - colorPickerHandleSize / 2 },
      { translateY: (1 - colorPickerValue.value) * colorPickerSquareSize - colorPickerHandleSize / 2 },
    ],
  }));

  const colorPickerHueHandleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (colorPickerHue.value / 360) * colorPickerSquareSize - colorPickerHandleSize / 2 }],
  }));

  const colorPickerHueFillStyle = useAnimatedStyle(() => ({
    backgroundColor: `hsl(${colorPickerHue.value}, 100%, 50%)`,
  }));

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
            style={{ width: canvasSize.width, height: canvasSize.height, marginTop: spacing.sm, backgroundColor: OLED_BLACK }}
          >
            <Svg width={canvasSize.width} height={canvasSize.height}>
              <Rect x={0} y={0} width={canvasSize.width} height={canvasSize.height} fill={OLED_BLACK} />
              {renderedStrokes.map((stroke) => (
                <SvgPath
                  key={`mask-${stroke.id}`}
                  d={stroke.path}
                  stroke={stroke.kind === "region" ? "none" : stroke.tool === "eraser" ? OLED_BLACK : MASK_CAPTURE_COLOR}
                  strokeWidth={stroke.kind === "region" ? 0 : stroke.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill={stroke.kind === "region" ? MASK_CAPTURE_COLOR : stroke.tool === "eraser" ? OLED_BLACK : "none"}
                />
              ))}
            </Svg>
          </View>
        </View>
      ) : null}

      {step !== "processing" && step !== "result" && step !== "intake" ? (
        <ServiceWizardHeader
          title="Wall"
          step={currentStepNumber}
          creditCount={availableCredits}
          onCreditsPress={handleOpenPaywall}
          canGoBack={currentStepNumber > 1}
          onBack={handleBack}
          onClose={handleClose}
        />
      ) : null}

      {step === "intake" ? (
        <PaintIntroScreen
          creditCount={availableCredits}
          examples={paintWizardExamplePhotos}
          onTakePhoto={() => handleSelectMedia("camera")}
          onChooseFromGallery={() => handleSelectMedia("library")}
          onExamplePress={handleSelectExample}
          onCreditsPress={handleOpenPaywall}
          onExit={handleClose}
        />
      ) : null}

      {step === "colors" ? (
        <View style={styles.selectionStepScreen}>
          <StatusBar style="dark" />
          <Text style={[styles.selectionHeaderTitle, { top: selectionTitleTop }]}>{t("wizard.paintFlow.selectionTitle")}</Text>

          <View
            style={[
              styles.selectionStepContent,
              {
                paddingTop: selectionTitleTop + scaleSelectionValue(56, selectionLayoutScale),
                paddingBottom: selectionFooterHeight + scaleSelectionValue(24, selectionLayoutScale),
              },
            ]}
          >
            <View style={[styles.selectionPreviewFrame, { width: selectionPreviewWidth, height: selectionPreviewHeight }]}>
              {selectedImage ? (
                <Image source={{ uri: selectedImage.uri }} style={styles.photoImage} contentFit="contain" transition={160} />
              ) : null}
            </View>

            <View style={[styles.selectionCardsRow, { gap: selectionCardGap, marginTop: scaleSelectionValue(44, selectionLayoutScale) }]}>
              <View style={[styles.selectionChoiceCard, (selectedColorValue || isAiColorSuggestionEnabled) ? styles.selectionChoiceCardActive : null, { width: selectionCardWidth, minHeight: selectionCardHeight }]}>
                <View style={styles.selectionCardIconWrap}>
                  <BrushCleaning color="#0A0A0A" size={18} strokeWidth={2.1} />
                </View>
                <Text style={[styles.selectionCardLabel, (selectedColorValue || isAiColorSuggestionEnabled) ? styles.selectionCardLabelActive : null]}>{t("wizard.paintFlow.colorLabel")}</Text>
                <View style={styles.selectionColorActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleOpenColorPicker}
                    style={[
                      styles.selectionColorButton,
                      styles.selectionColorButtonFlexible,
                      {
                        width: Math.min(scaleSelectionValue(124, selectionLayoutScale), selectionCardWidth - scaleSelectionValue(88, selectionLayoutScale)),
                        backgroundColor: selectedColorButtonBackground,
                      },
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.selectionColorButtonText,
                        {
                          color: selectedColorButtonTextColor,
                        },
                      ]}
                    >
                      {selectedColorButtonText}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="AI suggest wall color"
                    onPress={handleAiColorSuggestionPress}
                    style={[styles.aiSuggestionButton, isAiColorSuggestionEnabled ? styles.aiSuggestionButtonActive : null]}
                  >
                    <Wand2 color={isAiColorSuggestionEnabled ? "#2F2415" : "#FFFFFF"} size={18} strokeWidth={2.1} />
                  </Pressable>
                </View>
              </View>

              <View style={[styles.selectionChoiceCard, isSurfaceConfirmed ? styles.selectionChoiceCardActive : null, { width: selectionCardWidth, minHeight: selectionCardHeight }]}>
                <View style={styles.selectionCardIconWrap}>
                  <PaintSurfaceIcon surface={selectedSurface} color="#0A0A0A" size={18} />
                </View>
                <Text style={[styles.selectionCardLabel, styles.selectionSurfaceCardLabel, isSurfaceConfirmed ? styles.selectionCardLabelActive : null]}>{t("wizard.paintFlow.surfaceLabel")}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleOpenSurfacePicker}
                  style={[
                    styles.selectionSurfaceButton,
                    {
                      width: Math.min(scaleSelectionValue(164, selectionLayoutScale), selectionCardWidth - scaleSelectionValue(36, selectionLayoutScale)),
                    },
                    isSurfaceConfirmed ? styles.selectionSurfaceButtonConfirmed : null,
                  ]}
                >
                  <View style={styles.selectionSurfaceButtonContent}>
                    <PaintSurfaceIcon surface={selectedSurface} color={selectedSurfaceIconColor} size={16} />
                    <Text style={[styles.selectionSurfaceButtonText, isSurfaceConfirmed ? styles.selectionSurfaceButtonTextConfirmed : null]}>
                      {selectedSurfaceButtonText}
                    </Text>
                  </View>
                </Pressable>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.selectionFooter,
              {
                minHeight: selectionFooterHeight,
                paddingBottom: Math.max(insets.bottom + scaleSelectionValue(24, selectionLayoutScale), scaleSelectionValue(24, selectionLayoutScale)),
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              disabled={!canContinueFromSelection}
              onPress={() => {
                if (!canContinueFromSelection) {
                  return;
                }

                runDeferredContinue("colors", () => {
                  triggerHaptic();
                  resetDetection();
                  void handleGenerate();
                });
              }}
              style={[
                styles.selectionContinueButton,
                canContinueFromSelection ? styles.selectionContinueButtonActive : styles.selectionContinueButtonDisabled,
              ]}
            >
              {loadingContinueStep === "colors" ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text
                  style={[
                    styles.selectionContinueButtonText,
                    canContinueFromSelection ? styles.selectionContinueButtonTextActive : styles.selectionContinueButtonTextDisabled,
                  ]}
                >
                  {t("common.actions.continue")}
                </Text>
              )}
            </Pressable>
          </View>

          <AnimatePresence>
            {isColorPickerOpen ? (
              <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={styles.colorPickerOverlay}>
              <Pressable accessibilityRole="button" onPress={handleCloseColorPicker} style={StyleSheet.absoluteFillObject} />
                <MotiView
                  from={{ opacity: 0.96, translateY: 48, scale: 0.985 }}
                  animate={{ opacity: 1, translateY: 0, scale: 1 }}
                  exit={{ opacity: 0.94, translateY: 36, scale: 0.985 }}
                  transition={LUX_SPRING}
                  style={[
                    styles.colorPickerSheet,
                    {
                      height: colorPickerSheetHeight,
                      paddingBottom: Math.max(insets.bottom + scaleSelectionValue(124, selectionLayoutScale), scaleSelectionValue(124, selectionLayoutScale)),
                    },
                  ]}
                >
                <View style={[styles.selectionModalHeader, { marginTop: scaleSelectionValue(20, selectionLayoutScale), marginHorizontal: scaleSelectionValue(20, selectionLayoutScale) }]}>
                  <Pressable accessibilityRole="button" onPress={handleCloseColorPicker} style={styles.selectionModalNavButton}>
                    <ChevronLeft color="#0A0A0A" size={20} strokeWidth={2.2} />
                  </Pressable>

                  <View style={styles.selectionModalTitleWrap}>
                    <Text numberOfLines={2} style={styles.colorPickerTitle}>{t("wizard.paintFlow.colorPickerTitle")}</Text>
                  </View>

                  <Pressable accessibilityRole="button" onPress={handleCloseColorPicker} style={styles.selectionModalCloseButton}>
                    <X color="#0A0A0A" size={18} strokeWidth={2.2} />
                  </Pressable>
                </View>

                <View style={{ marginTop: scaleSelectionValue(52, selectionLayoutScale), alignItems: "center" }}>
                  <GestureDetector gesture={colorPickerSquareGesture}>
                    <View style={[styles.colorPickerSquare, { width: colorPickerSquareSize, height: colorPickerSquareSize }]}>
                      <Animated.View style={[StyleSheet.absoluteFillObject, colorPickerHueFillStyle]} />
                      <LinearGradient
                        colors={["#FFFFFF", "rgba(255,255,255,0)"]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={StyleSheet.absoluteFillObject}
                      />
                      <LinearGradient
                        colors={["rgba(0,0,0,0)", "#000000"]}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                        style={StyleSheet.absoluteFillObject}
                      />
                      <Animated.View style={[styles.colorPickerHandle, { width: colorPickerHandleSize, height: colorPickerHandleSize, borderRadius: colorPickerHandleSize / 2 }, colorPickerSquareHandleStyle]} />
                    </View>
                  </GestureDetector>

                  <GestureDetector gesture={colorPickerHueGesture}>
                    <View style={[styles.colorPickerHueSlider, { width: colorPickerSquareSize, height: colorPickerHueSliderHeight, marginTop: scaleSelectionValue(20, selectionLayoutScale) }]}>
                      <LinearGradient
          colors={["#FF9500", "#FFD60A", "#34C759", "#32D7FF", "#0A84FF", "#BF5AF2", "#CC3333"]}
                        locations={[0, 0.16, 0.33, 0.5, 0.66, 0.82, 1]}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={StyleSheet.absoluteFillObject}
                      />
                      <Animated.View style={[styles.colorPickerHueHandle, { width: colorPickerHandleSize, height: colorPickerHandleSize, borderRadius: colorPickerHandleSize / 2 }, colorPickerHueHandleStyle]} />
                    </View>
                  </GestureDetector>

                  <View style={[styles.colorPickerPresetRow, { marginTop: scaleSelectionValue(40, selectionLayoutScale), paddingLeft: scaleSelectionValue(32, selectionLayoutScale), gap: scaleSelectionValue(40, selectionLayoutScale) }]}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="AI suggest wall color"
                      onPress={handleAiColorSuggestionPress}
                      style={[
                        styles.colorPickerPresetSwatch,
                        styles.colorPickerPresetAiSwatch,
                        {
                          width: colorPickerSwatchSize,
                          height: colorPickerSwatchSize,
                          borderRadius: colorPickerSwatchSize / 2,
                        },
                        isAiColorSuggestionEnabled ? styles.colorPickerPresetSwatchActive : null,
                        isAiColorSuggestionEnabled ? styles.colorPickerPresetAiSwatchActive : null,
                      ]}
                    >
                      <Wand2 color={isAiColorSuggestionEnabled ? "#0A0A0A" : "#FFFFFF"} size={Math.max(colorPickerSwatchSize * 0.56, 14)} strokeWidth={2.1} />
                    </Pressable>
                    {COLOR_PICKER_PRESET_SWATCHES.map((swatch) => {
                      const isActive = colorPickerDraft.hex === swatch.value;
                      return (
                        <Pressable
                          key={swatch.id}
                          accessibilityRole="button"
                          onPress={() => handlePresetColorPress(swatch.value)}
                          style={[
                            styles.colorPickerPresetSwatch,
                            {
                              width: colorPickerSwatchSize,
                              height: colorPickerSwatchSize,
                              borderRadius: colorPickerSwatchSize / 2,
                              backgroundColor: swatch.value,
                            },
                            isActive ? styles.colorPickerPresetSwatchActive : null,
                          ]}
                        />
                      );
                    })}
                  </View>

                  <View style={[styles.colorPickerSeparator, { width: colorPickerSquareSize, marginTop: scaleSelectionValue(40, selectionLayoutScale) }]} />

                  <Text style={[styles.colorPickerRgbText, { width: colorPickerSquareSize, marginTop: scaleSelectionValue(24, selectionLayoutScale) }]}>
                    {colorPickerDraft.rgbLabel}
                  </Text>
                </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={handleApplyColorPicker}
                    style={[
                      styles.colorPickerApplyButton,
                      {
                        left: scaleSelectionValue(24, selectionLayoutScale),
                        right: scaleSelectionValue(24, selectionLayoutScale),
                        bottom: Math.max(insets.bottom + scaleSelectionValue(24, selectionLayoutScale), scaleSelectionValue(24, selectionLayoutScale)),
                      },
                    ]}
                  >
                    <Text style={styles.colorPickerApplyText}>{t("wizard.paintFlow.apply")}</Text>
                  </Pressable>
                </MotiView>
              </MotiView>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {isSurfacePickerOpen ? (
              <MotiView from={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={styles.colorPickerOverlay}>
              <Pressable accessibilityRole="button" onPress={handleCloseSurfacePicker} style={StyleSheet.absoluteFillObject} />
                <MotiView
                  from={{ opacity: 0.96, translateY: 48, scale: 0.985 }}
                  animate={{ opacity: 1, translateY: 0, scale: 1 }}
                  exit={{ opacity: 0.94, translateY: 36, scale: 0.985 }}
                  transition={LUX_SPRING}
                  style={[
                    styles.surfacePickerSheet,
                    {
                      height: surfacePickerSheetHeight,
                      paddingBottom: Math.max(insets.bottom + scaleSelectionValue(124, selectionLayoutScale), scaleSelectionValue(124, selectionLayoutScale)),
                    },
                  ]}
                >
                <View style={[styles.surfacePickerHandle, { marginTop: scaleSelectionValue(12, selectionLayoutScale) }]} />

                <View style={[styles.selectionModalHeader, { marginTop: scaleSelectionValue(20, selectionLayoutScale), marginHorizontal: scaleSelectionValue(20, selectionLayoutScale) }]}>
                  <Pressable accessibilityRole="button" onPress={handleCloseSurfacePicker} style={styles.selectionModalNavButton}>
                    <ChevronLeft color="#0A0A0A" size={20} strokeWidth={2.2} />
                  </Pressable>

                  <View style={styles.selectionModalTitleWrap}>
                    <Text numberOfLines={1} style={styles.surfacePickerTitle}>
                      {t("wizard.paintFlow.surfacePickerTitle")}
                    </Text>
                  </View>

                  <Pressable accessibilityRole="button" onPress={handleCloseSurfacePicker} style={styles.selectionModalCloseButton}>
                    <X color="#0A0A0A" size={18} strokeWidth={2.2} />
                  </Pressable>
                </View>

                <View style={styles.surfacePickerSheetBody}>
                  <ScrollView
                    bounces={false}
                    contentContainerStyle={[
                      styles.surfacePickerList,
                      {
                        marginTop: scaleSelectionValue(28, selectionLayoutScale),
                        marginHorizontal: scaleSelectionValue(24, selectionLayoutScale),
                        paddingBottom: Math.max(insets.bottom + 124, 124),
                      },
                    ]}
                  >
                    {localizedSurfaceOptions.map((option) => {
                      const active = option.value === surfacePickerDraft;

                      return (
                        <Pressable
                          key={option.value}
                          accessibilityRole="button"
                          onPress={() => handleSelectSurfaceDraft(option.value)}
                          style={[
                            styles.surfacePickerRow,
                            { height: scaleSelectionValue(72, selectionLayoutScale) },
                            active ? styles.surfacePickerRowActive : null,
                          ]}
                        >
                          <View style={styles.surfacePickerRowLeading}>
                            <View style={styles.surfacePickerIconWrap}>
                              <PaintSurfaceIcon surface={option.value} color="#0A0A0A" size={18} />
                            </View>
                            <Text style={[styles.surfacePickerRowText, active ? styles.surfacePickerRowTextActive : null]}>{option.label}</Text>
                          </View>

                          <View style={[styles.surfacePickerCheckCircle, active ? styles.surfacePickerCheckCircleActive : null]}>
                            {active ? <Check color="#FFFFFF" size={14} strokeWidth={2.4} /> : null}
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  <Pressable
                    accessibilityRole="button"
                    onPress={handleApplySurfacePicker}
                    style={[
                      styles.surfacePickerApplyButton,
                      {
                        left: scaleSelectionValue(24, selectionLayoutScale),
                        right: scaleSelectionValue(24, selectionLayoutScale),
                        bottom: Math.max(insets.bottom + scaleSelectionValue(24, selectionLayoutScale), scaleSelectionValue(24, selectionLayoutScale)),
                      },
                    ]}
                  >
                    <Text style={styles.surfacePickerApplyText}>{t("wizard.paintFlow.apply")}</Text>
                  </Pressable>
                </View>
                </MotiView>
              </MotiView>
            ) : null}
          </AnimatePresence>
        </View>
      ) : null}

      {step === "mask" ? (
        <View style={styles.maskScreen}>
          <StatusBar style="dark" />
          <Text style={[styles.maskHeaderTitle, { top: stickyHeaderMetrics.contentOffset - scaleSelectionValue(14, selectionLayoutScale) }]}>{t("wizard.paintFlow.maskTitle")}</Text>

          <View style={[styles.maskCanvasWrap, { marginTop: stickyHeaderMetrics.contentOffset + scaleSelectionValue(30, selectionLayoutScale) }]}>
            <View onLayout={handleCanvasLayout} style={[styles.maskCanvasFrame, { width: maskCanvasWidth, height: maskCanvasHeight }]}>
              {selectedImage ? (
                <>
                  <Image source={{ uri: selectedImage.uri }} style={styles.photoImage} contentFit="contain" transition={160} />

                  <GestureDetector gesture={drawGesture}>
                    <View style={absoluteFill}>
                      <Svg width="100%" height="100%">
                        <Defs>
                          <SvgMask id="paint-mask">
                            <Rect x="0" y="0" width="100%" height="100%" fill="#000000" />
                            {renderedStrokes.map((stroke) => (
                              <SvgPath
                                key={`paint-mask-${stroke.id}`}
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
                        <Rect x="0" y="0" width="100%" height="100%" fill={MASK_COLOR} mask="url(#paint-mask)" />
                      </Svg>
                    </View>
                  </GestureDetector>

                  {activePoint ? (
                    <MotiView
                      pointerEvents="none"
                      animate={{
                        width: brushWidth,
                        height: brushWidth,
                        opacity: 1,
                        scale: [0.96, 1, 0.96],
                      }}
                      transition={{ duration: 140, type: "timing" }}
                      style={[
                        styles.maskCursor,
                        {
                          left: Math.max(12, Math.min(activePoint.x - brushWidth / 2, Math.max(canvasSize.width - brushWidth - 12, 12))),
                          top: Math.max(12, Math.min(activePoint.y - brushWidth / 2, Math.max(canvasSize.height - brushWidth - 12, 12))),
                          borderColor: activeMaskTool === "eraser" ? "rgba(10,10,10,0.86)" : "rgba(255,255,255,0.82)",
                          backgroundColor: activeMaskTool === "eraser" ? "rgba(255,255,255,0.2)" : MASK_COLOR,
                        },
                      ]}
                    />
                  ) : null}

                  {selectedImage && loupeMetrics ? (
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
                          <Defs>
                            <SvgMask id="paint-loupe-mask">
                              <Rect x="0" y="0" width={loupeMetrics.size} height={loupeMetrics.size} fill="#000000" />
                              <G transform={`translate(${loupeMetrics.translateX} ${loupeMetrics.translateY}) scale(${loupeMetrics.zoom})`}>
                                {renderedStrokes.map((stroke) => (
                                  <SvgPath
                                    key={`loupe-mask-${stroke.id}`}
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
                          <Rect x="0" y="0" width={loupeMetrics.size} height={loupeMetrics.size} fill={MASK_COLOR} mask="url(#paint-loupe-mask)" />
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
            <View style={styles.maskToolGroup}>
              <Pressable
                accessibilityRole="button"
                onPress={() => handleSelectMaskTool("brush")}
                style={[styles.maskToolButton, maskTool === "brush" ? styles.maskToolButtonActive : null]}
              >
                <BrushCleaning color={maskTool === "brush" ? "#FFFFFF" : "#0A0A0A"} size={20} strokeWidth={2} />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() => handleSelectMaskTool("eraser")}
                style={[styles.maskToolButton, maskTool === "eraser" ? styles.maskToolButtonActive : null]}
              >
                <Eraser color={maskTool === "eraser" ? "#FFFFFF" : "#0A0A0A"} size={20} strokeWidth={2} />
              </Pressable>

            </View>

            <View style={styles.maskToolGroup}>
              <Pressable
                accessibilityRole="button"
                disabled={!paintStrokes.length}
                onPress={undoLastStroke}
                style={[styles.maskToolButton, styles.maskHistoryButton, !paintStrokes.length ? styles.maskToolButtonDisabled : null]}
              >
                <Undo2 color={!paintStrokes.length ? "#B8B8B8" : "#0A0A0A"} size={20} strokeWidth={2} />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                disabled={!canRedo}
                onPress={redoLastStroke}
                style={[styles.maskToolButton, styles.maskHistoryButton, !canRedo ? styles.maskToolButtonDisabled : null]}
              >
                <Redo2 color={!canRedo ? "#B8B8B8" : "#0A0A0A"} size={20} strokeWidth={2} />
              </Pressable>
            </View>
          </View>

          <View style={styles.maskSliderSection}>
            <View style={styles.maskSliderHeader}>
              <Text style={styles.maskSliderLabel}>{maskWidthLabel}</Text>
              <View style={styles.maskSliderValueWrap}>
                <View
                  style={[
                    styles.maskSliderPreview,
                    {
                      width: Math.max(brushWidth, 14),
                      height: Math.max(brushWidth, 14),
                      backgroundColor: activeMaskTool === "eraser" ? "rgba(255,255,255,0.28)" : MASK_COLOR,
                      borderColor: activeMaskTool === "eraser" ? "rgba(10,10,10,0.82)" : "rgba(255,255,255,0.78)",
                    },
                  ]}
                />
                <Text style={styles.maskSliderValue}>{brushWidth}px</Text>
              </View>
            </View>

            <GestureDetector gesture={sliderGesture}>
              <View onLayout={(event) => setSliderWidth(event.nativeEvent.layout.width)} style={styles.maskSliderWrap}>
                <View style={styles.maskSliderTrack} />
                <LinearGradient colors={[MASK_ACCENT, MASK_ACCENT]} style={[styles.maskSliderFill, { width: Math.max(16, sliderWidth * brushProgress) }]} />
                <MotiView
                  animate={{ left: Math.max(0, sliderWidth * brushProgress - 16) }}
                  transition={{ duration: 120, type: "timing" }}
                  style={styles.maskSliderThumb}
                >
                  <View style={styles.maskSliderThumbDot} />
                </MotiView>
              </View>
            </GestureDetector>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={!canContinueFromMask}
            onPress={() => {
              if (!canContinueFromMask) {
                return;
              }

                runDeferredContinue("mask", () => {
                  triggerHaptic();
                  setStep("colors");
                });
              }}
            style={[
              styles.maskContinueButton,
              {
                bottom: Math.max(insets.bottom + 44, 44),
                backgroundColor: canContinueFromMask ? DIAMOND_PILL_BLUE : "#E8E8E8",
              },
            ]}
          >
             {loadingContinueStep === "mask" ? (
               <ActivityIndicator color="#FFFFFF" />
             ) : (
               <Text style={[styles.maskContinueText, { color: canContinueFromMask ? "#FFFFFF" : "#A0A0A0" }]}>{t("common.actions.continue")}</Text>
             )}
           </Pressable>
        </View>
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
            paddingBottom: Math.max(insets.bottom + 28, 34),
            gap: spacing.md,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.resultIntro}>
            <Text style={styles.resultHeading}>{t("legacyUnlocalized.paintWizard.result.heading")}</Text>
            <Text style={styles.resultSubheading}>
              {t("legacyUnlocalized.paintWizard.result.subheading")}
            </Text>
          </View>

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
            <Text style={styles.summaryTitle}>{`${selectedColorTitle} · ${DEFAULT_FINISH_LABEL}`}</Text>
            <Text style={styles.summaryText}>
              {`Your ${selectedSurface.toLowerCase()} surface was recolored from the mask you painted while preserving the structure, furnishings, trim, and natural light of the room.`}
            </Text>
          </View>

            <View style={styles.resultActions}>
              <LuxPressable onPress={handleSaveResult} className={pointerClassName} style={{ width: "100%" }} scale={0.99}>
                <View style={[styles.resultActionButton, styles.resultActionSave]}>
                  <Text style={styles.resultActionSaveText}>{t("legacyUnlocalized.paintWizard.result.saveToGallery")}</Text>
                </View>
              </LuxPressable>

              <LuxPressable onPress={handleShareResult} className={pointerClassName} style={{ width: "100%" }} scale={0.99}>
                <View style={[styles.resultActionButton, styles.resultActionShare]}>
                  <Text style={styles.resultActionShareText}>{t("legacyUnlocalized.paintWizard.result.share")}</Text>
                </View>
              </LuxPressable>

              <LuxPressable onPress={resetProject} className={pointerClassName} style={{ width: "100%" }} scale={0.99}>
                <View style={[styles.resultActionButton, styles.resultActionRetry]}>
                  <Text style={styles.resultActionRetryText}>{t("legacyUnlocalized.paintWizard.result.tryAgain")}</Text>
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
  captureImage: {
    width: "100%",
    height: "100%",
  },
  selectionStepScreen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  selectionHeaderButton: {
    position: "absolute",
    zIndex: 4,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  selectionHeaderTitle: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 4,
    color: "#0A0A0A",
    fontSize: 20,
    lineHeight: 24,
    textAlign: "center",
    ...fonts.bold,
  },
  selectionStepContent: {
    flex: 1,
    alignItems: "center",
  },
  selectionPreviewFrame: {
    borderRadius: 32,
    overflow: "hidden",
    backgroundColor: "#F4F4F5",
    borderWidth: 1,
    borderColor: "#ECECEC",
  },
  selectionCardsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "center",
  },
  selectionChoiceCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#ECECEC",
    backgroundColor: "#F8F8F8",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  selectionChoiceCardActive: {
    borderWidth: 2,
    borderColor: "#2563EB",
    shadowColor: "#2563EB",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    boxShadow: "0px 0px 0px 1px rgba(37,99,235,0.14), 0px 12px 28px rgba(37,99,235,0.2)",
  },
  selectionCardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#ECECEC",
  },
  selectionCardLabel: {
    marginTop: -34,
    marginLeft: 56,
    color: "#0A0A0A",
    fontSize: 16,
    lineHeight: 20,
    ...fonts.semibold,
  },
  selectionCardLabelActive: {
    color: "#2563EB",
    ...fonts.bold,
  },
  selectionSurfaceCardLabel: {
    marginTop: -38,
    marginLeft: 50,
  },
  selectionColorButton: {
    marginTop: 24,
    width: 164,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E2E2",
  },
  selectionColorButtonText: {
    fontSize: 15,
    lineHeight: 18,
    ...fonts.semibold,
  },
  selectionSurfaceButton: {
    marginTop: 24,
    width: 164,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#111111",
    backgroundColor: "#FFFFFF",
  },
  selectionSurfaceButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  selectionSurfaceButtonConfirmed: {
    backgroundColor: "#0A0A0A",
    borderColor: "#0A0A0A",
  },
  selectionSurfaceButtonText: {
    color: "#0A0A0A",
    fontSize: 15,
    lineHeight: 18,
    ...fonts.semibold,
  },
  selectionSurfaceButtonTextConfirmed: {
    color: "#FFFFFF",
  },
  selectionFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 20,
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  selectionContinueButton: {
    width: "100%",
    alignSelf: "center",
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  selectionContinueButtonActive: {
    backgroundColor: DIAMOND_PILL_BLUE,
  },
  selectionContinueButtonDisabled: {
    backgroundColor: "#E8E8E8",
  },
  selectionContinueButtonText: {
    fontSize: 16,
    lineHeight: 20,
    ...fonts.semibold,
  },
  selectionContinueButtonTextActive: {
    color: "#FFFFFF",
  },
  selectionContinueButtonTextDisabled: {
    color: "#A0A0A0",
  },
  colorPickerOverlay: {
    ...absoluteFill,
    zIndex: 14,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.64)",
  },
  colorPickerSheet: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
    boxShadow: "0px -18px 48px rgba(15,23,42,0.22)",
  },
  colorPickerTitle: {
    color: "#0A0A0A",
    fontSize: 24,
    lineHeight: 30,
    ...fonts.bold,
    textAlign: "center",
    flexShrink: 1,
    width: "100%",
  },
  colorPickerSquare: {
    overflow: "hidden",
    borderRadius: 24,
    backgroundColor: "#FF69B4",
  },
  colorPickerHandle: {
    position: "absolute",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    backgroundColor: "transparent",
    shadowColor: "#000000",
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  colorPickerHueSlider: {
    overflow: "hidden",
    borderRadius: 16,
  },
  colorPickerHueHandle: {
    position: "absolute",
    top: -1,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    backgroundColor: "#0A0A0A",
    shadowColor: "#000000",
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  colorPickerPresetRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
  },
  colorPickerPresetSwatch: {
    borderWidth: 1,
    borderColor: "rgba(10,10,10,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  colorPickerPresetAiSwatch: {
    backgroundColor: "#111113",
  },
  colorPickerPresetAiSwatchActive: {
    backgroundColor: "#F4E6B8",
    borderColor: "#0A0A0A",
  },
  colorPickerPresetSwatchActive: {
    borderWidth: 3,
    borderColor: "#0A0A0A",
  },
  colorPickerSeparator: {
    height: 1,
    backgroundColor: "#E5E5E5",
  },
  colorPickerRgbText: {
    color: "#0A0A0A",
    fontSize: 18,
    lineHeight: 22,
    ...fonts.semibold,
  },
  colorPickerApplyButton: {
    position: "absolute",
    height: 56,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    ...getWizardFloatingButtonStyle(true),
  },
  colorPickerApplyText: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 20,
    ...fonts.semibold,
  },
  surfacePickerSheet: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: "hidden",
    boxShadow: "0px -18px 48px rgba(15,23,42,0.22)",
  },
  surfacePickerHandle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#D4D4D8",
  },
  surfacePickerCloseButton: {
    position: "absolute",
    zIndex: 2,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  surfacePickerTitle: {
    color: "#0A0A0A",
    fontSize: 24,
    lineHeight: 30,
    ...fonts.bold,
  },
  surfacePickerSheetBody: {
    flex: 1,
    justifyContent: "space-between",
  },
  surfacePickerList: {
    gap: 12,
  },
  surfacePickerRow: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: "#ECECEC",
      backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  surfacePickerRowActive: {
      borderWidth: 2,
      borderColor: "#2563EB",
      backgroundColor: "#FFFFFF",
      shadowColor: "#2563EB",
      shadowOpacity: 0.2,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
      boxShadow: "0px 0px 0px 1px rgba(37,99,235,0.14), 0px 12px 28px rgba(37,99,235,0.2)",
    },
  surfacePickerRowLeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  surfacePickerIconWrap: {
    marginLeft: 0,
    width: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  surfacePickerRowText: {
    color: "#0A0A0A",
    fontSize: 16,
    lineHeight: 20,
    ...fonts.semibold,
  },
  surfacePickerRowTextActive: {
      color: "#2563EB",
      ...fonts.bold,
    },
  surfacePickerCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#D4D4D8",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  surfacePickerCheckCircleActive: {
        borderColor: "#2563EB",
        backgroundColor: "#2563EB",
    },
  surfacePickerApplyButton: {
    position: "absolute",
    height: 56,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    ...getWizardFloatingButtonStyle(true),
  },
  surfacePickerApplyText: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 20,
    ...fonts.semibold,
  },
  selectionModalOverlay: {
    ...absoluteFill,
    zIndex: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.52)",
    paddingHorizontal: 24,
  },
  selectionModalCard: {
    width: "100%",
    maxWidth: 396,
    maxHeight: "78%",
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 16,
  },
  selectionSurfaceModalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    gap: 16,
  },
  selectionModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  selectionModalNavButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  selectionModalTitleWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  selectionModalCopy: {
    flex: 1,
    gap: 6,
  },
  selectionModalTitle: {
    color: "#0A0A0A",
    fontSize: 22,
    lineHeight: 26,
    ...fonts.bold,
  },
  selectionModalText: {
    color: "#666666",
    fontSize: 13,
    lineHeight: 19,
    ...fonts.regular,
  },
  selectionModalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  selectionModalScroll: {
    width: "100%",
  },
  selectionModalGrid: {
    gap: 12,
    paddingBottom: 4,
  },
  selectionSwatchCard: {
    width: "100%",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#ECECEC",
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  selectionSwatchCardActive: {
      borderColor: DIAMOND_PILL_BLUE,
    backgroundColor: "#EEF4FF",
  },
  selectionSwatchDot: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(10,10,10,0.08)",
  },
  selectionSwatchCopy: {
    flex: 1,
    gap: 2,
  },
  selectionSwatchTitle: {
    color: "#0A0A0A",
    fontSize: 15,
    lineHeight: 18,
    ...fonts.semibold,
  },
  selectionSwatchText: {
    color: "#666666",
    fontSize: 12,
    lineHeight: 17,
    ...fonts.regular,
  },
  selectionSurfaceList: {
    gap: 10,
  },
  selectionSurfaceRow: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ECECEC",
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectionSurfaceRowActive: {
      borderColor: DIAMOND_PILL_BLUE,
    backgroundColor: "#EEF4FF",
  },
  selectionSurfaceRowText: {
    color: "#0A0A0A",
    fontSize: 15,
    lineHeight: 18,
    ...fonts.semibold,
  },
  selectionSurfaceRowTextActive: {
    color: "#0A0A0A",
  },
  topBar: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  topButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: SERVICE_WIZARD_THEME.colors.border,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  topCopy: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
  },
  topTitle: {
    color: "#ffffff",
    fontSize: 19,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  topSubtitle: {
    color: "#a1a1aa",
    fontSize: 12,
    fontFamily: fonts.regular.fontFamily,
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
    gap: spacing.xs,
    marginTop: spacing.xs,
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
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
  },
  stepPillTextActive: {
    color: "#ffffff",
  },
  creditPill: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: spacing.sm,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: SERVICE_WIZARD_THEME.colors.border,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  creditText: {
    color: "#ffffff",
    fontSize: 12,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
  },
  heroCard: {
    borderRadius: 34,
    borderWidth: 1,
    borderColor: SERVICE_WIZARD_THEME.colors.border,
    backgroundColor: CARD_BLACK,
    padding: spacing.lg,
    gap: spacing.md,
  },
  heroTitle: {
    color: SERVICE_WIZARD_THEME.colors.textPrimary,
    ...SERVICE_WIZARD_THEME.typography.heroTitle,
  },
  heroText: {
    color: SERVICE_WIZARD_THEME.colors.textMuted,
    ...SERVICE_WIZARD_THEME.typography.bodyText,
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
    borderColor: SERVICE_WIZARD_THEME.colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
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
    gap: spacing.sm,
  },
  uploadTitle: {
    color: "#ffffff",
    fontSize: 19,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
  },
  uploadText: {
    color: "#a1a1aa",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "left",
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
    gap: spacing.sm,
  },
  secondaryText: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
  },
  notesCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: SERVICE_WIZARD_THEME.colors.border,
    backgroundColor: CARD_BLACK_SOFT,
    padding: spacing.md,
    gap: spacing.sm,
  },
  notesTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
  },
  notesText: {
    color: "#a1a1aa",
    fontSize: 14,
    lineHeight: 22,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  stepTitle: {
    color: SERVICE_WIZARD_THEME.colors.textPrimary,
    ...SERVICE_WIZARD_THEME.typography.sectionTitle,
  },
  stepText: {
    color: SERVICE_WIZARD_THEME.colors.textMuted,
    ...SERVICE_WIZARD_THEME.typography.compactBodyText,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  maskScreen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  maskBackButton: {
    position: "absolute",
    left: 24,
    zIndex: 4,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  maskHeaderTitle: {
    position: "absolute",
    left: 72,
    right: 144,
    zIndex: 4,
    color: "#0A0A0A",
    fontSize: 20,
    lineHeight: 24,
    ...fonts.bold,
  },
  maskCloseButton: {
    position: "absolute",
    right: 40,
    zIndex: 4,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  maskCanvasWrap: {
    alignItems: "center",
  },
  maskCanvasFrame: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#050505",
  },
  maskCursor: {
    position: "absolute",
    borderRadius: 14,
    borderWidth: 1.5,
  },
  maskToolBar: {
    marginTop: 40,
    minHeight: 56,
    marginHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  maskToolGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  maskToolButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E3E3E3",
    backgroundColor: "#FFFFFF",
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
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  maskSliderSection: {
    marginTop: 36,
    marginHorizontal: 24,
    gap: 16,
  },
  maskSliderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    borderRadius: 14,
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
    backgroundColor: MASK_ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  maskSliderThumbDot: {
    width: 12,
    height: 12,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
  },
  maskContinueButton: {
    position: "absolute",
    left: 24,
    right: 24,
    alignSelf: "center",
    height: 60,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  maskContinueText: {
    fontSize: 16,
    lineHeight: 20,
    ...fonts.semibold,
  },
  canvasFrame: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#020203",
    overflow: "hidden",
    zIndex: 0,
  },
  canvasToolbar: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    flexDirection: "row",
    gap: spacing.sm,
  },
  canvasToolbarButton: {
    minHeight: 40,
    flex: 1,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(10,10,12,0.82)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  canvasToolbarText: {
    color: "#ffffff",
    fontSize: 11,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
    flexShrink: 1,
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  loupe: {
    position: "absolute",
    width: 116,
    height: 116,
    borderRadius: 14,
    padding: spacing.xs,
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
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#060607",
  },
  hintPill: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.62)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  hintText: {
    color: "#ffffff",
    fontSize: 12,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "600",
    textAlign: "left",
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
    borderRadius: 14,
    backgroundColor: "rgba(204,51,51,0.18)",
  },
  detectCopy: {
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  detectTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
    textAlign: "left",
  },
  detectText: {
    color: "#d4d4d8",
    fontSize: 13,
    lineHeight: 21,
    textAlign: "left",
    maxWidth: 280,
  },
  maskControlCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: CARD_BLACK_SOFT,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  brushRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brushTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
  },
  brushMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  brushMetaText: {
    color: "#d4d4d8",
    fontSize: 12,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
  },
  sliderWrap: {
    height: 32,
    justifyContent: "center",
  },
  sliderTrack: {
    height: 5,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  sliderFill: {
    position: "absolute",
    left: 0,
    height: 5,
    borderRadius: 14,
  },
  sliderThumb: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: MASK_ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  sliderThumbDot: {
    width: 12,
    height: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonLarge: {
    minHeight: 58,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  disabledButtonLarge: {
    minHeight: 58,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SERVICE_WIZARD_THEME.colors.disabledSurface,
    opacity: 0.5,
  },
  primaryText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "800",
    letterSpacing: -0.2,
    textAlign: "left",
  },
  disabledButtonText: {
    color: "#9ca3af",
    fontSize: 16,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "800",
    letterSpacing: -0.2,
    textAlign: "left",
  },
  roomReferenceFrame: {
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#020203",
    overflow: "hidden",
  },
  roomReferenceBadge: {
    position: "absolute",
    left: 12,
    top: 12,
    minHeight: 28,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
  },
  roomReferenceBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  selectionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  selectionCard: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: CARD_BLACK_SOFT,
  },
  selectionCardActive: {
    borderColor: SERVICE_WIZARD_THEME.colors.accent,
    backgroundColor: SERVICE_WIZARD_THEME.colors.accentSurface,
  },
  selectionPreview: {
    aspectRatio: 1,
    backgroundColor: "#101012",
  },
  selectionSample: {
    flex: 1,
  },
  selectionOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
  },
  selectionCopy: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
  },
  selectionTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "800",
  },
  selectionDescription: {
    color: "#d4d4d8",
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  selectionDescriptionActive: {
    color: SERVICE_WIZARD_THEME.colors.accentText,
  },
  selectionColorActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  selectionColorButtonFlexible: {
    flex: 1,
  },
  aiSuggestionButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "#111113",
    alignItems: "center",
    justifyContent: "center",
  },
  aiSuggestionButtonActive: {
    borderColor: "#F4E6B8",
    backgroundColor: "#F4E6B8",
  },
  paletteCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: CARD_BLACK_SOFT,
    padding: spacing.md,
    gap: spacing.md,
  },
  paletteTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
  },
  swatchGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  swatchButton: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  swatchOuter: {
    width: 84,
    height: 84,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  swatchOuterActive: {
      borderWidth: 2,
      borderColor: "#2563EB",
      backgroundColor: CARD_BLACK_SOFT,
      shadowColor: "#2563EB",
      shadowOpacity: 0.2,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
    },
  swatchInner: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.82)",
  },
  swatchLabel: {
    color: "#d4d4d8",
    fontSize: 13,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "600",
    textAlign: "left",
  },
  swatchLabelActive: {
      color: "#2563EB",
      ...fonts.bold,
    },
  finishSummaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  summaryCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: CARD_BLACK_SOFT,
    padding: spacing.md,
    gap: spacing.sm,
  },
  summarySwatch: {
    width: 54,
    height: 54,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.7)",
  },
  finishSelectionThumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },
  summaryCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  summaryLabel: {
    color: "#a1a1aa",
    fontSize: 12,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  summaryTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontFamily: fonts.regular.fontFamily,
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: CARD_BLACK_SOFT,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  finishCardActive: {
      borderWidth: 2,
      borderColor: "#2563EB",
      backgroundColor: CARD_BLACK_SOFT,
      shadowColor: "#2563EB",
      shadowOpacity: 0.2,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
      boxShadow: "0px 0px 0px 1px rgba(37,99,235,0.14), 0px 12px 28px rgba(37,99,235,0.2)",
    },
  finishPreviewBase: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#1A1138",
  },
  finishPreviewMatte: {
    backgroundColor: "#7C5BE7",
  },
  finishPreviewSatinGlow: {
    position: "absolute",
    top: 7,
    left: 8,
    right: 8,
    height: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  finishPreviewGlossyHighlight: {
    position: "absolute",
    top: 4,
    left: 5,
    width: 24,
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.72)",
    transform: [{ rotate: "-18deg" }],
  },
  finishPreviewGlossyReflection: {
    position: "absolute",
    right: -2,
    bottom: 2,
    width: 26,
    height: 18,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    transform: [{ rotate: "-24deg" }],
  },
  finishCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  finishTitle: {
      color: "#ffffff",
      fontSize: 18,
      fontFamily: fonts.regular.fontFamily,
      fontWeight: "600",
    },
  finishTitleActive: {
      color: "#2563EB",
      fontWeight: "700",
    },
  finishText: {
    color: "#a1a1aa",
    fontSize: 13,
    lineHeight: 21,
  },
  finishCheck: {
    width: 32,
    height: 32,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: MASK_ACCENT,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  finishCheckActive: {
    borderColor: MASK_ACCENT,
    backgroundColor: MASK_ACCENT,
  },
  finishList: {
    gap: spacing.sm,
  },
  processingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
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
    borderRadius: 12,
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
    borderRadius: 12,
    backgroundColor: "rgba(204,51,51,0.12)",
    borderWidth: 1,
    borderColor: "rgba(217,70,239,0.24)",
  },
  processingChip: {
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.58)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  processingChipSwatch: {
    width: 16,
    height: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
  },
  processingChipText: {
    color: "#ffffff",
    fontSize: 12,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
  },
  processingCopy: {
    alignItems: "center",
    gap: spacing.sm,
  },
  processingTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "800",
    letterSpacing: -0.7,
    textAlign: "left",
    maxWidth: 340,
  },
  processingText: {
    color: "#a1a1aa",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "left",
    maxWidth: 320,
  },
  resultIntro: {
    alignItems: "center",
    gap: spacing.sm,
  },
  resultHeading: {
    color: "#ffffff",
    fontSize: 28,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "800",
    letterSpacing: -0.8,
    textAlign: "left",
  },
  resultSubheading: {
    color: "#b4b4bb",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "left",
    maxWidth: 360,
  },
  resultFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  resultRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  resultActions: {
    gap: 12,
  },
  resultActionButton: {
    marginHorizontal: 20,
    height: 56,
    borderRadius: 16,
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
  secondaryAction: {
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryActionText: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
  },
  restartButton: {
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.03)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  restartText: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: fonts.regular.fontFamily,
    fontWeight: "700",
  },
});

