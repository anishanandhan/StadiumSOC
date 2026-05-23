import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Html5Qrcode } from 'html5-qrcode';
import { generateStadiumSOP } from '../utils/gemini';
import { fetchLiveStadiumWeather } from '../utils/weather';
import {
  LayoutDashboard, AlertTriangle, ShieldAlert, Ticket, Brain,
  BarChart3, LogOut, Radio, Users, CloudRain, Siren, Mic,
  MicOff, X, QrCode, Lock, Unlock,
  Activity, Zap, Shield, Eye
} from 'lucide-react';

// ─── Gate Definitions ───
const GATES = {
  gate1: { name: 'North Stand', short: 'G1', position: { left: '50%', top: '8%' } },
  gate2: { name: 'East Upper', short: 'G2', position: { left: '82%', top: '25%' } },
  gate3: { name: 'East Lower', short: 'G3', position: { left: '84%', top: '65%' } },
  gate4: { name: 'South Stand', short: 'G4', position: { left: '50%', top: '90%' } },
  gate5: { name: 'West Lower', short: 'G5', position: { left: '16%', top: '65%' } },
  gate6: { name: 'West Upper', short: 'G6', position: { left: '18%', top: '25%' } },
};

const INITIAL_GATE_DATA = {
  gate1: { occupancy: 45, rate: 120 },
  gate2: { occupancy: 62, rate: 185 },
  gate3: { occupancy: 78, rate: 210 },
  gate4: { occupancy: 35, rate: 95 },
  gate5: { occupancy: 55, rate: 150 },
  gate6: { occupancy: 42, rate: 110 },
};

const SIDEBAR_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Command Center' },
  { id: 'incidents', icon: AlertTriangle, label: 'Incidents', hasNotif: true },
  { id: 'security', icon: ShieldAlert, label: 'Security Ops' },
  { id: 'tickets', icon: Ticket, label: 'Ticket Operations' },
  { id: 'ai', icon: Brain, label: 'AI Ops' },
  { id: 'analytics', icon: BarChart3, label: 'Analytics' },
  { id: 'scan', icon: QrCode, label: 'Ingress Terminal' },
];

const BOOT_MESSAGES = [
  'Connecting to stadium sensor network...',
  'Loading Gemini AI threat models...',
  'Synchronizing gate telemetry...',
  'Calibrating crowd density heatmaps...',
  'Initializing PA broadcast system...',
  'Security Operations Center online.',
];

function getStatus(occ) {
  if (occ >= 85) return 'critical';
  if (occ >= 65) return 'moderate';
  return 'safe';
}

function getBarColor(occ) {
  if (occ >= 85) return 'var(--red)';
  if (occ >= 65) return 'var(--yellow)';
  return 'var(--green)';
}

function timeStr() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

function shortTime() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

// ═══════════════════════════════════════════════
// BOOT SCREEN
// ═══════════════════════════════════════════════
function BootScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [msgIdx, setMsgIdx] = useState(0);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let p = 0;
    let mi = 0;
    const interval = setInterval(() => {
      p += Math.random() * 12 + 6;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setTimeout(() => {
          onCompleteRef.current?.();
        }, 500);
      }
      setProgress(Math.min(p, 100));
      const newIdx = Math.min(
        Math.floor(p / (100 / BOOT_MESSAGES.length)),
        BOOT_MESSAGES.length - 1
      );
      if (newIdx !== mi) {
        mi = newIdx;
        setMsgIdx(newIdx);
      }
    }, 320);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="cc-boot">
      <div className="cc-boot-grid" />
      <motion.div
        className="cc-boot-content"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        {/* Logo */}
        <div className="cc-boot-logo" style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <img src="/Logo.png" alt="StadiumSOC Logo" style={{ height: '48px', width: 'auto', objectFit: 'contain' }} />
        </div>

        <h1>StadiumSOC</h1>
        <p className="cc-boot-subtitle">Security Operations Center</p>

        {/* Progress bar */}
        <div className="cc-boot-bar-wrap">
          <div className="cc-boot-bar">
            <motion.div
              className="cc-boot-bar-fill"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          </div>
          <span className="cc-boot-percent">{Math.round(progress)}%</span>
        </div>

        {/* Status message */}
        <AnimatePresence mode="wait">
          <motion.p
            key={msgIdx}
            className="cc-boot-msg"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {BOOT_MESSAGES[msgIdx]}
          </motion.p>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ─── SVG Math Helpers ───
function polarToCartesian(centerX, centerY, radiusX, radiusY, angleInDegrees) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radiusX * Math.cos(angleInRadians)),
    y: centerY + (radiusY * Math.sin(angleInRadians))
  };
}

function describeArc(x, y, innerRadiusX, innerRadiusY, outerRadiusX, outerRadiusY, startAngle, endAngle) {
  const start = polarToCartesian(x, y, outerRadiusX, outerRadiusY, endAngle);
  const end = polarToCartesian(x, y, outerRadiusX, outerRadiusY, startAngle);
  const startInner = polarToCartesian(x, y, innerRadiusX, innerRadiusY, startAngle);
  const endInner = polarToCartesian(x, y, innerRadiusX, innerRadiusY, endAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  return [
    "M", start.x, start.y,
    "A", outerRadiusX, outerRadiusY, 0, largeArcFlag, 0, end.x, end.y,
    "L", startInner.x, startInner.y,
    "A", innerRadiusX, innerRadiusY, 0, largeArcFlag, 1, endInner.x, endInner.y,
    "Z"
  ].join(" ");
}

// ─── Operational Security Sectors Meta ───
const SECTORS = [
  { id: 'sec1', name: 'Operational Sector Alpha', block: 'Block C', ingress: 'Gate A (G1)', officer: 'Officer Sharma', startAngle: 0, endAngle: 45, innerR: 105, outerR: 155, zone: 'North', description: 'Direct corridor from Gate A. Under Officer Sharma.' },
  { id: 'sec2', name: 'Operational Sector Beta', block: 'Block D', ingress: 'Gate B (G2)', officer: 'Officer Sharma', startAngle: 45, endAngle: 90, innerR: 105, outerR: 155, zone: 'North', description: 'East-North-East stands, assigned to Gate B access.' },
  { id: 'sec3', name: 'Operational Sector Gamma', block: 'Block P', ingress: 'Gate C (G3)', officer: 'Officer Ravi', startAngle: 90, endAngle: 135, innerR: 105, outerR: 155, zone: 'East', description: 'Eastern stand support. Ingress Point C. Ravi coordinate.' },
  { id: 'sec4', name: 'Operational Sector Delta', block: 'Block Q', ingress: 'Gate D (G4)', officer: 'Officer Ravi', startAngle: 135, endAngle: 180, innerR: 105, outerR: 155, zone: 'East', description: 'East-South General Admissions corridor. Ravi coordinate.' },
  { id: 'sec5', name: 'Operational Sector Epsilon', block: 'Block J', ingress: 'Gate E (G5)', officer: 'Officer Arjun', startAngle: 180, endAngle: 225, innerR: 105, outerR: 155, zone: 'West', description: 'South-West stands. Ingress Point E. Arjun coordinate.' },
  { id: 'sec6', name: 'Operational Sector Zeta', block: 'Block K', ingress: 'Gate F (G6)', officer: 'Officer Arjun', startAngle: 225, endAngle: 270, innerR: 105, outerR: 155, zone: 'West', description: 'West seating support stand. Gate F access. Arjun coordinate.' },
  { id: 'sec7', name: 'Operational Sector Eta', block: 'Block L', ingress: 'Gate F (G6)', officer: 'Officer Arjun', startAngle: 270, endAngle: 315, innerR: 105, outerR: 155, zone: 'West', description: 'North-West general stands. Arjun coordinate.' },
  { id: 'sec8', name: 'Operational Sector Theta', block: 'Block M', ingress: 'Gate A (G1)', officer: 'Officer Sharma', startAngle: 315, endAngle: 360, innerR: 105, outerR: 155, zone: 'North', description: 'North general stands. Gate A access. Sharma coordinate.' },
  
  { id: 'sec9', name: 'North Corporate Box', block: 'VIP Box A', ingress: 'Gate B (G2)', officer: 'Officer Sharma', startAngle: 0, endAngle: 90, innerR: 62, outerR: 98, zone: 'VIP', description: 'Exclusive executive boxes. Protected under VIP Command.' },
  { id: 'sec10', name: 'VIP Member Lounge', block: 'VIP Lounge B', ingress: 'Gate H', officer: 'Officer Neha', startAngle: 90, endAngle: 180, innerR: 62, outerR: 98, zone: 'VIP', description: 'Dignitary seating. Protected under VIP Command & Neha.' },
  { id: 'sec11', name: 'Premium Suites Stand', block: 'Premium Suites', ingress: 'Gate G', officer: 'Officer Neha', startAngle: 180, endAngle: 270, innerR: 62, outerR: 98, zone: 'VIP', description: 'Sponsor suites. Dynamic facial verification active. Neha coordinate.' },
  { id: 'sec12', name: 'President Gallery Box', block: 'President Gallery', ingress: 'Executive Access', officer: 'Command Oversight', startAngle: 270, endAngle: 360, innerR: 62, outerR: 98, zone: 'VIP', description: 'Chief of State and VIP box. High security lock.' }
];

// ─── SVG Gate Coordinates Mapping ───
const SVG_GATES = [
  { id: 'gate1', name: 'Ingress Point Alpha (G1)', short: 'G1', cx: 250, cy: 45, officer: 'Officer Sharma', block: 'North Stand Access', desc: 'North-side primary public entry terminal.' },
  { id: 'gate2', name: 'Ingress Point Beta (G2)', short: 'G2', cx: 374, cy: 79, officer: 'Officer Sharma', block: 'East Upper Access', desc: 'East Upper executive stands access.' },
  { id: 'gate3', name: 'Ingress Point Gamma (G3)', short: 'G3', cx: 425, cy: 160, officer: 'Officer Ravi', block: 'East Stand Access', desc: 'East-side primary public entry. Heavy ticket monitoring active.' },
  { id: 'gate4', name: 'Ingress Point Delta (G4)', short: 'G4', cx: 250, cy: 275, officer: 'Officer Arjun', block: 'South Stand Access', desc: 'South-side primary public entry terminal.' },
  { id: 'gate5', name: 'Ingress Point Epsilon (G5)', short: 'G5', cx: 75, cy: 160, officer: 'Officer Arjun', block: 'West Stand Access', desc: 'West-side primary public entry terminal.' },
  { id: 'gate6', name: 'Ingress Point Zeta (G6)', short: 'G6', cx: 126, cy: 79, officer: 'Officer Sharma', block: 'West Upper Access', desc: 'West Upper stands access.' },
];

// ═══════════════════════════════════════════════
// COMMAND CENTER
// ═══════════════════════════════════════════════
export default function CommandCenter({ user, onLogout }) {
  const [booting, setBooting] = useState(true);
  const [gateData, setGateData] = useState(INITIAL_GATE_DATA);
  const [incidents, setIncidents] = useState([]);
  const [aiResponse, setAiResponse] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [attendance, setAttendance] = useState(42150);
  const [isLockdown, setIsLockdown] = useState(false);
  const [clock, setClock] = useState(timeStr());
  const [activeNav, setActiveNav] = useState('dashboard');
  const [isPlaying, setIsPlaying] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState(null);
  const [currentScenario, setCurrentScenario] = useState(1);
  const [selectedSector, setSelectedSector] = useState(null);
  const [hoveredSector, setHoveredSector] = useState(null);
  const [selectedOfficer, setSelectedOfficer] = useState(null);
  const [scannedTickets, setScannedTickets] = useState(new Set());
  const scannerRef = useRef(null);
  const incidentIdRef = useRef(0);

  // --- Dynamic Dashboard States ---
  const [incidentFilter, setIncidentFilter] = useState('all');
  const [selectedIncidentType, setSelectedIncidentType] = useState('all');
  const [timelineStep, setTimelineStep] = useState(0);
  const [timelinePlaying, setTimelinePlaying] = useState(false);
  const [activeSecurityLogs, setActiveSecurityLogs] = useState([
    { id: 1, time: '13:02:15', type: 'block', message: 'Unauthorized card swiped at Server Room.', zone: 'Server Room' },
    { id: 2, time: '13:04:10', type: 'scan', message: 'Officer Ravi scanned badge at Gate 3.', zone: 'Gate 3' },
    { id: 3, time: '13:06:44', type: 'block', message: 'VIP Zone Access Attempt Blocked - Invalid Badge at VIP Box A.', zone: 'VIP Box A' },
    { id: 4, time: '13:08:12', type: 'alert', message: 'Suspicious device alert ping on Port 443 at Gate 2.', zone: 'Gate 2' },
  ]);
  const [restrictedZoneStatus, setRestrictedZoneStatus] = useState({
    serverRoom: 'LOCKED',
    pressBox: 'SECURE',
    lockerRooms: 'SECURE',
    vipBoxA: 'RESTRICTED',
  });
  const [ticketConsoleFlash, setTicketConsoleFlash] = useState(null);
  const [ticketValidationFeed, setTicketValidationFeed] = useState([
    { id: 1, name: 'Anish A.', type: 'valid', gate: 'G3', seat: 'Sec 4, Row C', time: '13:12:44' },
    { id: 2, name: 'Vikram S.', type: 'valid', gate: 'G1', seat: 'Sec 1, Row J', time: '13:13:02' },
    { id: 3, name: 'Rahul K.', type: 'duplicate', gate: 'G3', seat: 'Sec 4, Row C', time: '13:14:15' },
    { id: 4, name: 'Jessica M.', type: 'valid', gate: 'G5', seat: 'Sec 6, Row B', time: '13:14:30' },
  ]);
  const [selectedSecurityZone, setSelectedSecurityZone] = useState('Server Room');
  const [sopPlaybookStep, setSopPlaybookStep] = useState(0);
  const [weather, setWeather] = useState({ temp: '28°C', desc: 'Partly Cloudy · Light Rain Risk' });
  const [officerHeartRate, setOfficerHeartRate] = useState(76);
  const [sectorNoise, setSectorNoise] = useState({});

  // --- Heatmap Sector Noise Fluctuation Hook (4 sec) ---
  useEffect(() => {
    const interval = setInterval(() => {
      setSectorNoise(prev => {
        const next = { ...prev };
        SECTORS.forEach(sec => {
          next[sec.id] = Math.floor(Math.random() * 6) - 3;
        });
        return next;
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);
  // --- Real-time Weather Fetch Hook (30 sec) ---
  useEffect(() => {
    fetchLiveStadiumWeather().then(res => setWeather(res));
    const interval = setInterval(() => {
      fetchLiveStadiumWeather().then(res => setWeather(res));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // --- Officer Heartbeat Telemetry Hook (1 sec) ---
  useEffect(() => {
    const interval = setInterval(() => {
      setOfficerHeartRate(prev => {
        const delta = Math.floor(Math.random() * 4) - 2;
        return Math.max(68, Math.min(94, prev + delta));
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Pre-populate incidents on mount
  useEffect(() => {
    addIncident('info', 'System Operations Online', 'All 48 smart gate sensors online and broadcasting.');
    addIncident('warning', 'Ingress Velocity Rising', 'Ingress volumes rising at Gate 3. Monitor stand capacity.');
  }, []);

  // Handle full-screen QR scanning view mount/unmount
  useEffect(() => {
    if (activeNav === 'scan') {
      let isMounted = true;
      let activeScanner = null;
      
      setTimeout(() => {
        if (!isMounted) return;
        const readerElement = document.getElementById('full-qr-reader');
        if (!readerElement) return;

        const html5QrCode = new Html5Qrcode('full-qr-reader');
        activeScanner = html5QrCode;
        scannerRef.current = html5QrCode;
        
        html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (text) => {
            handleTicketScan(text);
          },
          () => {}
        ).catch(() => {});
      }, 500);

      return () => {
        isMounted = false;
        if (activeScanner) {
          activeScanner.stop().catch(() => {});
        }
      };
    }
  }, [activeNav]);

  const handleScenarioChange = (scenNum) => {
    setCurrentScenario(scenNum);
    setSelectedSector(null);
    setSelectedOfficer(null);

    if (scenNum === 1) {
      setIsLockdown(false);
      setGateData({
        gate1: { occupancy: 24, rate: 45 },
        gate2: { occupancy: 32, rate: 60 },
        gate3: { occupancy: 28, rate: 50 },
        gate4: { occupancy: 18, rate: 30 },
        gate5: { occupancy: 22, rate: 40 },
        gate6: { occupancy: 20, rate: 35 },
      });
      setAttendance(18400);
      setIncidents([]);
      setAiResponse(null);
    } else if (scenNum === 2) {
      setIsLockdown(false);
      setGateData({
        gate1: { occupancy: 65, rate: 160 },
        gate2: { occupancy: 70, rate: 190 },
        gate3: { occupancy: 75, rate: 220 },
        gate4: { occupancy: 50, rate: 110 },
        gate5: { occupancy: 58, rate: 135 },
        gate6: { occupancy: 60, rate: 140 },
      });
      setAttendance(34600);
      addIncident('info', 'Peak Ingress Active', 'Rapid scans detected across Ingress Points G1, G2, G3.');
    } else if (scenNum === 3) {
      setIsLockdown(false);
      setGateData({
        gate1: { occupancy: 68, rate: 170 },
        gate2: { occupancy: 72, rate: 195 },
        gate3: { occupancy: 96, rate: 310 },
        gate4: { occupancy: 52, rate: 115 },
        gate5: { occupancy: 60, rate: 140 },
        gate6: { occupancy: 62, rate: 145 },
      });
      setAttendance(44100);
      triggerAI('surge');
    } else if (scenNum === 4) {
      setIsLockdown(false);
      setGateData({
        gate1: { occupancy: 85, rate: 280 },
        gate2: { occupancy: 72, rate: 195 },
        gate3: { occupancy: 100, rate: 0 }, // closed/critical
        gate4: { occupancy: 52, rate: 115 },
        gate5: { occupancy: 60, rate: 140 },
        gate6: { occupancy: 62, rate: 145 },
      });
      addIncident('critical', 'Ingress Point Beta Locked', 'AI Automated rerouting active. Diverting crowd toward Ingress Point Alpha.');
      triggerAI('surge');
    } else if (scenNum === 5) {
      setIsLockdown(true);
      setGateData({
        gate1: { occupancy: 100, rate: 0 },
        gate2: { occupancy: 100, rate: 0 },
        gate3: { occupancy: 100, rate: 0 },
        gate4: { occupancy: 100, rate: 0 },
        gate5: { occupancy: 100, rate: 0 },
        gate6: { occupancy: 100, rate: 0 },
      });
      addIncident('critical', 'EVACUATION ACTIVE', 'AI Emergency Corridors active. All sectors evacuating.');
    }
  };

  // ─── Clock ───
  useEffect(() => {
    const t = setInterval(() => setClock(timeStr()), 1000);
    return () => clearInterval(t);
  }, []);

  // --- Gate Ingress Telemetry Simulator (2 sec) ---
  useEffect(() => {
    const interval = setInterval(() => {
      if (isLockdown) return;
      setGateData(prev => {
        const next = {};
        Object.keys(prev).forEach(k => {
          const d = Math.floor(Math.random() * 5) - 2;
          const occ = Math.max(8, Math.min(97, prev[k].occupancy + d));
          const rateD = Math.floor(Math.random() * 30) - 15;
          const rate = Math.max(40, Math.min(350, prev[k].rate + rateD));
          next[k] = { occupancy: occ, rate };
        });
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [isLockdown]);

  // --- Attendance Counter Simulator (5 sec) ---
  useEffect(() => {
    const interval = setInterval(() => {
      if (isLockdown) return;
      setAttendance(prev => Math.min(50000, prev + Math.floor(Math.random() * 40)));
    }, 5000);
    return () => clearInterval(interval);
  }, [isLockdown]);

  // ─── Add Incident ───
  const addIncident = (type, title, message) => {
    incidentIdRef.current += 1;
    setIncidents(prev => [{
      id: incidentIdRef.current,
      time: shortTime(),
      type, title, message,
    }, ...prev].slice(0, 20));
  };

  // ─── Lockdown ───
  const toggleLockdown = () => {
    if (!isLockdown) {
      setIsLockdown(true);
      setGateData(prev => {
        const next = {};
        Object.keys(prev).forEach(k => {
          next[k] = { ...prev[k], occupancy: 100, rate: 0 };
        });
        return next;
      });
      addIncident('critical', 'EMERGENCY LOCKDOWN', 'All gates locked. Evacuation protocols initiated. Emergency personnel dispatched.');
      triggerAI('lockdown');
    } else {
      setIsLockdown(false);
      setGateData(INITIAL_GATE_DATA);
      addIncident('info', 'Lockdown Deactivated', 'All gates returned to normal operations.');
    }
  };

  // ─── AI Trigger ───
  const triggerAI = (type) => {
    setIsGenerating(true);
    setAiResponse(null);

    let context = '';
    if (type === 'surge') {
      setGateData(prev => ({ ...prev, gate3: { ...prev.gate3, occupancy: 96 } }));
      context = 'Anomalous crowd density surge at Ingress Gate 3 (East Lower stand).';
      addIncident('critical', 'Crowd Surge — East Lower', 'Anomalous density spike. AI analyzing threat matrix.');
    } else if (type === 'rain') {
      context = 'Precipitation threat modeling detects rain in 12 mins over North stands.';
      addIncident('warning', 'Weather Alert: Rain', 'Heavy precipitation forecast in 12 minutes. Inward rush predicted.');
    } else if (type === 'fraud') {
      context = 'Cybersecurity system reports duplicate ticket scans at Ingress Gate 3.';
      addIncident('critical', 'Ticket Fraud Ring', 'Multiple duplicate scans from identical IP block detected at Gate 3.');
      setGateData(prev => ({ ...prev, gate3: { ...prev.gate3, occupancy: 92 } }));
    } else if (type === 'medical') {
      context = 'Spectator medical event reported near South Stand Row 12.';
      addIncident('warning', 'Medical Emergency', 'Spectator collapse reported near South Stand Row 12. Nearest medical: 48m.');
    } else if (type === 'lockdown') {
      context = 'Security lock of all main perimeter gates. Full stadium emergency evac routes activated.';
    }

    generateStadiumSOP(type, context).then(res => {
      setAiResponse(res);
      setIsGenerating(false);
    });
  };

  // ─── TTS ───
  const playTTS = (text) => {
    if (!text) return;
    setIsPlaying(true);
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = 0.85;
    u.rate = 0.88;
    u.onend = () => setIsPlaying(false);
    window.speechSynthesis.speak(u);
  };

  // ─── QR Scan ───
  const startScanner = () => {
    setShowQR(true);
    setTimeout(() => {
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;
      html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (text) => {
          html5QrCode.stop().then(() => handleTicketScan(text));
        },
        () => {}
      ).catch(() => {});
    }, 200);
  };

  const stopScanner = () => {
    if (scannerRef.current) scannerRef.current.stop().catch(() => {});
    setShowQR(false);
  };

  const handleTicketScan = (text) => {
    if (scannedTickets.has(text)) {
      addIncident('critical', 'DUPLICATE TICKET', `Fraud detected! Ticket "${text}" already scanned. Gate 3 alerted.`);
      setGateData(prev => ({ ...prev, gate3: { ...prev.gate3, occupancy: 94 } }));
    } else {
      setScannedTickets(prev => new Set(prev).add(text));
      addIncident('info', 'Ticket Validated', `Ticket ${text.substring(0, 12)}... scanned at Gate 3.`);
      const gates = Object.keys(gateData);
      const rg = gates[Math.floor(Math.random() * gates.length)];
      setGateData(prev => ({
        ...prev,
        [rg]: { ...prev[rg], occupancy: Math.min(96, prev[rg].occupancy + 3) }
      }));
      setAttendance(prev => prev + 1);
    }
    stopScanner();
  };

  // ─── Operational Security Sector Metrics ───
  const getSectorMetrics = (secId) => {
    let occupancy = 25;
    let flowRate = 45;

    if (secId === 'sec2') {
      occupancy = gateData.gate3.occupancy;
      flowRate = gateData.gate3.rate;
    } else if (secId === 'sec1') {
      occupancy = gateData.gate1.occupancy;
      flowRate = gateData.gate1.rate;
    } else if (secId === 'sec4') {
      occupancy = gateData.gate4.occupancy;
      flowRate = gateData.gate4.rate;
    } else if (secId === 'sec6') {
      occupancy = gateData.gate5.occupancy;
      flowRate = gateData.gate5.rate;
    } else {
      if (currentScenario === 1) {
        occupancy = 18 + (secId.charCodeAt(secId.length - 1) % 10);
        flowRate = 30 + (secId.charCodeAt(secId.length - 1) % 15);
      } else if (currentScenario === 2) {
        occupancy = 48 + (secId.charCodeAt(secId.length - 1) % 15);
        flowRate = 120 + (secId.charCodeAt(secId.length - 1) % 40);
      } else if (currentScenario === 3 || currentScenario === 4) {
        occupancy = 58 + (secId.charCodeAt(secId.length - 1) % 15);
        flowRate = 135 + (secId.charCodeAt(secId.length - 1) % 40);
      } else if (currentScenario === 5) {
        occupancy = 100;
        flowRate = 0;
      }
    }

    // Incorporate dynamic 4-second noise fluctuation
    const noise = sectorNoise[secId] || 0;
    occupancy = Math.max(5, Math.min(100, occupancy + noise));

    let status = 'safe';
    if (occupancy >= 88) status = 'critical';
    else if (occupancy >= 72) status = 'heavy';
    else if (occupancy >= 50) status = 'moderate';

    return { occupancy, flowRate, status };
  };

  const getSectorCenter = (sec) => {
    const midAngle = (sec.startAngle + sec.endAngle) / 2;
    const midR = (sec.innerR + sec.outerR) / 2;
    const ellipseRatio = 0.65;
    return polarToCartesian(250, 160, midR, midR * ellipseRatio, midAngle);
  };

  const isOfficerVisible = (offName) => {
    const role = user.role;
    if (role === 'super_admin' || role === 'emergency' || role === 'volunteer') return true;
    
    if (role === 'north_commander' && offName === 'Officer Sharma') return true;
    if (role === 'east_commander' && offName === 'Officer Ravi') return true;
    if (role === 'west_commander' && offName === 'Officer Arjun') return true;
    if (role === 'south_commander' && offName === 'Officer Neha') return true;
    if (role === 'vip_command' && ['Elite Security', 'Internal Security', 'Command Oversight'].includes(offName)) return true;
    if (role === 'medical' && offName === 'Medical Team') return true;
    return false;
  };

  const isSectorInteractive = (sec) => {
    const role = user.role;
    if (role === 'super_admin' || role === 'emergency' || role === 'volunteer' || role === 'medical') return true;
    
    if (role === 'north_commander') {
      return sec.officer === 'Officer Sharma' || sec.zone === 'North';
    }
    if (role === 'east_commander') {
      return sec.officer === 'Officer Ravi' || sec.zone === 'East';
    }
    if (role === 'west_commander') {
      return sec.officer === 'Officer Arjun' || sec.zone === 'West';
    }
    if (role === 'south_commander') {
      return sec.officer === 'Officer Neha' || sec.id === 'sec10' || sec.id === 'sec11';
    }
    if (role === 'vip_command') {
      return sec.zone === 'VIP' || ['sec9', 'sec10', 'sec11', 'sec12'].includes(sec.id);
    }
    return false;
  };

  // ═══ COMPUTED ═══
  const totalOcc = Math.round(Object.values(gateData).reduce((s, g) => s + g.occupancy, 0) / 6);
  const securityStatus = isLockdown ? 'LOCKDOWN' : (totalOcc > 80 ? 'ELEVATED' : 'SECURE');

  // ═══ BOOT SCREEN ═══
  if (booting) {
    return <BootScreen onComplete={() => setBooting(false)} />;
  }

  // ═══ MAIN RENDER ═══
  return (
    <motion.div
      className={`cc cc-${activeNav}-mode ${isLockdown ? 'lockdown' : ''} ${isSidebarHovered ? 'sidebar-expanded' : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* ═══════ STATUS BAR ═══════ */}
      <motion.header
        className="cc-statusbar"
        initial={{ y: -52, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
      >
        <div className="cc-sb-live">
          <span className="dot" />
          LIVE
        </div>

        <div className="cc-sb-item">
          <span className="label">Match</span>
          <span className="value">GT vs RCB · IPL 2026</span>
        </div>

        {/* High-Tech Mega Menu Top Navigation */}
        <div className="cc-sb-nav" onMouseLeave={() => setActiveMegaMenu(null)}>
          <button
            className={`cc-sb-nav-link ${activeMegaMenu === 'control' ? 'active' : ''}`}
            onMouseEnter={() => setActiveMegaMenu('control')}
          >
            Control Matrices
          </button>
          <button
            className={`cc-sb-nav-link ${activeMegaMenu === 'ai' ? 'active' : ''}`}
            onMouseEnter={() => setActiveMegaMenu('ai')}
          >
            AI Action Centers
          </button>
          <button
            className={`cc-sb-nav-link ${activeMegaMenu === 'sensor' ? 'active' : ''}`}
            onMouseEnter={() => setActiveMegaMenu('sensor')}
          >
            Sensor Telemetry
          </button>

          {/* Full-width Mega Menu Dropdown */}
          <AnimatePresence>
            {activeMegaMenu && (
              <motion.div
                className="cc-megamenu"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                {activeMegaMenu === 'control' && (
                  <>
                    <div className="cc-mm-col">
                      <div className="cc-mm-title">Zone Access Systems</div>
                      <div className="cc-mm-list">
                        <button className="cc-mm-link" onClick={() => setActiveNav('dashboard')}><span className="bullet"/>North Entry G1 (Active)</button>
                        <button className="cc-mm-link" onClick={() => setActiveNav('dashboard')}><span className="bullet"/>East Gates G2/G3 (Heavy Flow)</button>
                        <button className="cc-mm-link" onClick={() => setActiveNav('dashboard')}><span className="bullet"/>South Stand G4 (Moderate)</button>
                        <button className="cc-mm-link" onClick={() => setActiveNav('dashboard')}><span className="bullet"/>West Gates G5/G6 (Closed)</button>
                      </div>
                    </div>
                    <div className="cc-mm-col">
                      <div className="cc-mm-title">SOP Playbooks</div>
                      <div className="cc-mm-list">
                        <button className="cc-mm-link" onClick={() => { setActiveNav('incidents'); triggerAI('surge'); }}><span className="bullet"/>Crowd Surge Sop</button>
                        <button className="cc-mm-link" onClick={() => { setActiveNav('incidents'); triggerAI('rain'); }}><span className="bullet"/>Heavy Rain Protocol</button>
                        <button className="cc-mm-link" onClick={() => { setActiveNav('incidents'); triggerAI('fraud'); }}><span className="bullet"/>Ticket Counter-Fraud</button>
                        <button className="cc-mm-link" onClick={() => { setActiveNav('incidents'); toggleLockdown(); }}><span className="bullet"/>Emergency Lockdown</button>
                      </div>
                    </div>
                    <div className="cc-mm-col">
                      <div className="cc-mm-title">Telemetry Logs</div>
                      <div className="cc-mm-list">
                        <button className="cc-mm-link" onClick={() => setActiveNav('analytics')}><span className="bullet"/>Smart Gate Heartbeats</button>
                        <button className="cc-mm-link" onClick={() => setActiveNav('analytics')}><span className="bullet"/>RFID Badge Scanners</button>
                        <button className="cc-mm-link" onClick={() => setActiveNav('analytics')}><span className="bullet"/>Sound Level Decibel Logs</button>
                        <button className="cc-mm-link" onClick={() => setActiveNav('analytics')}><span className="bullet"/>PA Broadcast System</button>
                      </div>
                    </div>
                    <div className="cc-mm-col">
                      <div className="cc-mm-visual">
                        <div className="cc-mm-vis-header">
                          <span className="cc-mm-vis-title">System Log Matrix</span>
                          <span className="cc-mm-vis-status">SECURE</span>
                        </div>
                        <p className="cc-mm-vis-body">All gates communicating. 42,150 RFID tags active inside stands.</p>
                        <div className="cc-mm-grid">
                          <div className="cc-mm-grid-box" />
                          <div className="cc-mm-grid-box" />
                          <div className={`cc-mm-grid-box ${totalOcc > 80 ? 'alert' : 'warn'}`} />
                          <div className="cc-mm-grid-box" />
                          <div className="cc-mm-grid-box" />
                          <div className="cc-mm-grid-box" />
                          <div className="cc-mm-grid-box" />
                          <div className="cc-mm-grid-box" />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {activeMegaMenu === 'ai' && (
                  <>
                    <div className="cc-mm-col">
                      <div className="cc-mm-title">Predictive Intelligence</div>
                      <div className="cc-mm-list">
                        <button className="cc-mm-link" onClick={() => { setActiveNav('ai'); triggerAI('surge'); }}><span className="bullet"/>Crowd Movement Forecaster</button>
                        <button className="cc-mm-link" onClick={() => { setActiveNav('ai'); triggerAI('rain'); }}><span className="bullet"/>Inward Flow Modeler</button>
                        <button className="cc-mm-link" onClick={() => { setActiveNav('ai'); }}><span className="bullet"/>Incident Severity Assessor</button>
                        <button className="cc-mm-link" onClick={() => { setActiveNav('ai'); }}><span className="bullet"/>Peak Occupancy Predictor</button>
                      </div>
                    </div>
                    <div className="cc-mm-col">
                      <div className="cc-mm-title">Gemini Cognitive Hub</div>
                      <div className="cc-mm-list">
                        <button className="cc-mm-link" onClick={() => { setActiveNav('ai'); }}><span className="bullet"/>Semantic Audio Parser</button>
                        <button className="cc-mm-link" onClick={() => { setActiveNav('ai'); triggerAI('surge'); }}><span className="bullet"/>Section Co-occurrence Radar</button>
                        <button className="cc-mm-link" onClick={() => { setActiveNav('ai'); triggerAI('fraud'); }}><span className="bullet"/>Double-Scan Interceptor</button>
                        <button className="cc-mm-link" onClick={() => { setActiveNav('ai'); }}><span className="bullet"/>Staging Ground Optimizer</button>
                      </div>
                    </div>
                    <div className="cc-mm-col">
                      <div className="cc-mm-title">Action Automations</div>
                      <div className="cc-mm-list">
                        <button className="cc-mm-link" onClick={() => { setActiveNav('incidents'); }}><span className="bullet"/>SOP Trigger Scripts</button>
                        <button className="cc-mm-link" onClick={() => { setActiveNav('dashboard'); }}><span className="bullet"/>Digital Evac Signage</button>
                        <button className="cc-mm-link" onClick={() => { setActiveNav('incidents'); }}><span className="bullet"/>PA Broadcast Gen</button>
                        <button className="cc-mm-link" onClick={() => { setActiveNav('security'); }}><span className="bullet"/>Responder Router</button>
                      </div>
                    </div>
                    <div className="cc-mm-col">
                      <div className="cc-mm-visual">
                        <div className="cc-mm-vis-header">
                          <span className="cc-mm-vis-title">Gemini Cognitive Core</span>
                          <span className="cc-mm-vis-status" style={{ color: '#60a5fa', borderColor: 'rgba(96,165,250,0.3)', background: 'rgba(96,165,250,0.08)' }}>AI ACTIVE</span>
                        </div>
                        <div className="cc-mm-sphere-container">
                          <div className="cc-mm-sphere" />
                        </div>
                        <p className="cc-mm-vis-body" style={{ fontSize: '10px', textAlign: 'center', marginTop: '4px' }}>Staging threat parameters for GT vs RCB...</p>
                      </div>
                    </div>
                  </>
                )}

                {activeMegaMenu === 'sensor' && (
                  <>
                    <div className="cc-mm-col">
                      <div className="cc-mm-title">Hardware Heartbeat</div>
                      <div className="cc-mm-list">
                        <button className="cc-mm-link" onClick={() => setActiveNav('analytics')}><span className="bullet"/>48x Smart Gate Actuators</button>
                        <button className="cc-mm-link" onClick={() => setActiveNav('analytics')}><span className="bullet"/>120x Decibel Level Mics</button>
                        <button className="cc-mm-link" onClick={() => setActiveNav('dashboard')}><span className="bullet"/>16x CCTV Stream Vectors</button>
                        <button className="cc-mm-link" onClick={() => setActiveNav('analytics')}><span className="bullet"/>8x Atmospheric Sensors</button>
                      </div>
                    </div>
                    <div className="cc-mm-col">
                      <div className="cc-mm-title">Public Broadcaster</div>
                      <div className="cc-mm-list">
                        <button className="cc-mm-link" onClick={() => setActiveNav('incidents')}><span className="bullet"/>Live PA Console</button>
                        <button className="cc-mm-link" onClick={() => setActiveNav('incidents')}><span className="bullet"/>Audio Soundwave Sync</button>
                        <button className="cc-mm-link" onClick={() => toggleLockdown()}><span className="bullet"/>Evac Sirens Controller</button>
                        <button className="cc-mm-link" onClick={() => setActiveNav('security')}><span className="bullet"/>Volunteer VHF Comms</button>
                      </div>
                    </div>
                    <div className="cc-mm-col">
                      <div className="cc-mm-title">Responder Staging</div>
                      <div className="cc-mm-list">
                        <button className="cc-mm-link" onClick={() => { setActiveNav('security'); triggerAI('medical'); }}><span className="bullet"/>Medical Dispatch Units</button>
                        <button className="cc-mm-link" onClick={() => setActiveNav('security')}><span className="bullet"/>Gate 3 Crowd Control</button>
                        <button className="cc-mm-link" onClick={() => setActiveNav('security')}><span className="bullet"/>Chief Security Dispatcher</button>
                        <button className="cc-mm-link" onClick={() => setActiveNav('security')}><span className="bullet"/>Volunteer Coordinators</button>
                      </div>
                    </div>
                    <div className="cc-mm-col">
                      <div className="cc-mm-visual">
                        <div className="cc-mm-vis-header">
                          <span className="cc-mm-vis-title">PA Stream Telemetry</span>
                          <span className="cc-mm-vis-status" style={{ color: '#eab308', borderColor: 'rgba(234,179,8,0.3)', background: 'rgba(234,179,8,0.08)' }}>STREAMING</span>
                        </div>
                        <p className="cc-mm-vis-body">Active broadcasts queuing. Sound levels nominal.</p>
                        <div style={{ display: 'flex', alignItems: 'flex-end', height: '36px', gap: '3px', marginTop: '12px' }}>
                          <span style={{ flex: 1, background: '#60a5fa', height: '40%', borderRadius: '2px' }} />
                          <span style={{ flex: 1, background: '#60a5fa', height: '80%', borderRadius: '2px' }} />
                          <span style={{ flex: 1, background: '#60a5fa', height: '60%', borderRadius: '2px' }} />
                          <span style={{ flex: 1, background: '#ef4444', height: '95%', borderRadius: '2px' }} />
                          <span style={{ flex: 1, background: '#60a5fa', height: '50%', borderRadius: '2px' }} />
                          <span style={{ flex: 1, background: '#60a5fa', height: '30%', borderRadius: '2px' }} />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="cc-sb-item">
          <span className="label">Attendance</span>
          <span className="value">{attendance.toLocaleString()} / 50,000</span>
        </div>

        <div className="cc-sb-item">
          <div className={`cc-sb-status ${isLockdown || totalOcc > 80 ? 'alert' : 'ok'}`}>
            <span className="dot-sm" />
            {securityStatus}
          </div>
        </div>

        <div className="cc-sb-item">
          <span className="label">Weather</span>
          <span className="value">{weather.temp} · {weather.desc}</span>
        </div>

        <div className="cc-sb-spacer" />
        <div className="cc-sb-clock">{clock}</div>

        <div className="cc-sb-user">
          <div className="cc-sb-avatar">{user.username.charAt(0).toUpperCase()}</div>
          <div className="cc-sb-user-text">
            <div className="cc-sb-user-name">{user.username}</div>
            <div className="cc-sb-user-role">{user.roleLabel}</div>
          </div>
        </div>
      </motion.header>

      {/* ═══════ HOVERABLE SIDEBAR ═══════ */}
      <motion.nav
        className="cc-iconbar"
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        initial={{ x: -64, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
      >
        {SIDEBAR_ITEMS.map((item, i) => (
          <motion.button
            key={item.id}
            className={`cc-icon-btn ${activeNav === item.id ? 'active' : ''} ${isSidebarHovered ? 'expanded' : ''}`}
            onClick={() => setActiveNav(item.id)}
            title={isSidebarHovered ? undefined : item.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.06, duration: 0.3 }}
          >
            <item.icon size={20} className="shrink-0" />
            
            <AnimatePresence>
              {isSidebarHovered && (
                <motion.span
                  className="cc-icon-label"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.18 }}
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>

            {item.hasNotif && incidents.length > 0 && <span className="notif-dot" />}
          </motion.button>
        ))}

        <div className="cc-icon-divider" />

        <motion.button
          className={`cc-icon-btn ${isSidebarHovered ? 'expanded' : ''}`}
          onClick={() => startScanner()}
          title={isSidebarHovered ? undefined : "Quick Scan"}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7, duration: 0.3 }}
        >
          <QrCode size={20} className="shrink-0" />
          {isSidebarHovered && <span className="cc-icon-label">Quick Scan</span>}
        </motion.button>

        <div className="cc-iconbar-spacer" />

        <motion.button
          className={`cc-icon-btn logout ${isSidebarHovered ? 'expanded' : ''}`}
          onClick={onLogout}
          title={isSidebarHovered ? undefined : "Logout"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.3 }}
        >
          <LogOut size={20} className="shrink-0" />
          {isSidebarHovered && <span className="cc-icon-label">Log Out</span>}
        </motion.button>
      </motion.nav>

      {/* ═══════ CENTER CONTENT ═══════ */}
      <motion.main
        className="cc-main"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.25, ease: 'easeOut' }}
      >
        {/* COLUMN 1: LEFT PANEL — SECTOR INTELLIGENCE */}
        <section className="cc-left-panel">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-2">
            <h2 className="text-[13px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Shield size={16} className="text-cyan-400" />
              Sector Intelligence
            </h2>
            <div className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeNav === 'dashboard' && (
              <motion.div
                key="dashboard-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22 }}
                className="space-y-4"
              >
                {hoveredSector || selectedSector ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-wider text-cyan-400/80 mb-0.5">
                        {(hoveredSector || selectedSector).isGate ? 'INGRESS TERMINAL' : 'SECURITY SECTOR'}
                      </div>
                      <h3 className="text-base font-bold text-white tracking-tight leading-tight">
                        {(hoveredSector || selectedSector).name}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        {(hoveredSector || selectedSector).block || 'Linked Access Corridor'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-brand-void/40 border border-slate-800/60 rounded-xl p-3">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">Occupancy</span>
                        <span 
                          className="text-xl font-extrabold font-mono"
                          style={{ color: getBarColor((hoveredSector || selectedSector).occupancy) }}
                        >
                          {(hoveredSector || selectedSector).occupancy}%
                        </span>
                        <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden mt-2">
                          <div 
                            className="h-full rounded-full transition-all duration-500" 
                            style={{ 
                              width: `${(hoveredSector || selectedSector).occupancy}%`,
                              background: getBarColor((hoveredSector || selectedSector).occupancy)
                            }}
                          />
                        </div>
                      </div>

                      <div className="bg-brand-void/40 border border-slate-800/60 rounded-xl p-3">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">Flow Velocity</span>
                        <span className="text-xl font-extrabold font-mono text-cyan-400">
                          {(hoveredSector || selectedSector).flowRate || (hoveredSector || selectedSector).rate || 0}
                        </span>
                        <span className="text-[9px] text-slate-600 font-bold ml-1 uppercase">/min</span>
                        <div className="text-[10px] text-slate-500 font-semibold mt-2 flex items-center gap-1">
                          <Activity size={10} className="text-cyan-500" />
                          Sensor Active
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between py-1.5 border-b border-slate-800/40 text-xs">
                        <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Threat Matrix Status</span>
                        <span 
                          className="font-black px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider"
                          style={{ 
                            color: getBarColor((hoveredSector || selectedSector).occupancy), 
                            background: `${getBarColor((hoveredSector || selectedSector).occupancy)}15`,
                            border: `1px solid ${getBarColor((hoveredSector || selectedSector).occupancy)}30`
                          }}
                        >
                          {((hoveredSector || selectedSector).status || getStatus((hoveredSector || selectedSector).occupancy)).toUpperCase()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1.5 border-b border-slate-800/40 text-xs">
                        <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Assigned Officer</span>
                        <span 
                          className="font-extrabold text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
                          onClick={() => {
                            setSelectedOfficer((hoveredSector || selectedSector).officer);
                            setSelectedSector(null);
                            setHoveredSector(null);
                          }}
                        >
                          👮 {(hoveredSector || selectedSector).officer || 'Command Oversight'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1.5 border-b border-slate-800/40 text-xs">
                        <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Access Linked Gate</span>
                        <span className="font-bold text-slate-300">
                          {(hoveredSector || selectedSector).ingress || 'All Gate Terminals'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1.5 border-b border-slate-800/40 text-xs">
                        <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">AI Risk Score</span>
                        <span className="font-mono font-bold text-slate-300">
                          {Math.round((hoveredSector || selectedSector).occupancy * 0.9 + 5)} / 100
                        </span>
                      </div>
                    </div>

                    <div className="bg-brand-void/20 border border-slate-800/40 rounded-xl p-3">
                      <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">Operational SOP Context</span>
                      <p className="text-[11px] text-slate-400 leading-normal font-medium">
                        {(hoveredSector || selectedSector).description || (hoveredSector || selectedSector).desc || 'No active local incidents. Access control checkpoints operational. Real-time anti-fraud scanning enabled.'}
                      </p>
                    </div>

                    <div className="border border-slate-800/60 rounded-xl p-3 flex items-center justify-between bg-cyan-950/5">
                      <div className="flex items-center gap-2">
                        <Activity size={14} className="text-cyan-400 animate-pulse" />
                        <div>
                          <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Local IoT Array</span>
                          <span className="text-[10px] text-slate-400 font-semibold">12 sensors broadcasting</span>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-cyan-400/80 uppercase">NOMINAL</span>
                    </div>
                  </div>
                ) : selectedOfficer ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-wider text-cyan-400/80 mb-0.5">
                        OFFICER PROFILE
                      </div>
                      <h3 className="text-base font-bold text-white tracking-tight leading-tight flex items-center gap-1.5">
                        <span>👮</span>
                        {selectedOfficer}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        Stadium Tactical Command Unit
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between py-1.5 border-b border-slate-800/40 text-xs">
                        <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Duty Status</span>
                        <span className="font-black px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider bg-emerald-950/20 text-emerald-400 border border-emerald-950/60">
                          ON PATROL
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1.5 border-b border-slate-800/40 text-xs">
                        <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">VHF Frequency Comms</span>
                        <span className="font-extrabold text-amber-400 font-mono">
                          {selectedOfficer === 'Officer Ravi' ? 'VHF CH-4' : (selectedOfficer === 'Officer Arjun' ? 'VHF CH-2' : 'VHF CH-1 (VIP)' )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1.5 border-b border-slate-800/40 text-xs">
                        <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Primary Security Zones</span>
                        <span className="font-semibold text-slate-300 text-right">
                          {selectedOfficer === 'Officer Ravi' ? 'Block C, E, L' : (selectedOfficer === 'Officer Arjun' ? 'Block D, F, K' : 'VIP Stands & Suites')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1.5 border-b border-slate-800/40 text-xs">
                        <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Officer Heart Rate</span>
                        <span className="font-semibold text-slate-300 font-mono">
                          {officerHeartRate} BPM (Nominal)
                        </span>
                      </div>
                    </div>

                    <div className="bg-brand-void/20 border border-slate-800/40 rounded-xl p-3">
                      <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">Command Briefing</span>
                      <p className="text-[11px] text-slate-400 leading-normal font-medium">
                        Coordinating crowd ingress and sector safety protocols. Equipped with real-time biometric and RFID scanner feedback. Backed by the Gemini AI SOC Copilot.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-wider text-cyan-400 mb-0.5">
                        STADIUM WIDE OVERSIGHT
                      </div>
                      <h3 className="text-base font-bold text-white tracking-tight leading-tight">
                        Narendra Modi Stadium
                      </h3>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        IPL Live Security Control Panel
                      </p>
                    </div>

                    <div className="bg-brand-void/40 border border-slate-800/60 rounded-xl p-3.5 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Live Attendance</span>
                        <span className="font-mono font-black text-slate-300">
                          {attendance.toLocaleString()} / 50,000
                        </span>
                      </div>
                      <div className="w-full bg-slate-850 h-2 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ 
                            width: `${(attendance / 50000) * 100}%`,
                            background: 'linear-gradient(90deg, #22c55e, #10b981)'
                          }}
                        />
                      </div>
                      <span className="block text-[10px] text-slate-500 font-medium">
                        Stadium is at {Math.round((attendance / 50000) * 100)}% capacity
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-brand-void/40 border border-slate-800/60 rounded-xl p-3">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">Avg Ingress</span>
                        <span className="text-lg font-black font-mono text-cyan-400">
                          {Math.round(Object.values(gateData).reduce((s, g) => s + g.rate, 0) / 6)}
                        </span>
                        <span className="text-[9px] text-slate-600 font-bold ml-1 uppercase">/min</span>
                      </div>

                      <div className="bg-brand-void/40 border border-slate-800/60 rounded-xl p-3">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">Threat Status</span>
                        <span 
                          className="text-[11px] font-extrabold uppercase px-1.5 py-0.5 rounded-md"
                          style={{ 
                            color: securityStatus === 'LOCKDOWN' ? '#ef4444' : (securityStatus === 'ELEVATED' ? '#f97316' : '#22c55e'),
                            background: securityStatus === 'LOCKDOWN' ? 'rgba(239,68,68,0.1)' : (securityStatus === 'ELEVATED' ? 'rgba(249,115,22,0.1)' : 'rgba(34,197,94,0.1)'),
                          }}
                        >
                          {securityStatus}
                        </span>
                      </div>
                    </div>

                    <div className="bg-cyan-950/10 border border-cyan-800/20 rounded-xl p-3">
                      <span className="block text-[9px] font-black uppercase tracking-wider text-cyan-400 mb-1">AI Threat Assessment</span>
                      <p className="text-[11px] text-slate-400 leading-normal font-medium">
                        {isLockdown ? 'CRITICAL EVACUATION PROTOCOL ACTIVE. All sectors are locked and divert channels deployed.' : 
                         currentScenario === 3 ? 'ELEVATED SURGE ALERT: Influx spike at Ingress Gate 3 (East). Flow redirection recommended.' : 
                         currentScenario === 4 ? 'COUNTER-FRAUD ACTIVE: Ingress Gate 3 has double scan alert. Officer Ravi investigating.' : 
                         'All security sectors reporting nominal parameters. IoT sensor array reading standard decibel levels and attendance.'}
                      </p>
                    </div>

                    <div className="border border-slate-800/60 rounded-xl p-3 flex justify-between items-center bg-brand-void/40">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={14} className="text-amber-500" />
                        <div>
                          <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Alert Tally</span>
                          <span className="text-[10px] text-slate-400 font-semibold">{incidents.length} active events</span>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-slate-500">24m uptime</span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeNav === 'incidents' && (
              <motion.div
                key="incidents-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22 }}
                className="space-y-4"
              >
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-red-400 mb-0.5">Filter Operations</div>
                  <h3 className="text-base font-bold text-white tracking-tight leading-tight">Incident Investigations</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">Configure active log filters</p>
                </div>
                
                <div className="bg-brand-void/40 border border-slate-800/60 rounded-xl p-3 space-y-3">
                  <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Incident Severity</span>
                  <div className="space-y-2">
                    {['all', 'critical', 'warning', 'info'].map(sev => (
                      <button
                        key={sev}
                        onClick={() => setIncidentFilter(sev)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-semibold border ${
                          incidentFilter === sev ? 'border-red-500/40 bg-red-950/10 text-red-400' : 'border-slate-800/50 bg-brand-void/20 text-slate-400'
                        } transition-all`}
                      >
                        <span className="capitalize">{sev} Levels</span>
                        <span className="font-mono text-[10px] bg-black/30 px-1.5 py-0.2 rounded text-slate-500">
                          {sev === 'all' ? incidents.length : incidents.filter(i => i.type === sev).length}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-brand-void/40 border border-slate-800/60 rounded-xl p-3 space-y-2.5">
                  <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Incident Categories</span>
                  <div className="space-y-2">
                    {[
                      { id: 'all', label: 'All Incidents' },
                      { id: 'surge', label: 'Crowd Surge' },
                      { id: 'fraud', label: 'Ticket Fraud' },
                      { id: 'rogue', label: 'Rogue Device' },
                      { id: 'medical', label: 'Medical Alert' },
                      { id: 'rain', label: 'Rain Threat' },
                      { id: 'unauth', label: 'Unauthorized Access' }
                    ].map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedIncidentType(cat.id)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-semibold border ${
                          selectedIncidentType === cat.id ? 'border-orange-500/30 bg-orange-950/10 text-orange-400' : 'border-slate-800/50 bg-brand-void/20 text-slate-400'
                        } transition-all`}
                      >
                        <span>{cat.label}</span>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: cat.id === 'all' ? 'var(--red)' : 'var(--orange)' }} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border border-slate-800/60 rounded-xl p-3 bg-red-950/5">
                  <span className="block text-[9px] font-black uppercase tracking-wider text-red-400 mb-1">Dispatch Heartbeat</span>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    All dispatch squads (Med Unit A, Security Detachments Alpha/Beta) are reporting in on VHF channels. Response latency averages 42 seconds.
                  </p>
                </div>
              </motion.div>
            )}

            {activeNav === 'security' && (
              <motion.div
                key="security-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22 }}
                className="space-y-4"
              >
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-emerald-400 mb-0.5">Access Privileges</div>
                  <h3 className="text-base font-bold text-white tracking-tight leading-tight">RBAC Access Matrix</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">Role configuration controls</p>
                </div>

                <div className="bg-brand-void/40 border border-slate-800/60 rounded-xl p-3 space-y-2.5">
                  <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Restricted Zone Heartbeats</span>
                  <div className="space-y-2">
                    {[
                      { key: 'serverRoom', name: 'Main Server Room', status: restrictedZoneStatus.serverRoom },
                      { key: 'pressBox', name: 'Press & Media Gallery', status: restrictedZoneStatus.pressBox },
                      { key: 'lockerRooms', name: 'Player Locker Rooms', status: restrictedZoneStatus.lockerRooms },
                      { key: 'vipBoxA', name: 'VIP Executive Box A', status: restrictedZoneStatus.vipBoxA },
                    ].map(zone => (
                      <div key={zone.key} className="flex items-center justify-between p-2 rounded-lg bg-brand-void/30 border border-slate-800/40 text-xs">
                        <span className="font-semibold text-slate-300">{zone.name}</span>
                        <span 
                          onClick={() => {
                            setRestrictedZoneStatus(prev => ({
                              ...prev,
                              [zone.key]: prev[zone.key] === 'SECURE' ? 'LOCKED' : 'SECURE'
                            }));
                          }}
                          className="font-mono text-[9px] px-1.5 py-0.5 rounded cursor-pointer font-black border"
                          style={{ 
                            color: zone.status === 'SECURE' ? '#22c55e' : (zone.status === 'LOCKED' ? '#ef4444' : '#eab308'),
                            borderColor: zone.status === 'SECURE' ? 'rgba(34,197,94,0.3)' : (zone.status === 'LOCKED' ? 'rgba(239,68,68,0.3)' : 'rgba(234,179,8,0.3)'),
                            background: zone.status === 'SECURE' ? 'rgba(34,197,94,0.08)' : (zone.status === 'LOCKED' ? 'rgba(239,68,68,0.08)' : 'rgba(234,179,8,0.08)')
                          }}
                        >
                          🛡️ {zone.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-cyan-950/5 border border-slate-800/60 rounded-xl p-3.5 space-y-2">
                  <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">Active Privileges Checklist</span>
                  <div className="space-y-1.5 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500">✓</span>
                      <span>Full perimeter door override</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500">✓</span>
                      <span>CCTV vector tracking authorization</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={user.role === 'super_admin' ? 'text-emerald-500' : 'text-red-500'}>
                        {user.role === 'super_admin' ? '✓' : '✗'}
                      </span>
                      <span className={user.role === 'super_admin' ? '' : 'line-through opacity-50'}>
                        PA System Broadcast Override
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-500">✓</span>
                      <span>Gate solenoid release keys</span>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-800/60 rounded-xl p-3 bg-brand-void/40 space-y-2">
                  <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Biometric scanner ping logs</span>
                  <div className="space-y-1 font-mono text-[9px] text-slate-400 leading-tight">
                    <div>[13:19:42] BIO-ID: #8843 verified (Sharma)</div>
                    <div>[13:20:10] BIO-ID: #1240 verification failed (RFID mismatch)</div>
                    <div>[13:20:45] BIO-ID: #9901 verified (Arjun)</div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeNav === 'tickets' && (
              <motion.div
                key="tickets-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22 }}
                className="space-y-4"
              >
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-emerald-400 mb-0.5">Ingress Operations</div>
                  <h3 className="text-base font-bold text-white tracking-tight leading-tight">Ticketing Intelligence</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">Live validation performance metrics</p>
                </div>

                <div className="bg-brand-void/40 border border-slate-800/60 rounded-xl p-3.5 space-y-2">
                  <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Scan Validation Efficiency</span>
                  <div className="flex justify-between items-baseline font-mono">
                    <span className="text-2xl font-black text-emerald-400">99.4%</span>
                    <span className="text-[10px] text-slate-500">Target: &gt;99.0%</span>
                  </div>
                  <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: '99.4%' }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-brand-void/40 border border-slate-800/60 rounded-xl p-3">
                    <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">Unique Scans</span>
                    <span className="text-lg font-black font-mono text-emerald-400">{attendance - 12}</span>
                  </div>
                  <div className="bg-brand-void/40 border border-slate-800/60 rounded-xl p-3">
                    <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">Duplicates</span>
                    <span className="text-lg font-black font-mono text-red-500">{scannedTickets.size ? 12 + scannedTickets.size : 12}</span>
                  </div>
                </div>

                <div className="bg-brand-void/40 border border-slate-800/60 rounded-xl p-3 space-y-2">
                  <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Gate Speed Rankings</span>
                  <div className="space-y-1.5 text-xs">
                    {Object.entries(gateData).sort((a,b) => b[1].rate - a[1].rate).map(([id, gate]) => (
                      <div key={id} className="flex items-center justify-between text-slate-400">
                        <span className="font-semibold">{GATES[id].short} - {GATES[id].name}</span>
                        <span className="font-mono text-emerald-400 font-bold">{gate.rate}/min</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeNav === 'ai' && (
              <motion.div
                key="ai-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22 }}
                className="space-y-4"
              >
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-purple-400 mb-0.5">Cognitive Hub</div>
                  <h3 className="text-base font-bold text-white tracking-tight leading-tight">Gemini AI Ops</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">Operational intelligence configuration</p>
                </div>

                <div className="bg-brand-void/40 border border-slate-800/60 rounded-xl p-3.5 space-y-2">
                  <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Model Temperature</span>
                  <div className="flex justify-between items-baseline font-mono text-xs">
                    <span className="text-lg font-black text-purple-400">0.15 (Deterministic)</span>
                  </div>
                  <span className="block text-[9px] text-slate-500 mt-1">Configured for zero hallucination during security emergencies.</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-brand-void/40 border border-slate-800/60 rounded-xl p-3">
                    <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">Intent Match</span>
                    <span className="text-lg font-black font-mono text-purple-400">98.4%</span>
                  </div>
                  <div className="bg-brand-void/40 border border-slate-800/60 rounded-xl p-3">
                    <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">SOP Cache</span>
                    <span className="text-lg font-black font-mono text-purple-400">128 active</span>
                  </div>
                </div>

                <div className="border border-slate-800/60 rounded-xl p-3 bg-purple-950/5 space-y-2">
                  <span className="block text-[9px] font-black uppercase tracking-wider text-purple-400">Broadcast Control Node</span>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Audio voice announcer uses standard Speech Synthesis engine calibrated at 0.85 pitch for authoritative operational announcements.
                  </p>
                  <button
                    onClick={() => playTTS("Attention all spectators. System operations are running at full capacity.")}
                    className="w-full text-[10px] uppercase font-bold py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-center text-white"
                  >
                    📢 Test Announcer
                  </button>
                </div>
              </motion.div>
            )}

            {activeNav === 'analytics' && (
              <motion.div
                key="analytics-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22 }}
                className="space-y-4"
              >
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-blue-400 mb-0.5">Telemetry Intelligence</div>
                  <h3 className="text-base font-bold text-white tracking-tight leading-tight">Operational Analytics</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">Live staging timelines & velocity</p>
                </div>

                <div className="bg-brand-void/40 border border-slate-800/60 rounded-xl p-3.5 space-y-2">
                  <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Avg Staging Wait Time</span>
                  <div className="flex justify-between items-baseline font-mono">
                    <span className="text-2xl font-black text-blue-400">1.8 mins</span>
                    <span className="text-[10px] text-slate-500">Peak Prediction: 4.2m</span>
                  </div>
                  <div className="w-full bg-slate-850 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: '42%' }} />
                  </div>
                </div>

                <div className="bg-brand-void/40 border border-slate-800/60 rounded-xl p-3.5 space-y-2">
                  <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Perimeter Load Balancing</span>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">North Stand Ingress</span>
                      <span className="font-mono text-slate-300">42% (Normal)</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">East Stand Ingress</span>
                      <span className="font-mono text-orange-400">86% (Congested)</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">West Stand Ingress</span>
                      <span className="font-mono text-slate-300">48% (Normal)</span>
                    </div>
                  </div>
                </div>

                <div className="border border-slate-800/60 rounded-xl p-3 bg-blue-950/5">
                  <span className="block text-[9px] font-black uppercase tracking-wider text-blue-400 mb-1">Congestion Prediction</span>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Crowd velocity simulation predicts heavy staging buffers forming at Gate 3 inside the next 15 minutes due to high scan velocities.
                  </p>
                </div>
              </motion.div>
            )}

            {activeNav === 'scan' && (
              <motion.div
                key="scan-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22 }}
                className="space-y-4"
              >
                <div>
                  <div className="text-[9px] font-black uppercase tracking-wider text-emerald-400 mb-0.5">Validator Settings</div>
                  <h3 className="text-base font-bold text-white tracking-tight leading-tight">Webcam QR Scans</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">Hardware video configuration</p>
                </div>

                <div className="bg-brand-void/40 border border-slate-800/60 rounded-xl p-3.5 space-y-2">
                  <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">Camera FPS Telemetry</span>
                  <div className="flex justify-between items-baseline font-mono">
                    <span className="text-xl font-black text-emerald-400">10 Frames / Sec</span>
                    <span className="text-[10px] text-slate-500">Buffer: 0ms</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-brand-void/40 border border-slate-800/60 rounded-xl p-3">
                    <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">Local Scans</span>
                    <span className="text-lg font-black font-mono text-emerald-400">{scannedTickets.size}</span>
                  </div>
                  <div className="bg-brand-void/40 border border-slate-800/60 rounded-xl p-3">
                    <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">Last Code Status</span>
                    <span className="text-[11px] font-black font-mono text-slate-400 truncate">
                      {scannedTickets.size ? [...scannedTickets][scannedTickets.size - 1].substring(0, 8) : 'Awaiting Scan'}
                    </span>
                  </div>
                </div>

                <div className="border border-slate-800/60 rounded-xl p-3 bg-emerald-950/5">
                  <span className="block text-[9px] font-black uppercase tracking-wider text-emerald-400 mb-1">Instruction Brief</span>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Point your physical QR card or phone screen at the active webcam frame. The validation engine will decode, check for duplicate cloning, and update stats.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* COLUMN 2: CENTER PANEL — TACTICAL STADIUM MAP / CONSOLES */}
        <section className="cc-map-section">
          <div className="cc-map-header">
            <div className="cc-map-title flex items-center gap-2">
              <Radio size={16} className="text-cyan-400" />
              <span>
                {activeNav === 'tickets' ? 'Validation Terminal console' : 
                 activeNav === 'scan' ? 'Webcam Ticket Validator' : 
                 activeNav === 'analytics' ? 'Ingress Telemetry Analytics' : 
                 'Live Ingress Point & Security Sectors'}
              </span>
            </div>
            
            {/* Scenario Selector Switcher */}
            <div className="cc-scenario-selector">
              <span className="cc-scenario-label">SCENARIO HUB</span>
              <div className="cc-scenario-buttons">
                {[1, 2, 3, 4, 5].map(scenNum => (
                  <button
                    key={scenNum}
                    className={`cc-scenario-btn s${scenNum} ${currentScenario === scenNum ? 'active' : ''}`}
                    onClick={() => handleScenarioChange(scenNum)}
                  >
                    Scene {scenNum}
                  </button>
                ))}
              </div>
            </div>

            <div className="cc-map-legend">
              <div className="cc-map-legend-item">
                <div className="cc-map-legend-dot" style={{ background: 'var(--green)' }} />
                Safe
              </div>
              <div className="cc-map-legend-item">
                <div className="cc-map-legend-dot" style={{ background: 'var(--yellow)' }} />
                Moderate
              </div>
              <div className="cc-map-legend-item">
                <div className="cc-map-legend-dot" style={{ background: 'var(--orange)' }} />
                Heavy
              </div>
              <div className="cc-map-legend-item">
                <div className="cc-map-legend-dot" style={{ background: 'var(--red)' }} />
                Critical
              </div>
            </div>
          </div>

          <motion.div
            className="cc-map-wrap"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {/* Tactical Conic Radar Sweep */}
            <div className="cc-radar-sweep" />

            {/* DYNAMIC VIEWPORTS BASED ON ACTIVENAV STATE */}
            <AnimatePresence mode="wait">
              {/* VIEW 1: MAPS (dashboard, incidents, security, ai) */}
              {['dashboard', 'incidents', 'security', 'ai'].includes(activeNav) && (
                <motion.div
                  key="stadium-map-view"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="absolute inset-0 w-full h-full"
                >
                  {/* Plain Stadium main.png backdrop */}
                  <img 
                    src="/Stadium main.png" 
                    alt="Stadium Vector blueprint background" 
                    className="absolute inset-0 w-full h-full object-contain opacity-100 pointer-events-none"
                  />

                  {/* RBAC Header Overlay */}
                  <div style={{ position: 'absolute', top: '10px', left: '12px', fontSize: '9px', fontWeight: '700', color: 'var(--theme-color)', letterSpacing: '0.8px', zIndex: 10, background: 'rgba(6,10,19,0.85)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    RBAC LEVEL: {
                      user.role === 'super_admin' ? 'SOC COMMANDER (FULL STADIUM OVERSIGHT)' :
                      user.role === 'north_commander' ? 'NORTH SECTOR COMMANDER (OFFICER SHARMA)' :
                      user.role === 'east_commander' ? 'EAST SECTOR COMMANDER (OFFICER RAVI)' :
                      user.role === 'west_commander' ? 'WEST SECTOR COMMANDER (OFFICER ARJUN)' :
                      user.role === 'south_commander' ? 'SOUTH SECTOR COMMANDER (OFFICER NEHA)' :
                      user.role === 'vip_command' ? 'VIP SECURITY COMMAND (RESTRICTED)' : 'OPERATIONAL AGENT'
                    }
                  </div>

                  {/* Interactive SVG Overlay */}
                  <svg viewBox="0 0 500 360" className="cc-stadium-svg absolute inset-0 w-full h-full">
                    {/* Security Sectors Drawing */}
                    {SECTORS.map(sec => {
                      const metrics = getSectorMetrics(sec.id);
                      const pathData = describeArc(250, 160, sec.innerR, sec.innerR * 0.65, sec.outerR, sec.outerR * 0.65, sec.startAngle, sec.endAngle);
                      
                      // Base transparency (completely plain default view)
                      let fillCol = 'rgba(0,0,0,0)';
                      let strokeCol = 'rgba(0,0,0,0)';
                      let isHighlighted = false;

                      // HIGHLIGHT BRANCHES PER TAB MODE
                      if (activeNav === 'incidents') {
                        // Pulsing red overlays over sectors with active incidents
                        if (currentScenario === 3 && sec.id === 'sec3') {
                          fillCol = 'rgba(239, 68, 68, 0.2)';
                          strokeCol = '#ef4444';
                          isHighlighted = true;
                        } else if (currentScenario === 4 && sec.id === 'sec3') {
                          fillCol = 'rgba(249, 115, 22, 0.2)';
                          strokeCol = '#f97316';
                          isHighlighted = true;
                        } else if (currentScenario === 5) {
                          fillCol = 'rgba(239, 68, 68, 0.15)';
                          strokeCol = '#ef4444';
                          isHighlighted = true;
                        }
                      } else if (activeNav === 'security') {
                        // Highlight restricted zones (VIP box, Locker rooms, Press gallery) in neon green
                        if (sec.zone === 'VIP' || ['sec9', 'sec10', 'sec11', 'sec12'].includes(sec.id)) {
                          fillCol = 'rgba(34, 197, 94, 0.08)';
                          strokeCol = '#22c55e';
                          isHighlighted = true;
                        }
                      } else if (activeNav === 'ai') {
                        // Highlight evacuation channels in purple overlay
                        if (currentScenario === 5 && ['sec1', 'sec5', 'sec8'].includes(sec.id)) {
                          fillCol = 'rgba(168, 85, 247, 0.15)';
                          strokeCol = '#a855f7';
                          isHighlighted = true;
                        }
                      }

                      // Cyan tactical overlays on user mouse interactions
                      const isSelected = selectedSector && selectedSector.id === sec.id;
                      const isHovered = hoveredSector && hoveredSector.id === sec.id;
                      if (isSelected || isHovered) {
                        fillCol = 'rgba(6, 182, 212, 0.18)';
                        strokeCol = '#06b6d4';
                        isHighlighted = true;
                      }

                      const isInteractive = isSectorInteractive(sec);
                      let opacity = isInteractive ? 1 : 0.08;

                      return (
                        <path
                          key={sec.id}
                          d={pathData}
                          fill={fillCol}
                          stroke={strokeCol}
                          strokeWidth={isSelected ? 3.0 : (isHovered ? 2.0 : (isHighlighted ? 1.5 : 0))}
                          className="cc-sector-path transition-all duration-300"
                          opacity={opacity}
                          onMouseEnter={() => {
                            if (isInteractive) setHoveredSector({ ...sec, ...metrics });
                          }}
                          onMouseLeave={() => setHoveredSector(null)}
                          onClick={() => {
                            if (isInteractive) {
                              setSelectedSector({ ...sec, ...metrics });
                              setSelectedOfficer(null);
                              setHoveredSector(null);
                            }
                          }}
                        />
                      );
                    })}

                    {/* Dynamic Incident pulse pins (Incidents Mode) */}
                    {activeNav === 'incidents' && (
                      <>
                        {/* Sector 3 Surge locus pin */}
                        {(currentScenario === 3 || currentScenario === 4) && (
                          <g transform="translate(390, 220)" className="cc-incident-pin">
                            <circle r="12" fill="none" stroke="#ef4444" strokeWidth="2" className="animate-ping" />
                            <circle r="6" fill="#ef4444" />
                          </g>
                        )}
                        {/* VIP Lounge unauthorized access attempt pin */}
                        {currentScenario === 2 && (
                          <g transform="translate(320, 100)" className="cc-incident-pin">
                            <circle r="12" fill="none" stroke="#f97316" strokeWidth="2" className="animate-ping" />
                            <circle r="6" fill="#f97316" />
                          </g>
                        )}
                      </>
                    )}

                    {/* Restricted Solenoids Green/Red Lock status (Security Mode) */}
                    {activeNav === 'security' && (
                      <g transform="translate(250, 160)" style={{ pointerEvents: 'none' }}>
                        {/* Center stadium restricted lock */}
                        <circle r="14" fill="#020409" stroke="#22c55e" strokeWidth="1.5" />
                        <text x="0" y="3.5" textAnchor="middle" fontSize="10px">🔒</text>
                      </g>
                    )}

                    {/* Evacuation Vector Directing Arrows (AI Ops Mode) */}
                    {activeNav === 'ai' && currentScenario === 5 && (
                      <>
                        {/* Egress vectors outward arrows */}
                        <path d="M 250 80 L 250 40" stroke="#a855f7" strokeWidth="3" markerEnd="url(#arrow)" className="cc-medical-corridor" />
                        <path d="M 390 160 L 430 160" stroke="#a855f7" strokeWidth="3" className="cc-medical-corridor" />
                        <path d="M 110 160 L 70 160" stroke="#a855f7" strokeWidth="3" className="cc-medical-corridor" />
                      </>
                    )}
                  </svg>
                </motion.div>
              )}

              {/* VIEW 2: TICKETS VALIDATION CONSOLE (`tickets`) */}
              {activeNav === 'tickets' && (
                <motion.div
                  key="tickets-console-view"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="absolute inset-0 w-full h-full p-6 flex flex-col justify-between bg-brand-void/35"
                >
                  <div className="cc-ticket-console flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-300">Tactical RFID Scanner Console</h4>
                      <p className="text-[11px] text-slate-500">Live credential ingestion & fraud mitigation engine</p>
                    </div>

                    <div className={`cc-console-screen my-4 ${ticketConsoleFlash ? `flash-${ticketConsoleFlash}` : ''}`}>
                      <div className="cc-scanner-laser" />
                      
                      <AnimatePresence mode="wait">
                        {ticketConsoleFlash === 'success' ? (
                          <motion.div key="success" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="text-center space-y-2">
                            <span className="text-4xl">🟢</span>
                            <div className="text-lg font-black text-emerald-400 tracking-wider">CREDENTIAL VALIDATED</div>
                            <div className="font-mono text-xs text-slate-400">Attendance updated (+1) · Stand Alpha occupancy increased</div>
                          </motion.div>
                        ) : ticketConsoleFlash === 'fraud' ? (
                          <motion.div key="fraud" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="text-center space-y-2">
                            <span className="text-4xl animate-bounce">🚨</span>
                            <div className="text-lg font-black text-red-500 tracking-wider">CLONE ATTEMPT BLOCKED</div>
                            <div className="font-mono text-xs text-red-400">FRAUD ALERT: Duplicate scan detected at Gate 3! Officer Ravi notified.</div>
                          </motion.div>
                        ) : ticketConsoleFlash === 'vip' ? (
                          <motion.div key="vip" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="text-center space-y-2">
                            <span className="text-4xl">🛡️</span>
                            <div className="text-lg font-black text-blue-400 tracking-wider">VIP BLOCKADE ACTIVE</div>
                            <div className="font-mono text-xs text-blue-400">RESTRICTED ACCESS: Unauthorized scanner swipe at VIP Member Lounge.</div>
                          </motion.div>
                        ) : (
                          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-2">
                            <QrCode size={40} className="mx-auto text-emerald-500/40 animate-pulse" />
                            <div className="text-xs font-mono text-slate-500 uppercase tracking-widest">Awaiting scanner feed...</div>
                            <div className="text-[10px] text-slate-600">Simulate ticket scans below to trigger state modifications</div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Simulation buttons */}
                    <div className="flex gap-2 justify-center">
                      <button 
                        onClick={() => {
                          setTicketConsoleFlash('success');
                          setAttendance(p => p + 1);
                          setGateData(prev => ({
                            ...prev,
                            gate3: { ...prev.gate3, occupancy: Math.min(98, prev.gate3.occupancy + 1) }
                          }));
                          setTicketValidationFeed(prev => [
                            { id: Date.now(), name: 'Anish A.', type: 'valid', gate: 'G3', seat: 'Sec 4, Row C', time: shortTime() },
                            ...prev
                          ].slice(0, 5));
                          addIncident('info', 'Ticket Scan Success', 'RFID validated successfully at Gate 3.');
                          setTimeout(() => setTicketConsoleFlash(null), 1800);
                        }}
                        className="px-3 py-1.5 bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-900/40 rounded-lg text-xs font-bold text-emerald-400 transition"
                      >
                        ✔ Simulate Valid
                      </button>
                      <button 
                        onClick={() => {
                          setTicketConsoleFlash('fraud');
                          setTicketValidationFeed(prev => [
                            { id: Date.now(), name: 'Rahul K.', type: 'duplicate', gate: 'G3', seat: 'Sec 4, Row C', time: shortTime() },
                            ...prev
                          ].slice(0, 5));
                          addIncident('critical', 'DUPLICATE TICKET', 'Cloned barcode detected at Gate 3. Gate flagged in anti-fraud system.');
                          triggerAI('fraud');
                          setTimeout(() => setTicketConsoleFlash(null), 2200);
                        }}
                        className="px-3 py-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 rounded-lg text-xs font-bold text-red-400 transition"
                      >
                        ⚠️ Simulate Duplicate
                      </button>
                      <button 
                        onClick={() => {
                          setTicketConsoleFlash('vip');
                          setTicketValidationFeed(prev => [
                            { id: Date.now(), name: 'Badged Guest', type: 'vip_block', gate: 'VIP Box A', seat: 'VIP Suite 2', time: shortTime() },
                            ...prev
                          ].slice(0, 5));
                          addIncident('critical', 'VIP ACCESS BLOCKED', 'Unauthorized scan swipe at VIP Lounge Box A.');
                          setTimeout(() => setTicketConsoleFlash(null), 2000);
                        }}
                        className="px-3 py-1.5 bg-blue-950/20 hover:bg-blue-950/40 border border-blue-900/40 rounded-lg text-xs font-bold text-blue-400 transition"
                      >
                        🛡️ Simulate VIP Block
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* VIEW 3: DYNAMIC INGRESS ANALYTICS GRAPH (`analytics`) */}
              {activeNav === 'analytics' && (
                <motion.div
                  key="analytics-charts-view"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="absolute inset-0 w-full h-full p-6 flex flex-col bg-brand-void/35"
                >
                  <div className="cc-graph-container flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-300">Crowd Density Flow & Telemetry Profiles</h4>
                      <p className="text-[11px] text-slate-500">Hourly crowd ingress progression and load balance ratios</p>
                    </div>

                    <div className="cc-graph-row my-4 flex-1">
                      {/* Attendance growth inline SVG line graph */}
                      <div className="cc-graph-card">
                        <div className="cc-graph-card-title">Ingress Scans Growth (Last 6 Hours)</div>
                        <div className="flex-1 relative flex items-center justify-center">
                          <svg viewBox="0 0 240 100" className="w-full h-full overflow-visible">
                            {/* Gridlines */}
                            <line x1="0" y1="20" x2="240" y2="20" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                            <line x1="0" y1="50" x2="240" y2="50" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                            <line x1="0" y1="80" x2="240" y2="80" stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                            
                            {/* Ingress Line Path */}
                            <path 
                              d="M 0 85 Q 40 70 80 50 T 160 25 T 240 10" 
                              fill="none" 
                              stroke="#60a5fa" 
                              strokeWidth="2.5" 
                              filter="url(#glow-cyan)"
                            />
                            
                            {/* Scatter nodes */}
                            <circle cx="80" cy="50" r="3" fill="#60a5fa" />
                            <circle cx="160" cy="25" r="3" fill="#60a5fa" />
                            <circle cx="240" cy="10" r="4" fill="#3b82f6" className="animate-ping" />

                            <text x="5" y="95" fill="#475569" fontSize="6px">10:00</text>
                            <text x="80" y="95" fill="#475569" fontSize="6px">11:00</text>
                            <text x="160" y="95" fill="#475569" fontSize="6px">12:00</text>
                            <text x="220" y="95" fill="#475569" fontSize="6px">13:00</text>
                          </svg>
                        </div>
                      </div>

                      {/* Stand Occupancy density comparators */}
                      <div className="cc-graph-card">
                        <div className="cc-graph-card-title">Stand Capacity Load balances</div>
                        <div className="flex-1 flex flex-col justify-around text-xs">
                          {[
                            { name: 'North Stand', rate: 45, max: 100 },
                            { name: 'East stands', rate: 82, max: 100 },
                            { name: 'South Stand', rate: 35, max: 100 },
                            { name: 'West stands', rate: 58, max: 100 }
                          ].map(bar => (
                            <div key={bar.name} className="space-y-1">
                              <div className="flex justify-between font-semibold text-[10px] text-slate-400">
                                <span>{bar.name}</span>
                                <span>{bar.rate}%</span>
                              </div>
                              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800/40">
                                <div 
                                  className="h-full rounded-full transition-all duration-1000"
                                  style={{ 
                                    width: `${bar.rate}%`,
                                    background: bar.rate > 80 ? '#ef4444' : (bar.rate > 60 ? '#f97316' : '#3b82f6')
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* VIEW 4: DYNAMIC CAMERA VALIDATION PANEL (`scan`) */}
              {activeNav === 'scan' && (
                <motion.div
                  key="scan-camera-view"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="absolute inset-0 w-full h-full p-4 flex flex-col bg-brand-void/35"
                >
                  <div className="cc-scan-box flex-1 flex flex-col">
                    <div className="p-3 border-b border-slate-800/80 bg-brand-void/50 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-extrabold uppercase text-slate-300">Live Camera Ingest Feed</h4>
                        <p className="text-[9px] text-slate-500 font-mono">CHANNEL: SECURITY-CAM-GATE3</p>
                      </div>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-950/20 text-emerald-400 border border-emerald-900/30 animate-pulse">
                        CAM ONLINE
                      </span>
                    </div>

                    <div className="cc-scan-video-wrap flex-1">
                      <div id="full-qr-reader" className="w-full h-full object-cover" />
                      
                      <div className="cc-scan-hud">
                        <div className="cc-scan-hud-corners" />
                        <div className="cc-scan-hud-corner-b" />
                        <div className="cc-scanner-laser" />
                        
                        <div className="text-center pointer-events-none select-none z-10 p-4 rounded-xl bg-black/60 backdrop-blur-md border border-slate-800/80 max-w-[200px]">
                          <QrCode size={24} className="mx-auto text-emerald-500 mb-1" />
                          <span className="text-[9px] font-bold text-slate-300 tracking-wider uppercase block">Camera QR scan</span>
                          <span className="text-[8px] text-slate-500 block mt-0.5">Present barcode in center area to validate</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </section>

        {/* COLUMN 3: RIGHT PANEL — DYNAMIC INVESTIGATION & COPILOT */}
        <motion.aside
          className="cc-right"
          initial={{ x: 380, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
        >
          <AnimatePresence mode="wait">
            {/* RIGHT PANEL 1: COMMAND CENTER (dashboard) */}
            {activeNav === 'dashboard' && (
              <motion.div key="dashboard-right-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full">
                {/* SOC Feed */}
                <div className="cc-feed">
                  <div className="cc-panel-header">
                    <div className="cc-panel-title">
                      <Activity />
                      SOC Feed
                    </div>
                    <div className="cc-live-dot">
                      <span className="d" />
                      Live
                    </div>
                  </div>

                  <div className="cc-feed-list">
                    {incidents.length === 0 ? (
                      <div className="cc-feed-empty font-mono">System nominal — no incidents</div>
                    ) : (
                      <AnimatePresence initial={false}>
                        {incidents.map(inc => (
                          <motion.div
                            key={inc.id}
                            className={`cc-feed-item ${inc.type}`}
                            initial={{ opacity: 0, x: 40, height: 0 }}
                            animate={{ opacity: 1, x: 0, height: 'auto' }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.35 }}
                          >
                            <span className="cc-feed-time">{inc.time}</span>
                            <div>
                              <div className="cc-feed-title">{inc.title}</div>
                              <div className="cc-feed-msg">{inc.message}</div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    )}
                  </div>
                </div>

                {/* AI Panel */}
                <div className="cc-ai">
                  <div className="cc-panel-header">
                    <div className="cc-panel-title">
                      <Brain />
                      Gemini AI Copilot
                    </div>
                  </div>

                  <div className="cc-ai-triggers">
                    <button className="cc-ai-btn" onClick={() => triggerAI('surge')}>
                      <Users size={16} style={{ color: 'var(--yellow)' }} />
                      Surge
                    </button>
                    <button className="cc-ai-btn" onClick={() => triggerAI('fraud')}>
                      <ShieldAlert size={16} style={{ color: 'var(--red)' }} />
                      Fraud
                    </button>
                    <button className="cc-ai-btn" onClick={() => triggerAI('rain')}>
                      <CloudRain size={16} style={{ color: 'var(--accent-bright)' }} />
                      Rain
                    </button>
                    <button className="cc-ai-btn" onClick={() => triggerAI('medical')}>
                      <Zap size={16} style={{ color: 'var(--orange)' }} />
                      Medical
                    </button>
                    <button className="cc-ai-btn" onClick={() => triggerAI('surge')}>
                      <Eye size={16} style={{ color: 'var(--text-muted)' }} />
                      Rogue Dev
                    </button>
                    <button className="cc-ai-btn" onClick={() => triggerAI('surge')}>
                      <Siren size={16} style={{ color: 'var(--red)' }} />
                      DDoS
                    </button>
                  </div>

                  <div className="cc-ai-output">
                    <AnimatePresence mode="wait">
                      {isGenerating ? (
                        <motion.div key="generating" className="cc-ai-generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <div className="cc-ai-dots">
                            <span /><span /><span />
                          </div>
                          <span className="cc-ai-gen-text">Gemini analyzing threat matrix...</span>
                        </motion.div>
                      ) : aiResponse ? (
                        <motion.div key="response" className="cc-ai-resp space-y-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                          <div className={`cc-ai-risk ${aiResponse.riskClass}`}>RISK: {aiResponse.risk}</div>
                          
                          <div className="cc-ai-section">
                            <div className="cc-ai-label">Generated SOP</div>
                            <div className="cc-ai-text mono text-xs" style={{ whiteSpace: 'pre-wrap' }}>{aiResponse.sop}</div>
                          </div>

                          <div className="cc-ai-section">
                            <div className="cc-ai-label">Auto-Assigned Staff</div>
                            <div className="cc-ai-text hl">{aiResponse.staff}</div>
                          </div>

                          {aiResponse.pa && (
                            <div className="cc-ai-pa-box">
                              <div className="cc-ai-label">PA Announcement</div>
                              <div className="cc-ai-pa-text text-[11px]">"{aiResponse.pa}"</div>
                              <button
                                className={`cc-broadcast-btn ${isPlaying ? 'playing' : ''}`}
                                onClick={() => playTTS(aiResponse.pa)}
                                disabled={isPlaying}
                              >
                                {isPlaying ? <><MicOff size={12} /> Broadcasting...</> : <><Mic size={12} /> Broadcast PA</>}
                              </button>
                            </div>
                          )}
                        </motion.div>
                      ) : (
                        <div className="cc-ai-idle font-mono text-center">
                          <Brain size={32} className="mx-auto opacity-35 mb-2" />
                          <p className="text-xs">Awaiting incident data.<br />Trigger a simulation to activate.</p>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}

            {/* RIGHT PANEL 2: INCIDENTS INVESTIGATION (incidents) */}
            {activeNav === 'incidents' && (
              <motion.div key="incidents-right-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full p-4 justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-300 mb-2">Detailed Incidents Log</h4>
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {incidents
                      .filter(i => incidentFilter === 'all' || i.type === incidentFilter)
                      .filter(i => selectedIncidentType === 'all' || i.title.toLowerCase().includes(selectedIncidentType) || i.message.toLowerCase().includes(selectedIncidentType))
                      .map(inc => (
                        <div key={inc.id} className={`p-2.5 rounded-lg bg-black/40 border border-slate-800/40 text-xs flex gap-2 border-l-2 border-l-red-500`}>
                          <span className="font-mono text-[9px] text-slate-500">{inc.time}</span>
                          <div>
                            <div className="font-bold text-red-400">{inc.title}</div>
                            <div className="text-slate-400 text-[10px] mt-0.5">{inc.message}</div>
                          </div>
                        </div>
                    ))}
                    {incidents.length === 0 && (
                      <div className="text-xs font-mono text-slate-500 text-center py-10">No incident logs found matching filters</div>
                    )}
                  </div>
                </div>

                {/* Timeline Replay Widget */}
                <div className="space-y-2 mt-4 pt-4 border-t border-slate-800/80">
                  <span className="block text-[10px] font-black uppercase tracking-wider text-orange-400">Timeline Replay Progression</span>
                  <p className="text-[10px] text-slate-500">Track and replay the crowd surge chronological build-up</p>
                  
                  <div className="cc-timeline">
                    {[
                      { step: 0, time: '12:54:10', msg: 'Ingress surge starts at Gate 3' },
                      { step: 1, time: '12:54:23', msg: 'Heavy density buffer forms at Block C' },
                      { step: 2, time: '12:54:40', msg: 'AI automatically flags surge threshold' },
                      { step: 3, time: '12:54:43', msg: 'Gemini SOP evacuation routing activated' },
                      { step: 4, time: '12:54:50', msg: 'Officer Ravi deploys crowd handlers' },
                    ].map(item => (
                      <div 
                        key={item.step} 
                        onClick={() => {
                          setTimelineStep(item.step);
                          if (item.step === 2 || item.step === 3) {
                            setGateData(prev => ({ ...prev, gate3: { ...prev.gate3, occupancy: 96 } }));
                            addIncident('warning', 'Timeline Event Checked', item.msg);
                          }
                        }}
                        className={`cc-timeline-item ${timelineStep === item.step ? 'active' : (timelineStep > item.step ? 'played' : '')}`}
                      >
                        <div className="cc-timeline-dot" />
                        <div className="cc-timeline-content">
                          <span className="cc-timeline-time">{item.time}</span>
                          <span className="cc-timeline-msg">{item.msg}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setTimelineStep(0);
                        addIncident('info', 'Timeline Reset', 'Progression timeline reset to 12:54:10.');
                      }}
                      className="flex-1 text-[10px] py-1.5 rounded bg-brand-void border border-slate-800 font-bold uppercase text-slate-300 text-center"
                    >
                      ⏮ Reset Replay
                    </button>
                    <button 
                      onClick={() => {
                        const nextStep = (timelineStep + 1) % 5;
                        setTimelineStep(nextStep);
                        addIncident('warning', 'Timeline Advanced', `Chronological timeline stepped to step ${nextStep + 1}`);
                      }}
                      className="flex-1 text-[10px] py-1.5 rounded bg-red-950/20 border border-red-900/30 font-bold uppercase text-red-400 text-center"
                    >
                      ▶ Next Step
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* RIGHT PANEL 3: CYBER + OPERATIONAL LOGS (security) */}
            {activeNav === 'security' && (
              <motion.div key="security-right-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full p-4 justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-300 mb-2">Cyber Security Incident Logs</h4>
                  <div className="space-y-2">
                    {activeSecurityLogs.map(log => (
                      <div key={log.id} className="p-2 bg-black/40 border border-slate-800/40 rounded-lg text-[11px] flex gap-2">
                        <span className="font-mono text-[9px] text-slate-500 mt-0.5">{log.time}</span>
                        <div>
                          <div className="font-bold text-emerald-400">{log.zone}</div>
                          <div className="text-slate-400 text-[10px]">{log.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Unique VIP Attempt block panel card */}
                <div className="p-3 border border-red-500/30 bg-red-950/10 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-500">Security alert blockade</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  </div>
                  <h5 className="text-xs font-bold text-white">VIP Zone Access Attempt Blocked</h5>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    AI Firewall flagged scan attempt at **VIP Box A** using an inactive credential barcode. Scanner has been auto-isolated. IP flagged: **192.168.10.42**.
                  </p>
                  <button 
                    onClick={() => {
                      addIncident('critical', 'IP DETACHED', 'Isolated node 192.168.10.42 from local stadium VLAN.');
                      setActiveSecurityLogs(prev => [
                        { id: Date.now(), time: shortTime(), type: 'block', message: 'VLAN Node 192.168.10.42 blocked and isolated.', zone: 'VIP Box A' },
                        ...prev
                      ]);
                    }}
                    className="w-full py-1.5 bg-red-900/20 hover:bg-red-900/40 border border-red-800/40 text-[9px] font-black tracking-widest text-red-400 rounded-lg uppercase"
                  >
                    🔒 Isolate Attacking Node
                  </button>
                </div>
              </motion.div>
            )}

            {/* RIGHT PANEL 4: LIVE INGRESS STREAM LOGS (tickets) */}
            {activeNav === 'tickets' && (
              <motion.div key="tickets-right-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full p-4">
                <h4 className="text-xs font-black uppercase text-slate-300 mb-3">Live Ingress Validator Stream</h4>
                
                <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                  {ticketValidationFeed.map(log => (
                    <div key={log.id} className="p-2.5 rounded-lg bg-black/40 border border-slate-800/40 flex items-center justify-between text-xs transition duration-300">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px]">
                          {log.type === 'valid' ? '🟢' : (log.type === 'duplicate' ? '🔴' : '🛡️')}
                        </span>
                        <div>
                          <div className="font-bold text-slate-300">{log.name}</div>
                          <div className="text-slate-500 text-[10px] font-mono">{log.seat} · {log.gate}</div>
                        </div>
                      </div>
                      <span className="font-mono text-[9px] text-slate-500 font-bold">{log.time}</span>
                    </div>
                  ))}
                  {ticketValidationFeed.length === 0 && (
                    <div className="text-xs font-mono text-slate-500 text-center py-20">Awaiting scan simulation...</div>
                  )}
                </div>
              </motion.div>
            )}

            {/* RIGHT PANEL 5: ACTIVE GEMINI PLAYBOOKS (ai) */}
            {activeNav === 'ai' && (
              <motion.div key="ai-right-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full p-4 justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-300 mb-2">Active Gemini Playbooks</h4>
                  <p className="text-[10px] text-slate-500 mb-3">SOP blueprints and evacuations auto-generated by the AI</p>

                  <div className="space-y-3 font-mono text-[11px] text-slate-300">
                    <div className="p-2.5 rounded-lg bg-purple-950/10 border border-purple-800/15">
                      <div className="text-purple-400 font-bold text-[10px] mb-1">SOP ACTION STEPS</div>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-purple-400">1.</span>
                          <span>Open Auxiliary Overflow Gate G5</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-purple-400">2.</span>
                          <span>Dispatch 3 Volunteers to East Lower</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-purple-400">3.</span>
                          <span>Redirect crowd lanes to East Upper</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Announcement announcer Speech synth box */}
                <div className="p-3 border border-purple-800/25 bg-purple-950/5 rounded-xl space-y-2">
                  <span className="text-[9px] font-black uppercase text-purple-400">PA Announcement generator</span>
                  <div className="text-[11px] text-slate-400 italic">
                    "AI Operational routing active: Evacuation route channels are now open. Calmly walk to Ingress Gate G5 immediately."
                  </div>
                  <button
                    onClick={() => playTTS("AI Operational routing active: Evacuation route channels are now open. Calmly walk to Ingress Gate G5 immediately.")}
                    className="w-full py-1.5 bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white rounded-lg flex items-center justify-center gap-1.5 transition"
                  >
                    📢 Broadcast Announcement
                  </button>
                </div>
              </motion.div>
            )}

            {/* RIGHT PANEL 6: FORECASTS AND STAGING (analytics) */}
            {activeNav === 'analytics' && (
              <motion.div key="analytics-right-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full p-4 justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-300 mb-2">Crowd Predictions & Forecast</h4>
                  <div className="space-y-3 text-xs text-slate-300">
                    <div className="p-3 bg-slate-900/60 border border-slate-800/50 rounded-xl space-y-1.5">
                      <div className="text-[9px] font-black uppercase text-slate-500">Staging Area Bottleneck risk</div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm font-black text-amber-400">MODERATE TO HIGH</span>
                        <span className="font-mono text-[10px] text-slate-400">Buffer time: 4m</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-900/60 border border-slate-800/50 rounded-xl space-y-1.5">
                      <div className="text-[9px] font-black uppercase text-slate-500">Response incident latency</div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm font-black text-emerald-400">42 Seconds avg</span>
                        <span className="font-mono text-[10px] text-slate-400">Target: &lt;60s</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 border border-slate-800 bg-brand-void/45 rounded-xl text-center text-slate-500 text-[10px] font-mono uppercase tracking-widest">
                  Operational Analytics Online
                </div>
              </motion.div>
            )}

            {/* RIGHT PANEL 7: SCAN RESULT INFORMATION (scan) */}
            {activeNav === 'scan' && (
              <motion.div key="scan-right-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full p-4 justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-300 mb-3">Validator Queue Result</h4>
                  
                  <AnimatePresence mode="wait">
                    {scannedTickets.size ? (
                      <motion.div key="scanned-card" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-3 border border-emerald-500/25 bg-emerald-950/10 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black uppercase text-emerald-400">VALID TICKET CARD</span>
                          <span className="text-[12px]">🟢</span>
                        </div>
                        
                        <div className="space-y-1 text-xs">
                          <div className="text-[10px] text-slate-500">SPECTATOR NAME</div>
                          <div className="font-black text-white text-sm">Anish A.</div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <div className="text-[9px] text-slate-500">GATE POINT</div>
                            <div className="font-bold text-slate-300">Gate 3 (G3)</div>
                          </div>
                          <div>
                            <div className="text-[9px] text-slate-500">STAND / SEAT</div>
                            <div className="font-bold text-slate-300">Sec 4, Row C</div>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="text-center font-mono py-16 text-xs text-slate-500 border border-slate-800/80 border-dashed rounded-xl">
                        Awaiting QR barcode scan from active camera feed...
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="space-y-2">
                  {/* Simulate scan click fallback in case camera permissions are restricted */}
                  <button 
                    onClick={() => {
                      const newCode = `TICKET-${Math.floor(1000 + Math.random()*9000)}`;
                      handleTicketScan(newCode);
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white rounded-lg flex items-center justify-center gap-1.5 transition"
                  >
                    📷 Mock Camera Scan
                  </button>
                  <button 
                    onClick={() => {
                      handleTicketScan('TICKET-DUPLICATE-EXPIRED');
                      // Scan twice
                      handleTicketScan('TICKET-DUPLICATE-EXPIRED');
                    }}
                    className="w-full py-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 text-red-400 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition"
                  >
                    ⚠️ Mock Duplicate Scan
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.aside>

        {/* BOTTOM TELEMETRY BAR */}
        <section className="cc-gates-row">
          {Object.entries(GATES).map(([id, gate], idx) => {
            const data = gateData[id] || { occupancy: 20, rate: 50 };
            const status = getStatus(data.occupancy);
            const isG3Locked = currentScenario === 4 && id === 'gate3';

            // Identify officer assigned based on gate id
            let assignedOfficer = 'Officer Sharma';
            if (id === 'gate3' || id === 'gate4') assignedOfficer = 'Officer Ravi';
            if (id === 'gate5' || id === 'gate6') assignedOfficer = 'Officer Arjun';

            // Congestion trends
            const trend = data.rate > 170 ? 'up' : (data.rate < 100 ? 'down' : 'steady');

            return (
              <motion.div
                key={id}
                className={`cc-gcard ${status} ${isG3Locked ? 'border-red-500/40 bg-red-950/5' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + idx * 0.07, duration: 0.4, ease: 'easeOut' }}
                onClick={() => {
                  setSelectedSector({
                    isGate: true,
                    gateId: id,
                    name: `Ingress Point ${gate.short}`,
                    block: gate.name,
                    ingress: gate.short,
                    officer: assignedOfficer,
                    occupancy: data.occupancy,
                    flowRate: data.rate,
                    status: status,
                    description: `${gate.name} access control and RFID check corridor.`
                  });
                  setSelectedOfficer(null);
                  setHoveredSector(null);
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className="cc-gcard-top">
                  <span className="cc-gcard-label font-bold text-slate-400">{gate.short}</span>
                  <div className="flex items-center gap-1">
                    <span 
                      className="text-[8px] font-black uppercase tracking-wider px-1 py-0.2 rounded"
                      style={{ 
                        color: isG3Locked ? '#ef4444' : getBarColor(data.occupancy),
                        background: `${isG3Locked ? '#ef4444' : getBarColor(data.occupancy)}12`
                      }}
                    >
                      {isG3Locked ? 'LOCKED' : status}
                    </span>
                    <span className={`cc-gcard-status ${isG3Locked ? 'critical' : status}`} />
                  </div>
                </div>

                <div className="flex items-baseline justify-between">
                  <div className="cc-gcard-occ font-extrabold font-mono text-[18px] leading-tight" style={{ color: isG3Locked ? '#ef4444' : getBarColor(data.occupancy) }}>
                    {isG3Locked ? '0%' : `${data.occupancy}%`}
                  </div>
                  <div className="text-[10px] font-bold flex items-center gap-0.5 text-slate-500">
                    {trend === 'up' ? (
                      <span className="text-red-500 font-extrabold">↑</span>
                    ) : trend === 'down' ? (
                      <span className="text-emerald-500 font-extrabold">↓</span>
                    ) : (
                      <span className="text-slate-500 font-extrabold">→</span>
                    )}
                    <span className="font-mono text-[10px] text-slate-400">{isG3Locked ? 0 : data.rate}/m</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="cc-gcard-bar my-1.5 h-1 bg-slate-800/80 rounded-full overflow-hidden">
                  <div 
                    className="cc-gcard-bar-fill h-full rounded-full transition-all duration-500" 
                    style={{ 
                      width: isG3Locked ? '0%' : `${data.occupancy}%`, 
                      background: isG3Locked ? '#ef4444' : getBarColor(data.occupancy) 
                    }} 
                  />
                </div>

                {/* Officer assignment */}
                <div className="text-[9px] text-slate-500 font-bold flex items-center justify-between mt-1 pt-0.5 border-t border-slate-800/40">
                  <span className="truncate">👮 {assignedOfficer.split(' ')[1]}</span>
                  <span className="font-mono opacity-70 truncate max-w-[40px] text-right">{gate.name.split(' ')[0]}</span>
                </div>
              </motion.div>
            );
          })}

          <motion.button
            className={`cc-lockdown-btn flex flex-col items-center justify-center gap-1.5`}
            onClick={toggleLockdown}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.4, ease: 'easeOut' }}
          >
            {isLockdown ? <Unlock size={18} className="text-emerald-400" /> : <Lock size={18} className="text-red-500 animate-pulse" />}
            <span className="font-black text-[10px] tracking-wider">{isLockdown ? 'RELEASE' : 'LOCKDOWN'}</span>
          </motion.button>
        </section>
      </motion.main>

      {/* ═══════ QR SCANNER MODAL ═══════ */}
      <AnimatePresence>
        {showQR && (
          <motion.div
            className="qr-overlay"
            onClick={stopScanner}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              className="qr-modal"
              onClick={e => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <div className="qr-modal-header">
                <div className="qr-modal-title">
                  <QrCode size={20} style={{ color: 'var(--accent)' }} />
                  Live Ticket Scanner
                </div>
                <button className="qr-modal-close" onClick={stopScanner}>
                  <X size={16} />
                </button>
              </div>
              <div id="qr-reader" style={{ width: '100%', marginBottom: '16px' }} />
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                Point your camera at a QR code ticket. Scan the same code twice to trigger a fraud alert.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
