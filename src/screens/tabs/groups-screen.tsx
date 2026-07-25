import { groupsApi } from "@/api/social";
import { Avatar } from "@/components/common/avatar";
import { Button, Typography } from "@/components/common/shared";
import { BorderRadius, Colors, Spacing } from "@/theme/theme";
import { Group } from "@/types";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { ChevronRight, Pin, Plus, Search, Users } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function groupByLetter<T>(items: T[], key: (i: T) => string) {
  const map: Record<string, T[]> = {};
  items.forEach((i) => {
    const l = key(i).charAt(0).toUpperCase();
    (map[l] ??= []).push(i);
  });
  return Object.keys(map)
    .sort()
    .map((l) => ({ letter: l, items: map[l] }));
}

export default function GroupsScreen() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pinningId, setPinningId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchGroups = useCallback(async () => {
    try {
      const data = await groupsApi.list();
      setGroups(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchGroups();
    }, [fetchGroups]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchGroups();
  }, [fetchGroups]);

  const togglePin = async (group: Group) => {
    try {
      setPinningId(group.group_id);
      if (group.is_pinned) {
        await groupsApi.unpin(group.group_id);
      } else {
        await groupsApi.pin(group.group_id);
      }
      await fetchGroups();
    } catch (e: any) {
      Alert.alert(
        "Error",
        e?.response?.data?.detail || "Could not update pin.",
      );
    } finally {
      setPinningId(null);
    }
  };

  const filtered = groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const pinnedGroups = filtered.filter((g) => g.is_pinned);
  const unpinnedGroups = filtered.filter((g) => !g.is_pinned);
  const sortedUnpinned = [...unpinnedGroups].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const alphaSections = groupByLetter(sortedUnpinned, (g) => g.name);

  const renderGroupRow = (item: Group, isLast: boolean) => (
    <View key={item.group_id}>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() =>
          router.push({
            pathname: "/group-detail" as never,
            params: { groupId: item.group_id },
          } as never)
        }
        onLongPress={() =>
          Alert.alert(item.name, undefined, [
            {
              text: item.is_pinned ? "Unpin" : "Pin",
              onPress: () => togglePin(item),
            },
            {
              text: "Edit Group",
              onPress: () =>
                router.push({
                  pathname: "/edit-group" as never,
                  params: { groupId: item.group_id },
                } as never),
            },
            { text: "Cancel", style: "cancel" },
          ])
        }
        style={styles.itemRow}
      >
        <View style={styles.groupInfo}>
          <Avatar
            imageUrl={item.picture_url}
            emoji={item.emoji}
            name={item.name}
            size={44}
            backgroundColor="#EEF2FF"
            textColor={Colors.primary}
          />
          <View style={styles.textContainer}>
            <View style={styles.nameRow}>
              <Typography.Body style={styles.groupName} numberOfLines={1}>
                {item.name}
              </Typography.Body>
            </View>
            <View style={styles.memberRow}>
              <Users size={13} color={Colors.textSecondary} />
              <Text style={styles.memberCount}>
                {item.members_count || 0} members
              </Text>
            </View>
          </View>
        </View>
        <ChevronRight size={16} color={Colors.textSecondary} />
      </TouchableOpacity>
      {!isLast && <View style={styles.divider} />}
    </View>
  );

  const hasNoResults =
    groups.length > 0 && searchQuery.length > 0 && filtered.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Typography.Header style={styles.title}>Groups</Typography.Header>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push("/create-group" as never)}
        >
          <Plus size={18} color={Colors.white} style={{ marginRight: 4 }} />
          <Text style={styles.createBtnText}>Create</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.emptyState}>
          <Typography.Body style={styles.emptyText}>
            You haven't joined any groups yet.
          </Typography.Body>
          <Button
            title="Create your first group"
            onPress={() => router.push("/create-group" as never)}
            style={{ marginTop: Spacing.lg }}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
        >
          <View style={styles.searchBar}>
            <Search size={20} color={Colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search groups..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={Colors.textSecondary}
            />
          </View>

          {hasNoResults && (
            <Text style={styles.emptyText}>No groups found.</Text>
          )}

          {pinnedGroups.length > 0 && (
            <View>
              <View style={styles.pinnedHeader}>
                <Pin size={13} color={Colors.primary} fill={Colors.primary} />
                <Text style={styles.pinnedHeaderText}>Pinned</Text>
              </View>
              <View style={styles.sectionCard}>
                {pinnedGroups.map((group, idx) =>
                  renderGroupRow(group, idx === pinnedGroups.length - 1),
                )}
              </View>
            </View>
          )}

          {alphaSections.length > 0 && (
            <View>
              {pinnedGroups.length > 0 && (
                <Text style={styles.allGroupsLabel}>All Groups</Text>
              )}
              {alphaSections.map((section) => (
                <View key={section.letter}>
                  <Text style={styles.sectionLetter}>{section.letter}</Text>
                  <View style={styles.sectionCard}>
                    {section.items.map((group, idx) =>
                      renderGroupRow(group, idx === section.items.length - 1),
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  title: { fontSize: 32, fontWeight: "800", color: Colors.text },
  createBtn: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.round,
    justifyContent: "center",
    alignItems: "center",
  },
  createBtnText: { color: Colors.white, fontWeight: "700", fontSize: 14 },

  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 40 },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    height: 50,
    borderRadius: 24,
    borderColor: Colors.itemBorder,
    marginBottom: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 16,
    color: Colors.text,
  },

  pinnedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  pinnedHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: 0.5,
  },

  sectionLetter: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  allGroupsLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },

  sectionCard: {
    borderRadius: 24,
    backgroundColor: Colors.white,
    borderWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.background,
    marginLeft: 76,
  },

  groupInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.md,
  },
  textContainer: { flex: 1, gap: 2 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  groupName: {
    fontWeight: "800",
    fontSize: 16,
    color: Colors.text,
    maxWidth: 180,
  },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  memberCount: { fontSize: 13, color: Colors.textSecondary },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyState: { padding: 60, alignItems: "center", justifyContent: "center" },
  emptyText: {
    textAlign: "center",
    marginTop: Spacing.lg,
    color: Colors.textSecondary,
    fontStyle: "italic",
    paddingHorizontal: Spacing.md,
  },
});
