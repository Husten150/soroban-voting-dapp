import React, { useEffect, useState } from 'react';
import { LayoutDashboard, ListFilter, Award, Vote } from 'lucide-react';
import { Header } from './components/Header.js';
import { PollCard } from './components/PollCard.js';
import { PollForm } from './components/PollForm.js';
import { useSoroban } from './hooks/useSoroban.js';
import { fetchPolls, createPollApi, castVoteApi, Poll } from './services/backendApi.js';

const App: React.FC = () => {
  const { wallet, connectWallet, disconnectWallet, formatAddress } = useSoroban();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votedPollIds, setVotedPollIds] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);

  // Load polls from backend
  const loadPolls = async () => {
    try {
      const data = await fetchPolls();
      setPolls(data);
    } catch (err: any) {
      console.error('Failed to load polls:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolls();
  }, []);

  // Check which polls the user has already voted on (using local storage mock sync + backend checks)
  useEffect(() => {
    if (wallet.address) {
      const savedVotes = localStorage.getItem(`votes_voter_${wallet.address}`);
      if (savedVotes) {
        setVotedPollIds(JSON.parse(savedVotes));
      } else {
        setVotedPollIds({});
      }
    } else {
      setVotedPollIds({});
    }
  }, [wallet.address]);

  const handleVote = async (pollId: number, optionIndex: number) => {
    if (!wallet.address) return;
    try {
      await castVoteApi(pollId, {
        voter: wallet.address,
        optionIndex
      });

      // Update state locally
      const updatedVotes = { ...votedPollIds, [pollId]: true };
      setVotedPollIds(updatedVotes);
      localStorage.setItem(`votes_voter_${wallet.address}`, JSON.stringify(updatedVotes));

      // Reload polls to get latest counts
      await loadPolls();
    } catch (e: any) {
      alert(e.message || 'Failed to submit vote');
    }
  };

  const handleCreatePoll = async (params: { title: string; description: string; options: string[]; durationSeconds: number }) => {
    if (!wallet.address) return;
    try {
      await createPollApi({
        creator: wallet.address,
        ...params
      });
      // Reload polls to see the new one
      await loadPolls();
    } catch (e: any) {
      alert(e.message || 'Failed to create poll');
    }
  };

  // Compute metrics
  const activePollsCount = polls.filter(p => Math.floor(Date.now() / 1000) < p.endTime).length;
  const totalVotesCast = polls.reduce((acc, p) => acc + p.voteCounts.reduce((vAcc, v) => vAcc + v, 0), 0);

  return (
    <div className="app-container">
      <Header 
        wallet={wallet}
        connectWallet={connectWallet}
        disconnectWallet={disconnectWallet}
        formatAddress={formatAddress}
      />

      <main className="main-content">
        {/* Left Side: Metrics & Active Polls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Dashboard Metrics Panel */}
          <section className="glass-panel" style={{ padding: '1.5rem' }}>
            <h2 className="section-title" style={{ marginBottom: '1.25rem' }}>
              <LayoutDashboard size={20} style={{ color: 'var(--accent-primary)' }} />
              <span>Metrics Overview</span>
            </h2>
            <div className="metrics-row">
              <div className="metric-card">
                <div className="metric-val">{polls.length}</div>
                <div className="metric-label">Total Polls</div>
              </div>
              <div className="metric-card">
                <div className="metric-val">{activePollsCount}</div>
                <div className="metric-label">Active Polls</div>
              </div>
              <div className="metric-card">
                <div className="metric-val">{totalVotesCast}</div>
                <div className="metric-label">Total Votes</div>
              </div>
            </div>
            
            {/* Quick tips */}
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              💡 <strong>Developer Note:</strong> Currently running in <strong>Mock sandbox mode</strong>. Creating polls or submitting votes updates the in-memory state on the backend API instantly without requiring gas fee configuration.
            </p>
          </section>

          {/* Active Polls Section */}
          <section className="polls-section">
            <h2 className="section-title">
              <ListFilter size={20} style={{ color: 'var(--accent-primary)' }} />
              <span>Active Governance Polls</span>
            </h2>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <div className="loading-spinner" />
              </div>
            ) : polls.length === 0 ? (
              <div className="glass-panel empty-state">
                <Vote className="empty-icon" />
                <p>No active smart contract polls found. Connect your wallet to create one!</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {polls.map(poll => (
                  <PollCard 
                    key={poll.id}
                    poll={poll}
                    userAddress={wallet.address}
                    onVote={handleVote}
                    hasUserVoted={!!votedPollIds[poll.id]}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Side: Poll Design Form & Sandbox instructions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <PollForm 
            userAddress={wallet.address}
            onCreatePoll={handleCreatePoll}
          />

          {/* Setup Walkthrough Card */}
          <section className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={18} style={{ color: 'var(--accent-secondary)' }} />
              <span>Local Development Sandbox</span>
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '1rem' }}>
              You are running a pre-configured boilerplate scaffolding. To deploy to a live/local Soroban contract:
            </p>
            <ol style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>Install Rust, add wasm target, and install <code>stellar-cli</code></li>
              <li>Compile the contract in <code>/contracts</code> using cargo</li>
              <li>Run the local Stellar RPC node via docker-compose</li>
              <li>Deploy wasm file, paste the resulting Contract ID in <code>backend/.env</code>, and toggle <code>MOCK_MODE=false</code></li>
            </ol>
          </section>
        </div>
      </main>
    </div>
  );
};

export default App;
