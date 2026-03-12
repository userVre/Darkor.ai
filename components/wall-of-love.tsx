import { MotiView } from "moti";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

const testimonials = [
  {
    id: "sarah",
    quote: "Darkor.ai saved me over $2,000 in design fees and helped listings close faster.",
    name: "Sarah Collins",
    role: "Real Estate Broker",
    initials: "SC",
  },
  {
    id: "olivia",
    quote: "The visual quality is premium enough for client proposals and mood boards.",
    name: "Olivia Grant",
    role: "Interior Stylist",
    initials: "OG",
  },
  {
    id: "maya",
    quote: "I used Darkor.ai to test multiple looks and picked the one that booked instantly.",
    name: "Maya Chen",
    role: "Airbnb Host",
    initials: "MC",
  },
  {
    id: "amir",
    quote: "I redesigned my entire living room in one evening and finally saw a clear direction.",
    name: "Amir Rahmani",
    role: "Homeowner",
    initials: "AR",
  },
  {
    id: "daniel",
    quote: "Virtual staging previews increased buyer interest before we even finished renovation.",
    name: "Daniel Pierce",
    role: "Property Investor",
    initials: "DP",
  },
  {
    id: "nadia",
    quote: "Sketch2Image lets us communicate concepts to non-technical clients in seconds.",
    name: "Nadia Bell",
    role: "Architect",
    initials: "NB",
  },
];

type Testimonial = (typeof testimonials)[number];

type GlowBorderProps = {
  visible: boolean;
  width: number;
  height: number;
  radius: number;
  gradientId: string;
};

function GlowBorder({ visible, width, height, radius, gradientId }: GlowBorderProps) {
  if (!width || !height) return null;

  return (
    <MotiView
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ type: "timing", duration: 180 }}
    >
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#ec4899" stopOpacity="0.9" />
            <Stop offset="0.5" stopColor="#a855f7" stopOpacity="0.9" />
            <Stop offset="1" stopColor="#22d3ee" stopOpacity="0.9" />
          </LinearGradient>
        </Defs>
        <Rect
          x={1}
          y={1}
          width={width - 2}
          height={height - 2}
          rx={radius}
          ry={radius}
          fill="transparent"
          stroke={`url(#${gradientId})`}
          strokeWidth={2}
        />
      </Svg>
    </MotiView>
  );
}

type TestimonialCardProps = {
  testimonial: Testimonial;
  delay: number;
};

function TestimonialCard({ testimonial, delay }: TestimonialCardProps) {
  const [pressed, setPressed] = useState(false);
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const gradientId = useMemo(() => `glow-${testimonial.id}`, [testimonial.id]);
  const radius = 20;

  return (
    <Pressable onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)} style={styles.pointer}>
      <MotiView
        onLayout={(event) => setLayout(event.nativeEvent.layout)}
        from={{ opacity: 0, translateY: 14 }}
        animate={{ opacity: 1, translateY: 0, scale: pressed ? 0.97 : 1 }}
        transition={{ type: "timing", duration: 420, delay }}
        style={styles.card}
      >
        <GlowBorder
          visible={pressed}
          width={layout.width}
          height={layout.height}
          radius={radius}
          gradientId={gradientId}
        />
        <Text style={styles.stars}>?????</Text>
        <Text style={styles.quote}>�{testimonial.quote}�</Text>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{testimonial.initials}</Text>
          </View>
          <View>
            <Text style={styles.name}>{testimonial.name}</Text>
            <Text style={styles.role}>{testimonial.role}</Text>
          </View>
        </View>
      </MotiView>
    </Pressable>
  );
}

export default function WallOfLove() {
  const columns = useMemo(() => {
    const left: Testimonial[] = [];
    const right: Testimonial[] = [];
    testimonials.forEach((item, index) => {
      if (index % 2 === 0) left.push(item);
      else right.push(item);
    });
    return [left, right];
  }, []);

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Wall of Love</Text>
      <Text style={styles.subtitle}>
        Real professionals use Darkor.ai daily to sell faster, design smarter, and visualize instantly.
      </Text>

      <View style={styles.grid}>
        {columns.map((column, columnIndex) => (
          <View key={columnIndex} style={[styles.column, columnIndex === 1 && styles.columnOffset]}>
            {column.map((item, itemIndex) => (
              <TestimonialCard
                key={item.id}
                testimonial={item}
                delay={columnIndex * 120 + itemIndex * 140}
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
  title: {
    color: "#f8fafc",
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    color: "#a1a1aa",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
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
    marginTop: 18,
  },
  card: {
    backgroundColor: "rgba(24, 24, 27, 0.5)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 16,
  },
  stars: {
    color: "#facc15",
    letterSpacing: 2,
    fontSize: 14,
  },
  quote: {
    color: "#f4f4f5",
    fontSize: 13,
    marginTop: 10,
    lineHeight: 18,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#e4e4e7",
    fontWeight: "600",
    fontSize: 12,
  },
  name: {
    color: "#f8fafc",
    fontWeight: "600",
    fontSize: 13,
  },
  role: {
    color: "#a1a1aa",
    fontSize: 12,
  },

  pointer: {
    cursor: "pointer",
  },
});
