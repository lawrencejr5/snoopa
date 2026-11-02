let lastFocusedTab: string | null = null;
let adWatchedPendingSnoop = false;
let shouldShowStopAdsModal = false;

export const DONT_SHOW_STOP_ADS_KEY = "dont_show_stop_ads_modal";

export function getLastFocusedTab() {
  return lastFocusedTab;
}

export function setLastFocusedTab(tabName: string | null) {
  lastFocusedTab = tabName;
}

export function markAdWatchedForWatchlist() {
  adWatchedPendingSnoop = true;
}

export function armStopAdsPromptOnSnoopExit() {
  if (adWatchedPendingSnoop) {
    adWatchedPendingSnoop = false;
    shouldShowStopAdsModal = true;
  }
}

export function consumeStopAdsPrompt(): boolean {
  if (shouldShowStopAdsModal) {
    shouldShowStopAdsModal = false;
    return true;
  }
  return false;
}
