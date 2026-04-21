/**
 * Web fallback for DraggableList.
 * react-native-draggable-flatlist is native-only, so on web we use a standard
 * FlatList with no drag support (drag/isActive are no-ops).
 */
import React from "react";
import { FlatList } from "react-native";
import { DraggableListProps } from "./draggable-list";

export function DraggableList<T>({
  data,
  keyExtractor,
  renderItem,
  contentContainerStyle,
  ListHeaderComponent,
  ListEmptyComponent,
}: DraggableListProps<T>) {
  return (
    <FlatList
      data={data}
      keyExtractor={keyExtractor}
      numColumns={2}
      contentContainerStyle={contentContainerStyle}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      columnWrapperStyle={data.length > 0 ? { gap: 16 } : undefined}
      renderItem={({ item, index }) =>
        renderItem({ item, index, isActive: false, drag: () => {} })
      }
    />
  );
}
