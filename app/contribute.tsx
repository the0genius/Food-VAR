import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import Animated, { FadeInDown } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";
import { apiRequest, queryClient } from "@/lib/query-client";

const CATEGORIES = [
  "Beverages",
  "Dairy",
  "Snacks",
  "Breakfast",
  "Meals",
  "Bakery",
  "Frozen",
  "Canned",
  "Condiments",
  "Pasta",
  "Dairy Alternatives",
  "Other",
];

const ALLERGEN_OPTIONS = [
  "gluten",
  "lactose",
  "nuts",
  "peanuts",
  "soy",
  "eggs",
  "shellfish",
  "fish",
  "wheat",
];

export default function ContributeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const params = useLocalSearchParams<{ barcode?: string }>();

  const [barcode, setBarcode] = useState(params.barcode || "");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [servingSize, setServingSize] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [sugar, setSugar] = useState("");
  const [fat, setFat] = useState("");
  const [saturatedFat, setSaturatedFat] = useState("");
  const [fiber, setFiber] = useState("");
  const [sodium, setSodium] = useState("");
  const [allergens, setAllergens] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  function toggleAllergen(id: string) {
    if (allergens.includes(id)) {
      setAllergens(allergens.filter((a) => a !== id));
    } else {
      setAllergens([...allergens, id]);
    }
  }

  async function handleExtractFromPhotos() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const frontResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        base64: true,
      });

      if (frontResult.canceled) return;

      Alert.alert("Back of Package", "Now select the nutrition label photo");

      const backResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        base64: true,
      });

      if (backResult.canceled) return;

      setExtracting(true);

      const res = await apiRequest("POST", "/api/products/extract", {
        frontImage: frontResult.assets[0].base64,
        backImage: backResult.assets[0].base64,
      });

      const data = await res.json();

      if (data.success && data.data) {
        const d = data.data;
        if (d.name) setName(d.name);
        if (d.brand) setBrand(d.brand);
        if (d.category) setCategory(d.category);
        if (d.servingSize) setServingSize(d.servingSize);
        if (d.calories != null) setCalories(String(d.calories));
        if (d.protein != null) setProtein(String(d.protein));
        if (d.carbohydrates != null) setCarbs(String(d.carbohydrates));
        if (d.sugar != null) setSugar(String(d.sugar));
        if (d.fat != null) setFat(String(d.fat));
        if (d.saturatedFat != null) setSaturatedFat(String(d.saturatedFat));
        if (d.fiber != null) setFiber(String(d.fiber));
        if (d.sodium != null) setSodium(String(d.sodium));
        if (d.allergens) setAllergens(d.allergens);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert(
          "Extraction Issue",
          data.error || "Could not extract all values. Please fill in manually."
        );
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to process images. Please enter values manually.");
    }
    setExtracting(false);
  }

  async function handleSubmit() {
    if (!barcode.trim() || !name.trim()) {
      Alert.alert("Required", "Please enter at least a barcode and product name.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/products/contribute", {
        barcode: barcode.trim(),
        name: name.trim(),
        brand: brand.trim(),
        category,
        servingSize: servingSize.trim(),
        calories: calories ? parseFloat(calories) : null,
        protein: protein ? parseFloat(protein) : null,
        carbohydrates: carbs ? parseFloat(carbs) : null,
        sugar: sugar ? parseFloat(sugar) : null,
        fat: fat ? parseFloat(fat) : null,
        saturatedFat: saturatedFat ? parseFloat(saturatedFat) : null,
        fiber: fiber ? parseFloat(fiber) : null,
        sodium: sodium ? parseFloat(sodium) : null,
        allergens,
        contributedBy: user?.id,
      });

      const data = await res.json();

      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (data.isNew) {
        Alert.alert("Product Added", "Thank you for contributing to the community database!", [
          {
            text: "Check Score",
            onPress: () => {
              if (user && data.product) {
                router.replace({
                  pathname: "/result",
                  params: {
                    productId: data.product.id,
                    userId: user.id,
                    accessMethod: "contribute",
                  },
                });
              }
            },
          },
          { text: "Done", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Already Exists", "This barcode is already in the database.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to submit product. Please try again.");
    }
    setSubmitting(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={[
          styles.header,
          { paddingTop: (insets.top || webTopInset) + 8 },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={Colors.charcoal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Product</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 0) + 100,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.extractBtn}
          onPress={handleExtractFromPhotos}
          disabled={extracting}
        >
          {extracting ? (
            <ActivityIndicator color={Colors.primary} />
          ) : (
            <Ionicons name="camera-outline" size={22} color={Colors.primary} />
          )}
          <Text style={styles.extractBtnText}>
            {extracting ? "Analyzing photos..." : "Extract from photos"}
          </Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or enter manually</Text>
          <View style={styles.dividerLine} />
        </View>

        <Animated.View entering={FadeInDown.duration(300)}>
          <InputField label="Barcode *" value={barcode} onChangeText={setBarcode} keyboardType="number-pad" />
          <InputField label="Product Name *" value={name} onChangeText={setName} />
          <InputField label="Brand" value={brand} onChangeText={setBrand} />

          <Text style={styles.fieldLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.categoryChip, category === c && styles.categoryChipActive]}
                onPress={() => setCategory(c)}
              >
                <Text style={[styles.categoryChipText, category === c && styles.categoryChipTextActive]}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <InputField label="Serving Size" value={servingSize} onChangeText={setServingSize} placeholder="e.g., 100g" />

          <Text style={styles.sectionLabel}>Nutrition (per serving)</Text>
          <View style={styles.nutritionGrid}>
            <NutritionInput label="Calories" value={calories} onChangeText={setCalories} />
            <NutritionInput label="Protein (g)" value={protein} onChangeText={setProtein} />
            <NutritionInput label="Carbs (g)" value={carbs} onChangeText={setCarbs} />
            <NutritionInput label="Sugar (g)" value={sugar} onChangeText={setSugar} />
            <NutritionInput label="Fat (g)" value={fat} onChangeText={setFat} />
            <NutritionInput label="Sat. Fat (g)" value={saturatedFat} onChangeText={setSaturatedFat} />
            <NutritionInput label="Fiber (g)" value={fiber} onChangeText={setFiber} />
            <NutritionInput label="Sodium (mg)" value={sodium} onChangeText={setSodium} />
          </View>

          <Text style={styles.sectionLabel}>Allergens</Text>
          <View style={styles.allergenGrid}>
            {ALLERGEN_OPTIONS.map((a) => (
              <TouchableOpacity
                key={a}
                style={[styles.allergenChip, allergens.includes(a) && styles.allergenChipActive]}
                onPress={() => toggleAllergen(a)}
              >
                <Text style={[styles.allergenChipText, allergens.includes(a) && styles.allergenChipTextActive]}>
                  {a}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 0) + 8 },
        ]}
      >
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting || !barcode.trim() || !name.trim()}
        >
          <Text style={styles.submitBtnText}>
            {submitting ? "Submitting..." : "Submit Product"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "number-pad" | "numeric";
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.mediumGray}
        keyboardType={keyboardType || "default"}
      />
    </View>
  );
}

function NutritionInput({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
}) {
  return (
    <View style={styles.nutritionInputWrap}>
      <Text style={styles.nutritionInputLabel}>{label}</Text>
      <TextInput
        style={styles.nutritionInput}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        placeholderTextColor={Colors.lightGray}
        placeholder="0"
      />
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
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.lightGray,
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
  extractBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: Colors.primaryPale,
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: "dashed",
  },
  extractBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.primary,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.lightGray,
  },
  dividerText: {
    fontSize: 12,
    color: Colors.mediumGray,
    fontWeight: "500",
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.charcoal,
    marginBottom: 6,
  },
  fieldInput: {
    height: 46,
    borderWidth: 1.5,
    borderColor: Colors.lightGray,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: Colors.charcoal,
    backgroundColor: Colors.softWhite,
  },
  categoryScroll: {
    marginBottom: 16,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.softWhite,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.charcoal,
  },
  categoryChipTextActive: {
    color: Colors.white,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.charcoal,
    marginTop: 8,
    marginBottom: 12,
  },
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  nutritionInputWrap: {
    width: "47%",
  },
  nutritionInputLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.mediumGray,
    marginBottom: 4,
  },
  nutritionInput: {
    height: 42,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
    color: Colors.charcoal,
    backgroundColor: Colors.softWhite,
    fontWeight: "600",
  },
  allergenGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  allergenChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.softWhite,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  allergenChipActive: {
    backgroundColor: Colors.dangerPale,
    borderColor: Colors.danger,
  },
  allergenChipText: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.charcoal,
    textTransform: "capitalize",
  },
  allergenChipTextActive: {
    color: Colors.danger,
    fontWeight: "600",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: Colors.lightGray,
    backgroundColor: Colors.white,
  },
  submitBtn: {
    width: "100%",
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.white,
  },
});
