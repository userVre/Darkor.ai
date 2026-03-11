import { Image } from "expo-image";
import { MotiView } from "moti";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import {
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";

const cards = [
  {
    id: "input",
    title: "Input",
    image: require("../assets/media/before-empty-room.png"),
    highlights: [
      { label: "Maintains construction", ok: true },
      { label: "No staged furnishing", ok: false },
      { label: "Flat lighting", ok: false },
    ],
  },
  {
    id: "darkor",
    title: "Darkor.ai",
    image: require("../assets/media/after-luxury-minimalist.png"),
    badge: "Industry Leader",
    highlights: [
      { label: "Maintains construction", ok: true },
      { label: "High photorealism", ok: true },
      { label: "Production-ready", ok: true },
    ],
    winner: true,
  },
  {
    id: "decorify",
    title: "Decorify",
    image: require("../assets/media/render-after.png"),
    highlights: [
      { label: "Maintains construction", ok: false },
      { label: "Missing windows", ok: false },
      { label: "Warped geometry", ok: false },
    ],
  },
  {
    id: "ai-room",
    title: "AI Room Planner",
    image: require("../assets/media/render.jpg"),
    highlights: [
      { label: "Maintains construction", ok: false },
      { label: "Soft focus", ok: false },
      { label: "Low fidelity", ok: false },
    ],
  },
  {
    id: "roomgpt",
    title: "RoomGPT",
    image: require("../assets/media/after-boho-chic.png"),
    highlights: [
      { label: "Maintains construction", ok: false },
      { label: "Plastic materials", ok: false },
      { label: "Flat lighting", ok: false },
    ],
  },
  {
    id: "dreamstudio",
    title: "Dreamstudio",
    image: require("../assets/media/after-cyberpunk.png"),
    highlights: [
      { label: "Maintains construction", ok: false },
      { label: "Distorted artifacts", ok: false },
      { label: "Unstable textures", ok: false },
    ],
  },
];

type ComparisonGridProps = {
  scrollY: SharedValue<number>;
};

type CardData = (typeof cards)[number];

type FeatureRowProps = {
  label: string;
  ok: boolean;
  index: number;
  visible: boolean;
};

function FeatureRow({ label, ok, index, visible }: FeatureRowProps) {
  return (
    <View style={styles.featureRow}>
      <MotiView
        from={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.6 }}
        transition={{ type: "spring", damping: 14, stiffness: 180, delay: 200 + index * 90 }}
        style={[styles.iconBubble, ok ? styles.iconOk : styles.iconNo]}
      >
        <Text style={styles.iconText}>{ok ? "?" : "?"}</Text>
      </MotiView>
      <Text style={styles.featureText}>{label}</Text>
    </View>
  );
}

type ComparisonCardProps = {
  data: CardData;
  index: number;
  visible: boolean;
};

function ComparisonCard({ data, index, visible }: ComparisonCardProps) {
  const [pressed, setPressed] = useState(false);
  const ringVisible = data.winner === true;

  return (
    <Pressable onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)}>
      <MotiView
        from={{ opacity: 0, translateY: 16 }}
        animate={{
          opacity: visible ? 1 : 0,
          translateY: visible ? 0 : 16,
          scale: pressed ? 0.98 : 1,
          rotateX: pressed ? "2deg" : "0deg",
          rotateY: pressed ? "-2deg" : "0deg",
        }}
        transition={{ type: "timing", duration: 420, delay: index * 120 }}
        style={[styles.card, ringVisible && styles.winnerCard]}
      >
        {ringVisible ? (
          <MotiView
            pointerEvents="none"
            style={styles.winnerRing}
            animate={{ opacity: [0.2, 0.6, 0.2], scale: [1, 1.03, 1] }}
            transition={{ type: "timing", duration: 2200, loop: true }}
          />
        ) : null}

        {data.badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{data.badge}</Text>
          </View>
        ) : null}

        <Image source={data.image} contentFit="cover" style={styles.cardImage} />
        <Text style={styles.cardTitle}>{data.title}</Text>

        <View style={styles.featureList}>
          {data.highlights.map((item, featureIndex) => (
            <FeatureRow
              key={item.label}
              label={item.label}
              ok={item.ok}
              index={featureIndex}
              visible={visible}
            />
          ))}
        </View>
      </MotiView>
    </Pressable>
  );
}

export default function ComparisonGrid({ scrollY }: ComparisonGridProps) {
  const { height } = useWindowDimensions();
  const layoutY = useSharedValue(0);
  const [visible, setVisible] = useState(false);

  useAnimatedReaction(
    () => scrollY.value,
    (value) => {
      if (!visible && value > layoutY.value - height * 0.7) {
        runOnJS(setVisible)(true);
      }
    },
    [height, visible],
  );

  const split = useMemo(() => {
    const left: CardData[] = [];
    const right: CardData[] = [];
    cards.forEach((card, idx) => {
      if (idx % 2 === 0) left.push(card);
      else right.push(card);
    });
    return [left, right];
  }, []);

  return (
    <View
      onLayout={(event) => {
        layoutY.value = event.nativeEvent.layout.y;
      }}
      style={styles.section}
    >
      <Text style={styles.sectionTitle}>How Darkor.ai compares</Text>
      <Text style={styles.sectionSubtitle}>
        Side-by-side outputs show why Darkor.ai leads in construction preservation and premium realism.
      </Text>

      <View style={styles.grid}>
        {split.map((column, columnIndex) => (
          <View key={columnIndex} style={[styles.column, columnIndex === 1 && styles.columnOffset]}>
            {column.map((card, index) => (
              <ComparisonCard
                key={card.id}
                data={card}
                index={index + columnIndex * 3}
                visible={visible}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  sectionTitle: {
    color: "#f8fafc",
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  sectionSubtitle: {
    color: "#a1a1aa",
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
  },
  grid: {
    marginTop: 20,
    flexDirection: "row",
    gap: 12,
  },
  column: {
    flex: 1,
    gap: 12,
  },
  columnOffset: {
    marginTop: 16,
  },
  card: {
    backgroundColor: "rgba(24, 24, 27, 0.75)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 12,
    transform: [{ perspective: 800 }],
  },
  winnerCard: {
    borderColor: "rgba(34, 197, 94, 0.55)",
  },
  winnerRing: {
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "rgba(34, 197, 94, 0.7)",
  },
  badge: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.5)",
    zIndex: 2,
  },
  badgeText: {
    color: "#86efac",
    fontSize: 10,
    fontWeight: "600",
  },
  cardImage: {
    width: "100%",
    height: 120,
    borderRadius: 16,
  },
  cardTitle: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 10,
  },
  featureList: {
    marginTop: 10,
    gap: 8,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBubble: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  iconOk: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.7)",
  },
  iconNo: {
    backgroundColor: "rgba(244, 63, 94, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.6)",
  },
  iconText: {
    color: "#f8fafc",
    fontSize: 10,
    fontWeight: "700",
  },
  featureText: {
    color: "#d4d4d8",
    fontSize: 12,
  },
});

