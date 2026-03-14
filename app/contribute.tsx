import { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Image,
  Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  X,
  Package,
  Camera,
  Check,
  WarningCircle,
  Confetti,
  PencilSimple,
} from "phosphor-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import Colors, { C, cardShadow, useThemeColors, type ThemeColors } from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";
import { apiRequest, queryClient } from "@/lib/query-client";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type FlowStep = "front_photo" | "back_photo" | "analyzing" | "review" | "success" | "error";

export default function ContributeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);

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
  const { user } = useUser();
  const params = useLocalSearchParams<{ barcode?: string }>();

  const [step, setStep] = useState<FlowStep>("front_photo");
  const [frontImage, setFrontImage] = useState<{ uri: string; base64: string } | null>(null);
  const [backImage, setBackImage] = useState<{ uri: string; base64: string } | null>(null);
  const [analyzeStatus, setAnalyzeStatus] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successProduct, setSuccessProduct] = useState<any>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [reviewName, setReviewName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const hasLaunched = useRef(false);
  const frontImageRef = useRef<{ uri: string; base64: string } | null>(null);
  const lottiePlayedRef = useRef(false);
  const nameInputRef = useRef<TextInput>(null);

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
      const needsNameReview = !d.name || extractData.requiresReview;

      if (needsNameReview) {
        setExtractedData(d);
        setReviewName(d.name || "");
        setStep("review");
        setTimeout(() => nameInputRef.current?.focus(), 500);
        return;
      }

      setAnalyzeStatus("Adding to database...");
      await submitProduct(d, d.name);
    } catch (e) {
      console.error("Process error:", e);
      setStep("error");
      setErrorMsg("Something went wrong while analyzing the product. Please try again.");
    }
  }

  async function submitProduct(d: any, productName: string) {
    try {
      const contributeRes = await apiRequest("POST", "/api/products/contribute", {
        barcode: barcode || `USR${Date.now()}`,
        name: productName,
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
      });

      const contributeData = await contributeRes.json();
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const product = contributeData.product;
      setSuccessProduct(product);
      setStep("success");

      lottiePlayedRef.current = true;

      if (user && product) {
        setTimeout(() => {
          router.replace({
            pathname: "/result",
            params: {
              productId: product.id,
              accessMethod: "contribute",
            },
          });
        }, 3000);
      }
    } catch (e) {
      console.error("Submit error:", e);
      setStep("error");
      setErrorMsg("Something went wrong while submitting the product. Please try again.");
    }
  }

  async function handleReviewSubmit() {
    if (!reviewName.trim() || !extractedData || isSubmitting) return;
    setIsSubmitting(true);
    await submitProduct(extractedData, reviewName.trim());
    setIsSubmitting(false);
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
    <View style={[styles.container, { paddingTop: (insets.top || webTopInset) + 8, backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} accessibilityLabel="Close" accessibilityRole="button">
          <X size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <LinearGradient
            colors={["#3DD68C", "#2E7D32"]}
            style={styles.headerIconBg}
          >
            <Package size={16} color="#fff" weight="fill" />
          </LinearGradient>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Add Product</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {step === "front_photo" && (
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "timing", duration: 400 }}
          style={styles.captureState}
        >
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Step 1 of 2</Text>
          </View>

          <View style={styles.dashedSlot}>
            {frontImage ? (
              <View style={styles.filledSlot}>
                <Image source={{ uri: frontImage.uri }} style={styles.slotImage} />
                <LinearGradient
                  colors={["#3DD68C", "#2E7D32"]}
                  style={styles.slotCheckBadge}
                >
                  <Check size={14} color="#fff" weight="bold" />
                </LinearGradient>
              </View>
            ) : (
              <>
                <Camera size={40} color={theme.placeholder} />
                <Text style={styles.dashedSlotText}>Front of Package</Text>
              </>
            )}
          </View>

          <Text style={styles.captureTitle}>Front of Package</Text>
          <Text style={styles.captureSubtitle}>
            Take a photo of the front of the product so we can identify it
          </Text>
          {!frontImage && (
            <TouchableOpacity style={styles.captureBtnWrapper} onPress={launchFrontCamera} accessibilityLabel="Take photo of front label" accessibilityRole="button">
              <LinearGradient
                colors={["#3DD68C", "#2E7D32"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.captureBtn}
              >
                <Camera size={22} color="#fff" weight="fill" />
                <Text style={styles.captureBtnText}>Open Camera</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </MotiView>
      )}

      {step === "back_photo" && (
        <MotiView
          from={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "timing", duration: 400 }}
          style={styles.captureState}
        >
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Step 2 of 2</Text>
          </View>

          <View style={styles.thumbRow}>
            {frontImage && (
              <View style={styles.thumbDone}>
                <Image source={{ uri: frontImage.uri }} style={styles.thumbDoneImg} />
                <LinearGradient
                  colors={["#3DD68C", "#2E7D32"]}
                  style={styles.thumbCheck}
                >
                  <Check size={12} color="#fff" weight="bold" />
                </LinearGradient>
              </View>
            )}
          </View>

          <View style={styles.dashedSlot}>
            <Camera size={40} color={theme.placeholder} />
            <Text style={styles.dashedSlotText}>Nutrition Label</Text>
          </View>

          <Text style={styles.captureTitle}>Nutrition Label</Text>
          <Text style={styles.captureSubtitle}>
            Now take a photo of the nutrition facts on the back
          </Text>
          <TouchableOpacity style={styles.captureBtnWrapper} onPress={launchBackCamera} accessibilityLabel="Take photo of nutrition facts" accessibilityRole="button">
            <LinearGradient
              colors={["#3DD68C", "#2E7D32"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.captureBtn}
            >
              <Camera size={22} color="#fff" weight="fill" />
              <Text style={styles.captureBtnText}>Open Camera</Text>
            </LinearGradient>
          </TouchableOpacity>
        </MotiView>
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

      {step === "review" && extractedData && (
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 400 }}
          style={styles.reviewState}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.reviewContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.reviewIconRow}>
              <PencilSimple size={40} color={theme.amber} weight="fill" />
            </View>
            <Text style={[styles.reviewTitle, { color: theme.text }]}>
              Product Name Needed
            </Text>
            <Text style={[styles.reviewSubtitle, { color: theme.muted }]}>
              We couldn't read the product name from the packaging. Please enter it below.
            </Text>

            <View style={styles.reviewInputWrapper}>
              <TextInput
                ref={nameInputRef}
                style={[styles.reviewInput, { color: theme.text, borderColor: reviewName.trim() ? theme.mint : theme.amber }]}
                placeholder="Enter product name"
                placeholderTextColor={theme.placeholder}
                value={reviewName}
                onChangeText={setReviewName}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleReviewSubmit}
                testID="review-name-input"
              />
              {!reviewName.trim() && (
                <Text style={[styles.reviewValidation, { color: theme.amber }]}>
                  Required before submitting
                </Text>
              )}
            </View>

            <View style={[styles.reviewExtractedCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.reviewExtractedTitle, { color: theme.text }]}>
                Extracted Data
              </Text>
              {extractedData.brand ? (
                <Text style={[styles.reviewExtractedRow, { color: theme.muted }]}>
                  Brand: {extractedData.brand}
                </Text>
              ) : null}
              {extractedData.category ? (
                <Text style={[styles.reviewExtractedRow, { color: theme.muted }]}>
                  Category: {extractedData.category}
                </Text>
              ) : null}
              {extractedData.servingSize ? (
                <Text style={[styles.reviewExtractedRow, { color: theme.muted }]}>
                  Serving: {extractedData.servingSize}
                </Text>
              ) : null}
              {extractedData.calories != null ? (
                <Text style={[styles.reviewExtractedRow, { color: theme.muted }]}>
                  Calories: {extractedData.calories}
                </Text>
              ) : null}
              {extractedData.protein != null ? (
                <Text style={[styles.reviewExtractedRow, { color: theme.muted }]}>
                  Protein: {extractedData.protein}g
                </Text>
              ) : null}
              {extractedData.carbohydrates != null ? (
                <Text style={[styles.reviewExtractedRow, { color: theme.muted }]}>
                  Carbs: {extractedData.carbohydrates}g
                </Text>
              ) : null}
              {extractedData.sugar != null ? (
                <Text style={[styles.reviewExtractedRow, { color: theme.muted }]}>
                  Sugar: {extractedData.sugar}g
                </Text>
              ) : null}
              {extractedData.fat != null ? (
                <Text style={[styles.reviewExtractedRow, { color: theme.muted }]}>
                  Fat: {extractedData.fat}g
                </Text>
              ) : null}
              {extractedData.saturatedFat != null ? (
                <Text style={[styles.reviewExtractedRow, { color: theme.muted }]}>
                  Saturated Fat: {extractedData.saturatedFat}g
                </Text>
              ) : null}
              {extractedData.fiber != null ? (
                <Text style={[styles.reviewExtractedRow, { color: theme.muted }]}>
                  Fiber: {extractedData.fiber}g
                </Text>
              ) : null}
              {extractedData.sodium != null ? (
                <Text style={[styles.reviewExtractedRow, { color: theme.muted }]}>
                  Sodium: {extractedData.sodium}mg
                </Text>
              ) : null}
              {extractedData.allergens?.length > 0 ? (
                <Text style={[styles.reviewExtractedRow, { color: theme.muted }]}>
                  Allergens: {extractedData.allergens.join(", ")}
                </Text>
              ) : null}
              {extractedData.ingredients ? (
                <Text style={[styles.reviewExtractedRow, { color: theme.muted }]} numberOfLines={3}>
                  Ingredients: {extractedData.ingredients}
                </Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={[styles.reviewSubmitWrapper, { opacity: reviewName.trim() && !isSubmitting ? 1 : 0.5 }]}
              onPress={handleReviewSubmit}
              disabled={!reviewName.trim() || isSubmitting}
              accessibilityLabel="Submit product"
              accessibilityRole="button"
              testID="review-submit-btn"
            >
              <LinearGradient
                colors={["#3DD68C", "#2E7D32"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.reviewSubmitBtn}
              >
                <Check size={20} color="#fff" weight="bold" />
                <Text style={styles.reviewSubmitText}>
                  {isSubmitting ? "Submitting..." : "Submit Product"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => router.back()}
              accessibilityLabel="Cancel and go back"
              accessibilityRole="button"
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </MotiView>
      )}

      {step === "success" && (
        <MotiView
          from={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 100 }}
          style={styles.successState}
        >
          <View style={styles.confettiContainer}>
            {[...Array(12)].map((_, i) => (
              <MotiView
                key={i}
                from={{ opacity: 0, translateY: 0, scale: 0 }}
                animate={{ opacity: [1, 0], translateY: -80 - Math.random() * 60, scale: [1.2, 0.5] }}
                transition={{ type: "timing", duration: 1200, delay: i * 80 }}
                style={[styles.confettiDot, {
                  left: `${10 + (i * 7.5)}%` as any,
                  backgroundColor: ["#3DD68C", "#2E7D32", "#FB8C00", "#E53935", "#2EC4B6", "#FFD700"][i % 6],
                  width: 8 + Math.random() * 6,
                  height: 8 + Math.random() * 6,
                }]}
              />
            ))}
          </View>
          <Confetti size={64} color={theme.mint} weight="fill" />
          <Text style={styles.successTitle}>You're a legend!</Text>
          <Text style={styles.successSubtitle}>
            Thanks for contributing! Your product has been added to our database and will help others make healthier choices.
          </Text>
        </MotiView>
      )}

      {step === "error" && (
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 400 }}
          style={styles.errorState}
        >
          <WarningCircle size={56} color={theme.amber} weight="fill" />
          <Text style={styles.errorTitle}>Couldn't Read Package</Text>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtnWrapper} onPress={handleRetry} accessibilityLabel="Try again" accessibilityRole="button">
            <LinearGradient
              colors={["#3DD68C", "#2E7D32"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.retryBtn}
            >
              <Camera size={20} color="#fff" weight="fill" />
              <Text style={styles.retryBtnText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => router.back()}
            accessibilityLabel="Cancel and go back"
            accessibilityRole="button"
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </MotiView>
      )}
    </View>
  );
}

const createStyles = (theme: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: theme.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.text,
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
    borderRadius: 999,
    backgroundColor: theme.tinted,
    marginBottom: 8,
  },
  stepBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.primary,
  },
  dashedSlot: {
    width: 140,
    height: 140,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: theme.placeholder,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
  },
  dashedSlotText: {
    fontSize: 12,
    color: theme.placeholder,
    fontWeight: "500",
  },
  filledSlot: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  slotImage: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
  },
  slotCheckBadge: {
    position: "absolute",
    bottom: -6,
    right: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: theme.bg,
  },
  captureTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.text,
    textAlign: "center",
    letterSpacing: -0.3,
    marginTop: 4,
  },
  captureSubtitle: {
    fontSize: 15,
    color: theme.muted,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },
  captureBtnWrapper: {
    marginTop: 16,
    borderRadius: 999,
    overflow: "hidden",
  },
  captureBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
  },
  captureBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
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
    borderColor: theme.mint,
  },
  thumbCheck: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
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
    borderColor: theme.tinted,
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
    backgroundColor: theme.mint,
  },
  analyzingText: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.text,
    textAlign: "center",
  },
  analyzingHint: {
    fontSize: 14,
    color: theme.muted,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  successState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  confettiContainer: {
    position: "absolute",
    top: "30%",
    left: 0,
    right: 0,
    height: 120,
    zIndex: 10,
    pointerEvents: "none",
  },
  confettiDot: {
    position: "absolute",
    borderRadius: 999,
    top: 60,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: theme.text,
    textAlign: "center",
    marginTop: 12,
  },
  successSubtitle: {
    fontSize: 15,
    color: theme.muted,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
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
    color: theme.text,
    marginTop: 4,
  },
  errorText: {
    fontSize: 15,
    color: theme.muted,
    textAlign: "center",
    lineHeight: 22,
  },
  retryBtnWrapper: {
    marginTop: 12,
    borderRadius: 999,
    overflow: "hidden",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 999,
  },
  retryBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  cancelBtn: {
    paddingVertical: 12,
  },
  cancelBtnText: {
    fontSize: 15,
    color: theme.muted,
    fontWeight: "500",
  },
  reviewState: {
    flex: 1,
  },
  reviewContent: {
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 32,
    paddingBottom: 40,
    gap: 12,
  },
  reviewIconRow: {
    marginBottom: 4,
  },
  reviewTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  reviewSubtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
  },
  reviewInputWrapper: {
    width: "100%",
    marginTop: 8,
    gap: 6,
  },
  reviewInput: {
    width: "100%",
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    paddingHorizontal: 16,
    fontSize: 17,
    fontWeight: "500" as const,
    backgroundColor: "transparent",
  },
  reviewValidation: {
    fontSize: 13,
    fontWeight: "500" as const,
    paddingLeft: 4,
  },
  reviewExtractedCard: {
    width: "100%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 6,
    marginTop: 4,
  },
  reviewExtractedTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    marginBottom: 2,
  },
  reviewExtractedRow: {
    fontSize: 14,
    lineHeight: 20,
  },
  reviewSubmitWrapper: {
    marginTop: 12,
    borderRadius: 999,
    overflow: "hidden" as const,
  },
  reviewSubmitBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
  },
  reviewSubmitText: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#fff",
  },
});
