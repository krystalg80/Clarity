import { getAuth } from "firebase/auth";

// Use the 2nd Gen function URL
const functionUrl = "https://createstripecheckoutsession-z5fchdkthq-uc.a.run.app";

export async function startStripeUpgrade() {
  const user = getAuth().currentUser;
  if (!user) {
    alert("You must be logged in to upgrade.");
    return;
  }

  try {
    console.log('🔧 Starting Stripe upgrade with direct HTTP call');
    console.log('👤 User ID:', user.uid);
    console.log('🌐 Function URL:', functionUrl);
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uid: user.uid }),
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', response.headers);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ HTTP error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Function call successful:', result);
    
    const { url } = result;
    console.log('🔗 Redirecting to Stripe checkout:', url);
    window.location.href = url;
  } catch (error) {
    console.error('❌ Error creating Stripe checkout session:', error);
    console.error('❌ Error details:', error.message);
    alert('Error creating checkout session. Please try again.');
  }
}