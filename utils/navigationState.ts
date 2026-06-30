let lastFocusedTab: string | null = null;

export function getLastFocusedTab() {
  return lastFocusedTab;
}

export function setLastFocusedTab(tabName: string | null) {
  lastFocusedTab = tabName;
}
