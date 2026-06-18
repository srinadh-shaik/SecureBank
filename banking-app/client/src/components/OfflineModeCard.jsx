import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Zap, Cloud } from 'lucide-react';

const FONT_SANS = "font-['Inter',_sans-serif]";

export default function OfflineModeCard() {
  const [isOnline, setIsOnline] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => setIsOnline(prev => !prev), 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`bg-[#130324] p-6 rounded-2xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.5)] h-[360px] flex flex-col ${FONT_SANS} relative overflow-hidden`}>
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-600 to-[#6739b7]"></div>
      
      <div className="flex justify-between items-center mb-6 mt-2">
        <h3 className="text-violet-300 font-bold uppercase text-xs tracking-widest">Offline Mode</h3>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          {isOnline ? <Wifi className="w-4 h-4 text-green-500" /> : <WifiOff className="w-4 h-4 text-red-500" />}
          {isOnline ? "Online" : "No Internet"}
        </div>
      </div>
      <table className="w-full text-xs text-left mb-auto text-white">
        <thead>
          <tr className="text-violet-300/60 border-b border-white/5">
            <th className="pb-2 font-medium uppercase tracking-wider text-[10px]">Transaction</th>
            <th className="pb-2 font-medium uppercase tracking-wider text-[10px] text-right">Amount</th>
            <th className="pb-2 font-medium uppercase tracking-wider text-[10px] text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {[["Srinadh", "850.00", "Stored"], ["Shraddha", "1,200.00", "Stored"], ["Charan", "340.00", "Queued"]].map((row, i) => (
            <tr key={i} className="border-b border-white/5">
              <td className="py-3 font-medium">{row[0]}</td>
              <td className="py-3 font-bold text-right tabular-nums">₹{row[1]}</td>
              <td className="py-3 text-slate-400 text-right">{row[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={`flex items-center gap-3 text-xs p-3 rounded-xl font-bold tracking-wide mt-4 transition-colors duration-500
        ${isOnline ? 'bg-green-950/40 text-green-400 border border-green-900/50' : 'bg-yellow-950/40 text-yellow-400 border border-yellow-900/50'}`}>
        {isOnline ? <Cloud className="w-4 h-4 shrink-0" /> : <Zap className="w-4 h-4 shrink-0" />}
        {isOnline ? "All queued transactions pushed to bank" : "Payments processing — offline ledger active"}
      </div>
    </div>
  );
}