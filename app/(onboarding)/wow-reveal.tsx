import {Image} from "expo-image";
import {Stack, useRouter} from "expo-router";
import {StatusBar} from "expo-status-bar";
import {usePostHog} from "posthog-react-native";
import {useCallback, useEffect, useRef} from "react";
import {Pressable, StyleSheet, Text, View} from "react-native";
import Animated, {useAnimatedStyle, useSharedValue, withSpring, withTiming} from "react-native-reanimated";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {useOnboardingDemoRender} from "../../components/onboarding-demo-render-context";
import {captureAnalytics} from "../../lib/analytics";
import {triggerHaptic} from "../../lib/haptics";
import {fonts} from "../../styles/typography";

export default function WowRevealScreen() {
  const router = useRouter();
  const posthog = usePostHog();
  const insets = useSafeAreaInsets();
  const {imageUrl, status} = useOnboardingDemoRender();
  const didOpenPaywallRef = useRef(false);
  const imageProgress = useSharedValue(0);
  const copyProgress = useSharedValue(0);

  const openPostWowPaywall = useCallback(() => {
    if (didOpenPaywallRef.current) {
      return;
    }

    didOpenPaywallRef.current = true;
    triggerHaptic();
    router.push({
      pathname: "/paywall",
      params: {
        source: "post_wow",
        variant: "soft",
        redirectTo: "/(tabs)",
        lastImageUrl: imageUrl ?? undefined,
      },
    } as never);
  }, [imageUrl, router]);

  useEffect(() => {
    if (status === "failed" || !imageUrl) {
      router.replace({
        pathname: "/paywall",
        params: {
          source: "post_wow",
          variant: "soft",
          redirectTo: "/(tabs)",
        },
      } as never);
      return;
    }

    captureAnalytics(posthog, "onboarding_wow_viewed", {
      paywall_source: "post_wow",
    });

    imageProgress.value = withSpring(1, {
      damping: 18,
      mass: 0.9,
      stiffness: 120,
    });
    copyProgress.value = withTiming(1, {duration: 420});

    const timer = setTimeout(openPostWowPaywall, 2000);
    return () => clearTimeout(timer);
  }, [copyProgress, imageProgress, imageUrl, openPostWowPaywall, posthog, router, status]);

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: imageProgress.value,
    transform: [
      {translateY: (1 - imageProgress.value) * 220},
      {scale: 0.96 + imageProgress.value * 0.04},
    ],
  }));

  const copyAnimatedStyle = useAnimatedStyle(() => ({
    opacity: copyProgress.value,
    transform: [{translateY: (1 - copyProgress.value) * 16}],
  }));

  if (!imageUrl) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{headerShown: false}} />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{headerShown: false}} />
      <StatusBar style="light" />
      <Animated.View style={[styles.imageWrap, imageAnimatedStyle]}>
        <Image contentFit="cover" source={{uri: imageUrl}} style={styles.image} transition={0} />
      </Animated.View>

      <View pointerEvents="none" style={styles.scrim} />

      <Animated.View style={[styles.copy, {paddingTop: insets.top + 34}, copyAnimatedStyle]}>
        <Text style={styles.title}>Your room, transformed in seconds.</Text>
      </Animated.View>

      <View style={[styles.footer, {paddingBottom: Math.max(insets.bottom + 18, 28)}]}>
        <Pressable accessibilityRole="button" onPress={openPostWowPaywall} style={styles.primaryButton}>
          <Text style={styles.primaryText}>Start Designing</Text>
        </Pressable>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={openPostWowPaywall} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>See Plans</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#050505",
  },
  imageWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  copy: {
    position: "absolute",
    left: 24,
    right: 24,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 40,
    lineHeight: 45,
    letterSpacing: 0,
    textAlign: "left",
    textShadowColor: "rgba(0, 0, 0, 0.56)",
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 18,
    ...fonts.bold,
  },
  footer: {
    position: "absolute",
    left: 22,
    right: 22,
    bottom: 0,
    gap: 12,
  },
  primaryButton: {
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    borderCurve: "continuous",
    backgroundColor: "#FFFFFF",
  },
  primaryText: {
    color: "#000000",
    fontSize: 17,
    lineHeight: 22,
    ...fonts.bold,
  },
  secondaryButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    color: "rgba(255, 255, 255, 0.86)",
    fontSize: 15,
    lineHeight: 20,
    ...fonts.bold,
  },
});
