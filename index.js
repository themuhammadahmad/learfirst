const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const app = express();
const path = require("path");
const session = require('express-session');
const Admin = require("./models/Admin");
// (async () => {
//   await Admin.create({ username: "learnFirstAdmin", password: "q1w2e3r4@1q2w3e4r" });
// })()
// Middlewares
app.use(cors());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 10 * 60 * 1000  // 10 minutes in milliseconds
  }
}));

app.use(express.json());
app.get("/", requireAdmin , (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.use(express.static(path.join(__dirname, "public")));


// Routes
const quizRoutes = require("./routes/quizRoutes");
const userRoutes = require("./routes/userRoutes");
const codeRoutes = require("./routes/codeRoutes");

app.use("/api/quizzes", quizRoutes);
app.use("/api/users", userRoutes);
app.use("/api/codes", codeRoutes);

const User = require("./models/User");
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SK);
const endpointSecret = process.env.WEBHOOK_SECRET;

function requireAdmin(req, res, next) {
  if (req.session.user && req.session.user.isAdmin) {
    next();
  } else {
    res.redirect("/admin-login");
  }
}



app.get("/admin-login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-login.html"));
});
// login
app.post("/admin-login", express.urlencoded({ extended: true }), async (req, res) => {
  const { email, password } = req.body; // use "username" instead of email if you prefer
  const admin = await Admin.findOne({ username: email }); 

  if (!admin) {
    return res.status(401).send("Invalid credentials");
  }

  const isMatch = await admin.comparePassword(password);
  if (!isMatch) {
    return res.status(401).send("Invalid credentials");
  }

  // Save session
  req.session.user = { email: admin.username, isAdmin: true };
  return res.redirect("/");
});

app.get("/admin-logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).send("Failed to log out");
    }
    res.clearCookie("connect.sid"); // clear session cookie
    res.redirect("/admin-login");
  });
});



app.get("/success", (req, res) => {
  res.send("successfully paid");
})
app.get("/cancel", (req, res) => {
  res.send("successfully paid");
})

app.post('/webhook', express.raw({ type: 'application/json' }), async (request, response) => {
  const sig = request.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      const customerId = invoice.customer;

      // Get customer email
      const customer = await stripe.customers.retrieve(customerId);
      const email = customer.email;

      // Update MongoDB user
      await User.findOneAndUpdate({ email }, { isPaid: true });

      break;
    }

    case 'invoice.payment_failed':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      const customer = await stripe.customers.retrieve(customerId);
      const email = customer.email;

      await User.findOneAndUpdate({ email }, { isPaid: false });

      break;
    }

    default:
      break;
  }

  response.status(200).send('Webhook received');
});

app.all("/*", (req, res) => {
  res.status(404).send("Page not found");   
})

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


