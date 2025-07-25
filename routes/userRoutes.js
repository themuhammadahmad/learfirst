const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SK);
const User = require("../models/User");

// ========== Utility Functions ==========

function validateFields(fields) {
  return fields.every(field => field && field.trim() !== "");
}

function generateTokenResponse(user) {
  const token = jwt.sign(
    { id: user._id, isPaid: true },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      isPaid: true,
      hiddenCodes: user.hiddenCodes,
    },
  };
}

async function createCustomer(email) {
  const existing = await stripe.customers.list({ email, limit: 1 });
  return existing.data.length ? existing.data[0] : await stripe.customers.create({ email });
}

async function createCheckoutSession(customerId, priceId) {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: "https://learfirst.vercel.app/success",
      cancel_url: "https://learfirst.vercel.app/cancel",
    });

    return { success: true, url: session.url };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

async function handleStripeSubscriptionFlow(email, priceId) {
  const customer = await createCustomer(email);
  const subscriptions = await stripe.subscriptions.list({
    customer: customer.id,
    status: "active",
    limit: 1,
  });

  if (!subscriptions.data.length) {
    const session = await createCheckoutSession(customer.id, priceId);
    if (!session.success) {
      return { error: session.message };
    }
    return { redirectUrl: session.url };
  }

  return { isPaid: true, customer };
}

// ========== Routes ==========

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!validateFields([name, email, password])) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const newUser = await User.create({ name, email, password });
    const customer = await createCustomer(newUser.email);
    const session = await createCheckoutSession(customer.id, process.env.STRIPE_PRICE_ID);

    if (!session.success) {
      return res.status(500).json({ success: false, error: session.message });
    }

    return res.status(200).json({ url: session.url, action: "redirect" });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!validateFields([email, password])) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const subscriptionCheck = await handleStripeSubscriptionFlow(user.email, process.env.STRIPE_PRICE_ID);

    if (subscriptionCheck.error) {
      return res.status(500).json({ success: false, error: subscriptionCheck.error });
    }

    if (subscriptionCheck.redirectUrl) {
      return res.status(200).json({ url: subscriptionCheck.redirectUrl, action: "redirect" });
    }

    const tokenData = generateTokenResponse(user);
    return res.status(200).json(tokenData);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// router.get("/try", async (req, res) => {
//   const { email, priceId } = req.query;

//   try {
//     const customer = await createCustomer(email);
//     const session = await createCheckoutSession(customer.id, priceId);

//     if (!session.success) {
//       return res.status(500).json({ success: false, error: session.message });
//     }

//     return res.json({ checkoutSession: session, success: true });

//   } catch (error) {
//     return res.status(500).json({ error: "An error occurred while creating session" });
//   }
// });

module.exports = router;









// const User = require("../models/User");
// const router = require("express").Router();
// const jwt = require("jsonwebtoken");
// const Stripe = require("stripe");
// const stripe = Stripe(process.env.STRIPE_SK);
// const bcrypt = require("bcryptjs");

// router.post("/register", async (req, res) => {
//   let { name, email, password } = req.body;
//   if (!name || !email || !password) {
//     return res.status(400).json({ error: "All fields are required" });
//   }
  
//   try {
//     let alreadyExit = await User.findOne({ email });
//     if(alreadyExit){
//       return res.status(400).json({ error: "User already exist" });
//     }else{
//         let user = await User.create({ name, email, password });
//         let customer = await createCustomer(user.email);
//         const checkoutSession = await createCheckoutSession(
//           customer.id,
//           process.env.STRIPE_PRICE_ID
//         );
//         // console.log(checkoutSession);
//         if (!checkoutSession.success) {
//           return res
//             .status(500)
//             .json({ success: false, error: checkoutSession.message });
//         } else {
//           return res
//             .status(200)
//             .json({ url: checkoutSession.url, action: "redirect" });
//         }
//     }
//   } catch (error) {
//    return res.status(500).json({ error: error.message }); 
//   }
  
// });

// router.post("/login", async (req, res) => {
//   const { email, password } = req.body;
//   if (!email || !password) {
//     return res.status(400).json({ error: "All fields are required" });
//   }

//   try {
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(401).json({ error: "User not found" });
//     }

//     const isMatch = await user.comparePassword(password);
//     if (!isMatch) {
//       return res.status(401).json({ error: "Invalid credentials" });
//     }

//     const customer = await createCustomer(user.email);
//     const subscriptionList = await stripe.subscriptions.list({
//       customer: customer.id,
//       status: "active",
//       limit: 1,
//     });
//     if (!subscriptionList.data.length > 0) {
//       const checkoutSession = await createCheckoutSession(
//         customer.id,
//         process.env.STRIPE_PRICE_ID
//       );
//       // console.log(checkoutSession);
//       if (!checkoutSession.success) {
//         return res
//           .status(500)
//           .json({ success: false, error: checkoutSession.message });
//       } else {
//         return res
//           .status(200)
//           .json({ url: checkoutSession.url, action: "redirect" });
//       }
//     }
//     // console.log("user is paid", user);
//     // Generate JWT token
//     const token = jwt.sign(
//       { id: user._id, isPaid: true },
//       process.env.JWT_SECRET,
//       { expiresIn: "7d" }
//     );

//     // Return token and user data
//     res.status(200).json({
//       token,
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         isPaid: true,
//       },
//     });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

// router.get("/try", (req, res) => {
//   let { email, priceId } = req.params;
//   try {
//     let customer = createCustomer(email);
//     let checkoutSession = createCheckoutSession(customer.id, priceId);
//     res.json({ checkoutSession, success: true });
//   } catch (error) {
//     res.send("it did not work");
//   }
// });

// async function createCustomer(email) {
//   const customers = await stripe.customers.list({ email: email, limit: 1 });

//   let customer;
//   if (customers.data.length > 0) {
//     customer = customers.data[0];
//   } else {
//     customer = await stripe.customers.create({ email: email });
//   }

//   return customer;
// }

// async function createCheckoutSession(customerId, priceId) {
//   try {
//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ["card"],
//       mode: "subscription",
//       customer: customerId,
//       line_items: [
//         {
//           price: priceId,
//           quantity: 1,
//         },
//       ],
//       success_url: "https://learfirst.vercel.app/success",
//       cancel_url: "https://learfirst.vercel.app/cancel",
//     });

//     return {
//       success: true,
//       url: session.url,
//     };
//   } catch (error) {
//     // console.error("Error creating checkout session:", error);
//     return {
//       success: false,
//       message: error.message,
//     };
//   }
// }

// module.exports = router;
