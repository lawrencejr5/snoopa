import Link from "next/link";
import styles from "../legal.module.css";

export const metadata = {
  title: "Terms & Conditions — Snoopa",
  description:
    "Terms and conditions governing the use of the Snoopa mobile app and services.",
};

export default function TermsPage() {
  return (
    <div className={styles.page}>
      {/* Noise overlay */}
      <div className={styles.noise} />

      {/* Header bar */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <img
            src="/images/icon-nobg.png"
            alt="Snoopa logo"
            className={styles.logo}
          />
          <span className={styles.brandName}>Snoopa</span>
        </div>
        <Link href="/" className={styles.backLink}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Home
        </Link>
      </header>

      {/* Main Container */}
      <main className={styles.container}>
        <h1 className={styles.title}>Terms & Conditions</h1>
        <div className={styles.meta}>Last Updated: June 8, 2026</div>

        <section className={styles.content}>
          <p>
            Welcome to <strong>Snoopa</strong>, an application created and
            operated by <strong>Lawjun Labs</strong>. By downloading,
            installing, or using the Snoopa mobile application or website, you
            agree to comply with and be bound by the following Terms &
            Conditions. If you do not agree, please do not use the service.
          </p>

          <h2>1. Description of Service</h2>
          <p>
            Snoopa is a conversational AI agent designed to act as your personal
            web investigator. The service monitors specified target URLs and
            search topics on the public web (using search and indexing
            technologies powered by Google and Tavily), compiles noise-free
            daily briefings, and pushes real-time notifications when changes are
            detected.
          </p>

          <h2>2. Use of Service & Restrictions</h2>
          <p>
            You agree to use Snoopa solely for lawful purposes. You must not:
          </p>
          <ul>
            <li>
              Attempt to bypass, disable, or interfere with security features of
              the app or its backing servers.
            </li>
            <li>
              Deploy watchlists or custom prompts intended to scrape proprietary
              data in violation of target website terms.
            </li>
            <li>
              Use the service to track individuals or gather private, non-public
              personal information maliciously.
            </li>
            <li>
              Use automated systems (bots, scripts) to access or query Snoopa
              servers in a manner that exceeds fair-use limits.
            </li>
          </ul>

          <h2>3. Watchlists & Sourced Content</h2>
          <p>
            Snoopa provides real-time facts gathered from public search results.
            You acknowledge that:
          </p>
          <ul>
            <li>
              All updates, facts, and daily intelligence briefs are fetched from
              third-party websites and public internet search indexes.
            </li>
            <li>
              Snoopa has no control over, and assumes no responsibility for, the
              accuracy, truthfulness, completeness, or policies of third-party
              websites.
            </li>
            <li>
              Providing source links in our briefs does not imply endorsement of
              those websites or their content.
            </li>
          </ul>

          <h2>4. Snoops (Virtual Currency)</h2>
          <p>
            Snoopa uses an internal virtual currency called "Snoops" to fund interactions, intelligence gathering, and active monitoring tasks.
          </p>
          <ul>
            <li>
              Every query, chat message, or background tracking action consumes one or more Snoops.
            </li>
            <li>
              Free users receive a limited monthly allowance of Snoops (e.g., 30 per month). Unused free Snoops expire at the end of the calendar month and do not roll over.
            </li>
            <li>
              Premium subscribers (Snoopa Pro, Supa Snoopa, Snoopa Max) receive a larger monthly allowance of Snoops. These reset periodically according to your active subscription cycle.
            </li>
            <li>
              Users may earn additional Snoops by engaging with rewarded advertisements (subject to daily limits).
            </li>
            <li>
              Snoops have no real-world cash value, cannot be redeemed for fiat currency, and are non-transferable between accounts.
            </li>
          </ul>

          <h2>5. Intellectual Property</h2>
          <p>
            The Snoopa mobile application, brand names, the Greyhound mascot
            logo, graphics, design assets, and underlying Convex database
            structures and models are the intellectual property of Lawjun Labs
            and are protected by applicable trademark and copyright laws.
          </p>

          <h2>6. Limitation of Liability</h2>
          <p>
            Snoopa is provided on an "as-is" and "as-available" basis. In no
            event shall Lawjun Labs, its affiliates, or its developers be liable
            for any damages (including loss of data, profits, or business
            interruption) arising out of the use or inability to use the
            monitoring briefs or real-time notification alerts, even if notified
            of the possibility of such damage.
          </p>

          <h2>7. Modifications to Terms</h2>
          <p>
            We reserves the right, at our sole discretion, to modify or replace
            these Terms & Conditions at any time. Your continued use of the app
            following the posting of changes constitutes acceptance of the
            updated terms.
          </p>

          <h2>8. Contact Information</h2>
          <p>
            For any questions regarding these terms, please contact us at{" "}
            <strong>snoopa@lawjun.com</strong>.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <p className={styles.footerText}>
          © {new Date().getFullYear()} Snoopa. By Lawjun Labs.
        </p>
      </footer>
    </div>
  );
}
