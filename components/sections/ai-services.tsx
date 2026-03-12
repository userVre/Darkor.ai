import { BlurView } from "expo-blur";
import { VideoView, useVideoPlayer } from "expo-video";
import { MotiView } from "moti";
import { useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import ScrollReveal from "../scroll-reveal";

type ServiceCard = {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  video: number;
};

const SERVICE_CARDS: ServiceCard[] = [
  {
    id: "media-wall",
    title: "Media Wall Design",
    subtitle: "Upgrade your living room with high-end integrated TV walls and designer furniture.",
    cta: "Try It!",
    video: require("../../assets/videos/media-wall.mp4"),
  },
  {
    id: "facade",
    title: "Architectural Facade",
    subtitle: "Give your home a premium face-lift with modern materials and architectural lighting.",
    cta: "Try It!",
    video: require("../../assets/videos/facade.mp4"),
  },
  {
    id: "garden",
    title: "Designer Sanctuary",
    subtitle: "Transform your backyard into a luxury outdoor retreat with professional landscaping.",
    cta: "Try It!",
    video: require("../../assets/videos/garden.mp4"),
  },
  {
    id: "floor",
    title: "Instant Floor Refresh",
    subtitle: "Instantly visualize how different hardwood, marble, or stone flooring looks in your room.",
    cta: "Try It!",
    video: require("../../assets/videos/floor.mp4"),
  },
  {
    id: "paint",
    title: "Smart Wall Paint",
    subtitle: "Test thousands of paint colors on your walls realistically without lifting a brush.",
    cta: "Try It!",
    video: require("../../assets/videos/paint.mp4"),
  },
  {
    id: "master-suite",
    title: "Interior Masterpiece",
    subtitle: "Breathe new life into any room with AI-curated furniture and spatial optimization.",
    cta: "Try It!",
    video: require("../../assets/videos/master-suite.mp4"),
  },
];

type AiServicesProps = {
  scrollY: SharedValue<number>;
  onCtaPress: (serviceId: string) => void;
};

type ServiceCardProps = {
  data: ServiceCard;
  height: number;
  index: number;
  scrollY: SharedValue<number>;
  onCtaPress: (serviceId: string) => void;
};

function ServiceCardView({ data, height, index, scrollY, onCtaPress }: ServiceCardProps) {
  const [pressed, setPressed] = useState(false);
  const player = useVideoPlayer(data.video, (instance) => {
    instance.loop = true;
    instance.muted = true;
    instance.play();
  });

  return (
    <ScrollReveal scrollY={scrollY} offset={index * 0.08}>
      <Pressable
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        onPress={() => onCtaPress(data.id)}
        style={[styles.pressable, styles.pointer]}
      >
        <MotiView
          animate={{ scale: pressed ? 0.98 : 1 }}
          transition={{ type: "timing", duration: 160 }}
          style={[styles.card, { height }]}
        >
          <VideoView
            player={player}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            nativeControls={false}
            pointerEvents="none"
          />
          <View pointerEvents="none" style={styles.scrim} />

          <BlurView intensity={32} tint="dark" style={styles.glass}>
            <View style={styles.glassContent}>
              <Text style={styles.cardTitle}>{data.title}</Text>
              <Text style={styles.cardSubtitle}>{data.subtitle}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => onCtaPress(data.id)}
                onPressIn={() => setPressed(true)}
                onPressOut={() => setPressed(false)}
                style={[styles.ctaButton, styles.pointer]}
              >
                <Text style={styles.ctaText}>{data.cta}</Text>
              </Pressable>
            </View>
          </BlurView>
        </MotiView>
      </Pressable>
    </ScrollReveal>
  );
}

export default function AiServices({ scrollY, onCtaPress }: AiServicesProps) {
  const { width } = useWindowDimensions();
  const cardHeight = Math.round(width * 0.62);

  return (
    <View style={styles.section}>
      <ScrollReveal scrollY={scrollY}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>AI Services</Text>
          <Text style={styles.title}>Premium transformations, directed like cinema.</Text>
          <Text style={styles.subtitle}>
            Six high-fidelity AI services that feel like a designer-led experience.
          </Text>
        </View>
      </ScrollReveal>

      <View style={styles.stack}>
        {SERVICE_CARDS.map((card, index) => (
          <ServiceCardView
            key={card.id}
            data={card}
            height={cardHeight}
            index={index}
            scrollY={scrollY}
            onCtaPress={onCtaPress}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    gap: 18,
  },
  header: {
    gap: 8,
  },
  eyebrow: {
    color: "#22d3ee",
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  title: {
    color: "#f8fafc",
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 30,
  },
  subtitle: {
    color: "#a1a1aa",
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 320,
  },
  stack: {
    gap: 18,
  },
  pressable: {
    width: "100%",
  },
  pointer: {
    cursor: "pointer",
  },
  card: {
    borderRadius: 24,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
    backgroundColor: "rgba(9, 9, 11, 0.9)",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.15)",
  },
  glass: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  glassContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
  },
  cardTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "700",
  },
  cardSubtitle: {
    color: "#a1a1aa",
    fontSize: 13,
    lineHeight: 18,
  },
  ctaButton: {
    marginTop: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(8, 145, 178, 0.25)",
  },
  ctaText: {
    color: "#e0f2fe",
    fontSize: 13,
    fontWeight: "600",
  },
});
