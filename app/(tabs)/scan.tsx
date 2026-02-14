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
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const [mode, setMode] = useState<"search" | "barcode">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  useFocusEffect(
    useCallback(() => {
      setSearchQuery("");
      setSearchResults([]);
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

  async function handleBarcodeLookup() {
    if (!barcodeInput.trim() || !user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLookingUp(true);
    try {
      const baseUrl = getApiUrl();
      const url = new URL(`/api/products/barcode/${barcodeInput.trim()}`, baseUrl);
      const res = await fetch(url.toString());
      if (res.ok) {
        const product = await res.json();
        router.push({
          pathname: "/result",
          params: { productId: product.id, userId: user.id, accessMethod: "scan" },
        });
      } else {
        Alert.alert(
          "Product Not Found",
          "This barcode isn't in our database yet. Would you like to add it?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Add Product",
              onPress: () =>
                router.push({
                  pathname: "/contribute",
                  params: { barcode: barcodeInput.trim() },
                }),
            },
          ]
        );
      }
    } catch (e) {
      console.error(e);
    }
    setLookingUp(false);
  }

  async function handleProductSelect(product: any) {
    if (!user) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/result",
      params: { productId: product.id, userId: user.id, accessMethod: "search" },
    });
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
            style={[styles.modeBtn, mode === "barcode" && styles.modeBtnActive]}
            onPress={() => {
              setMode("barcode");
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Ionicons
              name="barcode-outline"
              size={16}
              color={mode === "barcode" ? Colors.white : Colors.primary}
            />
            <Text
              style={[
                styles.modeBtnText,
                mode === "barcode" && styles.modeBtnTextActive,
              ]}
            >
              Barcode
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

      {mode === "barcode" && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.barcodeArea}>
          <View style={styles.barcodeVisual}>
            <Ionicons name="barcode" size={80} color={Colors.primaryLight} />
            <Text style={styles.barcodeHint}>
              Enter the barcode number printed on the product
            </Text>
          </View>
          <View style={styles.barcodeInputWrap}>
            <TextInput
              style={styles.barcodeInput}
              value={barcodeInput}
              onChangeText={setBarcodeInput}
              placeholder="e.g., 5449000000996"
              placeholderTextColor={Colors.mediumGray}
              keyboardType="number-pad"
              testID="barcode-input"
            />
            <TouchableOpacity
              style={[
                styles.lookupBtn,
                (!barcodeInput.trim() || lookingUp) && styles.lookupBtnDisabled,
              ]}
              onPress={handleBarcodeLookup}
              disabled={!barcodeInput.trim() || lookingUp}
            >
              {lookingUp ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Ionicons name="arrow-forward" size={22} color={Colors.white} />
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.white,
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
  barcodeArea: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    alignItems: "center",
  },
  barcodeVisual: {
    alignItems: "center",
    gap: 16,
    marginBottom: 40,
  },
  barcodeHint: {
    fontSize: 15,
    color: Colors.mediumGray,
    textAlign: "center",
    maxWidth: 280,
  },
  barcodeInputWrap: {
    flexDirection: "row",
    width: "100%",
    gap: 10,
  },
  barcodeInput: {
    flex: 1,
    height: 52,
    borderWidth: 1.5,
    borderColor: Colors.lightGray,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 17,
    color: Colors.charcoal,
    backgroundColor: Colors.softWhite,
    letterSpacing: 1,
    fontWeight: "600",
  },
  lookupBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  lookupBtnDisabled: {
    opacity: 0.5,
  },
});
