"use client";

import { useState } from "react";
import styles from "./page.module.css";

const FAQS = [
  {
    question: "What is Snoopa?",
    answer: "Snoopa is a conversational AI agent that acts as your private investigator for web information. It proactively searches the web to track topics you specify and delivers real-time alerts.",
  },
  {
    question: "How does Snoopa track topics?",
    answer: "Snoopa uses advanced web search and scraping technologies (powered by Google and Tavily) to monitor changes, price shifts, news updates, or injury lists 24/7.",
  },
  {
    question: "Can I customize what Snoopa tracks?",
    answer: "Absolutely! You can set up watchlists for any custom topics in plain English. For example, you can tell Snoopa to track when a specific player returns to training or when a product price changes.",
  },
  {
    question: "How do I receive updates?",
    answer: "Snoopa delivers real-time push notifications directly to your mobile device as soon as a verified change is detected. We also compile clean, daily briefings summarizing all your watchlists.",
  },
  {
    question: "Is the information reliable?",
    answer: "Yes, every update from Snoopa is backed by verifiable web sources. The app provides clickable links next to every piece of intel so you can see exactly where it was sourced.",
  },
];

export default function Home() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className={styles.page}>
      {/* ── Noise overlay ───────────────────── */}
      <div className={styles.noise} />

      {/* ── Navbar ──────────────────────────── */}
      <nav className={styles.navbar}>
        <div className={styles.navBrand}>
          <img
            src="/images/icon-nobg.png"
            alt="Snoopa logo"
            className={styles.navLogo}
          />
          <div className={styles.navBrandText}>
            <span className={styles.navName}>Snoopa</span>
            <span className={styles.navSubName}>by Lawjun Labs</span>
          </div>
        </div>
        <div className={styles.navLinks}>
          <a href="#" className={styles.navLink}>
            Terms & Conditions
          </a>
          <a href="#" className={styles.navLink}>
            Privacy Policy
          </a>
        </div>
        <button
          className={styles.mobileMenuBtn}
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Open menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </nav>

      {/* ── Mobile Sidebar Drawer ────────────── */}
      <div
        className={`${styles.sidebarOverlay} ${isSidebarOpen ? styles.sidebarOverlayOpen : ""}`}
        onClick={() => setIsSidebarOpen(false)}
      />
      <div className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.navBrand}>
            <img
              src="/images/icon-nobg.png"
              alt="Snoopa logo"
              className={styles.navLogo}
            />
            <div className={styles.navBrandText}>
              <span className={styles.navName}>Snoopa</span>
            </div>
          </div>
          <button
            className={styles.sidebarCloseBtn}
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className={styles.sidebarLinks}>
          <a href="#" className={styles.sidebarLink} onClick={() => setIsSidebarOpen(false)}>
            Terms & Conditions
          </a>
          <a href="#" className={styles.sidebarLink} onClick={() => setIsSidebarOpen(false)}>
            Privacy Policy
          </a>
        </div>
      </div>

      {/* ── Bento Grid ──────────────────────── */}
      <main className={styles.bento}>
        {/* ─ HERO CARD (big, wide) ─ */}
        <section className={styles.cardHero} id="hero">
          <div className={styles.heroContent}>
            <span className={styles.badge}>Live on App Stores</span>
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
            <div className={styles.heroDownloadButtons}>
              <a href="#" className={styles.storeButton} target="_blank" rel="noopener noreferrer">
                <img
                  src="/images/icons/apple-logo.png"
                  alt="App Store Icon"
                  className={styles.storeIcon}
                />
                <div className={styles.storeButtonText}>
                  <span className={styles.storeButtonSub}>Download on the</span>
                  <span className={styles.storeButtonMain}>App Store</span>
                </div>
              </a>
              <a href="#" className={styles.storeButton} target="_blank" rel="noopener noreferrer">
                <img
                  src="/images/icons/playstore.png"
                  alt="Google Play Icon"
                  className={styles.storeIcon}
                />
                <div className={styles.storeButtonText}>
                  <span className={styles.storeButtonSub}>GET IT ON</span>
                  <span className={styles.storeButtonMain}>Google Play</span>
                </div>
              </a>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.heroGlow} />
            <img
              src="/images/transparent-hero-image.png"
              alt="Snoopa mobile interface dashboard preview"
              className={styles.heroMockup}
            />
          </div>
        </section>

        {/* ─ FEATURES HEADER ─ */}
        <div className={styles.featuresSectionTitle}>
          <h2>Features...</h2>
        </div>

        {/* ─ FEATURE CARDS ─ */}
        {/* Feature 1: Wide Layout */}
        <section className={`${styles.cardFeature} ${styles.cardFeatureWide}`} id="features">
          <div className={styles.featureText}>
            <div className={styles.featureIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07L19.07 4.93" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <h3 className={styles.featureTitle}>Your Daily AI Intelligence Briefing</h3>
            <p className={styles.featureDesc}>
              Start your day with a curated, noise-free digest of everything that changed on your watchlist. No noise, just the facts.
            </p>
          </div>
          <div className={styles.featureVisualContainer}>
            <img
              src="/images/features/feature_1.png"
              alt="Your Daily AI Intelligence Briefing"
              className={styles.featureImage}
            />
          </div>
        </section>

        {/* Feature 2: Narrow Layout */}
        <section className={styles.cardFeature}>
          <div className={styles.featureText}>
            <div className={styles.featureIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="3" />
                <path d="M3 12h4m10 0h4M12 3v4m0 10v4" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>
            <h3 className={styles.featureTitle}>Track Anything. Automatically.</h3>
            <p className={styles.featureDesc}>
              Deploy a global intelligence scout with a single prompt. From injury lists to market updates, Snoopa monitors the web 24/7.
            </p>
          </div>
          <div className={styles.featureVisualContainer}>
            <img
              src="/images/features/feature_2.png"
              alt="Track Anything Automatically"
              className={styles.featureImage}
            />
          </div>
        </section>

        {/* Feature 3: Narrow Layout */}
        <section className={styles.cardFeature}>
          <div className={styles.featureText}>
            <div className={styles.featureIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 17V7h6v10" />
              </svg>
            </div>
            <h3 className={styles.featureTitle}>Managing Watchlists Made Simple</h3>
            <p className={styles.featureDesc}>
              Organize, view, and refine your tracking settings using a beautiful conversational interface.
            </p>
          </div>
          <div className={styles.featureVisualContainer}>
            <img
              src="/images/features/feature_3.png"
              alt="Managing Watchlists Made Simple"
              className={styles.featureImage}
            />
          </div>
        </section>

        {/* Feature 4: Wide Layout */}
        <section className={`${styles.cardFeature} ${styles.cardFeatureWide}`}>
          <div className={styles.featureText}>
            <div className={styles.featureIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <path d="M8 9h8M8 13h6" />
              </svg>
            </div>
            <h3 className={styles.featureTitle}>Data You Can Trust, Sources You Can See</h3>
            <p className={styles.featureDesc}>
              Every snoop is backed by verifiable web sources. Click through directly to see where the data originated.
            </p>
          </div>
          <div className={styles.featureVisualContainer}>
            <img
              src="/images/features/feature_4.png"
              alt="Data You Can Trust Sources You Can See"
              className={styles.featureImage}
            />
          </div>
        </section>

        {/* ─ FAQ SECTION ─ */}
        <section className={styles.cardFaq} id="faq">
          <h2 className={styles.faqTitle}>Frequently Asked Questions</h2>
          <div className={styles.faqList}>
            {FAQS.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className={`${styles.faqItem} ${isOpen ? styles.faqItemOpen : ""}`}
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className={styles.faqQuestion}
                    aria-expanded={isOpen}
                  >
                    <span>{faq.question}</span>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={styles.faqArrow}
                    >
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </button>
                  <div
                    className={styles.faqAnswerContainer}
                    style={{
                      maxHeight: isOpen ? "200px" : "0px",
                    }}
                  >
                    <p className={styles.faqAnswer}>{faq.answer}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────── */}
      <footer className={styles.footer}>
        <p className={styles.footerText}>
          © {new Date().getFullYear()} Snoopa. By Lawjun Labs.
        </p>
      </footer>
    </div>
  );
}
