import type { NativeScrollEvent } from "react-native";

export const isNearScrollBottom = (event: NativeScrollEvent, padding = 160) => {
  const { layoutMeasurement, contentOffset, contentSize } = event;
  return layoutMeasurement.height + contentOffset.y >= contentSize.height - padding;
};
