import React, { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  Linking,
  StyleSheet,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";

// ─── Types ───────────────────────────────────────────────────────────────────

type StepItem = {
  label: string;
  required: boolean;
  tip: string;
  highlight?: boolean; // PDF upload step
};

type Section = {
  title: string;
  items: StepItem[];
};

type Tab = {
  id: string;
  label: string;
  emoji: string;
  sections: Section[];
  note?: string;
};

// ─── Guide Data ───────────────────────────────────────────────────────────────

const TABS: Tab[] = [
  {
    id: "details",
    label: "詳細情報",
    emoji: "📝",
    note: "「保存して続行」をタップすると次のステップへ進めます。",
    sections: [
      {
        title: "言語",
        items: [
          {
            label: "言語",
            required: true,
            tip: "「日本語」を選択してください。絵本の本文が日本語で書かれている場合はこれを選びます。",
          },
        ],
      },
      {
        title: "本のタイトル",
        items: [
          {
            label: "本のタイトル",
            required: true,
            tip: "表紙に書かれているタイトルをそのまま入力します。出版後72時間以内のみ変更できます。",
          },
          {
            label: "タイトルのフリガナ",
            required: true,
            tip: "タイトルをカタカナで入力します（例：カゾクノヒ）。",
          },
          {
            label: "サブタイトル",
            required: false,
            tip: "サブタイトルがある場合のみ入力します。なければ空欄でOKです。",
          },
          {
            label: "サブタイトルのフリガナ",
            required: false,
            tip: "サブタイトルがある場合のみ入力します。",
          },
        ],
      },
      {
        title: "シリーズ",
        items: [
          {
            label: "シリーズ情報（シリーズのタイトル・巻・フリガナ）",
            required: false,
            tip: "1冊目の単発出版の場合は空欄でOKです。シリーズ化する予定がある場合のみ入力します。",
          },
        ],
      },
      {
        title: "版",
        items: [
          {
            label: "版",
            required: false,
            tip: "初めて出版する場合は空欄でOKです。改訂版を出す場合に「第2版」などと入力します。",
          },
        ],
      },
      {
        title: "著者",
        items: [
          {
            label: "主な著者等（氏名）",
            required: true,
            tip: "本名またはペンネームを入力します。出版後72時間以内のみ変更できます。",
          },
          {
            label: "著者のフリガナ",
            required: true,
            tip: "著者名をカタカナで入力します。",
          },
        ],
      },
      {
        title: "著者等（共著者・イラストレーターなど）",
        items: [
          {
            label: "著者等（氏名・フリガナ）",
            required: false,
            tip: "共著者やイラストレーターがいる場合に追加します。1人で制作した場合は空欄でOKです。最大9人まで追加できます。",
          },
        ],
      },
      {
        title: "内容紹介",
        items: [
          {
            label: "内容紹介",
            required: true,
            tip: "Amazonの商品ページに表示される説明文です。絵本のあらすじや対象年齢を書きましょう。最大4000文字。読者が「読んでみたい」と思えるような文章を心がけましょう。",
          },
        ],
      },
      {
        title: "出版に関して必要な権利",
        items: [
          {
            label: "著作権の選択",
            required: true,
            tip: "自分で作った作品の場合は「私は著作権を所有し、出版に関して必要な権利を保有しています」を選択します。",
          },
        ],
      },
      {
        title: "主な対象読者",
        items: [
          {
            label: "露骨な性的表現を含む画像またはタイトル",
            required: true,
            tip: "絵本の場合は「いいえ」を選択します。",
          },
          {
            label: "対象年齢（最少年齢・最高年齢）",
            required: false,
            tip: "絵本の場合は「幼児〜10歳」などを設定すると検索で見つかりやすくなります。",
          },
        ],
      },
      {
        title: "主なマーケットプレイス",
        items: [
          {
            label: "主なマーケットプレイス",
            required: true,
            tip: "日本向けに出版する場合は「Amazon.co.jp」を選択します。",
          },
        ],
      },
      {
        title: "カテゴリー",
        items: [
          {
            label: "カテゴリー（最大3つ）",
            required: true,
            tip: "「本 › 絵本・児童書 › 絵本」などを選択します。カテゴリーを設定することで検索で見つかりやすくなります。",
          },
        ],
      },
      {
        title: "キーワード",
        items: [
          {
            label: "キーワード（最大7つ）",
            required: false,
            tip: "「家族」「子ども」「読み聞かせ」など、本の内容を表すキーワードを入力します。検索結果に影響します。",
          },
        ],
      },
      {
        title: "出版日・発売日",
        items: [
          {
            label: "出版日",
            required: true,
            tip: "初めて出版する場合は「出版日と発売日は同じです」を選択します。",
          },
          {
            label: "発売日",
            required: true,
            tip: "「本を今すぐ販売する」か「発売スケジュール設定」を選べます。すぐ販売したい場合は「今すぐ」を選択します。",
          },
        ],
      },
    ],
  },
  {
    id: "content",
    label: "コンテンツ",
    emoji: "📄",
    note: "このアプリで作成したPDFをここでアップロードします。「保存して続行」で価格設定へ進みます。",
    sections: [
      {
        title: "ISBN",
        items: [
          {
            label: "ISBN",
            required: true,
            tip: "「無料のKDP ISBNを使用」を選択して「ISBNを取得」をタップするだけでOKです。費用は一切かかりません。",
          },
        ],
      },
      {
        title: "印刷オプション",
        items: [
          {
            label: "インクと用紙のタイプ",
            required: true,
            tip: "絵本（カラー）の場合は「本文（プレミアム カラー）用紙（白）」を選択します。白黒の場合は「本文（白黒）用紙（白）」でコストを抑えられます。",
          },
          {
            label: "判型（サイズ）",
            required: true,
            tip: "このアプリのPDFは「215.9 × 215.9 mm（8.5 × 8.5インチ）」に対応しています。同じサイズを選択してください。",
          },
          {
            label: "裁ち落とし設定",
            required: true,
            tip: "このアプリのPDFは裁ち落とし対応です。「裁ち落とし（PDFのみ）」を選択してください。",
          },
          {
            label: "ペーパーバックの表紙仕上げ",
            required: true,
            tip: "「光沢なし」か「光沢あり」を選べます。絵本には光沢ありが映えますが、好みで選んでOKです。",
          },
          {
            label: "ページを読む方向",
            required: true,
            tip: "日本語の横書き絵本の場合は「左から右（横書き）」を選択します。",
          },
        ],
      },
      {
        title: "原稿（本文PDFのアップロード）",
        items: [
          {
            label: "📤 原稿をアップロード",
            required: true,
            highlight: true,
            tip: "このアプリで作成・ダウンロードしたPDFファイルをここでアップロードします。「原稿をアップロード」ボタンをタップしてPDFを選択してください。アップロード成功後、緑色のチェックマークが表示されます。",
          },
        ],
      },
      {
        title: "表紙（表紙PDFのアップロード）",
        items: [
          {
            label: "📤 表紙ファイルをアップロード",
            required: true,
            highlight: true,
            tip: "表紙用のPDFをアップロードします。KDPのテンプレートを使って作成するか、このアプリの表紙ページをPDF化してアップロードします。「表紙ファイルをアップロード」ボタンをタップしてください。",
          },
          {
            label: "表紙にバーコードが含まれていますか？",
            required: true,
            tip: "表紙にバーコードを自分で入れていない場合は、チェックを外したままにします（KDPが自動でバーコードを追加します）。",
          },
        ],
      },
      {
        title: "AI生成コンテンツ",
        items: [
          {
            label: "AIツールの使用有無",
            required: true,
            tip: "このアプリのAI変換機能を使った場合は「はい」を選択します。テキスト・画像・翻訳それぞれについて使用したAIツール名（例：ChatGPT、Gemini）を入力します。",
          },
        ],
      },
      {
        title: "本のプレビュー",
        items: [
          {
            label: "プレビューアーを起動",
            required: false,
            tip: "「プレビューアーを起動」をタップすると、実際の本の仕上がりを確認できます。アップロードしたPDFに問題がないか必ず確認しましょう。",
          },
        ],
      },
    ],
  },
  {
    id: "pricing",
    label: "価格設定",
    emoji: "💰",
    note: "価格を設定したら「ペーパーバックを出版」をタップして完了です。審査に最大72時間かかります。",
    sections: [
      {
        title: "出版地域",
        items: [
          {
            label: "出版地域",
            required: true,
            tip: "「すべての地域（全世界での権利）」を選択すると、世界中のAmazonで販売できます。特定の国のみで販売したい場合は「特定の出版地域」を選びます。",
          },
        ],
      },
      {
        title: "主なマーケットプレイス",
        items: [
          {
            label: "主なマーケットプレイス",
            required: true,
            tip: "詳細情報タブで選択したマーケットプレイス（Amazon.co.jp）が表示されます。変更する場合は詳細情報タブに戻ります。",
          },
        ],
      },
      {
        title: "価格設定・ロイヤリティ・配信",
        items: [
          {
            label: "Amazon.co.jpの希望小売価格",
            required: true,
            tip: "販売価格を入力します（最低¥950〜最大¥30,000）。印刷コスト（例：¥475）を差し引いた60%がロイヤリティとして受け取れます。例：¥1,500で販売 → ロイヤリティ = (¥1,500 × 60%) − ¥475 = ¥425",
          },
          {
            label: "他のマーケットプレイスの価格",
            required: false,
            tip: "「この価格をすべてのマーケットプレイスの基準にする」をタップすると、自動で他の国の価格が設定されます。個別に変更することもできます。",
          },
        ],
      },
      {
        title: "利用規約",
        items: [
          {
            label: "利用規約への同意",
            required: true,
            tip: "「ペーパーバックを出版」ボタンをタップすることで、KDPの利用規約に同意したことになります。",
          },
        ],
      },
      {
        title: "サンプル版を依頼（任意）",
        items: [
          {
            label: "校正刷りを依頼",
            required: false,
            tip: "出版前に実際の印刷物を確認したい場合は「校正刷りを依頼」をタップします。費用がかかりますが、品質確認に役立ちます。",
          },
        ],
      },
      {
        title: "出版",
        items: [
          {
            label: "🚀 ペーパーバックを出版",
            required: true,
            highlight: true,
            tip: "すべての設定が完了したら「ペーパーバックを出版」ボタンをタップします。審査に最大72時間かかります。承認されるとAmazonで購入できるようになります。アカウント情報（銀行口座など）の設定が完了していないと出版できません。",
          },
        ],
      },
    ],
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ required }: { required: boolean }) {
  return (
    <View style={[styles.badge, required ? styles.badgeRequired : styles.badgeOptional]}>
      <Text style={[styles.badgeText, required ? styles.badgeTextRequired : styles.badgeTextOptional]}>
        {required ? "必須" : "任意"}
      </Text>
    </View>
  );
}

function StepCard({ item }: { item: StepItem }) {
  const [expanded, setExpanded] = useState(false);
  const colors = useColors();

  return (
    <TouchableOpacity
      onPress={() => setExpanded((v) => !v)}
      style={[
        styles.stepCard,
        {
          backgroundColor: item.highlight ? colors.primary + "18" : colors.surface,
          borderColor: item.highlight ? colors.primary : colors.border,
          borderWidth: item.highlight ? 1.5 : 1,
        },
      ]}
      activeOpacity={0.75}
    >
      <View style={styles.stepCardHeader}>
        <View style={styles.stepCardLeft}>
          <Badge required={item.required} />
          <Text
            style={[
              styles.stepLabel,
              { color: item.highlight ? colors.primary : colors.foreground },
            ]}
          >
            {item.label}
          </Text>
        </View>
        <Text style={[styles.chevron, { color: colors.muted }]}>
          {expanded ? "▲" : "▼"}
        </Text>
      </View>
      {expanded && (
        <View style={[styles.tipBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.tipText, { color: colors.foreground }]}>{item.tip}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function SectionBlock({ section }: { section: Section }) {
  const colors = useColors();
  return (
    <View style={styles.sectionBlock}>
      <Text style={[styles.sectionTitle, { color: colors.muted }]}>{section.title}</Text>
      {section.items.map((item, i) => (
        <StepCard key={i} item={item} />
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function KdpGuideScreen() {
  const [activeTab, setActiveTab] = useState<string>("details");
  const colors = useColors();

  const currentTab = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>KDP出版ガイド</Text>
        <Text style={[styles.headerSub, { color: colors.muted }]}>
          Amazon KDPでペーパーバックを出版する手順
        </Text>
        <TouchableOpacity
          style={[styles.kdpLinkBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary }]}
          onPress={() => Linking.openURL("https://kdp.amazon.co.jp/ja_JP/")}
        >
          <Text style={[styles.kdpLinkText, { color: colors.primary }]}>
            🌐 Amazon KDPを開く
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Selector */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tabItem,
              activeTab === tab.id && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 },
            ]}
            onPress={() => setActiveTab(tab.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabEmoji]}>{tab.emoji}</Text>
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === tab.id ? colors.primary : colors.muted },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Progress Indicator */}
      <View style={[styles.progressBar, { backgroundColor: colors.background }]}>
        {TABS.map((tab, i) => (
          <View key={tab.id} style={styles.progressStep}>
            <View
              style={[
                styles.progressDot,
                {
                  backgroundColor:
                    tab.id === activeTab
                      ? colors.primary
                      : TABS.indexOf(currentTab) > i
                      ? colors.success
                      : colors.border,
                },
              ]}
            >
              {TABS.indexOf(currentTab) > i && (
                <Text style={styles.progressCheck}>✓</Text>
              )}
              {tab.id === activeTab && (
                <Text style={styles.progressNum}>{i + 1}</Text>
              )}
              {TABS.indexOf(currentTab) <= i && tab.id !== activeTab && (
                <Text style={[styles.progressNum, { color: colors.muted }]}>{i + 1}</Text>
              )}
            </View>
            {i < TABS.length - 1 && (
              <View
                style={[
                  styles.progressLine,
                  {
                    backgroundColor:
                      TABS.indexOf(currentTab) > i ? colors.success : colors.border,
                  },
                ]}
              />
            )}
          </View>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Note Banner */}
        {currentTab.note && (
          <View style={[styles.noteBanner, { backgroundColor: colors.primary + "15", borderColor: colors.primary }]}>
            <Text style={[styles.noteText, { color: colors.primary }]}>
              💡 {currentTab.note}
            </Text>
          </View>
        )}

        {/* Legend */}
        <View style={[styles.legend, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.legendItem}>
            <View style={[styles.badge, styles.badgeRequired]}>
              <Text style={[styles.badgeText, styles.badgeTextRequired]}>必須</Text>
            </View>
            <Text style={[styles.legendText, { color: colors.muted }]}>入力が必要な項目</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.badge, styles.badgeOptional]}>
              <Text style={[styles.badgeText, styles.badgeTextOptional]}>任意</Text>
            </View>
            <Text style={[styles.legendText, { color: colors.muted }]}>入力しなくてもOK</Text>
          </View>
          <Text style={[styles.legendHint, { color: colors.muted }]}>
            各項目をタップすると詳細が表示されます
          </Text>
        </View>

        {/* Sections */}
        {currentTab.sections.map((section, i) => (
          <SectionBlock key={i} section={section} />
        ))}

        {/* Navigation Buttons */}
        <View style={styles.navButtons}>
          {TABS.indexOf(currentTab) > 0 && (
            <TouchableOpacity
              style={[styles.navBtn, styles.navBtnBack, { borderColor: colors.border }]}
              onPress={() => setActiveTab(TABS[TABS.indexOf(currentTab) - 1].id)}
              activeOpacity={0.75}
            >
              <Text style={[styles.navBtnText, { color: colors.muted }]}>← 前のステップ</Text>
            </TouchableOpacity>
          )}
          {TABS.indexOf(currentTab) < TABS.length - 1 && (
            <TouchableOpacity
              style={[styles.navBtn, styles.navBtnNext, { backgroundColor: colors.primary }]}
              onPress={() => setActiveTab(TABS[TABS.indexOf(currentTab) + 1].id)}
              activeOpacity={0.75}
            >
              <Text style={styles.navBtnNextText}>次のステップ →</Text>
            </TouchableOpacity>
          )}
          {TABS.indexOf(currentTab) === TABS.length - 1 && (
            <TouchableOpacity
              style={[styles.navBtn, styles.navBtnNext, { backgroundColor: "#FF9900" }]}
              onPress={() => Linking.openURL("https://kdp.amazon.co.jp/ja_JP/")}
              activeOpacity={0.75}
            >
              <Text style={styles.navBtnNextText}>🚀 KDPで出版する</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 13,
    marginBottom: 10,
  },
  kdpLinkBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  kdpLinkText: {
    fontSize: 13,
    fontWeight: "600",
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 2.5,
    borderBottomColor: "transparent",
  },
  tabEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  progressBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 32,
  },
  progressStep: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  progressCheck: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  progressNum: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  progressLine: {
    width: 60,
    height: 2,
    marginHorizontal: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  noteBanner: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
  },
  legend: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
    gap: 6,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendText: {
    fontSize: 12,
  },
  legendHint: {
    fontSize: 11,
    marginTop: 4,
  },
  sectionBlock: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginLeft: 2,
  },
  stepCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  stepCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
    flexWrap: "wrap",
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    flexShrink: 1,
  },
  chevron: {
    fontSize: 11,
    marginLeft: 8,
  },
  tipBox: {
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 20,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  badgeRequired: {
    backgroundColor: "#EF444420",
  },
  badgeOptional: {
    backgroundColor: "#6B728020",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  badgeTextRequired: {
    color: "#EF4444",
  },
  badgeTextOptional: {
    color: "#6B7280",
  },
  navButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  navBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  navBtnBack: {
    borderWidth: 1,
  },
  navBtnNext: {},
  navBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  navBtnNextText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});
