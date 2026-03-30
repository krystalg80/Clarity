import { useState, useEffect, useRef, Fragment, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Alert, Animated, Pressable, Modal, useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../src/contexts/AuthContext';
import { authService } from '../../src/services/authService';
import colors from '../../src/theme/colors';

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  TAMED_MONSTERS: 'clarity_tamed_monsters',
  PLAYER_STATS:   'clarity_player_stats',
  GAME_STATS:     'clarity_game_stats',
  TODAY_MONSTERS: 'clarity_today_monsters',
  TODAY_BREATH:   'clarity_today_breath',
  TODAY_GROUNDING:'clarity_today_grounding',
  LAST_RESET:     'clarity_last_reset',
};

const BREATH_PATTERNS = {
  calm: {
    label: 'Calm Breath',
    description: 'Classic anxiety relief',
    phases: [
      { name: 'Inhale',  duration: 4, scale: 1.0, color: colors.waterBlue },
      { name: 'Hold',    duration: 4, scale: 1.0, color: colors.gold },
      { name: 'Exhale',  duration: 6, scale: 0.5, color: colors.primary },
      { name: 'Rest',    duration: 2, scale: 0.5, color: colors.sage300 },
    ],
  },
  box: {
    label: 'Box Breath',
    description: 'Steady focus & calm',
    phases: [
      { name: 'Inhale',  duration: 4, scale: 1.0, color: colors.waterBlue },
      { name: 'Hold',    duration: 4, scale: 1.0, color: colors.gold },
      { name: 'Exhale',  duration: 4, scale: 0.5, color: colors.primary },
      { name: 'Hold',    duration: 4, scale: 0.5, color: colors.sage300 },
    ],
  },
  sleep: {
    label: '4-7-8',
    description: 'Deep relaxation',
    phases: [
      { name: 'Inhale',  duration: 4, scale: 1.0, color: colors.waterBlue },
      { name: 'Hold',    duration: 7, scale: 1.0, color: colors.gold },
      { name: 'Exhale',  duration: 8, scale: 0.5, color: colors.primary },
    ],
  },
} as const;

type PatternKey = keyof typeof BREATH_PATTERNS;

const SENSES = [
  { sense: 'SEE',   icon: '👁️',  count: 5, bg: '#EAF4FB', accent: colors.waterBlue,        prompt: 'Look around you. Slowly identify 5 things you can see.' },
  { sense: 'TOUCH', icon: '✋',  count: 4, bg: '#EAF7EA', accent: colors.primary,           prompt: 'Focus on your body. Notice 4 things you can physically feel.' },
  { sense: 'HEAR',  icon: '👂',  count: 3, bg: '#F3EEF9', accent: colors.meditationPurple,  prompt: 'Be still and listen. Name 3 things you can hear right now.' },
  { sense: 'SMELL', icon: '👃',  count: 2, bg: '#FEF8EE', accent: colors.warning,           prompt: 'Take a slow breath in. Notice 2 things you can smell.' },
  { sense: 'TASTE', icon: '👅',  count: 1, bg: '#FEF0F0', accent: colors.error,             prompt: 'Be present in your body. Notice 1 thing you can taste.' },
];

// ─── Flappy Mind constants ────────────────────────────────────────────────────

const BIRD_R   = 14;
const BIRD_X   = 90;
const OBS_W    = 58;
const GRAV     = 0.20;
const LIFT     = -0.63;
const BASE_SPD = 1.6;
const WIN_SC   = 10;
const GAP_MAX  = 165;
const GAP_MIN  = 120;

const THOUGHTS_LIST = [
  "What if I fail?", "I'm not enough", "Nobody cares",
  "It's too much", "Can't cope", "What's the point?",
  "Will I mess up?", "Too overwhelmed", "I'm falling behind",
  "I'm a burden",
];
const AFFIRM_LIST = [
  "I am enough", "I can do this", "Breathe", "I am safe",
  "One step at a time", "I am worthy", "I choose peace",
  "I am strong", "Keep going", "I am here now",
];

type FMPhase = 'intro' | 'ready' | 'playing' | 'dead' | 'win';
interface FMObs { id: number; x: number; gapY: number; passed: boolean; thought: string; affirm: string; }

// ─── Breathing Circle (shared visual) ─────────────────────────────────────────

function BreathingCircle({
  scaleAnim, phaseColor, phaseName, countdown,
}: { scaleAnim: Animated.Value; phaseColor: string; phaseName: string; countdown: number }) {
  return (
    <View style={b.circleArea}>
      <View style={[b.outerRing, { borderColor: phaseColor + '35' }]} />
      <View style={[b.midRing,   { borderColor: phaseColor + '20' }]} />
      <Animated.View style={[b.breathCircle, { backgroundColor: phaseColor + '22', transform: [{ scale: scaleAnim }] }]}>
        <View style={[b.innerCircle, { backgroundColor: phaseColor + '55' }]}>
          <Text style={b.phaseName}>{phaseName.toUpperCase()}</Text>
          <Text style={[b.countdown, { color: phaseColor }]}>{countdown}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Breath Bubble Game ───────────────────────────────────────────────────────

function BreathBubbleGame({ onCycleComplete }: { onCycleComplete: () => void }) {
  const [patternKey, setPatternKey]   = useState<PatternKey>('calm');
  const [gameState, setGameState]     = useState<'idle' | 'running' | 'done'>('idle');
  const [phaseIdx, setPhaseIdx]       = useState(0);
  const [countdown, setCountdown]     = useState(4);
  const [cycles, setCycles]           = useState(0);

  const scaleAnim  = useRef(new Animated.Value(0.5)).current;
  const pulseAnim  = useRef(new Animated.Value(1.0)).current;
  const runningRef = useRef(false);
  const cyclesRef  = useRef(0);
  const patternRef = useRef(patternKey);
  const phaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cdInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseLoop  = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => { patternRef.current = patternKey; }, [patternKey]);

  useEffect(() => {
    if (gameState === 'idle') {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.94, duration: 2000, useNativeDriver: true }),
        ])
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }
    return () => pulseLoop.current?.stop();
  }, [gameState]);

  const clearTimers = () => {
    if (phaseTimer.current) clearTimeout(phaseTimer.current);
    if (cdInterval.current) clearInterval(cdInterval.current);
  };

  const runPhaseRef = useRef<(idx: number, c: number) => void>();
  runPhaseRef.current = (idx, c) => {
    if (!runningRef.current) return;
    const phases = BREATH_PATTERNS[patternRef.current].phases;
    const phase  = phases[idx];

    setPhaseIdx(idx);
    setCountdown(phase.duration);
    scaleAnim.stopAnimation();
    Animated.timing(scaleAnim, {
      toValue: phase.scale, duration: phase.duration * 1000, useNativeDriver: true,
    }).start();

    let rem = phase.duration - 1;
    if (cdInterval.current) clearInterval(cdInterval.current);
    cdInterval.current = setInterval(() => {
      if (rem >= 0) { setCountdown(rem--); } else { clearInterval(cdInterval.current!); }
    }, 1000);

    phaseTimer.current = setTimeout(() => {
      const next = (idx + 1) % phases.length;
      let newC = c;
      if (next === 0) {
        newC++;
        cyclesRef.current = newC;
        setCycles(newC);
        onCycleComplete();
      }
      runPhaseRef.current!(next, newC);
    }, phase.duration * 1000);
  };

  const start = () => {
    clearTimers();
    runningRef.current = true;
    cyclesRef.current  = 0;
    setCycles(0);
    scaleAnim.setValue(0.5);
    setGameState('running');
    runPhaseRef.current!(0, 0);
  };

  const stop = () => {
    clearTimers();
    runningRef.current = false;
    scaleAnim.stopAnimation();
    setGameState('done');
  };

  const reset = () => {
    setGameState('idle');
    setCycles(0);
    scaleAnim.setValue(0.5);
  };

  useEffect(() => () => { runningRef.current = false; clearTimers(); }, []);

  const pattern      = BREATH_PATTERNS[patternKey];
  const currentPhase = pattern.phases[phaseIdx];

  if (gameState === 'done') return (
    <View style={b.container}>
      <Text style={b.doneEmoji}>🌿</Text>
      <Text style={b.doneTitle}>Well done</Text>
      <Text style={b.doneSub}>
        {cyclesRef.current} {cyclesRef.current === 1 ? 'cycle' : 'cycles'} completed
      </Text>
      <Text style={b.doneDesc}>
        Each conscious breath signals safety to your nervous system. Your body remembers this.
      </Text>
      <TouchableOpacity style={b.btn} onPress={reset}>
        <Text style={b.btnText}>Breathe Again</Text>
      </TouchableOpacity>
    </View>
  );

  if (gameState === 'running') return (
    <View style={b.container}>
      <Text style={b.cycleCount}>{cycles} {cycles === 1 ? 'cycle' : 'cycles'} complete</Text>

      <BreathingCircle
        scaleAnim={scaleAnim}
        phaseColor={currentPhase.color}
        phaseName={currentPhase.name}
        countdown={countdown}
      />

      <View style={b.phaseDots}>
        {pattern.phases.map((p, i) => (
          <View
            key={i}
            style={[b.dot, i === phaseIdx && { backgroundColor: p.color, width: 20, borderRadius: 4 }]}
          />
        ))}
      </View>

      <Text style={b.patternLabel}>{pattern.label}</Text>

      <TouchableOpacity style={b.stopBtn} onPress={stop}>
        <Text style={b.stopBtnText}>Finish Session</Text>
      </TouchableOpacity>
    </View>
  );

  // idle
  return (
    <View style={b.container}>
      <Animated.View style={[b.breathCircle, b.idleCircle, { transform: [{ scale: pulseAnim }] }]}>
        <View style={[b.innerCircle, b.idleInner]}>
          <Text style={b.idleIcon}>💨</Text>
          <Text style={b.idleHint}>breathe</Text>
        </View>
      </Animated.View>

      <Text style={b.selectLabel}>Choose a pattern</Text>
      <View style={b.patternRow}>
        {(Object.keys(BREATH_PATTERNS) as PatternKey[]).map(key => (
          <TouchableOpacity
            key={key}
            style={[b.patternChip, patternKey === key && b.patternChipActive]}
            onPress={() => setPatternKey(key)}
          >
            <Text style={[b.patternChipLabel, patternKey === key && b.patternChipLabelActive]}>
              {BREATH_PATTERNS[key].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={b.phaseRow}>
        {BREATH_PATTERNS[patternKey].phases.map((p, i) => (
          <View key={i} style={b.phaseItem}>
            <View style={[b.phaseItemDot, { backgroundColor: p.color }]} />
            <Text style={b.phaseItemText}>{p.name} {p.duration}s</Text>
          </View>
        ))}
      </View>

      <Text style={b.patternDesc}>{BREATH_PATTERNS[patternKey].description}</Text>

      <TouchableOpacity style={b.btn} onPress={start}>
        <Text style={b.btnText}>Begin Breathing</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── 5-4-3-2-1 Grounding Game ─────────────────────────────────────────────────

function GroundingGame({ onComplete }: { onComplete: () => void }) {
  const [gameState, setGameState] = useState<'intro' | 'sensing' | 'done'>('intro');
  const [senseIdx, setSenseIdx]   = useState(0);
  const [checked, setChecked]     = useState<boolean[]>([]);
  const fadeAnim  = useRef(new Animated.Value(1)).current;

  const initSense = (idx: number) => {
    setSenseIdx(idx);
    setChecked(new Array(SENSES[idx].count).fill(false));
  };

  const start = () => { initSense(0); setGameState('sensing'); };

  const checkItem = (i: number) => {
    const next = [...checked];
    next[i] = true;
    setChecked(next);

    if (next.every(Boolean)) {
      setTimeout(() => {
        if (senseIdx + 1 < SENSES.length) {
          Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
            initSense(senseIdx + 1);
            Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
          });
        } else {
          onComplete();
          setGameState('done');
        }
      }, 500);
    }
  };

  if (gameState === 'intro') return (
    <View style={gr.container}>
      <Text style={gr.introIcon}>🌱</Text>
      <Text style={gr.introTitle}>5-4-3-2-1 Grounding</Text>
      <Text style={gr.introDesc}>
        When anxiety pulls you into your thoughts, this technique anchors you back to your body and surroundings — right here, right now.
      </Text>
      <View style={gr.previewRow}>
        {SENSES.map(s => (
          <View key={s.sense} style={[gr.senseChip, { backgroundColor: s.bg }]}>
            <Text style={gr.senseChipIcon}>{s.icon}</Text>
            <Text style={[gr.senseChipCount, { color: s.accent }]}>{s.count}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity style={gr.btn} onPress={start}>
        <Text style={gr.btnText}>Ground Me</Text>
      </TouchableOpacity>
    </View>
  );

  if (gameState === 'done') return (
    <View style={gr.container}>
      <Text style={gr.doneIcon}>✨</Text>
      <Text style={gr.doneTitle}>You are here.</Text>
      <Text style={gr.doneDesc}>
        You just brought yourself fully into the present moment. Anxiety lives in the future — you came back.
      </Text>
      <TouchableOpacity style={gr.btn} onPress={() => setGameState('intro')}>
        <Text style={gr.btnText}>Do It Again</Text>
      </TouchableOpacity>
    </View>
  );

  const sense    = SENSES[senseIdx];
  const progress = (senseIdx + checked.filter(Boolean).length / sense.count) / SENSES.length;

  return (
    <Animated.View style={[gr.container, { opacity: fadeAnim }]}>
      <View style={gr.progressTrack}>
        <Animated.View style={[gr.progressFill, { width: `${progress * 100}%` as any, backgroundColor: sense.accent }]} />
      </View>

      <Text style={gr.stepLabel}>Step {senseIdx + 1} of {SENSES.length}</Text>

      <View style={[gr.senseHeader, { backgroundColor: sense.bg }]}>
        <Text style={gr.senseIcon}>{sense.icon}</Text>
        <View>
          <Text style={[gr.senseName, { color: sense.accent }]}>
            {sense.count} thing{sense.count > 1 ? 's' : ''} you can {sense.sense.toLowerCase()}
          </Text>
          <Text style={gr.sensePrompt}>{sense.prompt}</Text>
        </View>
      </View>

      <View style={gr.itemsGrid}>
        {checked.map((done, i) => (
          <TouchableOpacity
            key={i}
            style={[gr.item, done && { backgroundColor: sense.accent, borderColor: sense.accent }]}
            onPress={() => !done && checkItem(i)}
            activeOpacity={done ? 1 : 0.65}
          >
            <Text style={[gr.itemText, done && { color: '#fff' }]}>
              {done ? '✓' : String(i + 1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={gr.tapHint}>Tap each circle once you've identified it</Text>
    </Animated.View>
  );
}

// ─── Flappy Mind Game ─────────────────────────────────────────────────────────

function FlappyMindGame({ onComplete, onClose }: { onComplete: () => void; onClose: () => void }) {
  const { width: winW, height: winH } = useWindowDimensions();
  const insets   = useSafeAreaInsets();
  const canvasW  = winW;
  const canvasH  = winH - insets.top - 52 - insets.bottom;
  const dimRef   = useRef({ w: canvasW, h: canvasH });
  dimRef.current = { w: canvasW, h: canvasH };

  const stars = useMemo(() =>
    Array.from({ length: 22 }, (_, i) => ({
      x: ((i * 53 + 7) % Math.max(1, canvasW - 6)) + 3,
      y: ((i * 37 + 11) % Math.max(1, canvasH - 6)) + 3,
      r: 1 + (i % 3 === 0 ? 2 : i % 2),
    })), [canvasW, canvasH]
  );

  const gv = useRef({
    birdY: 300, vel: 0,
    obs: [] as FMObs[], score: 0,
    held: false, phase: 'intro' as FMPhase,
    nextId: 0, spawnIn: 90,
  });
  const [phase, setPhase] = useState<FMPhase>('intro');
  const [, tick]  = useState(0);
  const loopRef   = useRef<ReturnType<typeof setInterval>>();
  const bobAnim   = useRef(new Animated.Value(0)).current;
  const bobRef    = useRef<Animated.CompositeAnimation | null>(null);

  const stopLoop = () => { if (loopRef.current) clearInterval(loopRef.current); };
  const stopBob  = () => { bobRef.current?.stop(); bobAnim.setValue(0); };
  useEffect(() => () => { stopLoop(); stopBob(); }, []);

  const goToReady = () => {
    stopLoop(); stopBob();
    const g = gv.current;
    g.birdY = dimRef.current.h / 2; g.vel = 0; g.obs = []; g.score = 0;
    g.held = false; g.nextId = 0; g.spawnIn = 90; g.phase = 'ready';
    setPhase('ready'); tick(n => n + 1);
    bobRef.current = Animated.loop(Animated.sequence([
      Animated.timing(bobAnim, { toValue: -10, duration: 700, useNativeDriver: true }),
      Animated.timing(bobAnim, { toValue: 10,  duration: 700, useNativeDriver: true }),
    ]));
    bobRef.current.start();
  };

  const startGame = (boost = false) => {
    stopBob(); stopLoop();
    const g = gv.current;
    g.birdY = dimRef.current.h / 2; g.vel = boost ? -3 : 0; g.obs = []; g.score = 0;
    g.held = boost; g.nextId = 0; g.spawnIn = 90; g.phase = 'playing';
    setPhase('playing');

    loopRef.current = setInterval(() => {
      const g = gv.current;
      const { w: cW, h: cH } = dimRef.current;
      if (g.phase !== 'playing') return;

      g.vel = Math.max(-9, Math.min(9, g.vel + GRAV + (g.held ? LIFT : 0)));
      g.birdY += g.vel;

      if (g.birdY - BIRD_R <= 0 || g.birdY + BIRD_R >= cH) {
        g.phase = 'dead'; setPhase('dead'); stopLoop(); tick(n => n + 1); return;
      }

      const speed = BASE_SPD + Math.floor(g.score / 3) * 0.18;
      const gapH  = Math.max(GAP_MIN, GAP_MAX - Math.floor(g.score / 4) * 7);

      for (const o of g.obs) o.x -= speed;
      g.obs = g.obs.filter(o => o.x > -OBS_W - 10);

      g.spawnIn--;
      if (g.spawnIn <= 0) {
        const margin = BIRD_R * 5;
        const gapY   = margin + Math.random() * (cH - margin * 2);
        g.obs.push({
          id: g.nextId++, x: cW + OBS_W, gapY, passed: false,
          thought: THOUGHTS_LIST[Math.floor(Math.random() * THOUGHTS_LIST.length)],
          affirm:  AFFIRM_LIST[Math.floor(Math.random() * AFFIRM_LIST.length)],
        });
        g.spawnIn = Math.round(220 / speed);
      }

      let died = false;
      for (const o of g.obs) {
        const gapTop = o.gapY - gapH / 2;
        const gapBot = o.gapY + gapH / 2;
        const inX    = BIRD_X + BIRD_R > o.x && BIRD_X - BIRD_R < o.x + OBS_W;
        if (inX && (g.birdY - BIRD_R < gapTop || g.birdY + BIRD_R > gapBot)) { died = true; break; }
        if (!o.passed && o.x + OBS_W < BIRD_X) { o.passed = true; g.score++; }
      }

      if (died) {
        g.phase = 'dead'; setPhase('dead'); stopLoop();
      } else if (g.score >= WIN_SC) {
        g.phase = 'win'; setPhase('win'); stopLoop(); onComplete();
      }

      tick(n => n + 1);
    }, 16);
  };

  const g    = gv.current;
  const gapH = Math.max(GAP_MIN, GAP_MAX - Math.floor(g.score / 4) * 7);

  return (
    <View style={fl.screen}>
      <View style={[fl.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={fl.backBtn}>← Back</Text>
        </TouchableOpacity>
        {(phase === 'playing' || phase === 'dead') && (
          <Text style={fl.hudScore}>{g.score} <Text style={fl.hudOf}>/ {WIN_SC}</Text></Text>
        )}
      </View>

      {phase === 'intro' && (
        <View style={fl.fullCenter}>
          <View style={fl.introOrb} />
          <Text style={fl.title}>Flappy Mind</Text>
          <Text style={fl.desc}>{'Hold to breathe upward.\nRelease to exhale and fall.\n\nNavigate through negative thoughts\nto reach the affirmations inside.'}</Text>
          <TouchableOpacity style={fl.btn} onPress={goToReady}><Text style={fl.btnText}>Begin Flying</Text></TouchableOpacity>
        </View>
      )}

      {phase === 'win' && (
        <View style={fl.fullCenter}>
          <View style={fl.winOrb} />
          <Text style={fl.title}>Mind Cleared</Text>
          <Text style={fl.winSub}>You passed through {WIN_SC} thought barriers</Text>
          <Text style={fl.desc}>{'Every obstacle was a thought you moved through.\nThe affirmations were always in the gaps —\nyou just had to keep breathing.'}</Text>
          <TouchableOpacity style={fl.btn} onPress={goToReady}><Text style={fl.btnText}>Fly Again</Text></TouchableOpacity>
        </View>
      )}

      {(phase === 'ready' || phase === 'playing' || phase === 'dead') && (
        <Pressable
          style={[fl.canvas, { width: canvasW, height: canvasH }]}
          onPressIn={() => {
            if (phase === 'ready') { startGame(true); return; }
            g.held = true;
            if (phase === 'dead') startGame(false);
          }}
          onPressOut={() => { g.held = false; }}
        >
          {stars.map((st, i) => (
            <View key={i} style={[fl.star, { left: st.x, top: st.y, width: st.r, height: st.r, borderRadius: st.r }]} />
          ))}

          {phase !== 'ready' && g.obs.map(obs => {
            const gapTop = obs.gapY - gapH / 2;
            const gapBot = obs.gapY + gapH / 2;
            return (
              <Fragment key={obs.id}>
                <View style={[fl.obsTop, { left: obs.x, height: Math.max(0, gapTop), width: OBS_W }]}>
                  <Text style={fl.obsText} numberOfLines={4}>{obs.thought}</Text>
                </View>
                <View style={[fl.obsBot, { left: obs.x, top: gapBot, height: Math.max(0, canvasH - gapBot), width: OBS_W }]}>
                  <Text style={fl.obsText} numberOfLines={4}>{obs.thought}</Text>
                </View>
                <Text style={[fl.gapText, { left: obs.x, top: obs.gapY - 10, width: OBS_W }]} numberOfLines={2}>{obs.affirm}</Text>
              </Fragment>
            );
          })}

          {phase === 'ready'
            ? <Animated.View style={[fl.bird, { top: g.birdY - BIRD_R, left: BIRD_X - BIRD_R, transform: [{ translateY: bobAnim }] }]} />
            : <View style={[fl.bird, { top: g.birdY - BIRD_R, left: BIRD_X - BIRD_R }]} />
          }

          {phase === 'ready' && (
            <View style={fl.readyOverlay}>
              <Text style={fl.readyTitle}>Tap anywhere to begin</Text>
              <Text style={fl.readyHint}>Hold to rise  ·  Release to fall</Text>
            </View>
          )}

          {phase === 'dead' && (
            <View style={fl.overlay}>
              <Text style={fl.overlayTitle}>Caught in a thought</Text>
              <Text style={fl.overlaySub}>Score: {g.score}  ·  Tap to try again</Text>
            </View>
          )}
        </Pressable>
      )}
    </View>
  );
}

// ─── Games Screen ─────────────────────────────────────────────────────────────

const GAME_CARDS = [
  {
    id: 'breath' as const,
    icon:  '💨',
    title: 'Breath Bubble',
    desc:  'Guided breathing exercises that calm your nervous system in minutes.',
    meta:  '3–10 min  ·  Deep Breathing',
    color: colors.waterBlue,
    bg:    '#EAF4FB',
  },
  {
    id: 'grounding' as const,
    icon:  '🌱',
    title: '5-4-3-2-1 Grounding',
    desc:  'Anchor yourself to the present moment and break the anxiety cycle.',
    meta:  '2–3 min  ·  Grounding',
    color: colors.primary,
    bg:    colors.primaryLight,
  },
  {
    id: 'flappy' as const,
    icon:  '🌌',
    title: 'Flappy Mind',
    desc:  'Fly through negative thoughts and breathe toward the affirmations inside.',
    meta:  '2–5 min  ·  Mindfulness',
    color: colors.meditationPurple,
    bg:    '#F3EEF9',
  },
] as const;

type GameId = typeof GAME_CARDS[number]['id'];

export default function GamesScreen() {
  const { user: firebaseUser } = useAuth();
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [userPoints, setUserPoints] = useState(0);

  const [todayBreath,    setTodayBreath]    = useState(0);
  const [todayGrounding, setTodayGrounding] = useState(0);
  const [todayMonsters,  setTodayMonsters]  = useState(0);

  const [breathClaimed,    setBreathClaimed]    = useState(false);
  const [groundingClaimed, setGroundingClaimed] = useState(false);
  const [monsterClaimed,   setMonsterClaimed]   = useState(false);

  const [totalGames, setTotalGames] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const today    = new Date().toDateString();
        const lastReset = await AsyncStorage.getItem(STORAGE_KEYS.LAST_RESET);
        if (lastReset !== today) {
          await Promise.all([
            AsyncStorage.setItem(STORAGE_KEYS.TODAY_MONSTERS,  '0'),
            AsyncStorage.setItem(STORAGE_KEYS.TODAY_BREATH,    '0'),
            AsyncStorage.setItem(STORAGE_KEYS.TODAY_GROUNDING, '0'),
            AsyncStorage.setItem(STORAGE_KEYS.LAST_RESET,      today),
          ]);
        }
        const [b, g, mo, gs] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.TODAY_BREATH),
          AsyncStorage.getItem(STORAGE_KEYS.TODAY_GROUNDING),
          AsyncStorage.getItem(STORAGE_KEYS.TODAY_MONSTERS),
          AsyncStorage.getItem(STORAGE_KEYS.GAME_STATS),
        ]);
        setTodayBreath(parseInt(b || '0'));
        setTodayGrounding(parseInt(g || '0'));
        setTodayMonsters(parseInt(mo || '0'));
        if (gs) setTotalGames(JSON.parse(gs).totalGamesPlayed || 0);

        if (firebaseUser?.uid) {
          const [pts, bc, gc, mc] = await Promise.all([
            authService.getPoints(firebaseUser.uid),
            authService.isChallengeCompleted(firebaseUser.uid, 'breath_daily', 'daily'),
            authService.isChallengeCompleted(firebaseUser.uid, 'grounding_daily', 'daily'),
            authService.isChallengeCompleted(firebaseUser.uid, 'monster_tamer_daily', 'daily'),
          ]);
          setUserPoints(pts);
          setBreathClaimed(bc);
          setGroundingClaimed(gc);
          setMonsterClaimed(mc);
        }
      } catch {}
      finally { setIsLoading(false); }
    };
    load();
  }, [firebaseUser?.uid]);

  const handleBreathCycle = async () => {
    const next = todayBreath + 1;
    setTodayBreath(next);
    await AsyncStorage.setItem(STORAGE_KEYS.TODAY_BREATH, String(next));
    const gs = await AsyncStorage.getItem(STORAGE_KEYS.GAME_STATS);
    const parsed = gs ? JSON.parse(gs) : {};
    parsed.totalGamesPlayed = (parsed.totalGamesPlayed || 0) + 1;
    setTotalGames(parsed.totalGamesPlayed);
    await AsyncStorage.setItem(STORAGE_KEYS.GAME_STATS, JSON.stringify(parsed));
  };

  const handleGroundingComplete = async () => {
    const next = todayGrounding + 1;
    setTodayGrounding(next);
    await AsyncStorage.setItem(STORAGE_KEYS.TODAY_GROUNDING, String(next));
    const gs = await AsyncStorage.getItem(STORAGE_KEYS.GAME_STATS);
    const parsed = gs ? JSON.parse(gs) : {};
    parsed.totalGamesPlayed = (parsed.totalGamesPlayed || 0) + 1;
    setTotalGames(parsed.totalGamesPlayed);
    await AsyncStorage.setItem(STORAGE_KEYS.GAME_STATS, JSON.stringify(parsed));
  };

  const handleMonsterUpdate = async (_stats: any) => {
    const next = todayMonsters + 1;
    setTodayMonsters(next);
    await AsyncStorage.setItem(STORAGE_KEYS.TODAY_MONSTERS, String(next));
    const gs = await AsyncStorage.getItem(STORAGE_KEYS.GAME_STATS);
    const parsed = gs ? JSON.parse(gs) : {};
    parsed.totalGamesPlayed = (parsed.totalGamesPlayed || 0) + 1;
    setTotalGames(parsed.totalGamesPlayed);
    await AsyncStorage.setItem(STORAGE_KEYS.GAME_STATS, JSON.stringify(parsed));
  };

  const claimChallenge = async (
    challengeId: string, points: number,
    isClaimed: boolean, count: number, target: number,
    setClaimed: (v: boolean) => void,
  ) => {
    if (!firebaseUser?.uid || isClaimed || count < target) return;
    await authService.addPoints(firebaseUser.uid, points);
    await authService.completeChallenge(firebaseUser.uid, challengeId, 'daily');
    setClaimed(true);
    const pts = await authService.getPoints(firebaseUser.uid);
    setUserPoints(pts);
    Alert.alert('Claimed!', `+${points} points added to your balance.`);
  };

  if (isLoading) return <View style={s.centered}><ActivityIndicator size="large" color={colors.primary} /></View>;

  const activeCard = activeGame ? GAME_CARDS.find(c => c.id === activeGame) : null;

  // ── Home View ──
  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.headerRow}>
        <View>
          <Text style={s.screenTitle}>Wellness Games</Text>
          <Text style={s.subtitle}>Practice breathing & grounding</Text>
        </View>
        <View style={s.pointsBadge}>
          <Text style={s.pointsText}>⭐ {userPoints}</Text>
        </View>
      </View>

      {/* Game Cards */}
      <View style={s.gameList}>
        {GAME_CARDS.map(card => (
          <View key={card.id} style={[s.card, s.gameSelectCard]}>
            <View style={[s.gameIconBox, { backgroundColor: card.bg }]}>
              <Text style={s.gameSelectIcon}>{card.icon}</Text>
            </View>
            <View style={s.gameSelectBody}>
              <Text style={s.gameSelectTitle}>{card.title}</Text>
              <Text style={s.gameSelectDesc}>{card.desc}</Text>
              <Text style={[s.gameSelectMeta, { color: card.color }]}>{card.meta}</Text>
            </View>
            <TouchableOpacity
              style={[s.playBtn, { backgroundColor: card.color }]}
              onPress={() => setActiveGame(card.id)}
            >
              <Text style={s.playBtnText}>Play</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Daily Challenges */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Daily Challenges</Text>
        {[
          { icon: '💨', title: 'Deep Breather',       desc: 'Complete 5 breathing cycles',     current: todayBreath,    target: 5,  pts: 40, claimed: breathClaimed,    setClaimed: setBreathClaimed,    id: 'breath_daily' },
          { icon: '🌱', title: 'Stay Grounded',        desc: 'Complete 1 grounding session',    current: todayGrounding, target: 1,  pts: 30, claimed: groundingClaimed,  setClaimed: setGroundingClaimed,  id: 'grounding_daily' },
          { icon: '🌌', title: 'Flappy Mind',            desc: 'Complete 3 Flappy Mind runs',     current: todayMonsters,  target: 3,  pts: 50, claimed: monsterClaimed,    setClaimed: setMonsterClaimed,    id: 'monster_tamer_daily' },
        ].map(ch => (
          <View key={ch.id} style={s.challengeRow}>
            <Text style={s.challengeIcon}>{ch.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.challengeTitle}>{ch.title}</Text>
              <Text style={s.challengeDesc}>{ch.desc}</Text>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${Math.min((ch.current / ch.target) * 100, 100)}%` as any }]} />
              </View>
              <Text style={s.challengeStatus}>{Math.min(ch.current, ch.target)}/{ch.target}</Text>
            </View>
            <View style={s.challengeRight}>
              <Text style={s.challengePts}>+{ch.pts} pts</Text>
              <TouchableOpacity
                style={[s.claimBtn, (ch.claimed || ch.current < ch.target) && s.claimBtnOff]}
                onPress={() => claimChallenge(ch.id, ch.pts, ch.claimed, ch.current, ch.target, ch.setClaimed)}
                disabled={ch.claimed || ch.current < ch.target}
              >
                <Text style={s.claimBtnText}>{ch.claimed ? 'Done' : 'Claim'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Stats */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Your Progress</Text>
        <View style={s.statsRow}>
          {[
            { icon: '💨', val: todayBreath,    label: 'Breath Cycles' },
            { icon: '🌱', val: todayGrounding, label: 'Groundings' },
            { icon: '🌌', val: todayMonsters,  label: 'Flappy Runs' },
            { icon: '🎮', val: totalGames,     label: 'Total Sessions' },
          ].map(st => (
            <View key={st.label} style={s.statCard}>
              <Text style={s.statIcon}>{st.icon}</Text>
              <Text style={s.statNum}>{st.val}</Text>
              <Text style={s.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>
      </View>
      {/* Game Modals */}
      <Modal visible={activeGame === 'flappy'} animationType="slide" statusBarTranslucent onRequestClose={() => setActiveGame(null)}>
        <FlappyMindGame onComplete={() => handleMonsterUpdate({})} onClose={() => setActiveGame(null)} />
      </Modal>

      <Modal visible={activeGame === 'breath' || activeGame === 'grounding'} animationType="slide" onRequestClose={() => setActiveGame(null)}>
        <SafeAreaView style={s.modalFull}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setActiveGame(null)}>
              <Text style={s.modalBack}>← Back</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>{activeCard?.title ?? ''}</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView contentContainerStyle={s.modalContent}>
            {activeGame === 'breath'    && <BreathBubbleGame onCycleComplete={handleBreathCycle} />}
            {activeGame === 'grounding' && <GroundingGame    onComplete={handleGroundingComplete} />}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </ScrollView>
  );
}

// ─── Breath styles ────────────────────────────────────────────────────────────
const b = StyleSheet.create({
  container:         { paddingVertical: 8, alignItems: 'center' },
  circleArea:        { width: 280, height: 280, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginVertical: 8 },
  outerRing:         { position: 'absolute', width: 268, height: 268, borderRadius: 134, borderWidth: 1 },
  midRing:           { position: 'absolute', width: 240, height: 240, borderRadius: 120, borderWidth: 1 },
  breathCircle:      { width: 210, height: 210, borderRadius: 105, alignItems: 'center', justifyContent: 'center' },
  innerCircle:       { width: 134, height: 134, borderRadius: 67, alignItems: 'center', justifyContent: 'center' },
  idleCircle:        { backgroundColor: colors.primaryLight },
  idleInner:         { backgroundColor: colors.sage100 },
  idleIcon:          { fontSize: 32 },
  idleHint:          { fontSize: 11, color: colors.textMuted, marginTop: 4, letterSpacing: 1 },
  phaseName:         { fontSize: 11, fontWeight: '700', color: colors.textMid, letterSpacing: 2, textTransform: 'uppercase' },
  countdown:         { fontSize: 42, fontWeight: '800', marginTop: 2 },
  cycleCount:        { fontSize: 13, color: colors.textMuted, marginBottom: 4 },
  phaseDots:         { flexDirection: 'row', gap: 6, marginTop: 4 },
  dot:               { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  patternLabel:      { fontSize: 13, color: colors.textMid, marginTop: 8, fontWeight: '600' },
  stopBtn:           { marginTop: 20, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28, borderWidth: 1, borderColor: colors.border },
  stopBtnText:       { color: colors.textMid, fontWeight: '600', fontSize: 15 },
  selectLabel:       { fontSize: 13, color: colors.textMuted, marginTop: 16, marginBottom: 10, letterSpacing: 0.5 },
  patternRow:        { flexDirection: 'row', gap: 8, marginBottom: 14 },
  patternChip:       { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  patternChipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  patternChipLabel:  { fontSize: 13, color: colors.textMid, fontWeight: '600' },
  patternChipLabelActive: { color: colors.primary },
  phaseRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 10 },
  phaseItem:         { flexDirection: 'row', alignItems: 'center', gap: 5 },
  phaseItemDot:      { width: 8, height: 8, borderRadius: 4 },
  phaseItemText:     { fontSize: 12, color: colors.textMid },
  patternDesc:       { fontSize: 12, color: colors.textMuted, marginBottom: 16 },
  btn:               { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 32, alignSelf: 'stretch', alignItems: 'center', marginTop: 4 },
  btnText:           { color: colors.white, fontWeight: '700', fontSize: 16 },
  doneEmoji:         { fontSize: 48, marginBottom: 12, textAlign: 'center' },
  doneTitle:         { fontSize: 22, fontWeight: '800', color: colors.textDark, marginBottom: 4 },
  doneSub:           { fontSize: 15, color: colors.primary, fontWeight: '600', marginBottom: 10 },
  doneDesc:          { fontSize: 14, color: colors.textMid, textAlign: 'center', lineHeight: 22, marginBottom: 20, paddingHorizontal: 8 },
});

// ─── Grounding styles ─────────────────────────────────────────────────────────
const gr = StyleSheet.create({
  container:     { paddingVertical: 8 },
  introIcon:     { fontSize: 48, textAlign: 'center', marginBottom: 10 },
  introTitle:    { fontSize: 20, fontWeight: '800', color: colors.textDark, textAlign: 'center', marginBottom: 8 },
  introDesc:     { fontSize: 14, color: colors.textMid, textAlign: 'center', lineHeight: 22, marginBottom: 18, paddingHorizontal: 4 },
  previewRow:    { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  senseChip:     { borderRadius: 12, padding: 10, alignItems: 'center', minWidth: 50 },
  senseChipIcon: { fontSize: 20 },
  senseChipCount:{ fontSize: 16, fontWeight: '800', marginTop: 2 },
  btn:           { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  btnText:       { color: colors.white, fontWeight: '700', fontSize: 16 },
  progressTrack: { height: 4, backgroundColor: colors.sage100, borderRadius: 2, overflow: 'hidden', marginBottom: 12 },
  progressFill:  { height: 4, borderRadius: 2 },
  stepLabel:     { fontSize: 12, color: colors.textMuted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  senseHeader:   { borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  senseIcon:     { fontSize: 36 },
  senseName:     { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  sensePrompt:   { fontSize: 13, color: colors.textMid, lineHeight: 20 },
  itemsGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginVertical: 10 },
  item:          { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.border, backgroundColor: colors.background },
  itemText:      { fontSize: 18, fontWeight: '800', color: colors.textMuted },
  tapHint:       { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 8, marginBottom: 4 },
  doneIcon:      { fontSize: 48, textAlign: 'center', marginBottom: 12, marginTop: 8 },
  doneTitle:     { fontSize: 22, fontWeight: '800', color: colors.textDark, textAlign: 'center', marginBottom: 8 },
  doneDesc:      { fontSize: 14, color: colors.textMid, textAlign: 'center', lineHeight: 22, marginBottom: 20, paddingHorizontal: 4 },
});

// ─── Monster styles ───────────────────────────────────────────────────────────
const m = StyleSheet.create({
  game:          { paddingVertical: 8 },
  statsRow:      { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 14, backgroundColor: colors.background, borderRadius: 12, padding: 12 },
  statBox:       { alignItems: 'center' },
  statIcon:      { fontSize: 18, marginBottom: 2 },
  statVal:       { fontSize: 13, fontWeight: '700', color: colors.textDark },
  primaryBtn:    { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 8 },
  btnDisabled:   { backgroundColor: colors.border },
  restBtn:       { backgroundColor: colors.warning },
  primaryBtnText:{ color: colors.white, fontWeight: '700', fontSize: 15 },
  fleeBtn:       { borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  fleeBtnText:   { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
  sectionLabel:  { fontSize: 13, fontWeight: '700', color: colors.textDark, marginTop: 14, marginBottom: 8 },
  emptyHint:     { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 14, lineHeight: 20 },
  tamedGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  tamedCard:     { alignItems: 'center', backgroundColor: colors.background, borderRadius: 12, padding: 10, minWidth: 74 },
  tamedIcon:     { fontSize: 28 },
  tamedName:     { fontSize: 11, color: colors.textMid, textAlign: 'center', marginTop: 3, fontWeight: '600' },
  tamedStatus:   { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  monsterEmoji:  { fontSize: 72, textAlign: 'center', marginVertical: 8 },
  encounterTitle:{ fontSize: 20, fontWeight: '800', color: colors.textDark, textAlign: 'center', marginBottom: 6 },
  encounterDesc: { fontSize: 14, color: colors.textMid, textAlign: 'center', marginBottom: 12 },
  techniqueTag:  { alignSelf: 'center', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 12 },
  techniqueTagText: { fontSize: 13, fontWeight: '600' },
  tamingMonster: { fontSize: 48, textAlign: 'center', marginBottom: 4 },
  tamingTitle:   { fontSize: 16, fontWeight: '700', color: colors.textDark, textAlign: 'center', marginBottom: 6 },
  cycleDotsRow:  { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 14 },
  cycleDot:      { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.border },
  cycleDotDone:  { backgroundColor: colors.primary },
  cycleLabel:    { fontSize: 13, color: colors.textMid, textAlign: 'center', marginTop: 6, fontWeight: '600' },
  tamingHint:    { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 8 },
  victoryTitle:  { fontSize: 22, fontWeight: '800', color: colors.textDark, textAlign: 'center', marginBottom: 4 },
  victoryMessage:{ fontSize: 14, color: colors.textMid, textAlign: 'center', marginBottom: 14 },
  rewardsBox:    { backgroundColor: colors.primaryLight, borderRadius: 12, padding: 14, marginBottom: 14, gap: 6 },
  rewardItem:    { fontSize: 14, fontWeight: '600', color: colors.primary, textAlign: 'center' },
  sanctuaryBtn:  { backgroundColor: colors.primaryLight, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 8 },
  sanctuaryBtnText: { color: colors.primaryDark, fontWeight: '700', fontSize: 15 },
  sanctuaryTitle:{ fontSize: 20, fontWeight: '800', color: colors.textDark, textAlign: 'center', marginBottom: 4 },
  sanctuaryDesc: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginBottom: 12 },
});

// ─── Screen styles ────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.background },
  content:        { padding: 16, paddingBottom: 40 },
  centered:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  screenTitle:    { fontSize: 22, fontWeight: '800', color: colors.textDark },
  subtitle:       { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  pointsBadge:    { backgroundColor: colors.primaryLight, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  pointsText:     { color: colors.primary, fontWeight: '700', fontSize: 14 },
  card:           { backgroundColor: colors.surface, borderRadius: 16, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  gameList:       { gap: 12, marginBottom: 16 },
  gameSelectCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  gameIconBox:    { width: 60, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  gameSelectIcon: { fontSize: 30 },
  gameSelectBody: { flex: 1 },
  gameSelectTitle:{ fontSize: 15, fontWeight: '800', color: colors.textDark, marginBottom: 2 },
  gameSelectDesc: { fontSize: 12, color: colors.textMid, lineHeight: 18, marginBottom: 4 },
  gameSelectMeta: { fontSize: 11, fontWeight: '600' },
  playBtn:        { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  playBtnText:    { color: colors.white, fontWeight: '700', fontSize: 14 },
  backRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backText:       { fontSize: 15, color: colors.primary, fontWeight: '600' },
  gameCard:       { backgroundColor: colors.surface, borderRadius: 16, padding: 18, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  gameCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  gameCardIcon:   { fontSize: 32 },
  gameCardTitle:  { fontSize: 17, fontWeight: '800', color: colors.textDark },
  gameCardMeta:   { fontSize: 12, fontWeight: '600', marginTop: 2 },
  sectionTitle:   { fontSize: 16, fontWeight: '700', color: colors.textDark, marginBottom: 14 },
  challengeRow:   { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 14 },
  challengeIcon:  { fontSize: 26, marginTop: 2 },
  challengeTitle: { fontSize: 14, fontWeight: '700', color: colors.textDark },
  challengeDesc:  { fontSize: 12, color: colors.textMuted, marginBottom: 6 },
  progressTrack:  { height: 6, backgroundColor: colors.sage100, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressFill:   { height: 6, backgroundColor: colors.primary, borderRadius: 3 },
  challengeStatus:{ fontSize: 11, color: colors.textMuted },
  challengeRight: { alignItems: 'center', gap: 6 },
  challengePts:   { fontSize: 13, fontWeight: '700', color: colors.primary },
  claimBtn:       { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  claimBtnOff:    { backgroundColor: colors.border },
  claimBtnText:   { color: colors.white, fontWeight: '700', fontSize: 12 },
  statsRow:       { flexDirection: 'row', justifyContent: 'space-around' },
  statCard:       { alignItems: 'center' },
  statIcon:       { fontSize: 24, marginBottom: 4 },
  statNum:        { fontSize: 20, fontWeight: '800', color: colors.textDark },
  statLabel:      { fontSize: 11, color: colors.textMuted, textAlign: 'center', marginTop: 2 },
  modalFull:      { flex: 1, backgroundColor: colors.background },
  modalHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalBack:      { fontSize: 15, color: colors.primary, fontWeight: '600', width: 60 },
  modalTitle:     { fontSize: 17, fontWeight: '800', color: colors.textDark },
  modalContent:   { padding: 16, paddingBottom: 40 },
});

// ─── Flappy Mind styles ───────────────────────────────────────────────────────
const fl = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: '#1A0F2E' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8, backgroundColor: '#1A0F2E' },
  backBtn:      { fontSize: 15, color: '#C8A8F5', fontWeight: '600' },
  fullCenter:   { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  readyOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 50 },
  readyTitle:   { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 8 },
  readyHint:    { fontSize: 13, color: '#C0A8E8' },
  introOrb:     { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.meditationPurple, marginBottom: 14, shadowColor: colors.meditationPurple, shadowRadius: 16, shadowOpacity: 0.7, shadowOffset: { width: 0, height: 0 } },
  winOrb:       { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, marginBottom: 14, shadowColor: colors.primary, shadowRadius: 16, shadowOpacity: 0.7, shadowOffset: { width: 0, height: 0 } },
  title:        { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 8, textAlign: 'center' },
  winSub:       { fontSize: 14, color: '#C8A8F5', fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  desc:         { fontSize: 13, color: '#A090C0', textAlign: 'center', lineHeight: 21, marginBottom: 20 },
  btn:          { backgroundColor: colors.meditationPurple, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 36, alignItems: 'center' },
  btnText:      { color: '#fff', fontWeight: '700', fontSize: 15 },
  hudScore:     { fontSize: 17, fontWeight: '800', color: '#C8A8F5' },
  hudOf:        { fontSize: 13, fontWeight: '600', color: '#8878A8' },
  canvas:       { backgroundColor: '#1A0F2E', overflow: 'hidden' },
  star:         { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.3)' },
  bird:         { position: 'absolute', width: BIRD_R * 2, height: BIRD_R * 2, borderRadius: BIRD_R, backgroundColor: '#C8A8F5', shadowColor: '#A070E0', shadowRadius: 12, shadowOpacity: 1, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  obsTop:       { position: 'absolute', top: 0, backgroundColor: '#2A1650', borderBottomWidth: 2, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#5A3090', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6, paddingHorizontal: 4 },
  obsBot:       { position: 'absolute', backgroundColor: '#2A1650', borderTopWidth: 2, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#5A3090', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 6, paddingHorizontal: 4 },
  obsText:      { fontSize: 9, color: '#8A7AAA', textAlign: 'center', fontWeight: '600', lineHeight: 13 },
  gapText:      { position: 'absolute', fontSize: 9, color: '#C0A0F0', textAlign: 'center', fontWeight: '700', lineHeight: 13 },
  overlay:      { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,5,20,0.75)', alignItems: 'center', justifyContent: 'center' },
  overlayTitle: { fontSize: 17, fontWeight: '800', color: '#fff', marginBottom: 6 },
  overlaySub:   { fontSize: 13, color: '#C0A8E8' },
});
