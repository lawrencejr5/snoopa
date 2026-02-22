import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,

  users: defineTable({
    email: v.string(),
    fullname: v.string(),
    username: v.optional(v.string()),
    plan: v.optional(v.union(v.literal("free"), v.literal("pro"))),
    emailVerificationTime: v.optional(v.number()),
    pushTokens: v.optional(v.array(v.string())),
    memory: v.optional(v.string()),
  }).index("email", ["email"]),

  sessions: defineTable({
    user_id: v.id("users"),
    title: v.string(),
    active: v.boolean(),
    last_updated: v.number(),
  }).index("by_user", ["user_id"]),

  chats: defineTable({
    session_id: v.id("sessions"),
    role: v.union(v.literal("user"), v.literal("snoopa")),
    content: v.string(),
    type: v.optional(v.union(v.literal("snitch"), v.literal("status"))),
    sources: v.optional(v.array(v.string())),
  }).index("by_session", ["session_id"]),

  watchlist: defineTable({
    user_id: v.id("users"),
    title: v.string(),
    keywords: v.array(v.string()),
    condition: v.string(),
    canonical_topic: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("completed")),
    last_checked: v.number(),
    sources: v.array(v.string()),
    message_id: v.optional(v.id("chats")),
    session_id: v.optional(v.id("sessions")),
  })
    .index("by_user", ["user_id"])
    .index("by_session", ["session_id"]),

  processed_headlines: defineTable({
    urlHash: v.string(),
    watchlist_id: v.id("watchlist"),
    createdAt: v.number(),
  })
    .index("by_hash_and_watchlist", ["urlHash", "watchlist_id"])
    .index("by_watchlist", ["watchlist_id"]),

  logs: defineTable({
    watchlist_id: v.id("watchlist"),
    timestamp: v.number(),
    action: v.string(),
    verified: v.boolean(),
    session_id: v.optional(v.id("sessions")),
  })
    .index("by_watchlist", ["watchlist_id"])
    .index("by_session", ["session_id"]),

  notifications: defineTable({
    user_id: v.id("users"),
    type: v.union(v.literal("system"), v.literal("alert"), v.literal("info")),
    title: v.string(),
    message: v.string(),
    seen: v.boolean(),
    read: v.boolean(),
  }).index("by_user", ["user_id"]),
});

export default schema;
