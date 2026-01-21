
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useNetworkState } from "expo-network";
import { SystemBars } from "react-native-edge-to-edge";
import { WidgetProvider } from "@/contexts/WidgetContext";
import { AuthProvider } from "@/contexts/AuthContext";
import "react-native-reanimated";
import React, { useEffect } from "react";
import { useFonts } from "expo-font";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { useColorScheme, Alert } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { BACKEND_URL } from "@/utils/api";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Custom theme for journal app
const JournalLightTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#8B7355',
    background: '#FAF8F5',
    card: '#FFFFFF',
    text: '#3E3E3E',
    border: '#E5DDD5',
    notification: '#D4A574',
  },
};

const JournalDarkTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#D4A574',
    background: '#1A1A1A',
    card: '#2A2A2A',
    text: '#E8E8E8',
    border: '#3A3A3A',
    notification: '#8B7355',
  },
};

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  const colorScheme = useColorScheme();
  const { isConnected } = useNetworkState();

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    // Log backend URL on app startup for debugging
    console.log("🚀 App started");
    console.log("📡 Backend URL:", BACKEND_URL || "NOT CONFIGURED");
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? JournalDarkTheme : JournalLightTheme}>
        <AuthProvider>
          <WidgetProvider>
            <SystemBars style={colorScheme === "dark" ? "light" : "dark"} />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="auth" options={{ headerShown: false }} />
              <Stack.Screen name="auth-popup" options={{ presentation: "modal", headerShown: false }} />
              <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
            </Stack>
            <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
          </WidgetProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
