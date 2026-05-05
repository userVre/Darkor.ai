import {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import {StyleSheet, Text, View} from "react-native";
const TYPEWRITER_INTERVAL_MS = 74;
const HOLD_DURATION_MS = 820;

type BrandLaunchScreenProps = {
  onFinish: () => void;
};

export function BrandLaunchScreen({ onFinish }: BrandLaunchScreenProps) {
  const { t } = useTranslation();
  const brandName = t("app.name");
  const [visibleLength, setVisibleLength] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    let cursorTimer: ReturnType<typeof setInterval> | null = null;
    let finishTimer: ReturnType<typeof setTimeout> | null = null;

    const typeTimer = setInterval(() => {
      setVisibleLength((current) => {
        if (current >= brandName.length) {
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
  }, [brandName.length, onFinish]);

  return (
    <View style={styles.screen}>
      <View style={styles.grid} pointerEvents="none" />
      <View style={styles.wordmarkWrap}>
        <Text style={styles.wordmark}>
          {brandName.slice(0, visibleLength)}
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
    backgroundColor: "#FFFFFF",
  },
  grid: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    opacity: 0.24,
    backgroundColor: "#F9F9F9",
  },
  wordmarkWrap: {
    alignItems: "flex-start",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 28,
  },
  wordmark: {
    minHeight: 52,
    color: "#111827",
    fontFamily: "Inter",
    fontWeight: "800",
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: 0.3,
  },
  cursor: {
    color: "#7B61FF",
  },
  cursorHidden: {
    opacity: 0.16,
  },
  caption: {
    color: "rgba(17,24,39,0.48)",
    fontFamily: "Inter",
    fontWeight: "700",
    fontSize: 11,
    lineHeight: 12,
    letterSpacing: 0.3,
  },
});
