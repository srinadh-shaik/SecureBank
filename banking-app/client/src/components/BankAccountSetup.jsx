import React, { useState } from 'react';
import { X, Banknote, AlertTriangle, CheckCircle, Building2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';

const indianBanks = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Punjab National Bank",
  "Bank of Baroda",
  "Union Bank of India",
  "Canara Bank",
  "Indian Bank",
  "Bank of India",
  "Central Bank of India",
  "UCO Bank",
  "IDBI Bank",
  "Yes Bank",
  "IndusInd Bank",
  "Kotak Mahindra Bank",
  "Federal Bank",
  "South Indian Bank",
  "Dhanlaxmi Bank",
  "Karnataka Bank"
];

const BankAccountSetup = ({ onCancel, onSuccess }) => {
  const { user, updateUserBankAccounts } = useAuth();
  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    branch: '',
    pin: '',
    confirmPin: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (formData.pin !== formData.confirmPin) {
      setError('PIN and Confirm PIN do not match.');
      setIsLoading(false);
      return;
    }
    if (!/^\d{4}$/.test(formData.pin)) {
      setError('PIN must be a 4-digit number.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiService.linkBankAccount(
        formData.bankName,
        formData.accountNumber,
        formData.ifscCode,
        formData.branch,
        formData.pin
      );
      setSuccess(response.message);
      await updateUserBankAccounts(); // Refresh user's bank accounts in context
      setTimeout(() => {
        onSuccess(); // Close modal after a brief delay
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to link bank account');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full bg-transparent border-b-2 border-white/10 py-3 text-white focus:border-indigo-500 outline-none transition-colors placeholder:text-slate-600 text-sm";
  const labelClass = "block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1";

  return (
    <div className="fixed inset-0 bg-[#0d0914]/80 backdrop-blur-sm z-50 overflow-y-auto sm:p-6 lg:p-10 flex justify-center items-start sm:items-center font-sans text-slate-200">
      
      {/* Container matching TransactionForm */}
      <div className="w-full max-w-lg min-h-screen sm:min-h-0 sm:max-h-[90vh] sm:rounded-[2.5rem] bg-[#0d0914] sm:border sm:border-white/10 shadow-2xl flex flex-col relative custom-scrollbar overflow-y-auto">
        
        {/* Header */}
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
          
          {/* Visual Hero Section */}
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-20 h-20 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(79,70,229,0.2)]">
              <Building2 className="w-8 h-8 text-indigo-400" />
            </div>
            <h2 className="text-xl font-black text-white tracking-wide">Link Bank Account</h2>
            <p className="text-xs font-medium text-slate-500 mt-2">Securely connect your institution</p>
          </div>

          {/* Alerts */}
          <div className="space-y-4 mb-6">
            <div className="flex items-start space-x-3 text-amber-400 bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl">
              <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
              <span className="text-xs font-medium tracking-wide leading-relaxed">
                Do NOT enter sensitive card details (e.g., ATM card number, CVV). Only provide your account number, IFSC code, branch, and setup a 4-digit PIN.
              </span>
            </div>

            {error && (
              <div className="flex items-center space-x-3 text-rose-500 bg-rose-500/10 border border-rose-500/20 px-4 py-3 rounded-xl">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span className="text-xs font-medium tracking-wide">{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center space-x-3 text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 rounded-xl">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span className="text-xs font-medium tracking-wide">{success}</span>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div className="bg-[#1a1423] rounded-[2rem] p-6 space-y-5 mb-8 shadow-inner border border-white/5">
            
            <div>
              <label className={labelClass}>Select Bank</label>
              <select
                name="bankName"
                value={formData.bankName}
                onChange={handleInputChange}
                className={`${inputClass} appearance-none cursor-pointer`}
                required
              >
                <option value="" className="bg-slate-900 text-slate-500">Choose your bank...</option>
                {indianBanks.map(bank => (
                  <option key={bank} value={bank} className="bg-slate-900 text-white">{bank}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-5">
              <div>
                <label className={labelClass}>Account Number</label>
                <input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleInputChange}
                  className={`${inputClass} font-mono`}
                  placeholder="e.g., 1234567890123456"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>IFSC Code</label>
                  <input
                    type="text"
                    name="ifscCode"
                    value={formData.ifscCode}
                    onChange={handleInputChange}
                    className={`${inputClass} font-mono uppercase`}
                    placeholder="SBIN0001234"
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Branch</label>
                  <input
                    type="text"
                    name="branch"
                    value={formData.branch}
                    onChange={handleInputChange}
                    className={inputClass}
                    placeholder="e.g., Mumbai"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Secure PIN Setup */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 px-2 text-center">Set 4-Digit Security PIN</label>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <input
                type="password"
                name="pin"
                value={formData.pin}
                onChange={handleInputChange}
                className="w-full bg-[#1a1423] border border-white/10 text-white p-4 rounded-2xl outline-none text-center tracking-[0.5em] font-mono text-xl focus:border-indigo-500 transition-colors"
                placeholder="PIN"
                maxLength={4}
                required
              />
              <input
                type="password"
                name="confirmPin"
                value={formData.confirmPin}
                onChange={handleInputChange}
                className="w-full bg-[#1a1423] border border-white/10 text-white p-4 rounded-2xl outline-none text-center tracking-[0.5em] font-mono text-xl focus:border-indigo-500 transition-colors"
                placeholder="Confirm"
                maxLength={4}
                required
              />
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-4 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-[2] py-4 bg-indigo-600 text-white text-xs font-bold uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Banknote className="w-5 h-5" />
                <span>{isLoading ? 'Linking...' : 'Secure Account'}</span>
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};

export default BankAccountSetup;