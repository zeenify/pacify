import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider } from "@pacify/ui-kit";
import { GameProvider } from "../lib/game";
import { SpeakerToggle } from "../components/SpeakerToggle";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <GameProvider>
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
        <Stack.Screen name="load" />
        <Stack.Screen name="start" />
        <Stack.Screen name="menu" />
        <Stack.Screen name="campaign" />
        <Stack.Screen name="dossier" />
        <Stack.Screen name="shame" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="howto" />
        <Stack.Screen name="options" />
        <Stack.Screen name="multiplayer" />
      </Stack>
      <SpeakerToggle />
      </GameProvider>
    </ThemeProvider>
  );
}
