/**
 * Web implementation: horizontal ScrollView fallback
 */
import React, { useImperativeHandle, useRef } from "react";
import { ScrollView, Dimensions } from "react-native";

const SCREEN_W = Dimensions.get("window").width;

export interface PagerViewWrapperProps {
  style?: object;
  initialPage?: number;
  onPageSelected?: (index: number) => void;
  pageMargin?: number;
  children?: React.ReactNode;
  pagerRef?: React.Ref<{ setPage: (page: number) => void }>;
}

export function PagerViewWrapper({
  style,
  onPageSelected,
  children,
  pagerRef,
}: PagerViewWrapperProps) {
  const scrollRef = useRef<ScrollView>(null);

  useImperativeHandle(pagerRef, () => ({
    setPage: (page: number) => {
      scrollRef.current?.scrollTo({ x: page * SCREEN_W, animated: true });
    },
  }));

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      style={style ?? { flex: 1 }}
      onScroll={(e) => {
        const offsetX = e.nativeEvent.contentOffset.x;
        const idx = Math.round(offsetX / SCREEN_W);
        onPageSelected?.(idx);
      }}
      scrollEventThrottle={16}
    >
      {children}
    </ScrollView>
  );
}
