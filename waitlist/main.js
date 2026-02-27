// ─────────────────────────────────────────────
// Snoopa Waitlist — main.js
// Convex + Resend backend integration
// ─────────────────────────────────────────────

(function () {
  "use strict";

  // ── Config ────────────────────────────────
  // Your Convex deployment URL — find this in your Convex dashboard
  // or in the EXPO_PUBLIC_CONVEX_URL env var from your app project.
  const CONVEX_URL = "https://cheerful-bear-807.convex.cloud";

  // ── DOM refs ──────────────────────────────
  const form = document.getElementById("waitlist-form");
  const emailInput = document.getElementById("email-input");
  const submitBtn = document.getElementById("submit-btn");
  const formError = document.getElementById("form-error");
  const successState = document.getElementById("success-state");
  const counterText = document.getElementById("counter-text");
  const watchVideoBtn = document.getElementById("watch-video-btn");

  // ── Helpers ───────────────────────────────
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  function setError(message) {
    formError.textContent = message;
    formError.classList.add("is-visible");
    emailInput.setAttribute("aria-invalid", "true");
  }

  function clearError() {
    formError.textContent = "";
    formError.classList.remove("is-visible");
    emailInput.removeAttribute("aria-invalid");
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    submitBtn.classList.toggle("is-loading", loading);
    emailInput.disabled = loading;
  }

  function showSuccess() {
    form.hidden = true;
    successState.hidden = false;
  }

  // ── Convex HTTP API call ──────────────────
  // The waitlist page is plain HTML so we use Convex's HTTP mutation API
  // instead of the JS SDK (no bundler available here).
  async function callConvexMutation(fn_path, args) {
    const res = await fetch(`${CONVEX_URL}/api/mutation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: fn_path, args }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `Server error (${res.status})`);
    }

    return res.json();
  }

  async function callConvexQuery(fn_path, args) {
    const res = await fetch(`${CONVEX_URL}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: fn_path, args }),
    });

    if (!res.ok) {
      throw new Error(`Query failed (${res.status})`);
    }

    const data = await res.json();
    return data.value;
  }

  // ── Real-time validation ──────────────────
  emailInput.addEventListener("input", function () {
    if (formError.classList.contains("is-visible")) clearError();
  });

  // ── Form submit ───────────────────────────
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearError();

    const email = emailInput.value.trim();

    if (!email) {
      setError("Please enter your email address.");
      emailInput.focus();
      return;
    }

    if (!isValidEmail(email)) {
      setError("That doesn't look like a valid email.");
      emailInput.focus();
      return;
    }

    setLoading(true);

    try {
      const result = await callConvexMutation("waitlist_signups:join", {
        email,
      });

      if (result.value?.already_signed_up) {
        // Still show success — no need to tell them they already signed up
        showSuccess();
      } else {
        showSuccess();
      }

      // Refresh the counter
      loadCounter();
    } catch (err) {
      console.error("[Waitlist]", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  });

  // ── Watch Video: scroll to phone preview (mobile only) ──
  if (watchVideoBtn) {
    watchVideoBtn.addEventListener("click", function () {
      const target = document.getElementById("app-preview");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  // ── Load live signup count ────────────────
  async function loadCounter() {
    if (!counterText) return;

    try {
      const count = await callConvexQuery("waitlist_signups:get_count", {});
      if (typeof count === "number" && count > 0) {
        counterText.textContent = `${count.toLocaleString()} ${count === 1 ? "person" : "people"} already waiting`;
      }
    } catch {
      // Silently fail — counter isn't critical
    }
  }

  // Load the real count on page load
  loadCounter();
})();
