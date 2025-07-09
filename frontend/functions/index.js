const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe')(functions.config().stripe.secret);

admin.initializeApp();

exports.createStripeCheckoutSession = functions.https.onCall(async (data, context) => {
  const { uid } = data;
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [{ price: functions.config().stripe.price_id, quantity: 1 }],
    success_url: 'https://yourapp.com/stripe-success?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'https://yourapp.com/stripe-cancel',
    client_reference_id: uid,
    allow_promotion_codes: true,
  });
  return { url: session.url };
});

exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, functions.config().stripe.webhook_secret);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const uid = session.client_reference_id;

    try {
      await admin.firestore().collection('users').doc(uid).set({
        subscription: 'premium',
        subscriptionStatus: 'active',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        stripeSubscriptionId: session.subscription,
      }, { merge: true });
      console.log(`User ${uid} upgraded to premium.`);
    } catch (err) {
      console.error('Error updating user to premium:', err);
    }
  }

  res.json({ received: true });
});