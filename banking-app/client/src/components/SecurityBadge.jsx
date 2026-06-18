import React from 'react';
import { Check, Globe } from 'lucide-react';

export default function SecurityBadge() {
  return (
    <div className="bg-gradient-to-r from-[#7e42de] to-[#6739b7] rounded-[2rem] p-8 md:p-12 shadow-[0_20px_50px_rgba(103,57,183,0.3)] flex flex-col md:flex-row items-center gap-10 md:gap-14 font-['Inter',_sans-serif] relative overflow-hidden">
      
      {/* Background glow for depth */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>

      {/* Custom CSS Shield & Ribbon */}
      <div className="relative shrink-0 flex flex-col items-center justify-center w-32 h-36 bg-white rounded-t-2xl rounded-b-[3rem] shadow-inner z-10 mt-2 md:mt-0">
        <span className="text-4xl font-black text-[#6739b7] tracking-tighter mt-1">
          100<span className="text-2xl">%</span>
        </span>
        
        {/* Teal Ribbon */}
        <div className="absolute -bottom-4 w-40 py-2 bg-[#22e3e0] text-[#0a0a14] text-center font-black tracking-widest text-sm rounded-md shadow-lg transform -rotate-2">
          SECURE
        </div>
      </div>

      {/* Text Content & Compliance Badges */}
      <div className="text-white text-center md:text-left flex-grow z-10 mt-6 md:mt-0">
        <h2 className="text-3xl md:text-4xl font-black mb-3 tracking-tight">Your money stays safe.</h2>
        <p className="text-violet-100 text-lg font-medium mb-8 leading-relaxed max-w-2xl">
          PayX protects your offline transactions with hardware-level cryptographic security systems that help minimize frauds.
        </p>

        {/* Compliance Seals
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-8 opacity-90">
          
          <div className="flex items-center gap-3">
            <Check className="w-6 h-6 text-[#42e8e0] stroke-[3]" />
            <div className="flex flex-col leading-tight text-left">
              <span className="font-black text-lg tracking-tight">PCI DSS</span>
              <span className="text-[10px] uppercase tracking-widest font-bold text-violet-200">Compliant</span>
            </div>
          </div>

          <div className="w-px h-8 bg-white/20 hidden sm:block"></div>

          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-[#42e8e0] stroke-2" />
            <div className="flex flex-col leading-tight text-left">
              <span className="font-black text-lg tracking-tight">ISO 27001</span>
              <span className="text-[10px] uppercase tracking-widest font-bold text-violet-200">Certified</span>
            </div>
          </div>

        </div> */}
      </div>
    </div>
  );
}