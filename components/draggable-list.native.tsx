/**
 * Native implementation of DraggableList using react-native-draggable-flatlist.
 * Supports long-press drag-and-drop reordering.
 */
import React from "react";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
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

export function DraggableList<T>({
  data,
  keyExtractor,
  renderItem,
  onReorder,
  contentContainerStyle,
  ListHeaderComponent,
  ListEmptyComponent,
}: DraggableListProps<T>) {
  return (
    <DraggableFlatList
      data={data}
      keyExtractor={keyExtractor}
      onDragEnd={({ data: newData }) => onReorder(newData)}
      numColumns={2}
      contentContainerStyle={contentContainerStyle}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={ListEmptyComponent}
      renderItem={({ item, getIndex, isActive, drag }: RenderItemParams<T>) => (
        <ScaleDecorator activeScale={0.96}>
          {renderItem({ item, index: getIndex() ?? 0, isActive, drag })}
        </ScaleDecorator>
      )}
    />
  );
}
