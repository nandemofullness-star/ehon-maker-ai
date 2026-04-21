/**
 * Shared type bridge for DraggableList.
 * Metro picks the platform-specific file at bundle time:
 *   - draggable-list.native.tsx  → Android / iOS (react-native-draggable-flatlist)
 *   - draggable-list.web.tsx     → Web (standard FlatList fallback)
 */
import React from "react";
import { StyleProp, ViewStyle } from "react-native";

export interface DraggableListProps<T> {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (params: {
    item: T;
    index: number;
    isActive: boolean;
    drag: () => void;
  }) => React.ReactElement | null;
  onReorder: (data: T[]) => void;
  numColumns?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
  ListHeaderComponent?: React.ReactElement | null;
  ListEmptyComponent?: React.ReactElement | null;
}

// Re-export from web implementation as the TS-resolvable default.
// The actual runtime implementation is chosen by Metro's platform resolution.
export { DraggableList } from "./draggable-list.web";
