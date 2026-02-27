import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";

// ── Public mutation: save email + trigger confirmation email ──────────────────
export const join = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, { email }) => {
    const normalised_email = email.trim().toLowerCase();

    // Deduplicate — silently succeed if already signed up
    const existing = await ctx.db
      .query("waitlist_signups")
      .withIndex("by_email", (q) => q.eq("email", normalised_email))
      .unique();

    if (existing) {
      return { already_signed_up: true };
    }

    await ctx.db.insert("waitlist_signups", {
      email: normalised_email,
      signed_up_at: Date.now(),
      notified: false,
    });

    // Fire off confirmation email (non-blocking)
    await ctx.scheduler.runAfter(
      0,
      internal.waitlist_signups.send_confirmation,
      {
        email: normalised_email,
      },
    );

    return { already_signed_up: false };
  },
});

// ── Internal action: send confirmation email via Resend ───────────────────────
export const send_confirmation = internalAction({
  args: {
    email: v.string(),
  },
  handler: async (ctx, { email }) => {
    const resend_api_key = process.env.RESEND_API_KEY;

    if (!resend_api_key) {
      console.error("[Waitlist] RESEND_API_KEY is not set. Skipping email.");
      return;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resend_api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Snoopa <waitlist@snoopa.app>",
        to: [email],
        subject: "You're on the Snoopa waitlist 🐾",
        html: `
          <div style="background:#141414;color:#EBEBDF;font-family:'Helvetica Neue',Arial,sans-serif;max-width:560px;margin:0 auto;padding:48px 32px;border-radius:16px;">
            <img src="https://www.snoopa.app/images/favicon.png" alt="Snoopa" style="width:48px;height:48px;border-radius:10px;margin-bottom:24px;" />
            <h1 style="font-size:28px;font-weight:700;line-height:1.1;margin:0 0 16px;letter-spacing:-0.02em;">
              You're on the list.
            </h1>
            <p style="font-size:16px;color:#A3A398;line-height:1.6;margin:0 0 24px;">
              We'll reach out as soon as it's your turn. In the meantime, Snoopa is out there snooping — so you don't have to.
            </p>
            <hr style="border:none;border-top:1px solid #2A2A2A;margin:32px 0;" />
            <p style="font-size:13px;color:#555555;margin:0;">
              You signed up with <strong style="color:#A3A398;">${email}</strong>. 
              If this wasn't you, just ignore this email.
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Waitlist] Resend error:", error);
      return;
    }

    // Mark as notified in the DB
    await ctx.runMutation(internal.waitlist_signups.mark_notified, { email });
  },
});

// ── Internal mutation: mark email as notified ─────────────────────────────────
export const mark_notified = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const signup = await ctx.db
      .query("waitlist_signups")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (signup) {
      await ctx.db.patch(signup._id, { notified: true });
    }
  },
});

// ── Query: get total signup count (for the counter) ───────────────────────────
export const get_count = query({
  args: {},
  handler: async (ctx) => {
    const signups = await ctx.db.query("waitlist_signups").collect();
    return signups.length;
  },
});
