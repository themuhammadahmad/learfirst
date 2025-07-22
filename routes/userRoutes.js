const User = require("../models/User");
const router = require("express").Router();
const jwt = require("jsonwebtoken");

router.post("/register", async (req, res) => {
    const {name, email, password} = req.body;
    if(!name || !email || !password){
        return res.status(400).json({error: "All fields are required"});
    }

    try{
        const user = await User.create({name, email, password});
        return res.status(201).json(user);
    }catch(err){
        return res.status(500).json({error: err.message});
    }
});


router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, isPaid: user.isPaid },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Return token and user data
    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isPaid: user.isPaid,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




module.exports = router;