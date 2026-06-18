import React, { useState } from 'react';
import { Lock, Radio, CheckCircle } from 'lucide-react';

const FONT_SANS = "font-['Inter',_sans-serif]";

export default function QRPaymentsCard() {
  const [payState, setPayState] = useState(0); 
  const handlePay = () => {
    if (payState !== 0) return;
    setPayState(1);
    setTimeout(() => setPayState(2), 1000);
    setTimeout(() => setPayState(3), 2000);
    setTimeout(() => setPayState(0), 4000);
  };

  return (
    <div className={`bg-[#130324] p-6 rounded-2xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.5)] h-[360px] flex flex-col md:flex-row gap-6 ${FONT_SANS} relative overflow-hidden`}>
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-600 to-[#6739b7]"></div>
      
      <div className="w-[120px] h-[120px] bg-white p-2 rounded-xl shrink-0 mx-auto md:mx-0 mt-2">
        <div className="grid grid-cols-10 w-full h-full">
          {[...Array(100)].map((_, i) => (
             <div key={i} className={`${Math.random() > 0.4 ? 'bg-[#130324]' : 'bg-transparent'}`}></div>
          ))}
        </div>
      </div>
      
      <div className="flex flex-col justify-between flex-grow mt-2">
        <div>
          <h3 className="text-violet-300 font-bold uppercase text-xs tracking-widest mb-3">Scan & Pay</h3>
          <div className="text-white font-bold text-lg leading-tight tracking-wide">Shraddha</div>
          <div className="text-xs text-slate-400 mb-3">shraddha@payx</div>
          <div className="font-black text-3xl text-white tracking-tight tabular-nums">₹850.00</div>
        </div>
        
        <button 
          onClick={handlePay}
          disabled={payState !== 0}
          className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 mt-4 md:mt-0
            ${payState === 0 ? 'bg-[#6739b7] text-white hover:bg-violet-600' : 
              payState === 3 ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
              'bg-white/5 text-slate-400 cursor-not-allowed'}`}
        >
          {payState === 0 && "Send Securely"}
          {payState === 1 && <><Lock className="w-4 h-4 animate-pulse" /> Signing...</>}
          {payState === 2 && <><Radio className="w-4 h-4 animate-pulse" /> Broadcasting...</>}
          {payState === 3 && <><CheckCircle className="w-4 h-4" /> Payment Sent</>}
        </button>
      </div>
    </div>
  );
}