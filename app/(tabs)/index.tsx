import React, { useState, useCallback, useRef, useEffect } from "react";
import { useFocusEffect } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  ScrollView,
  Platform,
} from "react-native";
import { DraggableList } from "@/components/draggable-list";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";
import { trpc } from "@/lib/trpc";
import { CompareModal } from "@/components/compare-modal";
import { BookPreviewModal } from "@/components/book-preview-modal";
import { StylePicker } from "@/components/style-picker";
import { DEFAULT_STYLE_ID } from "@/constants/drawing-styles";
import { useProjectStore, type SavedProject } from "@/hooks/use-project-store";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

type PageType = "cover" | "back-cover" | "inner";

interface PageItem {
  id: string;
  uri: string;
  originalUri: string | null; // stores the pre-AI photo URI for comparison
  text: string;
  isProcessing: boolean;
  isRemade: boolean;
  pageType: PageType; // cover | back-cover | inner
}

interface CompareState {
  pageId: string;
  originalUri: string;
  remadeUri: string;
  pageNumber: number;
}

/** Assign cover / back-cover / inner pageType based on position */
function assignPageTypes(pages: PageItem[]): PageItem[] {
  return pages.map((p, i) => ({
    ...p,
    pageType:
      i === 0 && pages.length >= 1
        ? "cover"
        : i === pages.length - 1 && pages.length >= 2
        ? "back-cover"
        : "inner",
  }));
}

export default function HomeScreen() {
  const colors = useColors();
  const [pages, setPages] = useState<PageItem[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const remakeImageMutation = trpc.book.remakeImage.useMutation();
  const generatePdfMutation = trpc.book.generatePdf.useMutation();
  const [compareState, setCompareState] = useState<CompareState | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedStyleId, setSelectedStyleId] = useState(DEFAULT_STYLE_ID);

  // Project persistence
  const { saveProject, generateId } = useProjectStore();
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectTitle, setCurrentProjectTitle] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Persist the current editor state to AsyncStorage */
  const persistProject = useCallback(
    async (projectId: string, title: string, pagesSnapshot: PageItem[], styleId: string) => {
      const project: SavedProject = {
        id: projectId,
        title: title || "無題の絵本",
        drawingStyleId: styleId,
        pages: pagesSnapshot.map((p) => ({
          id: p.id,
          uri: p.uri,
          originalUri: p.originalUri,
          text: p.text,
          isRemade: p.isRemade,
        })),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        thumbnailUri: pagesSnapshot[0]?.uri ?? null,
      };
      await saveProject(project);
    },
    [saveProject]
  );

  /** Debounced auto-save whenever pages or style changes */
  const scheduleAutoSave = useCallback(
    (pagesSnapshot: PageItem[], styleId: string) => {
      if (!currentProjectId) return;
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        persistProject(currentProjectId, currentProjectTitle, pagesSnapshot, styleId);
      }, 1500);
    },
    [currentProjectId, currentProjectTitle, persistProject]
  );

  /** Manually save with a name prompt */
  const handleSaveProject = useCallback(async () => {
    if (pages.length === 0) {
      Alert.alert("保存できません", "ページを追加してから保存してください。");
      return;
    }
    const projectId = currentProjectId ?? generateId();
    Alert.prompt(
      "プロジェクトを保存",
      "絵本のタイトルを入力してください",
      async (title) => {
        if (title === null) return; // cancelled
        const finalTitle = title.trim() || "無題の絵本";
        setIsSaving(true);
        try {
          await persistProject(projectId, finalTitle, pages, selectedStyleId);
          setCurrentProjectId(projectId);
          setCurrentProjectTitle(finalTitle);
          Alert.alert("保存完了", `「${finalTitle}」を保存しました。`);
        } catch {
          Alert.alert("エラー", "保存に失敗しました。");
        } finally {
          setIsSaving(false);
        }
      },
      "plain-text",
      currentProjectTitle
    );
  }, [pages, currentProjectId, currentProjectTitle, selectedStyleId, generateId, persistProject]);

  /** Load a project into the editor (called from projects tab via navigation params) */
  const loadProjectIntoEditor = useCallback((project: SavedProject) => {
    setPages(
      assignPageTypes(
        project.pages.map((p) => ({
          ...p,
          pageType: (p as any).pageType ?? "inner" as PageType,
          isProcessing: false,
        }))
      )
    );
    setSelectedStyleId(project.drawingStyleId);
    setCurrentProjectId(project.id);
    setCurrentProjectTitle(project.title);
  }, []);

  // Load project when navigating from the projects tab
  const LOAD_KEY = "@kdp_load_project_request";
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const raw = await AsyncStorage.getItem(LOAD_KEY);
        if (!raw) return;
        await AsyncStorage.removeItem(LOAD_KEY);
        try {
          const project = JSON.parse(raw) as import("@/hooks/use-project-store").SavedProject;
          loadProjectIntoEditor(project);
        } catch {
          // ignore parse errors
        }
      })();
    }, [loadProjectIntoEditor])
  );

  // Auto-save on page/style changes when a project is already saved
  useEffect(() => {
    if (pages.length > 0) scheduleAutoSave(pages, selectedStyleId);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [pages, selectedStyleId, scheduleAutoSave]);

  const pickImages = useCallback(async () => {
    if (isBatchProcessing || isGeneratingPdf) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const newPages: Omit<PageItem, "pageType">[] = result.assets.map((asset) => ({
        id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
        uri: asset.uri,
        originalUri: null,
        text: "",
        isProcessing: false,
        isRemade: false,
      }));
      setPages((prev) => {
        const combined = [...prev, ...newPages] as PageItem[];
        return assignPageTypes(combined);
      });
    }
  }, [isBatchProcessing, isGeneratingPdf]);

  const removePage = useCallback(
    (id: string) => {
      if (isBatchProcessing) return;
      setPages((prev) => assignPageTypes(prev.filter((p) => p.id !== id)));
    },
    [isBatchProcessing]
  );

  const movePage = useCallback(
    (index: number, direction: "up" | "down") => {
      if (isBatchProcessing) return;
      if (direction === "up" && index === 0) return;
      if (direction === "down" && index === pages.length - 1) return;
      setPages((prev) => {
        const newPages = [...prev];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        [newPages[index], newPages[targetIndex]] = [newPages[targetIndex], newPages[index]];
        return assignPageTypes(newPages);
      });
    },
    [isBatchProcessing, pages.length]
  );

  const handleTextChange = useCallback((id: string, text: string) => {
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, text } : p)));
  }, []);

  const remakeSinglePage = useCallback(
    async (page: PageItem, styleId?: string): Promise<string> => {
      // Read image as base64
      const base64 = await FileSystem.readAsStringAsync(page.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const result = await remakeImageMutation.mutateAsync({
        imageBase64: base64,
        mimeType: "image/jpeg",
        drawingStyle: styleId ?? selectedStyleId,
      });

      if (!result.imageUrl) throw new Error("画像URLが返されませんでした");

      // Download the generated image to local cache
      const localUri = FileSystem.cacheDirectory + `remade_${page.id}.jpg`;
      await FileSystem.downloadAsync(result.imageUrl, localUri);
      return localUri;
    },
    [remakeImageMutation, selectedStyleId]
  );

  const remakePageById = useCallback(
    async (pageId: string) => {
      if (isBatchProcessing || isGeneratingPdf) return;

      const page = pages.find((p) => p.id === pageId);
      if (!page) return;

      // Mark this page as processing
      setPages((prev) =>
        prev.map((p) => (p.id === pageId ? { ...p, isProcessing: true } : p))
      );

      try {
        const originalUri = page.uri; // save current URI before overwriting
        const newUri = await remakeSinglePage(page);
        setPages((prev) =>
          prev.map((p) =>
            p.id === pageId
              ? { ...p, uri: newUri, originalUri, isProcessing: false, isRemade: true }
              : p
          )
        );
        // Auto-open compare modal after individual remake
        const index = pages.findIndex((p) => p.id === pageId);
        setCompareState({
          pageId,
          originalUri,
          remadeUri: newUri,
          pageNumber: index + 1,
        });
      } catch (err: any) {
        console.error(`ページのリメイク失敗:`, err);
        Alert.alert("エラー", `AI変換に失敗しました: ${err.message}`);
        setPages((prev) =>
          prev.map((p) => (p.id === pageId ? { ...p, isProcessing: false } : p))
        );
      }
    },
    [pages, isBatchProcessing, isGeneratingPdf, remakeSinglePage]
  );

  const batchRemakeWithAI = useCallback(async () => {
    if (pages.length === 0) return;
    setIsBatchProcessing(true);
    setProgress({ current: 0, total: pages.length });

    const currentPages = [...pages];
    let hasError = false;

    for (let i = 0; i < currentPages.length; i++) {
      const page = currentPages[i];
      setProgress({ current: i + 1, total: currentPages.length });
      setPages((prev) =>
        prev.map((p) => (p.id === page.id ? { ...p, isProcessing: true } : p))
      );

      try {
        const originalUri = page.uri;
        const newUri = await remakeSinglePage(page);
        setPages((prev) =>
          prev.map((p) =>
            p.id === page.id
              ? { ...p, uri: newUri, originalUri, isProcessing: false, isRemade: true }
              : p
          )
        );
      } catch (err: any) {
        console.error(`ページ ${i + 1} のリメイク失敗:`, err);
        Alert.alert("エラー", `ページ ${i + 1} の変換に失敗しました: ${err.message}`);
        setPages((prev) =>
          prev.map((p) => (p.id === page.id ? { ...p, isProcessing: false } : p))
        );
        hasError = true;
        break;
      }

      // Rate limit avoidance
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    setIsBatchProcessing(false);
    setProgress({ current: 0, total: 0 });

    if (!hasError) {
      Alert.alert("完了", "すべてのページのAIリメイクが完了しました！");
    }
  }, [pages, remakeSinglePage]);

  const generatePDF = useCallback(async () => {
    if (pages.length === 0) return;
    setIsGeneratingPdf(true);
    setProgress({ current: 0, total: pages.length });

    try {
      // Encode all images to base64
      const imageDataList: { base64: string; text: string; pageType: PageType }[] = [];
      for (let i = 0; i < pages.length; i++) {
        setProgress({ current: i + 1, total: pages.length });
        const base64 = await FileSystem.readAsStringAsync(pages[i].uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        imageDataList.push({ base64, text: pages[i].text, pageType: pages[i].pageType });
      }

      // Generate PDF via server
      const result = await generatePdfMutation.mutateAsync({ pages: imageDataList });

      if (!result.pdfUrl) throw new Error("PDF URLが返されませんでした");

      // Download PDF
      const pdfPath = FileSystem.cacheDirectory + `kdp_picture_book_${Date.now()}.pdf`;
      await FileSystem.downloadAsync(result.pdfUrl, pdfPath);

      // Share PDF
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(pdfPath, {
          mimeType: "application/pdf",
          dialogTitle: "KDP絵本PDFを保存・共有",
        });
      } else {
        Alert.alert("完了", `PDFを保存しました: ${pdfPath}`);
      }
    } catch (err: any) {
      console.error("PDF生成エラー:", err);
      Alert.alert("エラー", `PDFの生成に失敗しました: ${err.message}`);
    } finally {
      setIsGeneratingPdf(false);
      setProgress({ current: 0, total: 0 });
    }
  }, [pages]);

  const renderPageCard = useCallback(
    ({ item, index, isActive, drag }: { item: PageItem; index: number; isActive: boolean; drag: () => void }) => (
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
          isActive && styles.cardDragging,
        ]}
      >
        {/* Image Preview */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.uri }}
            style={[styles.image, item.isProcessing && styles.imageProcessing]}
            contentFit="cover"
          />
          {/* Cover / Back-cover overlay */}
          {item.pageType === "cover" && !item.isProcessing && (
            <View style={styles.coverOverlay}>
              <Text style={styles.coverOverlayText} numberOfLines={3}>
                {item.text || "タイトルを入力"}
              </Text>
            </View>
          )}
          {item.pageType === "back-cover" && !item.isProcessing && (
            <View style={styles.backCoverOverlay}>
              <Text style={styles.backCoverOverlayText} numberOfLines={2}>
                {item.text || "著者名を入力"}
              </Text>
            </View>
          )}
          {/* Cover type badge */}
          {item.pageType !== "inner" && !item.isProcessing && (
            <View
              style={[
                styles.coverTypeBadge,
                {
                  backgroundColor:
                    item.pageType === "cover" ? "#4F46E5" : "#7C3AED",
                },
              ]}
            >
              <Text style={styles.coverTypeBadgeText}>
                {item.pageType === "cover" ? "表紙" : "裏表紙"}
              </Text>
            </View>
          )}
          {/* Page number badge (inner pages only) */}
          {item.pageType === "inner" && (
            <View style={[styles.pageBadge, { backgroundColor: colors.surface }]}>
              <Text style={[styles.pageBadgeText, { color: colors.foreground }]}>
                P.{index + 1}
              </Text>
            </View>
          )}
          {/* Remade badge */}
          {item.isRemade && !item.isProcessing && (
            <View style={[styles.remadeBadge, { backgroundColor: colors.success }]}>
              <MaterialIcons name="check" size={14} color="#fff" />
            </View>
          )}
          {/* Processing overlay */}
          {item.isProcessing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.processingText, { color: colors.primary }]}>
                AI変換中...
              </Text>
            </View>
          )}
        </View>

        {/* Text input */}
        <View style={styles.cardBody}>
          <TextInput
            value={item.text}
            onChangeText={(t) => handleTextChange(item.id, t)}
            placeholder={
              item.pageType === "cover"
                ? "絵本のタイトルを入力..."
                : item.pageType === "back-cover"
                ? "著者名・あとがきを入力..."
                : "テキストを入力..."
            }
            placeholderTextColor={colors.muted}
            style={[
              styles.textInput,
              {
                color: colors.foreground,
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
            multiline
            editable={!isBatchProcessing && !isGeneratingPdf}
          />

        {/* Individual AI remake button + Compare button row */}
          {!item.isProcessing && (
            <View style={styles.cardButtonRow}>
              <TouchableOpacity
                onPress={() => remakePageById(item.id)}
                disabled={isBatchProcessing || isGeneratingPdf}
                style={[
                  styles.singleAiButton,
                  { flex: 1, backgroundColor: item.isRemade ? `${colors.success}22` : `${colors.primary}18` },
                  (isBatchProcessing || isGeneratingPdf) && styles.disabledButton,
                ]}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={item.isRemade ? "refresh" : "auto-awesome"}
                  size={13}
                  color={item.isRemade ? colors.success : colors.primary}
                />
                <Text
                  style={[
                    styles.singleAiButtonText,
                    { color: item.isRemade ? colors.success : colors.primary },
                  ]}
                >
                  {item.isRemade ? "再変換" : "AI変換"}
                </Text>
              </TouchableOpacity>
              {/* Compare button: only shown when remade and originalUri exists */}
              {item.isRemade && item.originalUri && (
                <TouchableOpacity
                  onPress={() =>
                    setCompareState({
                      pageId: item.id,
                      originalUri: item.originalUri!,
                      remadeUri: item.uri,
                      pageNumber: index + 1,
                    })
                  }
                  style={[
                    styles.singleAiButton,
                    { backgroundColor: `${colors.primary}14` },
                  ]}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="compare" size={13} color={colors.primary} />
                  <Text style={[styles.singleAiButtonText, { color: colors.primary }]}>
                    比較
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.cardActions}>
            {/* Drag handle */}
            <TouchableOpacity
              onLongPress={drag}
              disabled={isBatchProcessing}
              style={[
                styles.iconButton,
                { backgroundColor: colors.background },
                isBatchProcessing && styles.disabledButton,
              ]}
              delayLongPress={150}
            >
              <MaterialIcons
                name="drag-handle"
                size={18}
                color={isBatchProcessing ? colors.muted : colors.muted}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => removePage(item.id)}
              disabled={isBatchProcessing}
              style={[
                styles.iconButton,
                { backgroundColor: colors.background },
                isBatchProcessing && styles.disabledButton,
              ]}
            >
              <MaterialIcons
                name="delete"
                size={18}
                color={isBatchProcessing ? colors.muted : colors.error}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    ),
    [colors, pages.length, isBatchProcessing, isGeneratingPdf, removePage, handleTextChange, remakePageById]
  );

  const isProcessing = isBatchProcessing || isGeneratingPdf;

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primary }]}>
            <MaterialIcons name="menu-book" size={22} color="#fff" />
          </View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            KDP絵本メーカー{" "}
            <Text style={{ color: colors.primary }}>AI</Text>
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.headerSubtitle, { color: colors.muted, borderColor: colors.border }]}>
            215.9 × 215.9 mm
          </Text>
          {pages.length > 0 && (
            <TouchableOpacity
              onPress={handleSaveProject}
              disabled={isProcessing || isSaving}
              style={[styles.saveButton, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}40` }, (isProcessing || isSaving) && styles.disabledButton]}
              activeOpacity={0.75}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <MaterialIcons name="save" size={18} color={colors.primary} />
              )}
              <Text style={[styles.saveButtonText, { color: colors.primary }]}>
                {currentProjectId ? "上書き保存" : "保存"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <DraggableList
        data={pages}
        keyExtractor={(item) => item.id}
        onReorder={(newData) => setPages(assignPageTypes(newData))}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* Upload Zone */}
            <TouchableOpacity
              onPress={pickImages}
              disabled={isProcessing}
              style={[
                styles.uploadZone,
                { borderColor: colors.primary, backgroundColor: colors.surface },
                isProcessing && styles.disabledButton,
              ]}
              activeOpacity={0.7}
            >
              <View style={[styles.uploadIconWrapper, { backgroundColor: `${colors.primary}18` }]}>
                <MaterialIcons name="upload" size={36} color={colors.primary} />
              </View>
              <Text style={[styles.uploadTitle, { color: colors.foreground }]}>
                写真をアップロード
              </Text>
              <Text style={[styles.uploadSubtitle, { color: colors.muted }]}>
                複数選択可能。AIで絵本風イラストに変換できます。
              </Text>
              <View style={[styles.uploadButton, { backgroundColor: colors.primary }]}>
                <Text style={styles.uploadButtonText}>ファイルを選択</Text>
              </View>
            </TouchableOpacity>

            {/* Control bar */}
            {pages.length > 0 && (
              <View
                style={[
                  styles.controlBar,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                {/* Top row: page count + style picker */}
                <View style={styles.controlBarTop}>
                  <View style={styles.controlBarLeft}>
                    <Text style={[styles.controlBarTitle, { color: colors.foreground }]}>
                      制作状況
                    </Text>
                    <View style={[styles.pageBadgePill, { backgroundColor: `${colors.primary}18` }]}>
                      <Text style={[styles.pageBadgePillText, { color: colors.primary }]}>
                        {pages.length} ページ
                      </Text>
                    </View>
                  </View>
                  <StylePicker
                    selectedStyleId={selectedStyleId}
                    onStyleChange={setSelectedStyleId}
                    disabled={isProcessing}
                  />
                </View>
                {/* Drag hint */}
                <View style={styles.dragHint}>
                  <MaterialIcons name="drag-handle" size={13} color={colors.muted} />
                  <Text style={[styles.dragHintText, { color: colors.muted }]}>
                    カードを長押しでドラッグ並び替え
                  </Text>
                </View>
                {/* Bottom row: action buttons */}
                <View style={styles.controlButtons}>
                  <TouchableOpacity
                    onPress={() => setIsPreviewOpen(true)}
                    disabled={isProcessing || pages.length === 0}
                    style={[
                      styles.previewButton,
                      { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}40` },
                      (isProcessing || pages.length === 0) && styles.disabledButton,
                    ]}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="menu-book" size={16} color={colors.primary} />
                    <Text style={[styles.previewButtonText, { color: colors.primary }]}>プレビュー</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={batchRemakeWithAI}
                    disabled={isProcessing}
                    style={[
                      styles.aiButton,
                      { backgroundColor: colors.primary },
                      isProcessing && styles.disabledButton,
                    ]}
                    activeOpacity={0.8}
                  >
                    {isBatchProcessing ? (
                      <>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={styles.aiButtonText}>
                          {progress.current}/{progress.total}
                        </Text>
                      </>
                    ) : (
                      <>
                        <MaterialIcons name="auto-awesome" size={16} color="#fff" />
                        <Text style={styles.aiButtonText}>AI一括変換</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={generatePDF}
                    disabled={isProcessing}
                    style={[
                      styles.pdfButton,
                      { backgroundColor: colors.foreground },
                      isProcessing && styles.disabledButton,
                    ]}
                    activeOpacity={0.8}
                  >
                    {isGeneratingPdf ? (
                      <>
                        <ActivityIndicator size="small" color={colors.background} />
                        <Text style={[styles.pdfButtonText, { color: colors.background }]}>
                          PDF作成中
                        </Text>
                      </>
                    ) : (
                      <>
                        <MaterialIcons name="description" size={16} color={colors.background} />
                        <Text style={[styles.pdfButtonText, { color: colors.background }]}>
                          PDF出力
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Warning banner */}
            {pages.length > 0 && pages.length < 24 && (
              <View style={[styles.warningBanner, { backgroundColor: "#FEF3C7", borderColor: "#F59E0B" }]}>
                <MaterialIcons name="warning" size={20} color="#D97706" />
                <View style={styles.warningText}>
                  <Text style={styles.warningTitle}>ページ数アラート</Text>
                  <Text style={styles.warningBody}>
                    KDPペーパーバックには最低24ページが必要です。現在{pages.length}ページです。
                  </Text>
                </View>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrapper, { backgroundColor: `${colors.primary}14` }]}>
              <MaterialIcons name="menu-book" size={56} color={`${colors.primary}40`} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              絵本制作を始めましょう
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              写真をアップロードすると、AIが自動で{"\n"}世界観の統一された絵本へと導きます。
            </Text>
          </View>
        }
        renderItem={renderPageCard}
      />

      {/* Compare Modal */}
      {compareState && (
        <CompareModal
          visible={!!compareState}
          onClose={() => setCompareState(null)}
          originalUri={compareState.originalUri}
          remadeUri={compareState.remadeUri}
          pageNumber={compareState.pageNumber}
          onAccept={() => {
            // Keep the AI-remade image (already set), just close
            setCompareState(null);
          }}
          onReject={() => {
            // Revert to original URI
            setPages((prev) =>
              prev.map((p) =>
                p.id === compareState.pageId
                  ? { ...p, uri: compareState.originalUri, isRemade: false, originalUri: null }
                  : p
              )
            );
            setCompareState(null);
          }}
        />
      )}

      {/* Book Preview Modal */}
      <BookPreviewModal
        visible={isPreviewOpen}
        pages={pages}
        bookTitle={currentProjectTitle || undefined}
        onClose={() => setIsPreviewOpen(false)}
        onGeneratePdf={generatePDF}
      />
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
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    textTransform: "uppercase",
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 16,
  },
  columnWrapper: {
    gap: 16,
  },
  uploadZone: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 24,
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginBottom: 0,
  },
  uploadIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  uploadTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
  },
  uploadSubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  uploadButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 20,
  },
  uploadButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  controlBar: {
    flexDirection: "column",
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    marginTop: 16,
  },
  controlBarTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  controlBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  controlBarTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  pageBadgePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  pageBadgePillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  controlButtons: {
    flexDirection: "row",
    gap: 8,
  },
  aiButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  aiButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  pdfButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  pdfButtonText: {
    fontWeight: "700",
    fontSize: 13,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
  },
  warningText: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#92400E",
    marginBottom: 2,
  },
  warningBody: {
    fontSize: 12,
    color: "#78350F",
    lineHeight: 18,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  imageContainer: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageProcessing: {
    opacity: 0.3,
  },
  pageBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  pageBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  remadeBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(79, 70, 229, 0.08)",
  },
  processingText: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 8,
    letterSpacing: 0.5,
  },
  cardBody: {
    padding: 10,
    gap: 8,
  },
  textInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    lineHeight: 18,
    minHeight: 60,
    textAlignVertical: "top",
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  moveButtons: {
    flexDirection: "row",
    gap: 4,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.4,
  },
  cardButtonRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 4,
  },
  singleAiButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  singleAiButtonText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  saveButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },
  coverOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "60%",
    backgroundColor: "rgba(26,26,46,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  coverOverlayText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 17,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  backCoverOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "40%",
    backgroundColor: "rgba(15,15,26,0.5)",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  backCoverOverlayText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 15,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  coverTypeBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  coverTypeBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  previewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  previewButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  cardDragging: {
    opacity: 0.85,
    shadowColor: "#4F46E5",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    borderColor: "#4F46E5",
    borderWidth: 1.5,
  },
  dragHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 2,
  },
  dragHintText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
