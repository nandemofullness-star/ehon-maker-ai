import React, { useState, useCallback, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  PanResponder,
  Animated,
  ScrollView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const IMAGE_SIZE = SCREEN_WIDTH - 48;

interface CompareModalProps {
  visible: boolean;
  onClose: () => void;
  originalUri: string;
  remadeUri: string;
  pageNumber: number;
  onAccept: () => void;
  onReject: () => void;
}

export function CompareModal({
  visible,
  onClose,
  originalUri,
  remadeUri,
  pageNumber,
  onAccept,
  onReject,
}: CompareModalProps) {
  const colors = useColors();
  // Slider position: 0 = full original, 1 = full remade
  const [sliderX, setSliderX] = useState(IMAGE_SIZE / 2);
  const sliderXRef = useRef(IMAGE_SIZE / 2);
  const [activeTab, setActiveTab] = useState<"slider" | "side">("slider");

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const newX = Math.max(0, Math.min(IMAGE_SIZE, sliderXRef.current + gestureState.dx));
        setSliderX(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        const newX = Math.max(0, Math.min(IMAGE_SIZE, sliderXRef.current + gestureState.dx));
        sliderXRef.current = newX;
        setSliderX(newX);
      },
    })
  ).current;

  const handleAccept = useCallback(() => {
    onAccept();
    onClose();
  }, [onAccept, onClose]);

  const handleReject = useCallback(() => {
    onReject();
    onClose();
  }, [onReject, onClose]);

  const sliderPercent = Math.round((sliderX / IMAGE_SIZE) * 100);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeButton, { backgroundColor: colors.surface }]}
          >
            <MaterialIcons name="close" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
              変換前後の比較
            </Text>
            <Text style={[styles.headerSub, { color: colors.muted }]}>
              P.{pageNumber}
            </Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Tab switcher */}
          <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setActiveTab("slider")}
              style={[
                styles.tabButton,
                activeTab === "slider" && { backgroundColor: colors.primary },
              ]}
            >
              <MaterialIcons
                name="compare"
                size={16}
                color={activeTab === "slider" ? "#fff" : colors.muted}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === "slider" ? "#fff" : colors.muted },
                ]}
              >
                スライダー比較
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab("side")}
              style={[
                styles.tabButton,
                activeTab === "side" && { backgroundColor: colors.primary },
              ]}
            >
              <MaterialIcons
                name="view-column"
                size={16}
                color={activeTab === "side" ? "#fff" : colors.muted}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === "side" ? "#fff" : colors.muted },
                ]}
              >
                並べて表示
              </Text>
            </TouchableOpacity>
          </View>

          {/* Slider view */}
          {activeTab === "slider" && (
            <View style={styles.sliderSection}>
              <View
                style={[
                  styles.sliderImageContainer,
                  { borderColor: colors.border },
                ]}
              >
                {/* Remade image (full width, behind) */}
                <Image
                  source={{ uri: remadeUri }}
                  style={styles.sliderImage}
                  contentFit="cover"
                />

                {/* Original image (clipped to left portion) */}
                <View
                  style={[
                    styles.originalClip,
                    { width: sliderX },
                  ]}
                >
                  <Image
                    source={{ uri: originalUri }}
                    style={[styles.sliderImage, { width: IMAGE_SIZE }]}
                    contentFit="cover"
                  />
                </View>

                {/* Divider line */}
                <View
                  style={[
                    styles.dividerLine,
                    { left: sliderX - 1, backgroundColor: "#fff" },
                  ]}
                />

                {/* Drag handle */}
                <View
                  style={[styles.dragHandle, { left: sliderX - 20 }]}
                  {...panResponder.panHandlers}
                >
                  <View style={[styles.dragHandleInner, { backgroundColor: "#fff" }]}>
                    <MaterialIcons name="chevron-left" size={14} color={colors.primary} />
                    <MaterialIcons name="chevron-right" size={14} color={colors.primary} />
                  </View>
                </View>

                {/* Labels */}
                <View style={[styles.labelLeft, { backgroundColor: "rgba(0,0,0,0.55)" }]}>
                  <Text style={styles.labelText}>元の写真</Text>
                </View>
                <View style={[styles.labelRight, { backgroundColor: "rgba(79,70,229,0.75)" }]}>
                  <Text style={styles.labelText}>AI変換後</Text>
                </View>
              </View>

              {/* Slider percentage hint */}
              <Text style={[styles.sliderHint, { color: colors.muted }]}>
                ← ドラッグして比較 ({sliderPercent}% 元写真)
              </Text>
            </View>
          )}

          {/* Side-by-side view */}
          {activeTab === "side" && (
            <View style={styles.sideSection}>
              <View style={styles.sideRow}>
                <View style={styles.sideItem}>
                  <View style={[styles.sideLabel, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
                    <MaterialIcons name="photo" size={13} color="#fff" />
                    <Text style={styles.sideLabelText}>元の写真</Text>
                  </View>
                  <Image
                    source={{ uri: originalUri }}
                    style={[styles.sideImage, { borderColor: colors.border }]}
                    contentFit="cover"
                  />
                </View>
                <View style={styles.sideItem}>
                  <View style={[styles.sideLabel, { backgroundColor: "rgba(79,70,229,0.8)" }]}>
                    <MaterialIcons name="auto-awesome" size={13} color="#fff" />
                    <Text style={styles.sideLabelText}>AI変換後</Text>
                  </View>
                  <Image
                    source={{ uri: remadeUri }}
                    style={[styles.sideImage, { borderColor: colors.primary }]}
                    contentFit="cover"
                  />
                </View>
              </View>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={handleReject}
              style={[
                styles.rejectButton,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              activeOpacity={0.8}
            >
              <MaterialIcons name="undo" size={18} color={colors.foreground} />
              <Text style={[styles.rejectText, { color: colors.foreground }]}>
                元の写真に戻す
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAccept}
              style={[styles.acceptButton, { backgroundColor: colors.primary }]}
              activeOpacity={0.8}
            >
              <MaterialIcons name="check" size={18} color="#fff" />
              <Text style={styles.acceptText}>AI変換を採用</Text>
            </TouchableOpacity>
          </View>

          {/* Info note */}
          <Text style={[styles.infoNote, { color: colors.muted }]}>
            「元の写真に戻す」を選ぶと、このページのAI変換が取り消されます。
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
    gap: 20,
  },
  tabBar: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "700",
  },
  sliderSection: {
    gap: 10,
    alignItems: "center",
  },
  sliderImageContainer: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    position: "relative",
  },
  sliderImage: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    position: "absolute",
    top: 0,
    left: 0,
  },
  originalClip: {
    position: "absolute",
    top: 0,
    left: 0,
    height: IMAGE_SIZE,
    overflow: "hidden",
  },
  dividerLine: {
    position: "absolute",
    top: 0,
    width: 2,
    height: IMAGE_SIZE,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  dragHandle: {
    position: "absolute",
    top: IMAGE_SIZE / 2 - 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  dragHandleInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  labelLeft: {
    position: "absolute",
    bottom: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  labelRight: {
    position: "absolute",
    bottom: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  labelText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  sliderHint: {
    fontSize: 12,
    textAlign: "center",
  },
  sideSection: {
    gap: 12,
  },
  sideRow: {
    flexDirection: "row",
    gap: 12,
  },
  sideItem: {
    flex: 1,
    gap: 6,
  },
  sideLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  sideLabelText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  sideImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 2,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  rejectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  rejectText: {
    fontSize: 14,
    fontWeight: "700",
  },
  acceptButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  acceptText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  infoNote: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    marginTop: -8,
  },
});
