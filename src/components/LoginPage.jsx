import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Circle, Shield, Eye, EyeOff, Globe, UserCheck, LogIn } from 'lucide-react';

// ─── Demo Credentials (auto-fill on role select) ───
const ROLES = [
  { value: 'super_admin', label: 'SOC Commander (Chief Security Officer)', username: 'Cmdr. Ravi', password: 'cso@2026' },
  { value: 'north_commander', label: 'North Sector Commander (Officer Sharma)', username: 'Officer Sharma', password: 'north@2026' },
  { value: 'east_commander', label: 'East Sector Commander (Officer Ravi)', username: 'Officer Ravi', password: 'east@2026' },
  { value: 'west_commander', label: 'West Sector Commander (Officer Arjun)', username: 'Officer Arjun', password: 'west@2026' },
  { value: 'south_commander', label: 'South Sector Commander (Officer Neha)', username: 'Officer Neha', password: 'south@2026' },
  { value: 'vip_command', label: 'VIP Security Command', username: 'Agent Roy', password: 'vip@2026' },
  { value: 'medical', label: 'Medical Response Team (Dr. Sharma)', username: 'Dr. Sharma', password: 'med@2026' },
  { value: 'volunteer', label: 'Volunteer Coordinator', username: 'Vol. Coordinator', password: 'vol@2026' },
  { value: 'emergency', label: 'Emergency Commander (Cmdr. Singh)', username: 'Cmdr. Singh', password: 'emr@2026' },
];

// ─── Motion Variants ───
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.2 } },
};
const childVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

// ═══════════════════════════════════════════════
// STEP ITEM
// ═══════════════════════════════════════════════
function StepItem({ number, text, active }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
      active
        ? 'bg-white text-black border border-white'
        : 'bg-brand-gray text-white border border-transparent'
    }`}>
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        active ? 'bg-black text-white' : 'bg-white/10 text-white/40'
      }`}>
        {number}
      </div>
      <span className={active ? '' : 'text-white/50'}>{text}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════
// SOCIAL BUTTON
// ═══════════════════════════════════════════════
function SocialButton({ icon: Icon, label }) {
  return (
    <button
      type="button"
      className="flex h-12 items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-black text-sm font-medium text-white transition-all hover:bg-white/5 active:scale-[0.98] cursor-pointer"
    >
      <Icon size={18} />
      {label}
    </button>
  );
}

// ═══════════════════════════════════════════════
// INPUT GROUP
// ═══════════════════════════════════════════════
function InputGroup({ label, placeholder, type = 'text', value, onChange, children }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-white">{label}</label>
      <div className="relative">
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="h-11 w-full rounded-xl border-none bg-brand-gray px-4 text-white placeholder:text-white/20 outline-none ring-0 focus:ring-2 focus:ring-white/20 transition-shadow"
        />
        {children}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// STADIUM VISUALIZER (Canvas Overlay)
// ═══════════════════════════════════════════════
function StadiumVisualizer() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    
    // Resize handler
    const handleResize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();

    // Initialize particles (attendees/IoT nodes)
    const numParticles = 45;
    const particles = [];
    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 1.8 + 1,
        baseAlpha: Math.random() * 0.25 + 0.1,
        alpha: 0.2,
        detected: 0
      });
    }

    // Initialize crowd pulses
    const stadiumSteps = [60, 100, 140, 180];
    const pulses = [
      { r: stadiumSteps[0], maxR: 240, speed: 0.5, alpha: 0.4 },
      { r: stadiumSteps[0] + 60, maxR: 240, speed: 0.4, alpha: 0.2 }
    ];

    let radarAngle = 0;
    let gridOffset = 0;

    const draw = () => {
      // Clear canvas to allow video showing underneath
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const cx = canvas.width / 2;
      const cy = canvas.height * 0.42;
      const ellipseRatio = 0.55; // oval stadium aspect ratio

      // 1. FAINT MOVING GRID
      gridOffset += 0.12;
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.025)';
      ctx.lineWidth = 1;
      const gridSize = 45;
      
      for (let x = (gridOffset % gridSize); x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = (gridOffset % gridSize); y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // 2. STADIUM WIREFRAME
      ctx.lineWidth = 1.2;
      stadiumSteps.forEach((stepRadius, index) => {
        ctx.beginPath();
        ctx.ellipse(cx, cy, stepRadius, stepRadius * ellipseRatio, 0, 0, Math.PI * 2);
        
        if (index === 0) {
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
          ctx.fillStyle = 'rgba(0, 240, 255, 0.015)';
          ctx.fill();
        } else {
          ctx.strokeStyle = `rgba(0, 240, 255, ${0.12 - index * 0.025})`;
        }
        ctx.stroke();
      });

      // Seating sectors
      const numSectors = 12;
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
      ctx.beginPath();
      for (let i = 0; i < numSectors; i++) {
        const angle = (i * Math.PI * 2) / numSectors;
        const outerR = stadiumSteps[stadiumSteps.length - 1];
        const startX = cx + Math.cos(angle) * stadiumSteps[0];
        const startY = cy + Math.sin(angle) * stadiumSteps[0] * ellipseRatio;
        const endX = cx + Math.cos(angle) * outerR;
        const endY = cy + Math.sin(angle) * outerR * ellipseRatio;
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
      }
      ctx.stroke();

      // 3. CROWD PULSE EFFECT
      pulses.forEach(p => {
        p.r += p.speed;
        if (p.r > p.maxR) {
          p.r = stadiumSteps[0];
          p.alpha = 0.4;
        } else {
          p.alpha = (1 - (p.r - stadiumSteps[0]) / (p.maxR - stadiumSteps[0])) * 0.35;
        }

        ctx.beginPath();
        ctx.ellipse(cx, cy, p.r, p.r * ellipseRatio, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 240, 255, ${p.alpha})`;
        ctx.lineWidth = 1.8;
        ctx.stroke();
      });

      // 4. RADAR SWEEP
      radarAngle += 0.007;
      if (radarAngle > Math.PI * 2) radarAngle -= Math.PI * 2;

      const radarRadius = 230;
      const sweepX = cx + Math.cos(radarAngle) * radarRadius;
      const sweepY = cy + Math.sin(radarAngle) * radarRadius * ellipseRatio;

      // Draw sweep trailing cone
      const gradientSteps = 35;
      for (let i = 0; i < gradientSteps; i++) {
        const stepAngle = radarAngle - (i * 0.012);
        const stepAlpha = (1 - i / gradientSteps) * 0.12;
        
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(
          cx + Math.cos(stepAngle) * radarRadius,
          cy + Math.sin(stepAngle) * radarRadius * ellipseRatio
        );
        ctx.lineTo(
          cx + Math.cos(stepAngle - 0.012) * radarRadius,
          cy + Math.sin(stepAngle - 0.012) * radarRadius * ellipseRatio
        );
        ctx.closePath();
        ctx.fillStyle = `rgba(0, 240, 255, ${stepAlpha})`;
        ctx.fill();
      }

      // Radar Sweep line
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(sweepX, sweepY);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // 5. MOVING PARTICLES & MESH NETWORK
      particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;

        // Bouncing logic with screen boundary clamping
        if (p.x < 10) { p.x = 10; p.vx *= -1; }
        if (p.x > canvas.width - 10) { p.x = canvas.width - 10; p.vx *= -1; }
        if (p.y < 10) { p.y = 10; p.vy *= -1; }
        if (p.y > canvas.height - 10) { p.y = canvas.height - 10; p.vy *= -1; }

        // Radar detection detection
        const dx = p.x - cx;
        const dy = (p.y - cy) / ellipseRatio;
        let pAngle = Math.atan2(dy, dx);
        if (pAngle < 0) pAngle += Math.PI * 2;

        let angleDiff = radarAngle - pAngle;
        if (angleDiff < 0) angleDiff += Math.PI * 2;

        if (angleDiff < 0.12 && angleDiff > 0) {
          p.detected = 1.0;
        } else if (p.detected > 0) {
          p.detected -= 0.018;
        }

        // Draw connections (mesh network)
        for (let j = idx + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 75) {
            const lineAlpha = (1 - dist / 75) * 0.04 * (1 + p.detected * 0.4 + p2.detected * 0.4);
            ctx.strokeStyle = `rgba(0, 240, 255, ${lineAlpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }

        // Particle dot
        const finalSize = p.size + (p.detected * 2.2);
        const glowAlpha = p.baseAlpha + (p.detected * 0.7);
        
        if (p.detected > 0) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, finalSize * 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 240, 255, ${glowAlpha * 0.22})`;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, finalSize, 0, Math.PI * 2);
        ctx.fillStyle = p.detected > 0.3 
          ? `rgba(255, 255, 255, ${glowAlpha})` 
          : `rgba(0, 240, 255, ${glowAlpha})`;
        ctx.fill();
      });

      // 6. STADIUM MINI-BEACONS
      stadiumSteps.forEach((r, idx) => {
        if (idx === 0) return;
        const beaconCount = 4 + idx * 2;
        for (let i = 0; i < beaconCount; i++) {
          const angle = (i * Math.PI * 2) / beaconCount + (gridOffset * 0.0008 * (idx % 2 === 0 ? 1 : -1));
          const bx = cx + Math.cos(angle) * r;
          const by = cy + Math.sin(angle) * r * ellipseRatio;
          
          const pulseVal = Math.sin(gridOffset * 0.04 + idx + i) * 0.5 + 0.5;
          ctx.beginPath();
          ctx.arc(bx, by, 1.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0, 240, 255, ${0.08 + pulseVal * 0.25})`;
          ctx.fill();
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-[5]"
    />
  );
}

// ═══════════════════════════════════════════════
// MAIN LOGIN PAGE
// ═══════════════════════════════════════════════
export default function LoginPage({ onLogin }) {
  const [selectedRole, setSelectedRole] = useState(ROLES[0]);
  const [username, setUsername] = useState(ROLES[0].username);
  const [password, setPassword] = useState(ROLES[0].password);
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleChange = (e) => {
    const role = ROLES.find(r => r.value === e.target.value);
    setSelectedRole(role);
    setUsername(role.username);
    setPassword(role.password);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      onLogin({
        username,
        role: selectedRole.value,
        roleLabel: selectedRole.label,
      });
    }, 900);
  };

  return (
    <main className="flex min-h-screen w-full bg-black selection:bg-white/30 p-2 transition-all duration-500 lg:h-screen lg:overflow-hidden lg:p-4">

      {/* ═══════ LEFT COLUMN — HERO + VIDEO ═══════ */}
      <div className="relative hidden w-[52%] flex-col items-center justify-end rounded-3xl overflow-hidden shadow-2xl h-full pb-32 px-12 lg:flex">
        {/* Background Video */}
        <video
          autoPlay muted loop playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260506_081238_406ed0e3-5d83-436e-a512-0bbff7ec5b95.mp4"
            type="video/mp4"
          />
        </video>

        {/* Faint Dark Overlay to increase contrast and glowing UI vibe */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20 z-[2] pointer-events-none" />

        {/* Dynamic Stadium Radar & Particles Canvas Visualizer */}
        <StadiumVisualizer />

        {/* Hero Content */}
        <motion.div
          className="z-10 w-full max-w-xs space-y-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Brand */}
          <motion.div variants={childVariants} className="flex items-center gap-2.5">
            <img src="/Logo.png" alt="StadiumSOC Logo" className="h-6 w-auto object-contain" />
            <span className="text-xl font-bold tracking-tight text-white">StadiumSOC</span>
          </motion.div>

          {/* Heading */}
          <motion.div variants={childVariants} className="space-y-3">
            <h1 className="text-4xl font-medium tracking-tight whitespace-nowrap">Command Center</h1>
            <p className="text-white/60 text-sm leading-relaxed">
              Follow these 3 phases to access your Stadium SOC.
            </p>
          </motion.div>

          {/* Steps */}
          <motion.div variants={childVariants} className="space-y-2.5">
            <StepItem number={1} text="Authenticate identity" active />
            <StepItem number={2} text="Access your dashboard" />
            <StepItem number={3} text="Begin live operations" />
          </motion.div>
        </motion.div>
      </div>

      {/* ═══════ RIGHT COLUMN — LOGIN FORM ═══════ */}
      <div className="flex-1 flex flex-col items-center justify-center py-12 lg:py-6 px-4 sm:px-12 lg:px-16 xl:px-24 overflow-y-auto lg:overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="w-full max-w-xl space-y-8 lg:space-y-6 sm:space-y-10"
        >
          {/* Header */}
          <div>
            <h2 className="text-3xl font-medium tracking-tight">Access Command Center</h2>
            <p className="text-white/40 text-sm mt-2">Select your role to auto-fill credentials for the demo.</p>
          </div>

          {/* Social Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <SocialButton icon={Globe} label="Google SSO" />
            <SocialButton icon={UserCheck} label="Badge Scan" />
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-black px-4 text-xs font-medium text-white/40 uppercase tracking-widest">Or</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role Selector */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white">Access Role</label>
              <select
                value={selectedRole.value}
                onChange={handleRoleChange}
                className="h-11 w-full rounded-xl border-none bg-brand-gray px-4 text-white outline-none ring-0 focus:ring-2 focus:ring-white/20 transition-shadow cursor-pointer appearance-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 14px center',
                }}
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>
                    {r.label} ({r.username})
                  </option>
                ))}
              </select>
            </div>

            {/* Two Column: Operator ID + Access Code */}
            <div className="grid grid-cols-2 gap-4">
              <InputGroup
                label="Operator ID"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <InputGroup
                label="Access Code"
                placeholder="Password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              >
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors cursor-pointer"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </InputGroup>
            </div>

            <p className="text-xs text-white/20">Demo mode — credentials auto-fill when you select a role.</p>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full h-14 items-center justify-center gap-2.5 bg-white text-black font-semibold rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all mt-4 cursor-pointer disabled:opacity-70 disabled:cursor-wait"
            >
              {isLoading ? (
                <span className="text-sm">Authenticating...</span>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Access Command Center</span>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-white/30">
            Powered by Google Cloud · Firebase · Gemini AI
          </p>
        </motion.div>
      </div>
    </main>
  );
}
