import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'your-encryption-key-here-change-in-production';

export class LocalDatabase {
  dbName = 'BankingApp';
  version = 4; // Increment version for schema changes
  db = null;
  initPromise = null; // To track initialization status

  async init() {
    if (this.initPromise) {
      return this.initPromise; // Return existing promise if already initializing/initialized
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        this.initPromise = null; // Reset promise on error
        reject(request.error);
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create transactions store
        if (!db.objectStoreNames.contains('transactions')) {
          const transactionStore = db.createObjectStore('transactions', { keyPath: 'id' });
          transactionStore.createIndex('status', 'status', { unique: false });
          transactionStore.createIndex('createdAt', 'createdAt', { unique: false });
          transactionStore.createIndex('fromBankAccountId', 'fromBankAccountId', { unique: false });
          transactionStore.createIndex('toBankAccountId', 'toBankAccountId', { unique: false });
        }

        // Create user data store
        if (!db.objectStoreNames.contains('userData')) {
          db.createObjectStore('userData', { keyPath: 'key' });
        }

        // Create sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
          syncStore.createIndex('priority', 'priority', { unique: false });
          syncStore.createIndex('attempts', 'attempts', { unique: false });
          syncStore.createIndex('type', 'type', { unique: false });
        }

        // Create users cache store (for recipient lookup)
        if (!db.objectStoreNames.contains('usersCache')) {
          const usersStore = db.createObjectStore('usersCache', { keyPath: 'id' });
          usersStore.createIndex('accountNumber', 'accountNumber', { unique: true });
          usersStore.createIndex('phoneNumber', 'phoneNumber', { unique: true });
        }
      };
    });

    return this.initPromise;
  }

  async ready() {
    if (!this.db) {
      await this.init();
    }
    return this.initPromise;
  }

  encrypt(data) {
    return CryptoJS.AES.encrypt(data, ENCRYPTION_KEY).toString();
  }

  decrypt(encryptedData) {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  async saveTransaction(transaction) {
    await this.ready(); // Ensure DB is ready
    if (!this.db) throw new Error('Database not initialized');

    // Prepare transaction for storage, encrypting sensitive parts
    const encryptedTransaction = {
      ...transaction,
      sensitiveData: this.encrypt(JSON.stringify({
        amount: transaction.amount,
        toAccountNumber: transaction.toAccountNumber,
        toIfscCode: transaction.toIfscCode,
        toBranch: transaction.toBranch,
        fromBankAccountId: transaction.fromBankAccountId,
        toBankAccountId: transaction.toBankAccountId, // Store resolved ID if available
        description: transaction.description,
        senderPin: transaction.senderPin // Encrypt PIN for local storage
      }))
    };

    // Remove sensitive data from main object for direct storage
    delete encryptedTransaction.amount;
    delete encryptedTransaction.toAccountNumber;
    delete encryptedTransaction.toIfscCode;
    delete encryptedTransaction.toBranch;
    delete encryptedTransaction.fromBankAccountId;
    delete encryptedTransaction.toBankAccountId;
    delete encryptedTransaction.description;
    delete encryptedTransaction.senderPin;

    return new Promise((resolve, reject) => {
      const transactionDb = this.db.transaction(['transactions'], 'readwrite');
      const store = transactionDb.objectStore('transactions');
      const request = store.put(encryptedTransaction);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getTransactions(status) {
    await this.ready(); // Ensure DB is ready
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transactionDb = this.db.transaction(['transactions'], 'readonly');
      const store = transactionDb.objectStore('transactions');
      
      let request;
      if (status) {
        const index = store.index('status');
        request = index.getAll(status);
      } else {
        request = store.getAll();
      }

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const transactions = request.result.map((tx) => {
          if (tx.sensitiveData) {
            try {
              const decryptedData = JSON.parse(this.decrypt(tx.sensitiveData));
              return { ...tx, ...decryptedData };
            } catch (error) {
              console.error('Failed to decrypt transaction data:', error);
              return tx; // Return original if decryption fails
            }
          }
          return tx;
        });
        resolve(transactions);
      };
    });
  }

  async updateTransactionStatus(id, status) {
    await this.ready(); // Ensure DB is ready
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transactionDb = this.db.transaction(['transactions'], 'readwrite');
      const store = transactionDb.objectStore('transactions');
      const getRequest = store.get(id);

      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        const data = getRequest.result;
        if (data) {
          data.status = status;
          data.updatedAt = new Date().toISOString();
          const updateRequest = store.put(data);
          updateRequest.onerror = () => reject(updateRequest.error);
          updateRequest.onsuccess = () => resolve();
        } else {
          reject(new Error('Transaction not found'));
        }
      };
    });
  }

  async addToSyncQueue(item) {
    await this.ready(); // Ensure DB is ready
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transactionDb = this.db.transaction(['syncQueue'], 'readwrite');
      const store = transactionDb.objectStore('syncQueue');
      const request = store.put(item);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getSyncQueue() {
    await this.ready(); // Ensure DB is ready
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transactionDb = this.db.transaction(['syncQueue'], 'readonly');
      const store = transactionDb.objectStore('syncQueue');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async clearSyncQueue() {
    await this.ready(); // Ensure DB is ready
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transactionDb = this.db.transaction(['syncQueue'], 'readwrite');
      const store = transactionDb.objectStore('syncQueue');
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clearSyncQueueItems(ids) {
    await this.ready(); // Ensure DB is ready
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transactionDb = this.db.transaction(['syncQueue'], 'readwrite');
      const store = transactionDb.objectStore('syncQueue');
      
      let completed = 0;
      const total = ids.length;
      
      if (total === 0) {
        resolve();
        return;
      }

      ids.forEach(id => {
        const request = store.delete(id);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            resolve();
          }
        };
      });
    });
  }

  async saveUserData(key, data) {
    await this.ready(); // Ensure DB is ready
    if (!this.db) throw new Error('Database not initialized');

    const encryptedData = this.encrypt(JSON.stringify(data));

    return new Promise((resolve, reject) => {
      const transactionDb = this.db.transaction(['userData'], 'readwrite');
      const store = transactionDb.objectStore('userData');
      const request = store.put({ key, data: encryptedData, updatedAt: new Date().toISOString() });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getUserData(key) {
    await this.ready(); // Ensure DB is ready
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transactionDb = this.db.transaction(['userData'], 'readonly');
      const store = transactionDb.objectStore('userData');
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          try {
            const decryptedData = JSON.parse(this.decrypt(result.data));
            resolve(decryptedData);
          } catch (error) {
            console.error('Failed to decrypt user data:', error);
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };
    });
  }

  async saveUsersCache(users) {
    await this.ready(); // Ensure DB is ready
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transactionDb = this.db.transaction(['usersCache'], 'readwrite');
      const store = transactionDb.objectStore('usersCache');
      
      // Clear existing cache
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        let completed = 0;
        const total = users.length;
        
        if (total === 0) {
          resolve();
          return;
        }

        users.forEach(user => {
          const request = store.put({
            ...user,
            cachedAt: new Date().toISOString()
          });
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            completed++;
            if (completed === total) {
              resolve();
            }
          };
        });
      };
      clearRequest.onerror = () => reject(clearRequest.error);
    });
  }

  async getUsersCache() {
    await this.ready(); // Ensure DB is ready
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transactionDb = this.db.transaction(['usersCache'], 'readonly');
      const store = transactionDb.objectStore('usersCache');
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async findUserByAccountNumber(accountNumber) {
    await this.ready(); // Ensure DB is ready
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transactionDb = this.db.transaction(['usersCache'], 'readonly');
      const store = transactionDb.objectStore('usersCache');
      const index = store.index('accountNumber');
      const request = index.get(accountNumber);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }
}

export const localDB = new LocalDatabase();
