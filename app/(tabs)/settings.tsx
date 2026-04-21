import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";

const SETTINGS_KEY = "kdp_app_settings";

export default function SettingsScreen() {
  const colors = useColors();
  const [appVersion] = useState("1.0.0");

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primary }]}>
            <MaterialIcons name="settings" size={20} color="#fff" />
          </View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>設定</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* App Info */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>アプリ情報</Text>
          <View style={styles.infoRow}>
            <MaterialIcons name="menu-book" size={20} color={colors.primary} />
            <View style={styles.infoText}>
              <Text style={[styles.infoLabel, { color: colors.foreground }]}>KDP絵本メーカーAI</Text>
              <Text style={[styles.infoValue, { color: colors.muted }]}>バージョン {appVersion}</Text>
            </View>
          </View>
        </View>

        {/* Usage Guide */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>使い方</Text>
          {[
            { icon: "photo" as const, step: "1", text: "「絵本制作」タブで写真をアップロード" },
            { icon: "auto-awesome" as const, step: "2", text: "「AI一括変換」で絵本風イラストに変換" },
            { icon: "description" as const, step: "3", text: "テキストを入力して「PDF出力」でKDP用PDFを生成" },
          ].map((item) => (
            <View key={item.step} style={styles.guideRow}>
              <View style={[styles.stepBadge, { backgroundColor: `${colors.primary}18` }]}>
                <Text style={[styles.stepText, { color: colors.primary }]}>{item.step}</Text>
              </View>
              <MaterialIcons name={item.icon} size={18} color={colors.primary} />
              <Text style={[styles.guideText, { color: colors.foreground }]}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* KDP Info */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>KDP仕様</Text>
          <View style={styles.specRow}>
            <Text style={[styles.specLabel, { color: colors.muted }]}>ページサイズ</Text>
            <Text style={[styles.specValue, { color: colors.foreground }]}>215.9 × 215.9 mm</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.specRow}>
            <Text style={[styles.specLabel, { color: colors.muted }]}>解像度</Text>
            <Text style={[styles.specValue, { color: colors.foreground }]}>300 DPI (2550px)</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.specRow}>
            <Text style={[styles.specLabel, { color: colors.muted }]}>最低ページ数</Text>
            <Text style={[styles.specValue, { color: colors.foreground }]}>24ページ</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.specRow}>
            <Text style={[styles.specLabel, { color: colors.muted }]}>フォーマット</Text>
            <Text style={[styles.specValue, { color: colors.foreground }]}>PDF</Text>
          </View>
        </View>

        {/* AI Info */}
        <View style={[styles.infoCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
          <MaterialIcons name="auto-awesome" size={20} color={colors.primary} />
          <Text style={[styles.infoCardText, { color: colors.primary }]}>
            AI画像変換はGemini AIを使用しています。サーバー側で処理されるため、APIキーの設定は不要です。
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 100,
  },
  section: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  infoValue: {
    fontSize: 13,
    marginTop: 2,
  },
  guideRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    fontSize: 12,
    fontWeight: "800",
  },
  guideText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  specLabel: {
    fontSize: 14,
  },
  specValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    height: 1,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  infoCardText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
});
