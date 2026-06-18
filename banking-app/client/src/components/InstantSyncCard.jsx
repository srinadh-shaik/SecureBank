import React, { useState, useEffect } from 'react';

const FONT_SANS = "font-['Inter',_sans-serif]";

export default function InstantSyncCard() {
  const [syncStatus, setSyncStatus] = useState(0); 
  useEffect(() => {
    const interval = setInterval(() => setSyncStatus(s => (s + 1) % 3), 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`bg-[#130324] p-6 rounded-2xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.5)] h-[360px] flex flex-col ${FONT_SANS} relative overflow-hidden`}>
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-600 to-[#6739b7]"></div>
      
      <div className="flex justify-between items-center mb-6 mt-2">
        <h3 className="text-violet-300 font-bold uppercase text-xs tracking-widest">Instant Sync</h3>
        <div className={`text-[10px] flex items-center gap-2 px-3 py-1.5 rounded-full font-bold uppercase tracking-wider
          ${syncStatus === 0 ? 'bg-red-950 text-red-400' : syncStatus === 1 ? 'bg-yellow-950 text-yellow-400' : 'bg-green-950 text-green-400'}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${syncStatus === 0 ? 'bg-red-500' : syncStatus === 1 ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
          {syncStatus === 0 ? "Storing Locally" : syncStatus === 1 ? "Connecting..." : "Synced with Bank"}
        </div>
      </div>
      <div className="space-y-4 overflow-hidden flex-grow">
        {[ {n:"Srinadh", a:"850.00"}, {n:"Shraddha", a:"1,200.00"}, {n:"Charan", a:"340.00"} ].map((tx, i) => (
          <div key={i} className="flex justify-between items-center text-sm text-white border-b border-white/5 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-900/50 text-violet-300 text-xs font-bold flex items-center justify-center">{tx.n[0]}</div> 
              <span className="font-medium tracking-wide">{tx.n}</span>
            </div>
            <div className="text-right">
              <div className="font-bold text-base tabular-nums">₹{tx.a}</div>
              <div className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${i === 0 ? 'text-green-500' : 'text-yellow-500'}`}>
                {i === 0 ? "Synced" : "Pending"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}