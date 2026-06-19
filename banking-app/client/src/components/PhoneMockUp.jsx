import React, { useState } from 'react';

export default function PhoneMockup() {
  const [isPaid, setIsPaid] = useState(false);

  return (
    <div className="relative mx-auto w-[280px] h-[580px] border-[12px] border-slate-900 bg-slate-900 rounded-[3rem] shadow-2xl transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
      
      {/* The Hardware Notch */}
      <div className="absolute top-0 inset-x-0 h-5 w-32 bg-slate-900 mx-auto rounded-b-2xl z-20"></div>

      {/* The Screen */}
      <div className="relative w-full h-full bg-slate-50 rounded-[2.25rem] overflow-hidden flex flex-col font-sans">
        
        {/* Mock Status Bar - Clean Text Only */}
        <div className="h-12 w-full bg-slate-50 flex justify-between items-center px-6 pt-2 text-[10px] font-bold text-slate-900 z-10 tracking-wider">
          <span>9:41</span>
          <div className="flex gap-2">
            <span>LTE</span>
            <span>98%</span>
          </div>
        </div>

        {!isPaid ? (
          <div className="flex-grow flex flex-col items-center pt-8 px-6 relative animate-fade-in">
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md mb-4">
              S
            </div>
            <h3 className="text-slate-900 font-bold text-lg">Paying Shraddha</h3>
            <p className="text-slate-500 text-xs mb-8">+91 97xxx xxxxx</p>

            <div className="flex items-center text-slate-900 font-black text-5xl mb-2">
              <span className="text-3xl mr-1 font-medium text-slate-400">₹</span>
              850
            </div>
            
            <div className="bg-orange-100 text-orange-700 text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 mb-auto">
              <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
              Offline Ledger
            </div>

            <div className="w-full pb-8 pt-4">
              <button 
                onClick={() => setIsPaid(true)}
                className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
              >
                Send Securely
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-grow flex flex-col items-center justify-center px-6 bg-indigo-600 text-white animate-fade-in">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-indigo-600 text-3xl">
                ✓
              </div>
            </div>
            <h3 className="font-bold text-xl mb-1">₹850 Sent</h3>
            <p className="text-indigo-200 text-sm mb-8 text-center">Cryptographically signed to local ledger.</p>
            
            <button 
              onClick={() => setIsPaid(false)}
              className="px-6 py-2 bg-indigo-500/50 rounded-full text-sm font-medium hover:bg-indigo-500 transition"
            >
              New Payment
            </button>
          </div>
        )}
      </div>
    </div>
  );
}