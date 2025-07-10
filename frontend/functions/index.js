const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

admin.initializeApp();

// Simple HTTP function for creating Stripe checkout sessions
exports.createStripeCheckoutSession = onRequest(
  async (req, res) => {
    const stripe = require('stripe')(process.env.STRIPE_SECRET);

    // Set CORS headers
    res.set('Access-Control-Allow-Origin', 'https://clarity-one-beryl.vercel.app');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Allow-Credentials', 'true');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    console.log('📞 HTTP function called with method:', req.method);
    console.log('📤 Request body:', req.body);

    let uid;
    try {
      uid = req.body.uid;
    } catch (e) {
      console.error('❌ Error parsing request body:', e);
      return res.status(400).json({ error: 'Invalid request body' });
    }
    
    if (!uid) {
      console.error('❌ Missing uid in request');
      return res.status(400).json({ error: 'Missing uid' });
    }

    console.log('👤 Processing request for user:', uid);

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
      
      console.log('✅ Stripe session created successfully');
      return res.json({ url: session.url });
    } catch (err) {
      console.error('❌ Stripe error:', err);
      return res.status(500).json({ error: err.message });
    }
  }
);

// HTTP endpoint for Stripe webhooks (must remain as onRequest)
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