import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Image,
  Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";
import { apiRequest, queryClient } from "@/lib/query-client";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type FlowStep = "front_photo" | "back_photo" | "analyzing" | "error";

function PulsingDot({ delay }: { delay: number }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.3, { duration: 600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.pulsingDot, dotStyle, { marginLeft: delay > 0 ? 6 : 0 }]} />;
}

export default function ContributeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const params = useLocalSearchParams<{ barcode?: string }>();

  const [step, setStep] = useState<FlowStep>("front_photo");
  const [frontImage, setFrontImage] = useState<{ uri: string; base64: string } | null>(null);
  const [backImage, setBackImage] = useState<{ uri: string; base64: string } | null>(null);
  const [analyzeStatus, setAnalyzeStatus] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const hasLaunched = useRef(false);
  const frontImageRef = useRef<{ uri: string; base64: string } | null>(null);

  const barcode = params.barcode || "";
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  useEffect(() => {
    if (!hasLaunched.current) {
      hasLaunched.current = true;
      launchFrontCamera();
    }
  }, []);

  async function launchFrontCamera() {
    setStep("front_photo");
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.4,
        base64: true,
        allowsEditing: false,
      });

      if (result.canceled) {
        router.back();
        return;
      }

      const asset = result.assets[0];
      const frontData = { uri: asset.uri, base64: asset.base64 || "" };
      setFrontImage(frontData);
      frontImageRef.current = frontData;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      setTimeout(() => {
        launchBackCamera();
      }, 600);
    } catch (e) {
      console.error("Front camera error:", e);
      fallbackToLibrary("front");
    }
  }

  async function launchBackCamera() {
    setStep("back_photo");
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.4,
        base64: true,
        allowsEditing: false,
      });

      if (result.canceled) {
        setStep("front_photo");
        return;
      }

      const asset = result.assets[0];
      setBackImage({ uri: asset.uri, base64: asset.base64 || "" });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      setTimeout(() => {
        processImages(frontImageRef.current!.base64, asset.base64 || "");
      }, 400);
    } catch (e) {
      console.error("Back camera error:", e);
      fallbackToLibrary("back");
    }
  }

  async function fallbackToLibrary(which: "front" | "back") {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.4,
        base64: true,
      });

      if (result.canceled) {
        if (which === "front") {
          router.back();
        }
        return;
      }

      const asset = result.assets[0];
      if (which === "front") {
        const frontData = { uri: asset.uri, base64: asset.base64 || "" };
        setFrontImage(frontData);
        frontImageRef.current = frontData;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTimeout(() => launchBackCamera(), 600);
      } else {
        setBackImage({ uri: asset.uri, base64: asset.base64 || "" });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setTimeout(() => processImages(frontImageRef.current!.base64, asset.base64 || ""), 400);
      }
    } catch (e) {
      console.error("Library fallback error:", e);
      setStep("error");
      setErrorMsg("Could not access photos. Please try again.");
    }
  }

  async function processImages(frontBase64: string, backBase64: string) {
    setStep("analyzing");
    setAnalyzeStatus("Reading packaging...");

    try {
      setTimeout(() => setAnalyzeStatus("Extracting nutrition facts..."), 2000);
      setTimeout(() => setAnalyzeStatus("Identifying allergens..."), 4500);

      const extractRes = await apiRequest("POST", "/api/products/extract", {
        frontImage: frontBase64,
        backImage: backBase64,
      });
      const extractData = await extractRes.json();

      if (!extractData.success || !extractData.data) {
        setStep("error");
        setErrorMsg(extractData.error || "Could not read the packaging clearly. Please try with better lighting.");
        return;
      }

      const d = extractData.data;
      setAnalyzeStatus("Adding to database...");

      const contributeRes = await apiRequest("POST", "/api/products/contribute", {
        barcode: barcode || `USR${Date.now()}`,
        name: d.name || "Unknown Product",
        brand: d.brand || "",
        category: d.category || "",
        servingSize: d.servingSize || "",
        calories: d.calories ?? null,
        protein: d.protein ?? null,
        carbohydrates: d.carbohydrates ?? null,
        sugar: d.sugar ?? null,
        fat: d.fat ?? null,
        saturatedFat: d.saturatedFat ?? null,
        fiber: d.fiber ?? null,
        sodium: d.sodium ?? null,
        allergens: d.allergens || [],
        ingredients: d.ingredients || null,
        nutritionFacts: d.nutritionFacts || null,
        contributedBy: user?.id,
      });

      const contributeData = await contributeRes.json();
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setAnalyzeStatus("Getting your score...");

      const product = contributeData.product;
      if (user && product) {
        setTimeout(() => {
          router.replace({
            pathname: "/result",
            params: {
              productId: product.id,
              userId: user.id,
              accessMethod: "contribute",
            },
          });
        }, 800);
      } else {
        router.back();
      }
    } catch (e) {
      console.error("Process error:", e);
      setStep("error");
      setErrorMsg("Something went wrong while analyzing the product. Please try again.");
    }
  }

  function handleRetry() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFrontImage(null);
    setBackImage(null);
    frontImageRef.current = null;
    setErrorMsg("");
    hasLaunched.current = false;
    launchFrontCamera();
  }

  return (
    <View style={[styles.container, { paddingTop: (insets.top || webTopInset) + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={Colors.charcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Product</Text>
        <View style={{ width: 36 }} />
      </View>

      {step === "front_photo" && (
        <Animated.View entering={FadeIn.duration(400)} style={styles.captureState}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Step 1 of 2</Text>
          </View>
          <Ionicons name="cube-outline" size={72} color={Colors.primaryLight} />
          <Text style={styles.captureTitle}>Front of Package</Text>
          <Text style={styles.captureSubtitle}>
            Take a photo of the front of the product so we can identify it
          </Text>
          {frontImage && (
            <Image source={{ uri: frontImage.uri }} style={styles.previewThumb} />
          )}
          {!frontImage && (
            <TouchableOpacity style={styles.captureBtn} onPress={launchFrontCamera}>
              <Ionicons name="camera" size={22} color={Colors.white} />
              <Text style={styles.captureBtnText}>Open Camera</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {step === "back_photo" && (
        <Animated.View entering={FadeIn.duration(400)} style={styles.captureState}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Step 2 of 2</Text>
          </View>
          <View style={styles.thumbRow}>
            {frontImage && (
              <View style={styles.thumbDone}>
                <Image source={{ uri: frontImage.uri }} style={styles.thumbDoneImg} />
                <View style={styles.thumbCheck}>
                  <Ionicons name="checkmark" size={12} color={Colors.white} />
                </View>
              </View>
            )}
          </View>
          <Ionicons name="document-text-outline" size={72} color={Colors.primaryLight} />
          <Text style={styles.captureTitle}>Nutrition Label</Text>
          <Text style={styles.captureSubtitle}>
            Now take a photo of the nutrition facts on the back
          </Text>
          <TouchableOpacity style={styles.captureBtn} onPress={launchBackCamera}>
            <Ionicons name="camera" size={22} color={Colors.white} />
            <Text style={styles.captureBtnText}>Open Camera</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {step === "analyzing" && (
        <Animated.View entering={FadeIn.duration(400)} style={styles.analyzingState}>
          <View style={styles.imagePreviewRow}>
            {frontImage && (
              <Image source={{ uri: frontImage.uri }} style={styles.analyzeThumb} />
            )}
            {backImage && (
              <Image source={{ uri: backImage.uri }} style={styles.analyzeThumb} />
            )}
          </View>

          <View style={styles.analyzingContent}>
            <View style={styles.pulsingRow}>
              <PulsingDot delay={0} />
              <PulsingDot delay={1} />
              <PulsingDot delay={2} />
            </View>
            <Animated.Text
              entering={FadeInDown.duration(300)}
              style={styles.analyzingText}
            >
              {analyzeStatus}
            </Animated.Text>
            <Text style={styles.analyzingHint}>
              Our AI is reading your photos to extract all the nutrition details
            </Text>
          </View>
        </Animated.View>
      )}

      {step === "error" && (
        <Animated.View entering={FadeIn.duration(400)} style={styles.errorState}>
          <Ionicons name="alert-circle" size={56} color={Colors.scoreAmber} />
          <Text style={styles.errorTitle}>Couldn't Read Package</Text>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
            <Ionicons name="camera" size={20} color={Colors.white} />
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.softWhite,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.charcoal,
  },
  captureState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 14,
  },
  stepBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.primaryPale,
    marginBottom: 8,
  },
  stepBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },
  captureTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.charcoal,
    textAlign: "center",
    letterSpacing: -0.3,
    marginTop: 4,
  },
  captureSubtitle: {
    fontSize: 15,
    color: Colors.mediumGray,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },
  captureBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    marginTop: 16,
  },
  captureBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.white,
  },
  previewThumb: {
    width: 80,
    height: 80,
    borderRadius: 14,
    marginTop: 8,
  },
  thumbRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  thumbDone: {
    position: "relative",
  },
  thumbDoneImg: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  thumbCheck: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  analyzingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 24,
  },
  imagePreviewRow: {
    flexDirection: "row",
    gap: 12,
  },
  analyzeThumb: {
    width: 100,
    height: 100,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.primaryPale,
  },
  analyzingContent: {
    alignItems: "center",
    gap: 12,
  },
  pulsingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  pulsingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  analyzingText: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.charcoal,
    textAlign: "center",
  },
  analyzingHint: {
    fontSize: 14,
    color: Colors.mediumGray,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  errorState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.charcoal,
    marginTop: 4,
  },
  errorText: {
    fontSize: 15,
    color: Colors.mediumGray,
    textAlign: "center",
    lineHeight: 22,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    marginTop: 12,
  },
  retryBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.white,
  },
  cancelBtn: {
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontSize: 15,
    color: Colors.mediumGray,
    fontWeight: "500",
  },
});
