import { useAuth } from '../../contexts/AuthContext';
import './PremiumGate.css';
import { startStripeUpgrade } from '../../services/stripeUpgrade';

function PremiumGate({ 
  children, 
  fallback, 
  showUpgrade = true, 
  feature = "this feature",
  className = "" 
}) {
  const { isPremium, upgradeToPremium } = useAuth();

  if (isPremium) {
    return children;
  }

  if (fallback) {
    return fallback;
  }

  return (
    <div className={`premium-gate ${className}`}>
      <div className="premium-lock">
        <div className="lock-icon">🔒</div>
        <h3>Premium Feature</h3>
        <p>Upgrade to unlock {feature}</p>
        {showUpgrade && (
          <button 
            onClick={startStripeUpgrade}
            className="unlock-button"
          >
            Upgrade to Premium - $4.99/month
          </button>
        )}
      </div>
    </div>
  );
}

export default PremiumGate;