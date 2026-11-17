import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Camera,
  Check,
  ClipboardPenLine,
  Headset,
  LockKeyhole,
  Mail,
  MapPin,
  Monitor,
  Phone,
  ScanEye,
  Settings,
  ShieldCheck,
  UsersRound,
  Wifi,
} from "lucide-react";
import styles from "./home.module.css";
import OrbitingServices from "@/components/OrbitingServices";

// This is a SERVER component: do not add "use client" here.
// Only one default export must exist in app/page.jsx.
export const metadata = {
  title: "The Cam Crew_TVM | CCTV & Security Solutions",
  description:
    "CCTV surveillance, security systems, access control and installation services in Trivandrum, Kerala.",
};

const services = [
  { icon: Camera, title: "CCTV Surveillance", description: "HD / IP / AI Cameras" },
  { icon: Monitor, title: "DVR / NVR Systems", description: "Recording & Monitoring" },
  { icon: Wifi, title: "Network & Cabling", description: "Structured & Reliable" },
  { icon: LockKeyhole, title: "Access Control", description: "Entry & Attendance" },
  { icon: Settings, title: "AMC & Support", description: "Maintenance & Service" },
];

const highlights = [
  { icon: UsersRound, title: "Trusted Experience", description: "Practical field expertise" },
  { icon: Headset, title: "Quick Support", description: "Responsive & reliable" },
  { icon: ShieldCheck, title: "Genuine Products", description: "Branded & warranty backed" },
  { icon: MapPin, title: "Service Coverage", description: "Trivandrum & surrounding areas" },
];

export default function HomePage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand} aria-label="The Cam Crew TVM home">
            <span className={styles.brandIcon} aria-hidden="true">
              <ScanEye size={51} strokeWidth={2.1} />
            </span>
            <span className={styles.brandText}>
              <span className={styles.brandName}>The <b>Cam</b> Crew_TVM</span>
              <span className={styles.brandSub}>Automation &amp; Security Surveillance</span>
            </span>
          </Link>

          <nav className={styles.nav} aria-label="Main navigation">
            <Link className={styles.activeLink} href="/">Home</Link>
            <Link href="/#services">Services</Link>
            <Link href="/client-request">Request Service</Link>
            <Link href="/#about">About Us</Link>
            <Link href="/#contact">Contact</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className={styles.hero} aria-labelledby="hero-heading">
          <div className={styles.heroPhoto} aria-hidden="true" />
          <div className={styles.heroShade} aria-hidden="true" />

          <div className={styles.heroContent}>
            <div className={styles.eyebrow}>CCTV <span>|</span> SECURITY <span>|</span> AUTOMATION</div>
            <h1 id="hero-heading" className={styles.heroTitle}>
              Complete Security<br />
              Solutions for Your<br />
              <span>Home &amp; Business</span>
            </h1>
            <p className={styles.heroDescription}>
              Professional installation, reliable service and ongoing support<br className={styles.desktopBreak} />
              for CCTV, access control and security automation.
            </p>
            <div className={styles.heroButtons}>
              <Link href="/client-request" className={styles.requestButton}>
                <ClipboardPenLine size={22} /> Client Request Form <ArrowRight size={23} />
              </Link>
            </div>
            <div className={styles.benefits}>
              <span><Check size={17} /> Site Survey &amp; Consultation</span>
              <span><Check size={17} /> Professional Installation</span>
              <span><Check size={17} /> After-Sales Support</span>
            </div>
          </div>

          <div className={styles.servicePanel} id="services">
            {services.map(({ icon: Icon, title, description }) => (
              <div key={title} className={styles.serviceItem}>
                <Icon className={styles.serviceIcon} size={39} strokeWidth={2.05} />
                <div className={styles.serviceCopy}>
                  <strong>{title}</strong>
                  <span>{description}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.trustStrip} aria-label="Why choose The Cam Crew TVM">
          <div className={styles.trustInner}>
            {highlights.map(({ icon: Icon, title, description }) => (
              <div className={styles.trustItem} key={title}>
                <Icon size={46} strokeWidth={2.1} aria-hidden="true" />
                <div><strong>{title}</strong><span>{description}</span></div>
              </div>
            ))}
          </div>
        </section>

        {/* 3D orbit animation based on the supplied video reference */}
        <OrbitingServices />

        
<section className={styles.aboutSection} id="about">
  <div className={styles.aboutContent}>

    {/* LEFT SIDE */}
    <div className={styles.aboutText}>
      <span className={styles.sectionLabel}>
        <span className={styles.labelDot} />
        ABOUT THE CAM CREW_TVM
      </span>

      <h2>
        Protecting What Matters.
        <span> Securing Your Future.</span>
      </h2>

      <p className={styles.aboutLead}>
        Smart Security. Reliable Technology.
        Professional Service.
      </p>

      <p className={styles.aboutDescription}>
        At The Cam Crew_TVM, we deliver reliable
        security and automation solutions designed
        for homes, businesses, and institutions.
        From CCTV installation and surveillance
        systems to networking, access control,
        and technical maintenance, we focus on
        practical protection and dependable support.
      </p>

      <div className={styles.aboutFeatures}>
        <div className={styles.aboutFeature}>
          <ShieldCheck size={21} />
          <span>Reliable Security Solutions</span>
        </div>

        <div className={styles.aboutFeature}>
          <Camera size={21} />
          <span>Professional CCTV Installation</span>
        </div>

        <div className={styles.aboutFeature}>
          <LockKeyhole size={21} />
          <span>Smart Access Control</span>
        </div>

        <div className={styles.aboutFeature}>
          <Headset size={21} />
          <span>Service & Technical Support</span>
        </div>
      </div>

      <Link
        href="/client-request"
        className={styles.aboutAction}
      >
        Request a Service
        <ArrowRight size={19} />
      </Link>
    </div>

    {/* RIGHT SIDE */}
    <div className={styles.aboutShowcase}>
      <div className={styles.showcaseGrid} />

      <div className={styles.showcaseGlow} />

      <div className={styles.showcaseIcon}>
        <ShieldCheck size={76} strokeWidth={1.4} />
      </div>

      <div className={styles.showcaseMain}>
        <span className={styles.showcaseEyebrow}>
          SECURITY • SURVEILLANCE • AUTOMATION
        </span>

        <h3>
          Your Security.
          <span> Our Priority.</span>
        </h3>

        <p>
          Smart solutions for safer homes,
          workplaces, and communities.
        </p>
      </div>

      <div className={styles.showcaseFooter}>
        <div>
          <Camera size={19} />
          <span>CCTV Solutions</span>
        </div>
        <div>
          <ShieldCheck size={19} />
          <span>Trusted Support</span>
        </div>
      </div>
    </div>

  </div>
</section>


        
<section className={styles.contactSection} id="contact">
  <div className={styles.contactContent}>

    {/* LEFT SIDE */}
    <div className={styles.contactInfo}>
      <span className={styles.sectionLabel}>
        CONTACT THE CAM CREW_TVM
      </span>

      <h2>
        Let's Make Your
        <span> Space More Secure.</span>
      </h2>

      <p className={styles.contactDescription}>
        Planning a CCTV installation? Need surveillance
        maintenance or technical assistance?
        Our team is here to help you with reliable
        security and automation solutions.
      </p>

      <div className={styles.contactHighlights}>
        <div className={styles.contactHighlight}>
          <div className={styles.highlightIcon}>
            <Headset size={23} />
          </div>
          <div>
            <strong>Technical Assistance</strong>
            <span>Installation, maintenance & support</span>
          </div>
        </div>

        <div className={styles.contactHighlight}>
          <div className={styles.highlightIcon}>
            <MapPin size={23} />
          </div>
          <div>
            <strong>Our Service Locations</strong>
            <span>
              Pothencode &amp; Vizhinjam,
              Trivandrum, Kerala
            </span>
          </div>
        </div>
      </div>

      <Link
        href="/client-request"
        className={styles.contactAction}
      >
        Submit a Service Request
        <ArrowRight size={19} />
      </Link>
    </div>

    {/* RIGHT SIDE */}
    <div className={styles.contactCard}>
      <div className={styles.contactCardTop}>
        <span className={styles.contactCardBadge}>
          GET IN TOUCH
        </span>

        <h3>
          How Can We
          <span> Help You?</span>
        </h3>

        <p>
          Contact our team for enquiries,
          installations, and technical assistance.
        </p>
      </div>

      <div className={styles.contactLinks}>

        <a href="tel:+918891177850">
          <div className={styles.contactLinkIcon}>
            <Phone size={21} />
          </div>
          <div className={styles.contactLinkText}>
            <span>CALL US</span>
            <strong>+91 8891177850</strong>
          </div>
          <ArrowRight size={18} />
        </a>

        <a href="tel:+918891177845">
          <div className={styles.contactLinkIcon}>
            <Phone size={21} />
          </div>
          <div className={styles.contactLinkText}>
            <span>ALTERNATIVE NUMBER</span>
            <strong>+91 8891177845</strong>
          </div>
          <ArrowRight size={18} />
        </a>

        <a href="mailto:tvmeservices@gmail.com">
          <div className={styles.contactLinkIcon}>
            <Mail size={21} />
          </div>
          <div className={styles.contactLinkText}>
            <span>EMAIL ADDRESS</span>
            <strong>tvmeservices@gmail.com</strong>
          </div>
          <ArrowRight size={18} />
        </a>

      </div>

      <div className={styles.contactCardFooter}>
        <MapPin size={17} />
        Pothencode &amp; Vizhinjam, Trivandrum
      </div>

    </div>

  </div>
</section>

      </main>

      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} The Cam Crew_TVM. All rights reserved.</span>
        <span><BadgeCheck size={17} /> Automation &amp; Security Surveillance</span>
      </footer>
    </div>
  );
}