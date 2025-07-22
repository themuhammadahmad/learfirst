const express = require("express");
const router = express.Router();
const Quiz = require("../models/Quiz");

let codes = ["M4T8H2", "D7R1V9", "3N6L1SH", "G30GR4PH", "SC13NC3"];

// GET /api/quizzes/:code → Get 15 random quizzes for a code
router.get("/:code", async (req, res) => {
  const { code } = req.params;
  try {
    const quizzes = await Quiz.aggregate([
      { $match: { code } },              // Match specific quiz set
      { $sample: { size: 15 } }          // Randomly pick 15 and shuffle
    ]);
    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch quizzes" });
  }
});


// POST /api/quizzes → Add one or multiple quizzes
router.post("/", async (req, res) => {
  const quizzes = req.body;

  if (!Array.isArray(quizzes) || quizzes.length === 0) {
    return res
      .status(400)
      .json({ error: "Request body must be a non-empty array of quizzes." });
  }

  try {
    const created = await Quiz.insertMany(quizzes);
    res
      .status(201)
      .json({
        message: `${created.length} quizzes added successfully!`,
        quizzes: created,
      });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to insert quizzes." });
  }
});

module.exports = router;
