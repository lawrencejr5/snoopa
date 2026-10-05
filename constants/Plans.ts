export const PLANS = [
  {
    id: "pro",
    name: "Snoopa Pro",
    price: "$3.99",
    period: "/mo",
    features: [
      "250 snoops per month",
      "Up to 7 active watchlists",
      "Set source url",
      "Customize watchlist conditions",
      "Prioritized customer support",
    ],
    highlight: false,
    badge: "",
  },
  {
    id: "supa",
    name: "Supa Snoopa",
    price: "$7.99",
    period: "/mo",
    features: [
      "600 snoops per month",
      "Up to 20 active watchlists",
      "Set source url",
      "Customize watchlist conditions",
      "Prioritized customer support",
    ],
    highlight: true,
    badge: "MOST POPULAR",
  },
  {
    id: "max",
    name: "Snoopa Max",
    price: "$14.99",
    period: "/mo",
    features: [
      "1,500 snoops per month",
      "Unlimited active watchlists",
      "Set source url",
      "Customize watchlist conditions",
      "Prioritized customer support",
    ],
    highlight: false,
    badge: "BEST VALUE",
  },
];

/** Snoop amounts are granted server-side from the pack id (see convex/plans.ts). */
export const PACKS = [
  {
    id: "boost_pack" as const,
    name: "Boost Pack",
    price: "$2.99",
    snoops: 100,
    description: "100 Snoops",
    icon: require("@/assets/icons/tracked.png"),
  },
  {
    id: "fuel_pack" as const,
    name: "Fuel Pack",
    price: "$5.99",
    snoops: 300,
    description: "300 Snoops",
    icon: require("@/assets/icons/tracked.png"),
  },
  {
    id: "surge_pack" as const,
    name: "Surge Pack",
    price: "$12.99",
    snoops: 850,
    description: "850 Snoops",
    icon: require("@/assets/icons/tracked.png"),
  },
];

export const FREE_WATCHLIST_LIMIT = 2;
export const FREE_LIFETIME_SNOOPS = 50;
