import { Stack, useRouter } from "expo-router";
import { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
import { fonts } from "../styles/typography";

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
  const isAutoEnabled = languagePreference.mode === "auto";

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
    if (value) {
      void setAppLanguageToSystemDefault();
      return;
    }

    void setAppLanguage(languagePreference.resolvedLanguage);
  };

  const handleSelectLanguage = (language: string) => {
    void setAppLanguage(language);
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
        <Pressable accessibilityRole="button" onPress={handleBack} style={styles.backButton}>
          <Text style={[styles.backText, localizedFonts.medium]}>{"\u2039"}</Text>
        </Pressable>

        <View style={styles.headerBlock}>
          <Text style={[styles.eyebrow, localizedFonts.semibold]}>{t("settings.rows.language")}</Text>
          <Text style={[styles.title, localizedFonts.bold]}>{t("settings.language.title")}</Text>
          <Text style={[styles.description, localizedFonts.regular]}>{t("settings.language.description")}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.autoRow}>
            <View style={styles.autoCopy}>
              <Text style={[styles.autoTitle, localizedFonts.semibold]}>{t("settings.language.auto")}</Text>
              <Text style={[styles.autoDescription, localizedFonts.regular]}>{autoDescription}</Text>
            </View>

            <Switch
              onValueChange={handleToggleAuto}
              thumbColor={isAutoEnabled ? "#FFFFFF" : "#FFFFFF"}
              trackColor={{ false: "#D4D4D4", true: "#0A0A0A" }}
              value={isAutoEnabled}
            />
          </View>
        </View>

        <View style={styles.listBlock}>
          {SUPPORTED_LANGUAGE_OPTIONS.map((option) => {
            const isSelected =
              languagePreference.resolvedLanguage === option.code
              && (isAutoEnabled || languagePreference.manualLanguage === option.code);
            const englishLabel = getLanguageEnglishLabel(option.code);
            const showEnglishLabel = englishLabel !== option.nativeLabel;

            return (
              <Pressable
                key={option.code}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                onPress={() => handleSelectLanguage(option.code)}
                style={styles.languageRow}
              >
                <View style={styles.languageCopy}>
                  <Text style={[styles.languageNative, localizedFonts.medium]}>{option.nativeLabel}</Text>
                  {showEnglishLabel ? (
                    <Text style={[styles.languageEnglish, localizedFonts.regular]}>{englishLabel}</Text>
                  ) : null}
                </View>

                <Radio selected={isSelected} />
              </Pressable>
            );
          })}
        </View>
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
    color: "#0A0A0A",
    fontSize: 34,
    lineHeight: 34,
    ...fonts.medium,
  },
  headerBlock: {
    marginBottom: 24,
    gap: 10,
  },
  eyebrow: {
    color: "#6B6B6B",
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
});
