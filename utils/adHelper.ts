import { Platform } from "react-native";
import {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
} from "react-native-google-mobile-ads";

const AD_UNIT_ID = Platform.select({
  android: "ca-app-pub-7078901325871517/4361854748",
  ios: "ca-app-pub-7078901325871517/4067140038",
  default: "",
});

export const isAdSupported = Platform.OS !== "web";

interface ShowRewardedAdParams {
  onAdLoaded: () => void;
  onAdClosed: (earnedRewardAmount: number | null, claimError: string | null) => void;
  onRewardEarned: () => Promise<number | null>;
  onAdFailedToLoad: () => void;
}

export async function showRewardedAd({
  onAdLoaded,
  onAdClosed,
  onRewardEarned,
  onAdFailedToLoad,
}: ShowRewardedAdParams) {
  const rewarded = RewardedAd.createForAdRequest(AD_UNIT_ID, {
    requestNonPersonalizedAdsOnly: false,
  });

  let earnedRewardAmount: number | null = null;
  let claimError: string | null = null;
  let hasClosed = false;

  const unsubscribeLoaded = rewarded.addAdEventListener(
    RewardedAdEventType.LOADED,
    () => {
      onAdLoaded();
      rewarded.show();
    },
  );

  const unsubscribeEarned = rewarded.addAdEventListener(
    RewardedAdEventType.EARNED_REWARD,
    async () => {
      try {
        const reward = await onRewardEarned();
        earnedRewardAmount = reward;
      } catch (e: any) {
        const msg = e?.message ?? "";
        if (msg.includes("AD_DAILY_LIMIT_REACHED")) {
          claimError = "limit";
        } else {
          claimError = "failed";
        }
      }
    },
  );

  const unsubscribeClosed = rewarded.addAdEventListener(
    AdEventType.CLOSED,
    () => {
      if (hasClosed) return;
      hasClosed = true;
      cleanup();
      onAdClosed(earnedRewardAmount, claimError);
    },
  );

  const timeout = setTimeout(() => {
    if (hasClosed) return;
    hasClosed = true;
    cleanup();
    onAdFailedToLoad();
  }, 15000);

  const unsubscribeForTimeout = rewarded.addAdEventListener(
    RewardedAdEventType.LOADED,
    () => clearTimeout(timeout),
  );

  function cleanup() {
    clearTimeout(timeout);
    unsubscribeLoaded();
    unsubscribeEarned();
    unsubscribeClosed();
    unsubscribeForTimeout();
  }

  rewarded.load();
}
