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
    id: "interior-design",
    title: "Interior Design",
    subtitle: "Upload a pic, choose a style, let AI design the room!",
    video: require("../../assets/videos/media-wall.mp4"),
    serviceParam: "interior",
  },
  {
    id: "exterior-design",
    title: "Exterior Design",
    subtitle: "Snap your home, pick a vibe, let AI craft the facade!",
    video: require("../../assets/videos/facade.mp4"),
    serviceParam: "facade",
  },
  {
    id: "garden-design",
    title: "Garden Design",
    subtitle: "Choose a style you adore and give your garden a whole new vibe.",
    video: require("../../assets/videos/garden.mp4"),
    serviceParam: "garden",
  },
  {
    id: "ai-paint",
    title: "AI Paint",
    subtitle: "Pick any color you love and transform your space with just a touch!",
    video: require("../../assets/videos/paint.mp4"),
    serviceParam: "paint",
  },
  {
    id: "floor-restyle",
    title: "Floor Restyle",
    subtitle: "Edit floor plans with AI ? rearrange rooms in one tap!",
    video: require("../../assets/videos/floor.mp4"),
    serviceParam: "floor",
  },
  {
    id: "reference-style",
    title: "Reference Style",
    subtitle: "Show AI what you like and let it apply it to your room!",
    video: require("../../assets/videos/master-suite.mp4"),
    serviceParam: "reference",
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
        colors={["rgba(0,0,0,0.06)", "rgba(0,0,0,0.14)", "rgba(0,0,0,0.68)"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <View style={styles.cardContent}>
        <View style={styles.copyBlock}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
        </View>

        <View style={styles.cardFooter}>
          <View />
          <BlurView intensity={70} tint="dark" style={styles.ctaGlass}>
            <LuxPressable onPress={handlePress} style={styles.ctaButton}>
              <Text style={styles.ctaText}>Try it!</Text>
            </LuxPressable>
          </BlurView>
        </View>
      </View>
    </View>
  );
});

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const cardHeight = useMemo(() => Math.max(316, Math.min(388, Math.round(width * 0.96))), [width]);

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
          paddingTop: insets.top + 20,
          paddingHorizontal: 16,
          paddingBottom: Math.max(insets.bottom + 120, 136),
          gap: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Darkor.ai Premium</Text>
          <Text style={styles.title}>Choose Your Transformation</Text>
          <Text style={styles.subtitle}>
            Six premium AI design tools, rebuilt to feel clean, fast, and finished from the first tap.
          </Text>
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
    gap: 14,
    marginBottom: 6,
    paddingRight: 14,
  },
  eyebrow: {
    color: "#a1a1aa",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2.6,
    textTransform: "uppercase",
  },
  title: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 40,
  },
  subtitle: {
    color: "#a1a1aa",
    fontSize: 16,
    lineHeight: 25,
    maxWidth: 680,
  },
  card: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 32,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#050505",
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContent: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 22,
  },
  copyBlock: {
    marginTop: "auto",
    gap: 10,
    maxWidth: "72%",
  },
  cardTitle: {
    color: "#ffffff",
    fontSize: 29,
    fontWeight: "800",
    lineHeight: 33,
  },
  cardSubtitle: {
    color: "#d4d4d8",
    fontSize: 15,
    lineHeight: 22,
  },
  cardFooter: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  ctaGlass: {
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  ctaButton: {
    minWidth: 108,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.78)",
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  ctaText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
});
