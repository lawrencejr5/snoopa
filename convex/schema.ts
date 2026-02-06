import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,

  users: defineTable({
    email: v.string(),
    fullname: v.string(),
    username: v.optional(v.string()),
    plan: v.union(v.literal("free"), v.literal("pro")),
    emailVerificationTime: v.optional(v.number()),
    pushTokens: v.optional(v.array(v.string())),
  }).index("email", ["email"]),
});

export default schema;
