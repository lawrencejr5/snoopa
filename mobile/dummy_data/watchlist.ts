export type SnoopStatus = "active" | "completed";

export interface LogItem {
  id: string;
  time: string;
  action: string;
  verified: boolean;
  outcome?: "true" | "false" | "pending";
}

export interface SnoopItem {
  id: string;
  title: string;
  description: string;
  status: SnoopStatus;
  lastChecked: string; // ISO string 2024-02-04T10:00:00
  source: string;
  logs?: LogItem[];
}

export const watchlistData: SnoopItem[] = [
  {
    id: "1",
    title: "Jude Bellingham Recovery",
    description:
      "Tracking hamsterstring injury updates and training return date.",
    status: "active",
    lastChecked: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    source: "Marca / Real Madrid",
    logs: [
      {
        id: "101",
        time: "10:15",
        action: "Found rumour on Twitter about early return",
        verified: false,
        outcome: "pending",
      },
      {
        id: "102",
        time: "10:18",
        action: "Cross-referenced with Marca daily report",
        verified: true,
        outcome: "false",
      },
      {
        id: "103",
        time: "10:25",
        action: "Checked Ancelotti press conference transcript",
        verified: true,
        outcome: "pending",
      },
    ],
  },
  {
    id: "2",
    title: "Mbappe Transfer News",
    description: "Monitoring official statements regarding summer move.",
    status: "active",
    lastChecked: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    source: "Fabrizio Romano",
  },
  {
    id: "3",
    title: "Alaba ACL Progress",
    description: "Rehab updates and potential return this season.",
    status: "active",
    lastChecked: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
    source: "The Athletic",
  },
  {
    id: "4",
    title: "Vinicius Jr Contract",
    description: "Contract renewal confirmation details.",
    status: "completed",
    lastChecked: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    source: "Real Madrid Official",
  },
  {
    id: "5",
    title: "Endrick Arrival Date",
    description: "Confirmation of presentation date at Bernabeu.",
    status: "completed",
    lastChecked: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
    source: "Globo Esporte",
  },
];
