import React from 'react';
import { useNetwork } from '../contexts/NetworkContext';

const NetworkStatus = () => {
  const { networkStatus, triggerSync } = useNetwork();

  if (networkStatus.syncInProgress) {
    return (
      <div className="flex flex-col items-end">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Live</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor] ${networkStatus.isOnline ? 'bg-emerald-500 text-emerald-500' : 'bg-rose-500 text-rose-500'}`}></div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {networkStatus.isOnline ? 'Online' : 'Offline'}
        </span>
      </div>
      
      {networkStatus.lastSync && (
        <span className="text-[9px] text-slate-600 font-medium tracking-wide">
          Last sync: {new Date(networkStatus.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
      
      {networkStatus.isOnline && !networkStatus.syncInProgress && (
        <button
          onClick={triggerSync}
          className="text-[10px] text-indigo-400 hover:text-indigo-300 underline font-medium tracking-wide mt-1"
        >
          Force Sync
        </button>
      )}
    </div>
  );
};

export default NetworkStatus;