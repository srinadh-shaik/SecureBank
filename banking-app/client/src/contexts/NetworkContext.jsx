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
    isServerHealthy: apiService.isServerHealthy, // Initialize with current API service health
    lastSync: localStorage.getItem('lastSync'),
    syncInProgress: false,
  });

  useEffect(() => {
    const handleNetworkStatusChange = (event) => {
      setNetworkStatus(prev => ({ 
        ...prev, 
        isOnline: event.detail.isOnline 
      }));
      // If network comes back online, trigger a sync
      if (event.detail.isOnline) {
        triggerSync();
      }
    };
    const handleServerHealthChanged = (event) => {
      setNetworkStatus(prev => ({ ...prev, isServerHealthy: event.detail.isHealthy }));
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
      // apiService already dispatches 'transactionsSynced', no need to re-dispatch here.
    };

    const handleSyncFailed = () => {
      setNetworkStatus(prev => ({ 
        ...prev, 
        syncInProgress: false 
      }));
    };

    // Listen to custom events from API service
    window.addEventListener('networkStatusChanged', handleNetworkStatusChange); // Browser online/offline
    window.addEventListener('serverHealthChanged', handleServerHealthChanged); // Server health check result
    window.addEventListener('syncStarted', handleSyncStarted); // Sync process started
    window.addEventListener('transactionsSynced', handleSyncComplete); // Sync process completed
    window.addEventListener('syncFailed', handleSyncFailed); // Sync process failed

    // Initial sync attempt on component mount if conditions are met
    // This useEffect will also trigger sync when network/server status changes
    if (networkStatus.isOnline && networkStatus.isServerHealthy && !networkStatus.syncInProgress) {
      console.log('NetworkContext: Initial conditions met for sync. Triggering sync...');
      triggerSync();
    } else if (apiService.isOnline && !apiService.isServerHealthy) { // ADDED: Trigger health check if online but server not healthy
      console.log('NetworkContext: Initializing health check on mount.');
      apiService.healthCheck(); // Trigger an immediate health check
      console.log('NetworkContext: Initial conditions met for sync. Triggering sync...');
      triggerSync();
    } else {
      console.log('NetworkContext: Initial sync conditions not met.', networkStatus);
    }

    return () => {
      window.removeEventListener('networkStatusChanged', handleNetworkStatusChange);
      window.removeEventListener('syncStarted', handleSyncStarted);
      window.removeEventListener('serverHealthChanged', handleServerHealthChanged);
      window.removeEventListener('transactionsSynced', handleSyncComplete);
      window.removeEventListener('syncFailed', handleSyncFailed);
    };
  }, []); // Empty dependency array, runs once for event listeners

  // New useEffect to trigger sync based on network and server health changes
  useEffect(() => {
    if (networkStatus.isOnline && networkStatus.isServerHealthy && !networkStatus.syncInProgress) {
      console.log('NetworkContext: Conditions met for sync. Triggering sync...');
      triggerSync();
    } else {
      console.log('NetworkContext: Sync conditions not met.', networkStatus);
    }
  }, [networkStatus.isOnline, networkStatus.isServerHealthy, networkStatus.syncInProgress]); // Dependencies for this effect

  const triggerSync = async () => {
    console.log('NetworkContext: Manual sync triggered, online:', networkStatus.isOnline, 'syncInProgress:', networkStatus.syncInProgress);
    if (!networkStatus.isOnline || !networkStatus.isServerHealthy || networkStatus.syncInProgress) return;
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
