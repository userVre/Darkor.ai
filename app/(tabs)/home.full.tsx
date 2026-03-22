import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import { memo, useCallback, useEffect, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LuxPressable } from "../../components/lux-pressable";
import { triggerHaptic } from "../../lib/haptics";

type ServiceCardData = {
  id: string;
  title: string;
  subtitle: string;
  video: number;
  serviceParam: string;
};

const SERVICE_CARDS: ServiceCardData[] = [
  {
    id: "media-wall",
    title: "Media Wall Masterpiece",
    subtitle: "OLED drama, warm timber slats, and a cinematic glow for statement living spaces.",
    video: require("../../assets/videos/media-wall.mp4"),
    serviceParam: "interior",
  },
  {
    id: "facade",
    title: "Architectural Facade",
    subtitle: "Contemporary limestone elevation with bold geometry and luxury curb appeal.",
    video: require("../../assets/videos/facade.mp4"),
    serviceParam: "facade",
  },
  {
    id: "garden",
    title: "Designer Sanctuary",
    subtitle: "Decked outdoor living with fire pit ambience and premium landscape styling.",
    video: require("../../assets/videos/garden.mp4"),
    serviceParam: "garden",
  },
  {
    id: "floor",
    title: "Instant Floor Restyle",
    subtitle: "See surfaces transform from dated tile into rich hardwood in seconds.",
    video: require("../../assets/videos/floor.mp4"),
    serviceParam: "floor",
  },
  {
    id: "paint",
    title: "Smart Wall Paint",
    subtitle: "Preview bold designer palettes and refined neutrals before you commit.",
    video: require("../../assets/videos/paint.mp4"),
    serviceParam: "paint",
  },
  {
    id: "interior",
    title: "Interior Redesign",
    subtitle: "Luxury suite-level transformations for bedrooms, lounges, and full interiors.",
    video: require("../../assets/videos/master-suite.mp4"),
    serviceParam: "interior-bedroom",
  },
];

type ServiceCardProps = {
  item: ServiceCardData;
  height: number;
  onPress: (item: ServiceCardData) => void;
};

const ServiceCard = memo(function ServiceCard({ item, height, onPress }: ServiceCardProps) {
  const player = useVideoPlayer(item.video, (videoPlayer) => {
    videoPlayer.loop = true;
    videoPlayer.muted = true;
    videoPlayer.volume = 0;
    videoPlayer.timeUpdateEventInterval = 0;
    videoPlayer.play();
  });

  useEffect(() => {
    player.play();
    return () => {
      player.pause();
    };
  }, [player]);

  const handlePress = useCallback(() => {
    triggerHaptic();
    onPress(item);
  }, [item, onPress]);

  return (
    <View style={[styles.card, { height }]}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        surfaceType="textureView"
        nativeControls={false}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["rgba(0,0,0,0.08)", "rgba(0,0,0,0.24)", "rgba(0,0,0,0.74)"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      <BlurView intensity={88} tint="dark" style={styles.overlay}>
        <View style={styles.overlayCopy}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
        </View>
        <LuxPressable onPress={handlePress} style={styles.ctaShell} glowColor="rgba(236, 72, 153, 0.42)">
          <LinearGradient
            colors={["#ec4899", "#a855f7", "#6366f1"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaText}>Try it! -&gt;</Text>
          </LinearGradient>
        </LuxPressable>
      </BlurView>
    </View>
  );
});

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const cardHeight = useMemo(() => Math.max(300, Math.min(380, Math.round(width * 0.92))), [width]);

  const handleServicePress = useCallback(
    (item: ServiceCardData) => {
      router.push({ pathname: "/workspace", params: { service: item.serviceParam } });
    },
    [router],
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + 18,
          paddingHorizontal: 16,
          paddingBottom: Math.max(insets.bottom + 120, 136),
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Darkor.ai Premium</Text>
          <Text style={styles.title}>Choose Your Transformation</Text>
          <Text style={styles.subtitle}>Six signature AI redesign experiences, each built to feel like a finished product from the first tap.</Text>
        </View>

        {SERVICE_CARDS.map((item) => (
          <ServiceCard key={item.id} item={item} height={cardHeight} onPress={handleServicePress} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000000",
  },
  scroll: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    gap: 8,
    marginBottom: 4,
  },
  eyebrow: {
    color: "#a1a1aa",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2.2,
    textTransform: "uppercase",
  },
  title: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 38,
  },
  subtitle: {
    color: "#d4d4d8",
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 640,
  },
  card: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 24,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#050505",
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    borderRadius: 22,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(10,10,10,0.28)",
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 16,
  },
  overlayCopy: {
    gap: 8,
  },
  cardTitle: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 28,
  },
  cardSubtitle: {
    color: "#e4e4e7",
    fontSize: 14,
    lineHeight: 20,
    maxWidth: 420,
  },
  ctaShell: {
    alignSelf: "flex-start",
    borderRadius: 999,
  },
  ctaGradient: {
    minWidth: 138,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  ctaText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
});
