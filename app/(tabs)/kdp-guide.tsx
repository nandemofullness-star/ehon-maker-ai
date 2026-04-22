import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface SubStep {
  text: string;          // 操作の説明
  example?: string;      // 入力例（黄色ボックス）
  note?: string;         // 補足（グレーボックス）
  highlight?: string;    // 画面上の場所を示すラベル（青ボックス）
}

interface Step {
  id: string;
  title: string;
  required: boolean;     // 必須かどうか
  substeps: SubStep[];
}

interface Phase {
  id: string;
  label: string;
  emoji: string;
  description: string;
  steps: Step[];
}

// ─────────────────────────────────────────────
// Guide Data
// ─────────────────────────────────────────────
const PHASES: Phase[] = [
  {
    id: "signin",
    label: "準備",
    emoji: "🔑",
    description: "まずAmazonアカウントでKDPにサインインします。",
    steps: [
      {
        id: "s_open",
        title: "KDPのサイトを開く",
        required: true,
        substeps: [
          {
            text: "ブラウザで「kdp.amazon.co.jp」を開きます。",
            highlight: "🌐 URL欄に入力：kdp.amazon.co.jp",
          },
          {
            text: "画面右側の黄色い「サインイン」ボタンをタップします。",
            highlight: "📍 右側の黄色ボタン「サインイン」",
          },
        ],
      },
      {
        id: "s_login",
        title: "Amazonアカウントでログイン",
        required: true,
        substeps: [
          {
            text: "普段使っているAmazonのメールアドレスとパスワードを入力してサインインします。",
            example: "メール：yourname@example.com\nパスワード：（Amazonのパスワード）",
          },
          {
            text: "サインイン後、「本棚」画面が表示されれば準備完了です。",
            note: "初回ログイン時はアカウント情報（銀行口座・住所など）の入力を求められる場合があります。出版前に設定しておきましょう。",
          },
        ],
      },
      {
        id: "s_new",
        title: "「紙書籍」の新規作成を開始する",
        required: true,
        substeps: [
          {
            text: "本棚画面の「タイトルの新規作成」セクションで、右端の「紙書籍」カードをタップします。",
            highlight: "📍 「タイトルの新規作成」→ 右端「＋ 紙書籍」",
          },
          {
            text: "「ペーパーバックの詳細情報」入力画面が開きます。これが最初の入力ステップです。",
          },
        ],
      },
    ],
  },
  {
    id: "details",
    label: "詳細情報",
    emoji: "📝",
    description: "本のタイトル・著者・説明文などを入力します。「保存して続行」で次へ進みます。",
    steps: [
      {
        id: "d_lang",
        title: "言語を選択する",
        required: true,
        substeps: [
          {
            text: "「言語」のドロップダウンから「日本語」を選択します。",
            highlight: "📍 画面上部「言語」のプルダウン",
            example: "選択値：日本語",
          },
        ],
      },
      {
        id: "d_title",
        title: "本のタイトルを入力する",
        required: true,
        substeps: [
          {
            text: "「本のタイトル」欄に、表紙に書いたタイトルをそのまま入力します。",
            highlight: "📍「本のタイトル」テキスト欄",
            example: "入力例：かぞくのひ",
          },
          {
            text: "「タイトルのフリガナ」欄に、カタカナでフリガナを入力します。",
            highlight: "📍「タイトルのフリガナ」テキスト欄",
            example: "入力例：カゾクノヒ",
          },
          {
            text: "「サブタイトル」と「サブタイトルのフリガナ」は、サブタイトルがない場合は空欄のままでOKです。",
            note: "サブタイトルは任意項目です。入力しなくても出版できます。",
          },
        ],
      },
      {
        id: "d_series",
        title: "シリーズ情報（任意）",
        required: false,
        substeps: [
          {
            text: "1冊目の単発出版の場合は、「シリーズ情報」は空欄のままでOKです。",
            note: "シリーズ化する予定がある場合のみ「シリーズのタイトル」「巻」を入力します。",
          },
        ],
      },
      {
        id: "d_edition",
        title: "版（任意）",
        required: false,
        substeps: [
          {
            text: "初めて出版する場合は「版」欄は空欄のままでOKです。",
            note: "改訂版を出す場合に「第2版」などと入力します。",
          },
        ],
      },
      {
        id: "d_author",
        title: "著者名を入力する",
        required: true,
        substeps: [
          {
            text: "「主な著者等」欄に、本名またはペンネームを入力します。",
            highlight: "📍「主な著者等」テキスト欄",
            example: "入力例：山田 太郎（本名）\nまたは：えほん作家（ペンネーム）",
          },
          {
            text: "その下の欄に著者名のフリガナをカタカナで入力します。",
            example: "入力例：ヤマダ タロウ",
          },
          {
            text: "「著者等」（共著者・イラストレーターなど）は、1人で制作した場合は空欄のままでOKです。",
            note: "共著者やイラストレーターがいる場合は「他を追加」ボタンから追加できます。",
          },
        ],
      },
      {
        id: "d_description",
        title: "内容紹介を入力する",
        required: true,
        substeps: [
          {
            text: "「内容紹介」のテキストエリアに、Amazonの商品ページに表示される説明文を入力します。",
            highlight: "📍「内容紹介」テキストエリア（大きな入力欄）",
            example: "入力例：\nかぞくのえがおにまつわるはなしです。\n対象年齢：幼児〜小学校低学年\n家族みんなで楽しめる絵本です。",
          },
          {
            text: "最大4000文字まで入力できます。読者が「読んでみたい」と思えるような文章を書きましょう。",
            note: "残り文字数は入力欄の右下に表示されます。",
          },
        ],
      },
      {
        id: "d_rights",
        title: "著作権の選択",
        required: true,
        substeps: [
          {
            text: "「出版に関して必要な権利」で、「私は著作権を所有し、出版に関して必要な権利を保有しています」のラジオボタンを選択します。",
            highlight: "📍 上のラジオボタン「私は著作権を所有し…」を選択",
            note: "自分で作った作品を出版する場合は必ずこちらを選択します。",
          },
        ],
      },
      {
        id: "d_audience",
        title: "主な対象読者を設定する",
        required: true,
        substeps: [
          {
            text: "「露骨な性的表現を含む画像またはタイトル」の質問に「いいえ」を選択します。",
            highlight: "📍「いいえ」のラジオボタンを選択",
          },
          {
            text: "「対象年齢」は任意ですが、絵本の場合は設定すると検索で見つかりやすくなります。",
            example: "最少年齢：幼児\n最高年齢：10",
            note: "対象年齢は任意項目です。設定しなくても出版できます。",
          },
        ],
      },
      {
        id: "d_marketplace",
        title: "主なマーケットプレイスを選択する",
        required: true,
        substeps: [
          {
            text: "「主なマーケットプレイス」のドロップダウンから「Amazon.co.jp」を選択します。",
            highlight: "📍「主なマーケットプレイス」のプルダウン",
            example: "選択値：Amazon.co.jp",
          },
        ],
      },
      {
        id: "d_category",
        title: "カテゴリーを設定する",
        required: true,
        substeps: [
          {
            text: "「カテゴリー」の「カテゴリーを編集」ボタンをタップします。",
            highlight: "📍「カテゴリーを編集」ボタン",
          },
          {
            text: "「本 › 絵本・児童書 › 絵本」などのカテゴリーを選択します。最大3つまで設定できます。",
            example: "推奨カテゴリー：\n本 › 絵本・児童書 › 絵本",
          },
        ],
      },
      {
        id: "d_keywords",
        title: "キーワードを入力する（任意）",
        required: false,
        substeps: [
          {
            text: "「キーワード」欄に、本の内容を表すキーワードを最大7つまで入力します。",
            example: "入力例：\n家族　子ども　読み聞かせ\n絵本　幼児　贈り物",
            note: "キーワードは任意ですが、設定するとAmazon検索で見つかりやすくなります。",
          },
        ],
      },
      {
        id: "d_pubdate",
        title: "出版日・発売日を設定する",
        required: true,
        substeps: [
          {
            text: "「出版日」で「出版日と発売日は同じです」を選択します（初めて出版する場合）。",
            highlight: "📍「出版日と発売日は同じです」のラジオボタン",
          },
          {
            text: "「発売日」で「本を今すぐ販売する」または「発売スケジュール設定」を選びます。",
            example: "すぐ販売したい場合：「本を今すぐ販売する」を選択\n予約受付したい場合：「発売スケジュール設定」で日付を指定",
          },
          {
            text: "最後に画面下の「保存して続行」ボタンをタップして次のステップへ進みます。",
            highlight: "📍 画面右下「保存して続行」（黄色ボタン）",
          },
        ],
      },
    ],
  },
  {
    id: "content",
    label: "コンテンツ",
    emoji: "📄",
    description: "このアプリで作成したPDFをここでアップロードします。",
    steps: [
      {
        id: "c_isbn",
        title: "ISBNを取得する（無料）",
        required: true,
        substeps: [
          {
            text: "「ISBN」セクションで「無料のKDP ISBNを使用」が選択されていることを確認します。",
            highlight: "📍「無料のKDP ISBNを使用」のラジオボタン",
          },
          {
            text: "「ISBNを取得」ボタンをタップします。自動的にISBNが割り当てられます。費用は一切かかりません。",
            highlight: "📍「ISBNを取得」ボタン（グレーのボタン）",
            note: "ISBNは本を識別するための番号です。KDPが無料で発行してくれます。",
          },
        ],
      },
      {
        id: "c_ink",
        title: "インクと用紙のタイプを選択する",
        required: true,
        substeps: [
          {
            text: "「印刷オプション」→「インクと用紙のタイプ」で、カラー絵本の場合は「本文（プレミアム カラー）用紙（白）」を選択します。",
            highlight: "📍「本文（プレミアム カラー）用紙（白）」のカード",
            example: "カラー絵本の場合：本文（プレミアム カラー）用紙（白）\nモノクロ絵本の場合：本文（白黒）用紙（白）",
            note: "プレミアムカラーは印刷コストが高くなりますが、鮮やかなカラー印刷ができます。",
          },
        ],
      },
      {
        id: "c_size",
        title: "判型（本のサイズ）を選択する",
        required: true,
        substeps: [
          {
            text: "「判型」でこのアプリで作成したPDFのサイズと同じものを選択します。",
            highlight: "📍「判型」のカード一覧",
            example: "このアプリのPDF：215.9 × 215.9 mm（8.5 × 8.5インチ）\n→「215.9 x 215.9 mm」のカードを選択",
            note: "判型とPDFのサイズが一致していないとエラーになります。このアプリは8.5×8.5インチ正方形で出力します。",
          },
        ],
      },
      {
        id: "c_bleed",
        title: "裁ち落とし設定を選択する",
        required: true,
        substeps: [
          {
            text: "「裁ち落とし設定」で「裁ち落とし（PDFのみ）」を選択します。",
            highlight: "📍「裁ち落とし（PDFのみ）」のカード",
            note: "絵本のように画像がページの端まで広がる場合は「裁ち落とし」を選択します。",
          },
        ],
      },
      {
        id: "c_cover_finish",
        title: "表紙仕上げを選択する",
        required: true,
        substeps: [
          {
            text: "「ペーパーバックの表紙仕上げ」で「光沢なし」または「光沢あり」を選択します。",
            highlight: "📍「光沢なし」または「光沢あり」のカード",
            example: "マットな仕上がり：光沢なし（推奨）\nツヤのある仕上がり：光沢あり",
          },
        ],
      },
      {
        id: "c_direction",
        title: "ページを読む方向を選択する",
        required: true,
        substeps: [
          {
            text: "「ページを読む方向」で「左から右（横書き）」を選択します。",
            highlight: "📍「左から右（横書き）」のカード",
            note: "日本語の絵本でも、横書きの場合は「左から右」を選択します。",
          },
        ],
      },
      {
        id: "c_manuscript",
        title: "原稿PDFをアップロードする ★このアプリのPDF★",
        required: true,
        substeps: [
          {
            text: "「原稿」セクションの「原稿をアップロード」ボタンをタップします。",
            highlight: "📍「原稿をアップロード」（黄色ボタン）",
          },
          {
            text: "このアプリの「絵本制作」タブで作成・保存したPDFファイルを選択します。",
            example: "ファイル名の例：かぞくのひ.pdf\n※このアプリで「PDFを生成」した後、端末の「ファイル」アプリに保存されています",
          },
          {
            text: "「原稿（ファイル名.pdf）を正常にアップロードしました」と表示されれば成功です。",
            note: "アップロードには数分かかる場合があります。",
          },
        ],
      },
      {
        id: "c_cover",
        title: "表紙PDFをアップロードする",
        required: true,
        substeps: [
          {
            text: "「表紙」セクションの「表紙ファイルをアップロード」ボタンをタップします。",
            highlight: "📍「表紙ファイルをアップロード」（黄色ボタン）",
          },
          {
            text: "表紙のPDFファイルを選択します。KDPのテンプレートを使って作成した表紙PDFをアップロードします。",
            example: "ファイル名の例：cover.pdf",
            note: "表紙はKDPのカバークリエイターで作成するか、別途デザインしたPDFをアップロードします。「表紙のアップロードに成功しました」と表示されれば完了です。",
          },
        ],
      },
      {
        id: "c_ai_content",
        title: "AI生成コンテンツの申告",
        required: true,
        substeps: [
          {
            text: "「AI生成コンテンツ」の質問で「はい」を選択します（このアプリはAIを使用しています）。",
            highlight: "📍「はい」のラジオボタンを選択",
          },
          {
            text: "「テキスト」「画像」それぞれのドロップダウンで、AIの使用度合いを選択します。",
            example: "テキスト：一部のセクション（最小限の編集あり）\n画像：多くのAI生成画像（広範な編集あり）",
          },
          {
            text: "使用したAIツール名を入力します。",
            example: "ツール名の例：ChatGPT、Gemini、Midjourney など",
          },
        ],
      },
      {
        id: "c_preview",
        title: "プレビューで確認する",
        required: true,
        substeps: [
          {
            text: "「本のプレビュー」セクションの「プレビューアーを起動」ボタンをタップして、本の見た目を確認します。",
            highlight: "📍「プレビューアーを起動」（黄色ボタン）",
            note: "プレビューでページの並び・文字の見え方・画像の位置を確認しましょう。問題があればPDFを修正して再アップロードします。",
          },
          {
            text: "問題がなければ「保存して続行」をタップして価格設定へ進みます。",
            highlight: "📍 画面右下「保存して続行」（黄色ボタン）",
          },
        ],
      },
    ],
  },
  {
    id: "pricing",
    label: "価格設定",
    emoji: "💴",
    description: "販売価格とロイヤリティを設定して出版します。",
    steps: [
      {
        id: "p_territory",
        title: "出版地域を選択する",
        required: true,
        substeps: [
          {
            text: "「出版地域」で「すべての地域（全世界での権利）」を選択します。",
            highlight: "📍「すべての地域（全世界での権利）」のラジオボタン",
            note: "特定の国だけで販売したい場合は「特定の出版地域」を選択します。通常は「全世界」でOKです。",
          },
        ],
      },
      {
        id: "p_price",
        title: "希望小売価格を入力する",
        required: true,
        substeps: [
          {
            text: "「Amazon.co.jp（主なマーケットプレイス）」の「希望小売価格」欄に、販売したい価格を入力します。",
            highlight: "📍「Amazon.co.jp」行の「希望小売価格」入力欄",
            example: "入力例：1500（円）\n※最低価格：¥950、最高価格：¥30,000",
          },
          {
            text: "価格を入力すると、右側に「ロイヤリティ」（あなたが受け取る金額）が自動計算されて表示されます。",
            note: "ロイヤリティ = 希望小売価格 × 60% − 印刷コスト\n例：¥1,500 × 60% = ¥900 − 印刷コスト¥475 = ¥425（1冊あたりの収益）",
          },
          {
            text: "「この価格をすべてのマーケットプレイスの基準にする」リンクをタップすると、他の国の価格も自動換算されます。",
            highlight: "📍「この価格をすべてのマーケットプレイスの基準にする」リンク",
          },
        ],
      },
      {
        id: "p_publish",
        title: "「ペーパーバックを出版」ボタンをタップする",
        required: true,
        substeps: [
          {
            text: "ページ下部の利用規約を確認します。「『出版』をクリックすることによって、Kindleダイレクト・パブリッシング利用規約に同意し…」と書かれています。",
            highlight: "📍 画面下部「利用規約」セクション",
          },
          {
            text: "準備ができたら画面右下の「ペーパーバックを出版」ボタンをタップします。",
            highlight: "📍 画面右下「ペーパーバックを出版」（黄色ボタン）",
            note: "アカウント情報（銀行口座など）が未設定の場合はボタンがグレーになります。先にアカウント設定を完了させてください。",
          },
          {
            text: "出版申請が完了すると、本棚に「審査中」と表示されます。Amazonの審査には通常24〜72時間かかります。",
            note: "審査が完了するとメールで通知が届きます。審査通過後、Amazonで購入可能になります。",
          },
        ],
      },
    ],
  },
];

const STORAGE_KEY = "kdp_guide_checked_v2";

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function KdpGuideScreen() {
  const colors = useColors();
  const [activePhaseIdx, setActivePhaseIdx] = useState(0);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<ScrollView>(null);

  // Load saved state
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val) setChecked(JSON.parse(val));
    });
  }, []);

  const saveChecked = useCallback((next: Record<string, boolean>) => {
    setChecked(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const toggleCheck = useCallback((id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const resetAll = useCallback(() => {
    saveChecked({});
    setExpandedSteps({});
  }, [saveChecked]);

  // Progress calculation
  const allRequiredSteps = PHASES.flatMap((p) => p.steps.filter((s) => s.required));
  const checkedRequired = allRequiredSteps.filter((s) => checked[s.id]).length;
  const progressPct = allRequiredSteps.length > 0
    ? Math.round((checkedRequired / allRequiredSteps.length) * 100)
    : 0;

  const phase = PHASES[activePhaseIdx];
  const phaseRequired = phase.steps.filter((s) => s.required);
  const phaseChecked = phaseRequired.filter((s) => checked[s.id]).length;

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              📚 KDP出版ガイド
            </Text>
            <Text style={[styles.headerSub, { color: colors.muted }]}>
              Amazon KDPでペーパーバックを出版する手順
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.resetBtn, { borderColor: colors.border }]}
            onPress={resetAll}
          >
            <Text style={[styles.resetBtnText, { color: colors.muted }]}>リセット</Text>
          </TouchableOpacity>
        </View>

        {/* Overall progress bar */}
        <View style={styles.progressRow}>
          <View style={[styles.progressBarBg, { backgroundColor: colors.border, flex: 1 }]}>
            <View
              style={[
                styles.progressBarFill,
                { backgroundColor: colors.primary, width: `${progressPct}%` as any },
              ]}
            />
          </View>
          <Text style={[styles.progressPct, { color: colors.primary }]}>
            {progressPct}%
          </Text>
        </View>
        <Text style={[styles.progressLabel, { color: colors.muted }]}>
          必須ステップ {checkedRequired}/{allRequiredSteps.length} 完了
        </Text>
      </View>

      {/* ── Phase Tab Bar ── */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        {PHASES.map((p, idx) => {
          const isActive = idx === activePhaseIdx;
          const pReq = p.steps.filter((s) => s.required);
          const pDone = pReq.filter((s) => checked[s.id]).length;
          const allDone = pReq.length > 0 && pDone === pReq.length;
          return (
            <TouchableOpacity
              key={p.id}
              style={[
                styles.tabItem,
                isActive && { borderBottomColor: colors.primary },
              ]}
              onPress={() => {
                setActivePhaseIdx(idx);
                scrollRef.current?.scrollTo({ y: 0, animated: true });
              }}
            >
              <Text style={styles.tabEmoji}>{allDone ? "✅" : p.emoji}</Text>
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? colors.primary : colors.muted },
                ]}
              >
                {p.label}
              </Text>
              {pReq.length > 0 && (
                <Text style={[styles.tabSub, { color: isActive ? colors.primary : colors.muted }]}>
                  {pDone}/{pReq.length}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Content ── */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Phase description */}
        <View style={[styles.phaseDesc, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.phaseDescText, { color: colors.foreground }]}>
            {phase.emoji}  {phase.description}
          </Text>
          {phaseRequired.length > 0 && (
            <Text style={[styles.phaseDescSub, { color: colors.muted }]}>
              このパートの必須ステップ：{phaseChecked}/{phaseRequired.length} 完了
            </Text>
          )}
        </View>

        {/* KDP link button (shown on signin phase) */}
        {activePhaseIdx === 0 && (
          <TouchableOpacity
            style={[styles.kdpLinkBtn, { backgroundColor: colors.primary }]}
            onPress={() => Linking.openURL("https://kdp.amazon.co.jp")}
          >
            <Text style={styles.kdpLinkText}>🌐 Amazon KDPを開く</Text>
          </TouchableOpacity>
        )}

        {/* Steps */}
        {phase.steps.map((step, stepIdx) => {
          const isExpanded = expandedSteps[step.id] !== false; // default open
          const isChecked = !!checked[step.id];

          return (
            <View key={step.id} style={styles.stepBlock}>
              {/* Step header row */}
              <TouchableOpacity
                style={[
                  styles.stepHeader,
                  {
                    backgroundColor: isChecked
                      ? colors.primary + "18"
                      : colors.surface,
                    borderColor: isChecked ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => toggleExpand(step.id)}
                activeOpacity={0.75}
              >
                {/* Checkbox */}
                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    {
                      borderColor: isChecked ? colors.primary : colors.border,
                      backgroundColor: isChecked ? colors.primary : "transparent",
                    },
                  ]}
                  onPress={() => toggleCheck(step.id)}
                >
                  {isChecked && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>

                {/* Step number + title */}
                <View style={{ flex: 1 }}>
                  <View style={styles.stepTitleRow}>
                    <Text style={[styles.stepNum, { color: colors.muted }]}>
                      Step {stepIdx + 1}
                    </Text>
                    {!step.required && (
                      <View style={[styles.optionalBadge, { backgroundColor: colors.border }]}>
                        <Text style={[styles.optionalBadgeText, { color: colors.muted }]}>任意</Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepTitle,
                      {
                        color: isChecked ? colors.primary : colors.foreground,
                        textDecorationLine: isChecked ? "line-through" : "none",
                      },
                    ]}
                  >
                    {step.title}
                  </Text>
                </View>

                {/* Expand chevron */}
                <Text style={[styles.chevron, { color: colors.muted }]}>
                  {isExpanded ? "▲" : "▼"}
                </Text>
              </TouchableOpacity>

              {/* Substeps */}
              {isExpanded && (
                <View style={[styles.substepsContainer, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  {step.substeps.map((sub, subIdx) => (
                    <View key={subIdx} style={styles.substepItem}>
                      {/* Substep number + text */}
                      <View style={styles.substepRow}>
                        <View style={[styles.substepNumCircle, { backgroundColor: colors.primary }]}>
                          <Text style={styles.substepNum}>{subIdx + 1}</Text>
                        </View>
                        <Text style={[styles.substepText, { color: colors.foreground }]}>
                          {sub.text}
                        </Text>
                      </View>

                      {/* Highlight box (画面上の場所) */}
                      {sub.highlight && (
                        <View style={[styles.highlightBox, { backgroundColor: "#EFF6FF", borderColor: "#3B82F6" }]}>
                          <Text style={[styles.highlightText, { color: "#1D4ED8" }]}>
                            {sub.highlight}
                          </Text>
                        </View>
                      )}

                      {/* Example box */}
                      {sub.example && (
                        <View style={[styles.exampleBox, { backgroundColor: "#FFFBEB", borderColor: "#F59E0B" }]}>
                          <Text style={[styles.exampleLabel, { color: "#92400E" }]}>📝 入力例</Text>
                          <Text style={[styles.exampleText, { color: "#78350F" }]}>{sub.example}</Text>
                        </View>
                      )}

                      {/* Note box */}
                      {sub.note && (
                        <View style={[styles.noteBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                          <Text style={[styles.noteText, { color: colors.muted }]}>
                            💡 {sub.note}
                          </Text>
                        </View>
                      )}

                      {/* Divider between substeps */}
                      {subIdx < step.substeps.length - 1 && (
                        <View style={[styles.substepDivider, { backgroundColor: colors.border }]} />
                      )}
                    </View>
                  ))}

                  {/* Mark as done button */}
                  <TouchableOpacity
                    style={[
                      styles.doneBtn,
                      {
                        backgroundColor: isChecked ? colors.border : colors.primary,
                      },
                    ]}
                    onPress={() => toggleCheck(step.id)}
                  >
                    <Text style={[styles.doneBtnText, { color: isChecked ? colors.muted : "#fff" }]}>
                      {isChecked ? "✓ 完了済み（タップで取り消し）" : "✅ このステップを完了にする"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        {/* Phase navigation */}
        <View style={styles.navButtons}>
          {activePhaseIdx > 0 && (
            <TouchableOpacity
              style={[styles.navBtn, styles.navBtnBack, { borderColor: colors.border }]}
              onPress={() => {
                setActivePhaseIdx((i) => i - 1);
                scrollRef.current?.scrollTo({ y: 0, animated: true });
              }}
            >
              <Text style={[styles.navBtnText, { color: colors.foreground }]}>
                ← 前のステップ
              </Text>
            </TouchableOpacity>
          )}
          {activePhaseIdx < PHASES.length - 1 && (
            <TouchableOpacity
              style={[styles.navBtn, styles.navBtnNext, { backgroundColor: colors.primary }]}
              onPress={() => {
                setActivePhaseIdx((i) => i + 1);
                scrollRef.current?.scrollTo({ y: 0, animated: true });
              }}
            >
              <Text style={styles.navBtnNextText}>次のステップ →</Text>
            </TouchableOpacity>
          )}
          {activePhaseIdx === PHASES.length - 1 && progressPct === 100 && (
            <View style={[styles.completeBanner, { backgroundColor: "#D1FAE5", borderColor: "#10B981" }]}>
              <Text style={[styles.completeBannerText, { color: "#065F46" }]}>
                🎉 すべてのステップが完了しました！出版おめでとうございます！
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  resetBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    flexShrink: 0,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  progressPct: {
    fontSize: 14,
    fontWeight: "700",
    width: 38,
    textAlign: "right",
  },
  progressLabel: {
    fontSize: 11,
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
    fontSize: 15,
    marginBottom: 1,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  tabSub: {
    fontSize: 10,
    marginTop: 1,
  },
  scrollContent: {
    padding: 14,
  },
  phaseDesc: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  phaseDescText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  phaseDescSub: {
    fontSize: 12,
    marginTop: 4,
  },
  kdpLinkBtn: {
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginBottom: 14,
  },
  kdpLinkText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  stepBlock: {
    marginBottom: 10,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  checkmark: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18,
  },
  stepTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  stepNum: {
    fontSize: 11,
    fontWeight: "600",
  },
  optionalBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  optionalBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  chevron: {
    fontSize: 10,
    flexShrink: 0,
  },
  substepsContainer: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    overflow: "hidden",
    paddingTop: 4,
  },
  substepItem: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  substepRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    marginBottom: 8,
  },
  substepNumCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  substepNum: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  substepText: {
    fontSize: 14,
    lineHeight: 21,
    flex: 1,
  },
  highlightBox: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 8,
    marginLeft: 32,
  },
  highlightText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  exampleBox: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    marginLeft: 32,
  },
  exampleLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
  },
  exampleText: {
    fontSize: 13,
    lineHeight: 20,
  },
  noteBox: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 8,
    marginLeft: 32,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 18,
  },
  substepDivider: {
    height: 0.5,
    marginVertical: 4,
    marginLeft: 32,
  },
  doneBtn: {
    marginHorizontal: 14,
    marginVertical: 12,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  doneBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  navButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
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
  completeBanner: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  completeBannerText: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 22,
  },
});
