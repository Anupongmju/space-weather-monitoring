import React, { useEffect, useState, useRef } from 'react'

async function fetchMoonRA() {
  const now = new Date()
  const start = `'${now.toISOString().slice(0, 16).replace('T', ' ')}'`
  const end = `'${new Date(now.getTime() + 3600000).toISOString().slice(0, 16).replace('T', ' ')}'`

  const params = new URLSearchParams({
    format: 'json', COMMAND: '301', OBJ_DATA: 'NO', MAKE_EPHEM: 'YES', EPHEM_TYPE: 'OBSERVER',
    CENTER: '500@399', START_TIME: start, STOP_TIME: end, STEP_SIZE: '1h', QUANTITIES: "'1'",
  })

  try {
    const res = await fetch(`/jpl/api/horizons.api?${params}`)
    const data = await res.json()
    const text = data.result || ''

    const lines = text.split('\n')
    const dataStart = lines.findIndex(l => l.includes('$$SOE'))
    const dataEnd = lines.findIndex(l => l.includes('$$EOE'))
    if (dataStart === -1 || dataEnd === -1) return null

    const dataLine = lines[dataStart + 1]
    if (!dataLine) return null

    const cols = dataLine.trim().split(/\s+/)
    const raH = parseFloat(cols[2]) || 0
    const raM = parseFloat(cols[3]) || 0
    const raS = parseFloat(cols[4]) || 0
    const raHours = raH + raM / 60 + raS / 3600

    return raHours * 15 // RA in degrees
  } catch {
    return null
  }
}

function getAnalyticalMoonRA() {
  const now = new Date();

  // 1. Calculate Moon's Phase Angle (age) relative to a known New Moon (Dec 30, 2024 at 22:27 UTC)
  const knownNewMoon = new Date('2024-12-30T22:27:00Z').getTime();
  const diffDays = (now.getTime() - knownNewMoon) / (1000 * 60 * 60 * 24);
  const moonAge = diffDays % 29.53059;
  const moonPhaseAngle = (moonAge / 29.53059) * 360; // 0 to 360 degrees

  // 2. Calculate Sun's Right Ascension (approximate March Equinox)
  const equinox = new Date(`${now.getFullYear()}-03-20T09:00:00Z`).getTime();
  const daysSinceEquinox = (now.getTime() - equinox) / (1000 * 60 * 60 * 24);
  const sunRA = (daysSinceEquinox * 0.9856) % 360;

  // 3. Moon's RA = Sun's RA + Phase Angle
  let ra = (sunRA + moonPhaseAngle) % 360;
  if (ra < 0) ra += 360;
  return ra; // RA in degrees
}

const cleanDays = [
  '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
  '21', '22', '23', '24', '25', '26', '27', '28', '29', '30'
];

export default React.memo(function OrbitBackground() {
  const [moonRA, setMoonRA] = useState(null)
  const [activePlayer, setActivePlayer] = useState<'A' | 'B'>('A');
  const [dayIndexA, setDayIndexA] = useState(0);
  const [dayIndexB, setDayIndexB] = useState(1);

  const videoRefA = useRef<HTMLVideoElement | null>(null);
  const videoRefB = useRef<HTMLVideoElement | null>(null);

  const moonRaRef = useRef(0)
  const moonGroupRef = useRef(null)
  const moonShadowRef = useRef(null)
  const moonShadowOnEarthRef = useRef(null)
  const earthShadowOnMoonRef = useRef(null)
  const rotatingEarthRef = useRef(null)
  const thailandRef = useRef(null)
  const l1SatRef = useRef(null)
  const currentAngleRef = useRef(0)
  const goesSatRef = useRef<SVGGElement | null>(null)
  const issSatRef = useRef<SVGGElement | null>(null)
  const lroRef = useRef<SVGGElement | null>(null)
  const change7Ref = useRef<SVGGElement | null>(null)
  const solar1Ref = useRef<SVGGElement | null>(null)

  const handleEndedA = () => {
    if (videoRefB.current) {
      videoRefB.current.currentTime = 0;
      videoRefB.current.play().catch(() => {});
    }
    setActivePlayer('B');
    setDayIndexA((dayIndexB + 1) % cleanDays.length);
  };

  const handleEndedB = () => {
    if (videoRefA.current) {
      videoRefA.current.currentTime = 0;
      videoRefA.current.play().catch(() => {});
    }
    setActivePlayer('A');
    setDayIndexB((dayIndexA + 1) % cleanDays.length);
  };

  useEffect(() => {
    const load = async () => {
      const ra = await fetchMoonRA()
      if (ra !== null) {
        setMoonRA(ra)
        moonRaRef.current = ra
      } else {
        const fallbackRA = getAnalyticalMoonRA()
        setMoonRA(fallbackRA)
        moonRaRef.current = fallbackRA
      }
    }
    load()
    const t = setInterval(load, 60 * 60 * 1000)
    return () => clearInterval(t)
  }, [])

  // Smooth real-time animation logic for Moon using LHA
  useEffect(() => {
    let animationFrameId;
    const updateDOM = () => {
      const ra = moonRaRef.current;

      // Calculate real-time Local Hour Angle (LHA) for Bangkok (100.5018 E)
      const now = new Date();
      // Adjust timezone so the simulation aligns with the user's local clock hours
      const localTimeMs = now.getTime() - now.getTimezoneOffset() * 60 * 1000;
      const simulatedTimeMs = localTimeMs - 7 * 60 * 60 * 1000; // Simulated UTC time for Bangkok (UTC+7)
      const simulatedNow = new Date(simulatedTimeMs);

      const timeMs = simulatedNow.getTime();
      const jd = (timeMs / 86400000) + 2440587.5;
      const d = jd - 2451545.0;

      let gmst = (280.46061837 + 360.98564736629 * d) % 360;
      if (gmst < 0) gmst += 360;

      let lst = (gmst + 100.5018) % 360;
      let lha = (lst - ra) % 360;
      if (lha < 0) lha += 360;

      // Calculate Earth's Rotation Angle & Thailand's Angle based on real time
      const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
      const bangkokHours = (utcHours + 7) % 24;
      const thTargetAngle = 360 - (bangkokHours / 24) * 360;
      const earthRotation = thTargetAngle - 50;

      // ── Real Astronomical Moon Position (29.5-day Lunar Orbit & Phase) ──
      // Calculate real-time Moon Phase / RA in degrees
      const moonDeg = ra !== null && ra !== 0 ? ra : getAnalyticalMoonRA();
      // Map phase/RA to diagram angle around Earth (Sun is at -X / 180 degrees)
      const target = Math.PI + (moonDeg * Math.PI) / 180;
      const current = currentAngleRef.current;

      // Smooth angle easing
      let diff = target - current;
      if (diff > Math.PI) diff -= 2 * Math.PI;
      if (diff < -Math.PI) diff += 2 * Math.PI;

      if (Math.abs(diff) > 0.001) {
        currentAngleRef.current += diff * 0.04;
      } else {
        currentAngleRef.current = target;
      }

      const angle = currentAngleRef.current;
      const x = EARTH_X + MOON_RX * Math.cos(angle);
      const y = CY + MOON_RY * Math.sin(angle);

      if (moonGroupRef.current) {
        moonGroupRef.current.setAttribute('transform', `translate(${x}, ${y})`);
      }

      if (moonShadowRef.current) {
        const sunAngle = Math.atan2(y - CY, x - SUN_X);
        moonShadowRef.current.setAttribute('x1', `${50 - 50 * Math.cos(sunAngle)}%`);
        moonShadowRef.current.setAttribute('y1', `${50 - 50 * Math.sin(sunAngle)}%`);
        moonShadowRef.current.setAttribute('x2', `${50 + 50 * Math.cos(sunAngle)}%`);
        moonShadowRef.current.setAttribute('y2', `${50 + 50 * Math.sin(sunAngle)}%`);
      }

      // --- Moon's Shadow on Earth (Solar Eclipse) ---
      if (moonShadowOnEarthRef.current) {
        if (x < EARTH_X) {
          const scale = (EARTH_X - SUN_X) / (x - SUN_X);
          const sy = CY + (y - CY) * scale;

          if (Math.abs(sy - CY) < 140) {
            const sx = EARTH_X - Math.sqrt(140 * 140 - (sy - CY) * (sy - CY));
            moonShadowOnEarthRef.current.setAttribute('cx', `${sx}`);
            moonShadowOnEarthRef.current.setAttribute('cy', `${sy}`);
            const opacity = Math.max(0, 0.75 * (1 - Math.abs(sy - CY) / 140));
            moonShadowOnEarthRef.current.setAttribute('opacity', `${opacity}`);
          } else {
            moonShadowOnEarthRef.current.setAttribute('opacity', '0');
          }
        } else {
          moonShadowOnEarthRef.current.setAttribute('opacity', '0');
        }
      }

      // --- Earth's Shadow on Moon (Lunar Eclipse) ---
      if (earthShadowOnMoonRef.current) {
        if (x > EARTH_X && Math.abs(y - CY) < 140) {
          const distFromCenter = Math.abs(y - CY);
          const opacity = Math.max(0, 0.9 * (1 - distFromCenter / 140));
          earthShadowOnMoonRef.current.setAttribute('opacity', `${opacity}`);
        } else {
          earthShadowOnMoonRef.current.setAttribute('opacity', '0');
        }
      }

      // --- Earth's Rotation & Thailand Indicator ---
      if (rotatingEarthRef.current) {
        rotatingEarthRef.current.setAttribute('transform', `rotate(${earthRotation}, ${EARTH_X}, ${CY})`);
      }
      if (thailandRef.current) {
        const thRadius = 116.05; // Math.sqrt(74.6*74.6 + 88.9*88.9)
        const thAngleRad = (thTargetAngle * Math.PI) / 180;
        const thX = EARTH_X + thRadius * Math.cos(thAngleRad);
        const thY = CY + thRadius * Math.sin(thAngleRad);
        thailandRef.current.setAttribute('transform', `translate(${thX}, ${thY})`);
      }

      animationFrameId = requestAnimationFrame(updateDOM);
    };

    updateDOM();
    return () => cancelAnimationFrame(animationFrameId);
  }, [moonRA]);

  useEffect(() => {
    let animationFrameId: number;
    const animateGoes = () => {
      const t = Date.now() / 1000;
      const speed = 0.08;
      const phaseOffset = Math.PI;
      const angle = -t * speed + phaseOffset; // ลบ = หมุนทวนเข็มนาฬิกา (CCW)
      const rx = 190;
      const ry = 190;
      const x = EARTH_X + rx * Math.cos(angle);
      const y = CY + ry * Math.sin(angle);

      if (goesSatRef.current) {
        // คำนวณมุมที่ดาวเทียมต้องหันเข้าหาโลก
        // atan2 ให้มุมจากดาวเทียม → โลก ในหน่วยเรเดียน
        const toEarthAngle = Math.atan2(CY - y, EARTH_X - x);
        // Antenna อยู่ที่ -Y (ชี้ขึ้น) ในพิกัดท้องถิ่น → +90° เพื่อจัด alignment
        const rotateDeg = (toEarthAngle * 180) / Math.PI + 90;

        goesSatRef.current.setAttribute(
          'transform',
          `translate(${x}, ${y}) rotate(${rotateDeg})`
        );
      }
      animationFrameId = requestAnimationFrame(animateGoes);
    };
    animateGoes();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // ISS (International Space Station) in Low Earth Orbit (LEO)
  useEffect(() => {
    let animationFrameId: number;
    const animateISS = () => {
      const t = Date.now() / 1000;
      const speed = 0.14;
      const phaseOffset = Math.PI * 0.35;
      const angle = -t * speed + phaseOffset;

      const rx = 158;
      const ry = 158;
      const tiltRad = (28 * Math.PI) / 180;

      const x0 = rx * Math.cos(angle);
      const y0 = ry * Math.sin(angle);

      const x = EARTH_X + (x0 * Math.cos(tiltRad) - y0 * Math.sin(tiltRad));
      const y = CY + (x0 * Math.sin(tiltRad) + y0 * Math.cos(tiltRad));

      if (issSatRef.current) {
        const toEarthAngle = Math.atan2(CY - y, EARTH_X - x);
        const rotateDeg = (toEarthAngle * 180) / Math.PI + 90;
        issSatRef.current.setAttribute(
          'transform',
          `translate(${x}, ${y}) rotate(${rotateDeg})`
        );
      }
      animationFrameId = requestAnimationFrame(animateISS);
    };
    animateISS();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // LRO (Lunar Reconnaissance Orbiter) orbiting the Moon
  useEffect(() => {
    let animationFrameId: number;
    const animateLRO = () => {
      const t = Date.now() / 1000;
      const speed = 0.2;
      const phaseOffset = Math.PI * 1.5;
      const angle = -t * speed + phaseOffset; // ลบ = หมุนทวนเข็มนาฬิกา (CCW)
      const r = 80; // orbit radius from Moon center (Moon radius = 35px)
      const x = r * Math.cos(angle);
      const y = r * Math.sin(angle);

      // Always face toward Moon center (0, 0 in Moon's local coordinates)
      const toMoonAngle = Math.atan2(-y, -x);
      const rotateDeg = (toMoonAngle * 180) / Math.PI + 90;

      if (lroRef.current) {
        lroRef.current.setAttribute('transform', `translate(${x}, ${y}) rotate(${rotateDeg})`);
      }
      animationFrameId = requestAnimationFrame(animateLRO);
    };
    animateLRO();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Chang'e-7 (China Lunar Polar Exploration Orbiter)
  useEffect(() => {
    let animationFrameId: number;
    const animateChange7 = () => {
      const t = Date.now() / 1000;
      const speed = 0.16;
      const phaseOffset = Math.PI * 0.8;
      const angle = -t * speed + phaseOffset; // ลบ = หมุนทวนเข็มนาฬิกา (CCW)

      const rx = 55;
      const ry = 105;
      const tiltRad = (-35 * Math.PI) / 180; // -35 degrees inclination tilt

      const x0 = rx * Math.cos(angle);
      const y0 = ry * Math.sin(angle);

      // Rotate point by tiltRad
      const x = x0 * Math.cos(tiltRad) - y0 * Math.sin(tiltRad);
      const y = x0 * Math.sin(tiltRad) + y0 * Math.cos(tiltRad);

      const toMoonAngle = Math.atan2(-y, -x);
      const rotateDeg = (toMoonAngle * 180) / Math.PI + 90;

      if (change7Ref.current) {
        change7Ref.current.setAttribute('transform', `translate(${x}, ${y}) rotate(${rotateDeg})`);
      }
      animationFrameId = requestAnimationFrame(animateChange7);
    };
    animateChange7();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Inclined Outer Halo Orbit animation for Solar-1 (Aditya-L1) at L1
  useEffect(() => {
    let animationFrameId: number;
    const animateSolar1 = () => {
      const t = Date.now() / 1000;
      const speed = (2 * Math.PI) / 38; // 38 sec period
      const phaseOffset = Math.PI * 0.4;
      const angle = -t * speed + phaseOffset; // Counter-rotating

      const rx = 70; // Outer horizontal radius
      const ry = 32; // Outer vertical radius
      const tiltRad = (-25 * Math.PI) / 180; // Tilted -25 degrees

      const x0 = rx * Math.cos(angle);
      const y0 = ry * Math.sin(angle);

      // Rotate point by tiltRad
      const dx = x0 * Math.cos(tiltRad) - y0 * Math.sin(tiltRad);
      const dy = x0 * Math.sin(tiltRad) + y0 * Math.cos(tiltRad);

      if (solar1Ref.current) {
        solar1Ref.current.setAttribute('transform', `translate(${dx}, ${dy})`);
      }
      animationFrameId = requestAnimationFrame(animateSolar1);
    };
    animateSolar1();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Vertical Lissajous Halo Orbit animation for DSCOVR at L1
  useEffect(() => {
    let animationFrameId: number;
    const animateSat = () => {
      const t = Date.now() / 1000;
      // Vertical Lissajous figure-8 curve
      const wx = (2 * Math.PI) / 26; // 26 sec period X
      const wy = (2 * Math.PI) / 13; // 13 sec period Y (2:1 resonance)
      const dx = 30 * Math.sin(wx * t);
      const dy = 56 * Math.sin(wy * t);

      if (l1SatRef.current) {
        l1SatRef.current.setAttribute('transform', `translate(${dx}, ${dy})`);
      }
      animationFrameId = requestAnimationFrame(animateSat);
    };
    animateSat();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const W = 1920;
  const H = 1080;
  const CY = H / 2;
  const EARTH_X = 1350;
  const SUN_X = -100;
  const MOON_RX = 380;
  const MOON_RY = 220;
  const ACE_X = EARTH_X - 600;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
      background: '#000000'
    }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ display: 'block', width: '100%', height: '100%' }}
      >
        <defs>
          {/* ── SUN (Fallback if image fails) ── */}
          <radialGradient id="bgSunCore" cx="30%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="20%" stopColor="#fff1cc" />
            <stop offset="60%" stopColor="#ff8c00" />
            <stop offset="100%" stopColor="#ff0000" />
          </radialGradient>

          <radialGradient id="bgSunCorona" cx="30%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff6600" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#ff1100" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          {/* ── EARTH ── */}
          <radialGradient id="bgEarth" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#73c2fb" />
            <stop offset="40%" stopColor="#1e5bbd" />
            <stop offset="75%" stopColor="#082b6b" />
            <stop offset="100%" stopColor="#020817" />
          </radialGradient>

          <radialGradient id="bgEarthAtmo" cx="50%" cy="50%" r="50%">
            <stop offset="80%" stopColor="#4fc3f7" stopOpacity="0" />
            <stop offset="92%" stopColor="#4fc3f7" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#4fc3f7" stopOpacity="0" />
          </radialGradient>

          <pattern id="earthPattern" x="0" y="0" width="1" height="1" viewBox="0 0 280 280">
            <image href="https://eoimages.gsfc.nasa.gov/images/imagerecords/78000/78349/arctic_vir_2012147.jpg" x="0" y="0" width="280" height="280" preserveAspectRatio="xMidYMid slice" />
          </pattern>

          <linearGradient id="earthShadow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="30%" stopColor="black" stopOpacity="0" />
            <stop offset="60%" stopColor="black" stopOpacity="0.6" />
            <stop offset="90%" stopColor="black" stopOpacity="0.9" />
            <stop offset="100%" stopColor="black" stopOpacity="0.95" />
          </linearGradient>

          {/* ── MOON ── */}
          <radialGradient id="bgMoon" cx="30%" cy="30%" r="60%">
            <stop offset="0%" stopColor="#e6e6e6" />
            <stop offset="40%" stopColor="#a0a0a0" />
            <stop offset="70%" stopColor="#555555" />
            <stop offset="100%" stopColor="#111111" />
          </radialGradient>

          <pattern id="moonPattern" x="0" y="0" width="1" height="1" viewBox="0 0 70 70">
            <image href="https://upload.wikimedia.org/wikipedia/commons/1/10/Supermoon_Nov-14-2016-minneapolis.jpg" x="0" y="0" width="70" height="70" preserveAspectRatio="xMidYMid slice" />
          </pattern>

          <linearGradient id="moonShadow" ref={moonShadowRef} x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="20%" stopColor="black" stopOpacity="0" />
            <stop offset="50%" stopColor="black" stopOpacity="0.6" />
            <stop offset="90%" stopColor="black" stopOpacity="0.95" />
          </linearGradient>

          {/* ── FILTERS ── */}
          <filter id="shadowBlur" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="8" />
          </filter>

          <filter id="glowHeavy" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="60" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="glowSoft" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="15" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Dedicated filter for magnetic field lines — strong neon glow */}
          <filter id="magFieldGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur2" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="magFieldGlowOuter" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="22" result="bigBlur" />
            <feMerge>
              <feMergeNode in="bigBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* ── PATTERNS ── */}
          <pattern id="bgStars" width="600" height="600" patternUnits="userSpaceOnUse">
            <circle cx="50" cy="150" r="1.5" fill="#ffffff" opacity="0.4" />
            <circle cx="120" cy="50" r="1" fill="#ffffff" opacity="0.2" />
            <circle cx="280" cy="90" r="2" fill="#ffffff" opacity="0.3" />
            <circle cx="450" cy="250" r="1" fill="#ffffff" opacity="0.5" />
            <circle cx="200" cy="420" r="1.5" fill="#ffffff" opacity="0.2" />
            <circle cx="80" cy="560" r="2" fill="#ffffff" opacity="0.1" />
            <circle cx="510" cy="20" r="1.2" fill="#ffffff" opacity="0.3" />
            <circle cx="380" cy="480" r="0.8" fill="#ffffff" opacity="0.4" />
          </pattern>

          {/* Sun Image Mask */}
          <clipPath id="sunClip">
            <circle cx={SUN_X} cy={CY} r="600" />
          </clipPath>

          {/* ── GOES Satellite Gradients ── */}
          <linearGradient id="goesSatBody" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8ab4d4" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#3a6080" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#1a3050" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id="goesSolarPanel" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1a2a4a" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#0a3060" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0a1520" stopOpacity="0.95" />
          </linearGradient>

          {/* ── LRO Satellite Gradients (warm amber tone) ── */}
          <linearGradient id="lroSatBody" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#c8a060" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#7a5020" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#3a2510" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id="lroSolarPanel" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2a1a08" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#3a2a0a" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#1a1005" stopOpacity="0.95" />
          </linearGradient>

          {/* ── CHANG'E-7 Satellite Gradients (Crimson / Gold CNSA theme) ── */}
          <linearGradient id="change7SatBody" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d93838" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#991b1b" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#450a0a" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id="change7SolarPanel" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#0f172a" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0.95" />
          </linearGradient>

          {/* ── DSCOVR Satellite Gradients (Cyan/Gold Deep Space theme) ── */}
          <linearGradient id="dscovrSatBody" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#0284c7" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#0369a1" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id="dscovrSolarPanel" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#1e3a5f" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0b1329" stopOpacity="0.95" />
          </linearGradient>

          <linearGradient id="dscovrFoil" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#b45309" stopOpacity="0.9" />
          </linearGradient>

          {/* ── SOLAR-1 Probe Gradients (Fiery Heat Shield theme) ── */}
          <linearGradient id="solar1Shield" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="50%" stopColor="#fed7aa" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id="solar1Body" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#78716c" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#292524" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#0c0a09" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* Space Background + Static Stars */}
        <rect width="100%" height="100%" fill="url(#bgStars)" />

        {/* Dynamic Twinkling & Glowing Stars Layer (Behind Sun Layout) */}
        <g id="twinklingStarsLayer">
          {/* Sparkle 4-point stars
          <path d="M 650,80 L 652,85 L 657,87 L 652,89 L 650,94 L 648,89 L 643,87 L 648,85 Z" fill="#ffffff" className="twinkle-star-1" />
          <path d="M 1250,100 L 1253,107 L 1260,110 L 1253,113 L 1250,120 L 1247,113 L 1240,110 L 1247,107 Z" fill="#a2d5f2" className="twinkle-star-3" />
          <path d="M 850,520 L 853,526 L 859,529 L 853,532 L 850,538 L 847,532 L 841,529 L 847,526 Z" fill="#ffffff" className="twinkle-star-2" />
          <path d="M 1300,850 L 1303,856 L 1309,859 L 1303,862 L 1300,868 L 1297,862 L 1291,859 L 1297,856 Z" fill="#89cff0" className="twinkle-star-5" /> */}

          {/* Twinkling star circles */}
          <circle cx="450" cy="120" r="1.8" fill="#ffffff" className="twinkle-star-1" />
          <circle cx="950" cy="220" r="1.5" fill="#89cff0" className="twinkle-star-3" />
          <circle cx="1550" cy="180" r="2.0" fill="#a2d5f2" className="twinkle-star-5" />

          <circle cx="550" cy="380" r="1.6" fill="#89cff0" className="twinkle-star-1" />
          <circle cx="1150" cy="410" r="2.2" fill="#ffffff" className="twinkle-star-2" />
          <circle cx="1450" cy="490" r="2.0" fill="#a2d5f2" className="twinkle-star-4" />

          <circle cx="700" cy="820" r="2.2" fill="#ffffff" className="twinkle-star-5" />
          <circle cx="1000" cy="710" r="1.5" fill="#89cff0" className="twinkle-star-1" />
          <circle cx="1600" cy="780" r="2.0" fill="#a2d5f2" className="twinkle-star-4" />

          <circle cx="480" cy="980" r="1.6" fill="#89cff0" className="twinkle-star-2" />
          <circle cx="780" cy="920" r="2.0" fill="#a2d5f2" className="twinkle-star-3" />
          <circle cx="1080" cy="990" r="2.5" fill="#ffffff" className="twinkle-star-1" />
          <circle cx="1380" cy="940" r="1.8" fill="#89cff0" className="twinkle-star-5" />
        </g>

        {/* ── SUN (Using SDO Image with Screen Blend) ── */}
        {/* Glow behind sun */}
        <circle cx={SUN_X} cy={CY} r="900" fill="url(#bgSunCorona)" />

        {/* Static image fallback */}
        <image
          href="https://sdo.gsfc.nasa.gov/assets/img/latest/latest_1024_0304.jpg"
          x={SUN_X - 600} y={CY - 600}
          width="1200" height="1200"
          style={{ mixBlendMode: 'screen' }}
          opacity="0.9"
        />

        {/* Zero-Blink Double-Buffered SDO 304 Video Playlist for Month 6 (June 2026) */}
        {/*
        <foreignObject
          x={SUN_X - 600} y={CY - 600}
          width="1200" height="1200"
        >
          <video
            ref={videoRefA}
            src={`https://sdo.gsfc.nasa.gov/assets/img/dailymov/2026/06/${cleanDays[dayIndexA]}/202606${cleanDays[dayIndexA]}_1024_0304.mp4`}
            autoPlay
            loop={false}
            muted
            playsInline
            preload="auto"
            onEnded={handleEndedA}
            style={{
              position: 'absolute',
              top: 0, left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              mixBlendMode: 'screen',
              opacity: activePlayer === 'A' ? 0.9 : 0,
              pointerEvents: activePlayer === 'A' ? 'auto' : 'none',
            }}
          />

          <video
            ref={videoRefB}
            src={`https://sdo.gsfc.nasa.gov/assets/img/dailymov/2026/06/${cleanDays[dayIndexB]}/202606${cleanDays[dayIndexB]}_1024_0304.mp4`}
            loop={false}
            muted
            playsInline
            preload="auto"
            onEnded={handleEndedB}
            style={{
              position: 'absolute',
              top: 0, left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              mixBlendMode: 'screen',
              opacity: activePlayer === 'B' ? 0.9 : 0,
              pointerEvents: activePlayer === 'B' ? 'auto' : 'none',
            }}
          />
        </foreignObject>
        */}





        {/* ── EARTH ── */}
        <g>
          {/* Glow */}
          {/* <circle cx={EARTH_X} cy={CY} r="160" fill="url(#bgEarthAtmo)" /> */}

          {/* Rotating Earth Body */}
          <g ref={rotatingEarthRef}>
            {/* Fallback Body and Image using Pattern */}
            <circle cx={EARTH_X} cy={CY} r="140" fill="url(#bgEarth)" />
            <circle cx={EARTH_X} cy={CY} r="140" fill="url(#earthPattern)" />
          </g>
          {/* ── GOES Orbit Path ── */}
          <ellipse
            cx={EARTH_X}
            cy={CY}
            rx={190}
            ry={190}
            fill="none"
            stroke="rgba(0,229,255,0.15)"
            strokeWidth="1"
            strokeDasharray="4 8"
          />

          {/* ── ISS LEO Orbit Path ── */}
          <ellipse
            cx={EARTH_X}
            cy={CY}
            rx={158}
            ry={158}
            fill="none"
            stroke="rgba(96, 165, 250, 0.25)"
            strokeWidth="1"
            strokeDasharray="4 6"
            transform={`rotate(28, ${EARTH_X}, ${CY})`}
          />

          {/* Shadow on Earth (Always fixed pointing away from the Sun) */}
          <circle
            cx={EARTH_X} cy={CY} r="140"
            fill="url(#earthShadow)"
          />

          {/* Atmosphere rim */}
          {/* <circle cx={EARTH_X} cy={CY} r="140" fill="none" stroke="#4fc3f7" strokeWidth="2" opacity="0.4" /> */}

          {/* Moon's shadow on Earth (Solar Eclipse) */}
          <circle
            ref={moonShadowOnEarthRef}
            cx={EARTH_X}
            cy={CY}
            r="16"
            fill="black"
            opacity="0"
            filter="url(#shadowBlur)"
          />

          {/* Rotating Thailand Indicator (placed on top of shadow and atmosphere to be always visible) */}
          <g ref={thailandRef} transform={`translate(${EARTH_X + 74.6}, ${CY + 88.9})`}>
            <circle cx="0" cy="0" r="5" fill="none" stroke="#00e5ff" strokeWidth="1.5" opacity="0.8">
              <animate attributeName="r" values="2;9" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="0" cy="0" r="2" fill="#00e5ff" />
            <text x="6" y="3" fill="rgba(0, 229, 255, 0.95)" fontSize="9" fontFamily="monospace" fontWeight="bold">THAI</text>
          </g>

          {/* GOES Satellite — detailed design */}
          <g ref={goesSatRef}>
            {/* Glow halo */}
            <circle cx="0" cy="0" r="12" fill="rgba(0,229,255,0.08)" />

            {/* Solar panel — left */}
            <rect x="-26" y="-2" width="14" height="8" rx="1"
              fill="url(#goesSolarPanel)" stroke="rgba(0,229,255,0.6)" strokeWidth="0.5" />
            {/* Solar panel dividers — left */}
            <line x1="-22" y1="-2" x2="-22" y2="6" stroke="rgba(0,229,255,0.5)" strokeWidth="0.5" />
            <line x1="-18" y1="-2" x2="-18" y2="6" stroke="rgba(0,229,255,0.5)" strokeWidth="0.5" />

            {/* Solar panel — right */}
            <rect x="12" y="-2" width="14" height="8" rx="1"
              fill="url(#goesSolarPanel)" stroke="rgba(0,229,255,0.6)" strokeWidth="0.5" />
            {/* Solar panel dividers — right */}
            <line x1="16" y1="-2" x2="16" y2="6" stroke="rgba(0,229,255,0.5)" strokeWidth="0.5" />
            <line x1="20" y1="-2" x2="20" y2="6" stroke="rgba(0,229,255,0.5)" strokeWidth="0.5" />

            {/* Body connection arms */}
            <line x1="-12" y1="2" x2="-26" y2="2" stroke="rgba(200,220,255,0.5)" strokeWidth="1" />
            <line x1="12" y1="2" x2="26" y2="2" stroke="rgba(200,220,255,0.5)" strokeWidth="1" />

            {/* Main satellite body */}
            <rect x="-12" y="-6" width="24" height="14" rx="2"
              fill="url(#goesSatBody)" stroke="rgba(180,210,255,0.7)" strokeWidth="0.8" />
            {/* Body surface detail */}
            <rect x="-10" y="-4" width="20" height="3" rx="1" fill="rgba(255,255,255,0.06)" />
            <rect x="-10" y="1" width="20" height="3" rx="1" fill="rgba(255,255,255,0.04)" />

            {/* Antenna dish */}
            <ellipse cx="0" cy="-10" rx="6" ry="3" fill="none"
              stroke="rgba(200,230,255,0.8)" strokeWidth="0.8" />
            <line x1="0" y1="-7" x2="0" y2="-6" stroke="rgba(200,230,255,0.7)" strokeWidth="0.8" />

            {/* Signal pulse from antenna */}
            <circle cx="0" cy="-10" r="4" fill="none" stroke="rgba(0,229,255,0.6)" strokeWidth="0.5">
              <animate attributeName="r" values="4;14" dur="2.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0" dur="2.5s" repeatCount="indefinite" />
            </circle>

            {/* Label */}
            <text x="0" y="18" fill="rgba(0,229,255,0.85)" fontSize="7" fontFamily="monospace"
              fontWeight="bold" textAnchor="middle" letterSpacing="1">
              GOES
            </text>
          </g>

          {/* ISS (International Space Station) Satellite */}
          <g ref={issSatRef}>
            {/* Soft Glow */}
            <circle cx="0" cy="0" r="14" fill="rgba(96, 165, 250, 0.12)" />

            {/* Left Dual Solar Arrays */}
            <rect x="-28" y="-9" width="11" height="18" rx="1" fill="#1E293B" stroke="#60A5FA" strokeWidth="0.6" />
            <line x1="-28" y1="-4" x2="-17" y2="-4" stroke="rgba(96, 165, 250, 0.5)" strokeWidth="0.4" />
            <line x1="-28" y1="0" x2="-17" y2="0" stroke="rgba(96, 165, 250, 0.5)" strokeWidth="0.4" />
            <line x1="-28" y1="4" x2="-17" y2="4" stroke="rgba(96, 165, 250, 0.5)" strokeWidth="0.4" />

            {/* Right Dual Solar Arrays */}
            <rect x="17" y="-9" width="11" height="18" rx="1" fill="#1E293B" stroke="#60A5FA" strokeWidth="0.6" />
            <line x1="17" y1="-4" x2="28" y2="-4" stroke="rgba(96, 165, 250, 0.5)" strokeWidth="0.4" />
            <line x1="17" y1="0" x2="28" y2="0" stroke="rgba(96, 165, 250, 0.5)" strokeWidth="0.4" />
            <line x1="17" y1="4" x2="28" y2="4" stroke="rgba(96, 165, 250, 0.5)" strokeWidth="0.4" />

            {/* Main Integrated Truss Structure (Horizontal Spine) */}
            <line x1="-26" y1="0" x2="26" y2="0" stroke="#CBD5E1" strokeWidth="1.6" />

            {/* Central Habitation / Pressurized Modules (T-Shape Body) */}
            <rect x="-4" y="-7" width="8" height="14" rx="2" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="0.8" />
            <rect x="-7" y="-3" width="14" height="6" rx="1.5" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="0.8" />

            {/* Signal Beacon Pulse */}
            <circle cx="0" cy="0" r="3" fill="none" stroke="#60A5FA" strokeWidth="0.8">
              <animate attributeName="r" values="3;12" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.9;0" dur="2s" repeatCount="indefinite" />
            </circle>

            <circle cx="0" cy="0" r="1.5" fill="#3B82F6" />

            {/* Label */}
            <text x="0" y="16" fill="#60A5FA" fontSize="7" fontFamily="monospace"
              fontWeight="bold" textAnchor="middle" letterSpacing="1">
              ISS
            </text>
          </g>
        </g>

        {/* ── MOON ── */}
        <g ref={moonGroupRef} transform={`translate(${EARTH_X + MOON_RX}, ${CY})`}>
          {/* Fallback Body and Image using Pattern */}
          <circle cx="0" cy="0" r="35" fill="url(#bgMoon)" />
          <circle cx="0" cy="0" r="35" fill="url(#moonPattern)" />

          {/* Shadow on Moon */}
          <circle
            cx="0" cy="0" r="35"
            fill="url(#moonShadow)"
          />
          <circle cx="0" cy="0" r="35" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

          {/* Earth's shadow overlay on Moon (Lunar Eclipse) */}
          <circle
            ref={earthShadowOnMoonRef}
            cx="0"
            cy="0"
            r="35"
            fill="black"
            opacity="0"
          />

          {/* ── CHANG'E 8 LUNAR LANDER (South Pole Surface) ── */}
          <g transform="translate(16, 28) rotate(150) scale(0.65)">
            {/* Signal Radar Beacon Pulse */}
            <circle cx="0" cy="-14" r="3" fill="none" stroke="#FFD700" strokeWidth="0.8">
              <animate attributeName="r" values="3;16" dur="2.2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.9;0" dur="2.2s" repeatCount="indefinite" />
            </circle>

            {/* Solar Panel Wings (Left & Right) */}
            <rect x="-24" y="-4" width="12" height="6" rx="1" fill="#1E293B" stroke="#FFD700" strokeWidth="0.6" />
            <line x1="-20" y1="-4" x2="-20" y2="2" stroke="rgba(255,215,0,0.5)" strokeWidth="0.4" />
            <line x1="-16" y1="-4" x2="-16" y2="2" stroke="rgba(255,215,0,0.5)" strokeWidth="0.4" />

            <rect x="12" y="-4" width="12" height="6" rx="1" fill="#1E293B" stroke="#FFD700" strokeWidth="0.6" />
            <line x1="16" y1="-4" x2="16" y2="2" stroke="rgba(255,215,0,0.5)" strokeWidth="0.4" />
            <line x1="20" y1="-4" x2="20" y2="2" stroke="rgba(255,215,0,0.5)" strokeWidth="0.4" />

            {/* Connection Arms */}
            <line x1="-12" y1="-1" x2="-8" y2="-1" stroke="#E2E8F0" strokeWidth="0.8" />
            <line x1="8" y1="-1" x2="12" y2="-1" stroke="#E2E8F0" strokeWidth="0.8" />

            {/* Landing Legs & Footpads */}
            <line x1="-6" y1="4" x2="-14" y2="14" stroke="#D97706" strokeWidth="1.2" />
            <line x1="6" y1="4" x2="14" y2="14" stroke="#D97706" strokeWidth="1.2" />
            <circle cx="-14" cy="14" r="1.8" fill="#F59E0B" />
            <circle cx="14" cy="14" r="1.8" fill="#F59E0B" />

            {/* Central Octagonal Lander Body */}
            <rect x="-8" y="-6" width="16" height="10" rx="2" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.8" />
            <rect x="-6" y="-4" width="12" height="3" fill="#D97706" opacity="0.8" />

            {/* Upper Deck Payload Structure */}
            <rect x="-5" y="-12" width="10" height="6" rx="1" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="0.6" />
            
            {/* Robotic Sampling Arm */}
            <polyline points="-5,-8 -16,-12 -22,-6" fill="none" stroke="#E2E8F0" strokeWidth="0.8" />
            <circle cx="-22" cy="-6" r="1.2" fill="#FFD700" />

            {/* High-Gain Antenna */}
            <line x1="0" y1="-12" x2="0" y2="-16" stroke="#E2E8F0" strokeWidth="0.8" />
            <circle cx="0" cy="-16" r="2" fill="none" stroke="#FFD700" strokeWidth="0.6" />

            {/* Status Beacon Dot */}
            <circle cx="0" cy="0" r="1.5" fill="#10B981" />
          </g>

          {/* Chang'e-8 label — outside the rotated group */}
          <text
            x="28" y="48"
            fill="#FFD700" fontSize="9" fontFamily="monospace"
            fontWeight="bold" textAnchor="middle" letterSpacing="0.8"
          >
            CHANG’E-8
          </text>

          {/* LRO orbit ring around Moon */}
          <circle
            cx="0" cy="0" r="80"
            fill="none"
            stroke="rgba(255,200,80,0.2)"
            strokeWidth="1"
            strokeDasharray="3 6"
          />

          {/* LRO — Lunar Reconnaissance Orbiter */}
          <g ref={lroRef}>
            {/* Glow */}
            <circle cx="0" cy="0" r="8" fill="rgba(255,200,80,0.07)" />

            {/* Solar panel — left */}
            <rect x="-17" y="-1.5" width="10" height="6" rx="1"
              fill="url(#lroSolarPanel)" stroke="rgba(255,200,80,0.55)" strokeWidth="0.5" />
            <line x1="-14" y1="-1.5" x2="-14" y2="4.5" stroke="rgba(255,200,80,0.4)" strokeWidth="0.4" />
            <line x1="-11" y1="-1.5" x2="-11" y2="4.5" stroke="rgba(255,200,80,0.4)" strokeWidth="0.4" />

            {/* Solar panel — right */}
            <rect x="7" y="-1.5" width="10" height="6" rx="1"
              fill="url(#lroSolarPanel)" stroke="rgba(255,200,80,0.55)" strokeWidth="0.5" />
            <line x1="10" y1="-1.5" x2="10" y2="4.5" stroke="rgba(255,200,80,0.4)" strokeWidth="0.4" />
            <line x1="13" y1="-1.5" x2="13" y2="4.5" stroke="rgba(255,200,80,0.4)" strokeWidth="0.4" />

            {/* Body connection arms */}
            <line x1="-7" y1="1.5" x2="-17" y2="1.5" stroke="rgba(220,200,150,0.4)" strokeWidth="0.7" />
            <line x1="7" y1="1.5" x2="17" y2="1.5" stroke="rgba(220,200,150,0.4)" strokeWidth="0.7" />

            {/* Main body */}
            <rect x="-7" y="-4" width="14" height="9" rx="1.5"
              fill="url(#lroSatBody)" stroke="rgba(220,200,150,0.65)" strokeWidth="0.7" />
            {/* Body surface detail */}
            <rect x="-5" y="-2.5" width="10" height="2" rx="0.5" fill="rgba(255,255,255,0.05)" />

            {/* Mini antenna */}
            <line x1="0" y1="-4" x2="0" y2="-8" stroke="rgba(220,200,150,0.7)" strokeWidth="0.6" />
            <circle cx="0" cy="-8" r="1.5" fill="none" stroke="rgba(255,200,80,0.7)" strokeWidth="0.5" />

            {/* Scan pulse */}
            <circle cx="0" cy="-8" r="2" fill="none" stroke="rgba(255,200,80,0.5)" strokeWidth="0.4">
              <animate attributeName="r" values="2;9" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;0" dur="2s" repeatCount="indefinite" />
            </circle>

            {/* Label */}
            <text x="0" y="14" fill="rgba(255,200,80,0.8)" fontSize="8" fontFamily="monospace"
              fontWeight="bold" textAnchor="middle" letterSpacing="0.8">
              LRO
            </text>
          </g>

          {/* ── CHANG'E-7 INCLINED POLAR ORBIT RING ── */}
          <g transform="rotate(-35)">
            <ellipse
              cx="0" cy="0"
              rx="55" ry="105"
              fill="none"
              stroke="rgba(255, 77, 77, 0.21)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          </g>

          {/* ── CHANG'E-7 SATELLITE (Lunar Polar Orbiter) ── */}
          <g ref={change7Ref}>
            {/* Glow */}
            <circle cx="0" cy="0" r="9" fill="rgba(255,77,77,0.15)" />

            {/* Left Solar Panel */}
            <rect x="-18" y="-2.5" width="10" height="7" rx="1"
              fill="url(#change7SolarPanel)" stroke="#FFD700" strokeWidth="0.5" />
            <line x1="-15" y1="-2.5" x2="-15" y2="4.5" stroke="rgba(255,215,0,0.5)" strokeWidth="0.4" />
            <line x1="-12" y1="-2.5" x2="-12" y2="4.5" stroke="rgba(255,215,0,0.5)" strokeWidth="0.4" />

            {/* Right Solar Panel */}
            <rect x="8" y="-2.5" width="10" height="7" rx="1"
              fill="url(#change7SolarPanel)" stroke="#FFD700" strokeWidth="0.5" />
            <line x1="11" y1="-2.5" x2="11" y2="4.5" stroke="rgba(255,215,0,0.5)" strokeWidth="0.4" />
            <line x1="14" y1="-2.5" x2="14" y2="4.5" stroke="rgba(255,215,0,0.5)" strokeWidth="0.4" />

            {/* Connecting struts */}
            <line x1="-8" y1="1" x2="-18" y2="1" stroke="#E2E8F0" strokeWidth="0.8" />
            <line x1="8" y1="1" x2="18" y2="1" stroke="#E2E8F0" strokeWidth="0.8" />

            {/* Main Satellite Body */}
            <rect x="-8" y="-5" width="16" height="10" rx="2"
              fill="url(#change7SatBody)" stroke="#FFD700" strokeWidth="0.8" />
            <rect x="-6" y="-3" width="12" height="2" rx="0.5" fill="rgba(255,215,0,0.4)" />

            {/* High-Gain Antenna Dish */}
            <line x1="0" y1="-5" x2="0" y2="-9" stroke="#E2E8F0" strokeWidth="0.8" />
            <ellipse cx="0" cy="-9" rx="3.5" ry="1.8" fill="none" stroke="#FFD700" strokeWidth="0.7" />

            {/* Signal Pulse */}
            <circle cx="0" cy="-9" r="2" fill="none" stroke="rgba(255,77,77,0.8)" strokeWidth="0.5">
              <animate attributeName="r" values="2;10" dur="1.8s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0" dur="1.8s" repeatCount="indefinite" />
            </circle>

            {/* Label */}
            <text x="0" y="15" fill="#FF4D4D" fontSize="8" fontFamily="monospace"
              fontWeight="bold" textAnchor="middle" letterSpacing="0.8">
              CHANG’E-7
            </text>
          </g>
        </g>

        {/* Moon orbit path */}
        <ellipse cx={EARTH_X} cy={CY} rx={MOON_RX} ry={MOON_RY} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="6 12" />

        {/* Lagrange L1 Indicator */}
        <g transform={`translate(${EARTH_X - 600}, ${CY})`}>
          {/* L1 Center Point */}
          <circle cx="0" cy="0" r="3" fill="rgba(255,87,34,0.4)" />
          <text x="0" y="-12" fill="rgba(255,87,34,0.5)" fontSize="10" fontFamily="monospace" textAnchor="middle" letterSpacing="1">L1</text>

          {/* L1 Orbit Rings (DSCOVR vertical & SOLAR-1 inclined horizontal) */}
          <ellipse cx="0" cy="0" rx="30" ry="56" fill="none" stroke="rgba(56,189,248,0.15)" strokeWidth="0.8" strokeDasharray="3 5" />
          <g transform="rotate(-25)">
            <ellipse cx="0" cy="0" rx="70" ry="32" fill="none" stroke="rgba(255,140,0,0.18)" strokeWidth="0.8" strokeDasharray="3 5" />
          </g>

          {/* DSCOVR / ACE Satellite orbiting L1 */}
          <g ref={l1SatRef}>
            {/* Halo Orbit Trail / Glow */}
            <circle cx="0" cy="0" r="18" fill="rgba(56, 189, 248, 0.08)" />

            {/* Solar Panel Wing - Left */}
            <rect x="-26" y="-2" width="14" height="8" rx="1"
              fill="url(#dscovrSolarPanel)" stroke="#38bdf8" strokeWidth="0.6" />
            <line x1="-22" y1="-2" x2="-22" y2="6" stroke="rgba(56, 189, 248, 0.5)" strokeWidth="0.4" />
            <line x1="-18" y1="-2" x2="-18" y2="6" stroke="rgba(56, 189, 248, 0.5)" strokeWidth="0.4" />

            {/* Solar Panel Wing - Right */}
            <rect x="12" y="-2" width="14" height="8" rx="1"
              fill="url(#dscovrSolarPanel)" stroke="#38bdf8" strokeWidth="0.6" />
            <line x1="16" y1="-2" x2="16" y2="6" stroke="rgba(56, 189, 248, 0.5)" strokeWidth="0.4" />
            <line x1="20" y1="-2" x2="20" y2="6" stroke="rgba(56, 189, 248, 0.5)" strokeWidth="0.4" />

            {/* Solar Panel Struts */}
            <line x1="-12" y1="2" x2="-26" y2="2" stroke="#94a3b8" strokeWidth="0.8" />
            <line x1="12" y1="2" x2="26" y2="2" stroke="#94a3b8" strokeWidth="0.8" />

            {/* Magnetometer Boom Arm */}
            <line x1="0" y1="7" x2="0" y2="18" stroke="#38bdf8" strokeWidth="0.8" />
            <circle cx="0" cy="18" r="1.5" fill="#f59e0b" />

            {/* Main Satellite Body */}
            <rect x="-12" y="-7" width="24" height="14" rx="2"
              fill="url(#dscovrSatBody)" stroke="#bae6fd" strokeWidth="0.8" />

            {/* Gold Thermal Blanket Foil Trim */}
            <rect x="-10" y="-5" width="20" height="3" rx="0.8" fill="url(#dscovrFoil)" />

            {/* EPIC Camera Aperture / Telescope Lens */}
            <circle cx="0" cy="0" r="3" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.8" />
            <circle cx="0" cy="0" r="1" fill="#38bdf8" />

            {/* Solar Wind PlasMag Sensor Dome */}
            <circle cx="6" cy="-7" r="1.8" fill="#f59e0b" stroke="#e0f2fe" strokeWidth="0.4" />

            {/* Scanning / Earth Telemetry Pulse */}
            <circle cx="0" cy="0" r="4" fill="none" stroke="rgba(56, 189, 248, 0.7)" strokeWidth="0.5">
              <animate attributeName="r" values="4;16" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0" dur="2.4s" repeatCount="indefinite" />
            </circle>

            {/* Label */}
            <text x="0" y="27" fill="#38bdf8" fontSize="8" fontFamily="monospace"
              fontWeight="bold" textAnchor="middle" letterSpacing="1">
              ACE
            </text>
          </g>

          {/* SOLAR-1 (Aditya-L1) Satellite orbiting L1 */}
          <g ref={solar1Ref}>
            {/* Thermal Glow Halo */}
            <circle cx="0" cy="0" r="14" fill="rgba(255,140,0,0.15)" />

            {/* Left Solar Wing (Angled back) */}
            <rect x="-24" y="2" width="12" height="6" rx="1"
              fill="#1c1917" stroke="#f97316" strokeWidth="0.5" />
            <line x1="-20" y1="2" x2="-20" y2="8" stroke="rgba(249,115,22,0.4)" strokeWidth="0.4" />
            <line x1="-16" y1="2" x2="-16" y2="8" stroke="rgba(249,115,22,0.4)" strokeWidth="0.4" />

            {/* Right Solar Wing (Angled back) */}
            <rect x="12" y="2" width="12" height="6" rx="1"
              fill="#1c1917" stroke="#f97316" strokeWidth="0.5" />
            <line x1="16" y1="2" x2="16" y2="8" stroke="rgba(249,115,22,0.4)" strokeWidth="0.4" />
            <line x1="20" y1="2" x2="20" y2="8" stroke="rgba(249,115,22,0.4)" strokeWidth="0.4" />

            {/* Connecting struts */}
            <line x1="-8" y1="5" x2="-24" y2="5" stroke="#78716c" strokeWidth="0.8" />
            <line x1="8" y1="5" x2="24" y2="5" stroke="#78716c" strokeWidth="0.8" />

            {/* Main Bus Body */}
            <rect x="-9" y="-3" width="18" height="12" rx="1.5"
              fill="url(#solar1Body)" stroke="#f97316" strokeWidth="0.8" />
            <rect x="-7" y="-1" width="14" height="2" rx="0.5" fill="rgba(251,146,60,0.4)" />

            {/* Curved Carbon-Composite Heat Shield (Facing Sun) */}
            <path d="M -16,-7 Q 0,-13 16,-7 L 14,-2 Q 0,-7 -14,-2 Z"
              fill="url(#solar1Shield)" stroke="#ea580c" strokeWidth="0.7" />

            {/* Magnetometer / Plasma Instrument Boom */}
            <line x1="0" y1="9" x2="0" y2="18" stroke="#fb923c" strokeWidth="0.8" />
            <circle cx="0" cy="18" r="1.5" fill="#f97316" />

            {/* Thermal / Corona Measurement Pulse */}
            <circle cx="0" cy="-7" r="3" fill="none" stroke="rgba(249,115,22,0.8)" strokeWidth="0.5">
              <animate attributeName="r" values="3;14" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" />
            </circle>

            {/* Label */}
            <text x="0" y="27" fill="#fb923c" fontSize="8" fontFamily="monospace"
              fontWeight="bold" textAnchor="middle" letterSpacing="1">
              SOLAR-1
            </text>
          </g>
        </g>



      </svg>

      <style>{`
        /* Removed heavy animations for performance */
      `}</style>
    </div>
  )
}
)
