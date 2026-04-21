import React, { useRef, useCallback, useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Dimensions,
  StyleSheet,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// PagerView is native-only. On web we render a horizontal ScrollView fallback.
type PagerViewHandle = { setPage: (page: number) => void };

// Lazy-load so Metro never bundles the native module on web
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getNativePagerView = (): React.ComponentType<any> | null => {
  if (Platform.OS === "web") return null;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require("react-native-pager-view").default;
};

type PageType = "cover" | "back-cover" | "inner";
type ViewMode = "scroll" | "swipe";

interface PreviewPage {
  id: string;
  uri: string;
  text: string;
  pageType: PageType;
}

interface BookPreviewModalProps {
  visible: boolean;
  pages: PreviewPage[];
  bookTitle?: string;
  onClose: () => void;
}

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_PADDING = 20;
const CARD_SIZE = SCREEN_W - CARD_PADDING * 2;
// In swipe mode the card fills more of the screen
const SWIPE_CARD_SIZE = SCREEN_W - 32;

// ─── Shared page card renderer ────────────────────────────────────────────────
function PageCard({
  item,
  index,
  size,
}: {
  item: PreviewPage;
  index: number;
  size: number;
}) {
  const isCover = item.pageType === "cover";
  const isBackCover = item.pageType === "back-cover";

  return (
    <View style={[styles.pageCard, { width: size, height: size }]}>
      <Image
        source={{ uri: item.uri }}
        style={{ width: size, height: size }}
        contentFit="cover"
        transition={200}
      />

      {/* COVER */}
      {isCover && (
        <>
          <View style={styles.coverGradient} />
          {item.text ? (
            <View style={styles.coverTitleContainer}>
              <Text style={styles.coverTitle} numberOfLines={4}>
                {item.text}
              </Text>
            </View>
          ) : null}
          <View style={[styles.coverBadge, { backgroundColor: "#4F46E5" }]}>
            <Text style={styles.coverBadgeText}>表紙</Text>
          </View>
        </>
      )}

      {/* BACK COVER */}
      {isBackCover && (
        <>
          <View style={styles.backCoverGradient} />
          {item.text ? (
            <View style={styles.backCoverAuthorContainer}>
              <Text style={styles.backCoverAuthor} numberOfLines={3}>
                {item.text}
              </Text>
            </View>
          ) : null}
          <View style={[styles.coverBadge, { backgroundColor: "#7C3AED" }]}>
            <Text style={styles.coverBadgeText}>裏表紙</Text>
          </View>
        </>
      )}

      {/* INNER */}
      {!isCover && !isBackCover && item.text ? (
        <View style={styles.innerTextContainer}>
          <Text style={styles.innerText} numberOfLines={4}>
            {item.text}
          </Text>
        </View>
      ) : null}

      {/* Page number badge (inner only) */}
      {!isCover && !isBackCover && (
        <View style={styles.pageNumberBadge}>
          <Text style={styles.pageNumberText}>P.{index + 1}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export function BookPreviewModal({
  visible,
  pages,
  bookTitle,
  onClose,
}: BookPreviewModalProps) {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pagerRef = useRef<any>(null);
  const NativePagerView = Platform.OS !== "web" ? getNativePagerView() : null;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("swipe");

  // ── scroll mode: track current page from offset ──
  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e.nativeEvent.contentOffset.y;
      const itemHeight = CARD_SIZE + 24;
      const idx = Math.round(offsetY / itemHeight);
      setCurrentIndex(Math.max(0, Math.min(idx, pages.length - 1)));
    },
    [pages.length]
  );

  // ── swipe mode: navigate with arrow buttons ──
  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      const next = currentIndex - 1;
      pagerRef.current?.setPage(next);
      setCurrentIndex(next);
    }
  }, [currentIndex]);

  const goToNext = useCallback(() => {
    if (currentIndex < pages.length - 1) {
      const next = currentIndex + 1;
      pagerRef.current?.setPage(next);
      setCurrentIndex(next);
    }
  }, [currentIndex, pages.length]);

  // ── switch view mode: reset index ──
  const switchMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setCurrentIndex(0);
  }, []);

  // ── FlatList render item (scroll mode) ──
  const renderScrollItem = useCallback(
    ({ item, index }: { item: PreviewPage; index: number }) => (
      <View style={styles.scrollPageWrapper}>
        <PageCard item={item} index={index} size={CARD_SIZE} />
      </View>
    ),
    []
  );

  const keyExtractor = useCallback((item: PreviewPage) => item.id, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0a0a14" />
      <View style={[styles.container, { paddingTop: insets.top }]}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MaterialIcons name="menu-book" size={20} color="#a5b4fc" />
            <Text style={styles.headerTitle} numberOfLines={1}>
              {bookTitle || "絵本プレビュー"}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {/* Mode toggle */}
            <View style={styles.modeToggle}>
              <TouchableOpacity
                onPress={() => switchMode("swipe")}
                style={[
                  styles.modeBtn,
                  viewMode === "swipe" && styles.modeBtnActive,
                ]}
                activeOpacity={0.75}
              >
                <MaterialIcons
                  name="import-contacts"
                  size={15}
                  color={viewMode === "swipe" ? "#fff" : "#94a3b8"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => switchMode("scroll")}
                style={[
                  styles.modeBtn,
                  viewMode === "scroll" && styles.modeBtnActive,
                ]}
                activeOpacity={0.75}
              >
                <MaterialIcons
                  name="view-agenda"
                  size={15}
                  color={viewMode === "scroll" ? "#fff" : "#94a3b8"}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.pageCounter}>
              {pages.length > 0
                ? `${currentIndex + 1} / ${pages.length}`
                : "0 / 0"}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              activeOpacity={0.75}
            >
              <MaterialIcons name="close" size={22} color="#e2e8f0" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Empty state ── */}
        {pages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="photo-library" size={60} color="#4a5568" />
            <Text style={styles.emptyText}>ページがありません</Text>
          </View>
        ) : viewMode === "swipe" ? (
          /* ── SWIPE MODE ── */
          <View style={styles.swipeContainer}>
            {NativePagerView ? (
              <NativePagerView
                ref={pagerRef}
                style={styles.pagerView}
                initialPage={0}
                onPageSelected={(e: { nativeEvent: { position: number } }) =>
                  setCurrentIndex(e.nativeEvent.position)
                }
                pageMargin={16}
              >
                {pages.map((page, index) => (
                  <View key={page.id} style={styles.swipePageOuter}>
                    <PageCard item={page} index={index} size={SWIPE_CARD_SIZE} />
                  </View>
                ))}
              </NativePagerView>
            ) : (
              /* Web fallback: horizontal ScrollView with snap */
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.pagerView}
                onScroll={(e) => {
                  const offsetX = e.nativeEvent.contentOffset.x;
                  const idx = Math.round(offsetX / SCREEN_W);
                  setCurrentIndex(Math.max(0, Math.min(idx, pages.length - 1)));
                }}
                scrollEventThrottle={16}
              >
                {pages.map((page, index) => (
                  <View key={page.id} style={[styles.swipePageOuter, { width: SCREEN_W }]}>
                    <PageCard item={page} index={index} size={SWIPE_CARD_SIZE} />
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Left / Right arrow buttons */}
            <TouchableOpacity
              onPress={goToPrev}
              disabled={currentIndex === 0}
              style={[
                styles.arrowButton,
                styles.arrowLeft,
                currentIndex === 0 && styles.arrowDisabled,
              ]}
              activeOpacity={0.75}
            >
              <MaterialIcons name="chevron-left" size={28} color="#e2e8f0" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={goToNext}
              disabled={currentIndex === pages.length - 1}
              style={[
                styles.arrowButton,
                styles.arrowRight,
                currentIndex === pages.length - 1 && styles.arrowDisabled,
              ]}
              activeOpacity={0.75}
            >
              <MaterialIcons name="chevron-right" size={28} color="#e2e8f0" />
            </TouchableOpacity>
          </View>
        ) : (
          /* ── SCROLL MODE ── */
          <FlatList
            ref={flatListRef}
            data={pages}
            keyExtractor={keyExtractor}
            renderItem={renderScrollItem}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + 24 },
            ]}
            snapToInterval={CARD_SIZE + 24}
            decelerationRate="fast"
          />
        )}

        {/* ── Progress dots (both modes, ≤24 pages) ── */}
        {pages.length > 1 && pages.length <= 24 && (
          <View
            style={[
              styles.dotsContainer,
              { paddingBottom: insets.bottom + 8 },
            ]}
          >
            {pages.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === currentIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a14",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  headerTitle: {
    color: "#e2e8f0",
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    overflow: "hidden",
  },
  modeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  modeBtnActive: {
    backgroundColor: "#4F46E5",
  },
  pageCounter: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  emptyText: {
    color: "#4a5568",
    fontSize: 16,
  },
  // ── Swipe mode ──
  swipeContainer: {
    flex: 1,
    justifyContent: "center",
  },
  pagerView: {
    flex: 1,
  },
  swipePageOuter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowButton: {
    position: "absolute",
    top: "50%",
    marginTop: -24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  arrowLeft: {
    left: 8,
  },
  arrowRight: {
    right: 8,
  },
  arrowDisabled: {
    opacity: 0.25,
  },
  // ── Scroll mode ──
  listContent: {
    paddingTop: 20,
    paddingHorizontal: CARD_PADDING,
    gap: 24,
  },
  scrollPageWrapper: {
    alignItems: "center",
  },
  // ── Page card ──
  pageCard: {
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#1a1a2e",
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  // Cover
  coverGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "65%",
    backgroundColor: "rgba(10,10,30,0.55)",
  },
  coverTitleContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "65%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  coverTitle: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 36,
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
    letterSpacing: -0.5,
  },
  coverBadge: {
    position: "absolute",
    bottom: 14,
    right: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  coverBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  // Back cover
  backCoverGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "55%",
    backgroundColor: "rgba(5,5,20,0.6)",
  },
  backCoverAuthorContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "55%",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  backCoverAuthor: {
    color: "#e2e8f0",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 26,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  // Inner page
  innerTextContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.52)",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  innerText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 22,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  pageNumberBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pageNumberText: {
    color: "#e2e8f0",
    fontSize: 11,
    fontWeight: "700",
  },
  // Progress dots
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: "#818cf8",
    width: 18,
  },
  dotInactive: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
});
