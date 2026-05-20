import React, { useState } from 'react';
import { Plus, Trash2, FilePlus2 } from 'lucide-react';
import { CreatePollParams } from '../services/backendApi.js';

interface PollFormProps {
  userAddress: string | null;
  onCreatePoll: (params: Omit<CreatePollParams, 'creator'>) => Promise<void>;
}

export const PollForm: React.FC<PollFormProps> = ({ 
  userAddress, 
  onCreatePoll 
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [duration, setDuration] = useState('86400'); // Default: 24h
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddOption = () => {
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) return;
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAddress || isSubmitting) return;

    // Filter empty options
    const cleanOptions = options.filter(opt => opt.trim() !== '');
    if (cleanOptions.length < 2) {
      alert('You must provide at least 2 valid options.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreatePoll({
        title,
        description,
        options: cleanOptions,
        durationSeconds: parseInt(duration, 10),
      });

      // Reset form
      setTitle('');
      setDescription('');
      setOptions(['', '']);
      setDuration('86400');
    } catch (err: any) {
      alert(err.message || 'Failed to create poll');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-panel form-panel">
      <h2 className="form-title">
        <FilePlus2 size={24} style={{ color: 'var(--accent-primary)' }} />
        <span>Create New Poll</span>
      </h2>

      {userAddress ? (
        <form onSubmit={handleSubmit} id="create-poll-form">
          <div className="form-group">
            <label className="form-label" htmlFor="poll-title-input">Poll Title</label>
            <input
              type="text"
              id="poll-title-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Upgrade network parameters?"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="poll-desc-input">Description</label>
            <textarea
              id="poll-desc-input"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Provide background context for the voters..."
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Voting Options</label>
            {options.map((option, index) => (
              <div key={index} className="dynamic-option-row">
                <input
                  type="text"
                  value={option}
                  onChange={e => handleOptionChange(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="form-input"
                  required
                  id={`poll-form-option-${index}`}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(index)}
                    className="btn-icon"
                    style={{ border: '1px solid var(--border-color)', height: '42px', width: '42px' }}
                    title="Remove Option"
                    aria-label={`Remove Option ${index + 1}`}
                  >
                    <Trash2 size={16} style={{ color: '#ef4444' }} />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              id="add-choice-btn"
              onClick={handleAddOption}
              className="btn btn-secondary"
              style={{ width: '100%', marginTop: '0.5rem', borderStyle: 'dashed' }}
            >
              <Plus size={16} />
              <span>Add Option</span>
            </button>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="poll-duration-select">Poll Duration</label>
            <select
              id="poll-duration-select"
              value={duration}
              onChange={e => setDuration(e.target.value)}
              className="form-input"
            >
              <option value="600">10 Minutes (For Testing)</option>
              <option value="3600">1 Hour</option>
              <option value="86400">24 Hours</option>
              <option value="604800">7 Days</option>
            </select>
          </div>

          <button
            type="submit"
            id="submit-create-poll-btn"
            disabled={isSubmitting || !title || !description}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem' }}
          >
            {isSubmitting ? <div className="loading-spinner" /> : 'Launch Poll on Stellar'}
          </button>
        </form>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
          <p style={{ marginBottom: '1rem', fontStyle: 'italic' }}>
            🔒 Connect wallet to design and launch smart contract polls.
          </p>
        </div>
      )}
    </div>
  );
};
