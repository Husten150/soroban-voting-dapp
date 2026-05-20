#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Poll {
    pub id: u32,
    pub creator: Address,
    pub title: String,
    pub description: String,
    pub options: Vec<String>,
    pub end_time: u64,
}

#[contracttype]
pub enum DataKey {
    PollCount,
    Poll(u32),
    Voted(u32, Address),
    VoteCount(u32, u32), // (poll_id, option_index) -> count
}

#[contract]
pub struct VotingContract;

#[contractimpl]
impl VotingContract {
    /// Create a new poll. Returns the new poll ID.
    pub fn create_poll(
        env: Env,
        creator: Address,
        title: String,
        description: String,
        options: Vec<String>,
        duration_seconds: u64,
    ) -> u32 {
        // Enforce signatures from the creator
        creator.require_auth();

        // Basic verification
        if options.len() < 2 {
            panic!("A poll must have at least 2 options");
        }

        // Get and increment poll count
        let mut poll_count: u32 = env.storage().instance().get(&DataKey::PollCount).unwrap_or(0);
        poll_count += 1;
        env.storage().instance().set(&DataKey::PollCount, &poll_count);

        let current_time = env.ledger().timestamp();
        let end_time = current_time + duration_seconds;

        let poll = Poll {
            id: poll_count,
            creator: creator.clone(),
            title,
            description,
            options,
            end_time,
        };

        // Save poll
        env.storage().persistent().set(&DataKey::Poll(poll_count), &poll);

        poll_count
    }

    /// Retrieve the details of a poll
    pub fn get_poll(env: Env, poll_id: u32) -> Poll {
        env.storage()
            .persistent()
            .get(&DataKey::Poll(poll_id))
            .unwrap_or_else(|| panic!("Poll not found"))
    }

    /// Cast a vote for a poll option
    pub fn vote(env: Env, voter: Address, poll_id: u32, option_index: u32) {
        // Enforce signature from the voter
        voter.require_auth();

        let poll: Poll = env
            .storage()
            .persistent()
            .get(&DataKey::Poll(poll_id))
            .unwrap_or_else(|| panic!("Poll not found"));

        let current_time = env.ledger().timestamp();
        if current_time >= poll.end_time {
            panic!("Voting period has ended for this poll");
        }

        if option_index >= poll.options.len() {
            panic!("Option index is out of bounds");
        }

        // Check if the user has already voted
        let voted_key = DataKey::Voted(poll_id, voter.clone());
        if env.storage().persistent().has(&voted_key) {
            panic!("This address has already voted on this poll");
        }

        // Mark voter as having voted
        env.storage().persistent().set(&voted_key, &true);

        // Record the vote
        let count_key = DataKey::VoteCount(poll_id, option_index);
        let current_votes: u32 = env.storage().persistent().get(&count_key).unwrap_or(0);
        env.storage().persistent().set(&count_key, &(current_votes + 1));
    }

    /// Retrieve vote count for a single option
    pub fn get_vote_count(env: Env, poll_id: u32, option_index: u32) -> u32 {
        let count_key = DataKey::VoteCount(poll_id, option_index);
        env.storage().persistent().get(&count_key).unwrap_or(0)
    }

    /// Check if a voter has already cast a vote
    pub fn has_voted(env: Env, poll_id: u32, voter: Address) -> bool {
        let voted_key = DataKey::Voted(poll_id, voter);
        env.storage().persistent().has(&voted_key)
    }

    /// Retrieve vote count for all options in a poll
    pub fn get_results(env: Env, poll_id: u32) -> Vec<u32> {
        let poll: Poll = env
            .storage()
            .persistent()
            .get(&DataKey::Poll(poll_id))
            .unwrap_or_else(|| panic!("Poll not found"));

        let mut results = Vec::new(&env);
        for i in 0..poll.options.len() {
            let votes = env
                .storage()
                .persistent()
                .get(&DataKey::VoteCount(poll_id, i))
                .unwrap_or(0);
            results.push_back(votes);
        }
        results
    }
}

#[cfg(test)]
mod test;
