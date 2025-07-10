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
    console.log('🔔 Webhook received!');
    console.log('📡 Method:', req.method);
    console.log('📡 URL:', req.url);
    console.log('📡 Headers:', req.headers);
    console.log('📡 Body length:', req.rawBody ? req.rawBody.length : 'No body');
    
    // Debug environment variables
    console.log('🔑 STRIPE_SECRET exists:', !!process.env.STRIPE_SECRET);
    console.log('🔑 STRIPE_SECRET starts with:', process.env.STRIPE_SECRET ? process.env.STRIPE_SECRET.substring(0, 10) + '...' : 'NOT SET');
    console.log('🔑 STRIPE_WEBHOOK_SECRET exists:', !!process.env.STRIPE_WEBHOOK_SECRET);
    console.log('🔑 STRIPE_WEBHOOK_SECRET starts with:', process.env.STRIPE_WEBHOOK_SECRET ? process.env.STRIPE_WEBHOOK_SECRET.substring(0, 10) + '...' : 'NOT SET');
    
    const stripe = require('stripe')(process.env.STRIPE_SECRET);

    const sig = req.headers['stripe-signature'];
    let event;

    // Temporarily disable signature verification for testing
    try {
      console.log('🔐 Attempting to verify webhook signature...');
      console.log('🔑 Webhook secret exists:', !!process.env.STRIPE_WEBHOOK_SECRET);
      console.log('🔑 Stripe signature header exists:', !!sig);
      
      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        console.log('⚠️ No webhook secret found, parsing event without verification');
        event = JSON.parse(req.rawBody.toString());
      } else {
        event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
      }
      
      console.log('✅ Event parsed successfully');
      console.log('📦 Event type:', event.type);
      console.log('📦 Event ID:', event.id);
    } catch (err) {
      console.error('❌ Error parsing webhook:', err.message);
      console.error('❌ Full error:', err);
      
      // For testing, try to parse the body directly
      try {
        console.log('🔄 Attempting to parse body directly...');
        event = JSON.parse(req.rawBody.toString());
        console.log('✅ Body parsed directly, event type:', event.type);
      } catch (parseErr) {
        console.error('❌ Failed to parse body directly:', parseErr);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    }

    if (event.type === 'checkout.session.completed') {
      console.log('💰 Processing checkout.session.completed event');
      const session = event.data.object;
      const uid = session.client_reference_id;
      
      console.log('👤 User ID from session:', uid);
      console.log('💳 Session ID:', session.id);
      console.log('💳 Subscription ID:', session.subscription);
      console.log('💳 Payment status:', session.payment_status);
      console.log('💳 Session status:', session.status);

      if (!uid) {
        console.error('❌ No user ID found in session');
        return res.status(400).json({ error: 'No user ID in session' });
      }

      try {
        console.log('📝 Attempting to update user document...');
        console.log('🗂️ Collection: users, Document: ', uid);
        
        await admin.firestore().collection('users').doc(uid).update({
          subscription: 'premium',
          subscriptionStatus: 'active',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          stripeSubscriptionId: session.subscription,
        });
        console.log('✅ User document updated successfully');
        console.log(`🎉 User ${uid} upgraded to premium!`);
      } catch (err) {
        console.error('❌ Error updating user to premium:', err);
        console.error('❌ Error code:', err.code);
        console.error('❌ Error message:', err.message);
        
        // If document doesn't exist, create it
        if (err.code === 'not-found') {
          console.log('📄 Document not found, creating new user document...');
          try {
            await admin.firestore().collection('users').doc(uid).set({
              subscription: 'premium',
              subscriptionStatus: 'active',
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              stripeSubscriptionId: session.subscription,
            });
            console.log('✅ New user document created successfully');
          } catch (createErr) {
            console.error('❌ Error creating user document:', createErr);
          }
        }
      }
    } else {
      console.log('📋 Event type not checkout.session.completed, ignoring:', event.type);
    }

    console.log('✅ Webhook processed successfully');
    res.json({ received: true });
  }
);