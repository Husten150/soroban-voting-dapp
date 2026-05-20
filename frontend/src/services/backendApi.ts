const API_BASE = 'http://localhost:5001/api';

export interface Poll {
  id: number;
  creator: string;
  title: string;
  description: string;
  options: string[];
  endTime: number;
  voteCounts: number[];
}

export const fetchPolls = async (): Promise<Poll[]> => {
  const res = await fetch(`${API_BASE}/polls`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch polls');
  return data.data;
};

export const fetchPollById = async (id: number): Promise<Poll> => {
  const res = await fetch(`${API_BASE}/polls/${id}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch poll details');
  return data.data;
};

export interface CreatePollParams {
  creator: string;
  title: string;
  description: string;
  options: string[];
  durationSeconds: number;
}

export const createPollApi = async (params: CreatePollParams): Promise<{ id: number; txHash?: string }> => {
  const res = await fetch(`${API_BASE}/polls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to create poll');
  return data.data;
};

export interface VoteParams {
  voter: string;
  optionIndex: number;
}

export const castVoteApi = async (pollId: number, params: VoteParams): Promise<{ success: boolean; txHash?: string }> => {
  const res = await fetch(`${API_BASE}/polls/${pollId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to cast vote');
  return data.data;
};
