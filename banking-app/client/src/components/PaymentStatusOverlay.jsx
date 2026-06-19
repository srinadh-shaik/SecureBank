import React, { useEffect } from 'react';
import { Check, RefreshCw, Clock } from 'lucide-react';

const PaymentStatusOverlay = ({ status, amount, recipientName, onClose }) => {
  // Generate synthetic sounds using Web Audio API (No external files needed!)
  const playSound = (type) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      if (type === 'success') {
        // A bright, rising "ding-ding" for success
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'syncing') {
        // A softer, hollow "boop" for offline queuing
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch (e) {
      console.log('Audio playback prevented by browser policy');
    }
  };

  useEffect(() => {
    if (status === 'success') {
      playSound('success');
      const timer = setTimeout(onClose, 3500); // Auto close after 3.5s
      return () => clearTimeout(timer);
    } else if (status === 'syncing') {
      playSound('syncing');
      const timer = setTimeout(onClose, 4000); // Auto close after 4s
      return () => clearTimeout(timer);
    }
  }, [status, onClose]);

  if (status === 'idle') return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0d0914]/95 backdrop-blur-xl transition-opacity duration-300">
      
      {/* Background radial glow based on status */}
      <div className={`absolute w-[500px] h-[500px] rounded-full blur-[100px] opacity-20 pointer-events-none transition-colors duration-1000 ${
        status === 'success' ? 'bg-emerald-500' : 'bg-amber-500'
      }`} />

      <div className="relative flex flex-col items-center text-center z-10 px-6">
        
        {/* SUCCESS ANIMATION */}
        {status === 'success' && (
          <div className="flex flex-col items-center animate-in zoom-in duration-500 ease-out">
            <div className="relative flex items-center justify-center w-32 h-32 mb-8">
              {/* Pulsing rings */}
              <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping [animation-duration:2s]" />
              <div className="absolute inset-4 bg-emerald-500/20 rounded-full animate-ping [animation-duration:2s] delay-300" />
              {/* Solid circle */}
              <div className="relative z-10 flex items-center justify-center w-24 h-24 bg-emerald-500 rounded-full shadow-[0_0_50px_rgba(16,185,129,0.5)]">
                <Check className="w-12 h-12 text-white animate-in slide-in-from-bottom-4 fade-in duration-500 delay-200" strokeWidth={3} />
              </div>
            </div>
            
            <h2 className="text-3xl font-black text-white mb-2 tracking-tight animate-in slide-in-from-bottom-4 fade-in duration-500 delay-300">
              Payment Sent!
            </h2>
            <p className="text-5xl font-mono text-emerald-400 tracking-tighter mb-4 animate-in slide-in-from-bottom-4 fade-in duration-500 delay-500">
              ₹{amount}
            </p>
            <p className="text-slate-400 font-medium animate-in slide-in-from-bottom-4 fade-in duration-500 delay-700">
              Securely transferred to <span className="text-white">{recipientName || 'Recipient'}</span>
            </p>
          </div>
        )}

        {/* OFFLINE/SYNCING ANIMATION */}
        {status === 'syncing' && (
          <div className="flex flex-col items-center animate-in zoom-in duration-500 ease-out">
            <div className="relative flex items-center justify-center w-32 h-32 mb-8">
              {/* Rotating dashed ring */}
              <div className="absolute inset-0 border-4 border-dashed border-amber-500/30 rounded-full animate-[spin_4s_linear_infinite]" />
              <div className="absolute inset-2 border-4 border-dashed border-amber-500/20 rounded-full animate-[spin_3s_linear_infinite_reverse]" />
              {/* Solid center */}
              <div className="relative z-10 flex items-center justify-center w-20 h-20 bg-[#1a1423] border-2 border-amber-500/50 rounded-full shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                <RefreshCw className="w-8 h-8 text-amber-400 animate-[spin_2s_ease-in-out_infinite]" strokeWidth={2.5} />
              </div>
              {/* Tiny offline badge */}
              <div className="absolute bottom-0 right-0 bg-amber-500 text-[#0d0914] p-1.5 rounded-full shadow-lg z-20">
                <Clock className="w-4 h-4" strokeWidth={3} />
              </div>
            </div>
            
            <h2 className="text-2xl font-black text-white mb-2 tracking-tight animate-in slide-in-from-bottom-4 fade-in duration-500 delay-200">
              Payment Queued
            </h2>
            <p className="text-4xl font-mono text-amber-400 tracking-tighter mb-4 animate-in slide-in-from-bottom-4 fade-in duration-500 delay-300">
              ₹{amount}
            </p>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-500 delay-500">
              <p className="text-xs text-amber-400/80 leading-relaxed font-medium">
                Network offline or bank server unavailable. Your transaction has been securely saved locally and will auto-sync when connection is restored.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default PaymentStatusOverlay;