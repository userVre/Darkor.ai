import { Image } from "expo-image";
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
  Paintbrush,
  RefreshCcw,
  Share2,
  Sparkles,
  SwatchBook,
} from "lucide-react-native";

const ROOM_OPTIONS = [
  "Living Room",
  "Bedroom",
  "Kitchen",
  "Bathroom",
  "Office",
  "Dining Room",
  "Kids Room",
  "Outdoor",
  "Studio",
  "Loft",
];

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
  { id: "surprise", label: "Surprise Me", colors: ["#f8fafc", "#111827"] },
  { id: "gray", label: "Millennial Gray", colors: ["#d1d5db", "#6b7280"] },
  { id: "sunset", label: "Neon Sunset", colors: ["#fb7185", "#f59e0b"] },
  { id: "oasis", label: "Coastal Fog", colors: ["#bae6fd", "#0ea5e9"] },
  { id: "luxe", label: "Midnight Luxe", colors: ["#0f172a", "#22d3ee"] },
  { id: "sage", label: "Sage Calm", colors: ["#a7f3d0", "#0f766e"] },
  { id: "sand", label: "Warm Sand", colors: ["#fbbf24", "#f97316"] },
  { id: "mono", label: "Monochrome", colors: ["#e4e4e7", "#18181b"] },
];

const SERVICE_LABELS: Record<string, string> = {
  "media-wall": "Media Wall Design",
  facade: "Architectural Facade",
  garden: "Designer Sanctuary",
  floor: "Instant Floor Refresh",
  paint: "Smart Wall Paint",
  "master-suite": "Interior Masterpiece",
};

const inputImage = require("../assets/media/empty-room.jpg");
const resultImage = require("../assets/media/after-luxury.jpg");

export default function WizardScreen() {
  const router = useRouter();
  const { service } = useLocalSearchParams<{ service?: string }>();
  const { width } = useWindowDimensions();

  const [step, setStep] = useState(0);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedPalette, setSelectedPalette] = useState<string | null>(null);

  const columns = width > 420 ? 3 : 2;
  const serviceLabel = service ? SERVICE_LABELS[String(service)] ?? "Redesign" : "Redesign";

  useEffect(() => {
    if (step === 3) {
      const timer = setTimeout(() => setStep(4), 1600);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [step]);

  const progress = useMemo(() => {
    const labels = ["Room", "Style", "Palette", "Processing", "Result"];
    return labels.map((label, index) => ({ label, active: index <= step }));
  }, [step]);

  const handleNext = () => {
    if (step === 0 && !selectedRoom) {
      Alert.alert("Pick a room", "Select a room type to continue.");
      return;
    }
    if (step === 1 && !selectedStyle) {
      Alert.alert("Pick a style", "Select a design style to continue.");
      return;
    }
    if (step === 2 && !selectedPalette) {
      Alert.alert("Pick a palette", "Select a color palette to continue.");
      return;
    }
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    if (step === 0) {
      router.back();
      return;
    }
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const handlePrimaryAction = (label: string) => {
    Alert.alert(label, "This action will trigger the editing tool (mock)." );
  };

  const handleDownload = () => {
    Alert.alert("Download", "Saved to your gallery (mock)." );
  };

  const handleShare = async () => {
    await Share.share({ message: "Check out my Darkor.ai redesign!" });
  };

  const handleUpscale = () => {
    Alert.alert("Upscale", "Upscale queued (mock)." );
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={[styles.backButton, styles.pointer]}>
          <ArrowLeft color="#e4e4e7" size={18} />
        </Pressable>
        <View>
          <Text style={styles.eyebrow}>Try It!</Text>
          <Text style={styles.title}>{serviceLabel}</Text>
        </View>
      </View>

      <View style={styles.progressRow}>
        {progress.map((item) => (
          <View key={item.label} style={[styles.progressPill, item.active && styles.progressPillActive]}>
            <Text style={[styles.progressText, item.active && styles.progressTextActive]}>{item.label}</Text>
          </View>
        ))}
      </View>

      {step === 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select a room type</Text>
          <View style={styles.grid}>
            {ROOM_OPTIONS.map((room) => {
              const active = selectedRoom === room;
              return (
                <Pressable
                  key={room}
                  onPress={() => setSelectedRoom(room)}
                  style={[styles.gridCard, active && styles.gridCardActive, styles.pointer, { width: `${100 / columns - 4}%` }]}
                >
                  <Text style={[styles.gridCardText, active && styles.gridCardTextActive]}>{room}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {step === 1 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pick a signature style</Text>
          <View style={styles.grid}>
            {STYLE_OPTIONS.map((style) => {
              const active = selectedStyle === style;
              return (
                <Pressable
                  key={style}
                  onPress={() => setSelectedStyle(style)}
                  style={[styles.gridCard, active && styles.gridCardActive, styles.pointer, { width: `${100 / columns - 4}%` }]}
                >
                  <Text style={[styles.gridCardText, active && styles.gridCardTextActive]}>{style}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {step === 2 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Choose a color vibe</Text>
          <View style={styles.grid}>
            {PALETTE_OPTIONS.map((palette) => {
              const active = selectedPalette === palette.id;
              return (
                <Pressable
                  key={palette.id}
                  onPress={() => setSelectedPalette(palette.id)}
                  style={[styles.paletteCard, active && styles.gridCardActive, styles.pointer, { width: `${100 / columns - 4}%` }]}
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

      {step === 3 ? (
        <View style={styles.processingSection}>
          <MotiView
            from={{ opacity: 0.8, scale: 0.96 }}
            animate={{ opacity: [0.8, 1, 0.8], scale: [0.96, 1, 0.96] }}
            transition={{ type: "timing", duration: 1600, loop: true }}
            style={styles.processingCard}
          >
            <Image source={inputImage} style={styles.processingImage} contentFit="cover" />
          </MotiView>
          <Text style={styles.processingTitle}>Processing...</Text>
          <Text style={styles.processingSubtitle}>Crafting a premium redesign in seconds.</Text>
        </View>
      ) : null}

      {step === 4 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your redesign is ready</Text>
          <Image source={resultImage} style={styles.resultImage} contentFit="cover" />

          <View style={styles.toolbar}>
            <Pressable onPress={() => handlePrimaryAction("Replace")} style={[styles.toolbarButton, styles.pointer]}>
              <RefreshCcw color="#e4e4e7" size={16} />
              <Text style={styles.toolbarText}>Replace</Text>
            </Pressable>
            <Pressable onPress={() => handlePrimaryAction("Paint")} style={[styles.toolbarButton, styles.pointer]}>
              <Paintbrush color="#e4e4e7" size={16} />
              <Text style={styles.toolbarText}>Paint</Text>
            </Pressable>
            <Pressable onPress={() => handlePrimaryAction("New Floor")} style={[styles.toolbarButton, styles.pointer]}>
              <SwatchBook color="#e4e4e7" size={16} />
              <Text style={styles.toolbarText}>New Floor</Text>
            </Pressable>
          </View>

          <View style={styles.secondaryRow}>
            <Pressable onPress={handleDownload} style={[styles.secondaryButton, styles.pointer]}>
              <Download color="#a1a1aa" size={16} />
              <Text style={styles.secondaryText}>Download</Text>
            </Pressable>
            <Pressable onPress={handleShare} style={[styles.secondaryButton, styles.pointer]}>
              <Share2 color="#a1a1aa" size={16} />
              <Text style={styles.secondaryText}>Share</Text>
            </Pressable>
            <Pressable onPress={handleUpscale} style={[styles.secondaryButton, styles.pointer]}>
              <Sparkles color="#a1a1aa" size={16} />
              <Text style={styles.secondaryText}>Upscale</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {step < 3 ? (
        <View style={styles.footer}>
          <Pressable onPress={handleBack} style={[styles.secondaryButton, styles.pointer]}>
            <Text style={styles.secondaryText}>Back</Text>
          </Pressable>
          <Pressable onPress={handleNext} style={[styles.primaryButton, styles.pointer]}>
            <Text style={styles.primaryText}>{step === 2 ? "Generate" : "Next"}</Text>
          </Pressable>
        </View>
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
    paddingBottom: 120,
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
  progressRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  progressPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  progressPillActive: {
    backgroundColor: "rgba(34, 211, 238, 0.18)",
    borderColor: "rgba(34, 211, 238, 0.6)",
  },
  progressText: {
    color: "#71717a",
    fontSize: 11,
    fontWeight: "600",
  },
  progressTextActive: {
    color: "#e0f2fe",
  },
  section: {
    gap: 14,
  },
  sectionTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "700",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gridCard: {
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
    borderColor: "rgba(34, 211, 238, 0.8)",
    backgroundColor: "rgba(34, 211, 238, 0.12)",
  },
  gridCardText: {
    color: "#d4d4d8",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  gridCardTextActive: {
    color: "#e0f2fe",
  },
  paletteCard: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(24, 24, 27, 0.9)",
    gap: 10,
  },
  paletteSwatches: {
    flexDirection: "row",
    gap: 6,
  },
  paletteSwatch: {
    flex: 1,
    height: 28,
    borderRadius: 10,
  },
  processingSection: {
    alignItems: "center",
    gap: 14,
    paddingVertical: 30,
  },
  processingCard: {
    width: 220,
    height: 220,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  processingImage: {
    width: "100%",
    height: "100%",
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
  resultImage: {
    width: "100%",
    height: 320,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  toolbar: {
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
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#22d3ee",
    alignItems: "center",
  },
  primaryText: {
    color: "#0f172a",
    fontWeight: "700",
  },
  pointer: {
    cursor: "pointer",
  },
});
