import React from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, Platform } from 'react-native';
import { Typography, Card } from '../../src/components/Shared';
import { Colors, Spacing } from '../../src/theme/theme';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.headerRow}>
          <Typography.Header style={styles.title}>Settings</Typography.Header>
        </View>

        <View style={styles.list}>
          <Card style={styles.optionCard}>
            <Typography.Body style={styles.optionText}>Profile Settings</Typography.Body>
          </Card>
          <Card style={styles.optionCard}>
            <Typography.Body style={styles.optionText}>Notifications</Typography.Body>
          </Card>
          <Card style={styles.optionCard}>
            <Typography.Body style={styles.optionText}>Payment Methods</Typography.Body>
          </Card>
          <Card style={styles.optionCard}>
            <Typography.Body style={[styles.optionText, { color: Colors.danger }]}>Log Out</Typography.Body>
          </Card>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  scrollContent: { padding: Spacing.xl, paddingTop: Platform.OS === 'ios' ? 10 : 40 },
  headerRow: { marginBottom: Spacing.xl },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text, marginBottom: 0 },
  list: { gap: Spacing.md },
  optionCard: { padding: Spacing.lg, borderWidth: 1.5, borderColor: Colors.itemBorder, borderRadius: 20 },
  optionText: { fontWeight: '700', fontSize: 16, color: Colors.text },
});
