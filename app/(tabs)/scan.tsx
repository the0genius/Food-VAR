import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Dimensions,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  withDelay,
} from "react-native-reanimated";
import { CameraView, useCameraPermissions } from "expo-camera";
import Colors from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SCAN_COOLDOWN_MS = 2500;

function ScanLineOverlay() {
  const translateY = useSharedValue(0);

  useState(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(180, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  });

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={styles.scanOverlay}>
      <View style={styles.scanFrame}>
        <View style={[styles.scanCorner, styles.scanCornerTL]} />
        <View style={[styles.scanCorner, styles.scanCornerTR]} />
        <View style={[styles.scanCorner, styles.scanCornerBL]} />
        <View style={[styles.scanCorner, styles.scanCornerBR]} />
        <Animated.View style={[styles.scanLine, lineStyle]} />
      </View>
    </View>
  );
}

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const [mode, setMode] = useState<"search" | "scanner">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastScannedBarcode, setLastScannedBarcode] = useState("");
  const [scanStatus, setScanStatus] = useState<"scanning" | "found" | "not_found">("scanning");
  const [foundProductName, setFoundProductName] = useState("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const lastScanTime = useRef(0);
  const [permission, requestPermission] = useCameraPermissions();

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  useFocusEffect(
    useCallback(() => {
      setSearchQuery("");
      setSearchResults([]);
      setScanStatus("scanning");
      setLastScannedBarcode("");
      setProcessing(false);
    }, [])
  );

  async function handleSearch(query: string) {
    setSearchQuery(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const baseUrl = getApiUrl();
        const url = new URL(`/api/products/search?q=${encodeURIComponent(query)}&limit=15`, baseUrl);
        const res = await fetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (e) {
        console.error("Search failed:", e);
      }
      setSearching(false);
    }, 300);
  }

  async function handleBarcodeScanned({ data: barcode }: { data: string }) {
    const now = Date.now();
    if (now - lastScanTime.current < SCAN_COOLDOWN_MS) return;
    if (barcode === lastScannedBarcode && processing) return;
    if (processing) return;

    lastScanTime.current = now;
    setLastScannedBarcode(barcode);
    setProcessing(true);
    setScanStatus("scanning");

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const baseUrl = getApiUrl();
      const url = new URL(`/api/products/barcode/${barcode}`, baseUrl);
      const res = await fetch(url.toString());

      if (res.ok) {
        const product = await res.json();
        setScanStatus("found");
        setFoundProductName(product.name);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        setTimeout(() => {
          if (user) {
            router.push({
              pathname: "/result",
              params: { productId: product.id, userId: user.id, accessMethod: "scan" },
            });
          }
          setTimeout(() => {
            setProcessing(false);
            setScanStatus("scanning");
            setLastScannedBarcode("");
          }, 1000);
        }, 1200);
      } else {
        setScanStatus("not_found");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

        setTimeout(() => {
          Alert.alert(
            "Product Not Found",
            `Barcode ${barcode} isn't in our database yet. Would you like to add it?`,
            [
              {
                text: "Cancel",
                style: "cancel",
                onPress: () => {
                  setProcessing(false);
                  setScanStatus("scanning");
                  setLastScannedBarcode("");
                },
              },
              {
                text: "Add Product",
                onPress: () => {
                  router.push({
                    pathname: "/contribute",
                    params: { barcode },
                  });
                  setProcessing(false);
                  setScanStatus("scanning");
                  setLastScannedBarcode("");
                },
              },
            ]
          );
        }, 800);
      }
    } catch (e) {
      console.error(e);
      setProcessing(false);
      setScanStatus("scanning");
      setLastScannedBarcode("");
    }
  }

  async function handleProductSelect(product: any) {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/result",
      params: { productId: product.id, userId: user.id, accessMethod: "search" },
    });
  }

  function renderCameraScanner() {
    if (Platform.OS === "web") {
      return (
        <View style={styles.webFallback}>
          <Ionicons name="camera-outline" size={64} color={Colors.primaryLight} />
          <Text style={styles.webFallbackTitle}>Camera not available on web</Text>
          <Text style={styles.webFallbackText}>
            Use the Search tab or scan the QR code with your phone to use the camera scanner
          </Text>
        </View>
      );
    }

    if (!permission) {
      return (
        <View style={styles.permissionState}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.permissionState}>
          <Ionicons name="camera-outline" size={56} color={Colors.primaryLight} />
          <Text style={styles.permissionTitle}>Camera Access Needed</Text>
          <Text style={styles.permissionText}>
            Allow camera access to scan product barcodes
          </Text>
          {permission.status === "denied" && !permission.canAskAgain ? (
            <Text style={styles.permissionHint}>
              Please enable camera access in your device settings
            </Text>
          ) : (
            <TouchableOpacity
              style={styles.permissionBtn}
              onPress={requestPermission}
            >
              <Ionicons name="camera" size={20} color={Colors.white} />
              <Text style={styles.permissionBtnText}>Allow Camera</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: [
              "ean13",
              "ean8",
              "upc_a",
              "upc_e",
              "code128",
              "code39",
              "code93",
              "itf14",
              "codabar",
            ],
          }}
          onBarcodeScanned={processing ? undefined : handleBarcodeScanned}
        />
        <ScanLineOverlay />

        <View style={styles.scanStatusBar}>
          {scanStatus === "scanning" && !processing && (
            <Animated.View entering={FadeIn.duration(400)} style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Point at a barcode to scan</Text>
            </Animated.View>
          )}
          {processing && scanStatus === "scanning" && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.statusRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.statusText}>Looking up barcode...</Text>
            </Animated.View>
          )}
          {scanStatus === "found" && (
            <Animated.View entering={FadeIn.duration(300)} style={[styles.statusRow, styles.statusFound]}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.scoreGreen} />
              <Text style={[styles.statusText, { color: Colors.scoreGreen }]}>
                {foundProductName}
              </Text>
            </Animated.View>
          )}
          {scanStatus === "not_found" && (
            <Animated.View entering={FadeIn.duration(300)} style={[styles.statusRow, styles.statusNotFound]}>
              <Ionicons name="help-circle" size={20} color={Colors.scoreAmber} />
              <Text style={[styles.statusText, { color: Colors.scoreAmber }]}>
                Product not in database
              </Text>
            </Animated.View>
          )}
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={[
          styles.header,
          { paddingTop: (insets.top || webTopInset) + 12 },
        ]}
      >
        <Text style={styles.headerTitle}>Check a Product</Text>
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === "search" && styles.modeBtnActive]}
            onPress={() => {
              setMode("search");
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Ionicons
              name="search"
              size={16}
              color={mode === "search" ? Colors.white : Colors.primary}
            />
            <Text
              style={[
                styles.modeBtnText,
                mode === "search" && styles.modeBtnTextActive,
              ]}
            >
              Search
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === "scanner" && styles.modeBtnActive]}
            onPress={() => {
              setMode("scanner");
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Ionicons
              name="scan-outline"
              size={16}
              color={mode === "scanner" ? Colors.white : Colors.primary}
            />
            <Text
              style={[
                styles.modeBtnText,
                mode === "scanner" && styles.modeBtnTextActive,
              ]}
            >
              Scanner
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {mode === "search" && (
        <View style={styles.searchArea}>
          <View style={styles.searchInputWrap}>
            <Ionicons name="search" size={18} color={Colors.mediumGray} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Search by name, brand, or category..."
              placeholderTextColor={Colors.mediumGray}
              autoCapitalize="none"
              autoCorrect={false}
              testID="search-input"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch("")}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={Colors.mediumGray}
                />
              </TouchableOpacity>
            )}
          </View>

          {searching && (
            <ActivityIndicator
              style={{ marginTop: 20 }}
              color={Colors.primary}
            />
          )}

          <FlatList
            data={searchResults}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInDown.delay(index * 40).duration(300)}>
                <TouchableOpacity
                  style={styles.searchResultCard}
                  onPress={() => handleProductSelect(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.resultIcon}>
                    <Ionicons
                      name="nutrition-outline"
                      size={20}
                      color={Colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.resultBrand} numberOfLines={1}>
                      {item.brand || ""}
                      {item.category ? ` \u00B7 ${item.category}` : ""}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={Colors.lightGray}
                  />
                </TouchableOpacity>
              </Animated.View>
            )}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 8,
              paddingBottom: 120,
            }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              searchQuery.length >= 2 && !searching ? (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="search-outline"
                    size={40}
                    color={Colors.lightGray}
                  />
                  <Text style={styles.emptyText}>No products found</Text>
                  <TouchableOpacity
                    style={styles.contributeBtn}
                    onPress={() => router.push("/contribute")}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                    <Text style={styles.contributeBtnText}>Add a product</Text>
                  </TouchableOpacity>
                </View>
              ) : searchQuery.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="nutrition" size={44} color={Colors.primaryLight} />
                  <Text style={styles.emptyTitle}>Find Any Product</Text>
                  <Text style={styles.emptyText}>
                    Type a product name or brand to get your personalized score
                  </Text>
                </View>
              ) : null
            }
          />
        </View>
      )}

      {mode === "scanner" && renderCameraScanner()}
    </KeyboardAvoidingView>
  );
}

const SCAN_FRAME_SIZE = SCREEN_WIDTH * 0.7;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.white,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.charcoal,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: Colors.primaryPale,
    borderRadius: 14,
    padding: 3,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  modeBtnActive: {
    backgroundColor: Colors.primary,
  },
  modeBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
  },
  modeBtnTextActive: {
    color: Colors.white,
  },
  searchArea: {
    flex: 1,
  },
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 14,
    height: 48,
    backgroundColor: Colors.softWhite,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.lightGray,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.charcoal,
  },
  searchResultCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: Colors.softWhite,
    borderRadius: 14,
    marginBottom: 8,
    gap: 12,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primaryPale,
    alignItems: "center",
    justifyContent: "center",
  },
  resultName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.charcoal,
  },
  resultBrand: {
    fontSize: 13,
    color: Colors.mediumGray,
    marginTop: 2,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.charcoal,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.mediumGray,
    textAlign: "center",
    maxWidth: 260,
  },
  contributeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.primaryPale,
    marginTop: 8,
  },
  contributeBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  scanFrame: {
    width: SCAN_FRAME_SIZE,
    height: SCAN_FRAME_SIZE * 0.6,
    position: "relative",
  },
  scanCorner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: Colors.primary,
  },
  scanCornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 10,
  },
  scanCornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 10,
  },
  scanCornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 10,
  },
  scanCornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 10,
  },
  scanLine: {
    position: "absolute",
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: Colors.primary,
    opacity: 0.7,
    borderRadius: 1,
  },
  scanStatusBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 20,
    paddingHorizontal: 24,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  statusFound: {},
  statusNotFound: {},
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  statusText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.charcoal,
  },
  permissionState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.charcoal,
    marginTop: 8,
  },
  permissionText: {
    fontSize: 15,
    color: Colors.mediumGray,
    textAlign: "center",
    lineHeight: 22,
  },
  permissionHint: {
    fontSize: 13,
    color: Colors.mediumGray,
    textAlign: "center",
    marginTop: 8,
  },
  permissionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    marginTop: 12,
  },
  permissionBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.white,
  },
  webFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  webFallbackTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.charcoal,
    marginTop: 8,
  },
  webFallbackText: {
    fontSize: 14,
    color: Colors.mediumGray,
    textAlign: "center",
    lineHeight: 22,
  },
});
