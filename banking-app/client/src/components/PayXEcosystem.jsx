import React from 'react';
import { motion } from 'framer-motion';

export default function PayXEcosystem() {
  // We use Framer Motion to continuously rotate the rings. 
  // We apply a "reverse" rotation to the labels so the text doesn't turn upside down.
  
  const orbitTransition = { duration: 40, repeat: Infinity, ease: "linear" };
  const innerOrbitTransition = { duration: 25, repeat: Infinity, ease: "linear" };

  return (
    <section className="py-32 bg-[#0a0a14] relative overflow-hidden flex flex-col items-center border-t border-white/5">
      
      {/* Orbital Graphic Container */}
      <div className="relative w-full max-w-[600px] h-[500px] flex items-center justify-center mb-16">
        
        {/* Outer Orbit (Rotates Forward) */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={orbitTransition}
          className="absolute w-[450px] h-[450px] rounded-full border border-violet-500/20"
        >
          {/* Node 1: Top (Counter-rotates to stay upright) */}
          <motion.div 
            animate={{ rotate: -360 }}
            transition={orbitTransition}
            className="absolute top-0 left-1/2 -ml-[65px] -mt-[16px] bg-[#130324] border border-violet-500/30 rounded-full px-5 py-2 text-xs font-bold text-white flex items-center gap-2 shadow-[0_0_20px_rgba(103,57,183,0.3)] origin-center"
          >
            <div className="w-2 h-2 rounded-full bg-teal-400"></div> PayX Business
          </motion.div>

          {/* Node 2: Bottom Left (Counter-rotates) */}
          <motion.div 
            animate={{ rotate: -360 }}
            transition={orbitTransition}
            className="absolute top-[85%] left-[14%] -ml-[50px] -mt-[16px] bg-[#130324] border border-violet-500/30 rounded-full px-5 py-2 text-xs font-bold text-white flex items-center gap-2 shadow-[0_0_20px_rgba(103,57,183,0.3)] origin-center"
          >
            <div className="w-2 h-2 rounded-full bg-fuchsia-400"></div> Appstore
          </motion.div>

          {/* Node 3: Bottom Right (Simple Dot, no counter-rotation needed) */}
          <div className="absolute top-[75%] left-[93%] -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.6)]"></div>
        </motion.div>

        {/* Inner Orbit (Rotates Backward) */}
        <motion.div 
          animate={{ rotate: -360 }}
          transition={innerOrbitTransition}
          className="absolute w-[280px] h-[280px] rounded-full border border-violet-500/20"
        >
          {/* Inner Node 1: Left (Simple Dot) */}
          <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-teal-400 shadow-[0_0_15px_rgba(45,212,191,0.6)]"></div>
          
          {/* Inner Node 2: Top Right (Counter-rotates forward to stay upright) */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={innerOrbitTransition}
            className="absolute top-[15%] left-[85%] -ml-[35px] -mt-[14px] bg-[#130324] border border-violet-500/30 rounded-full px-4 py-1.5 text-[10px] font-bold text-white flex items-center gap-2 shadow-[0_0_20px_rgba(103,57,183,0.3)] origin-center"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div> Vault
          </motion.div>
        </motion.div>

        {/* Central Core Glows */}
        <div className="absolute w-[180px] h-[180px] rounded-full bg-violet-600/10 animate-ping" style={{ animationDuration: '3s' }}></div>
        <div className="absolute w-[140px] h-[140px] rounded-full bg-violet-600/20"></div>

        {/* Central Core Hub */}
        <div className="relative z-10 w-[100px] h-[100px] bg-[#6739b7] rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(103,57,183,0.6)] border-[6px] border-[#130324]">
          <span className="text-2xl font-black text-white tracking-tighter">PayX</span>
        </div>
      </div>

      {/* Text Hierarchy */}
      <div className="text-center z-10">
        <h4 className="text-fuchsia-400 font-bold uppercase tracking-widest text-sm mb-4">Ecosystem</h4>
        <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">PayX Group</h2>
        <p className="text-slate-400 text-lg font-medium">Driving Financial Innovation<br/>Across the Unconnected World</p>
      </div>
    </section>
  );
}