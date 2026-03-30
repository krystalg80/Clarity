import React, { useState, useEffect, useRef } from 'react';
import './AnxietyMonsterTamer.css';

const MONSTERS = {
  worry_worm: {
    name: "Worry Worm",
    icon: "🐛",
    color: "#8B4513",
    size: "small",
    technique: "breathing",
    description: "Those nagging worries that won't go away",
    tamedMessage: "Worry Worm is now peaceful! 🌱"
  },
  panic_bear: {
    name: "Panic Bear",
    icon: "🐻",
    color: "#DC143C",
    size: "large", 
    technique: "progressive_relaxation",
    description: "Big scary feelings that make your heart race",
    tamedMessage: "Panic Bear is now your gentle guardian! 🧸"
  },
  overthink_octopus: {
    name: "Overthink Octopus",
    icon: "🐙",
    color: "#4B0082",
    size: "medium",
    technique: "mindfulness",
    description: "Eight arms of spiraling thoughts",
    tamedMessage: "Overthink Octopus is now zen and focused! 🧘‍♀️"
  },
  doom_dragon: {
    name: "Doom Dragon",
    icon: "🐉",
    color: "#8B0000",
    size: "boss",
    technique: "breathing",
    description: "The big bad of catastrophic thinking",
    tamedMessage: "Doom Dragon is now your wise protector! ✨"
  }
};

const TECHNIQUES = {
  breathing: {
    name: "Deep Breathing",
    icon: "💨",
    instructions: ["Breathe in for 4", "Hold for 4", "Breathe out for 6", "Repeat"],
    duration: 16000, // 4+4+6+2 seconds
    color: "#4CAF50"
  },
  progressive_relaxation: {
    name: "Progressive Relaxation", 
    icon: "🧘‍♀️",
    instructions: ["Tense your shoulders", "Hold for 3 seconds", "Release and relax", "Feel the tension melt away"],
    duration: 12000,
    color: "#2196F3"
  },
  mindfulness: {
    name: "Mindfulness Anchor",
    icon: "⚓",
    instructions: ["Notice 3 things you can see", "Notice 2 things you can hear", "Notice 1 thing you can feel", "You are present"],
    duration: 15000,
    color: "#FF9800"
  }
};

// LocalStorage keys
const STORAGE_KEYS = {
  TAMED_MONSTERS: 'anxiety_game_tamed_monsters',
  PLAYER_STATS: 'anxiety_game_player_stats'
};

function AnxietyMonsterTamer({ user, onUpdateStats }) {
  const [gameState, setGameState] = useState('menu'); // menu, encounter, technique, victory, sanctuary
  const [currentMonster, setCurrentMonster] = useState(null);
  const [tamedMonsters, setTamedMonsters] = useState([]);
  const [playerStats, setPlayerStats] = useState({
    level: 1,
    experience: 0,
    calmness: 100,
    monstersDefeated: 0,
    sanctuaryPoints: 0
  });
  const [techniqueProgress, setTechniqueProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isBreathing, setIsBreathing] = useState(false);
  const timerRef = useRef(null);

  // Load saved data from localStorage on component mount
  useEffect(() => {
    try {
      // Load tamed monster IDs and reconstruct monster objects
      const savedTamedMonsterIds = localStorage.getItem(STORAGE_KEYS.TAMED_MONSTERS);
      if (savedTamedMonsterIds) {
        const monsterIds = JSON.parse(savedTamedMonsterIds);
        const reconstructedMonsters = monsterIds.map(id => ({
          ...MONSTERS[id],
          id: id
        }));
        setTamedMonsters(reconstructedMonsters);
      }
      // Load player stats
      const savedPlayerStats = localStorage.getItem(STORAGE_KEYS.PLAYER_STATS);
      if (savedPlayerStats) {
        const parsed = JSON.parse(savedPlayerStats);
        setPlayerStats(parsed);
      }
    } catch (error) {
      console.error('Error loading game data from localStorage:', error);
    }
  }, []);

  // Generate random monster encounter
  const encounterMonster = () => {
    const monsterKeys = Object.keys(MONSTERS);
    const randomKey = monsterKeys[Math.floor(Math.random() * monsterKeys.length)];
    const monster = { ...MONSTERS[randomKey], id: randomKey };
    
    setCurrentMonster(monster);
    setGameState('encounter');
    
    // Decrease calmness based on monster size
    const calmnessDrop = monster.size === 'boss' ? 30 : monster.size === 'large' ? 20 : 10;
    setPlayerStats(prev => ({
      ...prev,
      calmness: Math.max(0, prev.calmness - calmnessDrop)
    }));
  };

  // Start taming technique
  const startTaming = () => {
    const technique = TECHNIQUES[currentMonster.technique] || TECHNIQUES.breathing;
    setGameState('technique');
    setTechniqueProgress(0);
    setCurrentStep(0);
    runTechniqueTimer(technique);
  };

  // Run technique timer with steps
  const runTechniqueTimer = (technique) => {
    const stepDuration = technique.duration / technique.instructions.length;
    let step = 0;
    
    const stepTimer = setInterval(() => {
      setCurrentStep(step);
      setTechniqueProgress(((step + 1) / technique.instructions.length) * 100);
      
      if (step === technique.instructions.length - 1) {
        clearInterval(stepTimer);
        setTimeout(() => {
          tamedMonster();
        }, stepDuration);
      } else {
        step++;
      }
    }, stepDuration);
    
    timerRef.current = stepTimer;
  };

  // Successfully tame monster
  const tamedMonster = () => {
    const expGained = currentMonster.size === 'boss' ? 100 : 
                     currentMonster.size === 'large' ? 50 : 25;
    const sanctuaryGained = currentMonster.size === 'boss' ? 20 : 10;
    
    setTamedMonsters(prev => [...prev, currentMonster]);
    setPlayerStats(prev => ({
      ...prev,
      experience: prev.experience + expGained,
      calmness: Math.min(100, prev.calmness + 30),
      monstersDefeated: prev.monstersDefeated + 1,
      sanctuaryPoints: prev.sanctuaryPoints + sanctuaryGained,
      level: Math.floor((prev.experience + expGained) / 100) + 1
    }));
    
    setGameState('victory');
    
    // Update user stats
    if (onUpdateStats) {
      onUpdateStats({
        anxietyGameScore: playerStats.monstersDefeated + 1,
        mindfulnessPoints: sanctuaryGained
      });
    }
  };

  // Breathing animation for breathing technique
  useEffect(() => {
    if (gameState === 'technique' && currentMonster?.technique === 'breathing') {
      const breatheTimer = setInterval(() => {
        setIsBreathing(prev => !prev);
      }, 2000);
      
      return () => clearInterval(breatheTimer);
    }
  }, [gameState, currentMonster]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Save tamed monsters to localStorage whenever they change
  useEffect(() => {
    try {
      // Store only the monster IDs to avoid serialization issues
      const monsterIds = tamedMonsters.map(monster => monster.id);
      localStorage.setItem(STORAGE_KEYS.TAMED_MONSTERS, JSON.stringify(monsterIds));
    } catch (error) {
      console.error('Error saving tamed monsters to localStorage:', error);
    }
  }, [tamedMonsters]);

  // Save player stats to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PLAYER_STATS, JSON.stringify(playerStats));
    } catch (error) {
      console.error('Error saving player stats to localStorage:', error);
    }
  }, [playerStats]);

  return (
    <div className="monster-tamer-game">
      {/* Game Menu */}
      {gameState === 'menu' && (
        <div className="game-menu">
          <div className="game-header">
            <h2>👾 Anxiety Monster Tamer</h2>
            <p>Use mindfulness to tame your anxiety monsters!</p>
          </div>
          
          <div className="player-stats">
            <div className="stat">
              <span className="stat-icon">⭐</span>
              <span>Level {playerStats.level}</span>
            </div>
            <div className="stat">
              <span className="stat-icon">🧘‍♀️</span>
              <span>Calmness: {playerStats.calmness}%</span>
            </div>
            <div className="stat">
              <span className="stat-icon">👾</span>
              <span>Tamed: {playerStats.monstersDefeated}</span>
            </div>
            <div className="stat">
              <span className="stat-icon">🏠</span>
              <span>Sanctuary: {playerStats.sanctuaryPoints}</span>
            </div>
          </div>
          
          <button 
            className="encounter-btn"
            onClick={encounterMonster}
            disabled={playerStats.calmness < 10}
          >
            {playerStats.calmness < 10 ? 'Rest First 😴' : 'Encounter Monster 👾'}
          </button>
          
          {playerStats.calmness < 10 && (
            <button 
              className="rest-btn"
              onClick={() => setPlayerStats(prev => ({
                ...prev,
                calmness: Math.min(100, prev.calmness + 50)
              }))}
              style={{
                background: 'linear-gradient(135deg, #FF9800 0%, #FF5722 100%)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '20px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                marginTop: '12px'
              }}
            >
              Rest & Recover 🧘‍♀️ (+50 Calmness)
            </button>
          )}
          
          <div className="tamed-collection">
            <h3>Your Tamed Monsters:</h3>
            <div className="tamed-grid">
              {tamedMonsters.length === 0 ? (
                <p className="no-tamed">No monsters tamed yet. Start your journey!</p>
              ) : (
                tamedMonsters.map((monster, index) => (
                  <div key={index} className="tamed-monster">
                    <span className="monster-icon">{monster.icon}</span>
                    <span className="monster-name">{monster.name}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Monster Encounter */}
      {gameState === 'encounter' && currentMonster && (
        <div className="monster-encounter">
          <div className="encounter-scene">
            <div className={`monster ${currentMonster.size} ${currentMonster.id}`}>
              <div className="monster-icon">{currentMonster.icon}</div>
              <div className="monster-shake"></div>
            </div>
            
            <div className="encounter-text">
              <h3>A wild {currentMonster.name} appears!</h3>
              <p>{currentMonster.description}</p>
              <p className="calmness-drop">Your calmness dropped! 😰</p>
            </div>
          </div>
          
          <div className="taming-options">
            <button className="tame-btn" onClick={startTaming}>
              <span className="technique-icon">
                {TECHNIQUES[currentMonster.technique]?.icon || '💨'}
              </span>
              Use {TECHNIQUES[currentMonster.technique]?.name || 'Deep Breathing'}
            </button>
            <button className="run-btn" onClick={() => setGameState('menu')}>
              Run Away 🏃‍♀️
            </button>
          </div>
        </div>
      )}

      {/* Taming Technique */}
      {gameState === 'technique' && currentMonster && (
        <div className="taming-technique">
          <div className="technique-header">
            <h3>Taming {currentMonster.name}</h3>
            <div className="anxiety-progress">
              <div 
                className="anxiety-progress-fill" 
                style={{ width: `${techniqueProgress}%` }}
              ></div>
            </div>
          </div>
          
          <div className={`technique-visual ${isBreathing ? 'breathing' : ''}`}>
            <div className="monster-calming">
              <span className="monster-icon">{currentMonster.icon}</span>
              <div className="calming-aura"></div>
            </div>
          </div>
          
          <div className="technique-instructions">
            {TECHNIQUES[currentMonster.technique]?.instructions.map((instruction, index) => (
              <div 
                key={index} 
                className={`instruction ${index === currentStep ? 'active' : index < currentStep ? 'completed' : ''}`}
              >
                {instruction}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Victory Screen */}
      {gameState === 'victory' && currentMonster && (
        <div className="victory-screen">
          <div className="victory-animation">
            <div className="tamed-monster">
              <span className="monster-icon happy">{currentMonster.icon}</span>
              <div className="sparkles">✨✨✨</div>
            </div>
          </div>
          
          <div className="victory-text">
            <h3>🎉 Monster Tamed!</h3>
            <p>{currentMonster.tamedMessage}</p>
            
            <div className="rewards">
              <div className="reward">+30 Calmness 🧘‍♀️</div>
              <div className="reward">+{currentMonster.size === 'boss' ? 100 : currentMonster.size === 'large' ? 50 : 25} Experience ⭐</div>
              <div className="reward">+{currentMonster.size === 'boss' ? 20 : 10} Sanctuary Points 🏠</div>
            </div>
          </div>
          
          <div className="victory-actions">
            <button className="continue-btn" onClick={() => setGameState('menu')}>
              Continue Journey ➡️
            </button>
            <button className="sanctuary-btn" onClick={() => setGameState('sanctuary')}>
              Visit Sanctuary 🏛️
            </button>
          </div>
        </div>
      )}

      {/* Sanctuary View */}
      {gameState === 'sanctuary' && (
        <div className="sanctuary-view">
          <div className="sanctuary-header">
            <h2>🏛️ Your Peaceful Sanctuary</h2>
            <p>A safe space built from your mindfulness journey</p>
            <button 
              className="back-to-menu-btn" 
              onClick={() => setGameState('menu')}
            >
              ← Back to Adventure
            </button>
          </div>
          
          <div className="sanctuary-stats">
            <div className="sanctuary-stat">
              <div className="stat-icon">🏠</div>
              <div className="stat-info">
                <span className="stat-number">{playerStats.sanctuaryPoints}</span>
                <span className="stat-label">Sanctuary Points</span>
              </div>
            </div>
            <div className="sanctuary-stat">
              <div className="stat-icon">👾</div>
              <div className="stat-info">
                <span className="stat-number">{tamedMonsters.length}</span>
                <span className="stat-label">Peaceful Companions</span>
              </div>
            </div>
            <div className="sanctuary-stat">
              <div className="stat-icon">🧘‍♀️</div>
              <div className="stat-info">
                <span className="stat-number">{playerStats.calmness}%</span>
                <span className="stat-label">Current Calmness</span>
              </div>
            </div>
          </div>
          
          {/* Sanctuary Garden */}
          <div className="sanctuary-garden">
            <h3>🌸 Mindfulness Garden</h3>
            <div className="garden-grid">
              {tamedMonsters.length === 0 ? (
                <div className="empty-garden">
                  <div className="empty-garden-icon">🌱</div>
                  <p>Your garden awaits your first peaceful companion...</p>
                  <small>Tame monsters to populate your sanctuary!</small>
                </div>
              ) : (
                tamedMonsters.map((monster, index) => (
                  <div key={index} className="garden-companion">
                    <div className="companion-spot">
                      <span className="companion-icon">{monster.icon}</span>
                      <div className="companion-aura"></div>
                      <div className="companion-name">{monster.name}</div>
                      <div className="companion-effect">
                        Radiating peace ✨
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {/* Empty spots for future companions */}
              {Array.from({ length: Math.max(0, 6 - tamedMonsters.length) }).map((_, index) => (
                <div key={`empty-${index}`} className="garden-companion empty">
                  <div className="companion-spot">
                    <span className="empty-spot">?</span>
                    <div className="spot-label">Awaiting Friend</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Sanctuary Upgrades */}
          <div className="sanctuary-upgrades">
            <h3>🏗️ Sanctuary Upgrades</h3>
            <div className="upgrades-grid">
              <div className={`upgrade-card ${playerStats.sanctuaryPoints >= 50 ? 'available' : 'locked'}`}>
                <div className="upgrade-icon">🌈</div>
                <div className="upgrade-info">
                  <h4>Rainbow Bridge</h4>
                  <p>Connects different areas of your sanctuary</p>
                  <span className="upgrade-cost">50 Points</span>
                </div>
                {playerStats.sanctuaryPoints >= 50 ? (
                  <button className="upgrade-btn">Build</button>
                ) : (
                  <div className="upgrade-locked">🔒</div>
                )}
              </div>
              
              <div className={`upgrade-card ${playerStats.sanctuaryPoints >= 100 ? 'available' : 'locked'}`}>
                <div className="upgrade-icon">⛲</div>
                <div className="upgrade-info">
                  <h4>Meditation Fountain</h4>
                  <p>Restores calmness over time</p>
                  <span className="upgrade-cost">100 Points</span>
                </div>
                {playerStats.sanctuaryPoints >= 100 ? (
                  <button className="upgrade-btn">Build</button>
                ) : (
                  <div className="upgrade-locked">🔒</div>
                )}
              </div>
              
              <div className={`upgrade-card ${playerStats.sanctuaryPoints >= 200 ? 'available' : 'locked'}`}>
                <div className="upgrade-icon">🏰</div>
                <div className="upgrade-info">
                  <h4>Wisdom Tower</h4>
                  <p>Unlock advanced meditation techniques</p>
                  <span className="upgrade-cost">200 Points</span>
                </div>
                {playerStats.sanctuaryPoints >= 200 ? (
                  <button className="upgrade-btn">Build</button>
                ) : (
                  <div className="upgrade-locked">🔒</div>
                )}
              </div>
            </div>
          </div>
          
          {/* Daily Affirmations */}
          <div className="daily-affirmations">
            <h3>💭 Daily Affirmation</h3>
            <div className="affirmation-card">
              <div className="affirmation-text">
                "I am creating a sanctuary of peace within myself, one mindful moment at a time."
              </div>
              <div className="affirmation-author">- Your Inner Wisdom</div>
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="sanctuary-actions">
            <button 
              className="meditation-btn"
              onClick={() => {
                // Restore some calmness
                setPlayerStats(prev => ({
                  ...prev,
                  calmness: Math.min(100, prev.calmness + 10)
                }));
              }}
            >
              🧘‍♀️ Meditate in Sanctuary (+10 Calmness)
            </button>
            
            <button 
              className="encounter-btn"
              onClick={() => {
                setGameState('menu');
                setTimeout(() => {
                  encounterMonster();
                }, 500);
              }}
            >
              👾 Ready for Another Adventure
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnxietyMonsterTamer;