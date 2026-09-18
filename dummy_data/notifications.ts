export interface NotificationItem {
  id: string;
  type: "system" | "alert" | "info";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export const notificationsData: NotificationItem[] = [
  {
    id: "1",
    type: "alert",
    title: "Scent Caught: Jude Bellingham",
    message: "New update on hamstring injury recovery timeline.",
    timestamp: "2m ago",
    read: false,
  },
  {
    id: "2",
    type: "system",
    title: "Payment Failed",
    message: "We could not process your subscription renewal.",
    timestamp: "1h ago",
    read: false,
  },
  {
    id: "3",
    type: "info",
    title: "Search Difficulty",
    message:
      'Having trouble finding definitive sources for "Nvidia leakage". Continuing search...',
    timestamp: "5h ago",
    read: true,
  },
  {
    id: "4",
    type: "system",
    title: "New Feature: Deep Dive",
    message: "Snoopa can now analyze 3x more sources. Check it out.",
    timestamp: "1d ago",
    read: true,
  },
];
