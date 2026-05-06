import {AuthScreen} from "@/components/auth/AuthScreen";
import {KeyboardAvoidingView, Platform, ScrollView, StyleSheet} from "react-native";

export default function SignInRoute() {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.screen}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <AuthScreen mode="sign-in" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0A0A0F",
  },
  scroll: {
    flex: 1,
    backgroundColor: "#0A0A0F",
  },
  scrollContent: {
    flexGrow: 1,
  },
});
