import {Stack, useRouter} from "expo-router";
import {useMemo, useState} from "react";
import {useTranslation} from "react-i18next";
import {
ActivityIndicator,
I18nManager,
Pressable,
ScrollView,
StyleSheet,
Switch,
Text,
View,
} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {DS, GLOBAL_VERTICAL_GAP} from "../lib/design-system";

import {
setAppLanguage,
setAppLanguageToSystemDefault,
useAppLanguagePreference,
useLocalizedAppFonts,
} from "../lib/i18n";
import {
SUPPORTED_LANGUAGE_OPTIONS,
getLanguageEnglishLabel,
getLanguageNativeLabel,
} from "../lib/i18n/language";
import {
getDirectionalArrowScale,
getDirectionalRow,
getDirectionalTextAlign,
reloadAppForLayoutDirection,
} from "../lib/i18n/rtl";
import {fonts} from "../styles/typography";

function Radio({ selected }: { selected: boolean }) {
  return (
    <View style={[styles.radioOuter, selected ? styles.radioOuterSelected : null]}>
      {selected ? <View style={styles.radioInner} /> : null}
    </View>
  );
}

export default function LanguageSettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const localizedFonts = useLocalizedAppFonts();
  const languagePreference = useAppLanguagePreference();
  const [isApplyingDirection, setIsApplyingDirection] = useState(false);
  const isRTL = I18nManager.isRTL;
  const isAutoEnabled = languagePreference.mode === "auto";
  const isCurrentLanguageSelected = (language: string) =>
    languagePreference.resolvedLanguage === language
    && (isAutoEnabled || languagePreference.manualLanguage === language);

  const autoDescription = useMemo(
    () =>
      t("settings.language.usingSystem", {
        language: getLanguageNativeLabel(languagePreference.resolvedLanguage),
      }),
    [languagePreference.resolvedLanguage, t],
  );

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/settings");
  };

  const handleToggleAuto = (value: boolean) => {
    if (isApplyingDirection) {
      return;
    }

    if (value) {
      void (async () => {
        setIsApplyingDirection(true);
        const result = await setAppLanguageToSystemDefault();
        if (result.layoutDirectionChanged) {
          await reloadAppForLayoutDirection();
        }
        setIsApplyingDirection(false);
      })();
      return;
    }

    void (async () => {
      setIsApplyingDirection(true);
      const result = await setAppLanguage(languagePreference.resolvedLanguage);
      if (result.layoutDirectionChanged) {
        await reloadAppForLayoutDirection();
      }
      setIsApplyingDirection(false);
    })();
  };

  const handleSelectLanguage = (language: string) => {
    if (isCurrentLanguageSelected(language) || isApplyingDirection) {
      return;
    }

    void (async () => {
      setIsApplyingDirection(true);
      const result = await setAppLanguage(language);
      if (result.layoutDirectionChanged) {
        await reloadAppForLayoutDirection();
      }
      setIsApplyingDirection(false);
    })();
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          presentation: "modal",
          headerShown: false,
          contentStyle: { backgroundColor: "#FFFFFF" },
        }}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top + 24, 24),
            paddingBottom: Math.max(insets.bottom + 28, 28),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable accessibilityRole="button" disabled={isApplyingDirection} onPress={handleBack} style={styles.backButton}>
          <Text
            style={[
              styles.backText,
              localizedFonts.medium,
              { transform: [{ scaleX: getDirectionalArrowScale(isRTL) }] },
            ]}
          >
            {"\u2039"}
          </Text>
        </Pressable>

        <View style={styles.headerBlock}>
          <Text style={[styles.eyebrow, localizedFonts.semibold, { textAlign: getDirectionalTextAlign(isRTL) }]}>{t("settings.rows.language")}</Text>
          <Text style={[styles.title, localizedFonts.bold, { textAlign: getDirectionalTextAlign(isRTL) }]}>{t("settings.language.title")}</Text>
          <Text style={[styles.description, localizedFonts.regular, { textAlign: getDirectionalTextAlign(isRTL) }]}>{t("settings.language.description")}</Text>
        </View>

        <View style={styles.card}>
          <View style={[styles.autoRow, { flexDirection: getDirectionalRow(isRTL) }]}>
            <View style={[styles.autoCopy, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
              <Text style={[styles.autoTitle, localizedFonts.semibold, { textAlign: getDirectionalTextAlign(isRTL) }]}>{t("settings.language.auto")}</Text>
              <Text style={[styles.autoDescription, localizedFonts.regular, { textAlign: getDirectionalTextAlign(isRTL) }]}>{autoDescription}</Text>
            </View>

            <Switch
              disabled={isApplyingDirection}
              onValueChange={handleToggleAuto}
              thumbColor={isAutoEnabled ? "#FFFFFF" : "#FFFFFF"}
              trackColor={{ false: "#D4D4D4", true: "#0A0A0A" }}
              value={isAutoEnabled}
            />
          </View>
        </View>

        <View style={styles.listBlock}>
          {SUPPORTED_LANGUAGE_OPTIONS.map((option) => {
            const isSelected = isCurrentLanguageSelected(option.code);
            const englishLabel = getLanguageEnglishLabel(option.code);
            const showEnglishLabel = englishLabel !== option.nativeLabel;

            return (
              <Pressable
                key={option.code}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                onPress={() => handleSelectLanguage(option.code)}
                style={[styles.languageRow, { flexDirection: getDirectionalRow(isRTL) }]}
              >
                <View style={[styles.languageCopy, { alignItems: isRTL ? "flex-end" : "flex-start" }]}>
                  <Text style={[styles.languageNative, localizedFonts.medium, { textAlign: getDirectionalTextAlign(isRTL) }]}>{option.nativeLabel}</Text>
                  {showEnglishLabel ? (
                    <Text style={[styles.languageEnglish, localizedFonts.regular, { textAlign: getDirectionalTextAlign(isRTL) }]}>{englishLabel}</Text>
                  ) : null}
                </View>

                <Radio selected={isSelected} />
              </Pressable>
            );
          })}
        </View>

        {isApplyingDirection ? (
          <View style={[styles.restartState, { flexDirection: getDirectionalRow(isRTL) }]}>
            <ActivityIndicator color="#0A0A0A" />
            <Text style={[styles.restartText, localizedFonts.medium, { textAlign: getDirectionalTextAlign(isRTL) }]}>
              {t("settings.language.restartNotice")}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  backText: {
    color: DS.colors.textPrimary,
    fontSize: 34,
    lineHeight: 34,
    ...fonts.medium,
  },
  headerBlock: {
    marginBottom: GLOBAL_VERTICAL_GAP,
    gap: 10,
  },
  eyebrow: {
    color: DS.colors.textMuted,
    fontSize: 13,
    lineHeight: 16,
    ...fonts.semibold,
  },
  title: {
    color: "#0A0A0A",
    fontSize: 32,
    lineHeight: 36,
    ...fonts.bold,
  },
  description: {
    color: "#6B6B6B",
    fontSize: 15,
    lineHeight: 22,
    ...fonts.regular,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#EAEAEA",
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 18,
  },
  autoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  autoCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  autoTitle: {
    color: "#0A0A0A",
    fontSize: 16,
    lineHeight: 20,
    ...fonts.semibold,
  },
  autoDescription: {
    color: "#6B6B6B",
    fontSize: 13,
    lineHeight: 18,
    ...fonts.regular,
  },
  listBlock: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#EAEAEA",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  languageRow: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  languageCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  languageNative: {
    color: "#0A0A0A",
    fontSize: 16,
    lineHeight: 20,
    ...fonts.medium,
  },
  languageEnglish: {
    color: "#6B6B6B",
    fontSize: 13,
    lineHeight: 18,
    ...fonts.regular,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#BDBDBD",
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterSelected: {
    borderColor: "#0A0A0A",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#0A0A0A",
  },
  restartState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  restartText: {
    color: "#6B6B6B",
    fontSize: 13,
    lineHeight: 18,
    ...fonts.medium,
  },
});
