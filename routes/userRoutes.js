const User = require("../models/User");
const router = require("express").Router();
const jwt = require("jsonwebtoken");
const Stripe = require("stripe");
console.log(process.env.STRIPE_SK);
const stripe = Stripe(process.env.STRIPE_SK);
router.post("/register", async (req, res) => {
    const {name, email, password} = req.body;
    if(!name || !email || !password){
        return res.status(400).json({error: "All fields are required"});
    }

    try{
        const existingUser = await User.findOne({email});
        if(existingUser && !existingUser.isPaid){
             const customer = await createCustomer(user.email);
        const checkoutSession = await createCheckoutSession(customer.id , process.env.STRIPE_PRICE_ID);
        if(!checkoutSession.success){
            return res.status(500).json({ success: false , error: checkoutSession.message });
        }else{
            return res.state(200).json({url: checkoutSession.url, success: true});
        }
        }else if(existingUser && existingUser.isPaid){
            return res.status(400).json({error: "User already exists"});
        }
        const user = await User.create({name, email, password});
        if(!user){
            return res.status(500).json({error: "Failed to create user"});
        }
                     const customer = await createCustomer(user.email);
        const checkoutSession = await createCheckoutSession(customer.id , process.env.STRIPE_PRICE_ID);
        if(!checkoutSession.success){
            return res.status(500).json({ success: false , error: checkoutSession.message });
        }else{
            return res.state(200).json({url: checkoutSession.url, success: true});
        }
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

    if(!user.isPaid){
        const customer = await createCustomer(user.email);
        const checkoutSession = await createCheckoutSession(customer.id , process.env.STRIPE_PRICE_ID);
        if(!checkoutSession.success){
            return res.status(500).json({ success: false , error: checkoutSession.message });
        }else{
            return res.state(200).json({url: checkoutSession.url, success: true});
        }
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

async function createCustomer(email){
          const customers = await stripe.customers.list({ email: email, limit: 1 });

        let customer;
        if (customers.data.length > 0) {
            customer = customers.data[0];
        } else {
            customer = await stripe.customers.create({ email: email });
        }

        return customer;

}

async function createCheckoutSession(customerId, priceId) { 
    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            customer: customerId,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: process.env.SUCCESS_URL,
            cancel_url: process.env.CANCEL_URL,
        });

        return {
            success: true,
            url: session.url,
        };
    } catch (error) {
        console.error('Error creating checkout session:', error);
        return {
            success: false,
            message: error.message,
        };
    }
}


module.exports = router;