const { onRequest, onCall } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

admin.initializeApp();

exports.createStripeCheckoutSession = onCall(
  async (request) => {
    const stripe = require('stripe')(process.env.STRIPE_SECRET);

    const { uid } = request.data;
    
    if (!uid) {
      throw new Error('Missing uid');
    }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
        success_url: 'https://clarity-one-beryl.vercel.app/premium-success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://clarity-one-beryl.vercel.app/premium-cancel',
        client_reference_id: uid,
        allow_promotion_codes: true,
      });
      
      return { url: session.url };
    } catch (err) {
      throw new Error(err.message);
    }
  }
);

// Stripe webhook (raw body required)
exports.stripeWebhook = onRequest(
  { rawBody: true },
  async (req, res) => {
    const stripe = require('stripe')(process.env.STRIPE_SECRET);

    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed.', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const uid = session.client_reference_id;

      try {
        await admin.firestore().collection('users').doc(uid).update({
          subscription: 'premium',
          subscriptionStatus: 'active',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          stripeSubscriptionId: session.subscription,
        });
        console.log(`User ${uid} upgraded to premium.`);
      } catch (err) {
        console.error('Error updating user to premium:', err);
        // If document doesn't exist, create it
        if (err.code === 'not-found') {
          await admin.firestore().collection('users').doc(uid).set({
            subscription: 'premium',
            subscriptionStatus: 'active',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            stripeSubscriptionId: session.subscription,
          });
        }
      }
    }

    res.json({ received: true });
  }
);