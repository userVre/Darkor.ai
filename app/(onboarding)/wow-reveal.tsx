import {Image} from "expo-image";
import {CommonActions, useNavigation} from "@react-navigation/native";
import {Stack} from "expo-router";
import {StatusBar} from "expo-status-bar";
import {usePostHog} from "posthog-react-native";
import {useCallback, useEffect, useRef, useState} from "react";
import {Modal, Pressable, StyleSheet, Text, View} from "react-native";
import Animated, {useAnimatedStyle, useSharedValue, withSpring, withTiming} from "react-native-reanimated";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {useOnboardingDemoRender} from "../../components/onboarding-demo-render-context";
import {captureAnalytics} from "../../lib/analytics";
import {triggerHaptic} from "../../lib/haptics";
import {fonts} from "../../styles/typography";

export default function WowRevealScreen() {
  const navigation = useNavigation();
  const posthog = usePostHog();
  const insets = useSafeAreaInsets();
  const {imageUrl, status} = useOnboardingDemoRender();
  const didOpenPaywallRef = useRef(false);
  const didShowRatingRef = useRef(false);
  const didCompleteRatingRef = useRef(false);
  const [ratingVisible, setRatingVisible] = useState(false);
  const imageProgress = useSharedValue(0);
  const copyProgress = useSharedValue(0);

  const openPostWowPaywall = useCallback(() => {
    if (didOpenPaywallRef.current) {
      return;
    }

    didOpenPaywallRef.current = true;
    triggerHaptic();
    navigation.dispatch(CommonActions.navigate({
      name: "paywall",
      params: {
        source: "post_wow",
        redirectTo: "/(tabs)",
        lastImageUrl: imageUrl ?? undefined,
      },
    } as never));
  }, [imageUrl, navigation]);

  const completeRatingPrompt = useCallback((action: "submitted" | "dismissed") => {
    if (didCompleteRatingRef.current) {
      return;
    }

    didCompleteRatingRef.current = true;
    setRatingVisible(false);
    captureAnalytics(posthog, "onboarding_rating_prompt_completed", {
      action,
      requested_stars: 5,
    });
    setTimeout(openPostWowPaywall, 0);
  }, [openPostWowPaywall, posthog]);

  const showRatingPrompt = useCallback(() => {
    if (didCompleteRatingRef.current) {
      openPostWowPaywall();
      return;
    }

    if (!didShowRatingRef.current) {
      didShowRatingRef.current = true;
      captureAnalytics(posthog, "onboarding_rating_prompt_viewed", {
        requested_stars: 5,
      });
    }

    setRatingVisible(true);
  }, [openPostWowPaywall, posthog]);

  useEffect(() => {
    if (status === "failed" || !imageUrl) {
      navigation.dispatch(CommonActions.navigate({
        name: "paywall",
        params: {
          source: "post_wow",
          redirectTo: "/(tabs)",
        },
      } as never));
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

    const timer = setTimeout(showRatingPrompt, 650);
    return () => clearTimeout(timer);
  }, [copyProgress, imageProgress, imageUrl, navigation, posthog, showRatingPrompt, status]);

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
        <Pressable accessibilityRole="button" onPress={showRatingPrompt} style={styles.primaryButton}>
          <Text style={styles.primaryText}>Start Designing</Text>
        </Pressable>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={showRatingPrompt} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>See Plans</Text>
        </Pressable>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => completeRatingPrompt("dismissed")}
        transparent
        visible={ratingVisible}
      >
        <View style={styles.ratingOverlay}>
          <View style={styles.ratingCard}>
            <Text style={styles.ratingStars}>5 stars</Text>
            <Text style={styles.ratingTitle}>Love your design?</Text>
            <Text style={styles.ratingBody}>Rate us!</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => completeRatingPrompt("submitted")}
              style={styles.ratingPrimaryButton}
            >
              <Text style={styles.ratingPrimaryText}>Rate 5 Stars</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => completeRatingPrompt("dismissed")}
              style={styles.ratingSecondaryButton}
            >
              <Text style={styles.ratingSecondaryText}>Not Now</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  ratingOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.58)",
    paddingHorizontal: 24,
  },
  ratingCard: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    borderRadius: 24,
    borderCurve: "continuous",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 22,
    paddingVertical: 24,
    gap: 12,
  },
  ratingStars: {
    color: "#FFB800",
    fontSize: 27,
    lineHeight: 32,
    letterSpacing: 0,
    ...fonts.bold,
  },
  ratingTitle: {
    color: "#000000",
    fontSize: 24,
    lineHeight: 30,
    textAlign: "center",
    letterSpacing: 0,
    ...fonts.bold,
  },
  ratingBody: {
    color: "rgba(0, 0, 0, 0.66)",
    fontSize: 17,
    lineHeight: 22,
    textAlign: "center",
    ...fonts.medium,
  },
  ratingPrimaryButton: {
    width: "100%",
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderCurve: "continuous",
    backgroundColor: "#000000",
    marginTop: 6,
  },
  ratingPrimaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 22,
    ...fonts.bold,
  },
  ratingSecondaryButton: {
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingSecondaryText: {
    color: "rgba(0, 0, 0, 0.62)",
    fontSize: 14,
    lineHeight: 18,
    ...fonts.medium,
  },
});
