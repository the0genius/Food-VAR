import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { EnvelopeSimple, X } from "phosphor-react-native";
import { useState } from "react";
import { apiRequest } from "@/lib/query-client";
import { C } from "@/constants/colors";

interface Props {
  onDismiss?: () => void;
}

export function EmailVerificationBanner({ onDismiss }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  if (dismissed) return null;

  async function handleResend() {
    if (resending || resent) return;
    setResending(true);
    try {
      await apiRequest("POST", "/api/auth/resend-verification");
      setResent(true);
    } catch {}
    setResending(false);
  }

  return (
    <View style={styles.banner}>
      <EnvelopeSimple size={18} color="#1976D2" weight="fill" />
      <View style={styles.textWrap}>
        <Text style={styles.text}>
          {resent ? "Verification email sent!" : "Please verify your email address"}
        </Text>
        {!resent && (
          <TouchableOpacity onPress={handleResend} disabled={resending}>
            <Text style={styles.link}>{resending ? "Sending..." : "Resend"}</Text>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity
        onPress={() => {
          setDismissed(true);
          onDismiss?.();
        }}
        hitSlop={8}
      >
        <X size={16} color={C.muted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: Platform.OS === "web" ? 8 : 4,
    marginBottom: 8,
    borderRadius: 10,
    gap: 10,
  },
  textWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  text: {
    fontSize: 13,
    color: C.text,
    fontWeight: "500" as const,
  },
  link: {
    fontSize: 13,
    color: "#1976D2",
    fontWeight: "600" as const,
  },
});
