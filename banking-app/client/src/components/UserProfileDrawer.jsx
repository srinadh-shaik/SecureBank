import React, { useRef, useState } from 'react';
import { X, Star, Share2, Download, Building2, ShieldCheck, AlertTriangle, CheckCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { apiService } from '../services/api';

const UserProfileDrawer = ({ isOpen, onClose, user, onUpdateAccounts }) => {
  const qrRef = useRef(null);
  
  // New States for PIN Verification Modal
  const [pinModalAccount, setPinModalAccount] = useState(null);
  const [pin, setPin] = useState('');
  const [isPinLoading, setIsPinLoading] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');

  // Find current primary account (assuming it's the first one, or use a boolean flag if your DB sends it)
  const primaryAccount = user?.bankAccounts?.[0]; 
  const qrData = primaryAccount 
    ? JSON.stringify({
        acc: primaryAccount.account_number,
        ifsc: primaryAccount.ifsc_code,
        bank: primaryAccount.bank_name,
        name: user?.name || user?.phone_number || 'User'
      })
    : "NO_ACCOUNT";

  const downloadQR = async () => {
    if (qrRef.current) {
      const canvas = await html2canvas(qrRef.current, { backgroundColor: '#1a1423' });
      const link = document.createElement('a');
      link.download = 'My_SecureBank_QR.png';
      link.href = canvas.toDataURL();
      link.click();
    }
  };

  const shareToWhatsApp = () => {
    const text = `Pay me securely! \n\nTransfer directly to my ${primaryAccount?.bank_name} account:\nName: ${user?.name || 'User'}\nA/C: ${primaryAccount?.account_number}\nIFSC: ${primaryAccount?.ifsc_code}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`);
  };

  // Triggered when user clicks "Set Primary"
  const handleSetPrimaryClick = (acc) => {
    setPinModalAccount(acc);
    setPin('');
    setPinError('');
    setPinSuccess('');
  };

  // Submit the PIN to the backend
  const verifyAndSetPrimary = async () => {
    setPinError('');
    if (pin.length !== 4) {
      setPinError('Please enter a 4-digit PIN');
      return;
    }
    
    setIsPinLoading(true);
    try {
      await apiService.setPrimaryAccount(pinModalAccount.id, pin);
      setPinSuccess('Primary account updated!');
      await onUpdateAccounts(); // Refresh global user context
      
      // Close modal after success
      setTimeout(() => {
        setPinModalAccount(null);
        setPinSuccess('');
      }, 1500);
    } catch (err) {
      setPinError(err.message || 'Incorrect PIN');
    } finally {
      setIsPinLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 transition-all duration-300 ${isOpen ? 'visible' : 'invisible'}`}>
      <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
      
      <div className={`absolute left-0 top-0 bottom-0 w-80 sm:w-96 bg-[#0d0914] border-r border-white/10 shadow-2xl flex flex-col transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#1a1423]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-lg shadow-[0_0_15px_rgba(79,70,229,0.3)]">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white capitalize">{user?.name || 'User'}</h2>
              <p className="text-xs text-slate-400 font-mono">{user?.phone_number}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-grow overflow-y-auto p-6 custom-scrollbar relative">
          
          {/* QR Code Section */}
          <div className="bg-[#1a1423] rounded-3xl p-6 border border-white/5 mb-8 flex flex-col items-center shadow-inner">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">Receive Money</h3>
            
            {primaryAccount ? (
              <>
                <div className="flex flex-col items-center mb-6">
                  <div ref={qrRef} className="bg-white p-3 rounded-[1.5rem] shadow-[0_0_30px_rgba(79,70,229,0.15)]">
                    <QRCodeSVG value={qrData} size={180} level={"H"} fgColor="#0d0914" />
                  </div>
                  <p className="text-[11px] font-bold text-indigo-400 mt-4 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                    Receiving to: {primaryAccount.bank_name}
                  </p>
                </div>
                
                <div className="flex gap-4 w-full">
                  <button onClick={downloadQR} className="flex-1 py-3 bg-white/5 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-2 hover:bg-white/10 transition">
                    <Download className="w-4 h-4" /> Save
                  </button>
                  <button onClick={shareToWhatsApp} className="flex-1 py-3 bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-600/30 transition">
                    <Share2 className="w-4 h-4" /> Share
                  </button>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-500 text-center">Link a bank account to generate your personal QR code.</p>
            )}
          </div>

          {/* Linked Accounts Section */}
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Linked Accounts</h3>
          <div className="space-y-3">
            {user?.bankAccounts?.map((acc, index) => (
              <div key={acc.id} className={`p-4 rounded-[1.5rem] border transition-colors ${index === 0 ? 'bg-indigo-600/10 border-indigo-500/30' : 'bg-[#1a1423] border-white/5 hover:border-white/10'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <p className="text-sm font-bold text-white">{acc.bank_name}</p>
                  </div>
                  {index === 0 ? (
                    <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/20 px-2 py-1 rounded">PRIMARY</span>
                  ) : (
                    <button 
                      onClick={() => handleSetPrimaryClick(acc)}
                      className="text-[10px] font-bold text-slate-500 hover:text-indigo-400 transition flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md"
                    >
                      <Star className="w-3 h-3" /> Set Primary
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-mono mb-2">Acc: {acc.account_number}</p>
                <p className="text-base font-black text-white tracking-tight">₹{acc.balance.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* PIN Verification Overlay Modal */}
        {pinModalAccount && (
          <div className="absolute inset-0 z-[60] bg-[#0d0914]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
            <button onClick={() => setPinModalAccount(null)} className="absolute top-6 right-6 p-2 bg-white/5 rounded-full hover:bg-white/10 transition">
              <X className="w-5 h-5 text-white" />
            </button>
            
            <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(79,70,229,0.2)]">
              <ShieldCheck className="w-8 h-8 text-indigo-400" />
            </div>
            
            <h2 className="text-lg font-bold text-white text-center mb-2">Verify Identity</h2>
            <p className="text-xs text-slate-400 text-center mb-8 px-4">
              Enter the 4-digit PIN for your <strong className="text-white">{pinModalAccount.bank_name}</strong> account ending in {pinModalAccount.account_number.slice(-4)}.
            </p>

            {pinError && <div className="mb-6 flex items-center gap-2 text-rose-500 bg-rose-500/10 px-4 py-2 rounded-full border border-rose-500/20"><AlertTriangle className="w-4 h-4"/><span className="text-xs font-bold">{pinError}</span></div>}
            {pinSuccess && <div className="mb-6 flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20"><CheckCircle className="w-4 h-4"/><span className="text-xs font-bold">{pinSuccess}</span></div>}

            <input 
              type="password" 
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0,4))}
              className="w-full max-w-[200px] bg-[#1a1423] border border-white/10 text-white p-4 rounded-2xl outline-none mb-8 text-center tracking-[1em] font-mono text-2xl focus:border-indigo-500 transition-colors" 
              placeholder="••••" 
              maxLength={4} 
              autoFocus
            />

            <button 
              onClick={verifyAndSetPrimary}
              disabled={isPinLoading || pin.length !== 4}
              className="w-full max-w-[200px] py-4 bg-indigo-600 text-white text-xs font-bold uppercase tracking-widest rounded-2xl hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:opacity-50"
            >
              {isPinLoading ? 'Verifying...' : 'Confirm'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default UserProfileDrawer;