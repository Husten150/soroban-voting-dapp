import { Request, Response } from "express";
import stellarService from "../services/stellarService.js";

// GET /api/polls
export const getPolls = async (req: Request, res: Response): Promise<void> => {
  try {
    const polls = await stellarService.getAllPolls();
    res.json({ success: true, data: polls });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/polls/:id
export const getPollById = async (req: Request, res: Response): Promise<void> => {
  try {
    const pollId = parseInt(req.params.id, 10);
    if (isNaN(pollId)) {
      res.status(400).json({ success: false, error: "Invalid poll ID" });
      return;
    }
    const poll = await stellarService.getPollById(pollId);
    res.json({ success: true, data: poll });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
};

// POST /api/polls
export const createPoll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { creator, title, description, options, durationSeconds } = req.body;

    if (!creator || !title || !description || !Array.isArray(options) || !durationSeconds) {
      res.status(400).json({ success: false, error: "Missing required parameters" });
      return;
    }

    if (options.length < 2) {
      res.status(400).json({ success: false, error: "At least two options are required" });
      return;
    }

    const result = await stellarService.createPoll(creator, title, description, options, parseInt(durationSeconds, 10));
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/polls/:id/vote
export const castVote = async (req: Request, res: Response): Promise<void> => {
  try {
    const pollId = parseInt(req.params.id, 10);
    const { voter, optionIndex } = req.body;

    if (isNaN(pollId)) {
      res.status(400).json({ success: false, error: "Invalid poll ID" });
      return;
    }

    if (!voter || optionIndex === undefined || optionIndex === null) {
      res.status(400).json({ success: false, error: "Voter address and optionIndex are required" });
      return;
    }

    const index = parseInt(optionIndex, 10);
    if (isNaN(index)) {
      res.status(400).json({ success: false, error: "Invalid option index" });
      return;
    }

    const result = await stellarService.vote(voter, pollId, index);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};
