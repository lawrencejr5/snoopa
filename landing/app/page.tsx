import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      {/* ── Noise overlay ───────────────────── */}
      <div className={styles.noise} />

      {/* ── Navbar ──────────────────────────── */}
      <nav className={styles.navbar}>
        <div className={styles.navBrand}>
          <img
            src="/images/favicon.png"
            alt="Snoopa logo"
            className={styles.navLogo}
          />
          <span className={styles.navName}>Snoopa</span>
        </div>
        <div className={styles.navLinks}>
          <a href="#features" className={styles.navLink}>
            Features
          </a>
          <a href="#demo" className={styles.navLink}>
            Demo
          </a>
          <a href="#waitlist" className={styles.navCta}>
            Join Waitlist
          </a>
        </div>

        {/* Mobile menu button (visible < 768) */}
        <button
          className={styles.mobileMenuBtn}
          id="mobile-menu-btn"
          aria-label="Open menu"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path
              d="M3 6h16M3 11h16M3 16h16"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </nav>

      {/* ── Bento Grid ──────────────────────── */}
      <main className={styles.bento}>
        {/* ─ HERO CARD (big, wide) ─ */}
        <section className={styles.cardHero} id="hero">
          <div className={styles.heroContent}>
            <span className={styles.badge}>Private Beta</span>
            <h1 className={styles.heroTitle}>
              Don&apos;t search,
              <br />
              <span className={styles.heroAccent}>Just snoop.</span>
            </h1>
            <p className={styles.heroSub}>
              Snoopa is a conversational AI agent that tracks the topics you
              care about. From injury reports to market shifts, Snoopa monitors
              the front page of the web 24/7 and pings you the moment something
              changes.
            </p>
            <a href="#waitlist" className={styles.heroCta}>
              Join the Waitlist
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 8H13M13 8L9 4M13 8L9 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.heroGlow} />
            <img
              src="/images/favicon.png"
              alt="Snoopa greyhound"
              className={styles.heroMascot}
            />
          </div>
        </section>

        {/* ─ DEMO CARD (screen record) ─ */}
        <section className={styles.cardDemo} id="demo">
          <div className={styles.demoPhoneFrame}>
            <div className={styles.demoScreen}>
              <video
                src="/video/screen-record-2.mp4"
                autoPlay
                muted
                loop
                playsInline
                className={styles.demoVideo}
              />
            </div>
            <div className={styles.demoHomeBar} />
          </div>
          <p className={styles.demoLabel}>See Snoopa in action</p>
        </section>

        {/* ─ FEATURE CARDS (3 bento tiles) ─ */}
        <section className={styles.cardFeature} id="features">
          <div className={styles.featureIcon}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M19 19L25 25"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h3 className={styles.featureTitle}>Real-time Intel</h3>
          <p className={styles.featureDesc}>
            Ask anything that&apos;s happening right now. Snoopa queries the
            front page of the web and delivers verified, sourced answers.
          </p>
        </section>

        <section className={styles.cardFeature}>
          <div className={styles.featureIcon}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path
                d="M14 4v10l6 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="14"
                cy="14"
                r="11"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </div>
          <h3 className={styles.featureTitle}>Watchlists</h3>
          <p className={styles.featureDesc}>
            Tell Snoopa what to track. When your condition is met — a player
            returns, a stock dips — you get a push notification instantly.
          </p>
        </section>

        <section className={styles.cardFeature}>
          <div className={styles.featureIcon}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path
                d="M6 18l4-8 4 5 4-10 4 13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h3 className={styles.featureTitle}>Greyhound Speed</h3>
          <p className={styles.featureDesc}>
            Every feature in Snoopa is speed-optimized. Fast queries, instant
            responses, and a UI designed for zero friction.
          </p>
        </section>

        {/* ─ SCREENSHOTS CARD ─ */}
        <section className={styles.cardScreenshots}>
          <div className={styles.screenshotStrip}>
            <img
              src="/images/screenshots/Screenshot_20260227-040025_Snoopa.jpg"
              alt="Snoopa home screen"
              className={styles.screenshotImg}
            />
            <img
              src="/images/screenshots/Screenshot_20260227-040041_Snoopa.jpg"
              alt="Snoopa conversation"
              className={styles.screenshotImg}
            />
            <img
              src="/images/screenshots/Screenshot_20260227-040050_Snoopa.jpg"
              alt="Snoopa watchlist"
              className={styles.screenshotImg}
            />
            <img
              src="/images/screenshots/Screenshot_20260227-040104_Snoopa.jpg"
              alt="Snoopa tracking"
              className={styles.screenshotImg}
            />
            <img
              src="/images/screenshots/Screenshot_20260227-040134_Snoopa.jpg"
              alt="Snoopa notifications"
              className={styles.screenshotImg}
            />
          </div>
        </section>

        {/* ─ WAITLIST CARD ─ */}
        <section className={styles.cardWaitlist} id="waitlist">
          <h2 className={styles.waitlistTitle}>Get early access</h2>
          <p className={styles.waitlistSub}>
            Be one of the first to try Snoopa. Drop your email and we&apos;ll
            reach out when it&apos;s your turn.
          </p>
          <form className={styles.waitlistForm} id="waitlist-form">
            <div className={styles.inputGroup}>
              <input
                type="email"
                id="email-input"
                name="email"
                className={styles.emailInput}
                placeholder="your@email.com"
                autoComplete="email"
                required
                aria-label="Email address"
              />
              <button
                type="submit"
                className={styles.submitBtn}
                id="submit-btn"
              >
                <span className={styles.btnText}>Join</span>
                <span className={styles.btnLoader} id="btn-loader">
                  <svg
                    className={styles.spinner}
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                  >
                    <circle
                      cx="9"
                      cy="9"
                      r="7"
                      stroke="currentColor"
                      strokeOpacity="0.3"
                      strokeWidth="2"
                    />
                    <path
                      d="M9 2a7 7 0 0 1 7 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </button>
            </div>
            <p className={styles.formError} id="form-error" role="alert"></p>
            <p className={styles.formSuccess} id="form-success"></p>
          </form>
          <p className={styles.privacyNote}>No spam. Unsubscribe anytime.</p>
        </section>
      </main>

      {/* ── Footer ──────────────────────────── */}
      <footer className={styles.footer}>
        <p className={styles.footerText}>
          © {new Date().getFullYear()} Snoopa. Built with the Greyhound spirit.
        </p>
      </footer>

      {/* ── Client-side JS ──────────────────── */}
      <WaitlistScript />
    </div>
  );
}

/* Inline script component for waitlist form handling */
function WaitlistScript() {
  const script = `
    (function() {
      const CONVEX_URL = "https://cheerful-bear-807.convex.cloud";

      const form = document.getElementById("waitlist-form");
      const emailInput = document.getElementById("email-input");
      const submitBtn = document.getElementById("submit-btn");
      const formError = document.getElementById("form-error");
      const formSuccess = document.getElementById("form-success");
      const btnLoader = document.getElementById("btn-loader");

      function isValidEmail(e) { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(e.trim()); }

      function setError(msg) { formError.textContent = msg; formError.style.display = "block"; formSuccess.style.display = "none"; }
      function clearError() { formError.textContent = ""; formError.style.display = "none"; }
      function showSuccess() {
        formSuccess.textContent = "You're on the list! We'll be in touch.";
        formSuccess.style.display = "block";
        formError.style.display = "none";
        emailInput.value = "";
      }
      function setLoading(v) {
        submitBtn.disabled = v;
        btnLoader.style.display = v ? "flex" : "none";
        submitBtn.querySelector("." + "${styles.btnText}").style.display = v ? "none" : "inline";
      }

      emailInput.addEventListener("input", function() { if(formError.style.display==="block") clearError(); });

      form.addEventListener("submit", async function(e) {
        e.preventDefault();
        clearError();
        var email = emailInput.value.trim();
        if (!email) { setError("Please enter your email."); return; }
        if (!isValidEmail(email)) { setError("That doesn't look like a valid email."); return; }
        setLoading(true);
        try {
          var res = await fetch(CONVEX_URL + "/api/mutation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: "waitlist_signups:join", args: { email: email } }),
          });
          if (!res.ok) throw new Error("Server error");
          showSuccess();
        } catch(err) {
          setError("Something went wrong. Please try again.");
        } finally {
          setLoading(false);
        }
      });

      // Mobile menu toggle
      var menuBtn = document.getElementById("mobile-menu-btn");
      if (menuBtn) {
        menuBtn.addEventListener("click", function() {
          var links = document.querySelector("." + "${styles.navLinks}");
          if (links) links.classList.toggle("${styles.navLinksOpen}");
        });
      }
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
