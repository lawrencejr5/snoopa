export type SnoopStatus = "active" | "completed";

export interface SnoopItem {
  id: string;
  title: string;
  description: string;
  status: SnoopStatus;
  lastChecked: string; // ISO string 2024-02-04T10:00:00
  image: any; // require path
  source: string;
}

export const watchlistData: SnoopItem[] = [
  {
    id: "1",
    title: "Jude Bellingham Recovery",
    description:
      "Tracking hamsterstring injury updates and training return date.",
    status: "active",
    lastChecked: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    image: require("@/assets/images/splash-icon.png"), // Placeholder
    source: "Marca / Real Madrid",
  },
  {
    id: "2",
    title: "Mbappe Transfer News",
    description: "Monitoring official statements regarding summer move.",
    status: "active",
    lastChecked: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    image: require("@/assets/images/splash-icon.png"),
    source: "Fabrizio Romano",
  },
  {
    id: "3",
    title: "Alaba ACL Progress",
    description: "Rehab updates and potential return this season.",
    status: "active",
    lastChecked: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
    image: require("@/assets/images/splash-icon.png"),
    source: "The Athletic",
  },
  {
    id: "4",
    title: "Vinicius Jr Contract",
    description: "Contract renewal confirmation details.",
    status: "completed",
    lastChecked: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    image: require("@/assets/images/splash-icon.png"),
    source: "Real Madrid Official",
  },
  {
    id: "5",
    title: "Endrick Arrival Date",
    description: "Confirmation of presentation date at Bernabeu.",
    status: "completed",
    lastChecked: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
    image: require("@/assets/images/splash-icon.png"),
    source: "Globo Esporte",
  },
];
