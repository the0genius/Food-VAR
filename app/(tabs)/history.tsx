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
import Colors from "@/constants/colors";
import { useUser } from "@/contexts/UserContext";
import { apiRequest, queryClient } from "@/lib/query-client";

type SortOption = "date" | "score_high" | "score_low";

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
  const color =
    score <= 30
      ? Colors.scoreRed
      : score <= 60
        ? Colors.scoreAmber
        : Colors.scoreGreen;
  return (
    <View style={[styles.scoreBadge, { backgroundColor: color }]}>
      <Text style={styles.scoreBadgeText}>{score}</Text>
    </View>
  );
}

function HistoryItem({
  item,
  index,
  onPress,
  onDelete,
}: {
  item: any;
  index: number;
  onPress: () => void;
  onDelete: () => void;
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
        renderItem={({ item, index }) => (
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
          />
        )}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 0) + 100,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !historyQuery.isLoading ? (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={44} color={Colors.lightGray} />
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
    backgroundColor: Colors.white,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.lightGray,
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
    backgroundColor: Colors.softWhite,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
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
    backgroundColor: Colors.softWhite,
  },
  sortChipActive: {
    backgroundColor: Colors.primary,
  },
  sortChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.mediumGray,
  },
  sortChipTextActive: {
    color: Colors.white,
  },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    backgroundColor: Colors.softWhite,
    borderRadius: 14,
    marginBottom: 8,
    gap: 12,
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
    color: Colors.white,
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
