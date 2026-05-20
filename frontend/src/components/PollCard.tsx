import React, { useState } from 'react';
import { Clock, User, Award, CheckCircle } from 'lucide-react';
import { Poll } from '../services/backendApi.js';

interface PollCardProps {
  poll: Poll;
  userAddress: string | null;
  onVote: (pollId: number, optionIndex: number) => Promise<void>;
  hasUserVoted: boolean;
}

export const PollCard: React.FC<PollCardProps> = ({ 
  poll, 
  userAddress, 
  onVote,
  hasUserVoted
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalVotes = poll.voteCounts.reduce((acc, curr) => acc + curr, 0);
  const isExpired = Math.floor(Date.now() / 1000) >= poll.endTime;
  const showResults = hasUserVoted || isExpired;

  // Format time remaining
  const getTimeRemaining = () => {
    if (isExpired) return 'Ended';
    const secondsLeft = poll.endTime - Math.floor(Date.now() / 1000);
    const hours = Math.floor(secondsLeft / 3600);
    const minutes = Math.floor((secondsLeft % 3600) / 60);

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d remaining`;
    }
    return `${hours}h ${minutes}m remaining`;
  };

  const handleVoteSubmit = async () => {
    if (selectedOption === null || !userAddress) return;
    setIsSubmitting(true);
    try {
      await onVote(poll.id, selectedOption);
    } catch (e: any) {
      alert(e.message || 'Failed to submit vote');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <article className="glass-panel poll-card" id={`poll-card-${poll.id}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className={`poll-badge ${isExpired ? 'ended' : 'active'}`}>
          {isExpired ? 'Archived' : 'Active'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <Clock size={14} />
          <span>{getTimeRemaining()}</span>
        </div>
      </div>

      <h3 className="poll-title">{poll.title}</h3>
      <p className="poll-desc">{poll.description}</p>

      <div className="options-list">
        {poll.options.map((option, index) => {
          const votes = poll.voteCounts[index] || 0;
          const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
          const isSelected = selectedOption === index;

          return (
            <div
              key={index}
              onClick={() => !showResults && userAddress && setSelectedOption(index)}
              className={`option-row ${showResults ? 'voted-mode' : ''} ${isSelected ? 'selected' : ''}`}
              style={{ cursor: showResults || !userAddress ? 'default' : 'pointer' }}
              id={`poll-${poll.id}-option-${index}`}
            >
              {showResults && (
                <div 
                  className="option-bg" 
                  style={{ width: `${percent}%` }}
                />
              )}
              
              <span className="option-label">
                {option}
              </span>

              {showResults && (
                <div className="option-stats">
                  <span className="option-count">{votes} {votes === 1 ? 'vote' : 'votes'}</span>
                  <span className="option-percent">{percent}%</span>
                </div>
              )}

              {!showResults && userAddress && isSelected && (
                <CheckCircle size={18} style={{ color: 'var(--accent-primary)', position: 'relative', zIndex: 2 }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Button controls */}
      {!showResults && userAddress && (
        <button
          id={`cast-vote-btn-${poll.id}`}
          onClick={handleVoteSubmit}
          disabled={selectedOption === null || isSubmitting}
          className="btn btn-primary"
          style={{ width: '100%', marginBottom: '1rem' }}
        >
          {isSubmitting ? <div className="loading-spinner" /> : 'Submit Vote'}
        </button>
      )}

      {!userAddress && !isExpired && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '1rem', fontStyle: 'italic' }}>
          🔒 Please connect your wallet to vote.
        </p>
      )}

      <div className="poll-footer">
        <div className="poll-footer-meta">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <User size={12} />
            <span>Creator: {poll.creator.substring(0, 8)}...</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Award size={12} />
            <span>Total: {totalVotes} votes</span>
          </div>
        </div>
        <span>Poll #{poll.id}</span>
      </div>
    </article>
  );
};
