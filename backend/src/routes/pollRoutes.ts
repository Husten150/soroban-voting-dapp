import { Router } from "express";
import { getPolls, getPollById, createPoll, castVote } from "../controllers/pollController";

const router = Router();

router.get("/", getPolls);
router.get("/:id", getPollById);
router.post("/", createPoll);
router.post("/:id/vote", castVote);

export default router;
