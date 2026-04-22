import React, { useState, useEffect, useCallback } from "react";
import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  Linking,
  StyleSheet,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

// ─── Types ───────────────────────────────────────────────────────────────────

type StepItem = {
  id: string;
  label: string;
  required: boolean;
  tip: string;
  highlight?: boolean;
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
            id: "d_lang",
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
            id: "d_title",
            label: "本のタイトル",
            required: true,
            tip: "表紙に書かれているタイトルをそのまま入力します。出版後72時間以内のみ変更できます。",
          },
          {
            id: "d_title_kana",
            label: "タイトルのフリガナ",
            required: true,
            tip: "タイトルをカタカナで入力します（例：カゾクノヒ）。",
          },
          {
            id: "d_subtitle",
            label: "サブタイトル",
            required: false,
            tip: "サブタイトルがある場合のみ入力します。なければ空欄でOKです。",
          },
          {
            id: "d_subtitle_kana",
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
            id: "d_series",
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
            id: "d_edition",
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
            id: "d_author",
            label: "主な著者等（氏名）",
            required: true,
            tip: "本名またはペンネームを入力します。出版後72時間以内のみ変更できます。",
          },
          {
            id: "d_author_kana",
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
            id: "d_coauthor",
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
            id: "d_description",
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
            id: "d_rights",
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
            id: "d_adult",
            label: "露骨な性的表現を含む画像またはタイトル",
            required: true,
            tip: "絵本の場合は「いいえ」を選択します。",
          },
          {
            id: "d_age",
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
            id: "d_marketplace",
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
            id: "d_category",
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
            id: "d_keywords",
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
            id: "d_pubdate",
            label: "出版日",
            required: true,
            tip: "初めて出版する場合は「出版日と発売日は同じです」を選択します。",
          },
          {
            id: "d_saledate",
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
            id: "c_isbn",
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
            id: "c_ink",
            label: "インクと用紙のタイプ",
            required: true,
            tip: "絵本（カラー）の場合は「本文（プレミアム カラー）用紙（白）」を選択します。白黒の場合は「本文（白黒）用紙（白）」でコストを抑えられます。",
          },
          {
            id: "c_size",
            label: "判型（サイズ）",
            required: true,
            tip: "このアプリのPDFは「215.9 × 215.9 mm（8.5 × 8.5インチ）」に対応しています。同じサイズを選択してください。",
          },
          {
            id: "c_bleed",
            label: "裁ち落とし設定",
            required: true,
            tip: "このアプリのPDFは裁ち落とし対応です。「裁ち落とし（PDFのみ）」を選択してください。",
          },
          {
            id: "c_finish",
            label: "ペーパーバックの表紙仕上げ",
            required: true,
            tip: "「光沢なし」か「光沢あり」を選べます。絵本には光沢ありが映えますが、好みで選んでOKです。",
          },
          {
            id: "c_direction",
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
            id: "c_manuscript",
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
            id: "c_cover",
            label: "📤 表紙ファイルをアップロード",
            required: true,
            highlight: true,
            tip: "表紙用のPDFをアップロードします。KDPのテンプレートを使って作成するか、このアプリの表紙ページをPDF化してアップロードします。「表紙ファイルをアップロード」ボタンをタップしてください。",
          },
          {
            id: "c_barcode",
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
            id: "c_ai",
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
            id: "c_preview",
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
            id: "p_territory",
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
            id: "p_marketplace",
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
            id: "p_price_jp",
            label: "Amazon.co.jpの希望小売価格",
            required: true,
            tip: "販売価格を入力します（最低¥950〜最大¥30,000）。印刷コスト（例：¥475）を差し引いた60%がロイヤリティとして受け取れます。例：¥1,500で販売 → ロイヤリティ = (¥1,500 × 60%) − ¥475 = ¥425",
          },
          {
            id: "p_price_other",
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
            id: "p_tos",
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
            id: "p_proof",
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
            id: "p_publish",
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

// Collect all item IDs for progress calculation
const ALL_ITEM_IDS = TABS.flatMap((tab) =>
  tab.sections.flatMap((sec) => sec.items.map((item) => item.id))
);
const REQUIRED_ITEM_IDS = TABS.flatMap((tab) =>
  tab.sections.flatMap((sec) =>
    sec.items.filter((item) => item.required).map((item) => item.id)
  )
);

const STORAGE_KEY = "@kdp_checklist_v1";

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

function StepCard({
  item,
  checked,
  onToggle,
}: {
  item: StepItem;
  checked: boolean;
  onToggle: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const colors = useColors();

  return (
    <View
      style={[
        styles.stepCard,
        {
          backgroundColor: checked
            ? colors.success + "12"
            : item.highlight
            ? colors.primary + "12"
            : colors.surface,
          borderColor: checked
            ? colors.success
            : item.highlight
            ? colors.primary
            : colors.border,
          borderWidth: checked || item.highlight ? 1.5 : 1,
        },
      ]}
    >
      {/* Main row: checkbox + label + expand */}
      <TouchableOpacity
        style={styles.stepCardRow}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.75}
      >
        {/* Checkbox */}
        <TouchableOpacity
          style={[
            styles.checkbox,
            {
              borderColor: checked ? colors.success : colors.border,
              backgroundColor: checked ? colors.success : "transparent",
            },
          ]}
          onPress={() => onToggle(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {checked && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>

        {/* Label area */}
        <View style={styles.stepCardLabelArea}>
          <Badge required={item.required} />
          <Text
            style={[
              styles.stepLabel,
              {
                color: checked
                  ? colors.success
                  : item.highlight
                  ? colors.primary
                  : colors.foreground,
                textDecorationLine: checked ? "line-through" : "none",
                opacity: checked ? 0.75 : 1,
              },
            ]}
          >
            {item.label}
          </Text>
        </View>

        {/* Expand chevron */}
        <Text style={[styles.chevron, { color: colors.muted }]}>
          {expanded ? "▲" : "▼"}
        </Text>
      </TouchableOpacity>

      {/* Tip box */}
      {expanded && (
        <View style={[styles.tipBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Text style={[styles.tipText, { color: colors.foreground }]}>{item.tip}</Text>
          <TouchableOpacity
            style={[
              styles.tipCheckBtn,
              { backgroundColor: checked ? colors.border : colors.success },
            ]}
            onPress={() => onToggle(item.id)}
          >
            <Text style={styles.tipCheckBtnText}>
              {checked ? "✓ 完了済み（タップで解除）" : "完了としてマーク ✓"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function SectionBlock({
  section,
  checkedIds,
  onToggle,
}: {
  section: Section;
  checkedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const colors = useColors();
  const doneCount = section.items.filter((i) => checkedIds.has(i.id)).length;
  const total = section.items.length;

  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>{section.title}</Text>
        <Text style={[styles.sectionCount, { color: doneCount === total ? colors.success : colors.muted }]}>
          {doneCount}/{total}
        </Text>
      </View>
      {section.items.map((item) => (
        <StepCard
          key={item.id}
          item={item}
          checked={checkedIds.has(item.id)}
          onToggle={onToggle}
        />
      ))}
    </View>
  );
}

// ─── Progress Bar Component ───────────────────────────────────────────────────

function ProgressSummary({
  checkedIds,
  colors,
}: {
  checkedIds: Set<string>;
  colors: ReturnType<typeof useColors>;
}) {
  const totalRequired = REQUIRED_ITEM_IDS.length;
  const doneRequired = REQUIRED_ITEM_IDS.filter((id) => checkedIds.has(id)).length;
  const totalAll = ALL_ITEM_IDS.length;
  const doneAll = ALL_ITEM_IDS.filter((id) => checkedIds.has(id)).length;
  const pct = totalRequired > 0 ? Math.round((doneRequired / totalRequired) * 100) : 0;

  return (
    <View style={[styles.progressSummary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.progressSummaryTop}>
        <Text style={[styles.progressSummaryTitle, { color: colors.foreground }]}>
          出版作業の進捗
        </Text>
        <Text style={[styles.progressSummaryPct, { color: pct === 100 ? colors.success : colors.primary }]}>
          {pct}%
        </Text>
      </View>
      {/* Bar */}
      <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${pct}%` as `${number}%`,
              backgroundColor: pct === 100 ? colors.success : colors.primary,
            },
          ]}
        />
      </View>
      <Text style={[styles.progressSummarySub, { color: colors.muted }]}>
        必須項目 {doneRequired}/{totalRequired} 完了　全項目 {doneAll}/{totalAll} 完了
      </Text>
      {pct === 100 && (
        <View style={[styles.completeBanner, { backgroundColor: colors.success + "18" }]}>
          <Text style={[styles.completeBannerText, { color: colors.success }]}>
            🎉 必須項目がすべて完了しました！KDPで出版できます。
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function KdpGuideScreen() {
  const [activeTab, setActiveTab] = useState<string>("details");
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const colors = useColors();

  // Load persisted checklist state
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          const arr: string[] = JSON.parse(raw);
          setCheckedIds(new Set(arr));
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // Persist on change
  const persistChecked = useCallback((next: Set<string>) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...next])).catch(() => {});
  }, []);

  const handleToggle = useCallback(
    (id: string) => {
      setCheckedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        persistChecked(next);
        return next;
      });
    },
    [persistChecked]
  );

  const handleReset = useCallback(() => {
    Alert.alert(
      "チェックリストをリセット",
      "すべてのチェックを外しますか？この操作は元に戻せません。",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "リセット",
          style: "destructive",
          onPress: () => {
            const empty = new Set<string>();
            setCheckedIds(empty);
            persistChecked(empty);
          },
        },
      ]
    );
  }, [persistChecked]);

  const currentTab = TABS.find((t) => t.id === activeTab) ?? TABS[0];
  const currentTabIdx = TABS.indexOf(currentTab);

  // Tab-level progress
  const tabProgress = (tab: Tab) => {
    const ids = tab.sections.flatMap((s) => s.items.map((i) => i.id));
    const done = ids.filter((id) => checkedIds.has(id)).length;
    return { done, total: ids.length };
  };

  if (!loaded) return null;

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>KDP出版ガイド</Text>
            <Text style={[styles.headerSub, { color: colors.muted }]}>
              Amazon KDPでペーパーバックを出版する手順
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.resetBtn, { borderColor: colors.border }]}
              onPress={handleReset}
            >
              <Text style={[styles.resetBtnText, { color: colors.muted }]}>リセット</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.kdpLinkBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary }]}
              onPress={() => Linking.openURL("https://kdp.amazon.co.jp/ja_JP/")}
            >
              <Text style={[styles.kdpLinkText, { color: colors.primary }]}>KDPを開く 🌐</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Tab Selector */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {TABS.map((tab) => {
          const { done, total } = tabProgress(tab);
          const isActive = activeTab === tab.id;
          const allDone = done === total;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabItem,
                isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2.5 },
              ]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.tabEmoji}>{allDone ? "✅" : tab.emoji}</Text>
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? colors.primary : colors.muted },
                ]}
              >
                {tab.label}
              </Text>
              <Text style={[styles.tabProgress, { color: allDone ? colors.success : colors.muted }]}>
                {done}/{total}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Overall Progress Summary (only on first tab) */}
        {activeTab === "details" && (
          <ProgressSummary checkedIds={checkedIds} colors={colors} />
        )}

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
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.badge, styles.badgeRequired]}>
                <Text style={[styles.badgeText, styles.badgeTextRequired]}>必須</Text>
              </View>
              <Text style={[styles.legendText, { color: colors.muted }]}>入力が必要</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.badge, styles.badgeOptional]}>
                <Text style={[styles.badgeText, styles.badgeTextOptional]}>任意</Text>
              </View>
              <Text style={[styles.legendText, { color: colors.muted }]}>入力しなくてもOK</Text>
            </View>
          </View>
          <Text style={[styles.legendHint, { color: colors.muted }]}>
            ☑ チェックボックスをタップして進捗を記録できます
          </Text>
        </View>

        {/* Sections */}
        {currentTab.sections.map((section, i) => (
          <SectionBlock
            key={i}
            section={section}
            checkedIds={checkedIds}
            onToggle={handleToggle}
          />
        ))}

        {/* Navigation Buttons */}
        <View style={styles.navButtons}>
          {currentTabIdx > 0 && (
            <TouchableOpacity
              style={[styles.navBtn, styles.navBtnBack, { borderColor: colors.border }]}
              onPress={() => setActiveTab(TABS[currentTabIdx - 1].id)}
              activeOpacity={0.75}
            >
              <Text style={[styles.navBtnText, { color: colors.muted }]}>← 前のステップ</Text>
            </TouchableOpacity>
          )}
          {currentTabIdx < TABS.length - 1 && (
            <TouchableOpacity
              style={[styles.navBtn, styles.navBtnNext, { backgroundColor: colors.primary }]}
              onPress={() => setActiveTab(TABS[currentTabIdx + 1].id)}
              activeOpacity={0.75}
            >
              <Text style={styles.navBtnNextText}>次のステップ →</Text>
            </TouchableOpacity>
          )}
          {currentTabIdx === TABS.length - 1 && (
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
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 12,
  },
  headerActions: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    flexShrink: 0,
  },
  resetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  kdpLinkBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  kdpLinkText: {
    fontSize: 12,
    fontWeight: "600",
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 2.5,
    borderBottomColor: "transparent",
  },
  tabEmoji: {
    fontSize: 16,
    marginBottom: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  tabProgress: {
    fontSize: 10,
    marginTop: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 32,
  },
  // Overall progress summary
  progressSummary: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  progressSummaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressSummaryTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  progressSummaryPct: {
    fontSize: 22,
    fontWeight: "800",
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 6,
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  progressSummarySub: {
    fontSize: 11,
  },
  completeBanner: {
    marginTop: 10,
    borderRadius: 8,
    padding: 10,
  },
  completeBannerText: {
    fontSize: 13,
    fontWeight: "600",
  },
  // Note
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
  // Legend
  legend: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
    gap: 6,
  },
  legendRow: {
    flexDirection: "row",
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendText: {
    fontSize: 12,
  },
  legendHint: {
    fontSize: 11,
    marginTop: 2,
  },
  // Section
  sectionBlock: {
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    marginLeft: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: "600",
  },
  // Step card
  stepCard: {
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    overflow: "hidden",
  },
  stepCardRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  checkmark: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 16,
  },
  stepCardLabelArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
    flexShrink: 1,
  },
  chevron: {
    fontSize: 10,
    flexShrink: 0,
  },
  tipBox: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    gap: 10,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 20,
  },
  tipCheckBtn: {
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  tipCheckBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  // Badge
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    flexShrink: 0,
  },
  badgeRequired: {
    backgroundColor: "#EF444420",
  },
  badgeOptional: {
    backgroundColor: "#6B728020",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  badgeTextRequired: {
    color: "#EF4444",
  },
  badgeTextOptional: {
    color: "#6B7280",
  },
  // Nav buttons
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
