import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider } from "@pacify/ui-kit";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <StatusBar style="light" hidden />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#111111" },
          animation: "none",
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="menu" />
        <Stack.Screen name="campaign" />
        <Stack.Screen name="dossier" />
        <Stack.Screen name="shame" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="howto" />
        <Stack.Screen name="options" />
        <Stack.Screen name="multiplayer" />
      </Stack>
    </ThemeProvider>
  );
}
