import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, CheckCircle } from 'lucide-react';

// --- CUSTOM CSS FOR CURRENCY TEXTURE ---
const CurrencyStyles = () => (
  <style dangerouslySetInnerHTML={{__html: `
    .guilloche-card {
      background-color: #1a2e1a; /* Deep Olive */
      background-image:
        /* SVG Noise Texture */
        url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.08'/%3E%3C/svg%3E"),
        /* Geometric Guilloche Patterns */
        repeating-linear-gradient(30deg, transparent, transparent 15px, rgba(201, 168, 76, 0.04) 15px, rgba(201, 168, 76, 0.04) 16px),
        repeating-linear-gradient(150deg, transparent, transparent 15px, rgba(201, 168, 76, 0.04) 15px, rgba(201, 168, 76, 0.04) 16px),
        repeating-linear-gradient(90deg, transparent, transparent 30px, rgba(201, 168, 76, 0.02) 30px, rgba(201, 168, 76, 0.02) 31px);
    }
    .intaglio-text {
      text-shadow: 1px 1px 0px rgba(0, 0, 0, 0.9), -1px -1px 0px rgba(255, 255, 255, 0.1);
    }
    .engraved-input:-webkit-autofill {
      -webkit-box-shadow: 0 0 0 30px #1a2e1a inset !important;
      -webkit-text-fill-color: #f5f0e8 !important;
    }
  `}} />
);

export default function AuthPage({ initialView, onBack }) {
  const [view, setView] = useState(initialView); 
  const [name, setName] = useState(''); 
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { requestOtp, verifyOtp } = useAuth();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const message = await requestOtp(phoneNumber);
      setSuccess(message);
      setOtpRequested(true);
    } catch (err) {
      setError(err.message || 'Failed to request OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      await verifyOtp(phoneNumber, otp);
    } catch (err) {
      setError(err.message || 'OTP verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#080f08] flex items-center justify-center p-6 font-sans overflow-hidden selection:bg-[#c9a84c]/30">
      <CurrencyStyles />
      
      {/* Subtle Background Glow */}
      <div className="absolute w-[600px] h-[600px] bg-[#c9a84c]/5 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Auth Card mimicking a Physical Banknote */}
      <div className="relative z-10 w-full max-w-md p-10 guilloche-card rounded-md border-double border-[6px] border-[#c9a84c]/40 outline outline-1 outline-[#c9a84c]/20 outline-offset-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
        
        {/* Faint Banknote Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] text-[180px] font-serif text-[#c9a84c] pointer-events-none -rotate-12 select-none">
          ₹
        </div>

        {/* Content Container (Above Watermark) */}
        <div className="relative z-10">
          {!otpRequested && (
            <button onClick={onBack} className="text-[10px] font-bold text-[#8a9a8a] uppercase tracking-widest hover:text-[#c9a84c] transition mb-8 block intaglio-text">
              &larr; Return to Home
            </button>
          )}

          <h2 className="text-3xl font-black text-[#f5f0e8] mb-2 tracking-widest uppercase intaglio-text">
            {otpRequested ? 'Verify Number' : (view === 'signup' ? 'Create Account' : 'Welcome Back')}
          </h2>
          <p className="text-[#8a9a8a] text-xs uppercase tracking-[0.2em] font-bold mb-8 border-b border-[#8a9a8a]/20 pb-4">
            {otpRequested 
              ? `Enter the 6-digit code sent to ${phoneNumber}` 
              : (view === 'signup' ? 'Join the offline payment revolution.' : 'Enter your credentials to continue.')}
          </p>

          {error && (
            <div className="flex items-center space-x-3 text-[#d4a017] bg-[#d4a017]/10 border border-[#d4a017]/30 p-4 rounded mb-6">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-xs uppercase tracking-widest font-bold">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center space-x-3 text-[#c9a84c] bg-[#c9a84c]/10 border border-[#c9a84c]/30 p-4 rounded mb-6">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-xs uppercase tracking-widest font-bold">{success}</span>
            </div>
          )}

          <form onSubmit={otpRequested ? handleVerifyOtp : handleRequestOtp} className="space-y-6">
            {!otpRequested ? (
              <>
                {view === 'signup' && (
                  <div>
                    <label className="block text-[10px] font-black text-[#c9a84c] uppercase tracking-[0.2em] mb-2 intaglio-text">Legal Name</label>
                    <input 
                      type="text" 
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full py-2 bg-transparent border-b border-[#c9a84c]/40 text-[#f5f0e8] text-sm uppercase tracking-wider focus:border-[#c9a84c] outline-none transition placeholder-[#8a9a8a]/50 engraved-input font-medium" 
                      placeholder="ENTER FULL NAME" 
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-[10px] font-black text-[#c9a84c] uppercase tracking-[0.2em] mb-2 intaglio-text">Phone Number</label>
                  <input 
                    type="tel" 
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full py-2 bg-transparent border-b border-[#c9a84c]/40 text-[#f5f0e8] text-sm uppercase tracking-wider focus:border-[#c9a84c] outline-none transition placeholder-[#8a9a8a]/50 engraved-input font-medium tabular-nums" 
                    placeholder="+91 00000 00000" 
                  />
                </div>
              </>
            ) : (
              <div>
                <label className="block text-[10px] font-black text-[#c9a84c] uppercase tracking-[0.2em] mb-2 intaglio-text">6-Digit OTP</label>
                <input 
                  type="text" 
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full py-4 bg-transparent border-b-2 border-[#c9a84c] text-[#c9a84c] focus:border-[#d4a017] outline-none transition tracking-[0.8em] font-mono text-center text-2xl font-bold engraved-input" 
                  placeholder="------" 
                />
              </div>
            )}

            {/* Official Seal Button */}
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-4 mt-6 text-[#080f08] uppercase tracking-[0.2em] font-black rounded-full bg-gradient-to-r from-[#d4a017] to-[#c9a84c] shadow-[0_4px_10px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.4)] hover:shadow-[0_0_15px_rgba(212,160,23,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
            >
              {isLoading 
                ? (otpRequested ? 'Verifying...' : 'Requesting OTP...') 
                : (otpRequested ? 'Verify OTP' : (view === 'signup' ? 'Create Account' : 'Login via OTP'))
              }
            </button>
          </form>

          {!otpRequested && (
            <div className="mt-8 text-center border-t border-[#8a9a8a]/20 pt-6">
              {view === 'signup' ? (
                <p className="text-[#8a9a8a] text-[10px] uppercase tracking-widest font-bold">
                  Already a member? <button onClick={() => { setView('login'); setError(''); setSuccess(''); }} className="text-[#c9a84c] hover:text-[#d4a017] transition ml-2 intaglio-text">Sign In</button>
                </p>
              ) : (
                <p className="text-[#8a9a8a] text-[10px] uppercase tracking-widest font-bold">
                  New to PayX? <button onClick={() => { setView('signup'); setError(''); setSuccess(''); }} className="text-[#c9a84c] hover:text-[#d4a017] transition ml-2 intaglio-text">Create an account</button>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}