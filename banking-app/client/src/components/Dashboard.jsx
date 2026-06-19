import React, { useState, useEffect } from 'react';
import { User, CreditCard, History, Send, Plus, LogOut, Banknote, Building2, Bell, Eye, EyeOff, ArrowDownLeft, ArrowUpRight, QrCode, X } from 'lucide-react';
import { apiService } from '../services/api';
import { localDB } from '../services/database';
import NetworkStatus from './NetworkStatus';
import TransactionList from './TransactionList';
import TransactionForm from './TransactionForm';
import BankAccountSetup from './BankAccountSetup';
import UserProfileDrawer from './UserProfileDrawer';
import { useAuth } from '../contexts/AuthContext';
import { QrReader } from 'react-qr-reader';

const Dashboard = () => {
  const { user, logout, updateUserBankAccounts } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showBankAccountSetup, setShowBankAccountSetup] = useState(false);
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [showBalance, setShowBalance] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      try {
        const [accountDetails, transactionsData] = await Promise.all([
          apiService.getAccountDetails(),
          apiService.getTransactions(1, 20)
        ]);
        setTransactions(transactionsData.transactions);
      } catch (error) {
        const localTransactions = await localDB.getTransactions();
        setTransactions(localTransactions.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const handleTransactionUpdate = () => loadDashboardData();
    window.addEventListener('transactionsSynced', handleTransactionUpdate);
    return () => window.removeEventListener('transactionsSynced', handleTransactionUpdate);
  }, [user]);

  const handleTransactionSubmit = async (transactionData, fromBankAccountId, senderPin) => {
    if (!user) return;
    try {
      const newTransaction = await apiService.createTransaction(transactionData, fromBankAccountId, senderPin);
      setTransactions(prev => [newTransaction, ...prev]);
      await updateUserBankAccounts();
      setShowTransactionForm(false);
      setScannedData(null);
      window.dispatchEvent(new CustomEvent('transactionCreated'));
    } catch (error) {
      console.error('Transaction failed:', error);
      loadDashboardData();
    }
  };

  const handleScan = (result, error) => {
    if (!!result) {
      try {
        const parsedData = JSON.parse(result?.text);
        setScannedData(parsedData);
        setShowScanner(false);
        setShowTransactionForm(true);
      } catch (err) {
        console.error("Invalid QR format or scan failed");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d0914] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return <div className="min-h-screen bg-[#0d0914] text-white flex items-center justify-center">Not authenticated.</div>;

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="min-h-screen bg-[#0d0914] font-sans text-slate-200 relative overflow-x-hidden">
      
      <div className="fixed top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none"></div>
      
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-2xl bg-[#0d0914]/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => setShowProfileDrawer(true)} className="relative hover:scale-105 transition-transform">
              <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center border border-white/10 shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                <span className="text-white font-bold text-lg">{userInitial}</span>
              </div>
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0d0914] rounded-full"></div>
            </button>
            <div>
              <p className="text-[10px] text-slate-400 font-mono tracking-widest mb-0.5">{user?.phone_number}</p>
              <h1 className="text-base font-bold text-white leading-tight capitalize">{user?.name || 'Authorized User'}</h1>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <NetworkStatus />
            <button className="relative p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
            </button>
            <button onClick={logout} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          <div className="lg:col-span-7 space-y-8">
            {/* Primary Bank Card */}
            <div className="bg-[#1a1423] border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/20 transition-all duration-700"></div>
              
              {user.bankAccounts && user.bankAccounts.length > 0 ? (
                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-200 tracking-wide">{user.bankAccounts[0].bank_name}</h3>
                        <p className="text-xs text-slate-400 font-mono tracking-widest mt-0.5">** {user.bankAccounts[0].account_number.slice(-4)}</p>
                      </div>
                    </div>
                    <div className="bg-emerald-500/10 px-3 py-1.5 rounded-md text-[10px] font-bold tracking-widest text-emerald-400 border border-emerald-500/20">
                      PRIMARY
                    </div>
                  </div>
                  
                  <p className="text-xs text-slate-400 mb-2 font-medium tracking-wide">Available Balance</p>
                  <div className="flex items-center gap-4">
                    <div className="text-4xl sm:text-5xl font-black text-white tracking-tight tabular-nums drop-shadow-md">
                      {showBalance ? `₹${user.bankAccounts[0].balance.toFixed(2)}` : '••••••'}
                    </div>
                    <button 
                      onClick={() => setShowBalance(!showBalance)} 
                      className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/5"
                    >
                      {showBalance ? <EyeOff className="w-5 h-5 text-slate-300" /> : <Eye className="w-5 h-5 text-slate-300" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative z-10 text-center py-8">
                  <p className="text-sm text-slate-400 mb-6">No bank account linked</p>
                  <button onClick={() => setShowBankAccountSetup(true)} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-full transition-colors shadow-lg shadow-indigo-500/20">
                    Link Account
                  </button>
                </div>
              )}
            </div>

            {/* Action Grid (QR Scanner replacing Add Funds) */}
            <div className="bg-[#1a1423] border border-white/5 rounded-3xl p-8 shadow-xl">
              <h2 className="text-xs font-bold text-slate-400 mb-8 tracking-widest uppercase">Money Transfers</h2>
              <div className="grid grid-cols-4 gap-y-8 gap-x-4 sm:gap-x-8">
                <button onClick={() => setShowTransactionForm(true)} disabled={!user.bankAccounts?.length} className="flex flex-col items-center gap-3 group disabled:opacity-50">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-indigo-600 rounded-[1.2rem] flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.4)] group-hover:bg-indigo-500 transition-all duration-300">
                    <Send className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <span className="text-[11px] sm:text-xs text-slate-300 font-medium text-center leading-tight">Send<br/>Money</span>
                </button>

                <button onClick={() => setShowTransactionForm(true)} disabled={!user.bankAccounts?.length} className="flex flex-col items-center gap-3 group disabled:opacity-50">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/5 border border-white/10 rounded-[1.2rem] flex items-center justify-center group-hover:bg-white/10 transition-all duration-300">
                    <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-400" />
                  </div>
                  <span className="text-[11px] sm:text-xs text-slate-300 font-medium text-center leading-tight">To Bank/<br/>UPI</span>
                </button>

                <button onClick={() => setShowScanner(true)} className="flex flex-col items-center gap-3 group">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/5 border border-white/10 rounded-[1.2rem] flex items-center justify-center group-hover:bg-white/10 transition-all duration-300">
                    <QrCode className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-400" />
                  </div>
                  <span className="text-[11px] sm:text-xs text-slate-300 font-medium text-center leading-tight">Scan<br/>QR</span>
                </button>

                <button onClick={() => setShowBankAccountSetup(true)} className="flex flex-col items-center gap-3 group">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/5 border border-white/10 rounded-[1.2rem] flex items-center justify-center group-hover:bg-white/10 transition-all duration-300">
                    <Banknote className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-400" />
                  </div>
                  <span className="text-[11px] sm:text-xs text-slate-300 font-medium text-center leading-tight">Link<br/>Account</span>
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col h-full">
            <div className="flex justify-between items-end mb-6">
              <h2 className="text-sm font-bold text-slate-200 tracking-wide uppercase">Recent Transactions</h2>
              <button className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                View All <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-[#1a1423] border border-white/5 rounded-3xl p-3 shadow-xl flex-grow overflow-hidden flex flex-col">
              <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
                <TransactionList transactions={transactions} userBankAccounts={user.bankAccounts} />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modals & Overlays */}
      <UserProfileDrawer 
        isOpen={showProfileDrawer} 
        onClose={() => setShowProfileDrawer(false)} 
        user={user} 
        onUpdateAccounts={updateUserBankAccounts} 
      />

      {showScanner && (
        <div className="fixed inset-0 bg-[#0d0914]/95 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6">
           <button onClick={() => setShowScanner(false)} className="absolute top-8 right-8 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition">
             <X className="w-6 h-6" />
           </button>
           <h2 className="text-white font-bold text-2xl mb-2">Scan & Pay</h2>
           <p className="text-slate-400 text-sm mb-10">Scan any SecureBank QR Code</p>
           <div className="w-full max-w-sm rounded-[2rem] overflow-hidden border-2 border-indigo-500 shadow-[0_0_50px_rgba(79,70,229,0.2)] bg-black">
             <QrReader
               onResult={handleScan}
               constraints={{ facingMode: 'environment' }}
               style={{ width: '100%' }}
             />
           </div>
        </div>
      )}

      {showTransactionForm && (
        <TransactionForm
          onSubmit={handleTransactionSubmit}
          onCancel={() => { setShowTransactionForm(false); setScannedData(null); }}
          userBankAccounts={user.bankAccounts}
          initialRecipientData={scannedData}
        />
      )}
      
      {showBankAccountSetup && (
        <BankAccountSetup
          onCancel={() => setShowBankAccountSetup(false)}
          onSuccess={() => setShowBankAccountSetup(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;