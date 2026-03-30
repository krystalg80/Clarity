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
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uid: user.uid }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ HTTP error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
    }

    const result = await response.json();
    
    const { url } = result;
    window.location.href = url;
  } catch (error) {
    console.error('❌ Error creating Stripe checkout session:', error);
    console.error('❌ Error details:', error.message);
    alert('Error creating checkout session. Please try again.');
  }
}