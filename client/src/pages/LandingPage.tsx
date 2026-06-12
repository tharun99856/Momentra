import { Link } from 'react-router-dom'
import styles from './LandingPage.module.css'

const FEATURES = [
  {
    icon: '✦',
    title: 'AI Face Recognition',
    desc: 'Upload a selfie and instantly find every photo you appear in across all events. No manual tagging needed.',
  },
  {
    icon: '⬡',
    title: 'Smart Galleries',
    desc: 'Masonry layouts, infinite scroll, and auto-generated highlights from your most-liked shots.',
  },
  {
    icon: '◈',
    title: 'Real-time Collaboration',
    desc: 'Multiple photographers upload simultaneously. Live notifications keep everyone in sync.',
  },
  {
    icon: '◎',
    title: 'Workspace Analytics',
    desc: 'Track engagement, storage usage, and top content across your entire organization.',
  },
  {
    icon: '⊞',
    title: 'Role-based Access',
    desc: 'Admins, photographers, and members — each with the right level of control.',
  },
  {
    icon: '↗',
    title: 'Shareable Links',
    desc: 'Generate public gallery links for attendees. No account required to browse and download.',
  },
] as const

const STEPS = [
  { num: '01', title: 'Create a workspace', desc: 'Set up your organization in under 30 seconds. Invite your team via link or email.' },
  { num: '02', title: 'Create events', desc: 'Add events with categories, dates, and locations. Public or private — your call.' },
  { num: '03', title: 'Upload & share', desc: 'Drag-and-drop bulk uploads. AI processes thumbnails, face tags, and highlights automatically.' },
] as const

const PLANS = [
  {
    name: 'Starter',
    price: 'Free',
    period: '',
    desc: 'Perfect for small teams getting started.',
    features: ['Up to 5 events', '500 photos', '3 team members', 'Basic analytics', 'Public galleries'],
    cta: 'Get started',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/mo',
    desc: 'For growing organizations that need more.',
    features: ['Unlimited events', '50,000 photos', '25 team members', 'AI face recognition', 'Advanced analytics', 'Priority support', 'Custom branding'],
    cta: 'Start free trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'Tailored solutions for large organizations.',
    features: ['Everything in Pro', 'Unlimited storage', 'Unlimited members', 'SSO / SAML', 'Dedicated support', 'SLA guarantee', 'On-prem option'],
    cta: 'Contact sales',
    highlighted: false,
  },
] as const

export default function LandingPage() {
  return (
    <div className={styles.landing}>
      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <span className={styles.wordmark}>Momentra</span>
          <div className={styles.navLinks}>
            <a href="#features" className={styles.navLink}>Features</a>
            <a href="#how" className={styles.navLink}>How it works</a>
            <a href="#pricing" className={styles.navLink}>Pricing</a>
            <Link to="/login" className={styles.navLink}>Sign in</Link>
            <Link to="/register" className={styles.navCta}>Get started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroBadge}>Now with AI-powered face recognition</div>
          <h1 className={styles.heroTitle}>
            Every moment.<br />
            <em>Organized. Shared. Remembered.</em>
          </h1>
          <p className={styles.heroSubtitle}>
            The all-in-one platform for organizations to capture, manage, and share event photography.
            AI-powered galleries that make every photo findable.
          </p>
          <div className={styles.heroActions}>
            <Link to="/register" className={styles.heroPrimary}>
              Start for free
              <span className={styles.heroArrow}>→</span>
            </Link>
            <a href="#how" className={styles.heroSecondary}>See how it works</a>
          </div>
          <p className={styles.heroMeta}>No credit card required. Free for up to 5 events.</p>
        </div>

        <div className={styles.heroVisual}>
          <div className={styles.mockupWindow}>
            <div className={styles.mockupDots}>
              <span /><span /><span />
            </div>
            <div className={styles.mockupContent}>
              <div className={styles.mockupSidebar}>
                <div className={styles.mockupNavItem} data-active="true" />
                <div className={styles.mockupNavItem} />
                <div className={styles.mockupNavItem} />
                <div className={styles.mockupNavItem} />
              </div>
              <div className={styles.mockupMain}>
                <div className={styles.mockupGrid}>
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      className={styles.mockupCard}
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      {/* <section className={styles.statsBar}>
        <div className={styles.statsInner}>
          <div className={styles.stat}>
            <span className={styles.statNumber}>10K+</span>
            <span className={styles.statLabel}>Events created</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>2M+</span>
            <span className={styles.statLabel}>Photos managed</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>500+</span>
            <span className={styles.statLabel}>Organizations</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNumber}>99.9%</span>
            <span className={styles.statLabel}>Uptime SLA</span>
          </div>
        </div>
      </section> */}

      {/* Features */}
      <section id="features" className={styles.features}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>Features</span>
            <h2 className={styles.sectionTitle}>Everything your team needs</h2>
            <p className={styles.sectionSubtitle}>
              From upload to share, Momentra handles the entire event photography workflow.
            </p>
          </div>
          <div className={styles.featureGrid}>
            {FEATURES.map((f) => (
              <div key={f.title} className={styles.featureCard}>
                <span className={styles.featureIcon}>{f.icon}</span>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className={styles.howSection}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>How it works</span>
            <h2 className={styles.sectionTitle}>Up and running in minutes</h2>
          </div>
          <div className={styles.stepsGrid}>
            {STEPS.map((step) => (
              <div key={step.num} className={styles.step}>
                <span className={styles.stepNum}>{step.num}</span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className={styles.pricingSection}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionEyebrow}>Pricing</span>
            <h2 className={styles.sectionTitle}>Simple, transparent pricing</h2>
            <p className={styles.sectionSubtitle}>
              Start free, upgrade when you need more. No hidden fees.
            </p>
          </div>
          <div className={styles.pricingGrid}>
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`${styles.pricingCard} ${plan.highlighted ? styles.pricingHighlighted : ''}`}
              >
                {plan.highlighted && <div className={styles.pricingBadge}>Most popular</div>}
                <h3 className={styles.planName}>{plan.name}</h3>
                <div className={styles.planPrice}>
                  <span className={styles.priceAmount}>{plan.price}</span>
                  {plan.period && <span className={styles.pricePeriod}>{plan.period}</span>}
                </div>
                <p className={styles.planDesc}>{plan.desc}</p>
                <ul className={styles.planFeatures}>
                  {plan.features.map((f) => (
                    <li key={f} className={styles.planFeature}>
                      <span className={styles.checkmark}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`${styles.planCta} ${plan.highlighted ? styles.planCtaPrimary : ''}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>
            Ready to transform your<br />event photography?
          </h2>
          <p className={styles.ctaSubtitle}>
            Start capturing and sharing your event memories today.
          </p>
          <Link to="/register" className={styles.ctaButton}>
            Get started for free
            <span className={styles.heroArrow}>→</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <span className={styles.footerWordmark}>Momentra</span>
            <p className={styles.footerTagline}>AI-powered event photo management for teams.</p>
          </div>
          <div className={styles.footerLinks}>
            <div className={styles.footerCol}>
              <h4 className={styles.footerColTitle}>Product</h4>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#how">How it works</a>
            </div>
            <div className={styles.footerCol}>
              <h4 className={styles.footerColTitle}>Company</h4>
              <a href="#about">About</a>
              <a href="#blog">Blog</a>
              <a href="#careers">Careers</a>
            </div>
            <div className={styles.footerCol}>
              <h4 className={styles.footerColTitle}>Legal</h4>
              <a href="#privacy">Privacy</a>
              <a href="#terms">Terms</a>
              <a href="#security">Security</a>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <p>&copy; 2026 Momentra. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
