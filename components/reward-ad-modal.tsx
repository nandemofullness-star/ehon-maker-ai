/**
 * RewardAdModal — shown when user runs out of AI conversions.
 * Watching the ad grants FREE_AI_USES_PER_CYCLE more conversions.
 * In Expo Go (no native ads), the ad is simulated and uses are granted immediately.
 */

import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { FREE_AI_USES_PER_CYCLE } from "@/hooks/use-premium";

interface RewardAdModalProps {
  visible: boolean;
  onAdWatched: () => Promise<void>;
  onDismiss: () => void;
}

function isExpoGo(): boolean {
  const execEnv = (Constants as any).executionEnvironment;
  const appOwnership = (Constants as any).appOwnership;
  return execEnv === "storeClient" || appOwnership === "expo";
}

export function RewardAdModal({ visible, onAdWatched, onDismiss }: RewardAdModalProps) {
  const [isWatching, setIsWatching] = useState(false);

  const handleWatchAd = async () => {
    setIsWatching(true);
    try {
      if (Platform.OS === "web" || isExpoGo()) {
        // Simulate ad viewing in dev/Expo Go — short delay then grant uses
        await new Promise<void>((resolve) => setTimeout(resolve, 1200));
        await onAdWatched();
        return;
      }

      // Production: show rewarded ad via AdMob
      try {
        const { RewardedAd, RewardedAdEventType, TestIds } =
          require("react-native-google-mobile-ads") as typeof import("react-native-google-mobile-ads");

        const adUnitId = TestIds.REWARDED;
        const rewarded = RewardedAd.createForAdRequest(adUnitId, {
          requestNonPersonalizedAdsOnly: true,
        });

        await new Promise<void>((resolve) => {
          const unsubEarned = rewarded.addAdEventListener(
            RewardedAdEventType.EARNED_REWARD,
            () => {
              unsubEarned();
              resolve();
            }
          );
          const unsubLoaded = rewarded.addAdEventListener(
            RewardedAdEventType.LOADED,
            () => {
              unsubLoaded();
              rewarded.show();
            }
          );
          rewarded.load();
          // Timeout fallback: if ad doesn't load in 15s, grant anyway
          setTimeout(() => resolve(), 15000);
        });

        await onAdWatched();
      } catch {
        // AdMob not available — grant uses anyway
        await onAdWatched();
      }
    } finally {
      setIsWatching(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Icon */}
          <View style={styles.iconWrapper}>
            <MaterialIcons name="ondemand-video" size={40} color="#6366f1" />
          </View>

          {/* Title */}
          <Text style={styles.title}>AI変換の回数を補充</Text>
          <Text style={styles.subtitle}>
            短い動画広告を視聴すると、{"\n"}
            AI変換が{FREE_AI_USES_PER_CYCLE}回追加されます。
          </Text>

          {/* Watch ad button */}
          <TouchableOpacity
            style={[styles.watchButton, isWatching && styles.watchButtonDisabled]}
            onPress={handleWatchAd}
            disabled={isWatching}
            activeOpacity={0.8}
          >
            {isWatching ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.watchButtonText}>広告を読み込み中...</Text>
              </>
            ) : (
              <>
                <MaterialIcons name="play-circle-filled" size={20} color="#fff" />
                <Text style={styles.watchButtonText}>
                  広告を見て +{FREE_AI_USES_PER_CYCLE}回ゲット
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Cancel button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onDismiss}
            disabled={isWatching}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>あとで</Text>
          </TouchableOpacity>

          {/* Note */}
          <Text style={styles.note}>
            {isExpoGo() || Platform.OS === "web"
              ? "※ テスト環境: 広告はシミュレートされます"
              : "※ 広告を最後まで視聴すると回数が追加されます"}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 28,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 16,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1a1a2e",
    marginBottom: 10,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: "#4b5563",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  watchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#6366f1",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: "100%",
    marginBottom: 12,
  },
  watchButtonDisabled: {
    opacity: 0.6,
  },
  watchButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.2,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  cancelButtonText: {
    color: "#9ca3af",
    fontWeight: "600",
    fontSize: 14,
  },
  note: {
    fontSize: 11,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 16,
    marginTop: 4,
  },
});
