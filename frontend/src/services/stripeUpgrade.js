import { getAuth } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase/config";

export async function startStripeUpgrade() {
  const user = getAuth().currentUser;
  if (!user) {
    alert("You must be logged in to upgrade.");
    return;
  }

  try {
    console.log('🔧 Starting Stripe upgrade with Firebase Functions SDK');
    console.log('👤 User ID:', user.uid);
    
    const createStripeCheckoutSession = httpsCallable(functions, 'createStripeCheckoutSession');
    
    console.log('📞 Calling createStripeCheckoutSession function...');
    const result = await createStripeCheckoutSession({});
    
    console.log('✅ Function call successful:', result);
    const { url } = result.data;
    
    console.log('🔗 Redirecting to Stripe checkout:', url);
    window.location.href = url;
  } catch (error) {
    console.error('❌ Error creating Stripe checkout session:', error);
    console.error('❌ Error details:', error.message, error.code);
    alert('Error creating checkout session. Please try again.');
  }
}