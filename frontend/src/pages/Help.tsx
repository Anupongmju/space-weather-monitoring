import { useState } from 'react'
import OrbitBackground from '../components/space/OrbitBackground'

// ── Translation Types & Data ──────────────────────────────────────────────
type Language = 'TH' | 'EN'

interface DocContent {
  title: string
  subtitle: string
  introText: string
  sourceGuide: string
  sourceDesc: string
  goesTitle: string
  goesDesc: string
  aceTitle: string
  aceDesc: string
  cosmicTitle: string
  cosmicDesc: string
  scalesTitle: string
  scalesDesc: string
  faqTitle: string
  faqDesc: string
  glossaryTitle: string
  glossaryDesc: string
}

const TRANSLATIONS: Record<Language, DocContent> = {
  TH: {
    title: 'คู่มือและการช่วยเหลือ',
    subtitle: 'ทำความเข้าใจข้อมูลสภาพอวกาศและวิธีการใช้งานแดชบอร์ด',
    introText: 'ยินดีต้อนรับสู่ศูนย์ข้อมูลสภาพอวกาศ คู่มือนี้จะช่วยอธิบายวิธีการอ่านข้อมูลกราฟวิทยาศาสตร์ เครื่องมือวัดบนดาวเทียมและสถานีภาคพื้นดิน รวมถึงดัชนีแจ้งเตือนต่าง ๆ เพื่อการใช้งานที่เต็มประสิทธิภาพ',
    sourceGuide: 'คู่มือเครื่องมือวัดและดาวเทียม',
    sourceDesc: 'คำอธิบายตัวชี้วัดสำคัญจากอุปกรณ์ตรวจวัดแต่ละแหล่ง',
    goesTitle: 'เครื่องวัดจากดาวเทียม GOES',
    goesDesc: 'ดาวเทียมวงโคจรค้างฟ้าที่ติดตามสภาวะของโลกรอบนอกในแบบเรียลไทม์:',
    aceTitle: 'เครื่องวัดจากดาวเทียม ACE',
    aceDesc: 'จอดอยู่ที่จุด L1 ห่างจากโลก 1.5 ล้านกิโลเมตร ทำหน้าที่เสมือนระบบเตือนภัยล่วงหน้า:',
    cosmicTitle: 'สถานีรังสีคอสมิกและนิวตรอน',
    cosmicDesc: 'ตรวจจับอนุภาคพลังงานสูงจากห้วงอวกาศลึกที่ผ่านบรรยากาศโลกลงมาถึงภาคพื้นดิน:',
    scalesTitle: 'ระดับแจ้งเตือนพายุอวกาศ (NOAA Scales)',
    scalesDesc: 'เกณฑ์ความรุนแรงตามมาตรฐานสากล แบ่งออกเป็น 3 ประเภทหลัก',
    faqTitle: 'คำถามที่พบบ่อย (FAQs)',
    faqDesc: 'คำถามและข้อสงสัยเกี่ยวกับการใช้งานและการอัปเดตข้อมูล',
    glossaryTitle: 'อภิธานศัพท์และหน่วยวัด',
    glossaryDesc: 'คำศัพท์และอักษรย่อทางวิทยาศาสตร์เพื่อความเข้าใจเพิ่มเติม',
  },
  EN: {
    title: 'Help & Documentation',
    subtitle: 'Understand space weather parameters and how to navigate the dashboard',
    introText: 'Welcome to the Space Weather Hub Help Center. This guide explains how to read scientific charts, satellite telemetry, ground station data, and alert scales for an optimal dashboard experience.',
    sourceGuide: 'Instruments & Satellite Guide',
    sourceDesc: 'Explaining key metrics captured by various space weather monitors.',
    goesTitle: 'GOES Satellites Instrumentation',
    goesDesc: 'Geostationary satellites monitoring the Earth\'s outer space environment in real time:',
    aceTitle: 'ACE Satellite Instrumentation',
    aceDesc: 'Stationed at the L1 Lagrange point, serving as an early-warning system (30-60 mins ahead):',
    cosmicTitle: 'Cosmic Ray Stations & Neutron Monitors',
    cosmicDesc: 'Ground-based monitors detecting galactic cosmic rays penetrating Earth\'s atmosphere:',
    scalesTitle: 'Space Weather Alert Scales (NOAA Scales)',
    scalesDesc: 'Standardized scales for space weather effects, categorized into 3 main groups.',
    faqTitle: 'Frequently Asked Questions (FAQs)',
    faqDesc: 'Common questions regarding platform usage and data updates.',
    glossaryTitle: 'Glossary & Measurement Units',
    glossaryDesc: 'Definitions of scientific abbreviations and telemetry units.',
  }
}

// ── Detailed Instrument Guide Data ──────────────────────────────────────────
interface InfoCardData {
  name: string
  desc: string
  unit: string
  why: string
}

const INSTRUMENTS_INFO: Record<Language, { goes: InfoCardData[], ace: InfoCardData[], cosmic: InfoCardData[] }> = {
  TH: {
    goes: [
      { name: 'X-ray Flux (รังสีเอกซ์)', desc: 'ตรวจวัดรังสีคลื่นสั้นเพื่อจัดระดับความแรงของพายุสุริยะ (Solar Flare)', unit: 'Watts/m²', why: 'มีผลต่อการสื่อสารวิทยุความถี่สูง (HF) และสัญญาณจีพีเอสสะดุด' },
      { name: 'Proton Flux (โปรตอน)', desc: 'ความหนาแน่นของโปรตอนพลังงานสูงที่พุ่งเข้าใส่โลก', unit: 'pfu (particle flux units)', why: 'เป็นรังสีอันตรายต่อนักบินอวกาศ อุปกรณ์อิเล็กทรอนิกส์ดาวเทียม และเที่ยวบินใกล้ขั้วโลก' },
      { name: 'Electron Flux (อิเล็กตรอน)', desc: 'การกระจายตัวของอิเล็กตรอนพลังงานสูงในชั้นบรรยากาศชั้นนอกสุด', unit: 'pfu', why: 'ทำให้เกิดการสะสมประจุบนตัวดาวเทียม นำไปสู่การชอร์ตลัดวงจร' },
      { name: 'Solar Wind (ลมสุริยะ)', desc: 'กระแสของประจุไฟฟ้าที่พัดออกมาจากดวงอาทิตย์', unit: 'km/s & counts/cm³', why: 'หากมีความเร็วสูง (เกิน 500 km/s) จะเริ่มส่งผลกระทบให้เกิดพายุแม่เหล็กโลก' },
    ],
    ace: [
      { name: 'IMF Bz (สนามแม่เหล็กระหว่างดวงดาว)', desc: 'ส่วนประกอบแนวตั้งของสนามแม่เหล็กสุริยะที่ทอดมาถึงโลก', unit: 'nT (Nanotesla)', why: 'หากมีค่าเป็นลบ (Bz ชี้ลงใต้) สนามแม่เหล็กดวงอาทิตย์จะเชื่อมเข้ากับสนามแม่เหล็กโลกได้ง่าย ส่งผลให้เกิดพายุแม่เหล็กโลกขนาดใหญ่' },
      { name: 'SWEPAM Plasma Speed', desc: 'วัดความเร็วและความหนาแน่นของลมสุริยะก่อนกระทบโลกจริง', unit: 'km/s', why: 'แจ้งเตือนสถานการณ์ลมสุริยะความเร็วสูงล่วงหน้า 30-60 นาที' },
      { name: 'EPAM / SIS', desc: 'เครื่องมือวัดปริมาณอนุภาคพลังงานต่ำและระบบไอโซโทปสุริยะ', unit: 'counts / MeV', why: 'ใช้ประเมินพายุรังสีที่กำลังจะเดินทางมาถึงเขตวงโคจรโลก' },
    ],
    cosmic: [
      { name: 'Neutron Monitor Counts', desc: 'ตรวจวัดจำนวนนิวตรอนทุติยภูมิที่เกิดจากรังสีคอสมิกชนบรรยากาศโลก', unit: 'counts/second', why: 'ใช้ศึกษาดวงอาทิตย์และตรวจจับการระเบิดของรังสีระดับรุนแรง (Ground Level Enhancements)' },
      { name: 'MAW Pressure (ความกดอากาศ)', desc: 'ความกดอากาศในบริเวณที่ตั้งของสถานีตรวจวัด Mawson', unit: 'hPa / mmHg', why: 'ความหนาแน่นของบรรยากาศส่งผลให้ปริมาณนิวตรอนที่ผ่านลงมาเปลี่ยนไป จึงต้องนำมาหักล้างชดเชยค่าความถูกต้อง' },
      { name: 'Mawson Tubes & Scatter', desc: 'ข้อมูลจากท่อตรวจวัดและแผนภูมิการกระเจิงของรังสีคอสมิก', unit: 'Ratio / Counts', why: 'ใช้วิเคราะห์การเบี่ยงเบนของเส้นทางรังสีคอสมิกผ่านอิทธิพลของสนามแม่เหล็กโลก' },
    ]
  },
  EN: {
    goes: [
      { name: 'X-ray Flux', desc: 'Measures shortwave electromagnetic radiation to classify Solar Flares.', unit: 'Watts/m²', why: 'Key trigger for High Frequency (HF) radio blackouts and satellite GPS degradation.' },
      { name: 'Proton Flux', desc: 'Measures density of high-energy protons arriving near Earth.', unit: 'pfu (particle flux units)', why: 'Poses radiation hazards for astronauts, satellite hardware, and polar aviation.' },
      { name: 'Electron Flux', desc: 'Tracks high-energy electrons trapped in Earth\'s outer magnetosphere.', unit: 'pfu', why: 'Induces electrostatic discharge (ESD) that can damage satellite electronics.' },
      { name: 'Solar Wind', desc: 'Monitors the speed and density of particle streams from the coronal atmosphere.', unit: 'km/s & counts/cm³', why: 'Speeds exceeding 500 km/s indicate active coronal holes or CMEs that trigger geomagnetic storms.' },
    ],
    ace: [
      { name: 'IMF Bz', desc: 'Vertical component of the Interplanetary Magnetic Field.', unit: 'nT (Nanotesla)', why: 'A negative (southward) Bz facilitates geomagnetic reconnection, allowing solar energy to enter Earth\'s magnetosphere.' },
      { name: 'SWEPAM Plasma Speed', desc: 'Measures the speed and density of solar wind plasma at L1 point.', unit: 'km/s', why: 'Provides early warning of approaching high-speed solar wind streams 30-60 minutes out.' },
      { name: 'EPAM / SIS', desc: 'Instruments measuring low-energy particles and solar isotope variations.', unit: 'counts / MeV', why: 'Evaluates upcoming solar energetic particle (SEP) events.' },
    ],
    cosmic: [
      { name: 'Neutron Monitor Counts', desc: 'Measures secondary neutrons generated when cosmic rays strike Earth\'s atmosphere.', unit: 'counts/second', why: 'Tracks solar cosmic rays and registers massive ground-level solar radiation events (GLEs).' },
      { name: 'MAW Pressure', desc: 'Barometric pressure at Mawson Station.', unit: 'hPa / mmHg', why: 'Atmospheric density shields neutrons. Pressure data is used to mathematically correct and calibrate the counts.' },
      { name: 'Mawson Tubes & Scatter', desc: 'Readouts from detector arrays and cosmic ray scattering plots.', unit: 'Ratio / Counts', why: 'Analyzes spatial cosmic ray fluctuations modulated by Earth\'s magnetosphere.' },
    ]
  }
}

// ── NOAA Scales ─────────────────────────────────────────────────────────────
interface ScaleInfo {
  level: string
  nameTH: string
  nameEN: string
  effectTH: string
  effectEN: string
  color: string
}

const SCALES_DATA: ScaleInfo[] = [
  {
    level: 'G1 - G5',
    nameTH: 'พายุแม่เหล็กโลก (Geomagnetic Storms)',
    nameEN: 'Geomagnetic Storms',
    effectTH: 'ผลกระทบจากลมสุริยะปะทะสนามแม่เหล็กโลก เกิดออโรราสีสวยงามที่ละติจูดต่ำ แต่หากรุนแรงระดับ G5 อาจทำลายระบบหม้อแปลงไฟฟ้าทั่วโลก',
    effectEN: 'Triggered by solar wind currents. Induces auroras in lower latitudes. Severe levels (G5) can overload and damage power grid transformers globally.',
    color: '#EF4444'
  },
  {
    level: 'S1 - S5',
    nameTH: 'พายุรังสีสุริยะ (Solar Radiation Storms)',
    nameEN: 'Solar Radiation Storms',
    effectTH: 'เกิดจากการพุ่งชนของโปรตอนพลังงานสูง รบกวนสัญญาณดาวเทียม เป็นภัยต่อสุขภาพนักบิน และขัดขวางการสื่อสารการบินละติจูดขั้วโลก',
    effectEN: 'Accelerated high-energy protons. Impairs satellite electronics, poses radiation risk to crews, and disrupts radio navigation at high latitudes.',
    color: '#3498DB'
  },
  {
    level: 'R1 - R5',
    nameTH: 'คลื่นวิทยุดับหาย (Radio Blackouts)',
    nameEN: 'Radio Blackouts',
    effectTH: 'ผลจากโซลาร์แฟลร์ปล่อยรังสีเอ็กซ์ความเข้มสูง ทำให้สัญญาณวิทยุความถี่สูง (HF) ดับหายทันทีในด้านที่เป็นเวลากลางวันของโลก',
    effectEN: 'Caused by high X-ray/EUV emissions from solar flares. Causes immediate HF radio signal loss and GPS anomalies on Earth\'s dayside.',
    color: '#F59E0B'
  }
]

// ── FAQs ────────────────────────────────────────────────────────────────────
interface FaqItem {
  qTH: string
  qEN: string
  aTH: string
  aEN: string
}

const FAQS_DATA: FaqItem[] = [
  {
    qTH: 'แดชบอร์ดนี้ดึงข้อมูลจากที่ใด และอัปเดตบ่อยแค่ไหน?',
    qEN: 'Where is the data sourced from and how often does it refresh?',
    aTH: 'ข้อมูลทั้งหมดดึงมาจาก API สาธารณะของหน่วยงานวิจัยระดับโลก ได้แก่ NOAA Space Weather Prediction Center (ดาวเทียม GOES/ACE/DSCOVR), สหพันธ์ดาราศาสตร์ และ Australian Antarctic Division (สถานี Mawson) โดยระบบจะทำการอัปเดตค่าล่าสุดโดยอัตโนมัติทุก ๆ 60 วินาทีผ่าน WebSocket/Backend Fetchers',
    aEN: 'All data is aggregated from open scientific APIs, including the NOAA Space Weather Prediction Center (GOES/ACE/DSCOVR satellites) and the Australian Antarctic Division (Mawson Station). Our backend fetches updates and streams them automatically every 60 seconds.'
  },
  {
    qTH: 'ทำไมในบางกราฟจึงมีช่วงข้อมูลขาดหาย (Data Gaps)?',
    qEN: 'Why are there missing segments or gaps in some of the charts?',
    aTH: 'เนื่องจากบางเครื่องตรวจวัดบนดาวเทียมอาศัยการสื่อสารระยะไกล และอาจเจอปัญหาทางเทคนิค เช่น ดาวเทียมเข้าสู่ช่วงปรับทิศทาง (Maneuver), สัญญาณTelemetry อ่อนกำลัง หรือเกิดสุริยคราสระหว่างโลกกับดาวเทียม (Eclipse Season) ซึ่งเป็นเรื่องปกติของเครื่องมือวิจัยทางดาราศาสตร์',
    aEN: 'Telemetry transmission gaps can occur due to orbital adjustment maneuvers, solar eclipses blocking satellite sensors (Eclipse Season), signal attenuation, or maintenance of receiving ground stations.'
  },
  {
    qTH: 'เวลาบนกราฟใช้เขตเวลาไหน?',
    qEN: 'Which timezone do the graphs display?',
    aTH: 'ระบบพยากรณ์และสภาพอวกาศส่วนใหญ่จะใช้เวลามาตรฐานสากล (UTC) เป็นหลักในการทำงาน อย่างไรก็ตาม แดชบอร์ดนี้ได้ทำการแปลงเวลาบนแกนกราฟบางส่วนให้อยู่ในรูปเวลาท้องถิ่นประเทศไทย (Bangkok Local Time, GMT+7) เพื่อให้ผู้ใช้อ่านเทียบเวลาได้สะดวกขึ้น',
    aEN: 'Space weather observations universally rely on Coordinated Universal Time (UTC). However, our graphs adapt values to your local device timezone (such as Bangkok Time GMT+7) for ease of tracking.'
  },
  {
    qTH: 'เราจะทราบได้อย่างไรว่ากำลังเกิดภัยจากพายุอวกาศขนาดใหญ่?',
    qEN: 'How do I know if a major space weather event is currently happening?',
    aTH: 'สามารถตรวจเช็คหน้า "Current Conditions" หรือระดับการแจ้งเตือนพายุในกล่อง Dashboard หลัก หากค่าดัชนีชี้ระดับเป็นสีส้ม-แดง หรือมีค่าเกณฑ์พุ่งเกินช่วงความคุมมาตรฐาน (เช่น พายุแม่เหล็กโลกระดับ G3 ขึ้นไป) แสดงว่ามีสภาพอากาศอวกาศระดับปั่นป่วนเกิดขึ้น',
    aEN: 'Check the "Current Conditions" page or dashboard widgets. Alert bars transitioning to orange/red (e.g. G3 storm level or higher) indicate an active, severe geomagnetic disturbance.'
  }
]

// ── Glossary ────────────────────────────────────────────────────────────────
interface GlossaryItem {
  term: string
  defTH: string
  defEN: string
}

const GLOSSARY_DATA: GlossaryItem[] = [
  { term: 'CME (Coronal Mass Ejection)', defTH: 'การพ่นมวลโคโรนาของดวงอาทิตย์ ปลดปล่อยกลุ่มก้อนพลาสมาและสนามแม่เหล็กขนาดมหึมาสู่อวกาศ', defEN: 'Coronal Mass Ejection: A massive eruption of solar wind plasma and magnetic fields into space.' },
  { term: 'Solar Flare (โซลาร์แฟลร์)', defTH: 'การระเบิดอย่างรุนแรงบนผิวหน้าดวงอาทิตย์ ส่งแสงและรังสีแม่เหล็กไฟฟ้าพลังงานสูงออกมาในชั่วพริบตา', defEN: 'A sudden, rapid flash of radiation on the Sun\'s surface, releasing massive electromagnetic energy.' },
  { term: 'Magnetosphere (สนามแม่เหล็กโลก)', defTH: 'บริเวณรอบโลกที่ถูกควบคุมโดยสนามแม่เหล็กของโลก ทำหน้าที่เป็นโล่กำบังรังสีจากลมสุริยะ', defEN: 'The region of space surrounding Earth dominated by its magnetic field, shielding us from solar radiation.' },
  { term: 'Kp Index (ดัชนีเคพี)', defTH: 'ดัชนีวัดความปั่นป่วนของสนามแม่เหล็กโลก มีค่าตั้งแต่ระดับ 0 (สงบ) ถึง 9 (พายุรุนแรงขั้นสูงสุด)', defEN: 'A global auroral activity index representing geomagnetic disturbances on a scale of 0 to 9.' },
  { term: 'IMF (Interplanetary Magnetic Field)', defTH: 'สนามแม่เหล็กดวงอาทิตย์ที่แพร่ออกไปในระบบสุริยะ ผ่านอิทธิพลการพัดพาของลมสุริยะ', defEN: 'Interplanetary Magnetic Field: The Sun\'s magnetic field carried into interplanetary space by the solar wind.' },
  { term: 'pfu (Particle Flux Unit)', defTH: 'หน่วยนับอัตราการไหลของอนุภาค คำนวณเป็น: อนุภาค / (วินาที · ตารางเซนติเมตร · สเตอเรเดียน)', defEN: 'Particle Flux Unit: Measured as 1 particle / (sec · cm² · steradian).' }
]

export default function Help() {
  const [lang, setLang] = useState<Language>('TH')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  const text = TRANSLATIONS[lang]
  const instruments = INSTRUMENTS_INFO[lang]

  return (
    <div style={{ position: 'relative', minHeight: 'calc(100vh - 120px)', boxSizing: 'border-box' }}>
      {/* ── Orbit Background ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.45 }}>
        <OrbitBackground />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1000px', margin: '0 auto', padding: '60px 20px 80px' }}>
        
        {/* ═══════════════════════════════════════════════════════════
            HEADER SECTION & LANGUAGE TOGGLE
        ═══════════════════════════════════════════════════════════ */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          paddingBottom: '30px',
          marginBottom: '40px',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              color: '#3498DB',
              marginBottom: '16px',
              padding: '6px 16px',
              border: '1px solid rgba(52,152,219,0.3)',
              background: 'rgba(52,152,219,0.06)',
            }}>
              <span style={{ width: '6px', height: '6px', background: '#3498DB', borderRadius: '50%', boxShadow: '0 0 8px #3498DB' }} />
              SPACE WEATHER HELP CENTER
            </div>
            <h1 style={{
              fontSize: '38px',
              fontWeight: '700',
              letterSpacing: '-1px',
              margin: '0 0 12px',
              fontFamily: 'var(--font-sans)',
              color: '#ffffff',
              lineHeight: '1.2',
            }}>
              {text.title}
            </h1>
            <p style={{
              color: 'rgba(255,255,255,0.6)',
              lineHeight: '1.6',
              fontSize: '14px',
              margin: 0,
              maxWidth: '650px'
            }}>
              {text.subtitle}
            </p>
          </div>

          {/* Local Switcher */}
          <div style={{
            display: 'flex',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(5,7,13,0.8)',
            padding: '2px',
            borderRadius: '4px'
          }}>
            <button 
              onClick={() => setLang('TH')}
              style={{
                padding: '6px 14px',
                background: lang === 'TH' ? '#3498DB' : 'transparent',
                color: lang === 'TH' ? '#000' : 'rgba(255,255,255,0.6)',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: '700',
                transition: 'all 0.2s',
                borderRadius: '2px'
              }}
            >
              TH
            </button>
            <button 
              onClick={() => setLang('EN')}
              style={{
                padding: '6px 14px',
                background: lang === 'EN' ? '#3498DB' : 'transparent',
                color: lang === 'EN' ? '#000' : 'rgba(255,255,255,0.6)',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: '700',
                transition: 'all 0.2s',
                borderRadius: '2px'
              }}
            >
              EN
            </button>
          </div>
        </div>

        <p style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: '14px',
          lineHeight: '1.7',
          padding: '20px',
          background: 'rgba(255,255,255,0.01)',
          borderLeft: '3px solid #3498DB',
          marginBottom: '50px'
        }}>
          {text.introText}
        </p>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 1: INSTRUMENT & TELEMETRY GUIDE
        ═══════════════════════════════════════════════════════════ */}
        <section style={{ marginBottom: '60px' }}>
          <h2 style={{ fontSize: '24px', color: '#ffffff', marginBottom: '8px', fontWeight: '600' }}>
            {text.sourceGuide}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontFamily: 'var(--font-mono)', marginBottom: '30px' }}>
            // {text.sourceDesc}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* GOES Guide */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', padding: '24px' }}>
              <h3 style={{ color: '#22c55e', fontSize: '16px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%' }} />
                {text.goesTitle}
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginBottom: '20px' }}>{text.goesDesc}</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                {instruments.goes.map(item => (
                  <InstrumentCard key={item.name} data={item} />
                ))}
              </div>
            </div>

            {/* ACE Guide */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', padding: '24px' }}>
              <h3 style={{ color: '#3b82f6', fontSize: '16px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', background: '#3b82f6', borderRadius: '50%' }} />
                {text.aceTitle}
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginBottom: '20px' }}>{text.aceDesc}</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                {instruments.ace.map(item => (
                  <InstrumentCard key={item.name} data={item} />
                ))}
              </div>
            </div>

            {/* Cosmic Guide */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', padding: '24px' }}>
              <h3 style={{ color: '#06b6d4', fontSize: '16px', fontWeight: '600', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', background: '#06b6d4', borderRadius: '50%' }} />
                {text.cosmicTitle}
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginBottom: '20px' }}>{text.cosmicDesc}</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                {instruments.cosmic.map(item => (
                  <InstrumentCard key={item.name} data={item} />
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 2: ALERT SCALES
        ═══════════════════════════════════════════════════════════ */}
        <section style={{ marginBottom: '60px' }}>
          <h2 style={{ fontSize: '24px', color: '#ffffff', marginBottom: '8px', fontWeight: '600' }}>
            {text.scalesTitle}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontFamily: 'var(--font-mono)', marginBottom: '24px' }}>
            // {text.scalesDesc}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {SCALES_DATA.map(scale => (
              <div 
                key={scale.level} 
                style={{ 
                  display: 'flex', 
                  background: 'rgba(255,255,255,0.02)', 
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}
              >
                <div style={{ 
                  background: scale.color, 
                  color: '#000000', 
                  width: '90px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '15px',
                  flexShrink: 0
                }}>
                  {scale.level}
                </div>
                <div style={{ padding: '20px', flex: 1 }}>
                  <h4 style={{ color: '#ffffff', fontSize: '15px', fontWeight: '600', margin: '0 0 6px' }}>
                    {lang === 'TH' ? scale.nameTH : scale.nameEN}
                  </h4>
                  <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12.5px', lineHeight: '1.6', margin: 0 }}>
                    {lang === 'TH' ? scale.effectTH : scale.effectEN}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 3: FAQS ACCORDION
        ═══════════════════════════════════════════════════════════ */}
        <section style={{ marginBottom: '60px' }}>
          <h2 style={{ fontSize: '24px', color: '#ffffff', marginBottom: '8px', fontWeight: '600' }}>
            {text.faqTitle}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontFamily: 'var(--font-mono)', marginBottom: '24px' }}>
            // {text.faqDesc}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {FAQS_DATA.map((faq, index) => {
              const isOpen = openFaq === index
              return (
                <div 
                  key={index} 
                  style={{ 
                    background: 'rgba(255,255,255,0.01)', 
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '4px',
                    transition: 'all 0.25s'
                  }}
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      padding: '18px 24px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      color: isOpen ? '#3498DB' : '#ffffff',
                      transition: 'color 0.2s'
                    }}
                  >
                    <span style={{ fontSize: '14.5px', fontWeight: '600', paddingRight: '20px' }}>
                      {lang === 'TH' ? faq.qTH : faq.qEN}
                    </span>
                    <span style={{ 
                      fontSize: '12px', 
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.25s',
                      color: '#3498DB'
                    }}>
                      ▼
                    </span>
                  </button>
                  
                  {isOpen && (
                    <div style={{ 
                      padding: '0 24px 20px', 
                      color: 'rgba(255,255,255,0.6)', 
                      fontSize: '13.5px', 
                      lineHeight: '1.7',
                      borderTop: '1px solid rgba(255,255,255,0.03)',
                      paddingTop: '16px'
                    }}>
                      {lang === 'TH' ? faq.aTH : faq.aEN}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════
            SECTION 4: TECHNICAL GLOSSARY
        ═══════════════════════════════════════════════════════════ */}
        <section>
          <h2 style={{ fontSize: '24px', color: '#ffffff', marginBottom: '8px', fontWeight: '600' }}>
            {text.glossaryTitle}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', fontFamily: 'var(--font-mono)', marginBottom: '24px' }}>
            // {text.glossaryDesc}
          </p>

          <div style={{ 
            background: 'rgba(255,255,255,0.01)', 
            border: '1px solid rgba(255,255,255,0.07)',
            padding: '10px 0',
            borderRadius: '4px'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <th style={{ padding: '12px 24px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#3498DB', letterSpacing: '1px', textTransform: 'uppercase', width: '220px' }}>Term / Acronym</th>
                  <th style={{ padding: '12px 24px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#3498DB', letterSpacing: '1px', textTransform: 'uppercase' }}>Definition</th>
                </tr>
              </thead>
              <tbody>
                {GLOSSARY_DATA.map((item, idx) => (
                  <tr 
                    key={item.term} 
                    style={{ 
                      borderBottom: idx === GLOSSARY_DATA.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.04)',
                      background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'
                    }}
                  >
                    <td style={{ padding: '16px 24px', color: '#ffffff', fontWeight: '700', fontSize: '13.5px', fontFamily: 'var(--font-mono)' }}>
                      {item.term}
                    </td>
                    <td style={{ padding: '16px 24px', color: 'rgba(255,255,255,0.55)', fontSize: '13px', lineHeight: '1.6' }}>
                      {lang === 'TH' ? item.defTH : item.defEN}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  )
}

// ── Sub-component ───────────────────────────────────────────────────────────
function InstrumentCard({ data }: { data: InfoCardData }) {
  return (
    <div style={{
      padding: '16px',
      background: 'rgba(255,255,255,0.01)',
      border: '1px solid rgba(255,255,255,0.04)',
      borderRadius: '4px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
        <h4 style={{ color: '#ffffff', fontSize: '13.5px', fontWeight: '700', margin: 0 }}>
          {data.name}
        </h4>
        <span style={{
          fontSize: '9px',
          fontFamily: 'var(--font-mono)',
          color: '#3498DB',
          background: 'rgba(52,152,219,0.08)',
          border: '1px solid rgba(52,152,219,0.2)',
          padding: '1px 6px',
          borderRadius: '2px',
          flexShrink: 0
        }}>
          {data.unit}
        </span>
      </div>
      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11.5px', lineHeight: '1.5', margin: 0 }}>
        {data.desc}
      </p>
      <div style={{ 
        marginTop: 'auto', 
        fontSize: '11px', 
        color: 'rgba(249,115,22,0.7)', 
        borderTop: '1px solid rgba(255,255,255,0.03)', 
        paddingTop: '6px',
        lineHeight: '1.4'
      }}>
        <strong>Effect:</strong> {data.why}
      </div>
    </div>
  )
}
