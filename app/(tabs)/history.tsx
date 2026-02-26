import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  FlatList,
  Alert,
  TextInput,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import {
  ClockCounterClockwise,
  CaretRight,
  MagnifyingGlass,
  Barcode,
} from "phosphor-react-native";
import * as Haptics from "expo-haptics";
import Colors, { C, cardShadow, getScoreColor, getScoreBgColor } from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";
import { apiRequest, queryClient } from "@/lib/query-client";

type SortOption = "date" | "score_high" | "score_low";

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (itemDate >= today) return "Today";
  if (itemDate >= yesterday) return "Yesterday";
  if (itemDate >= weekAgo) return "This Week";
  if (itemDate >= monthAgo) return "This Month";
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function SkeletonHistoryCard() {
  return (
    <View style={styles.historyCard}>
      <MotiView
        from={{ opacity: 0.4 }}
        animate={{ opacity: 0.9 }}
        transition={{ loop: true, type: "timing" as const, duration: 850 }}
        style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: "#EBEBEB" }}
      />
      <View style={{ flex: 1 }}>
        <MotiView
          from={{ opacity: 0.4 }}
          animate={{ opacity: 0.9 }}
          transition={{ loop: true, type: "timing" as const, duration: 850 }}
          style={{ width: "70%", height: 14, borderRadius: 6, backgroundColor: "#EBEBEB" }}
        />
        <MotiView
          from={{ opacity: 0.4 }}
          animate={{ opacity: 0.9 }}
          transition={{ loop: true, type: "timing" as const, duration: 850 }}
          style={{ width: "50%", height: 12, borderRadius: 6, backgroundColor: "#EBEBEB", marginTop: 6 }}
        />
        <MotiView
          from={{ opacity: 0.4 }}
          animate={{ opacity: 0.9 }}
          transition={{ loop: true, type: "timing" as const, duration: 850 }}
          style={{ width: "30%", height: 10, borderRadius: 5, backgroundColor: "#EBEBEB", marginTop: 6 }}
        />
      </View>
    </View>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = getScoreColor(score);
  const bgColor = getScoreBgColor(score);
  return (
    <View
      style={[
        styles.scoreBadge,
        {
          backgroundColor: bgColor,
          borderWidth: 1,
          borderColor: color + "33",
        },
      ]}
    >
      <Text style={[styles.scoreBadgeText, { color }]}>{score}</Text>
    </View>
  );
}

function HistoryItem({
  item,
  index,
  onPress,
  onDelete,
  showSectionHeader,
  sectionTitle,
}: {
  item: any;
  index: number;
  onPress: () => void;
  onDelete: () => void;
  showSectionHeader: boolean;
  sectionTitle: string;
}) {
  const date = new Date(item.createdAt);
  const timeStr = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const isScanned = item.accessMethod === "scanned" || item.barcode;

  return (
    <MotiView
      from={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 40, type: "timing" as const }}
    >
      {showSectionHeader && (
        <Text style={styles.sectionDate}>{sectionTitle}</Text>
      )}
      <TouchableOpacity
        style={styles.historyCard}
        onPress={onPress}
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          Alert.alert("Delete Entry", "Remove this from your history?", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: onDelete,
            },
          ]);
        }}
        activeOpacity={0.7}
      >
        <ScoreBadge score={item.score} />
        <View style={styles.accessIconBox}>
          {isScanned ? (
            <Barcode size={15} color={C.placeholder} />
          ) : (
            <MagnifyingGlass size={15} color={C.placeholder} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.historyName} numberOfLines={1}>
            {item.productName}
          </Text>
          <View style={styles.historyMetaRow}>
            <Text style={styles.historyBrand} numberOfLines={1}>
              {item.productBrand || ""}
              {item.productCategory ? ` \u00B7 ${item.productCategory}` : ""}
            </Text>
          </View>
          <Text style={styles.historyDate}>
            {timeStr}
          </Text>
        </View>
        <CaretRight size={15} color={C.placeholder} />
      </TouchableOpacity>
    </MotiView>
  );
}

function SortChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  if (active) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <LinearGradient
          colors={["#3DD68C", "#2E7D32"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.sortChipGradient}
        >
          <Text style={styles.sortChipTextActive}>{label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity
      style={styles.sortChipInactive}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.sortChipTextInactive}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const [sort, setSort] = useState<SortOption>("date");
  const [search, setSearch] = useState("");

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const historyQuery = useQuery({
    queryKey: ["/api/history", String(user?.id), `?sort=${sort}${search ? `&search=${search}` : ""}`],
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/history/${id}`);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/history"] });
    },
  });

  const history = (historyQuery.data || []) as any[];

  function handleSort(option: SortOption) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSort(option);
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.header,
          { paddingTop: (insets.top || webTopInset) + 12 },
        ]}
      >
        <Text style={styles.headerTitle}>History</Text>
        <View style={styles.searchBar}>
          <MagnifyingGlass size={18} color={C.placeholder} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search history..."
            placeholderTextColor={C.placeholder}
          />
        </View>
        <View style={styles.sortRow}>
          {(
            [
              { key: "date", label: "Recent" },
              { key: "score_high", label: "Best" },
              { key: "score_low", label: "Worst" },
            ] as { key: SortOption; label: string }[]
          ).map((s) => (
            <SortChip
              key={s.key}
              label={s.label}
              active={sort === s.key}
              onPress={() => handleSort(s.key)}
            />
          ))}
        </View>
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={!!historyQuery.isRefetching}
            onRefresh={() => historyQuery.refetch()}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
        ListHeaderComponent={
          historyQuery.isLoading ? (
            <View>
              {[0, 1, 2, 3, 4].map((i) => (
                <SkeletonHistoryCard key={i} />
              ))}
            </View>
          ) : null
        }
        renderItem={({ item, index }) => {
          const currentGroup = getDateGroup(item.createdAt);
          const prevItem = index > 0 ? history[index - 1] : null;
          const prevGroup = prevItem ? getDateGroup(prevItem.createdAt) : null;
          const showSectionHeader = currentGroup !== prevGroup;

          return (
            <HistoryItem
              item={item}
              index={index}
              onPress={() =>
                router.push({
                  pathname: "/result",
                  params: { historyId: item.id },
                })
              }
              onDelete={() => deleteMutation.mutate(item.id)}
              showSectionHeader={showSectionHeader}
              sectionTitle={currentGroup}
            />
          );
        }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 0) + 100,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !historyQuery.isLoading ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <ClockCounterClockwise size={32} color="#CCCCCC" weight="thin" />
              </View>
              <Text style={styles.emptyTitle}>No scan history yet.</Text>
              <Text style={styles.emptyText}>
                Start scanning to track your food choices.
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/(tabs)/scan");
                }}
                style={{ marginTop: 24 }}
              >
                <LinearGradient
                  colors={["#3DD68C", "#2E7D32"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.emptyCTAButton}
                >
                  <Text style={styles.emptyCTAText}>Scan a Product</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: C.card,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900" as const,
    color: C.text,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: C.text,
  },
  sortRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  sortChipGradient: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sortChipInactive: {
    backgroundColor: C.card,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 0.5,
    borderColor: C.border,
  },
  sortChipTextActive: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  sortChipTextInactive: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: C.muted,
  },
  sectionDate: {
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 1.3,
    color: C.placeholder,
    textTransform: "uppercase",
    marginTop: 24,
    marginBottom: 10,
  },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: C.card,
    borderRadius: 20,
    marginBottom: 10,
    gap: 12,
    borderWidth: 0.5,
    borderColor: C.border,
    ...cardShadow("medium"),
  },
  accessIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreBadge: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreBadgeText: {
    fontSize: 16,
    fontWeight: "800" as const,
  },
  historyName: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: C.text,
  },
  historyMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  historyBrand: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },
  historyDate: {
    fontSize: 11,
    color: C.placeholder,
    marginTop: 2,
    fontWeight: "500" as const,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    paddingBottom: 80,
    gap: 6,
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: C.text,
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    color: C.muted,
    textAlign: "center",
    maxWidth: 260,
    marginTop: 6,
  },
  emptyCTAButton: {
    borderRadius: 999,
    paddingHorizontal: 28,
    paddingVertical: 15,
    alignItems: "center",
  },
  emptyCTAText: {
    color: "#FFFFFF",
    fontWeight: "700" as const,
    fontSize: 15,
  },
});
