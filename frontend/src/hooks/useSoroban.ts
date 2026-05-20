import { useState, useEffect } from 'react';

// Interfaces for Freighter wallet connection if available in the browser window
interface FreighterWindow {
  stellar?: {
    isFreighter?: boolean;
  };
}

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  isMock: boolean;
}

export const useSoroban = () => {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    isConnected: false,
    isMock: true,
  });

  // Load saved mock wallet state if any
  useEffect(() => {
    const savedAddress = localStorage.getItem('stellar_wallet_address');
    const isMockStr = localStorage.getItem('stellar_wallet_is_mock');
    
    if (savedAddress) {
      setWallet({
        address: savedAddress,
        isConnected: true,
        isMock: isMockStr !== 'false',
      });
    }
  }, []);

  // Connect wallet (supports simulated mock addresses out of the box)
  const connectWallet = async (useFreighter: boolean = false) => {
    try {
      if (useFreighter) {
        // Checking for Freighter extension
        const win = window as unknown as FreighterWindow;
        if (win.stellar?.isFreighter) {
          // Dynamic import fallback or direct check. In production, imports @stellar/freighter-api
          // Since it's not installed in package dependencies to keep quick setup, we can request details:
          alert('Freighter extension detected! In a real production setup, this trigger requests Freighter signatures. Connecting mock Freighter address for local sandbox testing.');
          const mockFreighterAddr = 'GCX2...FREIGHTER';
          localStorage.setItem('stellar_wallet_address', mockFreighterAddr);
          localStorage.setItem('stellar_wallet_is_mock', 'false');
          setWallet({
            address: mockFreighterAddr,
            isConnected: true,
            isMock: false,
          });
          return;
        } else {
          alert('Freighter wallet extension not detected. Reverting to Mock Sandbox Address.');
        }
      }

      // Generate a mock Stellar public key for simulation
      const randomId = Math.floor(1000 + Math.random() * 9000);
      const mockAddr = `GBMOCK...VOTER${randomId}`;
      localStorage.setItem('stellar_wallet_address', mockAddr);
      localStorage.setItem('stellar_wallet_is_mock', 'true');
      
      setWallet({
        address: mockAddr,
        isConnected: true,
        isMock: true,
      });
    } catch (e: any) {
      console.error('Wallet connection failed:', e.message);
    }
  };

  const disconnectWallet = () => {
    localStorage.removeItem('stellar_wallet_address');
    localStorage.removeItem('stellar_wallet_is_mock');
    setWallet({
      address: null,
      isConnected: false,
      isMock: true,
    });
  };

  // Utility to shorten long Stellar addresses
  const formatAddress = (addr: string | null): string => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return {
    wallet,
    connectWallet,
    disconnectWallet,
    formatAddress,
  };
};
