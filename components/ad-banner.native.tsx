import React from "react";
import { View, Platform, StyleSheet } from "react-native";

export const AD_UNIT_IDS = {
  banner: Platform.select({
    android: "ca-app-pub-3940256099942544/6300978111", // Test banner
    ios: "ca-app-pub-3940256099942544/2934735716",
    default: "ca-app-pub-3940256099942544/6300978111",
  }),
  interstitial: Platform.select({
    android: "ca-app-pub-3940256099942544/1033173712", // Test interstitial
    ios: "ca-app-pub-3940256099942544/4411468910",
    default: "ca-app-pub-3940256099942544/1033173712",
  }),
};

interface AdBannerProps {
  isPremium?: boolean;
}

export function AdBanner({ isPremium = false }: AdBannerProps) {
  if (isPremium) return null;

  try {
    const { BannerAd, BannerAdSize, TestIds } = require("react-native-google-mobile-ads");
    return (
      <View style={styles.container}>
        <BannerAd
          unitId={AD_UNIT_IDS.banner ?? TestIds.BANNER}
          size={BannerAdSize.BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        />
      </View>
    );
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
});
