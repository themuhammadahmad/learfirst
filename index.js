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

const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SK);
const endpointSecret = process.env.WEBHOOK_SECRET;
app.post('/webhook', express.raw({ type: 'application/json' }), async (request, response) => {
    const sig = request.headers['stripe-signature'];

    let event;

    try {
        event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    } catch (err) {
        response.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    switch (event.type) {
        case "invoice.payment_failed": {
            const invoiceFailed = event.data.object;
            const customerId = invoiceFailed.customer;

            // Default metadata structure
            const defaultMetadata = {
                customerId: customerId,
                isSubscribed: 'false',
                activePlan: "free",
                subscriptionId: null,
            };

            // Update the customer's metadata to default values
            await stripe.customers.update(customerId, {
                metadata: defaultMetadata,
            });

            break;
        }
        case "invoice.payment_succeeded": {
            const invoiceSucceeded = event.data.object;
            const subscriptionId = invoiceSucceeded.subscription;
            const customerId = invoiceSucceeded.customer;

            // Retrieve the subscription to get the price ID
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const priceId = subscription.items.data[0].price.id;

            

            // Default metadata structure
            let updatedMetadata = {
                customerId,
                isSubscribed: 'true',
                activePlan: "free",
                subscriptionId: subscriptionId,
            };

            // Switch case based on the price ID
            switch (priceId) {
                case process.env.SIX_MONTH:
                    updatedMetadata = {
                        ...updatedMetadata,
                        activePlan: `6 Months`,
                    };
                    break;
                case process.env.YEARLY:
                    updatedMetadata = {
                        ...updatedMetadata,
                        activePlan: `Yearly`,
                    };
                    break;
                default:
                    // If the price ID does not match any of the known packages, do not change the metadata
                    break;
            }

            // Update the customer's metadata in Stripe
            await stripe.customers.update(customerId, {
                metadata: updatedMetadata,
            });

            break;
        }

        case "customer.subscription.deleted": {
            const subscription = event.data.object;
            const customerId = subscription.customer;

            // Default metadata structure
            const defaultMetadata = {
                customerId,
                isSubscribed: 'false',
                activePlan: "free",
                subscriptionId: null,
            };

            // Update the customer's metadata to default values
            await stripe.customers.update(customerId, {
                metadata: defaultMetadata,
            });

            break;
        }

        

        default: {
            // Return a 200 response to acknowledge receipt of the event
            response.status(200).send('Received');
        }
    }

    // Return a 200 response to acknowledge receipt of the event
    response.send();
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


