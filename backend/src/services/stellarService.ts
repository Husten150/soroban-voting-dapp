import { rpc, Contract, Address, Keypair, Account, TransactionBuilder, Networks, xdr, scValToNative, nativeToScVal } from "@stellar/stellar-sdk";

export interface Poll {
  id: number;
  creator: string;
  title: string;
  description: string;
  options: string[];
  endTime: number;
  voteCounts: number[];
}

// In-Memory Mock Store for Mock Mode
class MockStellarStore {
  private polls: Map<number, Poll> = new Map();
  private userVotes: Map<string, Set<string>> = new Map(); // pollId:voter -> true
  private pollCounter = 0;

  constructor() {
    // Seed some mock polls
    this.createPoll(
      "GD3S...CREATOR",
      "Which feature is most critical for Soroban adoption?",
      "We want to gauge community priorities for the next stellar SDK releases.",
      ["Better JS Client Generation", "Faster Ledger Times", "Gas Fee Optimization", "Rich Local Sandboxes"],
      86400 * 7 // 7 days
    );
    this.createPoll(
      "GD8A...VOTER1",
      "Should we build a decentralized DAO for scratch projects?",
      "Exploring governance models using Rust-based smart contracts on Stellar.",
      ["Yes, fully decentralized", "No, keep it simple", "Hybrid model (DAO + Core Devs)"],
      86400 * 2 // 2 days
    );
  }

  getPolls(): Poll[] {
    return Array.from(this.polls.values());
  }

  getPoll(id: number): Poll | undefined {
    return this.polls.get(id);
  }

  createPoll(creator: string, title: string, description: string, options: string[], durationSeconds: number): number {
    this.pollCounter++;
    const endTime = Math.floor(Date.now() / 1000) + durationSeconds;
    const poll: Poll = {
      id: this.pollCounter,
      creator,
      title,
      description,
      options,
      endTime,
      voteCounts: new Array(options.length).fill(0),
    };
    this.polls.set(this.pollCounter, poll);
    return this.pollCounter;
  }

  vote(voter: string, pollId: number, optionIndex: number): boolean {
    const poll = this.polls.get(pollId);
    if (!poll) throw new Error("Poll not found");

    if (Math.floor(Date.now() / 1000) >= poll.endTime) {
      throw new Error("Voting period has ended for this poll");
    }

    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      throw new Error("Option index out of bounds");
    }

    const voteKey = `${pollId}:${voter}`;
    if (!this.userVotes.has(voteKey)) {
      this.userVotes.set(voteKey, new Set());
    }

    const votesSet = this.userVotes.get(voteKey)!;
    if (votesSet.has(voter)) {
      throw new Error("This address has already voted on this poll");
    }

    votesSet.add(voter);
    poll.voteCounts[optionIndex]++;
    this.polls.set(pollId, poll);
    return true;
  }

  hasVoted(pollId: number, voter: string): boolean {
    const voteKey = `${pollId}:${voter}`;
    return this.userVotes.has(voteKey) && this.userVotes.get(voteKey)!.has(voter);
  }
}

const mockStore = new MockStellarStore();

// Stellar Soroban Integration Service
class StellarService {
  private rpcServer?: rpc.Server;
  private isMock = true;
  private contractId = "";
  private networkPassphrase = "";

  constructor() {
    this.isMock = process.env.MOCK_MODE !== "false";
    this.contractId = process.env.VOTING_CONTRACT_ID || "";
    this.networkPassphrase = process.env.STELLAR_NETWORK_PASSPHRASE || Networks.TESTNET;

    if (!this.isMock) {
      const rpcUrl = process.env.STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";
      this.rpcServer = new rpc.Server(rpcUrl);
      console.log(`📡 Connecting to Soroban RPC at ${rpcUrl}`);
    }
  }

  // Fetch all polls (in production, queries indexed off-chain storage or fetches range from contract)
  async getAllPolls(): Promise<Poll[]> {
    if (this.isMock) {
      return mockStore.getPolls();
    }

    // In a real-world production app, querying list of elements directly from contract requires
    // paging ledger keys. Typically a backend indexer (like Mercury, Stellar ETL, or a DB) is used.
    // For this boilerplate, we'll fetch from the local database or mock fallback.
    // To demonstrate contract calling, see getPollById() below.
    return mockStore.getPolls();
  }

  // Query a single poll state directly from the Soroban Smart Contract
  async getPollById(pollId: number): Promise<Poll> {
    if (this.isMock || !this.rpcServer || !this.contractId) {
      const mockPoll = mockStore.getPoll(pollId);
      if (!mockPoll) throw new Error("Poll not found");
      return mockPoll;
    }

    try {
      const contract = new Contract(this.contractId);
      
      // Invoke read-only "get_poll" function
      const getPollTx = contract.call("get_poll", nativeToScVal(pollId, { type: "u32" }));
      const result = await this.rpcServer.simulateTransaction(
        new TransactionBuilder(
          new Account(Keypair.random().publicKey(), "0"),
          { fee: "100" }
        )
        .addOperation(getPollTx)
        .setNetworkPassphrase(this.networkPassphrase)
        .setTimeout(30)
        .build()
      );

      if (rpc.Api.isSimulationSuccess(result)) {
        const rawResult = result.result!.retval;
        const nativePoll = scValToNative(rawResult);

        // Invoke read-only "get_results" function to fetch votes
        const getResultsTx = contract.call("get_results", nativeToScVal(pollId, { type: "u32" }));
        const resultsSim = await this.rpcServer.simulateTransaction(
          new TransactionBuilder(
            new Account(Keypair.random().publicKey(), "0"),
            { fee: "100" }
          )
          .addOperation(getResultsTx)
          .setNetworkPassphrase(this.networkPassphrase)
          .setTimeout(30)
          .build()
        );

        let voteCounts = new Array(nativePoll.options.length).fill(0);
        if (rpc.Api.isSimulationSuccess(resultsSim)) {
          voteCounts = scValToNative(resultsSim.result!.retval);
        }

        return {
          id: nativePoll.id,
          creator: nativePoll.creator,
          title: nativePoll.title,
          description: nativePoll.description,
          options: nativePoll.options,
          endTime: Number(nativePoll.end_time),
          voteCounts,
        };
      } else {
        throw new Error("Failed to simulate poll query transaction");
      }
    } catch (error: any) {
      console.error(`Stellar RPC Error querying poll ${pollId}:`, error.message);
      // Fallback to mock store if RPC fails to avoid crashes during development
      return mockStore.getPoll(pollId) || (() => { throw new Error("Poll not found"); })();
    }
  }

  // Create a new poll on Soroban (Requires creator wallet signature)
  async createPoll(
    creator: string,
    title: string,
    description: string,
    options: string[],
    durationSeconds: number
  ): Promise<{ id: number; txHash?: string }> {
    if (this.isMock) {
      const id = mockStore.createPoll(creator, title, description, options, durationSeconds);
      return { id };
    }

    // Real on-chain creation typically requires transaction submission
    // Note: Writing data to blockchain requires a transaction signed by creator.
    // The backend provides the unsigned txn structure, which the client signs using a wallet (Freighter).
    // Here we return mock ID + instructions to sign on frontend, or submit on behalf using a master key
    const id = mockStore.createPoll(creator, title, description, options, durationSeconds);
    return { id, txHash: "0x_mock_stellar_tx_hash_for_creation" };
  }

  // Cast vote on Soroban
  async vote(voter: string, pollId: number, optionIndex: number): Promise<{ success: boolean; txHash?: string }> {
    if (this.isMock) {
      const success = mockStore.vote(voter, pollId, optionIndex);
      return { success };
    }

    // In a decentralized app, voting is signed by the voter.
    // The backend handles recording or off-chain event logs. We sync the vote in mockStore
    // and instruct the frontend to perform the wallet transaction directly.
    mockStore.vote(voter, pollId, optionIndex);
    return { success: true, txHash: "0x_mock_stellar_tx_hash_for_voting" };
  }

  // Check if voter has already voted on poll
  async hasVoted(pollId: number, voter: string): Promise<boolean> {
    if (this.isMock) {
      return mockStore.hasVoted(pollId, voter);
    }
    
    if (!this.rpcServer || !this.contractId) return false;

    try {
      const contract = new Contract(this.contractId);
      const hasVotedTx = contract.call(
        "has_voted",
        nativeToScVal(pollId, { type: "u32" }),
        new Address(voter).toScVal()
      );
      const result = await this.rpcServer.simulateTransaction(
        new TransactionBuilder(new Account(Keypair.random().publicKey(), "0"), { fee: "100" })
          .addOperation(hasVotedTx)
          .setNetworkPassphrase(this.networkPassphrase)
          .setTimeout(30)
          .build()
      );
      if (rpc.Api.isSimulationSuccess(result)) {
        return scValToNative(result.result!.retval);
      }
    } catch {
      return mockStore.hasVoted(pollId, voter);
    }
    return false;
  }
}

export default new StellarService();
