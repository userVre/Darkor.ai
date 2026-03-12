import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AnimatePresence, MotiView } from "moti";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
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
  RefreshCcw,
  Share2,
  Sparkles,
  SwatchBook,
  Trash2,
  Wand2,
} from "lucide-react-native";
import { BlurView } from "expo-blur";

const EXAMPLE_PHOTOS = [
  "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1502005097973-6a7082348e28?auto=format&fit=crop&w=1200&q=80",
];

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
  };

  const openPicker = async (source: "camera" | "gallery") => {
    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission needed", "Camera access is required.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.9,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0].uri);
      }
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Photo library access is required.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.9,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handlePickPhoto = () => {
    Alert.alert("Add Photo", "Choose a source", [
      { text: "Camera", onPress: () => void openPicker("camera") },
      { text: "Gallery", onPress: () => void openPicker("gallery") },
      { text: "Cancel", style: "cancel" },
    ]);
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

  if (workflowStep === 4) {
    return (
      <View style={styles.processingRoot}>
        <Text className="text-xs uppercase tracking-[3px] text-cyan-200/80">Darkor.ai</Text>
        <View className="mt-6 items-center justify-center">
          <View style={styles.processingCard}>
            <Image source={{ uri: selectedImage ?? EXAMPLE_PHOTOS[0] }} style={styles.processingImage} contentFit="cover" />
            <MotiView
              animate={{ opacity: [0.2, 0.6, 0.2], scale: [1, 1.1, 1] }}
              transition={{ type: "timing", duration: 2000, loop: true }}
              style={styles.processingRing}
            />
            <MotiView
              animate={{ rotateZ: ["0deg", "360deg"] }}
              transition={{ type: "timing", duration: 2200, loop: true }}
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
    <ScrollView
      className="flex-1 bg-zinc-950"
      contentContainerStyle={{ padding: 20, paddingBottom: 150, minHeight: height }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View className="flex-row items-center gap-3">
        <Pressable onPress={handleBack} className="h-10 w-10 items-center justify-center rounded-full border border-white/10" style={styles.pointer}>
          <ArrowLeft color="#e4e4e7" size={18} />
        </Pressable>
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
            transition={{ type: "timing", duration: 350 }}
            className="mt-8"
          >
            <Text className="text-lg font-semibold text-zinc-100">Add a Photo</Text>
            <Pressable
              onPress={handlePickPhoto}
              className="mt-4 overflow-hidden rounded-3xl border border-dashed border-white/20 bg-zinc-900/70"
              style={[styles.cardShadow, styles.pointer, { height: 220 }]}
            >
              {selectedImage ? (
                <Image source={{ uri: selectedImage }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
              ) : (
                <View className="flex-1 items-center justify-center gap-3">
                  <View className="h-14 w-14 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-400/10">
                    <Wand2 color="#67e8f9" size={24} />
                  </View>
                  <Text className="text-sm font-medium text-zinc-300">Tap to upload from camera or gallery</Text>
                  <View className="flex-row gap-3">
                    <View className="flex-row items-center gap-2 rounded-full border border-white/10 px-3 py-1">
                      <Camera color="#94a3b8" size={14} />
                      <Text className="text-xs text-zinc-400">Camera</Text>
                    </View>
                    <View className="flex-row items-center gap-2 rounded-full border border-white/10 px-3 py-1">
                      <ImageIcon color="#94a3b8" size={14} />
                      <Text className="text-xs text-zinc-400">Gallery</Text>
                    </View>
                  </View>
                </View>
              )}
            </Pressable>

            <Text className="mt-6 text-xs uppercase tracking-[2px] text-zinc-400">Example Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
              <View className="flex-row gap-3">
                {EXAMPLE_PHOTOS.map((uri) => (
                  <Pressable key={uri} onPress={() => setSelectedImage(uri)} style={[styles.pointer, styles.exampleCard]}>
                    <Image source={{ uri }} style={styles.exampleImage} contentFit="cover" />
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </MotiView>
        ) : null}

        {workflowStep === 1 ? (
          <MotiView
            key="step-room"
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 350 }}
            className="mt-8"
          >
            <Text className="text-lg font-semibold text-zinc-100">{heading}</Text>
            <View className="mt-4 flex-row flex-wrap gap-4">
              {buildingOptions.map((room) => {
                const active = selectedRoom === room;
                return (
                  <Pressable
                    key={room}
                    onPress={() => setSelectedRoom(room)}
                    className={`w-[48%] rounded-2xl border p-4 ${active ? "border-fuchsia-400/70 bg-fuchsia-500/10" : "border-white/10 bg-zinc-900/80"}`}
                    style={[styles.cardShadow, styles.pointer]}
                  >
                    <Text className={`text-sm font-semibold ${active ? "text-fuchsia-100" : "text-zinc-200"}`}>{room}</Text>
                    <Text className="mt-2 text-xs text-zinc-400">Tap to select</Text>
                  </Pressable>
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
            transition={{ type: "timing", duration: 350 }}
            className="mt-8"
          >
            <Text className="text-lg font-semibold text-zinc-100">Select Style</Text>
            <View className="mt-4 flex-row flex-wrap gap-3">
              {STYLE_OPTIONS.map((style) => {
                const active = selectedStyle === style;
                return (
                  <Pressable
                    key={style}
                    onPress={() => setSelectedStyle(style)}
                    className={`w-[48%] flex-row items-center gap-3 rounded-2xl border p-3 ${active ? "border-fuchsia-400/70 bg-fuchsia-500/10" : "border-white/10 bg-zinc-900/80"}`}
                    style={[styles.cardShadow, styles.pointer]}
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                      <Text className="text-sm font-semibold text-zinc-300">{style.slice(0, 1)}</Text>
                    </View>
                    <View>
                      <Text className={`text-sm font-semibold ${active ? "text-fuchsia-100" : "text-zinc-200"}`}>{style}</Text>
                      <Text className="mt-1 text-xs text-zinc-500">Signature</Text>
                    </View>
                  </Pressable>
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
            transition={{ type: "timing", duration: 350 }}
            className="mt-8"
          >
            <Text className="text-lg font-semibold text-zinc-100">Choose Vibe</Text>
            <View className="mt-4 flex-row flex-wrap gap-3">
              {PALETTE_OPTIONS.map((palette) => {
                const active = selectedPalette === palette.id;
                return (
                  <Pressable
                    key={palette.id}
                    onPress={() => setSelectedPalette(palette.id)}
                    className={`w-[31%] rounded-2xl border p-3 ${active ? "border-fuchsia-400/70 bg-fuchsia-500/10" : "border-white/10 bg-zinc-900/80"}`}
                    style={[styles.cardShadow, styles.pointer]}
                  >
                    <View className="flex-row gap-1">
                      {palette.colors.map((color) => (
                        <View key={color} className="h-6 flex-1 rounded-lg" style={{ backgroundColor: color }} />
                      ))}
                    </View>
                    <Text className={`mt-2 text-xs font-semibold ${active ? "text-fuchsia-100" : "text-zinc-200"}`}>{palette.label}</Text>
                  </Pressable>
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
            transition={{ type: "timing", duration: 350 }}
            className="mt-8"
          >
            <View className="flex-row items-center justify-between">
              <Pressable onPress={() => Alert.alert("Info", "Render details coming soon.")} className="h-10 w-10 items-center justify-center rounded-full border border-white/10" style={styles.pointer}>
                <Info color="#e4e4e7" size={16} />
              </Pressable>
              <Pressable onPress={handleDelete} className="h-10 w-10 items-center justify-center rounded-full border border-rose-500/40" style={styles.pointer}>
                <Trash2 color="#fb7185" size={16} />
              </Pressable>
            </View>

            <Image source={previewImage} style={styles.resultImage} contentFit="cover" />

            <View className="mt-6 rounded-3xl border border-white/10 bg-zinc-900/90 p-3" style={styles.cardShadow}>
              <View className="flex-row justify-between gap-3">
                <Pressable onPress={resetFlow} className="flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3" style={styles.pointer}>
                  <RefreshCcw color="#e4e4e7" size={16} />
                  <Text className="text-xs font-semibold text-zinc-200">Replace</Text>
                </Pressable>
                <Pressable onPress={() => setEditorPanel("paint")} className="flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3" style={styles.pointer}>
                  <Paintbrush color="#e4e4e7" size={16} />
                  <Text className="text-xs font-semibold text-zinc-200">Paint</Text>
                </Pressable>
                <Pressable onPress={() => setEditorPanel("floor")} className="flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3" style={styles.pointer}>
                  <SwatchBook color="#e4e4e7" size={16} />
                  <Text className="text-xs font-semibold text-zinc-200">New Floor</Text>
                </Pressable>
              </View>
            </View>

            {editorPanel !== "none" ? (
              <View className="mt-5 rounded-3xl border border-white/10 bg-zinc-900/90 p-4" style={styles.cardShadow}>
                <Text className="text-sm font-semibold text-zinc-100">{editorPanel === "paint" ? "Paint Walls" : "Choose Flooring"}</Text>
                {editorPanel === "paint" ? (
                  <View className="mt-3 flex-row flex-wrap gap-3">
                    {PAINT_SWATCHES.map((color) => (
                      <Pressable
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
                      <Pressable
                        key={texture}
                        onPress={() => setSelectedFloor(texture)}
                        className={`rounded-full border px-3 py-2 ${selectedFloor === texture ? "border-fuchsia-400 bg-fuchsia-500/10" : "border-white/10"}`}
                        style={styles.pointer}
                      >
                        <Text className={`text-xs font-semibold ${selectedFloor === texture ? "text-fuchsia-100" : "text-zinc-300"}`}>{texture}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                <Pressable
                  onPress={editorPanel === "paint" ? handleApplyPaint : handleApplyFloor}
                  className="mt-4 items-center rounded-2xl bg-cyan-400 py-3"
                  style={styles.pointer}
                >
                  <Text className="text-sm font-semibold text-zinc-900">Apply Changes</Text>
                </Pressable>
              </View>
            ) : null}

            <View className="mt-5 flex-row flex-wrap gap-3">
              <Pressable onPress={handleDownload} className="flex-row items-center gap-2 rounded-full border border-white/10 px-4 py-2" style={styles.pointer}>
                <Download color="#a1a1aa" size={16} />
                <Text className="text-xs font-semibold text-zinc-300">Download</Text>
              </Pressable>
              <Pressable onPress={handleShare} className="flex-row items-center gap-2 rounded-full border border-white/10 px-4 py-2" style={styles.pointer}>
                <Share2 color="#a1a1aa" size={16} />
                <Text className="text-xs font-semibold text-zinc-300">Share</Text>
              </Pressable>
              <Pressable onPress={() => setCompareBefore((prev) => !prev)} className="flex-row items-center gap-2 rounded-full border border-white/10 px-4 py-2" style={styles.pointer}>
                <Sparkles color="#a1a1aa" size={16} />
                <Text className="text-xs font-semibold text-zinc-300">{compareBefore ? "After" : "Compare"}</Text>
              </Pressable>
            </View>
          </MotiView>
        ) : null}
      </AnimatePresence>

      {workflowStep <= 3 ? (
        <BlurView intensity={28} tint="dark" style={styles.footerGlass}>
          <Pressable onPress={handleBack} className="rounded-full border border-white/10 px-5 py-2" style={styles.pointer}>
            <Text className="text-xs font-semibold text-zinc-200">Back</Text>
          </Pressable>
          <Pressable
            onPress={handleContinue}
            className={`rounded-full px-5 py-2 ${canContinue() ? "bg-cyan-400" : "bg-zinc-700"}`}
            style={styles.pointer}
            disabled={!canContinue()}
          >
            <Text className={`text-xs font-semibold ${canContinue() ? "text-zinc-900" : "text-zinc-300"}`}>
              {workflowStep === 3 ? "? Generate Renders" : "Continue"}
            </Text>
          </Pressable>
        </BlurView>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.45)",
  },
  pointer: {
    cursor: "pointer",
  },
  exampleCard: {
    width: 130,
    height: 90,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  exampleImage: {
    width: "100%",
    height: "100%",
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
