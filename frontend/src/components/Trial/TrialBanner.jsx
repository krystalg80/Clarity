import { useAuth } from '../../contexts/AuthContext';
import './TrialBanner.css';

function TrialBanner() {
  const { userSubscription, isTrialActive, trialDaysRemaining, upgradeToPremium } = useAuth();

  if (userSubscription === 'premium') return null;
  if (userSubscription === 'free') return null;
  if (!isTrialActive) return null;

  const isUrgent = trialDaysRemaining <= 3;
  const progressPercentage = ((14 - trialDaysRemaining) / 14) * 100;

  const getTrialMessage = () => {
    if (trialDaysRemaining === 1) return "Last day of premium!";
    if (trialDaysRemaining <= 3) return `Only ${trialDaysRemaining} days left!`;
    return `${trialDaysRemaining} days remaining`;
  };

  const getButtonText = () => {
    if (trialDaysRemaining === 1) return "Keep Premium - $4.99/mo";
    if (trialDaysRemaining <= 3) return "Don't Lose Premium!";
    return "Keep Premium - $4.99/mo";
  };

  return (
    <div className={`trial-banner ${isUrgent ? 'urgent' : ''}`}>
      <div className="trial-content">
        <div className="trial-info">
          <span className="trial-icon">
            {isUrgent ? '⏰' : '✨'}
          </span>
          <div className="trial-text">
            <h4>{isUrgent ? 'Premium Trial Ending!' : 'Premium Trial Active'}</h4>
            <p>{getTrialMessage()}</p>
          </div>
        </div>
        
        <button 
          onClick={upgradeToPremium}
          className="trial-upgrade-btn"
        >
          {getButtonText()}
        </button>
      </div>
      
      <div className="trial-progress">
        <div 
          className="trial-progress-bar"
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
    </div>
  );
}

export default TrialBanner;