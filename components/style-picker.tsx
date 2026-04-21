import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { DRAWING_STYLES, type DrawingStyle } from "@/constants/drawing-styles";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface StylePickerProps {
  selectedStyleId: string;
  onStyleChange: (styleId: string) => void;
  disabled?: boolean;
}

export function StylePicker({ selectedStyleId, onStyleChange, disabled }: StylePickerProps) {
  const colors = useColors();
  const [modalVisible, setModalVisible] = useState(false);

  const selectedStyle = DRAWING_STYLES.find((s) => s.id === selectedStyleId) ?? DRAWING_STYLES[0];

  return (
    <>
      {/* Compact trigger button */}
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        disabled={disabled}
        style={[
          styles.trigger,
          {
            backgroundColor: `${colors.primary}14`,
            borderColor: `${colors.primary}40`,
          },
          disabled && styles.disabled,
        ]}
        activeOpacity={0.75}
      >
        <Text style={styles.triggerEmoji}>{selectedStyle.emoji}</Text>
        <Text style={[styles.triggerLabel, { color: colors.primary }]}>
          {selectedStyle.label}
        </Text>
        <MaterialIcons name="expand-more" size={16} color={colors.primary} />
      </TouchableOpacity>

      {/* Style selection modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={[styles.closeButton, { backgroundColor: colors.surface }]}
            >
              <MaterialIcons name="close" size={20} color={colors.foreground} />
            </TouchableOpacity>
            <View style={styles.modalHeaderCenter}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>
                描画スタイルを選択
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.muted }]}>
                AIがこのスタイルで絵本風に変換します
              </Text>
            </View>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.styleList}
            showsVerticalScrollIndicator={false}
          >
            {DRAWING_STYLES.map((style) => {
              const isSelected = style.id === selectedStyleId;
              return (
                <TouchableOpacity
                  key={style.id}
                  onPress={() => {
                    onStyleChange(style.id);
                    setModalVisible(false);
                  }}
                  style={[
                    styles.styleCard,
                    {
                      backgroundColor: isSelected
                        ? `${colors.primary}12`
                        : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  activeOpacity={0.75}
                >
                  <View style={[styles.styleEmojiWrapper, {
                    backgroundColor: isSelected ? `${colors.primary}18` : `${colors.foreground}08`,
                  }]}>
                    <Text style={styles.styleEmoji}>{style.emoji}</Text>
                  </View>
                  <View style={styles.styleInfo}>
                    <Text style={[styles.styleLabel, { color: colors.foreground }]}>
                      {style.label}
                    </Text>
                    <Text style={[styles.styleDesc, { color: colors.muted }]}>
                      {style.description}
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={[styles.checkBadge, { backgroundColor: colors.primary }]}>
                      <MaterialIcons name="check" size={14} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  triggerEmoji: {
    fontSize: 14,
  },
  triggerLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.4,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
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
  modalHeaderCenter: {
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  styleList: {
    padding: 20,
    gap: 12,
  },
  styleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  styleEmojiWrapper: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  styleEmoji: {
    fontSize: 26,
  },
  styleInfo: {
    flex: 1,
    gap: 3,
  },
  styleLabel: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  styleDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  checkBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
