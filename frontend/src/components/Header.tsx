import React from 'react';
import { Wallet, LogOut, Vote } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle.js';
import { WalletState } from '../hooks/useSoroban.js';

interface HeaderProps {
  wallet: WalletState;
  connectWallet: (useFreighter?: boolean) => Promise<void>;
  disconnectWallet: () => void;
  formatAddress: (addr: string | null) => string;
}

export const Header: React.FC<HeaderProps> = ({ 
  wallet, 
  connectWallet, 
  disconnectWallet, 
  formatAddress 
}) => {
  return (
    <header className="navbar">
      <div className="nav-brand">
        <Vote size={32} style={{ color: 'var(--accent-primary)' }} />
        <span>SorobanVote</span>
      </div>

      <div className="nav-actions">
        <ThemeToggle />
        
        {wallet.isConnected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className={`wallet-status ${wallet.isMock ? 'mock' : ''}`} id="wallet-status-display">
              <span className="status-dot"></span>
              <span>{formatAddress(wallet.address)} ({wallet.isMock ? 'Mock' : 'Live'})</span>
            </div>
            
            <button 
              id="disconnect-wallet-btn"
              onClick={disconnectWallet} 
              className="btn-icon" 
              title="Disconnect Wallet"
              aria-label="Disconnect Wallet"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              id="connect-mock-wallet-btn"
              onClick={() => connectWallet(false)} 
              className="btn btn-secondary"
            >
              <Wallet size={16} />
              <span>Simulate Wallet</span>
            </button>
            <button 
              id="connect-freighter-wallet-btn"
              onClick={() => connectWallet(true)} 
              className="btn btn-primary"
            >
              <span>Freighter</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
