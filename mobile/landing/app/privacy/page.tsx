import Link from "next/link";
import styles from "../legal.module.css";

export const metadata = {
  title: "Privacy Policy — Snoopa",
  description:
    "Privacy Policy explaining how Snoopa collects, uses, and safeguards your information.",
};

export default function PrivacyPage() {
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
        <h1 className={styles.title}>Privacy Policy</h1>
        <div className={styles.meta}>Last Updated: June 8, 2026</div>

        <section className={styles.content}>
          <p>
            At <strong>Snoopa</strong>, operated by <strong>Lawjun Labs</strong>
            , we are committed to protecting your privacy. This Privacy Policy
            explains what information we collect, how we use it, and your
            choices regarding your personal data.
          </p>

          <h2>1. Information We Collect</h2>
          <p>
            Snoopa collects data to run our autonomous monitoring agents and
            ensure reliable delivery of briefings:
          </p>
          <ul>
            <li>
              <strong>Watchlist Configurations:</strong> The custom tracking
              items, sports players, topics, or URLs you set up in the app.
            </li>
            <li>
              <strong>Device & Authentication Data:</strong> Mobile device
              identifiers, Apple/Google authorization tokens, and push
              notification tokens necessary to deliver alerts.
            </li>
            <li>
              <strong>Conversational Inputs:</strong> Queries and commands you
              send to our AI mascot to update or manage your tracking
              priorities.
            </li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>Your information is strictly used to run our core features:</p>
          <ul>
            <li>
              To deploy active scraping and search queries to monitor changes on
              the web.
            </li>
            <li>
              To compile and generate daily briefs and verify news updates for
              your feed.
            </li>
            <li>
              To send real-time push notification updates to your mobile device.
            </li>
            <li>
              To debug server performance, database issues, or authentication
              flows in our Convex backend database.
            </li>
          </ul>

          <h2>3. Data Sourcing and Third-Party Integrations</h2>
          <p>Snoopa queries public internet sources to get tracking details:</p>
          <ul>
            <li>
              We utilize search engine scrapers and APIs (such as Tavily and
              Google Search) to retrieve real-time facts about your watchlists.
              No personal user data is shared with these third-party search
              APIs, except for the generic search keywords you configure.
            </li>
            <li>
              We utilize Google Cloud or Apple APNs to process and dispatch push
              notifications.
            </li>
          </ul>

          <h2>4. Data Retention & Security</h2>
          <p>
            Your watchlists, conversation history, and user settings are stored
            securely within our real-time Convex database. We implement
            industry-standard administrative and technical measures to protect
            your database documents from unauthorized access, loss, or
            disclosure.
          </p>

          <h2>5. Your Choices & Data Deletion</h2>
          <p>
            You can modify, archive, or delete your watchlists and notifications
            history at any time directly through the Snoopa mobile interface. If
            you wish to delete your account or wipe your associated data records
            from our backend database, please contact us.
          </p>

          <h2>6. Children's Privacy</h2>
          <p>
            Snoopa is not intended for use by children under the age of 13. We
            do not knowingly collect personal information from children. If we
            discover a child under 13 has provided us data, we will delete it
            immediately.
          </p>

          <h2>7. Contact Us</h2>
          <p>
            If you have questions, concerns, or requests regarding this Privacy
            Policy, please reach out to us at
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
