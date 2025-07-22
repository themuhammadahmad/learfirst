const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema({
  code: String,
  question: String,
  options: [String],
  correctAnswers: [Number], // Indexes of correct answers
  type: {
    type: String,
    enum: ["single", "multiple"],
    required: true
  }
});

module.exports = mongoose.model("Quiz", quizSchema);
