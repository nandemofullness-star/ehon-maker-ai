/**
 * Native implementation: uses react-native-pager-view
 */
import React from "react";
import PagerView from "react-native-pager-view";

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
  initialPage = 0,
  onPageSelected,
  pageMargin = 0,
  children,
  pagerRef,
}: PagerViewWrapperProps) {
  return (
    <PagerView
      ref={pagerRef as React.Ref<PagerView>}
      style={style ?? { flex: 1 }}
      initialPage={initialPage}
      pageMargin={pageMargin}
      onPageSelected={(e) => onPageSelected?.(e.nativeEvent.position)}
    >
      {children}
    </PagerView>
  );
}
