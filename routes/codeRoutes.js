const Code = require("../models/Code");
const User = require("../models/User");
const router = require("express").Router();
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SK);


router.post("/", async (req, res) => {
  try {
    let { email } = req.body;

    // Define projection: include `code` and `active`, exclude `_id` if needed
    const projection = { code: 1, active: 1, _id: 0 };

    if (email) {
      let user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

          const customer = await createCustomer(user.email);
    const subscriptionList = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      limit: 1,
    });
    
      if (subscriptionList.data.length > 0) {
        let codes = await Code.find({}, projection);
        return res.status(200).json(codes);
      } else {
        let codes = await Code.find({ isPaid: false }, projection);
        return res.status(200).json(codes);
      }
    } else {
      let codes = await Code.find({ isPaid: false }, projection);
      return res.status(200).json(codes);
    }

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});


let codes = ["M4T8H2", "D7R1V9", "3N6L1SH", "G30GR4PH", "SC13NC3"];

async function createCustomer(email) {
  const customers = await stripe.customers.list({ email: email, limit: 1 });

  let customer;
  if (customers.data.length > 0) {
    customer = customers.data[0];
  } else {
    customer = await stripe.customers.create({ email: email });
  }

  return customer;
}
// codes.forEach(async (code, i) => {
//     try {
//         let newCode = await Code.create({code, isPaid: i >= 3 ? false : true});
//         console.log(newCode)
//     } catch (error) {
//         console.log(error);
//     }
// });

router.post("/create", async (req, res) => {
  let { code, isPaid } = req.body;
  try {
    let newCode = await Code.create({ code, isPaid });
    return res.status(201).json(newCode);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
