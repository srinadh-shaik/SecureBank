import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Search, CheckCircle, Building2 } from 'lucide-react';
import { useNetwork } from '../contexts/NetworkContext';
import { apiService } from '../services/api';
import PaymentStatusOverlay from './PaymentStatusOverlay';

const TransactionForm = ({ onSubmit, onCancel, userBankAccounts, initialRecipientData }) => {
  const [formData, setFormData] = useState({
    fromBankAccountId: userBankAccounts && userBankAccounts.length > 0 ? userBankAccounts[0].id : '',
    toAccountNumber: initialRecipientData?.acc || '',
    toIfscCode: initialRecipientData?.ifsc || '',
    toBranch: initialRecipientData?.bank || '',
    amount: '',
    type: 'transfer',
    description: initialRecipientData?.name ? `Payment to ${initialRecipientData.name}` : '',
    senderPin: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [recipientDetails, setRecipientDetails] = useState(initialRecipientData ? { bank_name: initialRecipientData.bank, name: initialRecipientData.name } : null);
  const [isLookingUpRecipient, setIsLookingUpRecipient] = useState(false);
  const { networkStatus } = useNetwork();
  const [paymentStatus, setPaymentStatus] = useState('idle'); // 'idle', 'success', 'syncing'

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'toAccountNumber' || name === 'toIfscCode' || name === 'toBranch') {
      setRecipientDetails(null);
    }
  };

  const handleLookupRecipient = async () => {
    setError(''); setRecipientDetails(null); setIsLookingUpRecipient(true);
    if (!formData.toAccountNumber || !formData.toIfscCode || !formData.toBranch) {
      setError('Enter recipient account, IFSC, and branch to look up.');
      setIsLookingUpRecipient(false); return;
    }
    try {
      const details = await apiService.lookupBankAccount(formData.toAccountNumber, formData.toIfscCode, formData.toBranch);
      setRecipientDetails(details);
    } catch (err) {
      setError(err.message || 'Failed to verify recipient.');
    } finally {
      setIsLookingUpRecipient(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setSuccess(''); setIsSubmitting(true);
    const parsedAmount = parseFloat(formData.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid positive amount.'); setIsSubmitting(false); return;
    }
    if (!recipientDetails && networkStatus.isOnline) {
      setError('Please verify recipient details first.'); setIsSubmitting(false); return;
    }
    if (!/^\d{4}$/.test(formData.senderPin)) {
      setError('PIN must be a 4-digit number.'); setIsSubmitting(false); return;
    }

    const transactionDataToSend = { ...formData, amount: parsedAmount };
    try {
      await onSubmit(transactionDataToSend, formData.fromBankAccountId, formData.senderPin);
      setSuccess('Payment successful!');
      setTimeout(() => onCancel(), 1500);
    } catch (err) {
      setError(err.message || 'Transaction failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full bg-transparent border-b-2 border-white/10 py-3 text-white focus:border-indigo-500 outline-none transition-colors placeholder:text-slate-600 text-sm";

  return (
    <div className="fixed inset-0 bg-[#0d0914]/80 backdrop-blur-sm z-50 overflow-y-auto sm:p-6 lg:p-10 flex justify-center items-start sm:items-center font-sans text-slate-200">
      <div className="w-full max-w-lg min-h-screen sm:min-h-0 sm:max-h-[90vh] sm:rounded-[2.5rem] bg-[#0d0914] sm:border sm:border-white/10 shadow-2xl flex flex-col relative custom-scrollbar overflow-y-auto">
        
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-white/5 sticky top-0 bg-[#0d0914]/90 backdrop-blur-md z-10">
          <button onClick={onCancel} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition">
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="flex space-x-1">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-grow px-6 pb-6">
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Enter Amount</p>
            <div className="flex items-center justify-center text-white">
              <span className="text-4xl sm:text-5xl font-medium mr-2 text-slate-500">₹</span>
              <input 
                type="number" 
                name="amount" 
                value={formData.amount} 
                onChange={handleInputChange} 
                className="bg-transparent text-5xl sm:text-6xl font-black tabular-nums w-48 sm:w-56 text-center outline-none placeholder:text-slate-800" 
                placeholder="0" 
                min="0.01" step="0.01" required autoFocus 
              />
            </div>
            {error && <p className="text-rose-500 text-xs mt-6 font-medium bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-full">{error}</p>}
            {success && <p className="text-emerald-500 text-xs mt-6 font-medium bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full flex items-center gap-2"><CheckCircle className="w-4 h-4"/> {success}</p>}
          </div>

          <div className="bg-[#1a1423] rounded-[2rem] p-6 space-y-5 mb-auto shadow-inner border border-white/5">
            <div className="flex items-center gap-4 mb-2 border-b border-white/5 pb-5">
              <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div className="flex-grow">
                <input type="text" name="toAccountNumber" value={formData.toAccountNumber} onChange={handleInputChange} className={inputClass} placeholder="Recipient Account Number" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <input type="text" name="toIfscCode" value={formData.toIfscCode} onChange={handleInputChange} className={`${inputClass} uppercase`} placeholder="IFSC Code" required />
              <div className="flex items-end gap-2">
                <input type="text" name="toBranch" value={formData.toBranch} onChange={handleInputChange} className={inputClass} placeholder="Branch" required />
                <button type="button" onClick={handleLookupRecipient} disabled={isLookingUpRecipient || (!networkStatus.isOnline && !initialRecipientData)} className="mb-1 p-2.5 bg-indigo-600 rounded-xl text-white hover:bg-indigo-500 transition-colors disabled:opacity-50 flex-shrink-0 shadow-lg">
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </div>

            {recipientDetails && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <p className="text-xs font-bold text-emerald-400 tracking-wide">Verified: {recipientDetails.name || recipientDetails.bank_name}</p>
              </div>
            )}

            <input type="text" name="description" value={formData.description} onChange={handleInputChange} className={inputClass} placeholder="Add a note (Optional)" />
          </div>

          <div className="mt-10">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-2">Select Debit Account</label>
            <select name="fromBankAccountId" value={formData.fromBankAccountId} onChange={handleInputChange} className="w-full bg-[#1a1423] border border-white/10 text-white p-5 rounded-2xl outline-none mb-6 appearance-none font-medium text-sm focus:border-indigo-500 transition-colors" required>
              {userBankAccounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.bank_name} • Avail: ₹{acc.balance.toFixed(2)}
                </option>
              ))}
            </select>

            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-2">Enter 4-Digit Security PIN</label>
            <input type="password" name="senderPin" value={formData.senderPin} onChange={handleInputChange} className="w-full bg-[#1a1423] border border-white/10 text-white p-5 rounded-2xl outline-none mb-8 text-center tracking-[1em] font-mono text-2xl focus:border-indigo-500 transition-colors" placeholder="••••" maxLength={4} required />

            <button type="submit" disabled={isSubmitting || (networkStatus.isOnline && !recipientDetails)} className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-indigo-500 transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:opacity-50">
              {isSubmitting ? 'Processing...' : `Pay ₹${formData.amount || '0'}`} <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        </form>

      </div>

      {/* NEW: Render the animation overlay if status is not idle */}
      {paymentStatus !== 'idle' && (
        <PaymentStatusOverlay 
          status={paymentStatus}
          amount={formData.amount}
          recipientName={recipientDetails?.name || recipientDetails?.bank_name || 'Recipient'}
          onClose={() => {
            setPaymentStatus('idle');
            onCancel(); // Close the whole form after animation finishes
          }}
        />
      )}
      
    </div>
  );
};

export default TransactionForm;