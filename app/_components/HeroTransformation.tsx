import { MotiImage, MotiView } from "moti";
import { useEffect, useState } from "react";
import { ImageSourcePropType, StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Path } from "react-native-svg";

type StackCardProps = {
  source: ImageSourcePropType;
  entered: boolean;
  finalRotate: string;
  zIndex: number;
  finalX: number;
  finalY: number;
  delay: number;
  width: number;
  height: number;
};

function StackCard({
  source,
  entered,
  finalRotate,
  zIndex,
  finalX,
  finalY,
  delay,
  width,
  height,
}: StackCardProps) {
  return (
    <MotiView
      className="absolute"
      style={{ zIndex, width, height }}
      from={{ opacity: 0, translateX: 2, translateY: 8, rotate: "0deg", scale: 0.96 }}
      animate={{
        opacity: entered ? 1 : 0,
        translateX: entered ? finalX : 2,
        translateY: entered ? finalY : 8,
        rotate: entered ? finalRotate : "0deg",
        scale: entered ? 1 : 0.96,
      }}
      transition={{ type: "timing", duration: 720, delay }}
    >
      <MotiImage source={source} resizeMode="cover" className="h-full w-full rounded-2xl" style={styles.polaroidCard} />
    </MotiView>
  );
}

export default function HeroTransformation() {
  const [entered, setEntered] = useState(false);
  const { width } = useWindowDimensions();

  const beforeWidth = Math.min(194, width * 0.43);
  const beforeHeight = beforeWidth * 1.2;
  const stackWidth = Math.min(170, width * 0.39);
  const stackHeight = stackWidth * 1.18;

  useEffect(() => {
    const timer = setTimeout(() => setEntered(true), 180);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View className="mt-8 px-5">
      <View className="rounded-3xl border border-white/10 bg-zinc-900/60 px-3 py-4" style={styles.heroShell}>
        <View className="flex-row items-center justify-between">
          <MotiImage
            source={require("../../assets/media/empty-room.jpg")}
            resizeMode="cover"
            className="rounded-2xl border border-white/20"
            style={{ width: beforeWidth, height: beforeHeight }}
            from={{ opacity: 0, translateX: -8 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ duration: 500 }}
          />

          <View className="items-center justify-center px-1" style={{ width: Math.max(44, width * 0.12) }}>
            <Svg width="44" height="28" viewBox="0 0 44 28" fill="none">
              <Path
                d="M2 15C9 10 14 9 20 14C24 17 29 18 36 13"
                stroke="white"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeDasharray="2 4"
              />
              <Path
                d="M31 8.5L40.5 12.5L32.5 19.5"
                stroke="white"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>

          <View style={{ width: stackWidth + 24, height: stackHeight + 28 }}>
            <StackCard
              source={require("../../assets/media/after-luxury.jpg")}
              entered={entered}
              finalRotate="12deg"
              zIndex={10}
              finalX={14}
              finalY={16}
              delay={160}
              width={stackWidth}
              height={stackHeight}
            />
            <StackCard
              source={require("../../assets/media/after-cyberpunk.jpg")}
              entered={entered}
              finalRotate="2deg"
              zIndex={20}
              finalX={2}
              finalY={0}
              delay={250}
              width={stackWidth}
              height={stackHeight}
            />
            <StackCard
              source={require("../../assets/media/after-boho.jpg")}
              entered={entered}
              finalRotate="-6deg"
              zIndex={30}
              finalX={-10}
              finalY={-12}
              delay={340}
              width={stackWidth}
              height={stackHeight}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroShell: {
    borderRadius: 28,
    shadowColor: "#0ea5e9",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 18,
  },
  polaroidCard: {
    width: "100%",
    height: "100%",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.55)",
    shadowColor: "#000000",
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
  },
});
