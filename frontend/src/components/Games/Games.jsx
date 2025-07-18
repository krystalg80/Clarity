import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AnxietyMonsterTamer from '../Monster/AnxietyMonsterTamer';
import './Games.css';
import { authService } from '../../services/authService';

function Games() {
  const { user: firebaseUser } = useAuth();
  
  const [gameStats, setGameStats] = useState({
    anxietyGameScore: 0,
    mindfulnessPoints: 0,
    totalGamesPlayed: 0,
    currentStreak: 0
  });
  const [monsterChallengeClaimed, setMonsterChallengeClaimed] = useState(false);
  const [mindfulnessChallengeClaimed, setMindfulnessChallengeClaimed] = useState(false);
  const [userPoints, setUserPoints] = useState(0);

  // Fetch user points
  useEffect(() => {
    const fetchPoints = async () => {
      if (firebaseUser?.uid) {
        const points = await authService.getPoints(firebaseUser.uid);
        setUserPoints(points);
      }
    };
    fetchPoints();
  }, [firebaseUser]);

  // Check if challenges are already claimed for today
  useEffect(() => {
    const checkClaims = async () => {
      if (firebaseUser?.uid) {
        const monsterClaimed = await authService.isChallengeCompleted(firebaseUser.uid, 'monster_tamer_daily', 'daily');
        const mindfulnessClaimed = await authService.isChallengeCompleted(firebaseUser.uid, 'mindfulness_master_daily', 'daily');
        setMonsterChallengeClaimed(monsterClaimed);
        setMindfulnessChallengeClaimed(mindfulnessClaimed);
      }
    };
    checkClaims();
  }, [firebaseUser]);

  // Load game stats from localStorage on component mount and sync with actual data
  useEffect(() => {
    try {
      const savedStats = localStorage.getItem('clarity_game_stats');
      if (savedStats) {
        const parsedStats = JSON.parse(savedStats);
        setGameStats(parsedStats);
      }
      
      // Check if we need to reset today's monster count
      const today = new Date().toDateString();
      const lastMonsterReset = localStorage.getItem('anxiety_game_last_reset');
      
      if (lastMonsterReset !== today) {
        // Reset today's monster count
        localStorage.setItem('anxiety_game_today_monsters', '0');
        localStorage.setItem('anxiety_game_last_reset', today);
      }
      
      // Get today's monster count
      const todayMonsters = parseInt(localStorage.getItem('anxiety_game_today_monsters') || '0');
      
      setGameStats(prev => {
        const updatedStats = {
          ...prev,
          anxietyGameScore: todayMonsters
        };
        
        // Save the corrected stats
        localStorage.setItem('clarity_game_stats', JSON.stringify(updatedStats));
        
        return updatedStats;
      });
    } catch (error) {
      console.error('Error loading game stats:', error);
    }
  }, []);

  const handleUpdateStats = (stats) => {
    
    // Increment today's monster count
    const todayMonsters = parseInt(localStorage.getItem('anxiety_game_today_monsters') || '0') + 1;
    localStorage.setItem('anxiety_game_today_monsters', todayMonsters.toString());
    
    setGameStats(prev => {
      const updatedStats = {
        ...prev,
        anxietyGameScore: todayMonsters,
        mindfulnessPoints: prev.mindfulnessPoints + (stats.mindfulnessPoints || 0),
        totalGamesPlayed: prev.totalGamesPlayed + 1
      };
      
      // Save to localStorage
      try {
        localStorage.setItem('clarity_game_stats', JSON.stringify(updatedStats));
      } catch (error) {
        console.error('Error saving game stats:', error);
      }
      
      return updatedStats;
    });
    
  };

  // Debug function to manually refresh stats
  const refreshStats = () => {
    try {
      const todayMonsters = localStorage.getItem('anxiety_game_today_monsters');
      const playerStats = localStorage.getItem('anxiety_game_player_stats');
      
      const todayMonsterCount = parseInt(todayMonsters || '0');
      
      setGameStats(prev => ({
        ...prev,
        anxietyGameScore: todayMonsterCount
      }));
      
    } catch (error) {
      console.error('Error refreshing stats:', error);
    }
  };

  // Real challenge logic: check if user completed the challenge today
  const monsterTamerComplete = gameStats.anxietyGameScore >= 3;
  const mindfulnessMasterComplete = gameStats.mindfulnessPoints >= 100;

  // Claim handlers
  const handleClaimMonsterTamer = async () => {
    if (!firebaseUser?.uid || monsterChallengeClaimed || !monsterTamerComplete) return;
    await authService.addPoints(firebaseUser.uid, 50);
    await authService.completeChallenge(firebaseUser.uid, 'monster_tamer_daily', 'daily');
    setMonsterChallengeClaimed(true);
    // Update points display
    const points = await authService.getPoints(firebaseUser.uid);
    setUserPoints(points);
    alert('You claimed 50 points for Monster Tamer Challenge!');
  };

  const handleClaimMindfulnessMaster = async () => {
    if (!firebaseUser?.uid || mindfulnessChallengeClaimed || !mindfulnessMasterComplete) return;
    await authService.addPoints(firebaseUser.uid, 75);
    await authService.completeChallenge(firebaseUser.uid, 'mindfulness_master_daily', 'daily');
    setMindfulnessChallengeClaimed(true);
    // Update points display
    const points = await authService.getPoints(firebaseUser.uid);
    setUserPoints(points);
    alert('You claimed 75 points for Mindfulness Master Challenge!');
  };

  return (
    <div className="games-page">
      {/* Points Balance Display */}
      <div className="points-balance">
        <span role="img" aria-label="points">⭐</span> {userPoints} Points
      </div>
      {/* Games Header */}
      <div className="games-header">
        <h1 className="games-title">Mental Wellness Games</h1>
        <p className="games-subtitle">Play games to improve your mental health</p>
      </div>

      {/* Game Stats Display */}
      <div className="game-stats-section">
        <div className="stats-header">
          <h2 className="section-title">Your Gaming Stats</h2>
          <button 
            onClick={refreshStats}
            className="refresh-stats-btn"
            title="Refresh stats from game data"
          >
            🔄 Refresh
          </button>
        </div>
        <div className="game-stats-grid">
          <div className="game-stat-card">
            <div className="stat-icon">👾</div>
            <div className="stat-info">
              <span className="stat-number">{gameStats.anxietyGameScore}</span>
              <span className="stat-label">Monsters Tamed</span>
            </div>
          </div>
          <div className="game-stat-card">
            <div className="stat-icon">🧘‍♀️</div>
            <div className="stat-info">
              <span className="stat-number">{gameStats.mindfulnessPoints}</span>
              <span className="stat-label">Mindfulness Points</span>
            </div>
          </div>
          <div className="game-stat-card">
            <div className="stat-icon">🎮</div>
            <div className="stat-info">
              <span className="stat-number">{gameStats.totalGamesPlayed}</span>
              <span className="stat-label">Games Played</span>
            </div>
          </div>
          <div className="game-stat-card">
            <div className="stat-icon">🔥</div>
            <div className="stat-info">
              <span className="stat-number">{gameStats.currentStreak}</span>
              <span className="stat-label">Day Streak</span>
            </div>
          </div>
        </div>
      </div>

      {/* Available Games */}
      <div className="available-games">
        <h2 className="section-title">Available Games</h2>
        
        {/* Anxiety Monster Tamer Game */}
        <div className="game-section">
          <div className="game-header">
            <h3 className="game-title">🎮 Anxiety Monster Tamer</h3>
            <span className="game-status">Active</span>
          </div>
          <p className="game-description">
            Face your anxiety monsters and tame them through mindful interaction. 
            Each monster represents different anxiety triggers. Practice coping strategies while earning points!
          </p>
          
          <div className="game-container">
            <AnxietyMonsterTamer 
              user={firebaseUser} 
              onUpdateStats={handleUpdateStats}
            />
          </div>
        </div>

        
      {/* Daily Gaming Challenges */}
      <div className="daily-challenges">
        <h2 className="section-title">Daily Gaming Challenges</h2>
        
        <div className="challenge-card">
          <div className="challenge-icon">👾</div>
          <div className="challenge-content">
            <h3>Monster Tamer Challenge</h3>
            <p>Tame 3 anxiety monsters today</p>
            <div className="challenge-progress">
              <div className="daily-challenge-bar">
                <div className="daily-challenge-fill" style={{ 
                  width: `${Math.min((gameStats.anxietyGameScore / 3) * 100, 100)}%` 
                }}></div>
              </div>
              <span className="challenge-status">{gameStats.anxietyGameScore}/3 tamed today</span>
            </div>
          </div>
          <div className="challenge-reward">
            <span>+50 points</span>
            <button 
              className="claim-btn"
              onClick={handleClaimMonsterTamer}
              disabled={!monsterTamerComplete || monsterChallengeClaimed}
            >
              {monsterChallengeClaimed ? 'Claimed' : 'Claim'}
            </button>
          </div>
        </div>

        <div className="challenge-card">
          <div className="challenge-icon">🧘‍♀️</div>
          <div className="challenge-content">
            <h3>Mindfulness Master</h3>
            <p>Earn 100 mindfulness points</p>
            <div className="challenge-progress">
              <div className="daily-challenge-bar">
                <div className="daily-challenge-fill" style={{ 
                  width: `${Math.min((gameStats.mindfulnessPoints / 100) * 100, 100)}%` 
                }}></div>
              </div>
            </div>
          </div>
          <div className="challenge-reward">
            <span>+75 points</span>
            <button 
              className="claim-btn"
              onClick={handleClaimMindfulnessMaster}
              disabled={!mindfulnessMasterComplete || mindfulnessChallengeClaimed}
            >
              {mindfulnessChallengeClaimed ? 'Claimed' : 'Claim'}
            </button>
          </div>
        </div>
      </div>

      {/* Achievement Showcase */}
      <div className="game-achievements">
        <h2 className="section-title">Gaming Achievements</h2>
        
        <div className="achievements-grid">
          {gameStats.anxietyGameScore >= 1 && (
            <div className="achievement-card bronze">
              <div className="achievement-icon">🥉</div>
              <div className="achievement-info">
                <h4>FIRST VICTORY</h4>
                <p>Tamed your first monster</p>
              </div>
            </div>
          )}
          
          {gameStats.anxietyGameScore >= 5 && (
            <div className="achievement-card silver">
              <div className="achievement-icon">🥈</div>
              <div className="achievement-info">
                <h4>MONSTER HUNTER</h4>
                <p>Tamed 5 monsters</p>
              </div>
            </div>
          )}
          
          {gameStats.anxietyGameScore >= 10 && (
            <div className="achievement-card gold">
              <div className="achievement-icon">🥇</div>
              <div className="achievement-info">
                <h4>ANXIETY MASTER</h4>
                <p>Tamed 10 monsters</p>
              </div>
            </div>
          )}
          
          {gameStats.mindfulnessPoints >= 100 && (
            <div className="achievement-card gold">
              <div className="achievement-icon">🧘‍♀️</div>
              <div className="achievement-info">
                <h4>MINDFUL GURU</h4>
                <p>Earned 100+ mindfulness points</p>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Coming Soon Games */}
      <div className="coming-soon-games">
          <h3 className="section-title">More Games Coming Soon</h3>
          
          <div className="game-preview-grid">
            <div className="game-preview-card">
              <div className="game-preview-icon">🌱</div>
              <h4>Mindful Garden</h4>
              <p>Grow a virtual garden through daily meditation practice</p>
              <span className="coming-soon-badge">Coming Soon</span>
            </div>
            
            <div className="game-preview-card">
              <div className="game-preview-icon">🌊</div>
              <h4>Calm Waters</h4>
              <p>Navigate peaceful waters while practicing breathing exercises</p>
              <span className="coming-soon-badge">Coming Soon</span>
            </div>
            
            <div className="game-preview-card">
              <div className="game-preview-icon">🎯</div>
              <h4>Focus Quest</h4>
              <p>Complete challenges that improve concentration and focus</p>
              <span className="coming-soon-badge">Coming Soon</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Games;