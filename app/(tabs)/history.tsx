import { useState, useMemo } from "react";
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
  WifiSlash,
} from "phosphor-react-native";
import * as Haptics from "expo-haptics";
import { getScoreColor, getScoreShortLabel, useThemeColors, type ThemeColors } from "@/constants/colors";
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

  if (itemDate >= today) return "TODAY";
  if (itemDate >= yesterday) return "YESTERDAY";
  if (itemDate >= weekAgo) return "THIS WEEK";
  if (itemDate >= monthAgo) return "THIS MONTH";
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" }).toUpperCase();
}

function getTierLabel(score: number): string {
  if (score === 0) return "Alert";
  if (score <= 35) return "Poor";
  if (score <= 50) return "Fair";
  if (score <= 74) return "Good";
  return "Great";
}

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);

  function SkeletonHistoryCard() {
    return (
      <View style={styles.historyCard}>
        <MotiView
          from={{ opacity: 0.4 }}
          animate={{ opacity: 0.9 }}
          transition={{ loop: true, type: "timing" as const, duration: 850 }}
          style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: theme.skeleton }}
        />
        <View style={{ flex: 1 }}>
          <MotiView
            from={{ opacity: 0.4 }}
            animate={{ opacity: 0.9 }}
            transition={{ loop: true, type: "timing" as const, duration: 850 }}
            style={{ width: "70%", height: 14, borderRadius: 6, backgroundColor: theme.skeleton }}
          />
          <MotiView
            from={{ opacity: 0.4 }}
            animate={{ opacity: 0.9 }}
            transition={{ loop: true, type: "timing" as const, duration: 850 }}
            style={{ width: "50%", height: 12, borderRadius: 6, backgroundColor: theme.skeleton, marginTop: 6 }}
          />
        </View>
      </View>
    );
  }

  function ScoreBadge({ score }: { score: number }) {
    const color = getScoreColor(score, theme);
    const label = getTierLabel(score);
    return (
      <View
        style={[styles.scoreBadge, { backgroundColor: color }]}
        accessibilityLabel={`Score ${score}, ${label}`}
      >
        <Text style={styles.scoreBadgeText}>{score}</Text>
        <Text style={styles.scoreBadgeLabelText}>{label}</Text>
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
          accessibilityLabel={`${item.productName}, score ${item.score} ${getScoreShortLabel(item.score, item.score === 0)}, ${timeStr}`}
          accessibilityRole="button"
          accessibilityHint="Tap to view details, long press to delete"
        >
          <View>
            <ScoreBadge score={item.score} />
            <View style={styles.accessIconBox}>
              {isScanned ? (
                <Barcode size={12} color={theme.muted} />
              ) : (
                <MagnifyingGlass size={12} color={theme.muted} />
              )}
            </View>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.nameTimeRow}>
              <Text style={styles.historyName} numberOfLines={1}>
                {item.productName}
              </Text>
              <Text style={styles.historyTime}>{timeStr}</Text>
            </View>
            <Text style={styles.historyBrand} numberOfLines={1}>
              {item.productBrand || ""}
              {item.productCategory ? ` \u00B7 ${item.productCategory}` : ""}
            </Text>
          </View>
          <CaretRight size={20} color={theme.mutedIcon} />
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
        <TouchableOpacity onPress={onPress} activeOpacity={0.8} accessibilityLabel={`Sort by ${label}, selected`} accessibilityRole="radio">
          <LinearGradient
            colors={["#2E7D32", "#3DD68C"]}
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
        accessibilityLabel={`Sort by ${label}`}
        accessibilityRole="radio"
      >
        <Text style={styles.sortChipTextInactive}>{label}</Text>
      </TouchableOpacity>
    );
  }
  const [sort, setSort] = useState<SortOption>("date");
  const [search, setSearch] = useState("");

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const historyQuery = useQuery({
    queryKey: ["/api/history", `?sort=${sort}${search ? `&search=${search}` : ""}`],
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
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View
        style={[
          styles.header,
          { paddingTop: (insets.top || webTopInset) + 12 },
        ]}
      >
        <Text style={styles.headerTitle}>History</Text>
        <View style={styles.searchBar}>
          <MagnifyingGlass size={18} color={theme.placeholder} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search history..."
            placeholderTextColor={theme.placeholder}
            accessibilityLabel="Search history"
            testID="history-search-input"
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
            tintColor={theme.primary}
            colors={[theme.primary]}
            accessibilityLabel="Pull to refresh history"
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
          paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 0) + 80,
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          historyQuery.isError ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <WifiSlash size={32} color={theme.mutedIcon} weight="thin" />
              </View>
              <Text style={styles.emptyTitle}>Could not load history</Text>
              <Text style={styles.emptyText}>
                Check your connection and try again.
              </Text>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => historyQuery.refetch()}
                style={{ marginTop: 24 }}
                accessibilityLabel="Retry loading history"
                accessibilityRole="button"
              >
                <LinearGradient
                  colors={["#3DD68C", "#2E7D32"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.emptyCTAButton}
                >
                  <Text style={styles.emptyCTAText}>Retry</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : !historyQuery.isLoading ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <ClockCounterClockwise size={32} color={theme.mutedIcon} weight="thin" />
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
                accessibilityLabel="Scan a product"
                accessibilityRole="button"
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
      paddingBottom: 16,
      backgroundColor: theme.card,
      zIndex: 10,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      ...bentoShadow,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "700" as const,
      color: theme.text,
      letterSpacing: -0.3,
      marginBottom: 16,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.bg,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
      marginBottom: 16,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: theme.text,
    },
    sortRow: {
      flexDirection: "row",
      gap: 8,
    },
    sortChipGradient: {
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 9,
    },
    sortChipInactive: {
      backgroundColor: isDark ? '#2C2C2C' : theme.card,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    },
    sortChipTextActive: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: "#FFFFFF",
    },
    sortChipTextInactive: {
      fontSize: 13,
      fontWeight: "500" as const,
      color: theme.muted,
    },
    sectionDate: {
      fontSize: 12,
      fontWeight: "600" as const,
      letterSpacing: 1.5,
      color: theme.placeholder,
      textTransform: "uppercase" as const,
      marginTop: 24,
      marginBottom: 12,
    },
    historyCard: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      backgroundColor: theme.card,
      borderRadius: 16,
      marginBottom: 12,
      gap: 12,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent',
      ...bentoShadow,
    },
    accessIconBox: {
      position: "absolute",
      bottom: -4,
      right: -4,
      width: 20,
      height: 20,
      borderRadius: 6,
      backgroundColor: theme.bg,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.card,
    },
    scoreBadge: {
      width: 46,
      height: 46,
      borderRadius: 12,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    scoreBadgeText: {
      fontSize: 17,
      fontWeight: "700" as const,
      lineHeight: 20,
      color: "white",
    },
    scoreBadgeLabelText: {
      fontSize: 8,
      fontWeight: "500" as const,
      letterSpacing: 0.5,
      textTransform: "uppercase" as const,
      color: "rgba(255,255,255,0.9)",
      marginTop: 0,
    },
    nameTimeRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 2,
    },
    historyName: {
      fontSize: 15,
      fontWeight: "700" as const,
      color: theme.text,
      flex: 1,
      marginRight: 8,
    },
    historyTime: {
      fontSize: 11,
      color: theme.placeholder,
      fontWeight: "400" as const,
      marginTop: 2,
    },
    historyBrand: {
      fontSize: 13,
      color: theme.muted,
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
      backgroundColor: theme.bg,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: theme.text,
      marginTop: 4,
    },
    emptyText: {
      fontSize: 14,
      color: theme.muted,
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
};
