import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { Typography } from '../../src/components/Shared';
import { Colors, Spacing } from '../../src/theme/theme';

export default function GroupsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Typography.Header style={styles.title}>Your Groups</Typography.Header>
        <TouchableOpacity style={styles.addBtn}>
          <Typography.Body style={styles.addBtnText}>New</Typography.Body>
        </TouchableOpacity>
      </View>
      
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.emptyState}>
          <Typography.Body style={styles.emptyText}>You haven't joined any groups yet.</Typography.Body>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, paddingTop: 20 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 0 },
  addBtn: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: Colors.white, fontWeight: '700' },
  scroll: { padding: Spacing.lg },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.textSecondary, textAlign: 'center' }
});
