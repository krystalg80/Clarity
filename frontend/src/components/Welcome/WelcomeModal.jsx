import React from 'react';
import './WelcomeModal.css';

const features = [
  '🧘‍♀️ Log meditation sessions',
  '💧 Track your daily water intake',
  '💪 Log workouts and exercise',
  '📝 Write notes and wellness diary entries',
  '🤖 Get AI-powered recommendations',
  '⭐ Earn points and redeem rewards',
  '📊 View your daily progress on the Dashboard',
];

const premiumFeatures = [
  '📈 Advanced analytics & insights',
  '🧠 Personalized AI Coach',
  '🎵 Premium soundscapes',
  '🏆 Exclusive challenges & badges',
  '🔔 Smart reminders',
];

export default function WelcomeModal({ onClose }) {
  return (
    <div className="welcome-modal-overlay">
      <div className="welcome-modal">
        <h2>Welcome to Clarity!</h2>
        <p className="welcome-intro">Your mind & wellness tracker</p>
        <div className="modal-section">
          <h3>✨ What you can do:</h3>
          <ul className="feature-list">
            {features.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </div>
        <div className="modal-section premium">
          <h3>💎 Premium Features</h3>
          <ul className="feature-list premium">
            {premiumFeatures.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </div>
        <div className="modal-section help">
          <p>❓ Have a question? Click the <b>question mark (?)</b> in the app to get help any time!</p>
        </div>
        <button className="welcome-modal-btn" onClick={onClose}>Got it! Let’s get started</button>
      </div>
    </div>
  );
} 