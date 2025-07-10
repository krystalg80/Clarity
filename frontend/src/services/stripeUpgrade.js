import { getAuth } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";

export async function startStripeUpgrade() {
  const user = getAuth().currentUser;
  if (!user) {
    alert("You must be logged in to upgrade.");
    return;
  }

  try {
    const functions = getFunctions();
    const createStripeCheckoutSession = httpsCallable(functions, 'createStripeCheckoutSession');
    
    const result = await createStripeCheckoutSession({ uid: user.uid });
    const { url } = result.data;
    
    window.location.href = url;
  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    alert('Error creating checkout session. Please try again.');
  }
}