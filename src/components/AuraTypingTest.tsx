'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Scene3D } from '@/lib/scene3d';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Volume2, VolumeX, RotateCcw, X, ChevronDown, Github } from 'lucide-react';

const TYPING_TEXTS = [
  "The aura that surrounds him grows stronger with every step he takes upward. Each stair is a testament to his unyielding determination. The higher he climbs, the more the world trembles beneath his presence. This is the path of the aura monster, the one who defies destiny itself and carves his own fate into the very fabric of reality.",
  "In the face of despair, he rises. Through countless trials and endless suffering, his spirit remains unbroken. The staircase stretches endlessly before him, each step demanding more than the last. Yet he presses forward, driven by a will that transcends ordinary mortals. His aura blazes like a supernova, illuminating the darkness that threatens to consume everything he holds dear.",
  "Return by death. The ability that carries the weight of infinite tragedy. With each life lost and reclaimed, the burden grows heavier, yet the resolve only strengthens. The stairs of fate spiral ever upward, and at their peak awaits the answer to all suffering. He climbs not for himself, but for those whose smiles he has sworn to protect against all odds.",
  "The dragon descends from the heavens, its shadow casting despair across the land. Yet one man stands defiant, his aura burning brighter than a thousand suns. The staircase beneath his feet cracks with each step, unable to contain the sheer magnitude of his presence. Warriors and sages alike watch in awe as the aura monster ascends beyond the limits of what any thought possible.",
  "Between hope and despair lies a thin line, and he walks it every single day. The stairs wind upward through clouds of uncertainty, past echoes of past failures and whispers of future triumphs. Each correct step forward is a victory against the chaos that seeks to drag him down. The aura monster does not merely climb, he conquers every stair with the fury of a thousand battles.",
  "HAPPY BIRTHDAY DANIEL!!! did you really think I'd let this day pass quietly? I know the kind of power you vibe with, the kind that keeps climbing no matter what. So here's your gift, a profile picture wrapped in that same aura, use it anywhere, you know the rule, EVEN IF THE STAIRS NEVER END, WE KEEP CLIMBING!!!",
];

// Font options with their CSS variable names
const FONT_OPTIONS = [
  { id: 'orbitron', label: 'Orbitron + Rajdhani', heading: 'var(--font-orbitron)', body: 'var(--font-rajdhani)' },
  { id: 'inter', label: 'Inter', heading: 'var(--font-inter)', body: 'var(--font-inter)' },
  { id: 'roboto', label: 'Roboto', heading: 'var(--font-roboto)', body: 'var(--font-roboto)' },
  { id: 'roboto-mono', label: 'Roboto Mono', heading: 'var(--font-roboto-mono)', body: 'var(--font-roboto-mono)' },
  { id: 'jetbrains', label: 'JetBrains Mono', heading: 'var(--font-jetbrains-mono)', body: 'var(--font-jetbrains-mono)' },
  { id: 'ibm-sans', label: 'IBM Plex Sans', heading: 'var(--font-ibm-plex-sans)', body: 'var(--font-ibm-plex-sans)' },
  { id: 'ibm-mono', label: 'IBM Plex Mono', heading: 'var(--font-ibm-plex-mono)', body: 'var(--font-ibm-plex-mono)' },
  { id: 'space-grotesk', label: 'Space Grotesk', heading: 'var(--font-space-grotesk)', body: 'var(--font-space-grotesk)' },
  { id: 'outfit', label: 'Outfit', heading: 'var(--font-outfit)', body: 'var(--font-outfit)' },
];

type GameMode = 'normal' | 'return-by-death';

interface TypingOptions {
  ignoreCase: boolean;
  ignorePunctuation: boolean;
}

interface TypingState {
  text: string;
  currentIndex: number;
  errors: number;
  correctCount: number;
  startTime: number | null;
  wpm: number;
  accuracy: number;
  combo: number;
  maxCombo: number;
  auraLevel: number;
  isComplete: boolean;
  isStarted: boolean;
  stepCount: number;
}

const AURA_LEVEL_NAMES = [
  'Dormant',
  'Awakening',
  'Rising',
  'Surging',
  'Overwhelming',
  'MONSTER',
  'DANIEL',
];

const AURA_LEVEL_COLORS = [
  'text-gray-400',
  'text-blue-400',
  'text-cyan-400',
  'text-purple-400',
  'text-rose-400',
  'text-amber-300',
  'text-red-500',
];

// CSS color values for aura overlay effects (vignette, flash, etc.)
const AURA_CSS_COLORS = [
  'rgba(100, 100, 120, 0.8)',    // Dormant - gray
  'rgba(60, 130, 246, 0.8)',     // Awakening - blue
  'rgba(34, 211, 238, 0.8)',     // Rising - cyan
  'rgba(168, 85, 247, 0.8)',     // Surging - purple
  'rgba(251, 113, 133, 0.8)',    // Overwhelming - rose
  'rgba(252, 211, 77, 0.9)',     // MONSTER - amber/gold
  'rgba(220, 38, 38, 0.9)',      // DANIEL - crimson red
];

// Glow/shadow CSS for aura vignette
const AURA_GLOW_COLORS = [
  'rgba(100, 100, 120, 0)',      // Dormant - none
  'rgba(60, 130, 246, 0.15)',    // Awakening
  'rgba(34, 211, 238, 0.25)',    // Rising
  'rgba(168, 85, 247, 0.35)',    // Surging
  'rgba(251, 113, 133, 0.5)',    // Overwhelming
  'rgba(252, 211, 77, 0.7)',     // MONSTER
  'rgba(220, 38, 38, 0.8)',      // DANIEL - crimson
];

// Secondary glow color for Daniel dual-tone
const AURA_GLOW_COLORS_ALT = [
  '', '', '', '', '', '',
  'rgba(34, 197, 94, 0.6)',      // DANIEL alt - emerald green
];

const VISIBLE_LINES = 3;

export default function AuraTypingTest() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Scene3D | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const currentCharRef = useRef<HTMLSpanElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<TypingState>({
    text: TYPING_TEXTS[0],
    currentIndex: 0,
    errors: 0,
    correctCount: 0,
    startTime: null,
    wpm: 0,
    accuracy: 100,
    combo: 0,
    maxCombo: 0,
    auraLevel: 0,
    isComplete: false,
    isStarted: false,
    stepCount: 0,
  });
  const [showStart, setShowStart] = useState(true);
  const [shakeUI, setShakeUI] = useState(false);
  const [flashRed, setFlashRed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [auraFlash, setAuraFlash] = useState(false);
  const [auraPulse, setAuraPulse] = useState(0); // for continuous aura pulse animation
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedFont, setSelectedFont] = useState(FONT_OPTIONS[0]);
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>('normal');
  const [typingOptions, setTypingOptions] = useState<TypingOptions>({ ignoreCase: false, ignorePunctuation: false });
  const skipNextInputRef = useRef(false);

  // Get current font families
  const headingFont = selectedFont.heading;
  const bodyFont = selectedFont.body;

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio('/rebirth.mp3');
    audioRef.current.volume = 0.6;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Play mistake sound
  const playMistakeSound = useCallback(() => {
    if (!sfxEnabled || !audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  }, [sfxEnabled]);

  // Continuous aura pulse animation for camera overlay effects
  // Optimized: use CSS custom property instead of React state to avoid re-renders
  useEffect(() => {
    if (showStart || state.auraLevel < 1) return;
    let frameId: number;
    const pulseSpeed = [0, 2, 3, 4, 5.5, 8, 10][state.auraLevel];
    const animate = () => {
      // Throttle to ~30fps for overlay animations (saving CPU)
      setAuraPulse(Math.sin(Date.now() * 0.001 * pulseSpeed) * 0.5 + 0.5);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [state.auraLevel, showStart]);

  // Initialize 3D scene
  useEffect(() => {
    if (!containerRef.current) return;
    const scene = new Scene3D(containerRef.current);
    sceneRef.current = scene;

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Auto-scroll to keep current character visible
  useEffect(() => {
    if (!currentCharRef.current || !textContainerRef.current) return;

    const container = textContainerRef.current;
    const charEl = currentCharRef.current;

    const charRect = charEl.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const charTop = charRect.top - containerRect.top + container.scrollTop;
    const lineHeight = charRect.height;

    const currentLine = Math.floor(charTop / lineHeight);
    const visibleLines = Math.floor(containerRect.height / lineHeight);

    if (currentLine >= visibleLines - 1) {
      // Character is below visible area - scroll down
      const scrollTarget = charTop - lineHeight;
      container.scrollTo({
        top: scrollTarget,
        behavior: 'smooth',
      });
    } else if (charTop < container.scrollTop) {
      // Character is above visible area (e.g. Return by Death reset) - scroll up
      container.scrollTo({
        top: Math.max(0, charTop - lineHeight),
        behavior: 'smooth',
      });
    }
  }, [state.currentIndex]);

  const resetTest = useCallback(() => {
    const randomText = TYPING_TEXTS[Math.floor(Math.random() * TYPING_TEXTS.length)];
    setState({
      text: randomText,
      currentIndex: 0,
      errors: 0,
      correctCount: 0,
      startTime: null,
      wpm: 0,
      accuracy: 100,
      combo: 0,
      maxCombo: 0,
      auraLevel: 0,
      isComplete: false,
      isStarted: false,
      stepCount: 0,
    });
    if (sceneRef.current) {
      sceneRef.current.setCombo(0);
      sceneRef.current.resetPosition();
    }
    if (textContainerRef.current) {
      textContainerRef.current.scrollTop = 0;
    }
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const startTest = useCallback(() => {
    setShowStart(false);
    resetTest();
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [resetTest]);

  // Calculate aura level
  const getAuraLevel = useCallback((combo: number): number => {
    if (combo < 5) return 0;
    if (combo < 15) return 1;
    if (combo < 30) return 2;
    if (combo < 50) return 3;
    if (combo < 80) return 4;
    if (combo < 100) return 5;
    return 6; // DANIEL - 100+
  }, []);

  // Process a character input
  const processChar = useCallback(
    (pressedChar: string) => {
      setState((prevState) => {
        if (prevState.isComplete) return prevState;

        // Find the next character the user actually needs to type
        // (skipping punctuation if ignorePunctuation is on)
        let effectiveIndex = prevState.currentIndex;
        const text = prevState.text;

        // If ignorePunctuation is on, skip over punctuation at the current position
        // This means we auto-advance past punctuation without requiring input
        if (typingOptions.ignorePunctuation) {
          const punctuationRegex = /[.,;:!?'"()\[\]{}\-—–…\/\\]/;
          while (effectiveIndex < text.length && punctuationRegex.test(text[effectiveIndex])) {
            effectiveIndex++;
          }
          if (effectiveIndex >= text.length) {
            // All remaining characters were punctuation - complete
            return { ...prevState, isComplete: true, currentIndex: text.length };
          }
        }

        const expectedChar = text[effectiveIndex];

        // Start timer on first keypress
        const startTime = prevState.startTime || Date.now();
        const isStarted = prevState.startTime ? prevState.isStarted : true;

        // Compare characters with optional case insensitivity
        const comparePressed = typingOptions.ignoreCase ? pressedChar.toLowerCase() : pressedChar;
        const compareExpected = typingOptions.ignoreCase ? expectedChar.toLowerCase() : expectedChar;

        // Count how many punctuation chars were auto-skipped
        const skippedChars = effectiveIndex - prevState.currentIndex;

        if (comparePressed === compareExpected) {
          // Correct keypress
          const newCorrectCount = prevState.correctCount + 1 + skippedChars;
          const newCombo = prevState.combo + 1;
          const newStepCount = prevState.stepCount + 1;
          const newAuraLevel = getAuraLevel(newCombo);
          const newMaxCombo = Math.max(prevState.maxCombo, newCombo);

          const elapsed = startTime ? (Date.now() - startTime) / 1000 / 60 : 0;
          const wordsTyped = newCorrectCount / 5;
          const newWpm = elapsed > 0 ? Math.round(wordsTyped / elapsed) : 0;

          const totalAttempts = newCorrectCount + prevState.errors;
          const newAccuracy = Math.round((newCorrectCount / totalAttempts) * 100);

          const newIndex = effectiveIndex + 1;
          const isComplete = newIndex >= text.length;

          // Climb in 3D
          sceneRef.current?.climbStep();

          // Trigger aura flash overlay (intensity scales with aura level)
          if (newAuraLevel >= 1) {
            setAuraFlash(true);
            setTimeout(() => setAuraFlash(false), [0, 60, 80, 100, 140, 200, 250][newAuraLevel]);
          }

          return {
            ...prevState,
            currentIndex: newIndex,
            correctCount: newCorrectCount,
            combo: newCombo,
            maxCombo: newMaxCombo,
            auraLevel: newAuraLevel,
            wpm: newWpm,
            accuracy: newAccuracy,
            stepCount: newStepCount,
            startTime,
            isStarted,
            isComplete,
          };
        } else {
          // Wrong keypress
          // Play mistake sound
          playMistakeSound();

          // UI feedback
          setTimeout(() => {
            setShakeUI(true);
            setFlashRed(true);
            setTimeout(() => setShakeUI(false), 300);
            setTimeout(() => setFlashRed(false), 400);
          }, 0);

          // Check game mode
          if (gameMode === 'return-by-death') {
            // Return by Death: fall ALL the way to the bottom, reset text progress
            sceneRef.current?.fallToBottom();

            return {
              ...prevState,
              currentIndex: 0,
              errors: prevState.errors + 1,
              correctCount: 0,
              combo: 0,
              auraLevel: 0,
              accuracy: 0,
              stepCount: 0,
              startTime,
              isStarted,
            };
          } else {
            // Normal mode: fall a few steps
            const fallSteps = Math.min(3 + Math.floor(prevState.combo / 10), 10);
            sceneRef.current?.fallDown(fallSteps);

            return {
              ...prevState,
              currentIndex: effectiveIndex, // Stay at the effective position (skip punctuation stays skipped)
              errors: prevState.errors + 1,
              combo: 0,
              auraLevel: 0,
              accuracy: Math.round(
                (prevState.correctCount / (prevState.correctCount + prevState.errors + 1)) * 100
              ),
              stepCount: Math.max(0, prevState.stepCount - fallSteps),
              startTime,
              isStarted,
            };
          }
        }
      });
    },
    [getAuraLevel, playMistakeSound, gameMode, typingOptions]
  );

  // Handle key press (desktop)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (state.isComplete || showStart) return;

      // Only process single printable characters
      if (e.key.length !== 1) return;

      e.preventDefault();
      skipNextInputRef.current = true;
      processChar(e.key);
    },
    [state.isComplete, showStart, processChar]
  );

  // Handle input event (mobile)
  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (state.isComplete || showStart) return;

      if (skipNextInputRef.current) {
        skipNextInputRef.current = false;
        e.target.value = '';
        return;
      }

      const inputValue = e.target.value;
      if (inputValue.length > 0) {
        const lastChar = inputValue[inputValue.length - 1];
        processChar(lastChar);
      }
      e.target.value = '';
    },
    [state.isComplete, showStart, processChar]
  );

  // Focus input on click
  const handleContainerClick = useCallback(() => {
    if (!showStart && !showSettings) {
      inputRef.current?.focus();
    }
  }, [showStart, showSettings]);

  // Render text with highlighting
  // Punctuation regex for ignore option
  const punctuationRegex = /[.,;:!?'"()\[\]{}\-—–…\/\\]/;

  const renderText = () => {
    const chars = state.text.split('');
    return (
      <div
        className="font-mono text-base sm:text-xl leading-relaxed tracking-wide select-none"
        style={{ lineHeight: '2rem', fontFamily: `${bodyFont}, monospace` }}
      >
        {chars.map((char, i) => {
          let className = '';
          const isPunctuation = punctuationRegex.test(char);

          if (i < state.currentIndex) {
            // Already typed - show in green
            // When ignorePunctuation is on, auto-skipped punctuation appears dimmer
            if (typingOptions.ignorePunctuation && isPunctuation) {
              className = 'text-emerald-400/40';
            } else {
              className = 'text-emerald-400';
            }
          } else if (i === state.currentIndex) {
            // Current character to type
            // If punctuation is at current position and ignorePunctuation is on, show it dimly
            // (it will be auto-skipped on next keypress)
            if (typingOptions.ignorePunctuation && isPunctuation) {
              className = 'text-white/20 line-through';
            } else {
              className = 'text-white bg-white/20 rounded-sm animate-pulse';
            }
          } else {
            // Future characters
            if (typingOptions.ignorePunctuation && isPunctuation) {
              className = 'text-white/15 line-through';
            } else {
              className = 'text-white/40';
            }
          }
          return (
            <span
              key={i}
              ref={i === state.currentIndex ? currentCharRef : undefined}
              className={className}
            >
              {char}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className="relative w-full h-screen overflow-hidden cursor-default"
      onClick={handleContainerClick}
    >
      {/* 3D Canvas */}
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {/* Red flash overlay for errors */}
      <AnimatePresence>
        {flashRed && (
          <motion.div
            initial={{ opacity: gameMode === 'return-by-death' ? 0.6 : 0.4 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: gameMode === 'return-by-death' ? 0.6 : 0.4 }}
            className="absolute inset-0 z-10 bg-red-600 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* === AURA CAMERA OVERLAY EFFECTS (TikTok/Instagram style) === */}
      {!showStart && (
        <>
          {/* 1. AURA VIGNETTE - colored glow around edges, pulses with aura */}
          <div
            className="absolute inset-0 z-[5] pointer-events-none"
            style={{
              boxShadow: state.auraLevel >= 1
                ? `inset 0 0 ${40 + state.auraLevel * 25}px ${5 + state.auraLevel * 8}px ${AURA_GLOW_COLORS[state.auraLevel]}`
                : 'none',
              opacity: state.auraLevel >= 1 ? 0.5 + auraPulse * 0.3 * (state.auraLevel / 6) : 0,
              transition: 'opacity 0.3s, box-shadow 0.3s',
            }}
          />

          {/* 2. AURA COLOR FLASH - brief full-screen color pulse on each step */}
          <AnimatePresence>
            {auraFlash && state.auraLevel >= 1 && (
              <motion.div
                initial={{ opacity: Math.min(state.auraLevel * 0.08, 0.5) }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: [0, 0.12, 0.15, 0.18, 0.22, 0.28, 0.35][state.auraLevel] }}
                className="absolute inset-0 z-[6] pointer-events-none"
                style={{
                  background: `radial-gradient(circle at center, transparent 30%, ${AURA_CSS_COLORS[state.auraLevel]} 80%)`,
                }}
              />
            )}
          </AnimatePresence>

          {/* 3. CHROMATIC ABERRATION - RGB shift that increases with aura level */}
          {state.auraLevel >= 3 && (
            <div
              className="absolute inset-0 z-[4] pointer-events-none mix-blend-screen"
              style={{
                opacity: [0, 0, 0, 0.03, 0.06, 0.1, 0.15][state.auraLevel] * (0.7 + auraPulse * 0.3),
                background: `linear-gradient(90deg, rgba(255,0,0,0.1) 0%, transparent 30%, transparent 70%, rgba(0,0,255,0.1) 100%)`,
                transform: `translateX(${(-1 - state.auraLevel) * (0.5 + auraPulse)}px)`,
              }}
            />
          )}

          {/* 4. SCANLINES - subtle CRT effect at high aura levels */}
          {state.auraLevel >= 4 && (
            <div
              className="absolute inset-0 z-[7] pointer-events-none"
              style={{
                opacity: [0, 0, 0, 0, 0.02, 0.04, 0.06][state.auraLevel],
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px)',
                backgroundSize: '100% 4px',
              }}
            />
          )}

          {/* 5. ENERGY STREAKS - diagonal light streaks that flash across screen at high aura */}
          <AnimatePresence>
            {auraFlash && state.auraLevel >= 4 && (
              <motion.div
                initial={{ opacity: state.auraLevel >= 6 ? 0.35 : 0.2, rotate: -15 + auraPulse * 30 }}
                animate={{ opacity: 0, scale: state.auraLevel >= 6 ? 1.8 : 1.3 }}
                exit={{ opacity: 0 }}
                transition={{ duration: state.auraLevel >= 6 ? 0.3 : 0.2 }}
                className="absolute inset-0 z-[8] pointer-events-none"
                style={{
                  background: `linear-gradient(${45 + auraPulse * 60}deg, transparent 30%, ${AURA_CSS_COLORS[state.auraLevel]} 48%, ${AURA_CSS_COLORS[state.auraLevel]} 52%, transparent 70%)`,
                }}
              />
            )}
          </AnimatePresence>

          {/* 6. SCREEN SHAKE CSS EFFECT - subtle movement on impacts */}
          <motion.div
            className="absolute inset-0 z-[3] pointer-events-none"
            animate={shakeUI ? { x: [0, -4, 4, -2, 2, 0], y: [0, -3, 3, -1, 1, 0] } : { x: 0, y: 0 }}
            transition={{ duration: 0.3 }}
          />

          {/* 7. AURA BREATHE - slow pulsing brightness on the whole viewport */}
          {state.auraLevel >= 2 && (
            <div
              className="absolute inset-0 z-[5] pointer-events-none"
              style={{
                background: `radial-gradient(ellipse at center, ${AURA_CSS_COLORS[state.auraLevel].replace('0.8', '0.03').replace('0.9', '0.04')} 0%, transparent 70%)`,
                opacity: auraPulse * [0, 0, 0.2, 0.35, 0.5, 0.7, 0.9][state.auraLevel],
                transition: 'opacity 0.2s',
              }}
            />
          )}

          {/* 8. MONSTER EXCLUSIVE - golden haze overlay */}
          {state.auraLevel === 5 && (
            <div
              className="absolute inset-0 z-[6] pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(252, 211, 77, 0.06) 0%, rgba(252, 211, 77, 0.02) 50%, transparent 80%)',
                opacity: 0.4 + auraPulse * 0.4,
              }}
            />
          )}

          {/* 9. DANIEL EXCLUSIVE - dual-tone red/green overlay, maximum intensity */}
          {state.auraLevel === 6 && (
            <>
              {/* Dual-tone crimson + emerald vignette */}
              <div
                className="absolute inset-0 z-[6] pointer-events-none"
                style={{
                  boxShadow: `inset 0 0 200px 60px ${auraPulse > 0.5 ? AURA_GLOW_COLORS[6] : AURA_GLOW_COLORS_ALT[6]}`,
                  opacity: 0.6 + auraPulse * 0.25,
                  transition: 'box-shadow 0.1s',
                }}
              />
              {/* Red/green alternating haze */}
              <div
                className="absolute inset-0 z-[6] pointer-events-none"
                style={{
                  background: auraPulse > 0.5
                    ? 'radial-gradient(ellipse at center, rgba(220, 38, 38, 0.08) 0%, rgba(220, 38, 38, 0.02) 50%, transparent 80%)'
                    : 'radial-gradient(ellipse at center, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.02) 50%, transparent 80%)',
                  opacity: 0.5 + auraPulse * 0.3,
                  transition: 'background 0.1s',
                }}
              />
              {/* Cross-hatch energy lines */}
              <div
                className="absolute inset-0 z-[7] pointer-events-none"
                style={{
                  backgroundImage: `
                    repeating-linear-gradient(45deg, transparent, transparent 50px, rgba(220, 38, 38, 0.02) 50px, rgba(220, 38, 38, 0.02) 52px),
                    repeating-linear-gradient(-45deg, transparent, transparent 50px, rgba(34, 197, 94, 0.02) 50px, rgba(34, 197, 94, 0.02) 52px)
                  `,
                  opacity: 0.4 + auraPulse * 0.4,
                }}
              />
            </>
          )}
        </>
      )}

      {/* Start Screen */}
      <AnimatePresence>
        {showStart && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <motion.h1
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-5xl sm:text-7xl font-black text-white mb-2 tracking-tighter"
              style={{
                fontFamily: `${headingFont}, sans-serif`,
                textShadow: '0 0 40px rgba(68, 136, 255, 0.5), 0 0 80px rgba(68, 136, 255, 0.3)',
              }}
            >
              AURA
            </motion.h1>
            <motion.h2
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-3xl sm:text-5xl font-black text-amber-400 mb-6 tracking-tight"
              style={{
                fontFamily: `${headingFont}, sans-serif`,
                textShadow: '0 0 30px rgba(255, 170, 0, 0.5), 0 0 60px rgba(255, 170, 0, 0.3)',
              }}
            >
              MONSTER
            </motion.h2>

            {/* Mode selector on start screen */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex gap-3 mb-8"
            >
              <button
                onClick={() => setGameMode('normal')}
                className={`px-4 py-2 text-sm font-bold transition-all ${
                  gameMode === 'normal'
                    ? 'bg-cyan-600/40 text-cyan-300 border border-cyan-500/50'
                    : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'
                }`}
                style={{
                  fontFamily: `${headingFont}, sans-serif`,
                  clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
                }}
              >
                Normal
              </button>
              <button
                onClick={() => setGameMode('return-by-death')}
                className={`px-4 py-2 text-sm font-bold transition-all ${
                  gameMode === 'return-by-death'
                    ? 'bg-red-600/40 text-red-300 border border-red-500/50'
                    : 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10'
                }`}
                style={{
                  fontFamily: `${headingFont}, sans-serif`,
                  clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
                }}
              >
                Return by Death
              </button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-white/60 text-sm sm:text-base mb-8 text-center max-w-md px-4"
              style={{ fontFamily: `${bodyFont}, sans-serif` }}
            >
              {gameMode === 'return-by-death'
                ? 'One mistake and you return to the very beginning. Just like Subaru, death resets everything.'
                : 'Type correctly to climb the stairs of aura. Wrong input makes you fall. How high can you ascend?'}
            </motion.p>
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8, type: 'spring', stiffness: 200 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startTest}
              className={`px-8 py-4 text-white font-black text-lg sm:text-xl shadow-lg transition-shadow ${
                gameMode === 'return-by-death'
                  ? 'bg-gradient-to-r from-red-700 to-red-900 shadow-red-500/30 hover:shadow-red-500/50'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 shadow-blue-500/30 hover:shadow-blue-500/50'
              }`}
              style={{
                fontFamily: `${headingFont}, sans-serif`,
                clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
              }}
            >
              {gameMode === 'return-by-death' ? 'FACE DESTINY' : 'BEGIN THE ASCENT'}
            </motion.button>

            {/* GitHub Footer Link on Start Screen */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="absolute bottom-6 flex items-center gap-2 pointer-events-auto"
            >
              <a
                href="https://github.com/GamerJagdish/Aura-Monster"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white/40 hover:text-white/80 text-xs transition-colors group"
                style={{ fontFamily: `${bodyFont}, sans-serif` }}
              >
                <Github size={14} className="transition-transform group-hover:scale-110 text-white/40 group-hover:text-cyan-400" />
                <span>GamerJagdish/Aura-Monster</span>
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main UI Overlay */}
      {!showStart && (
        <div className="absolute inset-0 z-20 flex flex-col pointer-events-none">
          {/* Top bar - Stats */}
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-between px-3 sm:px-8 py-2 sm:py-3 bg-black/40 backdrop-blur-md border-b border-white/10"
          >
            {/* WPM */}
            <div className="flex items-center gap-1 sm:gap-2">
              <span
                className="text-white/50 text-[10px] sm:text-xs uppercase tracking-wider"
                style={{ fontFamily: `${bodyFont}, sans-serif` }}
              >
                WPM
              </span>
              <span
                className="text-white font-black text-xl sm:text-2xl tabular-nums"
                style={{ fontFamily: `${headingFont}, sans-serif` }}
              >
                {state.wpm}
              </span>
            </div>

            {/* Aura Level */}
            <div className="flex flex-col items-center">
              <span
                className="text-white/50 text-[10px] sm:text-xs uppercase tracking-wider"
                style={{ fontFamily: `${bodyFont}, sans-serif` }}
              >
                Aura Level
              </span>
              <motion.span
                key={state.auraLevel}
                initial={{ scale: 1.5 }}
                animate={{ scale: 1 }}
                className={`font-black text-sm sm:text-xl ${AURA_LEVEL_COLORS[state.auraLevel]}`}
                style={{
                  fontFamily: `${headingFont}, sans-serif`,
                  ...(state.auraLevel >= 4
                    ? {
                        textShadow: `0 0 20px currentColor, 0 0 40px currentColor`,
                      }
                    : {}),
                }}
              >
                {AURA_LEVEL_NAMES[state.auraLevel]}
              </motion.span>
            </div>

            {/* Mode indicator */}
            {gameMode === 'return-by-death' && (
              <div className="hidden sm:flex items-center gap-1">
                <span
                  className="text-red-400/70 text-[10px] sm:text-xs font-bold uppercase tracking-wider"
                  style={{ fontFamily: `${headingFont}, sans-serif` }}
                >
                  RbD
                </span>
              </div>
            )}

            {/* Accuracy */}
            <div className="flex items-center gap-1 sm:gap-2">
              <span
                className="text-white/50 text-[10px] sm:text-xs uppercase tracking-wider"
                style={{ fontFamily: `${bodyFont}, sans-serif` }}
              >
                Accuracy
              </span>
              <span
                className={`font-black text-xl sm:text-2xl tabular-nums ${
                  state.accuracy >= 95
                    ? 'text-emerald-400'
                    : state.accuracy >= 80
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
                style={{ fontFamily: `${headingFont}, sans-serif` }}
              >
                {state.accuracy}%
              </span>
            </div>

            {/* Settings button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSettings(!showSettings);
                setShowFontDropdown(false);
              }}
              className="pointer-events-auto p-2 text-white/40 hover:text-white/80 transition-colors"
            >
              <Settings size={18} />
            </button>
          </motion.div>

          {/* Settings Panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-12 sm:top-14 right-2 sm:right-8 z-30 bg-black/90 backdrop-blur-md border border-white/10 p-4 sm:p-5 pointer-events-auto w-64 sm:w-72"
                style={{
                  clipPath:
                    'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
                }}
              >
                <div className="flex items-center justify-between mb-4 gap-8">
                  <span
                    className="text-white font-bold text-sm uppercase tracking-wider"
                    style={{ fontFamily: `${headingFont}, sans-serif` }}
                  >
                    Settings
                  </span>
                  <button
                    onClick={() => {
                      setShowSettings(false);
                      setShowFontDropdown(false);
                    }}
                    className="text-white/40 hover:text-white/80 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* SFX Toggle */}
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <span
                      className="text-white/80 text-sm font-semibold"
                      style={{ fontFamily: `${bodyFont}, sans-serif` }}
                    >
                      Sound Effects
                    </span>
                    <p className="text-white/30 text-xs" style={{ fontFamily: `${bodyFont}, sans-serif` }}>
                      Play sound on mistakes
                    </p>
                  </div>
                  <button
                    onClick={() => setSfxEnabled(!sfxEnabled)}
                    className={`p-2 transition-colors ${
                      sfxEnabled ? 'text-cyan-400' : 'text-white/30'
                    }`}
                  >
                    {sfxEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                  </button>
                </div>

                {/* Game Mode Toggle */}
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <span
                      className="text-white/80 text-sm font-semibold"
                      style={{ fontFamily: `${bodyFont}, sans-serif` }}
                    >
                      Game Mode
                    </span>
                    <p className="text-white/30 text-xs" style={{ fontFamily: `${bodyFont}, sans-serif` }}>
                      {gameMode === 'return-by-death'
                        ? 'Mistake resets everything'
                        : 'Mistake loses some steps'}
                    </p>
                  </div>
                  <button
                    onClick={() => setGameMode(gameMode === 'normal' ? 'return-by-death' : 'normal')}
                    className={`px-3 py-1 text-xs font-bold transition-all ${
                      gameMode === 'return-by-death'
                        ? 'bg-red-600/40 text-red-300 border border-red-500/50'
                        : 'bg-white/10 text-white/50 border border-white/10'
                    }`}
                    style={{
                      fontFamily: `${headingFont}, sans-serif`,
                      clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))',
                    }}
                  >
                    {gameMode === 'return-by-death' ? 'RbD' : 'Normal'}
                  </button>
                </div>

                {/* Ignore Case Toggle */}
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <span
                      className="text-white/80 text-sm font-semibold"
                      style={{ fontFamily: `${bodyFont}, sans-serif` }}
                    >
                      Ignore Case
                    </span>
                    <p className="text-white/30 text-xs" style={{ fontFamily: `${bodyFont}, sans-serif` }}>
                      A = a, no shift needed
                    </p>
                  </div>
                  <button
                    onClick={() => setTypingOptions(prev => ({ ...prev, ignoreCase: !prev.ignoreCase }))}
                    className={`px-3 py-1 text-xs font-bold transition-all ${
                      typingOptions.ignoreCase
                        ? 'bg-emerald-600/40 text-emerald-300 border border-emerald-500/50'
                        : 'bg-white/10 text-white/50 border border-white/10'
                    }`}
                    style={{
                      fontFamily: `${headingFont}, sans-serif`,
                      clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))',
                    }}
                  >
                    {typingOptions.ignoreCase ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Ignore Punctuation Toggle */}
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <span
                      className="text-white/80 text-sm font-semibold"
                      style={{ fontFamily: `${bodyFont}, sans-serif` }}
                    >
                      Ignore Punctuation
                    </span>
                    <p className="text-white/30 text-xs" style={{ fontFamily: `${bodyFont}, sans-serif` }}>
                      Auto-skip . , ! ? etc.
                    </p>
                  </div>
                  <button
                    onClick={() => setTypingOptions(prev => ({ ...prev, ignorePunctuation: !prev.ignorePunctuation }))}
                    className={`px-3 py-1 text-xs font-bold transition-all ${
                      typingOptions.ignorePunctuation
                        ? 'bg-emerald-600/40 text-emerald-300 border border-emerald-500/50'
                        : 'bg-white/10 text-white/50 border border-white/10'
                    }`}
                    style={{
                      fontFamily: `${headingFont}, sans-serif`,
                      clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))',
                    }}
                  >
                    {typingOptions.ignorePunctuation ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Font Selector */}
                <div className="mb-4">
                  <span
                    className="text-white/80 text-sm font-semibold block mb-2"
                    style={{ fontFamily: `${bodyFont}, sans-serif` }}
                  >
                    Font
                  </span>
                  <div className="relative">
                    <button
                      onClick={() => setShowFontDropdown(!showFontDropdown)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-colors text-sm"
                      style={{
                        fontFamily: `${bodyFont}, sans-serif`,
                        clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))',
                      }}
                    >
                      <span>{selectedFont.label}</span>
                      <ChevronDown size={14} className={`transition-transform ${showFontDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {showFontDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full left-0 right-0 mt-1 bg-black/95 border border-white/10 z-50 max-h-48 overflow-y-auto custom-scrollbar"
                          style={{
                            clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px))',
                          }}
                        >
                          {FONT_OPTIONS.map((font) => (
                            <button
                              key={font.id}
                              onClick={() => {
                                setSelectedFont(font);
                                setShowFontDropdown(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                                selectedFont.id === font.id
                                  ? 'bg-cyan-600/30 text-cyan-300'
                                  : 'text-white/60 hover:bg-white/10 hover:text-white/90'
                              }`}
                              style={{ fontFamily: `${font.body}, sans-serif` }}
                            >
                              {font.label}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* GitHub link in Settings */}
                <a
                  href="https://github.com/GamerJagdish/Aura-Monster"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 mb-3 bg-white/5 hover:bg-white/15 border border-white/10 hover:border-cyan-500/40 text-white/70 hover:text-white font-semibold text-xs transition-all group"
                  style={{
                    fontFamily: `${bodyFont}, sans-serif`,
                    clipPath:
                      'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
                  }}
                >
                  <Github size={14} className="transition-transform group-hover:scale-110 group-hover:text-cyan-400" />
                  <span>GitHub Repository</span>
                </a>

                {/* Reset button */}
                <button
                  onClick={() => {
                    resetTest();
                    setShowSettings(false);
                    setShowFontDropdown(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white font-semibold text-sm transition-colors"
                  style={{
                    fontFamily: `${bodyFont}, sans-serif`,
                    clipPath:
                      'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
                  }}
                >
                  <RotateCcw size={14} />
                  Reset Test
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Combo counter */}
          <div className="flex-1 flex items-start justify-end p-3 sm:p-8">
            <motion.div
              key={state.combo}
              initial={{ scale: 1.3, opacity: 0.8 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-end"
            >
              <span
                className="text-white/40 text-[10px] sm:text-xs uppercase tracking-wider"
                style={{ fontFamily: `${bodyFont}, sans-serif` }}
              >
                Combo
              </span>
              <span
                className={`font-black text-3xl sm:text-6xl tabular-nums ${
                  state.combo >= 80
                    ? 'text-amber-300'
                    : state.combo >= 50
                    ? 'text-rose-400'
                    : state.combo >= 30
                    ? 'text-purple-400'
                    : state.combo >= 15
                    ? 'text-cyan-400'
                    : state.combo >= 5
                    ? 'text-blue-400'
                    : 'text-white/60'
                }`}
                style={{
                  fontFamily: `${headingFont}, sans-serif`,
                  ...(state.combo >= 50
                    ? {
                        textShadow: `0 0 20px currentColor, 0 0 40px currentColor`,
                      }
                    : {}),
                }}
              >
                {state.combo}
              </span>
            </motion.div>
          </div>

          {/* Bottom panel - Typing area */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{
              y: shakeUI ? [0, -5, 5, -3, 3, 0] : 0,
              opacity: 1,
            }}
            transition={{ delay: 0.3, duration: shakeUI ? 0.3 : 0.5 }}
            className="px-3 sm:px-8 py-3 sm:py-6 bg-black/50 backdrop-blur-md border-t border-white/10"
          >
            {/* Progress bar */}
            <div
              className="w-full h-1.5 bg-white/10 mb-3 sm:mb-4 overflow-hidden"
              style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
            >
              <motion.div
                className="h-full"
                style={{
                  width: `${(state.currentIndex / state.text.length) * 100}%`,
                  background:
                    state.auraLevel >= 4
                      ? 'linear-gradient(90deg, #f59e0b, #ef4444, #a855f7, #06b6d4)'
                      : state.auraLevel >= 2
                      ? 'linear-gradient(90deg, #06b6d4, #a855f7)'
                      : 'linear-gradient(90deg, #3b82f6, #06b6d4)',
                }}
                transition={{ duration: 0.15 }}
              />
            </div>

            {/* Text display */}
            <div className="max-w-4xl mx-auto relative">
              <div className="absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-black/50 to-transparent z-10 pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/50 to-transparent z-10 pointer-events-none" />

              <div
                ref={textContainerRef}
                className="overflow-hidden custom-scrollbar"
                style={{ height: `${VISIBLE_LINES * 2}rem`, lineHeight: '2rem' }}
              >
                {renderText()}
              </div>
            </div>

            {/* Step counter */}
            <div className="flex items-center justify-between mt-2 sm:mt-3">
              <span
                className="text-white/30 text-[10px] sm:text-xs"
                style={{ fontFamily: `${bodyFont}, sans-serif` }}
              >
                {state.currentIndex}/{state.text.length} characters
              </span>
              <span
                className="text-white/30 text-[10px] sm:text-xs"
                style={{ fontFamily: `${bodyFont}, sans-serif` }}
              >
                Stair {state.stepCount} &bull; Max Combo: {state.maxCombo}
              </span>
            </div>

            {/* Hidden input */}
            <input
              ref={inputRef}
              type="text"
              className="absolute opacity-0 left-0 top-0 w-full h-full cursor-default"
              style={{ fontSize: '16px' }}
              onKeyDown={handleKeyDown}
              onChange={handleInput}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              inputMode="text"
              enterKeyHint="next"
            />

            {/* Mobile tap hint */}
            {isMobile && !state.isStarted && (
              <div className="text-center mt-2">
                <span
                  className="text-white/30 text-xs"
                  style={{ fontFamily: `${bodyFont}, sans-serif` }}
                >
                  Tap here and start typing
                </span>
              </div>
            )}
          </motion.div>

          {/* Complete screen */}
          <AnimatePresence>
            {state.isComplete && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto px-4"
              >
                <motion.h2
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="text-3xl sm:text-6xl font-black text-amber-400 mb-4 sm:mb-6"
                  style={{
                    fontFamily: `${headingFont}, sans-serif`,
                    textShadow: '0 0 30px rgba(255, 170, 0, 0.5)',
                  }}
                >
                  ASCENSION COMPLETE
                </motion.h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-8 mb-6 sm:mb-8">
                  <div className="flex flex-col items-center">
                    <span
                      className="text-white/50 text-[10px] sm:text-xs uppercase"
                      style={{ fontFamily: `${bodyFont}, sans-serif` }}
                    >
                      WPM
                    </span>
                    <span
                      className="text-white font-black text-2xl sm:text-3xl"
                      style={{ fontFamily: `${headingFont}, sans-serif` }}
                    >
                      {state.wpm}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span
                      className="text-white/50 text-[10px] sm:text-xs uppercase"
                      style={{ fontFamily: `${bodyFont}, sans-serif` }}
                    >
                      Accuracy
                    </span>
                    <span
                      className="text-white font-black text-2xl sm:text-3xl"
                      style={{ fontFamily: `${headingFont}, sans-serif` }}
                    >
                      {state.accuracy}%
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span
                      className="text-white/50 text-[10px] sm:text-xs uppercase"
                      style={{ fontFamily: `${bodyFont}, sans-serif` }}
                    >
                      Max Combo
                    </span>
                    <span
                      className="text-white font-black text-2xl sm:text-3xl"
                      style={{ fontFamily: `${headingFont}, sans-serif` }}
                    >
                      {state.maxCombo}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span
                      className="text-white/50 text-[10px] sm:text-xs uppercase"
                      style={{ fontFamily: `${bodyFont}, sans-serif` }}
                    >
                      Aura Level
                    </span>
                    <span
                      className={`font-black text-2xl sm:text-3xl ${AURA_LEVEL_COLORS[state.auraLevel]}`}
                      style={{ fontFamily: `${headingFont}, sans-serif` }}
                    >
                      {AURA_LEVEL_NAMES[state.auraLevel]}
                    </span>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={resetTest}
                  className="px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-base sm:text-lg shadow-lg"
                  style={{
                    fontFamily: `${headingFont}, sans-serif`,
                    clipPath:
                      'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
                  }}
                >
                  CLIMB AGAIN
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Custom scrollbar styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.4);
        }
      `}</style>
    </div>
  );
}
