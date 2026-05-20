#![cfg(test)]

use super::{VotingContract, VotingContractClient, Poll};
use soroban_sdk::{testutils::{Address as _, Ledger}, Address, Env, String, Vec};

#[test]
fn test_create_and_vote() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VotingContract);
    let client = VotingContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let voter_1 = Address::generate(&env);
    let voter_2 = Address::generate(&env);

    let title = String::from_str(&env, "Best Smart Contract Platform");
    let description = String::from_str(&env, "Vote for the contract platform you prefer for WASM development.");
    
    let mut options = Vec::new(&env);
    options.push_back(String::from_str(&env, "Stellar Soroban"));
    options.push_back(String::from_str(&env, "Ethereum EVM"));
    options.push_back(String::from_str(&env, "Cosmos CosmWasm"));

    let duration_seconds = 3600; // 1 hour

    // 1. Create a Poll
    let poll_id = client.create_poll(
        &creator,
        &title,
        &description,
        &options,
        &duration_seconds,
    );

    assert_eq!(poll_id, 1);

    // Verify poll contents
    let poll: Poll = client.get_poll(&poll_id);
    assert_eq!(poll.id, 1);
    assert_eq!(poll.creator, creator);
    assert_eq!(poll.title, title);
    assert_eq!(poll.description, description);
    assert_eq!(poll.options.len(), 3);
    assert_eq!(poll.end_time, env.ledger().timestamp() + duration_seconds);

    // 2. Cast Votes
    assert_eq!(client.has_voted(&poll_id, &voter_1), false);
    client.vote(&voter_1, &poll_id, &0); // Voter 1 votes for Soroban (index 0)
    assert_eq!(client.has_voted(&poll_id, &voter_1), true);

    client.vote(&voter_2, &poll_id, &0); // Voter 2 votes for Soroban (index 0)

    // Check vote counts
    assert_eq!(client.get_vote_count(&poll_id, &0), 2);
    assert_eq!(client.get_vote_count(&poll_id, &1), 0);

    // Check overall results
    let results = client.get_results(&poll_id);
    assert_eq!(results.get(0).unwrap(), 2);
    assert_eq!(results.get(1).unwrap(), 0);
    assert_eq!(results.get(2).unwrap(), 0);
}

#[test]
#[should_panic(expected = "This address has already voted on this poll")]
fn test_double_voting_prevention() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VotingContract);
    let client = VotingContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let voter = Address::generate(&env);

    let title = String::from_str(&env, "Double Vote Test");
    let description = String::from_str(&env, "Testing that double voting panics");
    
    let mut options = Vec::new(&env);
    options.push_back(String::from_str(&env, "Option A"));
    options.push_back(String::from_str(&env, "Option B"));

    let poll_id = client.create_poll(&creator, &title, &description, &options, &600);

    client.vote(&voter, &poll_id, &0);
    client.vote(&voter, &poll_id, &1); // Should panic here
}

#[test]
#[should_panic(expected = "Voting period has ended for this poll")]
fn test_expired_voting_prevention() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, VotingContract);
    let client = VotingContractClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let voter = Address::generate(&env);

    let title = String::from_str(&env, "Expired Poll Test");
    let description = String::from_str(&env, "Testing that voting post-expiration fails");
    
    let mut options = Vec::new(&env);
    options.push_back(String::from_str(&env, "Option A"));
    options.push_back(String::from_str(&env, "Option B"));

    let duration = 600;
    let poll_id = client.create_poll(&creator, &title, &description, &options, &duration);

    // Advance time beyond duration
    let current_ledger_time = env.ledger().timestamp();
    env.ledger().set_timestamp(current_ledger_time + duration + 1);

    client.vote(&voter, &poll_id, &0); // Should panic here
}
