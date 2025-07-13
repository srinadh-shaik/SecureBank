import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/api';

const NetworkContext = createContext(undefined);

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

export const NetworkProvider = ({ children }) => {
  const [networkStatus, setNetworkStatus] = useState({
    isOnline: navigator.onLine,
    lastSync: localStorage.getItem('lastSync'),
    syncInProgress: false,
  });

  useEffect(() => {
    const handleNetworkStatusChange = (event) => {
      setNetworkStatus(prev => ({ 
        ...prev, 
        isOnline: event.detail.isOnline 
      }));
    };

    const handleSyncStarted = () => {
      setNetworkStatus(prev => ({ 
        ...prev, 
        syncInProgress: true 
      }));
    };

    const handleSyncComplete = (event) => {
      const now = new Date().toISOString();
      localStorage.setItem('lastSync', now);
      setNetworkStatus(prev => ({ 
        ...prev, 
        lastSync: now, 
        syncInProgress: false 
      }));
      
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('transactionsSynced', { detail: event.detail }));
    };

    const handleSyncFailed = () => {
      setNetworkStatus(prev => ({ 
        ...prev, 
        syncInProgress: false 
      }));
    };

    // Listen to custom events from API service
    window.addEventListener('networkStatusChanged', handleNetworkStatusChange);
    window.addEventListener('syncStarted', handleSyncStarted);
    window.addEventListener('transactionsSynced', handleSyncComplete);
    window.addEventListener('syncFailed', handleSyncFailed);

    // Initial sync if online
    if (networkStatus.isOnline) {
      triggerSync();
    }

    return () => {
      window.removeEventListener('networkStatusChanged', handleNetworkStatusChange);
      window.removeEventListener('syncStarted', handleSyncStarted);
      window.removeEventListener('transactionsSynced', handleSyncComplete);
      window.removeEventListener('syncFailed', handleSyncFailed);
    };
  }, []);

  const triggerSync = async () => {
    if (!networkStatus.isOnline || networkStatus.syncInProgress) return;

    try {
      await apiService.syncOfflineTransactions();
    } catch (error) {
      console.error('Manual sync failed:', error);
    }
  };

  const value = {
    networkStatus,
    triggerSync,
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
};
