import { userApi } from "@/api/user";
import { authEvents } from "@/utils/auth-events";
import { useRouter, useSegments } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";

interface AuthContextType {
  token: string | null;
  isLoading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "userToken";

const hasWebStorage = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

async function readToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return hasWebStorage() ? window.localStorage.getItem(TOKEN_KEY) : null;
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function writeToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    if (hasWebStorage()) window.localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

async function clearToken(): Promise<void> {
  if (Platform.OS === "web") {
    if (hasWebStorage()) window.localStorage.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Load token from storage on mount
    loadToken();
  }, []);

  useEffect(() => {
    // Listen for global unauthorized events
    const unsubscribe = authEvents.subscribe(() => {
      console.warn("Unauthorized event received, signing out");
      signOut();
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!token && !inAuthGroup) {
      // Redirect to login if not authenticated and not in auth screens
      router.replace("/(auth)/login");
    } else if (token && inAuthGroup) {
      // Redirect to home if authenticated and trying to access auth screens
      router.replace("/(tabs)");
    }
  }, [token, segments, isLoading]);

  async function loadToken() {
    try {
      const storedToken = await readToken();
      if (storedToken) {
        // Verify token with backend
        try {
          await userApi.getProfile();
          setToken(storedToken);
        } catch (error: any) {
          if (error.response?.status === 401) {
            console.warn("Token invalid, clearing storage");
            await clearToken();
            setToken(null);
          } else {
            // On other errors (e.g. network), assume token might still be valid
            // so we don't logout users when they are offline
            setToken(storedToken);
          }
        }
      } else {
        setToken(null);
      }
    } catch (e) {
      console.error("Failed to load token", e);
    } finally {
      setIsLoading(false);
    }
  }

  const signIn = async (newToken: string) => {
    await writeToken(newToken);
    setToken(newToken);
  };

  const signOut = async () => {
    await clearToken();
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
