import { useAuth, useUser } from "@clerk/expo";
import { useQuery } from "convex/react";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  ChevronRight,
  FileText,
  HelpCircle,
  MessageCircle,
  RefreshCcw,
  Share2,
  Shield,
  Star,
  Trash2,
  User,
} from "lucide-react-native";

import { getPriceId, planTitle, type BillingCycle, type PlanKey } from "../../lib/pricing";
import { openPolarCheckout } from "../../lib/polar";
import { saveSubscriptionIntent } from "../../lib/subscription-intent";

const NAV_ITEMS = [
  { id: "feedback", label: "Feedback", icon: MessageCircle },
  { id: "faq", label: "FAQ", icon: HelpCircle },
  { id: "rate", label: "Rate Us", icon: Star },
  { id: "share", label: "Share with Friends", icon: Share2 },
  { id: "terms", label: "Terms of Use", icon: FileText },
  { id: "privacy", label: "Privacy Policy", icon: Shield },
];

type MeResponse = {
  plan: "free" | PlanKey;
  credits: number;
};

export default function SettingsScreen() {
  const router = useRouter();
  const { isSignedIn, signOut } = useAuth();
  const { user } = useUser();
  const me = useQuery("users:me" as any, isSignedIn ? {} : "skip") as MeResponse | null | undefined;

  const plan = me?.plan && me.plan !== "free" ? me.plan : "free";
  const planLabel = plan === "free" ? "FREE" : planTitle(plan).toUpperCase();
  const isPaid = plan !== "free";

  const handleUpgrade = async () => {
    const billing: BillingCycle = "monthly";
    const priceId = getPriceId("pro", billing);
    const intent = { planName: "pro" as PlanKey, priceId, billingCycle: billing };

    try {
      if (!isSignedIn || !user?.id) {
        await saveSubscriptionIntent(intent);
        router.push("/sign-in");
        return;
      }

      await openPolarCheckout(user.id, intent);
    } catch (error) {
      Alert.alert("Upgrade failed", "Please try again in a moment.");
    }
  };

  const handleNav = (id: string) => {
    switch (id) {
      case "feedback":
        Alert.alert("Feedback", "Thanks for sharing feedback. We'll open a form soon.");
        break;
      case "faq":
        Alert.alert("FAQ", "The FAQ section is coming next.");
        break;
      case "rate":
        Alert.alert("Rate Us", "Thanks! We'll link to the store rating soon.");
        break;
      case "share":
        Alert.alert("Share", "Share link copied soon. We'll enable native share next.");
        break;
      case "terms":
        Alert.alert("Terms", "Terms of Use will open here.");
        break;
      case "privacy":
        Alert.alert("Privacy", "Privacy Policy will open here.");
        break;
      default:
        break;
    }
  };

  const handleCopyId = async () => {
    if (!user?.id) return;
    await Clipboard.setStringAsync(user.id);
    Alert.alert("Copied", "User ID copied to clipboard.");
  };

  const handleRestore = () => {
    Alert.alert("Restore Purchase", "We'll re-check your subscription shortly.");
  };

  const handleDelete = () => {
    Alert.alert("Delete Account", "This action is permanent. Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            if (user) {
              // Clerk supports user.delete(); if unavailable, this will be caught.
              await user.delete();
            }
            await signOut();
          } catch (error) {
            Alert.alert("Delete failed", "Please contact support to delete your account.");
          }
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Manage your Darkor.ai experience.</Text>

      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <User color="#22d3ee" size={20} />
          <Text style={styles.statusLabel}>Your Account is {planLabel}</Text>
        </View>
        <Text style={styles.statusHint}>Credits available: {me?.credits ?? 0}</Text>

        <View style={styles.bullets}>
          {["Advanced AI Model", "Fast Processing", "Remove All Ads"].map((item) => (
            <View key={item} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>

        <Pressable onPress={handleUpgrade} style={[styles.primaryButton, styles.pointer]}>
          <Text style={styles.primaryButtonText}>{isPaid ? "Manage Subscription" : "Upgrade PRO"}</Text>
        </Pressable>
      </View>

      <View style={styles.listCard}>
        {NAV_ITEMS.map((item, index) => {
          const Icon = item.icon;
          return (
            <Pressable
              key={item.id}
              onPress={() => handleNav(item.id)}
              style={[styles.listRow, index === NAV_ITEMS.length - 1 && styles.listRowLast, styles.pointer]}
            >
              <View style={styles.listRowLeft}>
                <View style={styles.iconBubble}>
                  <Icon color="#e4e4e7" size={18} />
                </View>
                <Text style={styles.listRowText}>{item.label}</Text>
              </View>
              <ChevronRight color="#71717a" size={18} />
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>Danger Zone</Text>
      <View style={styles.dangerCard}>
        <Pressable onPress={handleRestore} style={[styles.dangerRow, styles.pointer]}>
          <View style={styles.listRowLeft}>
            <View style={styles.iconBubbleMuted}>
              <RefreshCcw color="#f4f4f5" size={16} />
            </View>
            <Text style={styles.dangerText}>Restore Purchase</Text>
          </View>
        </Pressable>

        <View style={styles.divider} />

        <View style={styles.dangerRow}>
          <View style={styles.listRowLeft}>
            <View style={styles.iconBubbleMuted}>
              <User color="#f4f4f5" size={16} />
            </View>
            <View>
              <Text style={styles.dangerText}>User ID</Text>
              <Text selectable style={styles.userIdText}>
                {user?.id ?? "Guest"}
              </Text>
            </View>
          </View>
          <Pressable onPress={handleCopyId} style={[styles.copyButton, styles.pointer]} disabled={!user?.id}>
            <Text style={styles.copyButtonText}>Copy</Text>
          </Pressable>
        </View>

        <View style={styles.divider} />

        <Pressable onPress={handleDelete} style={[styles.dangerRow, styles.pointer]}>
          <View style={styles.listRowLeft}>
            <View style={styles.iconBubbleDanger}>
              <Trash2 color="#fef2f2" size={16} />
            </View>
            <Text style={styles.dangerText}>Delete Account</Text>
          </View>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#09090b",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 120,
  },
  title: {
    color: "#f8fafc",
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    color: "#a1a1aa",
    marginTop: 6,
    fontSize: 14,
  },
  statusCard: {
    marginTop: 20,
    borderRadius: 24,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(24, 24, 27, 0.9)",
    padding: 18,
    gap: 12,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusLabel: {
    color: "#f8fafc",
    fontWeight: "700",
    fontSize: 16,
  },
  statusHint: {
    color: "#a1a1aa",
    fontSize: 13,
  },
  bullets: {
    gap: 8,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22d3ee",
  },
  bulletText: {
    color: "#e4e4e7",
    fontSize: 13,
  },
  primaryButton: {
    marginTop: 6,
    borderRadius: 16,
    backgroundColor: "#22d3ee",
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 14,
  },
  listCard: {
    marginTop: 18,
    borderRadius: 22,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(24, 24, 27, 0.85)",
  },
  listRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  listRowLast: {
    borderBottomWidth: 0,
  },
  listRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  listRowText: {
    color: "#e4e4e7",
    fontSize: 14,
    fontWeight: "600",
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionLabel: {
    marginTop: 20,
    color: "#f4f4f5",
    fontSize: 14,
    fontWeight: "700",
  },
  dangerCard: {
    marginTop: 12,
    borderRadius: 22,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.3)",
    backgroundColor: "rgba(24, 24, 27, 0.9)",
    overflow: "hidden",
  },
  dangerRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  dangerText: {
    color: "#f4f4f5",
    fontSize: 14,
    fontWeight: "600",
  },
  userIdText: {
    color: "#71717a",
    fontSize: 12,
    marginTop: 2,
  },
  iconBubbleMuted: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBubbleDanger: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(244, 63, 94, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  copyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  copyButtonText: {
    color: "#e4e4e7",
    fontSize: 12,
    fontWeight: "600",
  },
  pointer: {
    cursor: "pointer",
  },
});

