import {CommonActions, useNavigation} from "@react-navigation/native";
import {Stack} from "expo-router";
import {StatusBar} from "expo-status-bar";
import {usePostHog} from "posthog-react-native";
import {useCallback, useEffect, useRef, useState} from "react";
import {Modal, Pressable, StyleSheet, Text, View} from "react-native";
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from "react-native-reanimated";
import {useSafeAreaInsets} from "react-native-safe-area-context";

import {useOnboardingDemoRender} from "../../components/onboarding-demo-render-context";
import {captureAnalytics} from "../../lib/analytics";
import {triggerHaptic} from "../../lib/haptics";
import {fonts} from "../../styles/typography";

const PURE_WHITE = "#FFFFFF";
const BLACK = "#000000";
const DARK_GRAY = "#3A3A3A";

export default function WowRevealScreen() {
  const navigation = useNavigation();
  const posthog = usePostHog();
  const insets = useSafeAreaInsets();
  const {imageUrl, status} = useOnboardingDemoRender();
  const didOpenPaywallRef = useRef(false);
  const didShowRatingRef = useRef(false);
  const didCompleteRatingRef = useRef(false);
  const [ratingVisible, setRatingVisible] = useState(false);
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

    copyProgress.value = withTiming(1, {duration: 420});

    const timer = setTimeout(showRatingPrompt, 650);
    return () => clearTimeout(timer);
  }, [copyProgress, imageUrl, navigation, posthog, showRatingPrompt, status]);

  const copyAnimatedStyle = useAnimatedStyle(() => ({
    opacity: copyProgress.value,
    transform: [{translateY: (1 - copyProgress.value) * 16}],
  }));

  if (!imageUrl) {
    return (
      <View style={styles.screen}>
        <Stack.Screen options={{headerShown: false}} />
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{headerShown: false}} />
      <StatusBar style="dark" />

      <Animated.View style={[styles.copy, {paddingTop: insets.top + 34}, copyAnimatedStyle]}>
        <Text style={styles.title}>Design ready</Text>
        <Text style={styles.subtitle}>Your first render is ready.</Text>
      </Animated.View>

      <View style={[styles.footer, {paddingBottom: Math.max(insets.bottom + 18, 28)}]}>
        <Pressable accessibilityRole="button" onPress={showRatingPrompt} style={styles.primaryButton}>
          <Text style={styles.primaryText}>Continue</Text>
        </Pressable>
        <Pressable accessibilityRole="button" hitSlop={12} onPress={showRatingPrompt} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Plans</Text>
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
            <Text style={styles.ratingTitle}>Enjoying it?</Text>
            <Text style={styles.ratingBody}>Rate Darkor.</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => completeRatingPrompt("submitted")}
              style={styles.ratingPrimaryButton}
            >
              <Text style={styles.ratingPrimaryText}>Rate Darkor</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => completeRatingPrompt("dismissed")}
              style={styles.ratingSecondaryButton}
            >
              <Text style={styles.ratingSecondaryText}>Later</Text>
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
    backgroundColor: PURE_WHITE,
  },
  copy: {
    position: "absolute",
    left: 24,
    right: 24,
    gap: 12,
  },
  title: {
    color: BLACK,
    fontSize: 42,
    lineHeight: 48,
    letterSpacing: 0.3,
    textAlign: "left",
    ...fonts.bold,
  },
  subtitle: {
    color: DARK_GRAY,
    fontSize: 18,
    lineHeight: 26,
    letterSpacing: 0.3,
    textAlign: "left",
    ...fonts.regular,
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
    borderRadius: 999,
    borderCurve: "continuous",
    backgroundColor: BLACK,
  },
  primaryText: {
    color: PURE_WHITE,
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
    color: DARK_GRAY,
    fontSize: 15,
    lineHeight: 20,
    ...fonts.bold,
  },
  ratingOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PURE_WHITE,
    paddingHorizontal: 24,
  },
  ratingCard: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    borderRadius: 0,
    borderCurve: "continuous",
    backgroundColor: PURE_WHITE,
    paddingHorizontal: 22,
    paddingVertical: 24,
    gap: 12,
  },
  ratingStars: {
    color: DARK_GRAY,
    fontSize: 27,
    lineHeight: 32,
    letterSpacing: 0.3,
    ...fonts.bold,
  },
  ratingTitle: {
    color: BLACK,
    fontSize: 24,
    lineHeight: 30,
    textAlign: "center",
    letterSpacing: 0.3,
    ...fonts.bold,
  },
  ratingBody: {
    color: DARK_GRAY,
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
    borderRadius: 999,
    borderCurve: "continuous",
    backgroundColor: BLACK,
    marginTop: 6,
  },
  ratingPrimaryText: {
    color: PURE_WHITE,
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
    color: DARK_GRAY,
    fontSize: 14,
    lineHeight: 18,
    ...fonts.medium,
  },
});
