import React, { useState, useEffect } from 'react';
import { User, CreditCard, History, Send, Plus, LogOut, Banknote } from 'lucide-react';
import { apiService } from '../services/api';
import { localDB } from '../services/database';
import NetworkStatus from './NetworkStatus';
import TransactionList from './TransactionList';
import TransactionForm from './TransactionForm';
import BankAccountSetup from './BankAccountSetup';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { user, logout, updateUserBankAccounts } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showBankAccountSetup, setShowBankAccountSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Try to get fresh data from server
      try {
        const [accountDetails, transactionsData] = await Promise.all([
          apiService.getAccountDetails(), // To get updated bank account balances
          apiService.getTransactions(1, 20)
        ]);

        // Update user context with latest bank account details (removed explicit call, AuthContext handles it)
        setTransactions(transactionsData.transactions);
      } catch (error) {
        // If server request fails, load from local storage
        console.log('Loading from local storage...');
        const localTransactions = await localDB.getTransactions();
        setTransactions(localTransactions.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
        // User context already has cached bank accounts
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Listen for transaction updates and syncs
    const handleTransactionUpdate = () => {
      loadDashboardData();
    };

    window.addEventListener('transactionsSynced', handleTransactionUpdate);

    return () => {
      window.removeEventListener('transactionsSynced', handleTransactionUpdate);
    };
  }, [user]); // Depend on user to reload data when user object changes (e.g., after login)

  const handleTransactionSubmit = async (transactionData, fromBankAccountId, senderPin) => {
    if (!user) return;

    console.log('Dashboard: Submitting transaction...', { fromBankAccountId, amount: transactionData.amount });

    try {
      const newTransaction = await apiService.createTransaction(transactionData, fromBankAccountId, senderPin);
      console.log('Dashboard: Transaction created successfully:', newTransaction);
      
      // Optimistically update transactions list
      setTransactions(prev => [newTransaction, ...prev]);
      
      // Refresh bank account balances after transaction
      console.log('Dashboard: Updating user bank accounts...');
      await updateUserBankAccounts();
      
      console.log('Dashboard: Closing transaction form...');
      setShowTransactionForm(false);
      
      console.log('Dashboard: Dispatching transactionCreated event...');
      window.dispatchEvent(new CustomEvent('transactionCreated'));
    } catch (error) {
      console.error('Transaction failed:', error);
      // Reload data to show pending transactions or updated balances
      loadDashboardData();
      // Don't close the form on error so user can see the error and retry
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Not authenticated.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-indigo-600 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">PayX</h1>
                <p className="text-sm text-gray-600">
                  Welcome back, {user?.phone_number}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <NetworkStatus />
              <button
                onClick={logout}
                className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition-colors text-sm"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Account Overview */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Your Bank Accounts</h2>
                <CreditCard className="h-6 w-6 text-indigo-600" />
              </div>
              {user.bankAccounts && user.bankAccounts.length > 0 ? (
                <div className="space-y-4">
                  {user.bankAccounts.map(account => (
                    <div key={account.id} className="border-b pb-2 last:border-b-0 last:pb-0">
                      <p className="text-md font-semibold text-gray-800">{account.bank_name}</p>
                      <p className="text-2xl font-bold text-indigo-600">
                        ₹{account.balance.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600">A/C: {account.account_number}</p>
                      <p className="text-xs text-gray-500">IFSC: {account.ifsc_code} | Branch: {account.branch}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">No bank accounts linked yet.</p>
                  <button
                    onClick={() => setShowBankAccountSetup(true)}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Link your first account
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => setShowTransactionForm(true)}
                  className="w-full flex items-center justify-center space-x-2 bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
                  disabled={!user.bankAccounts || user.bankAccounts.length === 0}
                >
                  <Send className="h-5 w-5" />
                  <span>Send Money</span>
                </button>
                <button className="w-full flex items-center justify-center space-x-2 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                  disabled={!user.bankAccounts || user.bankAccounts.length === 0}
                >
                  <Plus className="h-5 w-5" />
                  <span>Add Funds (Deposit)</span>
                </button>
                <button
                  onClick={() => setShowBankAccountSetup(true)}
                  className="w-full flex items-center justify-center space-x-2 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Banknote className="h-5 w-5" />
                  <span>Link New Bank Account</span>
                </button>
              </div>
            </div>
          </div>

          {/* Transactions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
                  <History className="h-6 w-6 text-gray-400" />
                </div>
              </div>
              <TransactionList transactions={transactions} userBankAccounts={user.bankAccounts} />
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Form Modal */}
      {showTransactionForm && (
        <TransactionForm
          onSubmit={handleTransactionSubmit}
          onCancel={() => setShowTransactionForm(false)}
          userBankAccounts={user.bankAccounts}
        />
      )}

      {/* Bank Account Setup Modal */}
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
