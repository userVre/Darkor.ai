import { MotiImage, MotiView } from "moti";
import { useEffect, useRef, useState } from "react";
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
};

function StackCard({ source, entered, finalRotate, zIndex, finalX, finalY, delay }: StackCardProps) {
  return (
    <MotiView
      className="absolute"
      style={{ zIndex }}
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
      <MotiImage source={source} resizeMode="cover" className="h-full w-full rounded-xl" style={styles.polaroidCard} />
    </MotiView>
  );
}

export default function HeroTransformation() {
  const rootRef = useRef<View | null>(null);
  const rafRef = useRef<number | null>(null);
  const [entered, setEntered] = useState(false);
  const { width, height } = useWindowDimensions();

  const beforeWidth = Math.min(194, width * 0.43);
  const beforeHeight = beforeWidth * 1.2;
  const stackWidth = Math.min(170, width * 0.39);
  const stackHeight = stackWidth * 1.18;

  useEffect(() => {
    const checkInView = () => {
      if (!rootRef.current || entered) return;
      rootRef.current.measureInWindow((_, y, __, h) => {
        const inView = y < height * 0.9 && y + h > 0;
        if (inView) {
          setEntered(true);
          return;
        }
        rafRef.current = requestAnimationFrame(checkInView);
      });
    };

    rafRef.current = requestAnimationFrame(checkInView);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [entered, height]);

  return (
    <View ref={rootRef} className="mt-8 px-5">
      <View className="rounded-3xl border border-white/10 bg-zinc-900/60 px-3 py-4">
        <View className="flex-row items-center justify-between">
          <MotiImage
            source={require("../../assets/media/empty-room.jpg")}
            resizeMode="cover"
            className="rounded-xl border border-white/20"
            style={{ width: beforeWidth, height: beforeHeight }}
            from={{ opacity: 0, translateX: -8 }}
            animate={{ opacity: 1, translateX: 0 }}
            transition={{ duration: 500 }}
          />

          <View className="items-center justify-center px-1" style={{ width: Math.max(40, width * 0.1) }}>
            <Svg width="40" height="26" viewBox="0 0 40 26" fill="none">
              <Path
                d="M2 13C8 9 12 8 18 13C22 16 27 17 33 12"
                stroke="white"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              <Path d="M28.5 8.3L37 11.8L30.5 18.2" stroke="white" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
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
            />
            <StackCard
              source={require("../../assets/media/after-cyberpunk.jpg")}
              entered={entered}
              finalRotate="2deg"
              zIndex={20}
              finalX={2}
              finalY={0}
              delay={250}
            />
            <StackCard
              source={require("../../assets/media/after-boho.jpg")}
              entered={entered}
              finalRotate="-6deg"
              zIndex={30}
              finalX={-10}
              finalY={-12}
              delay={340}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  polaroidCard: {
    width: "100%",
    height: "100%",
    borderWidth: 4,
    borderColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 18,
  },
});
