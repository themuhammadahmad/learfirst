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
app.get("/", (req, res) => {
   res.send("Hello World!"); 
})
app.use("/api/quizzes", quizRoutes);
app.use("/api/users", userRoutes);
app.use("/api/codes", codeRoutes);

const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SK);
const endpointSecret = process.env.WEBHOOK_SECRET;

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


