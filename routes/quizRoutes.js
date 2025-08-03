const express = require("express");
const router = express.Router();
const Quiz = require("../models/Quiz");
const Code = require("../models/Code");

let codes = ["M4T8H2", "D7R1V9", "3N6L1SH", "G30GR4PH", "SC13NC3"];

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

router.get("/:code", async (req, res) => {
  const { code } = req.params;
  try {
    const quizzes = await Quiz.aggregate([
      { $match: { code } },
      { $sample: { size: 15 } }
    ]);

    // Shuffle options for each quiz before sending
    const shuffledQuizzes = quizzes.map((quiz) => {
      return {
        ...quiz,
        options: shuffleArray([...quiz.options])
      };
    });

    res.json(shuffledQuizzes);
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

router.post("/upload", async (req, res) => {
  const { quizzes } = req.body;

  if (!Array.isArray(quizzes) || quizzes.length === 0) {
    return res.status(400).json({ error: "Invalid or empty data" });
  }
//  console.log(quizzes);
try {
  const codesToInsert = new Set();
  
  for (let quiz of quizzes) {
    const { code, question, options, correctAnswers, type, isPaid } = quiz;
    
      // Create quiz
      await Quiz.create({
        code,
        question,
        options,
        correctAnswers,
        type
      });

      codesToInsert.add(JSON.stringify({ code, isPaid }));
    }

    // Insert unique codes into Code model
    for (let codeObj of codesToInsert) {
      const { code, isPaid } = JSON.parse(codeObj);

      const existing = await Code.findOne({ code });
      if (!existing) {
        await Code.create({ code, isPaid });
      }
    }

    return res.status(201).json({ message: "Quizzes uploaded successfully" });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: "Server error during upload" });
  }
});



module.exports = router;
