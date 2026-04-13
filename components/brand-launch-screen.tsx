import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

const BRAND_NAME = "HomeDecor AI";
const TYPEWRITER_INTERVAL_MS = 74;
const HOLD_DURATION_MS = 820;

type BrandLaunchScreenProps = {
  onFinish: () => void;
};

export function BrandLaunchScreen({ onFinish }: BrandLaunchScreenProps) {
  const [visibleLength, setVisibleLength] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    let cursorTimer: ReturnType<typeof setInterval> | null = null;
    let finishTimer: ReturnType<typeof setTimeout> | null = null;

    const typeTimer = setInterval(() => {
      setVisibleLength((current) => {
        if (current >= BRAND_NAME.length) {
          clearInterval(typeTimer);
          finishTimer = setTimeout(() => {
            onFinish();
          }, HOLD_DURATION_MS);
          return current;
        }

        return current + 1;
      });
    }, TYPEWRITER_INTERVAL_MS);

    cursorTimer = setInterval(() => {
      setCursorVisible((current) => !current);
    }, 360);

    return () => {
      clearInterval(typeTimer);
      if (cursorTimer) {
        clearInterval(cursorTimer);
      }
      if (finishTimer) {
        clearTimeout(finishTimer);
      }
    };
  }, [onFinish]);

  return (
    <View style={styles.screen}>
      <View style={styles.grid} pointerEvents="none" />
      <View style={styles.wordmarkWrap}>
        <Text style={styles.wordmark}>
          {BRAND_NAME.slice(0, visibleLength)}
          <Text style={[styles.cursor, !cursorVisible ? styles.cursorHidden : null]}>|</Text>
        </Text>
        <Text style={styles.caption}>ARCHITECTURAL AI PORTFOLIO</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#121212",
  },
  grid: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.24,
    backgroundColor: "#121212",
  },
  wordmarkWrap: {
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 28,
  },
  wordmark: {
    minHeight: 52,
    color: "#F5F1EA",
    fontFamily: "Inter",
    fontWeight: "800",
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.8,
  },
  cursor: {
    color: "#C86B33",
  },
  cursorHidden: {
    opacity: 0.16,
  },
  caption: {
    color: "rgba(245,241,234,0.48)",
    fontFamily: "Inter",
    fontWeight: "700",
    fontSize: 11,
    lineHeight: 12,
    letterSpacing: 2.4,
  },
});
