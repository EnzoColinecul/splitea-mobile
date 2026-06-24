import { Colors } from "@/theme/theme";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { Tabs, useRouter } from "expo-router";
import { Home, Plus, Settings, User, Users } from "lucide-react-native";
import React from "react";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";

const useGlass = Platform.OS === "ios" && isGlassEffectAPIAvailable();
const TAB_RADIUS = 32;
const TAB_HEIGHT = 64;

const TAB_ICONS: Record<string, (color: string) => React.ReactNode> = {
  index: (color) => <Home size={28} color={color} />,
  groups: (color) => <Users size={28} color={color} />,
  friends: (color) => <User size={28} color={color} />,
  settings: (color) => <Settings size={28} color={color} />,
};

function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const router = useRouter();

  return (
    <View style={styles.tabBar} pointerEvents="box-none">
      {useGlass && (
        <GlassView
          style={[StyleSheet.absoluteFill, { borderRadius: TAB_RADIUS }]}
          glassEffectStyle="regular"
          colorScheme="auto"
        />
      )}
      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;

          if (route.name === "add") {
            return (
              <TouchableOpacity
                key={route.key}
                style={styles.tabItem}
                onPress={() => router.push("/expense/method")}
                activeOpacity={0.8}
              >
                <View style={styles.addBtn}>
                  <Plus size={22} color={Colors.white} />
                </View>
              </TouchableOpacity>
            );
          }

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const color = focused ? Colors.primary : Colors.textSecondary;
          const icon = TAB_ICONS[route.name];

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tabItem}
              onPress={onPress}
              activeOpacity={0.7}
            >
              {icon?.(color)}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="groups" options={{ title: "Groups" }} />
      <Tabs.Screen name="add" options={{ title: "" }} />
      <Tabs.Screen name="friends" options={{ title: "Friends" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 30 : 16,
    left: 20,
    right: 20,
    height: TAB_HEIGHT,
    borderRadius: TAB_RADIUS,
    backgroundColor: useGlass ? "transparent" : Colors.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  row: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
});
