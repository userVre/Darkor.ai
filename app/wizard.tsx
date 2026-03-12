import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MotiView } from "moti";
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
  Download,
  Info,
  Paintbrush,
  RefreshCcw,
  Share2,
  Sparkles,
  SwatchBook,
  Trash2,
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
  "Modern",
  "Minimalist",
  "Scandinavian",
  "Industrial",
  "Zen",
  "Coastal",
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
  "Luxury",
  "Japandi",
  "Classic",
  "Eclectic",
  "Wabi-Sabi",
];

const PALETTE_OPTIONS = [
  { id: "surprise", label: "Surprise Me", colors: ["#f8fafc", "#0f172a", "#22d3ee"] },
  { id: "gray", label: "Millennial Gray", colors: ["#d1d5db", "#9ca3af", "#6b7280"] },
  { id: "sunset", label: "Neon Sunset", colors: ["#fb7185", "#f59e0b", "#f97316"] },
  { id: "emerald", label: "Emerald Gem", colors: ["#34d399", "#10b981", "#065f46"] },
  { id: "oasis", label: "Coastal Fog", colors: ["#bae6fd", "#38bdf8", "#0ea5e9"] },
  { id: "luxe", label: "Midnight Luxe", colors: ["#0f172a", "#111827", "#22d3ee"] },
  { id: "sage", label: "Sage Calm", colors: ["#a7f3d0", "#34d399", "#0f766e"] },
  { id: "sand", label: "Warm Sand", colors: ["#fbbf24", "#f59e0b", "#f97316"] },
  { id: "mono", label: "Monochrome", colors: ["#e4e4e7", "#71717a", "#18181b"] },
];

const PAINT_SWATCHES = ["#f5f5f4", "#cbd5e1", "#a7f3d0", "#c4b5fd", "#fbbf24", "#f472b6"];
const FLOOR_TEXTURES = ["Warm Oak", "Dark Walnut", "Polished Marble", "Concrete", "Terrazzo"];

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
    Alert.alert("Paint applied", "Your wall color update is ready (mock)." );
    setEditorPanel("none");
  };

  const handleApplyFloor = () => {
    if (!selectedFloor) {
      Alert.alert("Select a floor", "Choose a flooring texture to apply.");
      return;
    }
    Alert.alert("Floor applied", "Your flooring update is ready (mock)." );
    setEditorPanel("none");
  };

  const label = SERVICE_LABELS[serviceType] ?? "Redesign";
  const previewImage = compareBefore && selectedImage ? { uri: selectedImage } : mockResult;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { minHeight: height }]}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={[styles.backButton, styles.pointer]}>
          <ArrowLeft color="#e4e4e7" size={18} />
        </Pressable>
        <View>
          <Text style={styles.eyebrow}>Darkor.ai</Text>
          <Text style={styles.title}>{label}</Text>
        </View>
      </View>

      {workflowStep === 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add a Photo</Text>
          <Pressable onPress={handlePickPhoto} style={[styles.uploadCard, styles.pointer]}>
            {selectedImage ? (
              <Image source={{ uri: selectedImage }} style={styles.uploadPreview} contentFit="cover" />
            ) : (
              <View style={styles.uploadInner}>
                <View style={styles.plusCircle}>
                  <Text style={styles.plusText}>+</Text>
                </View>
                <Text style={styles.uploadText}>Upload from camera or gallery</Text>
              </View>
            )}
          </Pressable>

          <Text style={styles.caption}>Example Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.examplesRow}>
            {EXAMPLE_PHOTOS.map((uri) => (
              <Pressable key={uri} onPress={() => setSelectedImage(uri)} style={[styles.exampleCard, styles.pointer]}>
                <Image source={{ uri }} style={styles.exampleImage} contentFit="cover" />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {workflowStep === 1 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{heading}</Text>
          <View style={styles.grid}>
            {buildingOptions.map((room) => {
              const active = selectedRoom === room;
              return (
                <Pressable
                  key={room}
                  onPress={() => setSelectedRoom(room)}
                  style={[styles.gridCard, active && styles.gridCardActive, styles.pointer]}
                >
                  <Text style={[styles.gridCardText, active && styles.gridCardTextActive]}>{room}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {workflowStep === 2 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Style</Text>
          <View style={styles.styleGrid}>
            {STYLE_OPTIONS.map((style) => {
              const active = selectedStyle === style;
              return (
                <Pressable
                  key={style}
                  onPress={() => setSelectedStyle(style)}
                  style={[styles.styleCard, active && styles.gridCardActive, styles.pointer]}
                >
                  <View style={styles.styleThumb}>
                    <Text style={styles.styleThumbText}>{style.slice(0, 1)}</Text>
                  </View>
                  <Text style={[styles.gridCardText, active && styles.gridCardTextActive]}>{style}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {workflowStep === 3 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose Vibe</Text>
          <View style={styles.paletteGrid}>
            {PALETTE_OPTIONS.map((palette) => {
              const active = selectedPalette === palette.id;
              return (
                <Pressable
                  key={palette.id}
                  onPress={() => setSelectedPalette(palette.id)}
                  style={[styles.paletteCard, active && styles.gridCardActive, styles.pointer]}
                >
                  <View style={styles.paletteSwatches}>
                    {palette.colors.map((color) => (
                      <View key={color} style={[styles.paletteSwatch, { backgroundColor: color }]} />
                    ))}
                  </View>
                  <Text style={[styles.gridCardText, active && styles.gridCardTextActive]}>{palette.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {workflowStep === 4 ? (
        <View style={styles.processingScreen}>
          <MotiView
            from={{ opacity: 0.8, scale: 0.96 }}
            animate={{ opacity: [0.8, 1, 0.8], scale: [0.96, 1, 0.96] }}
            transition={{ type: "timing", duration: 1600, loop: true }}
            style={styles.processingCard}
          >
            <Image source={{ uri: selectedImage ?? EXAMPLE_PHOTOS[0] }} style={styles.processingImage} contentFit="cover" />
            <MotiView
              animate={{ opacity: [0.2, 0.6, 0.2], scale: [1, 1.08, 1] }}
              transition={{ type: "timing", duration: 2000, loop: true }}
              style={styles.processingRing}
            />
          </MotiView>
          <Text style={styles.processingTitle}>Processing...</Text>
          <Text style={styles.processingSubtitle}>
            Analyzing your space and applying {selectedStyle ?? "your"} style.
          </Text>
        </View>
      ) : null}

      {workflowStep === 5 ? (
        <View style={styles.section}>
          <View style={styles.editorHeader}>
            <Pressable onPress={() => Alert.alert("Info", "Render details coming soon.")} style={[styles.infoButton, styles.pointer]}>
              <Info color="#e4e4e7" size={16} />
            </Pressable>
            <Pressable onPress={handleDelete} style={[styles.infoButton, styles.pointer]}>
              <Trash2 color="#f87171" size={16} />
            </Pressable>
          </View>

          <Image source={previewImage} style={styles.resultImage} contentFit="cover" />

          <View style={styles.toolbarFloating}>
            <Pressable onPress={resetFlow} style={[styles.toolbarButton, styles.pointer]}>
              <RefreshCcw color="#e4e4e7" size={16} />
              <Text style={styles.toolbarText}>Replace</Text>
            </Pressable>
            <Pressable onPress={() => setEditorPanel("paint")} style={[styles.toolbarButton, styles.pointer]}>
              <Paintbrush color="#e4e4e7" size={16} />
              <Text style={styles.toolbarText}>Paint</Text>
            </Pressable>
            <Pressable onPress={() => setEditorPanel("floor")} style={[styles.toolbarButton, styles.pointer]}>
              <SwatchBook color="#e4e4e7" size={16} />
              <Text style={styles.toolbarText}>New Floor</Text>
            </Pressable>
          </View>

          {editorPanel !== "none" ? (
            <View style={styles.editorPanel}>
              <Text style={styles.sectionTitle}>{editorPanel === "paint" ? "Paint Walls" : "Choose Flooring"}</Text>
              {editorPanel === "paint" ? (
                <View style={styles.swatchRow}>
                  {PAINT_SWATCHES.map((color) => (
                    <Pressable
                      key={color}
                      onPress={() => setSelectedPaint(color)}
                      style={[styles.paintSwatch, { backgroundColor: color }, selectedPaint === color && styles.paintSwatchActive, styles.pointer]}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.floorRow}>
                  {FLOOR_TEXTURES.map((texture) => (
                    <Pressable
                      key={texture}
                      onPress={() => setSelectedFloor(texture)}
                      style={[styles.floorChip, selectedFloor === texture && styles.floorChipActive, styles.pointer]}
                    >
                      <Text style={[styles.floorChipText, selectedFloor === texture && styles.floorChipTextActive]}>{texture}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              <Pressable
                onPress={editorPanel === "paint" ? handleApplyPaint : handleApplyFloor}
                style={[styles.footerButtonPrimary, styles.pointer]}
              >
                <Text style={styles.footerPrimaryText}>Apply</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.secondaryRow}>
            <Pressable onPress={handleDownload} style={[styles.secondaryButton, styles.pointer]}>
              <Download color="#a1a1aa" size={16} />
              <Text style={styles.secondaryText}>Download</Text>
            </Pressable>
            <Pressable onPress={handleShare} style={[styles.secondaryButton, styles.pointer]}>
              <Share2 color="#a1a1aa" size={16} />
              <Text style={styles.secondaryText}>Share</Text>
            </Pressable>
            <Pressable onPress={() => setCompareBefore((prev) => !prev)} style={[styles.secondaryButton, styles.pointer]}>
              <Sparkles color="#a1a1aa" size={16} />
              <Text style={styles.secondaryText}>{compareBefore ? "After" : "Compare"}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {workflowStep <= 3 ? (
        <BlurView intensity={30} tint="dark" style={styles.footer}>
          <Pressable onPress={handleBack} style={[styles.footerButton, styles.pointer]}>
            <Text style={styles.footerButtonText}>Back</Text>
          </Pressable>
          <Pressable
            onPress={handleContinue}
            style={[styles.footerButtonPrimary, styles.pointer, !canContinue() && styles.footerButtonDisabled]}
            disabled={!canContinue()}
          >
            <Text style={styles.footerPrimaryText}>
              {workflowStep === 3 ? "? Generate Renders" : "Continue"}
            </Text>
          </Pressable>
        </BlurView>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 140,
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: {
    color: "#22d3ee",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 2,
    fontWeight: "700",
  },
  title: {
    color: "#f8fafc",
    fontSize: 22,
    fontWeight: "700",
  },
  section: {
    gap: 14,
  },
  sectionTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "700",
  },
  uploadCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderStyle: "dashed",
    backgroundColor: "rgba(24, 24, 27, 0.6)",
    height: 220,
    overflow: "hidden",
  },
  uploadInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  plusCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(34, 211, 238, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(34, 211, 238, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  plusText: {
    color: "#e0f2fe",
    fontSize: 24,
    fontWeight: "700",
  },
  uploadText: {
    color: "#a1a1aa",
    fontSize: 13,
  },
  uploadPreview: {
    width: "100%",
    height: "100%",
  },
  caption: {
    color: "#a1a1aa",
    fontSize: 12,
  },
  examplesRow: {
    gap: 10,
    paddingVertical: 4,
  },
  exampleCard: {
    width: 120,
    height: 84,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  exampleImage: {
    width: "100%",
    height: "100%",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridCard: {
    width: "48%",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(24, 24, 27, 0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  gridCardActive: {
    borderColor: "rgba(236, 72, 153, 0.8)",
    backgroundColor: "rgba(236, 72, 153, 0.12)",
  },
  gridCardText: {
    color: "#d4d4d8",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  gridCardTextActive: {
    color: "#fdf2f8",
  },
  styleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  styleCard: {
    width: "48%",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(24, 24, 27, 0.9)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  styleThumb: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  styleThumbText: {
    color: "#a1a1aa",
    fontWeight: "700",
  },
  paletteGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  paletteCard: {
    width: "31%",
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(24, 24, 27, 0.9)",
    gap: 8,
  },
  paletteSwatches: {
    flexDirection: "row",
    gap: 4,
  },
  paletteSwatch: {
    flex: 1,
    height: 24,
    borderRadius: 8,
  },
  processingScreen: {
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    minHeight: 360,
  },
  processingCard: {
    width: 220,
    height: 220,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  processingImage: {
    width: "100%",
    height: "100%",
  },
  processingRing: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: "rgba(34, 211, 238, 0.5)",
  },
  processingTitle: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "700",
  },
  processingSubtitle: {
    color: "#a1a1aa",
    fontSize: 13,
    textAlign: "center",
  },
  editorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  resultImage: {
    width: "100%",
    height: 320,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  toolbarFloating: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  toolbarButton: {
    flex: 1,
    minWidth: 110,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(24, 24, 27, 0.9)",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  toolbarText: {
    color: "#e4e4e7",
    fontSize: 12,
    fontWeight: "600",
  },
  editorPanel: {
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "rgba(24, 24, 27, 0.95)",
    padding: 14,
    gap: 12,
  },
  swatchRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  paintSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  paintSwatchActive: {
    borderColor: "#f472b6",
  },
  floorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  floorChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  floorChipActive: {
    borderColor: "rgba(236, 72, 153, 0.8)",
    backgroundColor: "rgba(236, 72, 153, 0.12)",
  },
  floorChipText: {
    color: "#d4d4d8",
    fontSize: 12,
  },
  floorChipTextActive: {
    color: "#fdf2f8",
    fontWeight: "600",
  },
  secondaryRow: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  secondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  secondaryText: {
    color: "#a1a1aa",
    fontSize: 12,
    fontWeight: "600",
  },
  footer: {
    marginTop: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    overflow: "hidden",
  },
  footerButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  footerButtonText: {
    color: "#e4e4e7",
    fontSize: 12,
    fontWeight: "600",
  },
  footerButtonPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "rgba(34, 211, 238, 0.85)",
  },
  footerPrimaryText: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "700",
  },
  footerButtonDisabled: {
    opacity: 0.5,
  },
  pointer: {
    cursor: "pointer",
  },
});
