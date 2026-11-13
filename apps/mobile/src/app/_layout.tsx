import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "@/providers/auth";
import { palette } from "@/lib/theme";
import { QueryClientProvider } from "@tanstack/react-query";
import { createLedgerQueryClient } from "@daily-ledger/data";

const queryClient = createLedgerQueryClient();

function AppNavigation() {
  const { user, ready } = useAuth();
  if (!ready)
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: palette.background,
        }}
      >
        <ActivityIndicator color={palette.green} />
      </View>
    );
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
          animation: "fade",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Protected guard={!user}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="delivery"
            options={{ presentation: "modal", animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="salary"
            options={{ presentation: "card", animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="products"
            options={{ presentation: "card", animation: "slide_from_right" }}
          />
          <Stack.Screen
            name="expenses"
            options={{ presentation: "card", animation: "slide_from_right" }}
          />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppNavigation />
      </AuthProvider>
    </QueryClientProvider>
  );
}
