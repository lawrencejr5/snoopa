export const isAdSupported = false;

interface ShowRewardedAdParams {
  onAdLoaded: () => void;
  onAdClosed: (earnedRewardAmount: number | null, claimError: string | null) => void;
  onRewardEarned: () => Promise<number | null>;
  onAdFailedToLoad: () => void;
}

export async function showRewardedAd({
  onAdFailedToLoad,
}: ShowRewardedAdParams) {
  // Reward ads are not supported on web target
  onAdFailedToLoad();
}
