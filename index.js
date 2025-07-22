const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
const quizRoutes = require("./routes/quizRoutes");
const userRoutes = require("./routes/userRoutes");
const codeRoutes = require("./routes/codeRoutes");
app.use("/api/quizzes", quizRoutes);
app.use("/api/users", userRoutes);
app.use("/api/codes", codeRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log("✅ Connected to MongoDB");
  app.listen(process.env.PORT, () => {
    console.log(`🚀 Server running on http://localhost:${process.env.PORT}`);
  });
})
.catch((err) => {
  console.error("❌ MongoDB connection error:", err);
});


