import React, { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import Colors from "@/constants/Colors";
import { useTheme } from "@/context/ThemeContext";
import TrendingTopicsContent from "./TrendingTopicsContent";

export interface TrendingTopicsSheetRef {
  present: () => void;
  dismiss: () => void;
}

interface Props {
  onTrackTopic: (topic: string, suggestedCondition?: string) => void;
}

const TrendingTopicsSheet = forwardRef<TrendingTopicsSheetRef, Props>(
  ({ onTrackTopic }, ref) => {
    const { theme } = useTheme();
    const bottomSheetRef = useRef<BottomSheetModal>(null);

    useImperativeHandle(ref, () => ({
      present: () => bottomSheetRef.current?.present(),
      dismiss: () => bottomSheetRef.current?.dismiss(),
    }));

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
        />
      ),
      [],
    );

    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={["88%"]}
        index={0}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: Colors[theme].background }}
        handleIndicatorStyle={{ backgroundColor: Colors[theme].text_secondary }}
      >
        <BottomSheetView style={{ flex: 1 }}>
          <TrendingTopicsContent
            onTrackTopic={(topic, condition) => {
              bottomSheetRef.current?.dismiss();
              onTrackTopic(topic, condition);
            }}
            onClose={() => bottomSheetRef.current?.dismiss()}
          />
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

TrendingTopicsSheet.displayName = "TrendingTopicsSheet";

export default TrendingTopicsSheet;
