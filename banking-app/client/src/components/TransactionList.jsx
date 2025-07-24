import React from 'react';
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

const TransactionList = ({ transactions, userBankAccounts }) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'syncing':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      case 'syncing':
        return 'Syncing';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      case 'syncing':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (transactions.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>No transactions yet</p>
        <p className="text-sm">Your transaction history will appear here</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {transactions.map((transaction) => {
        const isOutgoing = userBankAccounts.some(acc => acc.id === transaction.fromBankAccountId);
        
        return (
          <div key={transaction.id} className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {isOutgoing ? (
                    <ArrowUpRight className="h-6 w-6 text-red-500" />
                  ) : (
                    <ArrowDownLeft className="h-6 w-6 text-green-500" />
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900">
                      {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                    </p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                      {getStatusIcon(transaction.status)}
                      <span className="ml-1">{getStatusText(transaction.status)}</span>
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {transaction.description || 
                     (isOutgoing ? `To: ${transaction.to_bank_name || 'Unknown'} (${transaction.to_account_number || transaction.toBankAccountId})` : `From: ${transaction.from_bank_name || 'Unknown'} (${transaction.from_account_number || transaction.fromBankAccountId})`)
                    } 
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDate(transaction.createdAt)}
                    {transaction.isOffline && (
                      <span className="ml-2 text-amber-600">(Offline)</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-medium ${
                  isOutgoing ? 'text-red-600' : 'text-green-600'
                }`}>
                  {isOutgoing ? '-' : '+'}{transaction.amount.toFixed(2)}
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
