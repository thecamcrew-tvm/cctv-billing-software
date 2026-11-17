"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import {
  Camera,
  Network,
  Fingerprint,
  BatteryCharging,
  Keyboard,
  ScanEye,
} from "lucide-react";
import styles from "./OrbitingServices.module.css";

// Both image paths below must exist under /public/services/.
// Every card shares the same abstract blue SVG background and has a
// separate, transparent PNG in the foreground.
const CARD_BACKGROUND = "/services/service-tech-bg.jpg";

const SERVICES = [
  {
    label: "SURVEILLANCE",
    name: "CCTV Cameras",
    detail: "HD, IP & AI camera systems",
    icon: Camera,
    image: "/services/cctv-camera.png",
    backgroundImage: CARD_BACKGROUND,
  },
  {
    label: "CONNECTIVITY",
    name: "Network Accessories",
    detail: "Routers, switches & networking solutions",
    icon: Network,
    image: "/services/network-accessories.png",
    backgroundImage: CARD_BACKGROUND,
  },
  {
    label: "BIOMETRICS",
    name: "Biometric Devices",
    detail: "Fingerprint and face access systems",
    icon: Fingerprint,
    image: "/services/biometric-devices.png",
    backgroundImage: CARD_BACKGROUND,
  },
  {
    label: "POWER BACKUP",
    name: "Inverters & UPS",
    detail: "Reliable backup power solutions",
    icon: BatteryCharging,
    image: "/services/inverter.png",
    backgroundImage: CARD_BACKGROUND,
  },
  {
    label: "PERIPHERALS",
    name: "Computer Accessories",
    detail: "Keyboards, mice & computer essentials",
    icon: Keyboard,
    image: "/services/computer-accessories.png",
    backgroundImage: CARD_BACKGROUND,
  },
];

const ROTATION_DURATION_MS = 25000;

function CardBackground({ src, mobile = false }) {
  return (
    <>
      <span
        className={mobile ? styles.mobileBackdrop : styles.cardBackdrop}
        style={{ backgroundImage: `url("${src}")` }}
        aria-hidden="true"
      />
      <span
        className={mobile ? styles.mobileShade : styles.cardShade}
        aria-hidden="true"
      />
    </>
  );
}

export default function OrbitingServices() {
  const orbitRef = useRef(null);
  const cardsRef = useRef([]);

  useEffect(() => {
    const orbit = orbitRef.current;
    if (!orbit) return;

    let animationFrame = 0;
    let lastTime = 0;
    let angleProgress = 0;
    let inView = true;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Position all five cards around a responsive ellipse.
    // Avoid React state updates on every animation frame.
    const positionCards = () => {
      const width = orbit.clientWidth;
      const height = orbit.clientHeight;
      if (!width || !height) return;

      const radiusX = width * 0.345;
      const radiusY = height * 0.27;

      cardsRef.current.forEach((card, index) => {
        if (!card) return;

        const angle =
          -Math.PI / 2 + (index * 2 * Math.PI) / SERVICES.length + angleProgress;
        const depth = Math.sin(angle);
        const x = Math.cos(angle) * radiusX;
        const y = Math.sin(angle) * radiusY;
        const z = depth * 42;
        const scale = 0.88 + ((depth + 1) / 2) * 0.17;
        const tilt = -Math.cos(angle) * 7;

        card.style.transform =
          `translate3d(calc(-50% + ${x.toFixed(2)}px), ` +
          `calc(-50% + ${y.toFixed(2)}px), ${z.toFixed(2)}px) ` +
          `rotateY(${tilt.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
        card.style.zIndex = String(Math.round((depth + 1) * 10 + 2));
        card.style.opacity = String(0.86 + ((depth + 1) / 2) * 0.14);
      });
    };

    const onFrame = (time) => {
      if (!lastTime) lastTime = time;
      const elapsed = Math.min(time - lastTime, 50);
      lastTime = time;

      if (inView && !document.hidden) {
        angleProgress += (elapsed / ROTATION_DURATION_MS) * Math.PI * 2;
      }

      positionCards();
      animationFrame = window.requestAnimationFrame(onFrame);
    };

    const resizeObserver = new ResizeObserver(positionCards);
    resizeObserver.observe(orbit);

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        inView = Boolean(entry?.isIntersecting);
        lastTime = 0; // avoid a jump when the section returns to view
      },
      { threshold: 0.02 }
    );
    intersectionObserver.observe(orbit);

    positionCards();
    if (!prefersReducedMotion) {
      animationFrame = window.requestAnimationFrame(onFrame);
    }

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, []);

  return (
    <section
      id="solutions-orbit"
      className={styles.section}
      aria-labelledby="orbit-heading"
    >
      <div className={styles.sectionInner}>
        <p className={styles.eyebrow}>THE CAM CREW_TVM • OUR SERVICES</p>
        <h2 id="orbit-heading" className={styles.heading}>
          Security Solutions <span>in Motion</span>
        </h2>
        <p className={styles.intro}>
          Modern surveillance, networking, biometric access, power backup and
          computer accessories for your home and business.
        </p>

        {/* Desktop: five cards orbit around the brand. */}
        <div ref={orbitRef} className={styles.orbitStage}>
          <div className={styles.ellipse} aria-hidden="true" />
          <div className={styles.innerGlow} aria-hidden="true" />
          <div className={styles.centerBrand} aria-hidden="true">
            <ScanEye size={36} strokeWidth={1.8} />
            <strong>The Cam Crew_TVM</strong>
            <span>AUTOMATION &amp; SECURITY</span>
          </div>

          {SERVICES.map(
            ({ label, name, detail, image, backgroundImage, icon: Icon }, index) => (
              <article
                key={label}
                ref={(element) => {
                  cardsRef.current[index] = element;
                }}
                className={styles.orbitCard}
              >
                <CardBackground src={backgroundImage} />
                <div className={styles.cardTop}>
                  <span className={styles.cardLabel}>{label}</span>
                  <Icon size={25} strokeWidth={1.8} aria-hidden="true" />
                </div>
                <div className={styles.serviceImage}>
                  <Image
                    src={image}
                    alt={`${name} equipment illustration`}
                    width={460}
                    height={460}
                    sizes="(max-width: 980px) 150px, 245px"
                    draggable={false}
                  />
                </div>
                <h3>{name}</h3>
                <p>{detail}</p>
              </article>
            )
          )}
        </div>

        {/* Tablet/phone: static cards with the same two image layers. */}
        <div className={styles.mobileGrid}>
          {SERVICES.map(({ label, name, detail, image, backgroundImage }) => (
            <article className={styles.mobileCard} key={label}>
              <CardBackground src={backgroundImage} mobile />
              <div className={styles.mobileImage}>
                <Image
                  src={image}
                  alt={`${name} equipment illustration`}
                  width={180}
                  height={180}
                  sizes="(max-width: 580px) 110px, 140px"
                  draggable={false}
                />
              </div>
              <div className={styles.mobileContent}>
                <span>{label}</span>
                <strong>{name}</strong>
                <p>{detail}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}