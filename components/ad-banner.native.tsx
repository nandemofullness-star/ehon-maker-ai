import React from "react";
import { View, Platform, StyleSheet } from "react-native";

export const AD_UNIT_IDS = {
  banner: Platform.select({
    android: "ca-app-pub-6254585875903659/9198980584", // Production banner (Android)
    ios: "ca-app-pub-6254585875903659/3479750043",     // Production banner (iOS)
    default: "ca-app-pub-6254585875903659/9198980584",
  }),
  rewarded: Platform.select({
    android: "ca-app-pub-6254585875903659/1045158396", // Production rewarded (Android)
    ios: "ca-app-pub-6254585875903659/3256600795",     // Production rewarded (iOS)
    default: "ca-app-pub-6254585875903659/1045158396",
  }),
};

interface AdBannerProps {
  isPremium?: boolean;
}

export function AdBanner({ isPremium = false }: AdBannerProps) {
  if (isPremium) return null;

  try {
    const { BannerAd, BannerAdSize } = require("react-native-google-mobile-ads");
    return (
      <View style={styles.container}>
        <BannerAd
          unitId={AD_UNIT_IDS.banner!}
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
