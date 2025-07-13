import axios from 'axios';
import { localDB } from './database';

// const API_BASE_URL = 'http://localhost:8000';
const API_BASE_URL = 'http://localhost:3001/api';

class ApiService {
  api;
  isOnline = navigator.onLine;
  healthCheckInterval = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
    });

    // For this demo, we don't need to manage JWT tokens on the client side
    // because the backend's authenticateToken middleware always assigns the demo user.
    // However, if you re-introduce proper authentication, you'd re-enable token handling here.

    // Initialize network monitoring
    this.initializeNetworkMonitoring();
  }

  initializeNetworkMonitoring() {
    // Listen for network changes
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.startHealthCheck();
      this.syncOfflineTransactions();
      window.dispatchEvent(new CustomEvent('networkStatusChanged', { detail: { isOnline: true } }));
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.stopHealthCheck();
      window.dispatchEvent(new CustomEvent('networkStatusChanged', { detail: { isOnline: false } }));
    });

    // Start health check if online
    if (this.isOnline) {
      this.startHealthCheck();
    }
  }

  startHealthCheck() {
    this.stopHealthCheck(); // Clear any existing interval
    this.healthCheckInterval = setInterval(async () => {
      const isHealthy = await this.healthCheck();
      if (!isHealthy && this.isOnline) {
        this.isOnline = false;
        window.dispatchEvent(new CustomEvent('networkStatusChanged', { detail: { isOnline: false } }));
      } else if (isHealthy && !this.isOnline) {
        this.isOnline = true;
        window.dispatchEvent(new CustomEvent('networkStatusChanged', { detail: { isOnline: true } }));
        this.syncOfflineTransactions();
      }
    }, 15000); // Check every 15 seconds
  }

  stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  // No token management needed for this demo setup
  logout() {
    localStorage.removeItem('user_data'); // Clear cached user data
    // No token to clear from axios headers
  }

  async getAccountDetails() {
    try {
      const response = await this.api.get('/account/details');
      const user = response.data;
      await localDB.saveUserData('user', user); // Cache user data locally
      return user;
    } catch (error) {
      if (!this.isOnline) {
        const cachedUser = await localDB.getUserData('user');
        if (cachedUser) return cachedUser;
      }
      throw new Error(error.response?.data?.error || 'Failed to fetch account details');
    }
  }

  async linkBankAccount(bankName, accountNumber, ifscCode, branch, pin) {
    try {
      const response = await this.api.post('/bank-accounts/link', { bankName, accountNumber, ifscCode, branch, pin });
      // After linking, refresh user details to update local cache
      await this.getAccountDetails(); 
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to link bank account');
    }
  }

  async getBankAccounts() {
    try {
      const response = await this.api.get('/bank-accounts');
      return response.data;
    } catch (error) {
      if (!this.isOnline) {
        const cachedUser = await localDB.getUserData('user');
        if (cachedUser && cachedUser.bankAccounts) return cachedUser.bankAccounts;
      }
      throw new Error(error.response?.data?.error || 'Failed to fetch bank accounts');
    }
  }

  async lookupBankAccount(accountNumber, ifscCode, branch) {
    try {
      const response = await this.api.post('/bank-accounts/lookup', { accountNumber, ifscCode, branch });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Recipient lookup failed');
    }
  }

  async createTransaction(transactionData, fromBankAccountId, senderPin) {
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const transaction = {
      id: transactionId,
      fromBankAccountId: fromBankAccountId,
      toAccountNumber: transactionData.toAccountNumber,
      toIfscCode: transactionData.toIfscCode,
      toBranch: transactionData.toBranch,
      amount: transactionData.amount,
      type: transactionData.type,
      description: transactionData.description || '',
      status: 'pending', // Initial status
      createdAt: new Date().toISOString(),
      clientTimestamp: new Date().toISOString(),
      isOffline: !this.isOnline,
      senderPin: senderPin // Include PIN for server validation
    };

    if (this.isOnline) {
      try {
        const response = await this.api.post('/transactions', transaction);
        const serverTransaction = response.data.transaction;
        
        // Save successful transaction to local DB
        await localDB.saveTransaction(serverTransaction);
        
        return serverTransaction;
      } catch (error) {
        // If online but request failed, queue for sync
        transaction.status = 'pending'; // Keep as pending for retry
        await localDB.saveTransaction(transaction);
        await localDB.addToSyncQueue({
          id: transactionId,
          type: 'transaction',
          data: transaction, // Store full transaction data for sync
          priority: 1,
          attempts: 0,
          createdAt: new Date().toISOString()
        });
        throw new Error(error.response?.data?.error || 'Transaction failed - queued for sync');
      }
    } else {
      // Offline - save to local database
      transaction.status = 'pending';
      await localDB.saveTransaction(transaction);
      await localDB.addToSyncQueue({
        id: transactionId,
        type: 'transaction',
        data: transaction, // Store full transaction data for sync
        priority: 1,
        attempts: 0,
        createdAt: new Date().toISOString()
      });
      
      return transaction;
    }
  }

  async getTransactions(page = 1, limit = 10) {
    try {
      if (this.isOnline) {
        const response = await this.api.get(`/transactions?page=${page}&limit=${limit}`);
        const serverTransactions = response.data.transactions;
        
        // Save server transactions to local DB
        for (const tx of serverTransactions) {
          await localDB.saveTransaction(tx);
        }
        
        return {
          transactions: serverTransactions,
          hasMore: response.data.hasMore
        };
      } else {
        throw new Error('Offline');
      }
    } catch (error) {
      // Return local transactions when offline or server error
      const localTransactions = await localDB.getTransactions();
      return {
        transactions: localTransactions.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).slice(0, limit),
        hasMore: false
      };
    }
  }

  async syncOfflineTransactions() {
    if (!this.isOnline) return;

    try {
      await localDB.ready(); // Ensure IndexedDB is initialized
      window.dispatchEvent(new CustomEvent('syncStarted'));
      
      const syncQueue = await localDB.getSyncQueue();
      const transactionSyncs = syncQueue.filter(item => item.type === 'transaction');

      if (transactionSyncs.length === 0) {
        window.dispatchEvent(new CustomEvent('syncComplete', { detail: [] }));
        return;
      }

      const transactionsToSync = transactionSyncs.map(sync => sync.data);

      const response = await this.api.post('/sync/transactions', { transactions: transactionsToSync });
      const results = response.data.results;

      // Update local transaction statuses based on sync results
      const successfulIds = [];
      for (const result of results) {
        if (result.status === 'success') {
          await localDB.updateTransactionStatus(result.id, 'completed');
          successfulIds.push(result.id);
        } else {
          await localDB.updateTransactionStatus(result.id, 'failed');
        }
      }

      // Clear successful syncs from queue
      await localDB.clearSyncQueueItems(successfulIds);
      
      // Dispatch sync complete event
      window.dispatchEvent(new CustomEvent('transactionsSynced', { detail: results }));
    } catch (error) {
      console.error('Sync failed:', error);
      window.dispatchEvent(new CustomEvent('syncFailed', { detail: error }));
    }
  }

  async healthCheck() {
    try {
      const response = await this.api.get('/health');
      return response.data.status === 'healthy';
    } catch (error) {
      return false;
    }
  }
}

export const apiService = new ApiService();