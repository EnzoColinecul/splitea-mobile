import { Colors } from "@/theme/theme";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { Tabs, useRouter } from "expo-router";
import { Home, Plus, Settings, User, Users } from "lucide-react-native";
import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const useGlass = Platform.OS === "ios" && isGlassEffectAPIAvailable();
const TAB_RADIUS = 32;
const TAB_HEIGHT = 64;

const TAB_ICONS: Record<string, (color: string) => React.ReactNode> = {
  index: (color) => <Home size={28} color={color} />,
  groups: (color) => <Users size={28} color={color} />,
  friends: (color) => <User size={28} color={color} />,
  settings: (color) => <Settings size={28} color={color} />,
};

const PRESS_SCALE = 0.85;
const SPRING_CONFIG = { damping: 12, stiffness: 350, mass: 0.8 };
const PILL_SPRING = { damping: 18, stiffness: 240, mass: 0.9 };
const PILL_VERTICAL_INSET = 5;
const ROW_PADDING = 4;

function BouncyTab({
  onPress,
  children,
}: {
  onPress: () => void;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      style={styles.tabItem}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(PRESS_SCALE, { duration: 100 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SPRING_CONFIG);
      }}
    >
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </Pressable>
  );
}

function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const [barWidth, setBarWidth] = React.useState(0);
  const tabWidth = (barWidth - ROW_PADDING * 2) / state.routes.length;

  const pillX = useSharedValue(0);
  const hasMeasured = React.useRef(false);

  React.useEffect(() => {
    if (tabWidth <= 0) return;
    const target = ROW_PADDING + state.index * tabWidth;
    if (!hasMeasured.current) {
      // First layout: place the pill without animating from 0
      hasMeasured.current = true;
      pillX.value = target;
    } else {
      pillX.value = withSpring(target, PILL_SPRING);
    }
  }, [state.index, tabWidth, pillX]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
  }));

  return (
    <View style={styles.tabBar} pointerEvents="box-none">
      {useGlass && (
        <GlassView
          style={[StyleSheet.absoluteFill, { borderRadius: TAB_RADIUS }]}
          glassEffectStyle="regular"
          colorScheme="auto"
        />
      )}
      <View
        style={styles.row}
        onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      >
        {tabWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[styles.pill, { width: tabWidth }, pillStyle]}
          />
        )}
        {state.routes.map((route, index) => {
          const focused = state.index === index;

          if (route.name === "add") {
            return (
              <BouncyTab
                key={route.key}
                onPress={() => router.push("/expense/method")}
              >
                <View style={styles.addBtn}>
                  <Plus size={22} color={Colors.white} />
                </View>
              </BouncyTab>
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
            <BouncyTab key={route.key} onPress={onPress}>
              {icon?.(color)}
            </BouncyTab>
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
      screenOptions={{ headerShown: false, animation: "shift" }}
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
    paddingHorizontal: ROW_PADDING,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    position: "absolute",
    left: 0,
    top: PILL_VERTICAL_INSET,
    bottom: PILL_VERTICAL_INSET,
    borderRadius: (TAB_HEIGHT - PILL_VERTICAL_INSET * 2) / 2,
    backgroundColor: Colors.tabIndicator,
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
