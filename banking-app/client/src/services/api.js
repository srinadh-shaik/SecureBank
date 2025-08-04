import axios from 'axios';
import { localDB } from './database';

const API_BASE_URL = 'https://localhost:8000/';


class ApiService {
  api;
  isOnline = navigator.onLine;
  isServerHealthy = false; // Initialize server health status
  healthCheckInterval = null;
  token = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
    });

    // Load token from local storage on init
    this.token = localStorage.getItem('auth_token');
    if (this.token) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
    }
    if (this.isOnline) { // Perform initial health check if online
      this.healthCheck();
    }

    // Initialize network monitoring
    this.initializeNetworkMonitoring();

    // Intercept requests to add auth token
    this.api.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers['Authorization'] = `Bearer ${this.token}`;
        }
        if (!this.isOnline) { // Block requests if offline
          console.warn('API: Request blocked due to offline status:', config.url);
          return Promise.reject(new Error('Network offline. Request blocked.'));
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
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
      // Dispatch an event indicating server health, separate from network connectivity
      window.dispatchEvent(new CustomEvent('serverHealthChanged', { detail: { isHealthy: isHealthy } }));
    }, 15000); // Check every 15 seconds
  }

  stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('auth_token', token);
    this.api.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
  }

  getToken() {
    return this.token;
  }

  logout() {
    this.token = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data'); // Clear cached user data
    delete this.api.defaults.headers.common['Authorization'];
    this.stopHealthCheck();
    
    // Clear sync queue on logout to prevent cross-user contamination
    localDB.clearSyncQueue().catch(err => console.error('Failed to clear sync queue on logout:', err));
  }

  async requestOtp(phoneNumber) {
    try {
      const response = await this.api.post('/auth/request-otp', { phoneNumber });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to request OTP');
    }
  }

  async verifyOtp(phoneNumber, otp) {
    try {
      const response = await this.api.post('/auth/verify-otp', { phoneNumber, otp });
      const { token, user, message } = response.data;
      this.setToken(token);
      
      // Clear any existing sync queue from previous users
      await localDB.clearSyncQueue();
      
      await localDB.saveUserData('user', user); // Cache user data locally
      return { user, message };
    } catch (error) {
      throw new Error(error.response?.data?.error || 'OTP verification failed');
    }
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
      type: transactionData.type, // e.g., 'transfer'
      description: transactionData.description || '',
      status: 'syncing', // Always start as syncing
      createdAt: new Date().toISOString(),
      clientTimestamp: new Date().toISOString(),
      isOffline: true, // Initially true, will be updated on sync
      senderPin: senderPin // Include PIN for server validation
    };

    // 1. Save to local IndexedDB immediately
    await localDB.saveTransaction(transaction);
    console.log(`API: Transaction ${transaction.id} saved to local DB with status 'syncing'.`);

    // 2. Add to sync queue
    await localDB.addToSyncQueue({
      id: transactionId,
      type: 'transaction',
      data: transaction, // Store full transaction data for sync
      priority: 1, // High priority for new transactions
      attempts: 0,
      createdAt: new Date().toISOString()
    });
    console.log(`API: Transaction ${transaction.id} added to sync queue.`);

    // 3. Optimistically update sender's balance in local DB
    try {
      const currentUser = await localDB.getUserData('user');
      if (currentUser && currentUser.bankAccounts) {
        const updatedBankAccounts = currentUser.bankAccounts.map(account => {
          if (account.id === fromBankAccountId) {
            return { ...account, balance: account.balance - transaction.amount };
          }
          return account;
        });
        await localDB.saveUserData('user', { ...currentUser, bankAccounts: updatedBankAccounts });
        console.log(`API: Optimistically updated balance for account ${fromBankAccountId}`);
      }
    } catch (balanceError) {
      console.error('API: Failed to optimistically update local balance:', balanceError);
    }
    // 3. If online and server healthy, trigger immediate sync
    if (this.isOnline && this.isServerHealthy) {
      console.log('API: Online and server healthy, triggering immediate sync.');
      this.syncOfflineTransactions(); // Don't await, let it run in background
    } else {
      console.log('API: Offline or server unhealthy, sync will happen later.');
    }
    
    // Return the locally saved transaction immediately for UI update
    return transaction;
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
      console.log('API: Starting offline transaction sync...');
      window.dispatchEvent(new CustomEvent('syncStarted'));
      
      const syncQueue = await localDB.getSyncQueue();
      const transactionSyncs = syncQueue.filter(item => item.type === 'transaction');

      console.log(`API: Found ${transactionSyncs.length} transactions to sync`);

      if (transactionSyncs.length === 0) {
        console.log('API: No transactions to sync');
        window.dispatchEvent(new CustomEvent('syncComplete', { detail: [] }));
        return;
      }

      const transactionsToSync = transactionSyncs.map(sync => sync.data);

      const response = await this.api.post('/sync/transactions', { transactions: transactionsToSync });
      const results = response.data.results;

      console.log('API: Sync response received:', results);

      // Update local transaction statuses based on sync results
      const successfulIds = [];
      for (const result of results) {
        if (result.status === 'success') {
          await localDB.updateTransactionStatus(result.id, 'completed');
          successfulIds.push(result.id);
        } else {
          await localDB.updateTransactionStatus(result.id, 'failed');
          console.log(`API: Transaction ${result.id} failed to sync:`, result.error);
        }
      }

      // Clear successful syncs from queue
      await localDB.clearSyncQueueItems(successfulIds);
      console.log(`API: Cleared ${successfulIds.length} successful transactions from sync queue`);
      
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
      const isHealthy = response.data.status === 'healthy';
      this.isServerHealthy = isHealthy; // Update internal state
      console.log(`API: Health check successful. Server status: ${isHealthy ? 'healthy' : 'unhealthy'}`);
      return isHealthy;
    } catch (error) {
      this.isServerHealthy = false; // Update internal state
      console.error('API: Health check failed:', error.message);
      return false;
    }
  }
}

<<<<<<< HEAD
export const apiService = new ApiService();

=======
export const apiService = new ApiService();
>>>>>>> 1bf951f (Describe what you changed)
