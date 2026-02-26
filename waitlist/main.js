// ─────────────────────────────────────────────
// Snoopa Waitlist — main.js
// Handles form submission, validation & UI states.
// Backend (Convex + Resend) will be wired here later.
// ─────────────────────────────────────────────

(function () {
  "use strict";

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
      // ── TODO: Replace with your Convex mutation call ──
      // const client = new ConvexClient(CONVEX_URL);
      // await client.mutation(api.waitlist.join, { email });
      await simulateRequest(email);
      showSuccess();
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  });

  // ── Simulated request (remove when backend is ready) ──
  function simulateRequest(email) {
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log("[Snoopa Waitlist] Email captured:", email);
        resolve({ success: true });
      }, 1400);
    });
  }

  // ── Watch Video: scroll to phone preview (mobile only) ──
  // The button is CSS-hidden on desktop so this only fires on mobile.
  if (watchVideoBtn) {
    watchVideoBtn.addEventListener("click", function () {
      const target = document.getElementById("app-preview");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  // ── Animate counter number ────────────────
  function animateCounter() {
    if (!counterText) return;
    const target = 17; // placeholder — update with real Convex query
    let current = 0;
    const step = Math.ceil(target / 40);
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      counterText.textContent = `${current.toLocaleString()} people already waiting`;
    }, 30);
  }

  setTimeout(animateCounter, 800);
})();
