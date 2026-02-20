import { useState, useEffect } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import Colors, { cardShadow } from "@/constants/colors";
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

function getScoreColor(score: number) {
  return score <= 30
    ? Colors.scoreRed
    : score <= 60
      ? Colors.scoreAmber
      : Colors.scoreGreen;
}

function getScoreBgColor(score: number) {
  if (score <= 30) return "#FFEBEE";
  if (score <= 60) return "#FFF3E0";
  return "#E8F5E9";
}

function SkeletonPulse({ children }: { children: React.ReactNode }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.7, { duration: 800 }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

function SkeletonHistoryCard() {
  return (
    <SkeletonPulse>
      <View style={styles.historyCard}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: Colors.lightGray,
          }}
        />
        <View style={{ flex: 1 }}>
          <View
            style={{
              width: "70%",
              height: 14,
              borderRadius: 6,
              backgroundColor: Colors.lightGray,
            }}
          />
          <View
            style={{
              width: "50%",
              height: 12,
              borderRadius: 6,
              backgroundColor: Colors.lightGray,
              marginTop: 6,
            }}
          />
          <View
            style={{
              width: "30%",
              height: 10,
              borderRadius: 5,
              backgroundColor: Colors.lightGray,
              marginTop: 6,
            }}
          />
        </View>
      </View>
    </SkeletonPulse>
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
  const dateStr = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const timeStr = date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).duration(300)}>
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
        <View style={{ flex: 1 }}>
          <Text style={styles.historyName} numberOfLines={1}>
            {item.productName}
          </Text>
          <Text style={styles.historyBrand} numberOfLines={1}>
            {item.productBrand || ""}
            {item.productCategory ? ` \u00B7 ${item.productCategory}` : ""}
          </Text>
          <Text style={styles.historyDate}>
            {dateStr} at {timeStr}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={Colors.lightGray} />
      </TouchableOpacity>
    </Animated.View>
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
          <Ionicons name="search" size={16} color={Colors.mediumGray} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search history..."
            placeholderTextColor={Colors.mediumGray}
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
            <TouchableOpacity
              key={s.key}
              style={[styles.sortChip, sort === s.key && styles.sortChipActive]}
              onPress={() => handleSort(s.key)}
            >
              <Text
                style={[
                  styles.sortChipText,
                  sort === s.key && styles.sortChipTextActive,
                ]}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
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
            tintColor={Colors.primary}
            colors={[Colors.primary]}
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
                <Ionicons name="time-outline" size={44} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No Scan History</Text>
              <Text style={styles.emptyText}>
                Products you check will appear here with their scores
              </Text>
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
    backgroundColor: Colors.screenBg,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.white,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.charcoal,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 40,
    backgroundColor: Colors.white,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.lightGray,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.charcoal,
  },
  sortRow: {
    flexDirection: "row",
    gap: 8,
  },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: "transparent",
    ...cardShadow("subtle"),
  },
  sortChipActive: {
    backgroundColor: "#3DD68C",
    borderColor: "#3DD68C",
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.mediumGray,
  },
  sortChipTextActive: {
    color: Colors.white,
  },
  sectionDate: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.mediumGray,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: Colors.white,
    borderRadius: 14,
    marginBottom: 8,
    gap: 12,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.04)",
    ...cardShadow("subtle"),
  },
  scoreBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreBadgeText: {
    fontSize: 16,
    fontWeight: "800",
  },
  historyName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.charcoal,
  },
  historyBrand: {
    fontSize: 13,
    color: Colors.mediumGray,
    marginTop: 2,
  },
  historyDate: {
    fontSize: 11,
    color: Colors.lightGray,
    marginTop: 4,
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 80,
    gap: 10,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryPale,
    alignItems: "center",
    justifyContent: "center",
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
});
