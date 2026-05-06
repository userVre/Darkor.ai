import {AuthScreen} from "@/components/auth/AuthScreen";
import {KeyboardAvoidingView, Platform, ScrollView, StyleSheet} from "react-native";
import {useTheme} from "../../styles/theme";

export default function SignUpRoute() {
  const theme = useTheme();

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.screen, {backgroundColor: theme.bg}]}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={[styles.scroll, {backgroundColor: theme.bg}]}
        contentContainerStyle={styles.scrollContent}
      >
        <AuthScreen mode="sign-up" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
