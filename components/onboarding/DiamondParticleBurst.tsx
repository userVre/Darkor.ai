import {forwardRef, memo, useCallback, useEffect, useImperativeHandle, useRef, useState} from "react";
import {StyleSheet, View} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

export type DiamondParticleBurstHandle = {
  burst: () => void;
};

type ParticleConfig = {
  id: number;
  translateX: number;
  translateY: number;
};

const PARTICLE_COUNT = 12;
const PARTICLE_SIZE = 6;
const GOLD = "#F4C430";

function createParticles() {
  return Array.from({length: PARTICLE_COUNT}, (_, index) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 60 + Math.random() * 40;

    return {
      id: Date.now() + index,
      translateX: Math.cos(angle) * distance,
      translateY: Math.sin(angle) * distance,
    };
  });
}

const Particle = memo(function Particle({translateX, translateY}: ParticleConfig) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    x.value = withSequence(
      withTiming(translateX * 0.35, {duration: 150, easing: Easing.out(Easing.quad)}),
      withTiming(translateX, {duration: 550, easing: Easing.out(Easing.cubic)}),
    );
    y.value = withSequence(
      withTiming(translateY * 0.35, {duration: 150, easing: Easing.out(Easing.quad)}),
      withTiming(translateY, {duration: 550, easing: Easing.out(Easing.cubic)}),
    );
    scale.value = withSequence(
      withTiming(1.5, {duration: 180, easing: Easing.out(Easing.quad)}),
      withTiming(0, {duration: 520, easing: Easing.in(Easing.cubic)}),
    );
    opacity.value = withTiming(0, {duration: 700, easing: Easing.out(Easing.cubic)});
  }, [opacity, scale, translateX, translateY, x, y]);

  const particleStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      {translateX: x.value},
      {translateY: y.value},
      {scale: scale.value},
    ],
  }));

  return <Animated.View pointerEvents="none" style={[styles.particle, particleStyle]} />;
});

export const DiamondParticleBurst = forwardRef<DiamondParticleBurstHandle>(function DiamondParticleBurst(_, ref) {
  const [particles, setParticles] = useState<ParticleConfig[]>([]);
  const cleanupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const burst = useCallback(() => {
    if (cleanupTimerRef.current) {
      clearTimeout(cleanupTimerRef.current);
    }

    setParticles(createParticles());
    cleanupTimerRef.current = setTimeout(() => {
      setParticles([]);
      cleanupTimerRef.current = null;
    }, 760);
  }, []);

  useImperativeHandle(ref, () => ({burst}), [burst]);

  useEffect(() => {
    return () => {
      if (cleanupTimerRef.current) {
        clearTimeout(cleanupTimerRef.current);
      }
    };
  }, []);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map((particle) => (
        <Particle key={particle.id} {...particle} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  particle: {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: PARTICLE_SIZE,
    height: PARTICLE_SIZE,
    marginLeft: -PARTICLE_SIZE / 2,
    marginTop: -PARTICLE_SIZE / 2,
    borderRadius: PARTICLE_SIZE / 2,
    backgroundColor: GOLD,
  },
});
