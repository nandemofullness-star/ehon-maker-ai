import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { MaterialIcons } from "@expo/vector-icons";
import { useProjectStore, type SavedProject } from "@/hooks/use-project-store";
import { DRAWING_STYLES } from "@/constants/drawing-styles";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

const LOAD_PROJECT_KEY = "@kdp_load_project_request";

export default function ProjectsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { listProjects, deleteProject } = useProjectStore();
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    const list = await listProjects();
    setProjects(list);
    setIsLoading(false);
  }, [listProjects]);

  // Refresh list every time this tab comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchProjects();
    }, [fetchProjects])
  );

  const handleOpenProject = useCallback(
    async (project: SavedProject) => {
      // Signal the editor tab to load this project via AsyncStorage flag
      await AsyncStorage.setItem(LOAD_PROJECT_KEY, JSON.stringify(project));
      router.push("/(tabs)");
    },
    [router]
  );

  const handleDeleteProject = useCallback(
    (project: SavedProject) => {
      Alert.alert(
        "削除の確認",
        `「${project.title}」を削除しますか？この操作は元に戻せません。`,
        [
          { text: "キャンセル", style: "cancel" },
          {
            text: "削除",
            style: "destructive",
            onPress: async () => {
              await deleteProject(project.id);
              setProjects((prev) => prev.filter((p) => p.id !== project.id));
            },
          },
        ]
      );
    },
    [deleteProject]
  );

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  };

  const getStyleEmoji = (styleId: string) => {
    return DRAWING_STYLES.find((s) => s.id === styleId)?.emoji ?? "🎨";
  };

  const renderItem = useCallback(
    ({ item }: { item: SavedProject }) => (
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        {/* Thumbnail */}
        <TouchableOpacity
          onPress={() => handleOpenProject(item)}
          activeOpacity={0.85}
          style={styles.thumbnailWrapper}
        >
          {item.thumbnailUri ? (
            <Image
              source={{ uri: item.thumbnailUri }}
              style={styles.thumbnail}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.thumbnailPlaceholder, { backgroundColor: `${colors.primary}14` }]}>
              <MaterialIcons name="menu-book" size={36} color={colors.primary} />
            </View>
          )}
          {/* Style badge */}
          <View style={[styles.styleBadge, { backgroundColor: colors.background }]}>
            <Text style={styles.styleBadgeEmoji}>{getStyleEmoji(item.drawingStyleId)}</Text>
          </View>
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.cardBody}>
          <Text
            style={[styles.cardTitle, { color: colors.foreground }]}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <View style={styles.cardMeta}>
            <Text style={[styles.cardMetaText, { color: colors.muted }]}>
              {item.pages.length}ページ
            </Text>
            <Text style={[styles.cardMetaText, { color: colors.muted }]}>
              {formatDate(item.updatedAt)}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={[styles.cardActions, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => handleOpenProject(item)}
            style={[styles.openButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <MaterialIcons name="edit" size={14} color="#fff" />
            <Text style={styles.openButtonText}>開く</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteProject(item)}
            style={[styles.deleteButton, { borderColor: `${colors.error}40` }]}
            activeOpacity={0.8}
          >
            <MaterialIcons name="delete" size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    ),
    [colors, handleOpenProject, handleDeleteProject]
  );

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primary }]}>
            <MaterialIcons name="folder" size={22} color="#fff" />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              保存した絵本
            </Text>
            {!isLoading && (
              <Text style={[styles.headerCount, { color: colors.muted }]}>
                {projects.length}件のプロジェクト
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={fetchProjects}
          style={[styles.refreshButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          activeOpacity={0.75}
        >
          <MaterialIcons name="refresh" size={20} color={colors.muted} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>読み込み中...</Text>
        </View>
      ) : projects.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconWrapper, { backgroundColor: `${colors.primary}12` }]}>
            <MaterialIcons name="folder-open" size={56} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            保存済みの絵本はありません
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            絵本を作成して「保存」ボタンを押すと、ここに表示されます。
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)")}
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <MaterialIcons name="add" size={18} color="#fff" />
            <Text style={styles.createButtonText}>新しい絵本を作る</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  headerCount: {
    fontSize: 12,
    marginTop: 1,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 8,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  columnWrapper: {
    paddingHorizontal: 16,
    gap: 16,
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  thumbnailWrapper: {
    position: "relative",
  },
  thumbnail: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
  },
  thumbnailPlaceholder: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    alignItems: "center",
    justifyContent: "center",
  },
  styleBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  styleBadgeEmoji: {
    fontSize: 16,
  },
  cardBody: {
    padding: 10,
    gap: 4,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    letterSpacing: -0.2,
  },
  cardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardMetaText: {
    fontSize: 11,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    paddingTop: 8,
  },
  openButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 7,
    borderRadius: 10,
  },
  openButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
