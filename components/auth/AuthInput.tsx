import {Eye, EyeOff} from "lucide-react-native";
import {useState} from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

const AUTH_COLORS = {
  accent: "#E83A5A",
  inputBackground: "rgba(255,255,255,0.08)",
  inputBorder: "rgba(255,255,255,0.12)",
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255,255,255,0.60)",
};

type AuthInputProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  error?: string;
  autoComplete?: TextInputProps["autoComplete"];
  keyboardType?: TextInputProps["keyboardType"];
  textContentType?: TextInputProps["textContentType"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
  returnKeyType?: TextInputProps["returnKeyType"];
};

export function AuthInput({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  error,
  autoComplete,
  keyboardType,
  textContentType,
  autoCapitalize = "none",
  returnKeyType,
}: AuthInputProps) {
  const [focused, setFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = Boolean(secureTextEntry);

  return (
    <View style={styles.field}>
      <Text selectable style={styles.label}>
        {label}
      </Text>
      <View
        style={[
          styles.inputWrap,
          focused ? styles.inputWrapFocused : null,
          error ? styles.inputWrapError : null,
        ]}
      >
        <TextInput
          style={[styles.input, isPassword ? styles.passwordInput : null]}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.35)"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isPassword && !passwordVisible}
          autoComplete={autoComplete}
          textContentType={textContentType}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          returnKeyType={returnKeyType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor={AUTH_COLORS.accent}
        />
        {isPassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? "Hide password" : "Show password"}
            hitSlop={10}
            onPress={() => setPasswordVisible((current) => !current)}
            style={styles.eyeButton}
          >
            {passwordVisible ? (
              <EyeOff color={AUTH_COLORS.textSecondary} size={20} strokeWidth={1.8} />
            ) : (
              <Eye color={AUTH_COLORS.textSecondary} size={20} strokeWidth={1.8} />
            )}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text selectable style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 8,
  },
  label: {
    color: AUTH_COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  inputWrap: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AUTH_COLORS.inputBorder,
    backgroundColor: AUTH_COLORS.inputBackground,
    flexDirection: "row",
    alignItems: "center",
  },
  inputWrapFocused: {
    borderColor: AUTH_COLORS.accent,
  },
  inputWrapError: {
    borderColor: AUTH_COLORS.accent,
  },
  input: {
    flex: 1,
    minHeight: 52,
    paddingHorizontal: 16,
    color: AUTH_COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "400",
    letterSpacing: 0,
  },
  passwordInput: {
    paddingRight: 4,
  },
  eyeButton: {
    width: 48,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    color: AUTH_COLORS.accent,
    fontSize: 11,
    fontWeight: "400",
    letterSpacing: 0,
  },
});
