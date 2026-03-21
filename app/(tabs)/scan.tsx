import { useState, useRef, useCallback, useMemo } from "react";
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
import Colors, { cardShadow, useThemeColors, type ThemeColors } from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";
import { getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SCAN_COOLDOWN_MS = 2500;
const SCAN_FRAME_SIZE = 260;

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);

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
  const { user } = useUser();
  const [mode, setMode] = useState<"search" | "scanner">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastScannedBarcode, setLastScannedBarcode] = useState("");
  const [scanStatus, setScanStatus] = useState<"scanning" | "found" | "not_found">("scanning");
  const [foundProductName, setFoundProductName] = useState("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
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
              params: { productId: product.id, accessMethod: "scan" },
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
      params: { productId: product.id, accessMethod: "search" },
    });
  }

  function getStatusDotColor() {
    if (scanStatus === "found") return theme.green;
    if (scanStatus === "not_found") return theme.amber;
    if (processing) return theme.amber;
    return theme.mint;
  }

  function getStatusText() {
    if (scanStatus === "found") return foundProductName;
    if (scanStatus === "not_found") return "Product not in database";
    if (processing) return "Looking up barcode...";
    return "Point at a barcode to scan";
  }

  const [manualBarcode, setManualBarcode] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);

  async function handleManualBarcodeLookup() {
    const barcode = manualBarcode.trim();
    if (!barcode) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    handleBarcodeScanned({ data: barcode });
    setManualBarcode("");
    setShowManualEntry(false);
  }

  function renderManualBarcodeEntry() {
    return (
      <View style={styles.manualEntryWrap}>
        <View style={styles.manualEntryRow}>
          <Barcode size={18} color={theme.placeholder} />
          <TextInput
            style={styles.manualEntryInput}
            value={manualBarcode}
            onChangeText={setManualBarcode}
            placeholder="Enter barcode number..."
            placeholderTextColor={theme.placeholder}
            keyboardType="number-pad"
            returnKeyType="go"
            onSubmitEditing={handleManualBarcodeLookup}
            accessibilityLabel="Enter barcode number"
            testID="manual-barcode-input"
          />
          {manualBarcode.length > 0 && (
            <TouchableOpacity
              onPress={handleManualBarcodeLookup}
              style={styles.manualEntryGoBtn}
              accessibilityLabel="Look up barcode"
              accessibilityRole="button"
            >
              <Text style={styles.manualEntryGoBtnText}>Go</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
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
            Use the Search tab or enter a barcode number below
          </Text>
          {renderManualBarcodeEntry()}
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
            style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: theme.skeleton }}
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
            <>
              <Text style={styles.permissionHint}>
                Please enable camera access in your device settings
              </Text>
              <Text style={[styles.permissionHint, { marginTop: 16, color: theme.muted }]}>
                Or enter a barcode manually:
              </Text>
              {renderManualBarcodeEntry()}
            </>
          ) : (
            <TouchableOpacity
              style={styles.permissionBtn}
              onPress={requestPermission}
              accessibilityLabel="Allow camera access for scanning"
              accessibilityRole="button"
            >
              <Camera size={20} color={theme.card} weight="fill" />
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
              setShowManualEntry(!showManualEntry);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            accessibilityLabel="Enter barcode manually"
            accessibilityRole="button"
          >
            <Text style={styles.searchLinkText}>{showManualEntry ? "Hide manual entry" : "Type barcode instead"}</Text>
            <CaretRight size={13} color="white" />
          </TouchableOpacity>
        </View>
        {showManualEntry && (
          <View style={styles.manualOverlay}>
            {renderManualBarcodeEntry()}
          </View>
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.bg }]}
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
            accessibilityLabel="Search mode"
            accessibilityRole="button"
            accessibilityState={{ selected: mode === "search" }}
          >
            <MagnifyingGlass
              size={18}
              color={mode === "search" ? theme.text : theme.placeholder}
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
            accessibilityLabel="Scanner mode"
            accessibilityRole="button"
            accessibilityState={{ selected: mode === "scanner" }}
          >
            <Barcode
              size={18}
              color={mode === "scanner" ? theme.text : theme.placeholder}
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
            <MagnifyingGlass size={20} color={theme.placeholder} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Search by name, brand, or category..."
              placeholderTextColor={theme.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              testID="search-input"
              accessibilityLabel="Search products"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch("")} accessibilityLabel="Clear search" accessibilityRole="button" style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                <XCircle size={18} color={theme.placeholder} weight="fill" />
              </TouchableOpacity>
            )}
          </View>

          {searching && (
            <View style={{ alignItems: "center", marginTop: 20, gap: 8 }}>
              <MotiView
                from={{ opacity: 0.4 }}
                animate={{ opacity: 0.9 }}
                transition={{ loop: true, type: "timing", duration: 850 }}
                style={{ width: 200, height: 14, borderRadius: 7, backgroundColor: theme.skeleton }}
              />
              <MotiView
                from={{ opacity: 0.4 }}
                animate={{ opacity: 0.9 }}
                transition={{ loop: true, type: "timing", duration: 850, delay: 100 }}
                style={{ width: 140, height: 14, borderRadius: 7, backgroundColor: theme.skeleton }}
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
                  accessibilityLabel={`${item.name}${item.brand ? `, ${item.brand}` : ""}${item.category ? `, ${item.category}` : ""}`}
                  accessibilityRole="button"
                >
                  <View style={styles.resultIcon}>
                    <Package size={24} color={theme.muted} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.resultName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.resultMetaRow}>
                      <Text style={styles.resultBrand} numberOfLines={1}>
                        {item.brand || ""}
                      </Text>
                      {item.category ? (
                        <>
                          <View style={styles.resultDotSeparator} />
                          <View style={styles.categoryChip}>
                            <Text style={styles.categoryChipText}>{item.category}</Text>
                          </View>
                        </>
                      ) : null}
                    </View>
                  </View>
                  <CaretRight size={20} color={theme.placeholder} />
                </TouchableOpacity>
              </MotiView>
            )}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 120,
            }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              searchQuery.length >= 2 && !searching ? (
                <View style={styles.emptyState}>
                  <View style={styles.iconCircle}>
                    <MagnifyingGlass size={32} color={theme.mutedIcon} weight="thin" />
                  </View>
                  <Text style={styles.emptyTitle}>No products found</Text>
                  <Text style={styles.emptyText}>
                    Try a different search term or add a new product
                  </Text>
                  <TouchableOpacity
                    style={styles.contributeBtn}
                    onPress={() => router.push("/contribute")}
                    accessibilityLabel="Add a new product"
                    accessibilityRole="button"
                  >
                    <PlusCircle size={18} color={theme.primary} />
                    <Text style={styles.contributeBtnText}>Add a product</Text>
                  </TouchableOpacity>
                </View>
              ) : searchQuery.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconBox}>
                    <Package size={32} color={theme.placeholder} />
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

const createStyles = (theme: ThemeColors) => {
  const isDark = theme.bg === '#121212';

  const bentoShadow = isDark
    ? { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 }
    : { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 };

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
    },
    header: {
      paddingHorizontal: 20,
      paddingBottom: 20,
      backgroundColor: theme.card,
      zIndex: 10,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      ...bentoShadow,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "700" as const,
      color: theme.text,
      letterSpacing: -0.3,
      marginBottom: 20,
    },
    modeToggle: {
      flexDirection: "row",
      backgroundColor: theme.chipBg,
      borderRadius: 16,
      padding: 4,
    },
    modeBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      minHeight: 44,
      borderRadius: 14,
    },
    modeBtnActive: {
      backgroundColor: theme.cardRaised,
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
      color: theme.placeholder,
    },
    modeBtnTextActive: {
      color: theme.text,
      fontWeight: "600" as const,
    },
    searchArea: {
      flex: 1,
    },
    searchInputWrap: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: 20,
      marginTop: 24,
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.subtleBorder,
      gap: 12,
      ...bentoShadow,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: theme.text,
    },
    searchResultCard: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      backgroundColor: theme.card,
      borderRadius: 20,
      marginBottom: 12,
      gap: 16,
      borderWidth: isDark ? 1 : 0,
      borderColor: theme.subtleBorder,
      ...bentoShadow,
    },
    resultIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: theme.bg,
      alignItems: "center",
      justifyContent: "center",
    },
    resultName: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: theme.text,
      marginBottom: 6,
    },
    resultMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    resultBrand: {
      fontSize: 13,
      color: theme.muted,
    },
    resultDotSeparator: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: theme.placeholder,
      opacity: 0.5,
    },
    categoryChip: {
      backgroundColor: theme.chipBg,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 2,
    },
    categoryChipText: {
      fontSize: 11,
      color: theme.muted,
      fontWeight: "500" as const,
    },
    emptyState: {
      alignItems: "center",
      paddingTop: 60,
      gap: 10,
    },
    emptyIconBox: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: theme.card,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
      ...bentoShadow,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: theme.text,
      marginTop: 4,
      letterSpacing: -0.3,
    },
    emptyText: {
      fontSize: 14,
      color: theme.muted,
      textAlign: "center",
      maxWidth: 240,
      lineHeight: 22,
    },
    contributeBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 999,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      marginTop: 8,
      ...bentoShadow,
    },
    contributeBtnText: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: theme.primary,
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
      shadowColor: theme.mint,
      shadowOpacity: 0.3,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 0 },
    },
    scanCorner: {
      position: "absolute",
      width: 28,
      height: 28,
      borderColor: theme.mint,
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
      backgroundColor: theme.mint,
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
      backgroundColor: theme.bg,
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
      color: theme.text,
      marginTop: 8,
    },
    permissionText: {
      fontSize: 15,
      color: theme.muted,
      textAlign: "center",
      lineHeight: 22,
    },
    permissionHint: {
      fontSize: 13,
      color: theme.muted,
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
      backgroundColor: theme.mint,
      marginTop: 12,
      ...cardShadow("medium"),
    },
    permissionBtnText: {
      fontSize: 16,
      fontWeight: "700" as const,
      color: theme.card,
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
      color: theme.text,
      marginTop: 8,
    },
    webFallbackText: {
      fontSize: 14,
      color: theme.muted,
      textAlign: "center",
      lineHeight: 22,
    },
    manualEntryWrap: {
      width: "100%",
      paddingHorizontal: 20,
      marginTop: 16,
    },
    manualEntryRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 0.5,
      borderColor: theme.border,
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 10,
      ...cardShadow("subtle"),
    },
    manualEntryInput: {
      flex: 1,
      fontSize: 15,
      color: theme.text,
    },
    manualEntryGoBtn: {
      backgroundColor: theme.mint,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    manualEntryGoBtnText: {
      fontSize: 14,
      fontWeight: "700" as const,
      color: theme.card,
    },
    manualOverlay: {
      position: "absolute",
      bottom: 120,
      left: 0,
      right: 0,
      zIndex: 20,
    },
  });
};
