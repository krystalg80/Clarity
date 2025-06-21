import { useState } from 'react';
import './SubscriptionSelect.css';

function SubscriptionSelect({ onSelect, selectedPlan, isSignup = false }) {
  const [hoveredPlan, setHoveredPlan] = useState(null);

  const plans = {
    free: {
      name: 'Free',
      price: '$0',
      period: 'forever',
      features: [
        '✓ Basic weekly goals',
        '✓ Standard progress tracking',
        '✓ Basic badges (Bronze, Silver, Gold)',
        '✓ Limited sharing',
        '✓ Basic analytics'
      ],
      buttonText: 'Start Free',
      popular: false
    },
    premium: {
      name: 'Premium',
      price: '$4.99',
      period: 'per month',
      features: [
        '✓ Custom goal setting',
        '✓ Exclusive Diamond badges',
        '✓ Meditation Pro Features',
        '✓ Animated achievements',
        '✓ Advanced analytics',
        '✓ Reward marketplace access',
        '✓ Challenge competitions',
        '✓ Priority support',
        '✓ Unlimited sharing'
      ],
      buttonText: 'Choose Premium',
      popular: true
    }
  };

  return (
    <div className="subscription-select">
      <div className="subscription-header">
        <h2>{isSignup ? 'Choose Your Plan' : 'Upgrade Your Experience'}</h2>
        <p>Start your wellness journey with the plan that fits you</p>
      </div>

      <div className="plans-grid">
        {Object.entries(plans).map(([planKey, plan]) => (
          <div 
            key={planKey}
            className={`plan-card ${selectedPlan === planKey ? 'selected' : ''} ${plan.popular ? 'popular' : ''}`}
            onMouseEnter={() => setHoveredPlan(planKey)}
            onMouseLeave={() => setHoveredPlan(null)}
            onClick={() => onSelect(planKey)}
          >
            {plan.popular && (
              <div className="popular-badge">
                <span>🌟 Most Popular</span>
              </div>
            )}
            
            <div className="plan-header">
              <h3 className="plan-name">{plan.name}</h3>
              <div className="plan-pricing">
                <span className="plan-price">{plan.price}</span>
                <span className="plan-period">{plan.period}</span>
              </div>
            </div>

            <div className="plan-features">
              {plan.features.map((feature, index) => (
                <div key={index} className="feature-item">
                  <span className="feature-text">{feature}</span>
                </div>
              ))}
            </div>

            <button 
              className={`plan-button ${selectedPlan === planKey ? 'selected' : ''}`}
              type="button"
            >
              {selectedPlan === planKey ? '✓ Selected' : plan.buttonText}
            </button>
          </div>
        ))}
      </div>

      {isSignup && (
        <div className="signup-note">
          <p>✨ You can always upgrade or downgrade later from your profile</p>
        </div>
      )}
    </div>
  );
}

export default SubscriptionSelect;