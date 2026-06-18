import React from 'react';
import { ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';

const TransactionList = ({ transactions, userBankAccounts }) => {
  const getStatusText = (status) => {
    switch (status) {
      case 'completed': return <span className="text-emerald-400">Successful</span>;
      case 'pending': return <span className="text-amber-400">Pending</span>;
      case 'failed': return <span className="text-rose-400">Failed</span>;
      case 'syncing': return <span className="text-indigo-400">Queued</span>;
      default: return null;
    }
  };

  // Safely format the date, handling different backend variable names and invalid dates
  const formatExactDateTime = (dateInput) => {
    if (!dateInput) return 'Processing...';
    try {
      const date = new Date(dateInput);
      if (isNaN(date.getTime())) return 'Pending Sync'; // Prevents "Invalid Date" error
      
      const datePart = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const timePart = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      return `${datePart}, ${timePart}`;
    } catch (error) {
      return 'Processing...';
    }
  };

  // Dynamically generate the title based on sender/receiver data
  const getTransactionTitle = (transaction, isOutgoing) => {
    if (transaction.description) return transaction.description;

    if (isOutgoing) {
      const bankName = transaction.to_bank_name || 'Unknown Bank';
      const accNum = transaction.to_account_number || transaction.toBankAccountId;
      const maskedAcc = accNum ? `(**${String(accNum).slice(-4)})` : '';
      return `To: ${bankName} ${maskedAcc}`;
    } else {
      const bankName = transaction.from_bank_name || 'Unknown Bank';
      const accNum = transaction.from_account_number || transaction.fromBankAccountId;
      const maskedAcc = accNum ? `(**${String(accNum).slice(-4)})` : '';
      return `From: ${bankName} ${maskedAcc}`;
    }
  };

  if (transactions.length === 0) {
    return (
      <div className="p-10 text-center text-slate-500 h-full flex flex-col items-center justify-center">
        <Clock className="h-10 w-10 mx-auto mb-4 opacity-30" />
        <p className="text-sm font-medium tracking-wide">No transactions to show</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {transactions.map((transaction) => {
        // Determine if money is leaving the user's account
        const isOutgoing = userBankAccounts.some(acc => acc.id === transaction.fromBankAccountId);
        
        // Grab the correct date field (handling both camelCase and snake_case)
        const transactionDate = transaction.createdAt || transaction.created_at || transaction.timestamp;
        
        return (
          <div key={transaction.id} className="p-4 sm:p-5 border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors rounded-2xl">
            <div className="flex items-center justify-between">
              
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                  {isOutgoing ? (
                    <ArrowUpRight className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ArrowDownLeft className="h-5 w-5 text-emerald-400" />
                  )}
                </div>
                
                <div>
                  <p className="text-sm font-bold text-slate-200 mb-1">
                    {getTransactionTitle(transaction, isOutgoing)}
                  </p>
                  <p className="text-xs text-slate-400 font-medium tracking-wide mb-1">
                    {getStatusText(transaction.status)}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono tracking-wider">
                    {formatExactDateTime(transactionDate)}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0 pl-4">
                <p className={`text-lg font-black tabular-nums tracking-tight ${
                  isOutgoing ? 'text-slate-200' : 'text-emerald-400'
                }`}>
                  {isOutgoing ? '-' : '+'}₹{transaction.amount.toFixed(2)}
                </p>
              </div>

            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TransactionList;