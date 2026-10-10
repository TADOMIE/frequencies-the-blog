import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { X, ChevronRight, Radio, Volume2, Disc3 } from 'lucide-react';

export interface TipItem {
  id: string;
  category: 'TIP' | 'EASTER EGG';
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}

export interface FrequencyTipBubbleProps {
  onJumpToEntry: (entryId: string) => void;
  vinylMode: boolean;
  onToggleVinylMode: () => void;
  overdriveActive: boolean;
  onTriggerOverdrive: () => void;
}

/**
 * Web Audio API synthesizer helper for musical Easter Eggs
 * (Plays clean, gentle acoustic/jazz chords without external audio files)
 */
export function playHarmonicChord(notes: number[], type: OscillatorType = 'sine', duration = 1.6) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + idx * 0.045);

      gain.gain.setValueAtTime(0.0001, now + idx * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.06, now + idx * 0.045 + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.045 + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.045);
      osc.stop(now + idx * 0.045 + duration + 0.05);
    });
  } catch {
    // Ignore audio context restrictions if blocked
  }
}

export const FrequencyTipBubble: React.FC<FrequencyTipBubbleProps> = ({
  onJumpToEntry,
  vinylMode,
  onToggleVinylMode,
  onTriggerOverdrive,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [tipIndex, setTipIndex] = useState(0);
  const [secretBanner, setSecretBanner] = useState<string | null>(null);
  const keyBufferRef = useRef<string>('');
  const prefersReducedMotion = useReducedMotion();

  const triggerBanner = useCallback((msg: string) => {
    setSecretBanner(msg);
    setTimeout(() => {
      setSecretBanner((prev) => (prev === msg ? null : prev));
    }, 4500);
  }, []);

  const tips: TipItem[] = [
    {
      id: 'wiki-links',
      category: 'TIP',
      title: 'Hidden Wikipedia Links',
      body: 'Every single artist name across the marquee, timeline index, and chapters is a disguised direct link to their Wikipedia page.',
    },
    {
      id: 'keyboard-shortcuts',
      category: 'EASTER EGG',
      title: 'Numeric Chapter Jump (Keys 1 — 8)',
      body: 'Press keys 1 through 8 anywhere on your keyboard (outside text boxes) to warp straight to that chapter.',
      actionLabel: 'Jump to 05',
      onAction: () => onJumpToEntry('entry-05'),
    },
    {
      id: 'double-click-hero',
      category: 'EASTER EGG',
      title: '432 Hz Overdrive Pulse',
      body: 'Double-click the giant "FREQUENCIES" hero title to play a 432 Hz harmonic chord and surge all red oscilloscope waves into overdrive.',
      actionLabel: 'Trigger Pulse',
      onAction: () => {
        playHarmonicChord([216, 324, 432, 540, 648], 'triangle', 1.9);
        onTriggerOverdrive();
        triggerBanner('432 Hz Harmonic Overdrive Activated');
      },
    },
    {
      id: 'secret-jazz',
      category: 'EASTER EGG',
      title: 'Type "JAZZ" Anywhere',
      body: 'Type the word JAZZ on your keyboard to play a warm Ben Webster-inspired tenor sax 9th chord and jump to "03 · The Switch: Jazz".',
      actionLabel: 'Play Jazz Chord',
      onAction: () => {
        playHarmonicChord([261.63, 329.63, 392.0, 466.16, 587.33], 'sine', 2.1);
        onJumpToEntry('entry-03');
        triggerBanner('♪ Jazz 9th Chord · Ben Webster Era');
      },
    },
    {
      id: 'secret-carti',
      category: 'EASTER EGG',
      title: 'Type "CARTI" or "VAMP" Anywhere',
      body: 'Type CARTI on your keyboard to trigger an 808 synth sub-pulse and warp to "05 · Cloud Rap Years".',
      actionLabel: 'Trigger 808',
      onAction: () => {
        playHarmonicChord([65.41, 130.81, 196.0, 311.13], 'sawtooth', 1.4);
        onJumpToEntry('entry-05');
        triggerBanner('▲ Cloud Rap 808 Sub-Frequency');
      },
    },
    {
      id: 'secret-vinyl',
      category: 'EASTER EGG',
      title: 'Type "VINYL" for Analog Groove Mode',
      body: 'Type VINYL on your keyboard (or click below) to toggle a subtle spinning vinyl record groove overlay across the page.',
      actionLabel: vinylMode ? 'Disable Vinyl' : 'Enable Vinyl',
      onAction: () => {
        onToggleVinylMode();
        triggerBanner(!vinylMode ? '◉ Analog Vinyl Groove Enabled' : '○ Analog Vinyl Groove Off');
      },
    },
    {
      id: 'unique-waves',
      category: 'TIP',
      title: '8 Distinct Soundwaves',
      body: 'Look closely at the red wave passing through each of the 8 entry titles—each waveform matches its chapter’s musical genre, from acoustic plucks to French rap cadences.',
    },
  ];

  // Auto-reopen the bubble every 10 minutes (600,000 ms) with the next tip/easter egg
  useEffect(() => {
    const TEN_MINUTES_MS = 10 * 60 * 1000;
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
      setIsOpen(true);
    }, TEN_MINUTES_MS);

    return () => clearInterval(interval);
  }, [tips.length]);

  // Global keyboard listener for Easter Eggs (1-8 chapter jump + secret words JAZZ, CARTI, VINYL, KENDRICK)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Keys 1 - 8 jump directly to Entry 01 - 08
      if (/^[1-8]$/.test(e.key)) {
        const entryId = `entry-0${e.key}`;
        playHarmonicChord([220 + Number(e.key) * 55, 330 + Number(e.key) * 55], 'sine', 0.6);
        onJumpToEntry(entryId);
        triggerBanner(`Chapter 0${e.key} Selected`);
        return;
      }

      // Track secret typed words
      if (/^[a-zA-Z]$/.test(e.key)) {
        const nextBuffer = (keyBufferRef.current + e.key.toUpperCase()).slice(-12);
        keyBufferRef.current = nextBuffer;

        if (nextBuffer.endsWith('JAZZ')) {
          keyBufferRef.current = '';
          playHarmonicChord([261.63, 329.63, 392.0, 466.16, 587.33], 'sine', 2.1);
          onJumpToEntry('entry-03');
          triggerBanner('♪ Secret Unlocked: Jazz 9th Chord (The Switch)');
        } else if (nextBuffer.endsWith('CARTI') || nextBuffer.endsWith('VAMP')) {
          keyBufferRef.current = '';
          playHarmonicChord([65.41, 130.81, 196.0, 311.13], 'sawtooth', 1.4);
          onJumpToEntry('entry-05');
          triggerBanner('▲ Secret Unlocked: Cloud Rap 808 Frequency');
        } else if (nextBuffer.endsWith('VINYL')) {
          keyBufferRef.current = '';
          onToggleVinylMode();
          triggerBanner('◉ Secret Unlocked: Analog Vinyl Groove Mode');
        } else if (nextBuffer.endsWith('KENDRICK')) {
          keyBufferRef.current = '';
          playHarmonicChord([220, 277.18, 329.63, 415.3], 'triangle', 1.8);
          onJumpToEntry('entry-04');
          triggerBanner('★ Secret Unlocked: New School Frequency');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onJumpToEntry, onToggleVinylMode, triggerBanner]);

  const currentTip = tips[tipIndex];

  const handleNextTip = () => {
    setTipIndex((prev) => (prev + 1) % tips.length);
  };

  return (
    <>
      {/* Subtle Analog Vinyl Groove Overlay when VINYL Easter Egg is active */}
      {vinylMode && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-30 overflow-hidden opacity-[0.045]"
        >
          <div className="absolute -right-40 -bottom-40 w-[680px] h-[680px] rounded-full border-[2px] border-[#0A0A0A] flex items-center justify-center animate-[spin_18s_linear_infinite]">
            <div className="w-[560px] h-[560px] rounded-full border border-[#0A0A0A] flex items-center justify-center">
              <div className="w-[440px] h-[440px] rounded-full border border-[#D7263D] flex items-center justify-center">
                <div className="w-[320px] h-[320px] rounded-full border border-[#0A0A0A] flex items-center justify-center">
                  <div className="w-[200px] h-[200px] rounded-full border-[12px] border-[#D7263D]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Secret Unlocked Toast Notification */}
      <AnimatePresence>
        {secretBanner && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#0A0A0A] text-[#FFFFFF] border border-[#D7263D] px-5 py-2.5 flex items-center gap-3 shadow-lg"
          >
            <Volume2 className="w-3.5 h-3.5 text-[#D7263D] shrink-0" />
            <span className="text-[11px] tracking-[0.22em] uppercase whitespace-nowrap">
              {secretBanner}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Tip & Easter Egg Bubble (Bottom-Right) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.aside
              key="bubble-open"
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.96 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              aria-label="Website tips and easter eggs"
              className="relative w-[320px] sm:w-[356px] bg-[#FFFFFF] border border-[#0A0A0A] p-5 shadow-[8px_8px_0px_#D7263D]"
            >
              {/* Top Meta Header */}
              <div className="flex items-center justify-between border-b border-[#0A0A0A]/15 pb-2.5 mb-3.5">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-[#D7263D] animate-pulse" />
                  <span className="text-[10px] tracking-[0.24em] uppercase font-medium text-[#D7263D]">
                    {currentTip.category}
                  </span>
                  <span className="text-[10px] text-[#1D3045]/50 tabular-nums">
                    {tipIndex + 1}/{tips.length}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-[#1D3045] hover:text-[#D7263D] transition-colors p-0.5 cursor-pointer"
                  aria-label="Close tips bubble"
                  title="Dismiss (reappears every 10 minutes)"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Tip Content */}
              <div className="space-y-2 mb-4">
                <h4 className="text-sm font-medium uppercase tracking-[0.14em] text-[#0A0A0A]">
                  {currentTip.title}
                </h4>
                <p className="text-xs text-[#1D3045] leading-relaxed font-light">
                  {currentTip.body}
                </p>
              </div>

              {/* Footer Controls */}
              <div className="flex items-center justify-between pt-2.5 border-t border-[#0A0A0A]/12">
                {currentTip.actionLabel && currentTip.onAction ? (
                  <button
                    type="button"
                    onClick={currentTip.onAction}
                    className="px-3 py-1.5 bg-[#0A0A0A] text-[#FFFFFF] text-[10px] tracking-[0.2em] uppercase hover:bg-[#D7263D] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {currentTip.actionLabel}
                  </button>
                ) : (
                  <span className="text-[9px] tracking-[0.2em] uppercase text-[#1D3045]/60">
                    Signal · Every 10m
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleNextTip}
                  className="inline-flex items-center gap-1 text-[10px] tracking-[0.2em] uppercase text-[#0A0A0A] hover:text-[#D7263D] transition-colors cursor-pointer whitespace-nowrap ml-auto"
                >
                  <span>Next Secret</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </motion.aside>
          ) : (
            /* Minimized Signal Pill Button so the user can reopen anytime */
            <motion.button
              key="bubble-closed"
              type="button"
              onClick={() => setIsOpen(true)}
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="group flex items-center gap-2.5 bg-[#FFFFFF] border border-[#0A0A0A] px-3.5 py-2 shadow-[4px_4px_0px_#D7263D] hover:bg-[#0A0A0A] hover:text-[#FFFFFF] transition-colors cursor-pointer"
              title="Open Frequencies Tips & Easter Eggs"
            >
              {vinylMode ? (
                <Disc3 className="w-3.5 h-3.5 text-[#D7263D] animate-spin" />
              ) : (
                <Radio className="w-3.5 h-3.5 text-[#D7263D]" />
              )}
              <span className="text-[10px] tracking-[0.22em] uppercase">
                Secrets &amp; Tips
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
