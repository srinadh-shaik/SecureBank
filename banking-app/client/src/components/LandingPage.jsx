import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, HardDrive, Shield, QrCode } from 'lucide-react';
import PhoneMockup from './PhoneMockUp';
import SecurityBadge from './SecurityBadge';

// Import our new separated files
import InstantSyncCard from './InstantSyncCard';
import OfflineModeCard from './OfflineModeCard';
import EncryptedVaultCard from './EncryptedVaultCard';
import QRPaymentsCard from './QRPaymentsCard';
import PayXEcosystem from './PayXEcosystem';

const FONT_SANS = "font-['Inter',_sans-serif]";

// --- INTERACTIVE VIEWER CONTROLLER ---
const FeatureViewer = () => {
  const [active, setActive] = useState(0);
  
  const features = [
    { id: 0, icon: Smartphone, component: <InstantSyncCard /> },
    { id: 1, icon: HardDrive, component: <OfflineModeCard /> },
    { id: 2, icon: Shield, component: <EncryptedVaultCard /> },
    { id: 3, icon: QrCode, component: <QRPaymentsCard /> }
  ];

  // Auto-play cycling
  useEffect(() => {
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % 4);
    }, 6000);
    return () => clearInterval(timer);
  }, [active]);

  return (
    <div className="w-full max-w-[420px] flex flex-col gap-6">
      {/* Active Card Display Area */}
      <div className="relative h-[360px] w-full">
        <AnimatePresence mode="wait">
          <motion.div 
            key={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            {features[active].component}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Sequence of Circle Buttons */}
      <div className="flex justify-center gap-4 mt-2">
        {features.map((f, i) => (
          <button 
            key={f.id}
            onClick={() => setActive(i)} 
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg
              ${active === i ? 'bg-[#6739b7] text-white scale-110' : 'bg-[#130324] text-slate-500 border border-white/5 hover:bg-white/5 hover:text-slate-300'}`}
          >
            <f.icon className="w-5 h-5" />
          </button>
        ))}
      </div>
    </div>
  );
};

// --- MAIN LANDING PAGE EXPORT ---
export default function LandingPage({ onNavigate }) {
  return (
    <div className={`min-h-screen bg-[#0a0a14] text-slate-200 selection:bg-violet-500/30 ${FONT_SANS}`}>
      
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-[#0a0a14]/90 backdrop-blur-xl border-b border-white/5 px-8 py-5 flex items-center justify-between">
        <div className="text-2xl font-black text-white tracking-tighter">PayX</div>
        <div className="hidden md:flex gap-10 text-sm font-bold text-slate-400 tracking-wide">
          <a href="#" className="hover:text-white transition-colors">Home</a>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#security" className="hover:text-white transition-colors">Security</a>
        </div>
        <div className="flex gap-4">
          <button onClick={() => onNavigate('login')} className="px-6 py-2.5 text-sm font-bold border border-white/10 rounded-full hover:bg-white/5 transition">Sign In</button>
          <button onClick={() => onNavigate('signup')} className="px-6 py-2.5 text-sm font-bold bg-[#6739b7] text-white rounded-full hover:bg-[#5a31a0] transition shadow-lg shadow-violet-900/20">Create Account</button>
        </div>
      </nav>

      {/* Hero Section with Side-by-Side Focused UI */}
      <header className="relative bg-gradient-to-br from-[#1a0530] to-[#0a0a14] pt-24 pb-32 px-6 overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-violet-600/10 rounded-full blur-[150px] pointer-events-none"></div>

        <div className="relative max-w-[1200px] mx-auto">
          <div className="max-w-3xl mb-20 text-center mx-auto">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white leading-[1.1] mb-6">
              Financial freedom<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">without limits.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed font-medium">
              The world's most reliable offline-first payment engine. Complete secure transactions instantly, anywhere, without cellular connectivity.
            </p>
            <button onClick={() => onNavigate('signup')} className="px-10 py-5 text-lg font-bold bg-[#6739b7] text-white rounded-full hover:bg-[#5a31a0] transition shadow-xl shadow-violet-900/30 transform hover:-translate-y-0.5">
              Get Started Now
            </button>
          </div>

          <div className="flex flex-col xl:flex-row items-center justify-center gap-12 xl:gap-24 px-4">
            <div className="shrink-0 relative z-10">
              <PhoneMockup />
            </div>
            {/* Our Modular Feature Viewer Component */}
            <FeatureViewer />
          </div>
        </div>
      </header>

      {/* The Rotating Ecosystem Section */}
      <PayXEcosystem />

      {/* Final CTA */}
      <section className="bg-gradient-to-b from-[#1a0530] to-[#0a0a14] pt-32 pb-48 text-center px-6 relative overflow-hidden border-t border-white/5">
        <div className="relative z-10">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-10 tracking-tight">Start paying offline today</h2>
          <button onClick={() => onNavigate('signup')} className="px-12 py-5 text-lg font-bold bg-[#6739b7] text-white rounded-full hover:bg-[#5a31a0] transition shadow-2xl shadow-violet-900/20">
            Create Free Account
          </button>
        </div>
      </section>
      
      {/* 2. DROP THE BADGE HERE. The -mt-24 pulls it up over the CTA */}
      <div id="security" className="relative z-20 max-w-[1000px] mx-auto px-6 -mt-24 mb-16">
        <SecurityBadge />
      </div>

      {/* Footer */}
      <footer className="bg-[#0a0a14] py-20 px-6 text-slate-500 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-16">
          <div className="col-span-1 md:col-span-2">
            <div className="text-2xl font-black text-white mb-4 tracking-tighter">PayX</div>
            <p className="text-sm max-w-sm leading-relaxed tracking-wide">The world's most resilient offline-first payment architecture. Built for trust, designed for reliability.</p>
          </div>
          {["Product", "Trust & Safety"].map(h => (
            <div key={h}>
              <h4 className="font-bold text-white mb-6 uppercase tracking-wider text-xs">{h}</h4>
              <ul className="space-y-4 text-sm font-medium">
                <li><a href="#" className="hover:text-violet-400 transition-colors">Features Overview</a></li>
                <li><a href="#" className="hover:text-violet-400 transition-colors">Security Architecture</a></li>
                <li><a href="#" className="hover:text-violet-400 transition-colors">Regulatory Policies</a></li>
              </ul>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}