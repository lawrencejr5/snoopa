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
      .query("waitlist")
      .withIndex("by_email", (q) => q.eq("email", normalised_email))
      .unique();

    if (existing) {
      return { already_signed_up: true, position: existing.position };
    }

    // Position = total signups so far + 1
    const all = await ctx.db.query("waitlist").collect();
    const position = all.length + 1;

    await ctx.db.insert("waitlist", {
      email: normalised_email,
      signed_up_at: Date.now(),
      notified: false,
      position,
    });

    // Fire off confirmation email (non-blocking)
    await ctx.scheduler.runAfter(0, internal.waitlist.send_confirmation, {
      email: normalised_email,
      position,
    });

    return { already_signed_up: false, position };
  },
});

// ── Internal action: send confirmation email via Resend ───────────────────────
export const send_confirmation = internalAction({
  args: {
    email: v.string(),
    position: v.number(),
  },
  handler: async (ctx, { email, position }) => {
    const resend_api_key = process.env.RESEND_API_KEY;

    if (!resend_api_key) {
      console.error("[Waitlist] RESEND_API_KEY is not set. Skipping email.");
      return;
    }

    const ordinal = (n: number) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resend_api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Snoopa Intelligence <agent@snoopa.lawjun.ng>",
        to: [email],
        subject: `[CLEARANCE GRANTED] You're #${position} in line for Snoopa 🕵️‍♂️`,
        headers: {
          "X-Entity-Ref-ID": `${Date.now()}`, // Prevents conversation threading
        },
        html: `
      <div style="background:#0A0A0A; color:#EBEBDF; font-family: 'Courier New', Courier, monospace; max-width:560px; margin:0 auto; padding:48px 32px; border: 1px solid #222; border-radius:4px;">
        <img src="https://snoopa.lawjun.ng/images/favicon.png" alt="Snoopa" style="width:40px; height:40px; filter: grayscale(100%); margin-bottom:24px;" />
        
        <h1 style="font-size:22px; font-weight:700; line-height:1.2; margin:0 0 16px; text-transform: uppercase; letter-spacing: 0.1em; color: #EBEBDF;">
          Access Status: Approved
        </h1>

        <p style="font-size:16px; color:#A3A398; line-height:1.6; margin:0 0 24px;">
          Detective, your request for field access has been processed. You are now officially part of the <strong style="color:#C68E17;">Founding 50</strong>.
        </p>

        <div style="background:#111; border:1px solid #C68E17; border-radius:4px; padding:24px; margin-bottom:32px; text-align: center;">
          <p style="font-size:12px; color:#C68E17; margin:0 0 8px; text-transform:uppercase; letter-spacing:0.2em; font-weight: bold;">Field Agent ID</p>
          <p style="font-size:48px; font-weight:700; color:#EBEBDF; margin:0; letter-spacing:-0.05em;">#${position}</p>
        </div>

        <p style="font-size:14px; color:#888; line-height:1.6; margin:0 0 24px;">
          You are the <strong>${ordinal(position)}</strong> person to join the network. We are onboarding agents in small batches to maintain maximum intelligence speed.
        </p>

        <p style="font-size:14px; color:#A3A398; line-height:1.6; margin:0 0 32px; border-left: 2px solid #C68E17; padding-left: 16px;">
          <em>"Snoopa is currently investigating the live web. Keep your line clear. We'll ping you as soon as your terminal is ready for deployment."</em>
        </p>

        <hr style="border:none; border-top:1px solid #222; margin:32px 0;" />
        
        <p style="font-size:11px; color:#444; margin:0; text-transform: uppercase; letter-spacing: 0.1em;">
          Confidential briefing for: ${email}<br>
          Lawjun Intelligence Division | snoopa.lawjun.ng
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
    await ctx.runMutation(internal.waitlist.mark_notified, { email });
  },
});

// ── Internal mutation: mark email as notified ─────────────────────────────────
export const mark_notified = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const signup = await ctx.db
      .query("waitlist")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (signup) {
      await ctx.db.patch(signup._id, { notified: true });
    }
  },
});

// ── Query: get total signup count (for the live counter) ─────────────────────
export const get_count = query({
  args: {},
  handler: async (ctx) => {
    const signups = await ctx.db.query("waitlist").collect();
    return signups.length;
  },
});
