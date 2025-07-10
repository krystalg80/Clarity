import { getAuth } from "firebase/auth";

const baseUrl = "https://createstripecheckoutsession-z5fchdkthq-uc.a.run.app";

export async function startStripeUpgrade() {
  const user = getAuth().currentUser;
  if (!user) {
    alert("You must be logged in to upgrade.");
    return;
  }
  const response = await fetch(`${baseUrl}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid: user.uid }),
  });
  const result = await response.json();
  window.location.href = result.url;
}