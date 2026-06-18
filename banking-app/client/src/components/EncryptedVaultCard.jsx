import React, { useState, useEffect } from 'react';
import { FileText, Key, Lock, CheckCircle } from 'lucide-react';

const FONT_SANS = "font-['Inter',_sans-serif]";
const FONT_MONO = "font-['JetBrains_Mono',_monospace]";

export default function EncryptedVaultCard() {
  const [encStage, setEncStage] = useState(0);
  const [hex, setHex] = useState("a3f9b2d1c821");
  
  useEffect(() => {
    const interval = setInterval(() => {
      setEncStage(s => (s + 1) % 4);
      setHex(Math.random().toString(16).slice(2, 14));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const icons = [<FileText className="w-5 h-5"/>, <Key className="w-5 h-5"/>, <Lock className="w-5 h-5"/>, <CheckCircle className="w-5 h-5"/>];

  return (
    <div className={`bg-[#130324] p-6 rounded-2xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.5)] h-[360px] flex flex-col ${FONT_SANS} relative overflow-hidden`}>
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-600 to-[#6739b7]"></div>
      
      <h3 className="text-violet-300 font-bold uppercase text-xs tracking-widest mb-6 mt-2">Encrypted Vault</h3>
      
      <div className="h-1 bg-white/5 rounded-full overflow-hidden mb-8">
        <div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-all duration-[2000ms] ease-linear" style={{ width: `${(encStage + 1) * 25}%` }}></div>
      </div>
      
      <div className="flex items-center gap-4 mb-2 text-white">
        <div className="text-violet-400">{icons[encStage]}</div>
        <p className="text-xl font-black tracking-tight">{["Initiated", "Signing", "Storing", "Locked"][encStage]}</p>
      </div>
      
      <p className="text-sm text-slate-400 mb-auto ml-9 leading-relaxed">
        {["Preparing secure payload", "Applying private key signature", "Writing to local encrypted vault", "Data secured and tamper-proof"][encStage]}
      </p>
      
      <div className="mt-4 p-4 bg-[#0a0214] rounded-xl border border-white/5 shadow-inner">
        <p className="text-[10px] text-violet-400/80 uppercase font-bold tracking-widest mb-2">Live Hash Output</p>
        <div className={`text-sm text-slate-300 tracking-[0.2em] ${FONT_MONO}`}>{hex}</div>
      </div>
    </div>
  );
}