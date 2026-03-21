import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AnimatePresence, MotiView } from "moti";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  ArrowLeft,
  Camera,
  Download,
  Image as ImageIcon,
  Info,
  Paintbrush,
  Plus,
  RefreshCcw,
  Share2,
  Sparkles,
  SwatchBook,
  Trash2,
  X,
} from "lucide-react-native";
import { LuxPressable } from "../components/lux-pressable";
import { LUX_SPRING } from "../lib/motion";

const EXAMPLE_PHOTOS = [
  {
    id: "modern-living-room",
    title: "Modern Living Room",
    uri: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "raw-penthouse",
    title: "Raw Penthouse",
    uri: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "backyard",
    title: "Backyard",
    uri: "https://images.unsplash.com/photo-1502005097973-6a7082348e28?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "old-facade",
    title: "Old Facade",
    uri: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=80",
  },
] as const;

const ROOM_OPTIONS = {
  interior: ["Living Room", "Bedroom", "Kitchen", "Bathroom", "Home Office", "Dining Room"],
  exterior: ["House", "Apartment", "Office Building", "Villa", "Retail"],
  garden: ["Backyard", "Front Yard", "Patio", "Balcony"],
} as const;

const STYLE_OPTIONS = [
  "Japandi",
  "Modern",
  "Industrial",
  "Luxury",
  "Minimalist",
  "Scandinavian",
  "Art Deco",
  "Tropical",
  "Midcentury",
  "Bohemian",
  "Farmhouse",
  "Japanese",
  "Biophilic",
  "Retro",
  "Glam",
  "Rustic",
  "Mediterranean",
  "Cyberpunk",
  "Contemporary",
  "Coastal",
  "Zen",
  "Classic",
  "Eclectic",
  "Wabi-Sabi",
];

const PALETTE_OPTIONS = [
  { id: "surprise", label: "Surprise Me", colors: ["#f8fafc", "#0f172a", "#22d3ee", "#f472b6"] },
  { id: "gray", label: "Millennial Gray", colors: ["#e5e7eb", "#cbd5f5", "#9ca3af", "#6b7280"] },
  { id: "sunset", label: "Neon Sunset", colors: ["#fb7185", "#f59e0b", "#f97316", "#a855f7"] },
  { id: "emerald", label: "Emerald Gem", colors: ["#34d399", "#10b981", "#059669", "#065f46"] },
  { id: "oasis", label: "Coastal Fog", colors: ["#bae6fd", "#38bdf8", "#0ea5e9", "#0284c7"] },
  { id: "luxe", label: "Midnight Luxe", colors: ["#0f172a", "#111827", "#1f2937", "#22d3ee"] },
  { id: "sage", label: "Sage Calm", colors: ["#a7f3d0", "#6ee7b7", "#34d399", "#0f766e"] },
  { id: "sand", label: "Warm Sand", colors: ["#fde68a", "#fbbf24", "#f59e0b", "#f97316"] },
  { id: "mono", label: "Monochrome", colors: ["#f4f4f5", "#d4d4d8", "#52525b", "#18181b"] },
];

const PAINT_SWATCHES = ["#f5f5f4", "#e2e8f0", "#c7d2fe", "#a7f3d0", "#fbcfe8", "#fde68a"];
const FLOOR_TEXTURES = ["Warm Oak", "Dark Walnut", "Polished Marble", "Concrete", "Terrazzo", "Herringbone"];

const SERVICE_LABELS: Record<string, string> = {
  interior: "Interior Redesign",
  exterior: "Exterior Redesign",
  garden: "Garden Redesign",
  floor: "Floor Restyle",
  paint: "Wall Paint",
  reference: "Reference Match",
};

const mockResult = require("../assets/media/after-luxury.jpg");

export default function WizardScreen() {
  const router = useRouter();
  const { service } = useLocalSearchParams<{ service?: string }>();
  const { height } = useWindowDimensions();

  const [workflowStep, setWorkflowStep] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedPalette, setSelectedPalette] = useState<string | null>(null);
  const [compareBefore, setCompareBefore] = useState(false);
  const [editorPanel, setEditorPanel] = useState<"none" | "paint" | "floor">("none");
  const [selectedPaint, setSelectedPaint] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [isSourceSheetVisible, setIsSourceSheetVisible] = useState(false);
  const [isUploadingPreview, setIsUploadingPreview] = useState(false);

  const serviceKey = String(service ?? "interior").toLowerCase();
  const serviceType = useMemo(() => {
    if (serviceKey.includes("facade") || serviceKey.includes("exterior")) return "exterior";
    if (serviceKey.includes("garden")) return "garden";
    if (serviceKey.includes("floor")) return "floor";
    if (serviceKey.includes("paint")) return "paint";
    if (serviceKey.includes("reference")) return "reference";
    return "interior";
  }, [serviceKey]);

  const heading = serviceType === "exterior" ? "Choose Building Type" : serviceType === "garden" ? "Choose Outdoor Space" : "Choose Room Type";

  const buildingOptions = useMemo(() => {
    if (serviceType === "exterior") return ROOM_OPTIONS.exterior;
    if (serviceType === "garden") return ROOM_OPTIONS.garden;
    return ROOM_OPTIONS.interior;
  }, [serviceType]);

  useEffect(() => {
    if (workflowStep === 4) {
      const timer = setTimeout(() => setWorkflowStep(5), 3800);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [workflowStep]);

  useEffect(() => {
    if (!selectedImage || !isUploadingPreview) {
      return undefined;
    }
    const timer = setTimeout(() => setIsUploadingPreview(false), 950);
    return () => clearTimeout(timer);
  }, [isUploadingPreview, selectedImage]);

  const closeSourceSheet = () => setIsSourceSheetVisible(false);
  const openSourceSheet = () => setIsSourceSheetVisible(true);

  const showPermissionAlert = (resource: "camera" | "photo library") => {
    Alert.alert(
      `Allow ${resource}`,
      `Darkor.ai needs ${resource} access so we can import your space and start the redesign.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Open Settings", onPress: () => void Linking.openSettings() },
      ],
    );
  };

  const applyPickedUri = (uri?: string | null) => {
    if (!uri) return;
    setIsUploadingPreview(true);
    setSelectedImage(uri);
  };

  const resetFlow = () => {
    setWorkflowStep(0);
    setSelectedImage(null);
    setSelectedRoom(null);
    setSelectedStyle(null);
    setSelectedPalette(null);
    setCompareBefore(false);
    setEditorPanel("none");
    setSelectedPaint(null);
    setSelectedFloor(null);
    closeSourceSheet();
  };

  const pickImage = async (useCamera: boolean) => {
    closeSourceSheet();

    if (useCamera) {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showPermissionAlert("camera");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.9,
      });

      if (!result.canceled) {
        applyPickedUri(result.assets[0]?.uri);
      }
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showPermissionAlert("photo library");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.9,
    });

    if (!result.canceled) {
      applyPickedUri(result.assets[0]?.uri);
    }
  };

  const handlePickPhoto = () => {
    openSourceSheet();
  };

  const handleSelectExample = (uri: string) => {
    closeSourceSheet();
    applyPickedUri(uri);
  };

  const handleClearSelectedImage = () => {
    setIsUploadingPreview(false);
    setSelectedImage(null);
  };

  const canContinue = () => {
    if (workflowStep === 0) return Boolean(selectedImage);
    if (workflowStep === 1) return Boolean(selectedRoom);
    if (workflowStep === 2) return Boolean(selectedStyle);
    if (workflowStep === 3) return Boolean(selectedPalette);
    return false;
  };

  const handleContinue = () => {
    if (!canContinue()) {
      Alert.alert("Complete this step", "Please make a selection to continue.");
      return;
    }

    if (workflowStep === 3) {
      setWorkflowStep(4);
      return;
    }

    setWorkflowStep((prev) => Math.min(prev + 1, 5));
  };

  const handleBack = () => {
    if (workflowStep === 0) {
      if (isSourceSheetVisible) {
        closeSourceSheet();
        return;
      }
      router.back();
      return;
    }
    if (workflowStep === 4) {
      return;
    }
    setWorkflowStep((prev) => Math.max(prev - 1, 0));
  };

  const handleDownload = () => {
    Alert.alert("Download", "Saved to your gallery (mock)." );
  };

  const handleShare = async () => {
    await Share.share({ message: "Darkor.ai redesign ready." });
  };

  const handleDelete = () => {
    Alert.alert("Delete", "This removes the render from your workspace (mock)." );
  };

  const handleApplyPaint = () => {
    if (!selectedPaint) {
      Alert.alert("Select a color", "Choose a paint swatch to apply.");
      return;
    }
    setEditorPanel("none");
  };

  const handleApplyFloor = () => {
    if (!selectedFloor) {
      Alert.alert("Select a floor", "Choose a flooring texture to apply.");
      return;
    }
    setEditorPanel("none");
  };

  const label = SERVICE_LABELS[serviceType] ?? "Redesign";
  const previewImage = compareBefore && selectedImage ? { uri: selectedImage } : mockResult;
  const isStepOneReady = Boolean(selectedImage);

  if (workflowStep === 0) {
    return (
      <View style={styles.stepOneScreen}>
        <ScrollView
          style={styles.stepOneScroll}
          contentContainerStyle={styles.stepOneContent}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stepOneHeaderRow}>
            <Text style={styles.stepCounter}>Step 1 / 4</Text>
            <LuxPressable onPress={() => router.back()} style={[styles.pointer, styles.stepCloseButton]}>
              <X color="#111111" size={24} strokeWidth={2.2} />
            </LuxPressable>
          </View>

          <View style={styles.progressTrackRow}>
            {[0, 1, 2, 3].map((index) => (
              <View key={index} style={[styles.progressTrack, index === 0 ? styles.progressTrackActive : null]} />
            ))}
          </View>

          <Text style={styles.stepOneTitle}>Add a Photo</Text>

          <MotiView
            from={{ opacity: 0, translateY: 18 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={LUX_SPRING}
            style={styles.stepOneCardWrap}
          >
            {selectedImage ? (
              <View style={styles.selectedImageCard}>
                <Image source={{ uri: selectedImage }} style={styles.selectedImage} contentFit="cover" transition={220} />
                <LuxPressable onPress={handleClearSelectedImage} style={[styles.pointer, styles.selectedImageClose]}>
                  <X color="#ffffff" size={18} strokeWidth={2.4} />
                </LuxPressable>
                {isUploadingPreview ? (
                  <MotiView
                    animate={{ opacity: [0.5, 0.9, 0.5] }}
                    transition={{ duration: 1100, loop: true }}
                    style={styles.uploadingOverlay}
                  >
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={styles.uploadingText}>Uploading...</Text>
                  </MotiView>
                ) : null}
              </View>
            ) : (
              <LuxPressable onPress={handlePickPhoto} style={[styles.pointer, styles.emptyUploadCard]}>
                <View style={styles.plusButton}>
                  <Plus color="#ffffff" size={34} strokeWidth={2.3} />
                </View>
                <Text style={styles.emptyUploadTitle}>Start Redesigning{"\n"}Redesign and beautify your room</Text>
              </LuxPressable>
            )}
          </MotiView>

          <View style={styles.exampleSection}>
            <Text style={styles.exampleHeading}>Example Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.exampleRow}>
              {EXAMPLE_PHOTOS.map((photo) => (
                <LuxPressable
                  key={photo.id}
                  onPress={() => handleSelectExample(photo.uri)}
                  style={[
                    styles.pointer,
                    styles.exampleThumbCard,
                    selectedImage === photo.uri ? styles.exampleThumbCardActive : null,
                  ]}
                >
                  <Image source={{ uri: photo.uri }} style={styles.exampleThumbImage} contentFit="cover" transition={180} />
                </LuxPressable>
              ))}
            </ScrollView>
          </View>
        </ScrollView>

        <View style={styles.stepOneFooter}>
          <LuxPressable onPress={() => isStepOneReady && setWorkflowStep(1)} disabled={!isStepOneReady} style={styles.pointer}>
            {isStepOneReady ? (
              <LinearGradient
                colors={["#ff3b30", "#d946ef"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.stepOneContinueActive}
              >
                <Text style={styles.stepOneContinueText}>Continue</Text>
              </LinearGradient>
            ) : (
              <View style={styles.stepOneContinueDisabled}>
                <Text style={styles.stepOneContinueDisabledText}>Continue</Text>
              </View>
            )}
          </LuxPressable>
        </View>

        <AnimatePresence>
          {isSourceSheetVisible ? (
            <MotiView key="step-one-source-sheet" from={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={styles.sheetRoot}>
              <Pressable onPress={closeSourceSheet} style={styles.sheetBackdrop} />
              <MotiView
                from={{ translateY: 48, opacity: 0 }}
                animate={{ translateY: 0, opacity: 1 }}
                exit={{ translateY: 48, opacity: 0 }}
                transition={LUX_SPRING}
                style={styles.sheetCard}
              >
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>Choose Photo Source</Text>
                <LuxPressable onPress={() => void pickImage(true)} style={[styles.sheetAction, styles.pointer]}>
                  <View style={styles.sheetActionIcon}>
                    <Camera color="#111111" size={18} />
                  </View>
                  <View className="flex-1">
                    <Text style={styles.sheetActionTitle}>Take Photo</Text>
                    <Text style={styles.sheetActionBody}>Capture a fresh room photo with your camera.</Text>
                  </View>
                </LuxPressable>
                <LuxPressable onPress={() => void pickImage(false)} style={[styles.sheetAction, styles.pointer]}>
                  <View style={styles.sheetActionIcon}>
                    <ImageIcon color="#111111" size={18} />
                  </View>
                  <View className="flex-1">
                    <Text style={styles.sheetActionTitle}>Choose from Library</Text>
                    <Text style={styles.sheetActionBody}>Import an existing photo from your gallery.</Text>
                  </View>
                </LuxPressable>
                <LuxPressable onPress={closeSourceSheet} style={[styles.pointer, styles.sheetCancelButton]}>
                  <Text style={styles.sheetCancelText}>Cancel</Text>
                </LuxPressable>
              </MotiView>
            </MotiView>
          ) : null}
        </AnimatePresence>
      </View>
    );
  }

  if (workflowStep === 4) {
    return (
      <View style={styles.processingRoot}>
        <Text className="text-xs uppercase tracking-[3px] text-cyan-200/80">Darkor.ai</Text>
        <View className="mt-6 items-center justify-center">
          <View style={styles.processingCard}>
            <Image source={{ uri: selectedImage ?? EXAMPLE_PHOTOS[0].uri }} style={styles.processingImage} contentFit="cover" />
            <MotiView
              animate={{ opacity: [0.2, 0.6, 0.2], scale: [1, 1.1, 1] }}
            transition={{ ...LUX_SPRING, loop: true }}
              style={styles.processingRing}
            />
            <MotiView
              animate={{ rotateZ: ["0deg", "360deg"] }}
            transition={{ ...LUX_SPRING, loop: true }}
              style={styles.scanArm}
            >
              <View style={styles.scanLine} />
            </MotiView>
          </View>
        </View>
        <Text className="mt-8 text-2xl font-semibold text-zinc-100">Processing...</Text>
        <Text className="mt-2 text-center text-sm text-zinc-400">
          Analyzing your space and applying {selectedStyle ?? "your"} style.
        </Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        className="flex-1 bg-black"
        style={{ backgroundColor: "#000000" }}
        contentContainerStyle={{ padding: 20, paddingBottom: 150, minHeight: height }}
        contentInsetAdjustmentBehavior="automatic"
      >
      <View className="flex-row items-center gap-3">
        <LuxPressable onPress={handleBack} className="h-10 w-10 items-center justify-center rounded-full border border-white/10" style={styles.pointer}>
          <ArrowLeft color="#e4e4e7" size={18} />
        </LuxPressable>
        <View>
          <Text className="text-xs uppercase tracking-[3px] text-cyan-200/80">Darkor.ai</Text>
          <Text className="text-2xl font-semibold text-zinc-100">{label}</Text>
        </View>
      </View>

      <View className="mt-6 flex-row flex-wrap gap-2">
        {["Photo", "Room", "Style", "Vibe", "AI", "Canvas"].map((step, index) => (
          <View
            key={step}
            className={`rounded-full border px-3 py-1 ${index <= workflowStep ? "border-cyan-300/40 bg-cyan-400/10" : "border-white/10"}`}
          >
            <Text className={`text-[11px] font-semibold ${index <= workflowStep ? "text-cyan-100" : "text-zinc-500"}`}>{step}</Text>
          </View>
        ))}
      </View>

      <AnimatePresence exitBeforeEnter>
        {workflowStep === 0 ? (
          <MotiView
            key="step-photo"
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={LUX_SPRING}
            className="mt-8"
          >
            <Text className="text-lg font-semibold text-zinc-100">Add a Photo</Text>
            <Text className="mt-2 text-sm leading-6 text-zinc-400">
              Upload a real space or start instantly from one of the curated references below.
            </Text>

            {selectedImage ? (
              <LuxPressable
                onPress={handlePickPhoto}
                className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-zinc-950"
                style={[styles.previewCard, styles.cardShadow, styles.pointer]}
              >
                <Image source={{ uri: selectedImage }} style={styles.previewImage} contentFit="cover" transition={180} />
                <View style={styles.previewBadge}>
                  <Text className="text-xs font-semibold text-white">Selected photo</Text>
                  <Text className="mt-1 text-[11px] text-zinc-300">Tap to replace from camera or library</Text>
                </View>
                <LuxPressable
                  onPress={handleClearSelectedImage}
                  className="absolute right-4 top-4 h-10 w-10 items-center justify-center rounded-full bg-black/75"
                  style={[styles.pointer, styles.closeButton]}
                >
                  <X color="#ffffff" size={18} />
                </LuxPressable>
              </LuxPressable>
            ) : (
              <LuxPressable onPress={handlePickPhoto} className="mt-5 rounded-3xl bg-black/80" style={[styles.uploadCard, styles.cardShadow, styles.pointer]}>
                <View style={styles.uploadInner}>
                  <View style={styles.plusWrap}>
                    <Plus color="#fafafa" size={34} strokeWidth={2.1} />
                  </View>
                  <Text style={styles.uploadTitle}>Start Redesigning{"\n"}Redesign and beautify your home</Text>
                  <Text style={styles.uploadSubtitle}>Tap to add a photo from your camera or library</Text>
                </View>
              </LuxPressable>
            )}

            <View className="mt-8">
              <Text className="text-base font-semibold text-zinc-100">Example Photos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
                <View className="flex-row gap-4 pr-1">
                  {EXAMPLE_PHOTOS.map((photo) => {
                    const active = selectedImage === photo.uri;
                    return (
                      <LuxPressable
                        key={photo.id}
                        onPress={() => handleSelectExample(photo.uri)}
                        style={[styles.pointer, styles.examplePhotoCard, active ? styles.examplePhotoCardActive : null]}
                      >
                        <Image source={{ uri: photo.uri }} style={styles.examplePhotoImage} contentFit="cover" transition={180} />
                        <LinearGradient
                          colors={["transparent", "rgba(0,0,0,0.88)"]}
                          start={{ x: 0.5, y: 0 }}
                          end={{ x: 0.5, y: 1 }}
                          style={styles.exampleGradient}
                        >
                          <Text className="text-xs font-semibold text-white">{photo.title}</Text>
                        </LinearGradient>
                      </LuxPressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </MotiView>
        ) : null}

        {workflowStep === 1 ? (
          <MotiView
            key="step-room"
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={LUX_SPRING}
            className="mt-8"
          >
            <Text className="text-lg font-semibold text-zinc-100">{heading}</Text>
            <View className="mt-4 flex-row flex-wrap gap-4">
              {buildingOptions.map((room) => {
                const active = selectedRoom === room;
                return (
                  <LuxPressable
                    key={room}
                    onPress={() => setSelectedRoom(room)}
                    className={`w-[48%] rounded-2xl border p-4 ${active ? "border-fuchsia-400/70 bg-fuchsia-500/10" : "border-white/10 bg-black/70"}`}
                    style={[styles.cardShadow, styles.pointer]}
                  >
                    <Text className={`text-sm font-semibold ${active ? "text-fuchsia-100" : "text-zinc-200"}`}>{room}</Text>
                    <Text className="mt-2 text-xs text-zinc-400">Tap to select</Text>
                  </LuxPressable>
                );
              })}
            </View>
          </MotiView>
        ) : null}

        {workflowStep === 2 ? (
          <MotiView
            key="step-style"
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={LUX_SPRING}
            className="mt-8"
          >
            <Text className="text-lg font-semibold text-zinc-100">Select Style</Text>
            <View className="mt-4 flex-row flex-wrap gap-3">
              {STYLE_OPTIONS.map((style) => {
                const active = selectedStyle === style;
                return (
                  <LuxPressable
                    key={style}
                    onPress={() => setSelectedStyle(style)}
                    className={`w-[48%] flex-row items-center gap-3 rounded-2xl border p-3 ${active ? "border-fuchsia-400/70 bg-fuchsia-500/10" : "border-white/10 bg-black/70"}`}
                    style={[styles.cardShadow, styles.pointer]}
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                      <Text className="text-sm font-semibold text-zinc-300">{style.slice(0, 1)}</Text>
                    </View>
                    <View>
                      <Text className={`text-sm font-semibold ${active ? "text-fuchsia-100" : "text-zinc-200"}`}>{style}</Text>
                      <Text className="mt-1 text-xs text-zinc-500">Signature</Text>
                    </View>
                  </LuxPressable>
                );
              })}
            </View>
          </MotiView>
        ) : null}

        {workflowStep === 3 ? (
          <MotiView
            key="step-palette"
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={LUX_SPRING}
            className="mt-8"
          >
            <Text className="text-lg font-semibold text-zinc-100">Choose Vibe</Text>
            <View className="mt-4 flex-row flex-wrap gap-3">
              {PALETTE_OPTIONS.map((palette) => {
                const active = selectedPalette === palette.id;
                return (
                  <LuxPressable
                    key={palette.id}
                    onPress={() => setSelectedPalette(palette.id)}
                    className={`w-[31%] rounded-2xl border p-3 ${active ? "border-fuchsia-400/70 bg-fuchsia-500/10" : "border-white/10 bg-black/70"}`}
                    style={[styles.cardShadow, styles.pointer]}
                  >
                    <View className="flex-row gap-1">
                      {palette.colors.map((color) => (
                        <View key={color} className="h-6 flex-1 rounded-lg" style={{ backgroundColor: color }} />
                      ))}
                    </View>
                    <Text className={`mt-2 text-xs font-semibold ${active ? "text-fuchsia-100" : "text-zinc-200"}`}>{palette.label}</Text>
                  </LuxPressable>
                );
              })}
            </View>
          </MotiView>
        ) : null}

        {workflowStep === 5 ? (
          <MotiView
            key="step-editor"
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={LUX_SPRING}
            className="mt-8"
          >
            <View className="flex-row items-center justify-between">
              <LuxPressable onPress={() => Alert.alert("Info", "Render details coming soon.")} className="h-10 w-10 items-center justify-center rounded-full border border-white/10" style={styles.pointer}>
                <Info color="#e4e4e7" size={16} />
              </LuxPressable>
              <LuxPressable onPress={handleDelete} className="h-10 w-10 items-center justify-center rounded-full border border-rose-500/40" style={styles.pointer}>
                <Trash2 color="#fb7185" size={16} />
              </LuxPressable>
            </View>

            <Image source={previewImage} style={styles.resultImage} contentFit="cover" />

            <View className="mt-6 rounded-3xl border border-white/10 bg-black/70 p-3" style={styles.cardShadow}>
              <View className="flex-row justify-between gap-3">
                <LuxPressable onPress={resetFlow} className="flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3" style={styles.pointer}>
                  <RefreshCcw color="#e4e4e7" size={16} />
                  <Text className="text-xs font-semibold text-zinc-200">Replace</Text>
                </LuxPressable>
                <LuxPressable onPress={() => setEditorPanel("paint")} className="flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3" style={styles.pointer}>
                  <Paintbrush color="#e4e4e7" size={16} />
                  <Text className="text-xs font-semibold text-zinc-200">Paint</Text>
                </LuxPressable>
                <LuxPressable onPress={() => setEditorPanel("floor")} className="flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3" style={styles.pointer}>
                  <SwatchBook color="#e4e4e7" size={16} />
                  <Text className="text-xs font-semibold text-zinc-200">New Floor</Text>
                </LuxPressable>
              </View>
            </View>

            {editorPanel !== "none" ? (
              <View className="mt-5 rounded-3xl border border-white/10 bg-black/70 p-4" style={styles.cardShadow}>
                <Text className="text-sm font-semibold text-zinc-100">{editorPanel === "paint" ? "Paint Walls" : "Choose Flooring"}</Text>
                {editorPanel === "paint" ? (
                  <View className="mt-3 flex-row flex-wrap gap-3">
                    {PAINT_SWATCHES.map((color) => (
                      <LuxPressable
                        key={color}
                        onPress={() => setSelectedPaint(color)}
                        className={`h-10 w-10 rounded-full border-2 ${selectedPaint === color ? "border-fuchsia-400" : "border-transparent"}`}
                        style={[styles.pointer, { backgroundColor: color }]}
                      />
                    ))}
                  </View>
                ) : (
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    {FLOOR_TEXTURES.map((texture) => (
                      <LuxPressable
                        key={texture}
                        onPress={() => setSelectedFloor(texture)}
                        className={`rounded-full border px-3 py-2 ${selectedFloor === texture ? "border-fuchsia-400 bg-fuchsia-500/10" : "border-white/10"}`}
                        style={styles.pointer}
                      >
                        <Text className={`text-xs font-semibold ${selectedFloor === texture ? "text-fuchsia-100" : "text-zinc-300"}`}>{texture}</Text>
                      </LuxPressable>
                    ))}
                  </View>
                )}
                <LuxPressable
                  onPress={editorPanel === "paint" ? handleApplyPaint : handleApplyFloor}
                  className="mt-4 items-center rounded-2xl bg-cyan-400 py-3"
                  style={styles.pointer}
                >
                  <Text className="text-sm font-semibold text-zinc-900">Apply Changes</Text>
                </LuxPressable>
              </View>
            ) : null}

            <View className="mt-5 flex-row flex-wrap gap-3">
              <LuxPressable onPress={handleDownload} className="flex-row items-center gap-2 rounded-full border border-white/10 px-4 py-2" style={styles.pointer}>
                <Download color="#a1a1aa" size={16} />
                <Text className="text-xs font-semibold text-zinc-300">Download</Text>
              </LuxPressable>
              <LuxPressable onPress={handleShare} className="flex-row items-center gap-2 rounded-full border border-white/10 px-4 py-2" style={styles.pointer}>
                <Share2 color="#a1a1aa" size={16} />
                <Text className="text-xs font-semibold text-zinc-300">Share</Text>
              </LuxPressable>
              <LuxPressable onPress={() => setCompareBefore((prev) => !prev)} className="flex-row items-center gap-2 rounded-full border border-white/10 px-4 py-2" style={styles.pointer}>
                <Sparkles color="#a1a1aa" size={16} />
                <Text className="text-xs font-semibold text-zinc-300">{compareBefore ? "After" : "Compare"}</Text>
              </LuxPressable>
            </View>
          </MotiView>
        ) : null}
      </AnimatePresence>

      {workflowStep <= 3 ? (
        <BlurView intensity={28} tint="dark" style={styles.footerGlass}>
          <LuxPressable onPress={handleBack} className="rounded-full border border-white/10 px-5 py-2" style={styles.pointer}>
            <Text className="text-xs font-semibold text-zinc-200">Back</Text>
          </LuxPressable>
          <LuxPressable onPress={handleContinue} style={styles.pointer} disabled={!canContinue()}>
            {canContinue() ? (
              <LinearGradient
                colors={["#ef4444", "#d946ef"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.continueButtonActive}
              >
                <Text className="text-xs font-semibold text-white">{workflowStep === 3 ? "Generate Renders" : "Continue"}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.continueButtonDisabled}>
                <Text className="text-xs font-semibold text-zinc-400">{workflowStep === 3 ? "Generate Renders" : "Continue"}</Text>
              </View>
            )}
          </LuxPressable>
        </BlurView>
      ) : null}
      </ScrollView>

      <AnimatePresence>
        {isSourceSheetVisible ? (
          <MotiView key="source-sheet" from={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={styles.sheetRoot}>
            <Pressable onPress={closeSourceSheet} style={styles.sheetBackdrop} />
            <MotiView
              from={{ translateY: 48, opacity: 0 }}
              animate={{ translateY: 0, opacity: 1 }}
              exit={{ translateY: 48, opacity: 0 }}
              transition={LUX_SPRING}
              style={styles.sheetCard}
            >
              <View style={styles.sheetHandle} />
              <Text className="mt-3 text-center text-lg font-semibold text-zinc-100">Add a Photo</Text>
              <Text className="mt-2 text-center text-sm leading-6 text-zinc-400">
                Choose how you want to bring your space into Darkor.ai.
              </Text>

              <LuxPressable onPress={() => void pickImage(true)} style={[styles.sheetAction, styles.pointer]}>
                <View style={styles.sheetActionIcon}>
                  <Camera color="#ffffff" size={18} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-white">Take photo from camera</Text>
                  <Text className="mt-1 text-xs text-zinc-400">Capture the room directly and continue instantly.</Text>
                </View>
              </LuxPressable>

              <LuxPressable onPress={() => void pickImage(false)} style={[styles.sheetAction, styles.pointer]}>
                <View style={styles.sheetActionIcon}>
                  <ImageIcon color="#ffffff" size={18} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-white">Choose from library</Text>
                  <Text className="mt-1 text-xs text-zinc-400">Import an existing photo from your device.</Text>
                </View>
              </LuxPressable>

              <LuxPressable onPress={closeSourceSheet} className="mt-3 items-center rounded-2xl border border-white/10 py-3" style={styles.pointer}>
                <Text className="text-sm font-semibold text-zinc-200">Cancel</Text>
              </LuxPressable>
            </MotiView>
          </MotiView>
        ) : null}
      </AnimatePresence>
    </>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    shadowColor: "#000000",
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  pointer: {
    cursor: "pointer",
  },
  stepOneScreen: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  stepOneScroll: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  stepOneContent: {
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 180,
  },
  stepOneHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  stepCounter: {
    color: "#111111",
    fontSize: 24,
    fontWeight: "700",
  },
  stepCloseButton: {
    position: "absolute",
    right: 0,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  progressTrackRow: {
    marginTop: 28,
    flexDirection: "row",
    gap: 14,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#d4d4d8",
  },
  progressTrackActive: {
    backgroundColor: "#111111",
  },
  stepOneTitle: {
    marginTop: 42,
    color: "#111111",
    fontSize: 30,
    fontWeight: "700",
  },
  stepOneCardWrap: {
    marginTop: 28,
  },
  emptyUploadCard: {
    minHeight: 458,
    borderRadius: 28,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#3f3f46",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    backgroundColor: "#ffffff",
  },
  plusButton: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyUploadTitle: {
    marginTop: 24,
    color: "#111111",
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600",
    textAlign: "center",
  },
  selectedImageCard: {
    height: 458,
    borderRadius: 28,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#f4f4f5",
  },
  selectedImage: {
    width: "100%",
    height: "100%",
  },
  selectedImageClose: {
    position: "absolute",
    top: 18,
    right: 18,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(17, 17, 17, 0.42)",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadingOverlay: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    borderRadius: 18,
    backgroundColor: "rgba(17, 17, 17, 0.52)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  uploadingText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  exampleSection: {
    marginTop: 28,
  },
  exampleHeading: {
    color: "#111111",
    fontSize: 18,
    fontWeight: "700",
  },
  exampleRow: {
    gap: 14,
    paddingTop: 16,
    paddingRight: 24,
  },
  exampleThumbCard: {
    width: 122,
    height: 122,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#f4f4f5",
  },
  exampleThumbCardActive: {
    borderWidth: 3,
    borderColor: "#d946ef",
  },
  exampleThumbImage: {
    width: "100%",
    height: "100%",
  },
  stepOneFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
  },
  stepOneContinueActive: {
    minHeight: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  stepOneContinueText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  stepOneContinueDisabled: {
    minHeight: 64,
    borderRadius: 22,
    backgroundColor: "#e4e4e7",
    alignItems: "center",
    justifyContent: "center",
  },
  stepOneContinueDisabledText: {
    color: "#71717a",
    fontSize: 18,
    fontWeight: "700",
  },
  uploadCard: {
    minHeight: 312,
    borderRadius: 28,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#27272a",
    overflow: "hidden",
  },
  uploadInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  plusWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 20,
  },
  uploadTitle: {
    color: "#fafafa",
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "700",
    textAlign: "center",
  },
  uploadSubtitle: {
    marginTop: 14,
    color: "#a1a1aa",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  previewCard: {
    position: "relative",
    height: 312,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewBadge: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "rgba(0, 0, 0, 0.62)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  closeButton: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
  },
  examplePhotoCard: {
    width: 164,
    height: 212,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#111111",
  },
  examplePhotoCardActive: {
    borderColor: "rgba(236, 72, 153, 0.95)",
    shadowColor: "#d946ef",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  examplePhotoImage: {
    width: "100%",
    height: "100%",
  },
  exampleGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  resultImage: {
    width: "100%",
    height: 320,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    marginTop: 16,
  },
  footerGlass: {
    marginTop: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  continueButtonActive: {
    minWidth: 146,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  continueButtonDisabled: {
    minWidth: 146,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#3f3f46",
  },
  sheetRoot: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    zIndex: 50,
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
  },
  sheetCard: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    backgroundColor: "#ffffff",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 18,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(17, 17, 17, 0.18)",
  },
  sheetTitle: {
    marginTop: 14,
    color: "#111111",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  sheetAction: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    backgroundColor: "#fafafa",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  sheetActionTitle: {
    color: "#111111",
    fontSize: 15,
    fontWeight: "700",
  },
  sheetActionBody: {
    marginTop: 2,
    color: "#71717a",
    fontSize: 13,
    lineHeight: 18,
  },
  sheetActionIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: "#f4f4f5",
  },
  sheetCancelButton: {
    marginTop: 14,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    backgroundColor: "#111111",
  },
  sheetCancelText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  processingRoot: {
    flex: 1,
    backgroundColor: "#050506",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  processingCard: {
    width: 240,
    height: 240,
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  processingImage: {
    width: "100%",
    height: "100%",
  },
  processingRing: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 2,
    borderColor: "rgba(34, 211, 238, 0.45)",
  },
  scanArm: {
    position: "absolute",
    width: 240,
    height: 240,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  scanLine: {
    width: 2,
    height: 120,
    backgroundColor: "rgba(34, 211, 238, 0.7)",
    borderRadius: 1,
  },
});

