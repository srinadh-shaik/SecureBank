import React from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle } from 'lucide-react';
import { useNetwork } from '../contexts/NetworkContext';

const NetworkStatus = () => {
  const { networkStatus, triggerSync } = useNetwork();

  const getStatusColor = () => {
    if (networkStatus.syncInProgress) return 'text-blue-500';
    if (networkStatus.isOnline) return 'text-green-500';
    return 'text-red-500';
  };

  const getStatusText = () => {
    if (networkStatus.syncInProgress) return 'Syncing...';
    if (networkStatus.isOnline) return 'Online';
    return 'Offline';
  };

  const getStatusIcon = () => {
    if (networkStatus.syncInProgress) {
      return <RefreshCw className="w-4 h-4 animate-spin" />;
    }
    if (networkStatus.isOnline) {
      return <Wifi className="w-4 h-4" />;
    }
    return <WifiOff className="w-4 h-4" />;
  };

  return (
    <div className="flex items-center space-x-2 text-sm">
      <div className={`flex items-center space-x-1 ${getStatusColor()}`}>
        {getStatusIcon()}
        <span>{getStatusText()}</span>
      </div>
      
      {networkStatus.lastSync && (
        <div className="flex items-center space-x-1 text-gray-500">
          <CheckCircle className="w-3 h-3" />
          <span className="text-xs">
            Last sync: {new Date(networkStatus.lastSync).toLocaleTimeString()}
          </span>
        </div>
      )}
      
      {networkStatus.isOnline && !networkStatus.syncInProgress && (
        <button
          onClick={triggerSync}
          className="text-blue-500 hover:text-blue-600 text-xs underline"
        >
          Sync now
        </button>
      )}
    </div>
  );
};

export default NetworkStatus;
