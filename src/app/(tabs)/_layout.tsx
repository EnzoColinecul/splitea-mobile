import { Colors } from '@/theme/theme';
import { Tabs, useRouter } from 'expo-router';
import { Home, Plus, Settings, User, Users } from 'lucide-react-native';
import React from 'react';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';

function CustomTabBarButton({ children, onPress }: any) {
  return (
    <TouchableOpacity
      style={styles.customBtnWrapper}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.customBtn}>
        {children}
      </View>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: { flex: 1, paddingBottom: 5 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={28} color={color} />
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          tabBarIcon: ({ color, size }) => <Users size={28} color={color} />
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: '',
          tabBarLabel: () => null,
          tabBarButton: (props) => (
            <CustomTabBarButton
              {...props}
              onPress={() => router.push('/expense/method')}
            />
          ),
          tabBarIcon: () => <Plus size={36} color={Colors.white} />
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarIcon: ({ color, size }) => <User size={28} color={color} />
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings size={28} color={color} />
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    paddingTop: 10,
    height: Platform.OS === 'ios' ? 90 : 75,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: '#F0EBE1', // subtle border instead of shadow
    elevation: 0,
    shadowOpacity: 0,
  },
  customBtnWrapper: {
    top: -30, // move higher to overlap properly
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  customBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    borderWidth: 4,
    borderColor: Colors.white, // White border around the orange button
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary, // Orange glow
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  }
});
