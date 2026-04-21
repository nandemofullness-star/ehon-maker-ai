import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  onPurchase: () => Promise<{ success: boolean; error?: string }>;
  onRestore: () => Promise<{ success: boolean; error?: string }>;
  triggerReason?: "page_limit" | "ai_limit" | "manual";
}

const FEATURES_FREE = [
  { label: "写真アップロード", available: true },
  { label: "最大8ページ", available: true },
  { label: "AI変換（1日3回まで）", available: true },
  { label: "PDF出力", available: true },
  { label: "バナー広告・動画広告あり", available: false },
];

const FEATURES_PREMIUM = [
  { label: "写真アップロード", available: true },
  { label: "最大24ページ（KDP上限）", available: true },
  { label: "AI変換 無制限", available: true },
  { label: "PDF出力", available: true },
  { label: "広告なし", available: true },
  { label: "全描画スタイル利用可能", available: true },
  { label: "プロジェクト無制限保存", available: true },
];

export function UpgradeModal({
  visible,
  onClose,
  onPurchase,
  onRestore,
  triggerReason = "manual",
}: UpgradeModalProps) {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const reasonMessage =
    triggerReason === "page_limit"
      ? "⚠️ 無料版は最大8ページまでです。プレミアムにアップグレードすると24ページまで作成できます。"
      : triggerReason === "ai_limit"
      ? "⚠️ 本日のAI変換回数（3回）を使い切りました。プレミアムなら無制限でAI変換できます。"
      : null;

  const handlePurchase = async () => {
    setIsPurchasing(true);
    try {
      const result = await onPurchase();
      if (result.success) {
        Alert.alert("🎉 アップグレード完了", "プレミアムプランへようこそ！すべての機能が解放されました。", [
          { text: "OK", onPress: onClose },
        ]);
      } else if (result.error && result.error !== "キャンセルされました") {
        Alert.alert("購入エラー", result.error);
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const result = await onRestore();
      if (result.success) {
        Alert.alert("復元完了", "プレミアムプランが復元されました。", [{ text: "OK", onPress: onClose }]);
      } else {
        Alert.alert("復元結果", result.error ?? "有効なサブスクリプションが見つかりませんでした。");
      }
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
          <Text style={styles.headerTitle}>プレミアムプラン</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroEmoji}>✨</Text>
            <Text style={styles.heroTitle}>KDP絵本メーカーAI</Text>
            <Text style={styles.heroSubtitle}>プレミアム</Text>
          </View>

          {/* Reason banner */}
          {reasonMessage && (
            <View style={styles.reasonBanner}>
              <Text style={styles.reasonText}>{reasonMessage}</Text>
            </View>
          )}

          {/* Price */}
          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>月額</Text>
            <Text style={styles.price}>¥480</Text>
            <Text style={styles.priceSub}>/ 月　いつでもキャンセル可能</Text>
          </View>

          {/* Feature comparison */}
          <View style={styles.comparisonContainer}>
            {/* Free column */}
            <View style={styles.planColumn}>
              <Text style={styles.planLabel}>無料版</Text>
              {FEATURES_FREE.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <Text style={[styles.featureIcon, f.available ? styles.iconOk : styles.iconNg]}>
                    {f.available ? "✓" : "✗"}
                  </Text>
                  <Text style={[styles.featureText, !f.available && styles.featureTextNg]}>{f.label}</Text>
                </View>
              ))}
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Premium column */}
            <View style={[styles.planColumn, styles.premiumColumn]}>
              <Text style={[styles.planLabel, styles.premiumLabel]}>✨ プレミアム</Text>
              {FEATURES_PREMIUM.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <Text style={[styles.featureIcon, styles.iconOk]}>✓</Text>
                  <Text style={styles.featureText}>{f.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Purchase button */}
          <Pressable
            style={[styles.purchaseBtn, isPurchasing && styles.purchaseBtnDisabled]}
            onPress={handlePurchase}
            disabled={isPurchasing || isRestoring}
          >
            {isPurchasing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.purchaseBtnText}>
                {Platform.OS === "web" ? "プレミアムを試す（デモ）" : "月額 ¥480 で始める"}
              </Text>
            )}
          </Pressable>

          {/* Restore */}
          <Pressable
            style={styles.restoreBtn}
            onPress={handleRestore}
            disabled={isPurchasing || isRestoring}
          >
            {isRestoring ? (
              <ActivityIndicator color="#6366f1" size="small" />
            ) : (
              <Text style={styles.restoreBtnText}>購入を復元する</Text>
            )}
          </Pressable>

          {/* Legal */}
          <Text style={styles.legal}>
            ご購入はGoogle Playアカウントに請求されます。サブスクリプションは自動更新されます。
            更新の24時間前までにキャンセルしない限り、自動的に更新されます。
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  closeBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  closeBtnText: { fontSize: 18, color: "#6b7280" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#111827" },
  content: { padding: 20, paddingBottom: 40 },
  hero: { alignItems: "center", marginBottom: 20 },
  heroEmoji: { fontSize: 48, marginBottom: 8 },
  heroTitle: { fontSize: 22, fontWeight: "800", color: "#111827" },
  heroSubtitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6366f1",
    backgroundColor: "#eef2ff",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 6,
  },
  reasonBanner: {
    backgroundColor: "#fef3c7",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
  },
  reasonText: { fontSize: 13, color: "#92400e", lineHeight: 18 },
  priceCard: {
    backgroundColor: "#6366f1",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  priceLabel: { fontSize: 13, color: "#c7d2fe", marginBottom: 4 },
  price: { fontSize: 48, fontWeight: "900", color: "#fff" },
  priceSub: { fontSize: 13, color: "#c7d2fe", marginTop: 4 },
  comparisonContainer: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
    marginBottom: 24,
  },
  planColumn: { flex: 1, padding: 14 },
  premiumColumn: { backgroundColor: "#f5f3ff" },
  planLabel: { fontSize: 13, fontWeight: "700", color: "#6b7280", marginBottom: 10 },
  premiumLabel: { color: "#6366f1" },
  featureRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  featureIcon: { fontSize: 13, fontWeight: "700", marginRight: 6, marginTop: 1 },
  iconOk: { color: "#22c55e" },
  iconNg: { color: "#ef4444" },
  featureText: { fontSize: 12, color: "#374151", flex: 1, lineHeight: 18 },
  featureTextNg: { color: "#9ca3af" },
  divider: { width: 1, backgroundColor: "#e5e7eb" },
  purchaseBtn: {
    backgroundColor: "#6366f1",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  purchaseBtnDisabled: { opacity: 0.6 },
  purchaseBtnText: { fontSize: 17, fontWeight: "700", color: "#fff" },
  restoreBtn: { alignItems: "center", paddingVertical: 12, marginBottom: 16 },
  restoreBtnText: { fontSize: 14, color: "#6366f1" },
  legal: { fontSize: 11, color: "#9ca3af", textAlign: "center", lineHeight: 16 },
});
