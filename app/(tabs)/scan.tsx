import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Dimensions,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
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
} from "react-native-reanimated";
import { MotiView } from "moti";
import { MagnifyingGlass, Package, CaretRight, Camera, Barcode, XCircle, PlusCircle } from "phosphor-react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import Colors, { C, cardShadow } from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";
import { getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SCAN_COOLDOWN_MS = 2500;
const SCAN_FRAME_SIZE = 260;

function ScanLineOverlay() {
  const translateY = useSharedValue(0);

  useState(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(SCAN_FRAME_SIZE, { duration: 2800, easing: Easing.inOut(Easing.ease) }),
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

  function getStatusDotColor() {
    if (scanStatus === "found") return C.green;
    if (scanStatus === "not_found") return C.amber;
    if (processing) return C.amber;
    return C.mint;
  }

  function getStatusText() {
    if (scanStatus === "found") return foundProductName;
    if (scanStatus === "not_found") return "Product not in database";
    if (processing) return "Looking up barcode...";
    return "Point at a barcode to scan";
  }

  function renderCameraScanner() {
    if (Platform.OS === "web") {
      return (
        <View style={styles.webFallback}>
          <View style={styles.iconCircle}>
            <Camera size={40} color={Colors.primaryLight} />
          </View>
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
          <MotiView
            from={{ opacity: 0.4 }}
            animate={{ opacity: 0.9 }}
            transition={{ loop: true, type: "timing", duration: 850 }}
            style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: "#EBEBEB" }}
          />
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.permissionState}>
          <View style={styles.iconCircle}>
            <Camera size={36} color={Colors.primaryLight} />
          </View>
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
              <Camera size={20} color={C.card} weight="fill" />
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

        <View style={styles.scanBottomArea}>
          <Animated.View entering={FadeIn.duration(400)} style={styles.statusPill}>
            <View style={[styles.statusDot, { backgroundColor: getStatusDotColor() }]} />
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </Animated.View>

          <TouchableOpacity
            style={styles.searchLinkPill}
            onPress={() => {
              setMode("search");
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Text style={styles.searchLinkText}>Can't scan it? Search by name</Text>
            <CaretRight size={13} color="white" />
          </TouchableOpacity>
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
            <MagnifyingGlass
              size={16}
              color={mode === "search" ? C.text : C.placeholder}
              weight={mode === "search" ? "bold" : "regular"}
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
            <Barcode
              size={16}
              color={mode === "scanner" ? C.text : C.placeholder}
              weight={mode === "scanner" ? "bold" : "regular"}
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
            <MagnifyingGlass size={18} color={C.placeholder} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Search by name, brand, or category..."
              placeholderTextColor={C.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              testID="search-input"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch("")}>
                <XCircle size={18} color={C.placeholder} weight="fill" />
              </TouchableOpacity>
            )}
          </View>

          {searching && (
            <View style={{ alignItems: "center", marginTop: 20, gap: 8 }}>
              <MotiView
                from={{ opacity: 0.4 }}
                animate={{ opacity: 0.9 }}
                transition={{ loop: true, type: "timing", duration: 850 }}
                style={{ width: 200, height: 14, borderRadius: 7, backgroundColor: "#EBEBEB" }}
              />
              <MotiView
                from={{ opacity: 0.4 }}
                animate={{ opacity: 0.9 }}
                transition={{ loop: true, type: "timing", duration: 850, delay: 100 }}
                style={{ width: 140, height: 14, borderRadius: 7, backgroundColor: "#EBEBEB" }}
              />
            </View>
          )}

          <FlatList
            data={searchResults}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item, index }) => (
              <MotiView
                from={{ opacity: 0, translateY: 8 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ delay: index * 50, type: "timing" }}
              >
                <TouchableOpacity
                  style={styles.searchResultCard}
                  onPress={() => handleProductSelect(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.resultIcon}>
                    <Package size={22} color="#CCCCCC" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
                      <Text style={styles.resultBrand} numberOfLines={1}>
                        {item.brand || ""}
                      </Text>
                      {item.category ? (
                        <View style={styles.categoryChip}>
                          <Text style={styles.categoryChipText}>{item.category}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <CaretRight size={16} color={C.placeholder} />
                </TouchableOpacity>
              </MotiView>
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
                  <View style={styles.iconCircle}>
                    <MagnifyingGlass size={32} color="#CCCCCC" weight="thin" />
                  </View>
                  <Text style={styles.emptyTitle}>No products found</Text>
                  <Text style={styles.emptyText}>
                    Try a different search term or add a new product
                  </Text>
                  <TouchableOpacity
                    style={styles.contributeBtn}
                    onPress={() => router.push("/contribute")}
                  >
                    <PlusCircle size={18} color={C.primary} />
                    <Text style={styles.contributeBtnText}>Add a product</Text>
                  </TouchableOpacity>
                </View>
              ) : searchQuery.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.iconCircle}>
                    <Package size={32} color="#CCCCCC" weight="thin" />
                  </View>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: C.card,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: C.text,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: C.bg,
    borderRadius: 16,
    padding: 4,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 13,
  },
  modeBtnActive: {
    backgroundColor: C.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    ...Platform.select({
      android: { elevation: 2 } as any,
      default: {},
    }),
  },
  modeBtnText: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: C.placeholder,
  },
  modeBtnTextActive: {
    color: C.text,
    fontWeight: "700" as const,
  },
  searchArea: {
    flex: 1,
  },
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: C.border,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    ...Platform.select({
      android: { elevation: 1 } as any,
      default: {},
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: C.text,
  },
  searchResultCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: C.card,
    borderRadius: 20,
    marginBottom: 10,
    gap: 12,
    borderWidth: 0.5,
    borderColor: C.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    ...Platform.select({
      android: { elevation: 3 } as any,
      default: {},
    }),
  },
  resultIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  resultName: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: C.text,
  },
  resultBrand: {
    fontSize: 12,
    color: C.muted,
  },
  categoryChip: {
    backgroundColor: C.bg,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  categoryChipText: {
    fontSize: 11,
    color: C.muted,
    fontWeight: "500" as const,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: C.text,
    marginTop: 4,
    letterSpacing: -0.3,
  },
  emptyText: {
    fontSize: 14,
    color: C.muted,
    textAlign: "center",
    maxWidth: 260,
  },
  contributeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 8,
    ...cardShadow("subtle"),
  },
  contributeBtnText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: C.primary,
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
    height: SCAN_FRAME_SIZE,
    position: "relative",
    shadowColor: C.mint,
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  scanCorner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: C.mint,
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
    backgroundColor: C.mint,
    opacity: 0.85,
    borderRadius: 1,
  },
  scanBottomArea: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingBottom: 40,
    gap: 12,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.72)",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: "white",
  },
  searchLinkPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  searchLinkText: {
    fontSize: 13,
    color: "white",
    fontWeight: "500" as const,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
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
    fontWeight: "700" as const,
    color: C.text,
    marginTop: 8,
  },
  permissionText: {
    fontSize: 15,
    color: C.muted,
    textAlign: "center",
    lineHeight: 22,
  },
  permissionHint: {
    fontSize: 13,
    color: C.muted,
    textAlign: "center",
    marginTop: 8,
  },
  permissionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 18,
    backgroundColor: "#3DD68C",
    marginTop: 12,
    ...cardShadow("medium"),
  },
  permissionBtnText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: C.card,
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
    fontWeight: "700" as const,
    color: C.text,
    marginTop: 8,
  },
  webFallbackText: {
    fontSize: 14,
    color: C.muted,
    textAlign: "center",
    lineHeight: 22,
  },
});
