import React from "react";
import { View, Text, StyleSheet } from "react-native";

export const AD_UNIT_IDS = {
  banner: "ca-app-pub-3940256099942544/6300978111",
  interstitial: "ca-app-pub-3940256099942544/1033173712",
};

interface AdBannerProps {
  isPremium?: boolean;
}

export function AdBanner({ isPremium = false }: AdBannerProps) {
  if (isPremium) return null;

  return (
    <View style={styles.webPlaceholder}>
      <Text style={styles.webPlaceholderText}>広告エリア（実機でAdMob広告が表示されます）</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  webPlaceholder: {
    height: 50,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  webPlaceholderText: {
    fontSize: 11,
    color: "#999",
  },
});
