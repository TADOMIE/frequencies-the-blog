import React, { useState, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowDown, ArrowUp, Menu, X, Lock, Unlock, Check } from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  auth,
  db,
  OWNER_EMAIL,
  signInOwner,
  signOutOwner,
  handleFirestoreError,
  OperationType,
} from './firebase';
import { ArtistCutoutSlot, VideoSlot } from './components/MediaSlots';
import { FrequencyTipBubble, playHarmonicChord } from './components/FrequencyTipBubble';

/**
 * Full artist list referenced across the blog marquee and eras
 */
const ARTISTS_LIST = [
  'Beatles',
  'Scorpions',
  'Dire Straits',
  'Pink Floyd',
  'Michael Jackson',
  'Stevie Wonder',
  'The Police',
  'Ben Webster',
  'The Eagles',
  'Queen',
  'ABBA',
  'Phil Collins',
  'Jay-Z',
  'Kanye West',
  'Kendrick Lamar',
  'Tyler the Creator',
  'Isaiah Rashad',
  'J. Cole',
  'Baby Keem',
  'Playboi Carti',
  'ASAP Rocky',
  'Travis Scott',
  'Mac Miller',
  'Lil Uzi Vert',
  'Lil Peep',
  'Alpha Wann',
  'Luidji',
  'Josman',
  'Jeune Lion',
  'Népal',
] as const;

/**
 * Subtle Wikipedia lookup map for all referenced artists and genres
 */
const WIKIPEDIA_LINKS: Record<string, string> = {
  Beatles: 'https://en.wikipedia.org/wiki/The_Beatles',
  Scorpions: 'https://en.wikipedia.org/wiki/Scorpions_(band)',
  'Dire Straits': 'https://en.wikipedia.org/wiki/Dire_Straits',
  'Pink Floyd': 'https://en.wikipedia.org/wiki/Pink_Floyd',
  'Michael Jackson': 'https://en.wikipedia.org/wiki/Michael_Jackson',
  'Stevie Wonder': 'https://en.wikipedia.org/wiki/Stevie_Wonder',
  'The Police': 'https://en.wikipedia.org/wiki/The_Police',
  'Ben Webster': 'https://en.wikipedia.org/wiki/Ben_Webster',
  'The Eagles': 'https://en.wikipedia.org/wiki/Eagles_(band)',
  Queen: 'https://en.wikipedia.org/wiki/Queen_(band)',
  ABBA: 'https://en.wikipedia.org/wiki/ABBA',
  'Phil Collins': 'https://en.wikipedia.org/wiki/Phil_Collins',
  'Jay-Z': 'https://en.wikipedia.org/wiki/Jay-Z',
  'Kanye West': 'https://en.wikipedia.org/wiki/Kanye_West',
  'Kendrick Lamar': 'https://en.wikipedia.org/wiki/Kendrick_Lamar',
  'Tyler the Creator': 'https://en.wikipedia.org/wiki/Tyler,_the_Creator',
  'Isaiah Rashad': 'https://en.wikipedia.org/wiki/Isaiah_Rashad',
  'Playboi Carti': 'https://en.wikipedia.org/wiki/Playboi_Carti',
  'ASAP Rocky': 'https://en.wikipedia.org/wiki/ASAP_Rocky',
  'Travis Scott': 'https://en.wikipedia.org/wiki/Travis_Scott',
  'Mac Miller': 'https://en.wikipedia.org/wiki/Mac_Miller',
  'Lil Uzi Vert': 'https://en.wikipedia.org/wiki/Lil_Uzi_Vert',
  'Lil Peep': 'https://en.wikipedia.org/wiki/Lil_Peep',
  'J. Cole': 'https://en.wikipedia.org/wiki/J._Cole',
  'Baby Keem': 'https://en.wikipedia.org/wiki/Baby_Keem',
  'Alpha Wann': 'https://fr.wikipedia.org/wiki/Alpha_Wann',
  Luidji: 'https://fr.wikipedia.org/wiki/Luidji',
  Josman: 'https://fr.wikipedia.org/wiki/Josman',
  'Jeune Lion': 'https://fr.wikipedia.org/wiki/Jeune_Lion',
  Népal: 'https://fr.wikipedia.org/wiki/N%C3%A9pal_(rappeur)',
  Jazz: 'https://en.wikipedia.org/wiki/Jazz',
};

function getArtistWikiUrl(artist: string): string {
  return (
    WIKIPEDIA_LINKS[artist] ||
    `https://en.wikipedia.org/wiki/${encodeURIComponent(artist.replace(/\s+/g, '_'))}`
  );
}

/**
 * 8 Distinct Audio Frequency / Oscilloscope Wave Patterns — one unique waveform per Entry Title
 */
const ENTRY_WAVE_PATTERNS: Record<
  string,
  { path: string; duration: string; dashArray: string }
> = {
  // 01. First Chords — Acoustic harmonic pluck oscillation
  'entry-01': {
    path: 'M 0 60 Q 70 15, 140 60 T 280 60 Q 340 28, 400 60 T 520 60 Q 580 42, 640 60 T 760 60 Q 820 50, 880 60 T 1000 60 L 1200 60',
    duration: '4.6s',
    dashArray: '460 1940',
  },
  // 02. Inherited Records — Classic vinyl warm analog rock/pop peaks
  'entry-02': {
    path: 'M 0 60 L 110 60 L 135 24 L 160 96 L 185 16 L 210 104 L 235 38 L 260 82 L 285 60 L 580 60 L 605 20 L 630 100 L 655 12 L 680 108 L 705 34 L 730 84 L 755 60 L 1200 60',
    duration: '3.9s',
    dashArray: '520 1880',
  },
  // 03. The Switch: Jazz — Syncopated swing brass improvisation wave
  'entry-03': {
    path: 'M 0 60 C 90 60, 120 10, 175 95 C 220 18, 260 102, 315 30 C 365 88, 410 38, 470 60 L 690 60 C 745 12, 790 108, 845 22 C 895 96, 940 35, 1000 60 L 1200 60',
    duration: '4.3s',
    dashArray: '500 1900',
  },
  // 04. Kendrick, Tyler & the New School — Sharp boom-bap / 808 transient spikes
  'entry-04': {
    path: 'M 0 60 L 90 60 L 105 8 L 120 112 L 135 18 L 150 102 L 165 60 L 420 60 L 435 6 L 450 114 L 465 14 L 480 106 L 495 30 L 510 90 L 525 60 L 820 60 L 835 10 L 850 110 L 865 24 L 880 96 L 895 60 L 1200 60',
    duration: '3.5s',
    dashArray: '560 1840',
  },
  // 05. Cloud Rap Years — Ethereal modulated synth-saw & atmospheric sub-bass wave
  'entry-05': {
    path: 'M 0 60 Q 50 5, 100 60 Q 150 115, 200 60 Q 250 18, 300 60 Q 350 102, 400 60 L 550 60 L 570 10 L 590 110 L 610 10 L 630 110 L 650 60 Q 730 14, 810 60 Q 890 106, 970 60 L 1200 60',
    duration: '4.8s',
    dashArray: '540 1860',
  },
  // 06. Back to the Words — Rapid-fire syllabic cadence & intricate multisyllabic meter
  'entry-06': {
    path: 'M 0 60 L 140 60 L 152 32 L 164 88 L 176 22 L 188 98 L 200 28 L 212 92 L 224 18 L 236 102 L 248 36 L 260 84 L 272 60 L 620 60 L 632 26 L 644 94 L 656 14 L 668 106 L 680 28 L 692 92 L 704 20 L 716 100 L 728 60 L 1200 60',
    duration: '3.7s',
    dashArray: '480 1920',
  },
  // 07. References & Culture — Interlocking dual-frequency cultural resonance pulse
  'entry-07': {
    path: 'M 0 60 L 180 60 L 210 14 L 240 106 L 270 60 L 330 60 L 360 26 L 390 94 L 420 60 L 660 60 L 690 8 L 720 112 L 750 22 L 780 98 L 810 60 L 960 60 L 990 30 L 1020 90 L 1050 60 L 1200 60',
    duration: '4.1s',
    dashArray: '510 1890',
  },
  // 08. Who I'll Probably Be — Ascending horizon carrier wave
  'entry-08': {
    path: 'M 0 60 L 220 60 Q 260 45, 300 60 Q 340 75, 380 60 L 520 60 L 550 28 L 580 92 L 610 16 L 640 104 L 670 8 L 700 112 L 730 20 L 760 96 L 790 40 L 820 60 L 1200 60',
    duration: '4.4s',
    dashArray: '530 1870',
  },
};

export type EraKey = 'Who I Was' | 'Who I Am' | "Who I'll Be";

export interface BlogEntryData {
  id: string;
  number: string;
  title: string;
  era: EraKey;
  artistTags: string[];
  accentVariant: 'red' | 'black';
  text: string;
  photoUrl: string;
  videoUrl: string;
  videoType: 'file' | 'link' | null;
}

/**
 * Initial 8 blog entries with exact titles, grouped under the three eras,
 * and completely empty editable text, photo, and video slots.
 */
const INITIAL_ENTRIES: BlogEntryData[] = [
  {
    id: 'entry-01',
    number: '01',
    title: 'First Chords',
    era: 'Who I Was',
    artistTags: [],
    accentVariant: 'red',
    text: '',
    photoUrl: '',
    videoUrl: '',
    videoType: null,
  },
  {
    id: 'entry-02',
    number: '02',
    title: 'Inherited Records',
    era: 'Who I Was',
    artistTags: [
      'Beatles',
      'Scorpions',
      'Dire Straits',
      'Pink Floyd',
      'Michael Jackson',
      'Stevie Wonder',
      'The Police',
      'The Eagles',
      'Queen',
      'ABBA',
      'Phil Collins',
    ],
    accentVariant: 'black',
    text: '',
    photoUrl: '',
    videoUrl: '',
    videoType: null,
  },
  {
    id: 'entry-03',
    number: '03',
    title: 'The Switch: Jazz',
    era: 'Who I Was',
    artistTags: ['Jazz', 'Ben Webster'],
    accentVariant: 'red',
    text: '',
    photoUrl: '',
    videoUrl: '',
    videoType: null,
  },
  {
    id: 'entry-04',
    number: '04',
    title: 'Kendrick, Tyler & the New School',
    era: 'Who I Am',
    artistTags: [
      'Jay-Z',
      'Kanye West',
      'Kendrick Lamar',
      'Tyler the Creator',
      'Isaiah Rashad',
      'J. Cole',
      'Baby Keem',
    ],
    accentVariant: 'black',
    text: '',
    photoUrl: '',
    videoUrl: '',
    videoType: null,
  },
  {
    id: 'entry-05',
    number: '05',
    title: 'Cloud Rap Years',
    era: 'Who I Am',
    artistTags: [
      'Playboi Carti',
      'ASAP Rocky',
      'Travis Scott',
      'Mac Miller',
      'Lil Uzi Vert',
      'Lil Peep',
    ],
    accentVariant: 'red',
    text: '',
    photoUrl: '',
    videoUrl: '',
    videoType: null,
  },
  {
    id: 'entry-06',
    number: '06',
    title: 'Back to the Words',
    era: 'Who I Am',
    artistTags: ['Alpha Wann', 'Luidji', 'Josman', 'Jeune Lion', 'Népal'],
    accentVariant: 'black',
    text: '',
    photoUrl: '',
    videoUrl: '',
    videoType: null,
  },
  {
    id: 'entry-07',
    number: '07',
    title: 'References & Culture',
    era: "Who I'll Be",
    artistTags: [],
    accentVariant: 'red',
    text: '',
    photoUrl: '',
    videoUrl: '',
    videoType: null,
  },
  {
    id: 'entry-08',
    number: '08',
    title: "Who I'll Probably Be",
    era: "Who I'll Be",
    artistTags: [],
    accentVariant: 'black',
    text: '',
    photoUrl: '',
    videoUrl: '',
    videoType: null,
  },
];

const ERAS: { key: EraKey; index: string; range: string }[] = [
  { key: 'Who I Was', index: 'I', range: '01 — 03' },
  { key: 'Who I Am', index: 'II', range: '04 — 06' },
  { key: "Who I'll Be", index: 'III', range: '07 — 08' },
];

export default function App() {
  const [entries, setEntries] = useState<BlogEntryData[]>(INITIAL_ENTRIES);
  const [authorPhotoUrl, setAuthorPhotoUrl] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const [authPending, setAuthPending] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [vinylMode, setVinylMode] = useState(false);
  const [overdriveActive, setOverdriveActive] = useState(false);

  const entriesRef = useRef<BlogEntryData[]>(entries);
  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  const authorPhotoRef = useRef<string>(authorPhotoUrl);
  useEffect(() => {
    authorPhotoRef.current = authorPhotoUrl;
  }, [authorPhotoUrl]);

  const textDebounceTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const triggerOverdrive = () => {
    setOverdriveActive(true);
    setTimeout(() => {
      setOverdriveActive(false);
    }, 5000);
  };

  // By default, the website is locked (read-only visitor state).
  // Only when the owner (tadominohero@gmail.com) connects via Google Sign-In does `isOwner` become true.
  const isOwner = Boolean(
    currentUser &&
      currentUser.emailVerified &&
      currentUser.email?.toLowerCase() === OWNER_EMAIL.toLowerCase()
  );

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (
        user &&
        user.emailVerified &&
        user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase()
      ) {
        setAuthNotice(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to each of the 8 known blog entry documents by ID (uses `get` permission, never `list`)
  useEffect(() => {
    const unsubscribes = INITIAL_ENTRIES.map((initialEntry) => {
      const entryDocRef = doc(db, 'entries', initialEntry.id);
      return onSnapshot(
        entryDocRef,
        (docSnap) => {
          if (!docSnap.exists()) return;
          // Ignore local pending echoes while typing so the cursor never jumps
          if (docSnap.metadata.hasPendingWrites) return;
          const data = docSnap.data();
          setEntries((prev) =>
            prev.map((item) =>
              item.id === initialEntry.id
                ? {
                    ...item,
                    text: typeof data.text === 'string' ? data.text : '',
                    photoUrl: typeof data.photoUrl === 'string' ? data.photoUrl : '',
                    videoUrl: typeof data.videoUrl === 'string' ? data.videoUrl : '',
                    videoType:
                      data.videoType === 'file' || data.videoType === 'link'
                        ? data.videoType
                        : null,
                  }
                : item
            )
          );
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, `entries/${initialEntry.id}`);
        }
      );
    });

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, []);

  // Subscribe to author profile photo from Firestore
  useEffect(() => {
    const profileRef = doc(db, 'settings', 'profile');
    const unsubscribe = onSnapshot(
      profileRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (typeof data.authorPhotoUrl === 'string') {
            setAuthorPhotoUrl(data.authorPhotoUrl);
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'settings/profile');
      }
    );

    return () => unsubscribe();
  }, []);

  const persistEntryChange = async (updatedEntry: BlogEntryData) => {
    if (!auth.currentUser) return;
    const path = `entries/${updatedEntry.id}`;
    setSaveStatus('saving');
    try {
      await setDoc(doc(db, 'entries', updatedEntry.id), {
        id: updatedEntry.id.slice(0, 64),
        text: updatedEntry.text.slice(0, 50000),
        photoUrl: updatedEntry.photoUrl.slice(0, 800000),
        videoUrl: updatedEntry.videoUrl.slice(0, 4096),
        videoType: updatedEntry.videoType ?? 'none',
        updatedAt: serverTimestamp(),
      });
      setSaveStatus('saved');
    } catch (error) {
      setSaveStatus('idle');
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const updateEntryText = (id: string, text: string) => {
    if (!isOwner) return;
    setSaveStatus('saving');
    setEntries((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const next = { ...item, text };
          if (textDebounceTimersRef.current[id]) {
            clearTimeout(textDebounceTimersRef.current[id]);
          }
          textDebounceTimersRef.current[id] = setTimeout(() => {
            void persistEntryChange(next);
          }, 350);
          return next;
        }
        return item;
      })
    );
  };

  const updateEntryPhoto = (id: string, photoUrl: string) => {
    if (!isOwner) return;
    setEntries((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const next = { ...item, photoUrl };
          void persistEntryChange(next);
          return next;
        }
        return item;
      })
    );
  };

  const updateEntryVideo = (
    id: string,
    videoUrl: string,
    videoType: 'file' | 'link' | null
  ) => {
    if (!isOwner) return;
    setEntries((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const next = { ...item, videoUrl, videoType };
          void persistEntryChange(next);
          return next;
        }
        return item;
      })
    );
  };

  const handleUpdateAuthorPhoto = async (photoUrl: string) => {
    if (!isOwner) return;
    setAuthorPhotoUrl(photoUrl);
    setSaveStatus('saving');
    try {
      await setDoc(doc(db, 'settings', 'profile'), {
        authorPhotoUrl: photoUrl.slice(0, 800000),
        updatedAt: serverTimestamp(),
      });
      setSaveStatus('saved');
    } catch (error) {
      setSaveStatus('idle');
      handleFirestoreError(error, OperationType.WRITE, 'settings/profile');
    }
  };

  /**
   * Flushes all current entries and the author photo to Firestore while still authenticated,
   * and then signs out to lock the website into read-only mode with all changes live.
   */
  const saveAllAndLock = async () => {
    if (authPending) return;
    setAuthPending(true);
    setSaveStatus('saving');

    // Clear any pending debounce timers and write latest state immediately
    Object.values(textDebounceTimersRef.current).forEach(clearTimeout);
    textDebounceTimersRef.current = {};

    try {
      if (isOwner && auth.currentUser) {
        await Promise.all([
          ...entriesRef.current.map((entry) =>
            setDoc(doc(db, 'entries', entry.id), {
              id: entry.id.slice(0, 64),
              text: entry.text.slice(0, 50000),
              photoUrl: entry.photoUrl.slice(0, 800000),
              videoUrl: entry.videoUrl.slice(0, 4096),
              videoType: entry.videoType ?? 'none',
              updatedAt: serverTimestamp(),
            })
          ),
          setDoc(doc(db, 'settings', 'profile'), {
            authorPhotoUrl: authorPhotoRef.current.slice(0, 800000),
            updatedAt: serverTimestamp(),
          }),
        ]);
      }
      setSaveStatus('saved');
      await signOutOwner();
    } catch (error) {
      console.error('Error saving before lock:', error);
    } finally {
      setAuthPending(false);
    }
  };

  const handleOwnerAuthToggle = async () => {
    if (authPending) return;
    setAuthNotice(null);

    // If currently signed in as owner, flush all changes to Firestore first and then lock
    if (currentUser) {
      await saveAllAndLock();
      return;
    }

    // Require owner Google Sign-In to unlock editing
    setAuthPending(true);
    try {
      const result = await signInOwner();
      if (result?.user) {
        if (result.user.email?.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
          setAuthNotice('Access denied: only Guindo Luc can edit this blog.');
          await signOutOwner();
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        !msg.includes('auth/cancelled-popup-request') &&
        !msg.includes('auth/popup-closed-by-user')
      ) {
        setAuthNotice('Sign-in failed. Allow popups to connect as owner.');
      }
    } finally {
      setAuthPending(false);
    }
  };

  const scrollToElement = (elementId: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  };

  return (
    <div id="top" className="min-h-screen bg-[#FFFFFF] text-[#0A0A0A] selection:bg-[#D7263D] selection:text-[#FFFFFF]">
      {/* Top Bar Navigation (Strict 3-Zone Contract + Mobile Menu Drawer) */}
      <header className="sticky top-0 z-50 bg-[#FFFFFF]/95 backdrop-blur-sm border-b border-[#0A0A0A]/12">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          {/* Zone 1: Single Text Element Wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              scrollToElement('top');
            }}
            className="text-sm font-light tracking-[0.28em] uppercase text-[#0A0A0A] hover:text-[#D7263D] transition-colors whitespace-nowrap"
          >
            Frequencies <span className="text-[#D7263D] mx-1.5" aria-hidden="true">·</span> <span className="text-[#1D3045]">Guindo Luc</span>
          </a>

          {/* Zone 2: Clean Text Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-[11px] tracking-[0.22em] uppercase text-[#1D3045]">
            <button
              type="button"
              onClick={() => scrollToElement('timeline-index')}
              className="hover:text-[#D7263D] transition-colors whitespace-nowrap cursor-pointer"
            >
              Timeline Index
            </button>
            <button
              type="button"
              onClick={() => scrollToElement('entry-01')}
              className="hover:text-[#D7263D] transition-colors whitespace-nowrap cursor-pointer"
            >
              Who I Was
            </button>
            <button
              type="button"
              onClick={() => scrollToElement('entry-04')}
              className="hover:text-[#D7263D] transition-colors whitespace-nowrap cursor-pointer"
            >
              Who I Am
            </button>
            <button
              type="button"
              onClick={() => scrollToElement('entry-07')}
              className="hover:text-[#D7263D] transition-colors whitespace-nowrap cursor-pointer"
            >
              Who I&apos;ll Be
            </button>
          </nav>

          {/* Zone 3: Primary Action / Mobile Trigger */}
          <div className="flex items-center gap-3">
            {isOwner ? (
              <button
                type="button"
                onClick={saveAllAndLock}
                disabled={authPending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#D7263D] text-[#FFFFFF] text-[10px] tracking-[0.22em] uppercase hover:bg-[#0A0A0A] disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
                title="Save all changes live to the website and lock Owner Mode"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{authPending ? 'Saving...' : 'Save & Lock'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => scrollToElement('timeline-index')}
                className="hidden md:inline-flex items-center gap-2 px-4 py-2 border border-[#0A0A0A] text-[10px] tracking-[0.22em] uppercase text-[#0A0A0A] hover:bg-[#D7263D] hover:border-[#D7263D] hover:text-[#FFFFFF] transition-colors whitespace-nowrap cursor-pointer"
              >
                <span>8 Entries</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#0A0A0A] hover:text-[#D7263D] transition-colors cursor-pointer"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#FFFFFF] border-b border-[#0A0A0A] px-6 py-8 space-y-6">
            <div className="space-y-3">
              <div className="text-[10px] tracking-[0.25em] uppercase text-[#1D3045]">
                Eras
              </div>
              <div className="flex flex-col items-start gap-2.5">
                <button
                  type="button"
                  onClick={() => scrollToElement('timeline-index')}
                  className="text-sm uppercase tracking-[0.18em] text-[#D7263D] font-medium cursor-pointer"
                >
                  Timeline Index
                </button>
                <button
                  type="button"
                  onClick={() => scrollToElement('entry-01')}
                  className="text-sm uppercase tracking-[0.18em] text-[#0A0A0A] hover:text-[#D7263D] cursor-pointer"
                >
                  I. Who I Was
                </button>
                <button
                  type="button"
                  onClick={() => scrollToElement('entry-04')}
                  className="text-sm uppercase tracking-[0.18em] text-[#0A0A0A] hover:text-[#D7263D] cursor-pointer"
                >
                  II. Who I Am
                </button>
                <button
                  type="button"
                  onClick={() => scrollToElement('entry-07')}
                  className="text-sm uppercase tracking-[0.18em] text-[#0A0A0A] hover:text-[#D7263D] cursor-pointer"
                >
                  III. Who I&apos;ll Be
                </button>
              </div>
            </div>

            <div className="border-t border-[#0A0A0A]/12 pt-5 space-y-3">
              <div className="text-[10px] tracking-[0.25em] uppercase text-[#1D3045]">
                Entries (01 — 08)
              </div>
              <div className="grid grid-cols-1 gap-2">
                {entries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => scrollToElement(entry.id)}
                    className="flex items-baseline gap-3 text-left py-1 text-xs uppercase tracking-[0.14em] text-[#0A0A0A] hover:text-[#D7263D] transition-colors cursor-pointer"
                  >
                    <span className="text-[#D7263D] tabular-nums font-medium">{entry.number}</span>
                    <span className="truncate">{entry.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* 1. HERO SECTION: Full-viewport, oversized uppercase light headline with red frequency wave passing through, subtitle, slow artist marquee, scroll cue */}
      <section className="relative min-h-[calc(100vh-4rem)] flex flex-col justify-between bg-[#FFFFFF] border-b border-[#0A0A0A]">
        {/* Main Hero Editorial Stage */}
        <div className="max-w-[1440px] w-full mx-auto px-6 md:px-12 pt-14 md:pt-24 pb-12 flex-1 flex flex-col justify-between">
          {/* Top Micro-Label Row (CSS selector 3 target: first span is "Blog") */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#0A0A0A]/12 pb-4">
            <div className="flex items-center gap-2.5 text-[11px] tracking-[0.26em] uppercase text-[#1D3045]">
              <span>Blog</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">08 Chapters</span>
            </div>
            <div className="text-[11px] tracking-[0.26em] uppercase text-[#D7263D]">
              Who I Was · Who I Am · Who I&apos;ll Be
            </div>
          </div>

          {/* Center Oversized Uppercase Helvetica-Style Headline with Red Audio Frequency Wave */}
          <div className="my-auto py-12 md:py-20">
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1
                onDoubleClick={() => {
                  playHarmonicChord([216, 324, 432, 540, 648], 'triangle', 1.9);
                  triggerOverdrive();
                }}
                title="Double-click for 432 Hz Harmonic Overdrive"
                className="relative inline-block text-[clamp(3.25rem,11.5vw,10.5rem)] font-extralight uppercase tracking-[-0.035em] leading-[0.88] text-[#0A0A0A] select-none cursor-pointer"
              >
                <span className="relative z-10">Frequencies</span>

                {/* Red Audio Frequency / Oscilloscope Wave Passing Through the Title */}
                <svg
                  aria-hidden="true"
                  viewBox="0 0 1200 120"
                  preserveAspectRatio="none"
                  className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 w-full h-[58%] z-20 overflow-visible"
                >
                  {/* Baseline subtle red carrier trace */}
                  <path
                    d="M 0 60 L 140 60 L 165 44 L 185 78 L 210 22 L 235 98 L 260 10 L 285 108 L 310 34 L 335 76 L 360 60 L 540 60 L 565 48 L 585 74 L 610 14 L 635 106 L 660 6 L 685 114 L 710 26 L 735 84 L 760 52 L 780 60 L 940 60 L 965 42 L 990 82 L 1015 18 L 1040 102 L 1065 28 L 1090 78 L 1115 60 L 1200 60"
                    fill="none"
                    stroke="#D7263D"
                    strokeWidth={overdriveActive ? '2.5' : '1.5'}
                    strokeOpacity={overdriveActive ? '0.5' : '0.24'}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Traveling active red audio frequency pulse */}
                  <path
                    d="M 0 60 L 140 60 L 165 44 L 185 78 L 210 22 L 235 98 L 260 10 L 285 108 L 310 34 L 335 76 L 360 60 L 540 60 L 565 48 L 585 74 L 610 14 L 635 106 L 660 6 L 685 114 L 710 26 L 735 84 L 760 52 L 780 60 L 940 60 L 965 42 L 990 82 L 1015 18 L 1040 102 L 1065 28 L 1090 78 L 1115 60 L 1200 60"
                    fill="none"
                    stroke="#D7263D"
                    strokeWidth={overdriveActive ? '5.2' : '3.2'}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="animate-freq-wave"
                    style={overdriveActive ? { animationDuration: '1.2s' } : undefined}
                  />
                </svg>
              </h1>

              {/* Thin Red Line that draws in under the headline */}
              <motion.div
                initial={prefersReducedMotion ? false : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="h-[2px] bg-[#D7263D] origin-left mt-6 md:mt-8 mb-8 md:mb-10"
              />
            </motion.div>

            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end"
            >
              <p className="md:col-span-8 text-lg md:text-2xl lg:text-[28px] font-light leading-[1.35] tracking-[-0.01em] text-[#0A0A0A] max-w-3xl">
                How music through the years shaped who I was, who I am, and who I will probably be.
              </p>

              {/* Scroll Cue */}
              <div className="md:col-span-4 flex md:justify-end">
                <button
                  type="button"
                  onClick={() => scrollToElement('timeline-index')}
                  className="group inline-flex items-center gap-3 text-[11px] tracking-[0.26em] uppercase text-[#1D3045] hover:text-[#D7263D] transition-colors cursor-pointer"
                >
                  <span>Scroll to Index</span>
                  <span className="w-8 h-8 border border-[#0A0A0A] group-hover:border-[#D7263D] group-hover:bg-[#D7263D] group-hover:text-[#FFFFFF] flex items-center justify-center transition-colors">
                    <ArrowDown className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-y-0.5" />
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Slow Marquee of Artist Names in Hero (Subtle Wikipedia Links) */}
        <div
          className="border-t border-[#0A0A0A] bg-[#FFFFFF] py-4 overflow-hidden"
          aria-label="Referenced artists marquee"
        >
          <div className="animate-marquee flex items-center">
            {[0, 1].map((dupIndex) => (
              <div key={dupIndex} className="flex items-center shrink-0">
                {ARTISTS_LIST.map((artist) => (
                  <div key={`${dupIndex}-${artist}`} className="flex items-center">
                    <a
                      href={getArtistWikiUrl(artist)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs md:text-sm font-light uppercase tracking-[0.28em] text-[#0A0A0A] px-6 whitespace-nowrap no-underline hover:text-[#0A0A0A] cursor-pointer"
                    >
                      {artist}
                    </a>
                    <span className="text-[#D7263D] text-xs select-none" aria-hidden="true">
                      ·
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. TIMELINE INDEX: Three eras (Who I Was / Who I Am / Who I'll Be) with the 8 entries listed under them */}
      <section
        id="timeline-index"
        className="py-24 md:py-36 border-b border-[#0A0A0A] bg-[#FFFFFF]"
      >
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          {/* Section Header */}
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-16 md:mb-24"
          >
            <div className="flex items-center justify-between text-[11px] tracking-[0.26em] uppercase text-[#1D3045] mb-4">
              <span>Index</span>
              <span className="tabular-nums">01 — 08</span>
            </div>
            <h2 className="text-4xl md:text-6xl lg:text-7xl font-extralight uppercase tracking-[-0.025em] leading-[0.95] text-[#0A0A0A]">
              Three Eras
            </h2>
            <motion.div
              initial={prefersReducedMotion ? false : { scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="h-[2px] bg-[#D7263D] origin-left mt-5"
            />
          </motion.div>

          {/* Three Era Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 border-t border-l border-[#0A0A0A]">
            {ERAS.map((era, eraIdx) => {
              const eraEntries = entries.filter((e) => e.era === era.key);
              return (
                <motion.div
                  key={era.key}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{
                    duration: 0.6,
                    delay: eraIdx * 0.1,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="border-r border-b border-[#0A0A0A] p-8 md:p-10 flex flex-col justify-between bg-[#FFFFFF]"
                >
                  {/* Era Top Meta & Title */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] tracking-[0.24em] uppercase text-[#1D3045] mb-6">
                      <span>Era {era.index}</span>
                      <span className="tabular-nums text-[#D7263D]">{era.range}</span>
                    </div>

                    <h3 className="text-3xl md:text-4xl font-extralight uppercase tracking-[-0.02em] text-[#0A0A0A] mb-8">
                      {era.key}
                    </h3>

                    {/* Entries under this era */}
                    <ul className="divide-y divide-[#0A0A0A]/15 border-t border-b border-[#0A0A0A]/15">
                      {eraEntries.map((entry) => (
                        <li key={entry.id}>
                          <button
                            type="button"
                            onClick={() => scrollToElement(entry.id)}
                            className="w-full py-5 text-left group flex items-baseline justify-between gap-4 cursor-pointer transition-transform duration-200 ease-out hover:translate-x-1.5"
                          >
                            <div className="flex items-baseline gap-4 min-w-0">
                              <span className="text-xs tracking-[0.2em] uppercase text-[#D7263D] tabular-nums font-medium shrink-0">
                                {entry.number}
                              </span>
                              <span className="text-lg md:text-xl font-light uppercase tracking-[-0.01em] text-[#0A0A0A] group-hover:text-[#D7263D] transition-colors">
                                {entry.title}
                              </span>
                            </div>
                            <span className="text-[10px] tracking-[0.22em] uppercase text-[#1D3045] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              Read
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Era Artist Tags Summary (Unboxed clean metadata with subtle Wikipedia links) */}
                  <div className="mt-10 pt-4">
                    <div className="text-[10px] tracking-[0.22em] uppercase text-[#1D3045]/70 mb-2">
                      Referenced Artists
                    </div>
                    <div className="text-xs text-[#1D3045] leading-relaxed">
                      {eraEntries.flatMap((e) => e.artistTags).length > 0 ? (
                        eraEntries
                          .flatMap((e) => e.artistTags)
                          .map((artist, i, arr) => (
                            <React.Fragment key={artist}>
                              <a
                                href={getArtistWikiUrl(artist)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="uppercase tracking-[0.12em] text-inherit no-underline hover:text-inherit cursor-pointer"
                              >
                                {artist}
                              </a>
                              {i < arr.length - 1 && (
                                <span className="mx-2 text-[#D7263D]" aria-hidden="true">
                                  ·
                                </span>
                              )}
                            </React.Fragment>
                          ))
                      ) : (
                        <span className="uppercase tracking-[0.14em] text-[#1D3045]/60">
                          Personal Instrumentation &amp; Cultural Synthesis
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. EIGHT ENTRY SECTIONS */}
      <main>
        {entries.map((entry) => (
          <article
            key={entry.id}
            id={entry.id}
            className="py-24 md:py-36 border-b border-[#0A0A0A] bg-[#FFFFFF] scroll-mt-16 group/entry"
          >
            <div className="max-w-[1440px] mx-auto px-6 md:px-12">
              {/* Entry Top Metadata Row */}
              <motion.div
                initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex flex-wrap items-center justify-between gap-4 text-[11px] tracking-[0.24em] uppercase text-[#1D3045] mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-[#D7263D] font-medium tabular-nums">
                      Entry {entry.number}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{entry.era}</span>
                  </div>

                  {/* Clean unboxed artist tags for this entry (Subtle Wikipedia links) */}
                  {entry.artistTags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-y-1 text-[11px] tracking-[0.18em] uppercase text-[#1D3045]">
                      {entry.artistTags.map((artist, idx) => (
                        <React.Fragment key={artist}>
                          <a
                            href={getArtistWikiUrl(artist)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#0A0A0A] no-underline hover:text-[#0A0A0A] cursor-pointer"
                          >
                            {artist}
                          </a>
                          {idx < entry.artistTags.length - 1 && (
                            <span className="mx-2 text-[#D7263D]" aria-hidden="true">
                              ·
                            </span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>

                {/* Oversized Uppercase Entry Headline with Unique Frequency Wave per Entry */}
                <div className="flex flex-col md:flex-row md:items-baseline gap-4 md:gap-8">
                  <span className="text-4xl md:text-6xl lg:text-7xl font-extralight tabular-nums text-[#D7263D] leading-none select-none">
                    {entry.number}
                  </span>
                  <h2 className="relative inline-block text-4xl sm:text-5xl md:text-7xl lg:text-[84px] font-extralight uppercase tracking-[-0.03em] leading-[0.92] text-[#0A0A0A] transition-transform duration-300 ease-out group-hover/entry:translate-x-1">
                    <span className="relative z-10">{entry.title}</span>
                    {ENTRY_WAVE_PATTERNS[entry.id] && (
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 1200 120"
                        preserveAspectRatio="none"
                        className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 w-full h-[56%] z-20 overflow-visible"
                      >
                        <path
                          d={ENTRY_WAVE_PATTERNS[entry.id].path}
                          fill="none"
                          stroke="#D7263D"
                          strokeWidth="1.4"
                          strokeOpacity="0.22"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d={ENTRY_WAVE_PATTERNS[entry.id].path}
                          fill="none"
                          stroke="#D7263D"
                          strokeWidth="2.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="animate-freq-wave"
                          style={{
                            strokeDasharray: ENTRY_WAVE_PATTERNS[entry.id].dashArray,
                            animationDuration: ENTRY_WAVE_PATTERNS[entry.id].duration,
                          }}
                        />
                      </svg>
                    )}
                  </h2>
                </div>

                {/* Thin Red Line that draws in under each headline */}
                <motion.div
                  initial={prefersReducedMotion ? false : { scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.85, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="h-[2px] bg-[#D7263D] origin-left mt-6 md:mt-8 mb-14 md:mb-20"
                />
              </motion.div>

              {/* Entry Content Grid: Left = Text Area (Editable for Owner, Read-Only for Visitors) | Right = Reusable Artist Photo Cutout Slot + Video Slot */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
                {/* Left Column (7 cols): Entry Text */}
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="lg:col-span-7 flex flex-col"
                >
                  <div className="flex items-center justify-between border-b border-[#0A0A0A]/15 pb-2.5 mb-5">
                    <label
                      htmlFor={`textarea-${entry.id}`}
                      className="text-[11px] tracking-[0.22em] uppercase text-[#1D3045] font-medium"
                    >
                      {entry.number} · Entry Text
                    </label>
                    <span className="text-[11px] tracking-[0.18em] uppercase text-[#1D3045]/70 tabular-nums">
                      {entry.text.trim()
                        ? `${entry.text.trim().split(/\s+/).length} words`
                        : isOwner
                        ? 'Blank Slot'
                        : 'Pending'}
                    </span>
                  </div>

                  {isOwner ? (
                    <div className="space-y-3">
                      <textarea
                        id={`textarea-${entry.id}`}
                        value={entry.text}
                        onChange={(e) => updateEntryText(entry.id, e.target.value)}
                        placeholder={`Write "${entry.title}" here...`}
                        rows={18}
                        className="w-full min-h-[420px] p-6 bg-[#FFFFFF] border border-[#0A0A0A]/15 focus:border-[#D7263D] focus:outline-none text-base md:text-lg font-light leading-[1.75] text-[#0A0A0A] placeholder:text-[#1D3045]/35 resize-y transition-colors"
                      />
                      <div className="flex items-center justify-between text-[10px] tracking-[0.2em] uppercase text-[#1D3045]">
                        <span>
                          {saveStatus === 'saving'
                            ? 'Syncing live changes...'
                            : saveStatus === 'saved'
                            ? 'All changes saved live'
                            : 'Owner Edit Mode'}
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => void persistEntryChange(entry)}
                            className="px-3 py-1.5 border border-[#0A0A0A] text-[#0A0A0A] hover:border-[#D7263D] hover:text-[#D7263D] transition-colors cursor-pointer"
                          >
                            Save Entry
                          </button>
                          <button
                            type="button"
                            onClick={saveAllAndLock}
                            className="px-3 py-1.5 bg-[#0A0A0A] text-[#FFFFFF] hover:bg-[#D7263D] transition-colors cursor-pointer"
                          >
                            Save &amp; Lock
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full min-h-[420px] p-6 bg-[#FFFFFF] border border-[#0A0A0A]/15 text-base md:text-lg font-light leading-[1.75] text-[#0A0A0A] whitespace-pre-wrap">
                      {entry.text.trim() ? (
                        entry.text
                      ) : (
                        <span className="text-xs tracking-[0.22em] uppercase text-[#1D3045]/45">
                          Entry text coming soon.
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>

                {/* Right Column (5 cols): Reusable Photo / Artist Cutout Slot + Video Slot */}
                <motion.div
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="lg:col-span-5 space-y-12"
                >
                  <ArtistCutoutSlot
                    entryNumber={entry.number}
                    entryTitle={entry.title}
                    photoUrl={entry.photoUrl}
                    onUpdatePhoto={(url) => updateEntryPhoto(entry.id, url)}
                    accentVariant={entry.accentVariant}
                    isOwner={isOwner}
                  />

                  <VideoSlot
                    entryNumber={entry.number}
                    entryTitle={entry.title}
                    videoUrl={entry.videoUrl}
                    videoType={entry.videoType}
                    onUpdateVideo={(url, type) => updateEntryVideo(entry.id, url, type)}
                    isOwner={isOwner}
                  />
                </motion.div>
              </div>
            </div>
          </article>
        ))}
      </main>

      {/* 4. FOOTER: Closing note, compact author photo slot for Guindo Luc, blog title, owner lock toggle, and back-to-top link */}
      <footer className="bg-[#FFFFFF] py-16 md:py-24">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 space-y-14">
          {/* CSS selector 1 target: Footer first inner div with much smaller personal photo slot */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="text-[11px] tracking-[0.24em] uppercase text-[#1D3045]">
                Author Note · Guindo Luc
              </div>
              <blockquote className="border-l-2 border-[#D7263D] pl-6 py-1 space-y-2">
                <p className="text-lg md:text-2xl font-light leading-relaxed text-[#0A0A0A]">
                  &ldquo;Music can save a life. It saved mine. It gave me a way to express what I was going through without resorting to the violence that was all around me.&rdquo;
                </p>
                <footer className="text-xs tracking-[0.2em] uppercase text-[#1D3045]">
                  —{' '}
                  <a
                    href={getArtistWikiUrl('Kendrick Lamar')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-inherit no-underline hover:text-inherit cursor-pointer"
                  >
                    Kendrick Lamar
                  </a>
                </footer>
              </blockquote>
            </div>

            {/* Much smaller compact personal photo slot (w-36 / 144px) */}
            <div className="w-36 sm:w-40 shrink-0">
              <ArtistCutoutSlot
                entryNumber="Me"
                entryTitle="Guindo Luc"
                photoUrl={authorPhotoUrl}
                onUpdatePhoto={handleUpdateAuthorPhoto}
                accentVariant="red"
                isOwner={isOwner}
                compact
              />
            </div>
          </div>

          <div className="pt-8 border-t border-[#0A0A0A]/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex flex-wrap items-baseline gap-3 text-2xl md:text-3xl font-extralight uppercase tracking-[0.22em] text-[#0A0A0A]">
              <span>Frequencies</span>
              <span className="text-[#D7263D]" aria-hidden="true">·</span>
              <span className="text-base md:text-xl text-[#1D3045] tracking-[0.2em]">Guindo Luc</span>
            </div>

            <div className="flex items-center gap-6">
              {authNotice && (
                <span className="text-[10px] tracking-[0.18em] uppercase text-[#D7263D]">
                  {authNotice}
                </span>
              )}
              {/* Subtle Owner Edit Mode Authentication Control */}
              <button
                type="button"
                onClick={handleOwnerAuthToggle}
                disabled={authPending}
                className="inline-flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase text-[#1D3045]/75 hover:text-[#D7263D] disabled:opacity-50 transition-colors cursor-pointer"
                title={
                  isOwner
                    ? 'Save all changes live and lock the website into read-only mode.'
                    : 'Connect as owner (Guindo Luc) to edit blog content'
                }
              >
                {isOwner ? (
                  <>
                    <Unlock className="w-3 h-3 text-[#D7263D]" />
                    <span>{authPending ? 'Saving & Locking...' : 'Save & Lock Owner Mode'}</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3" />
                    <span>Owner Access</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => scrollToElement('top')}
                className="group inline-flex items-center gap-3 text-[11px] tracking-[0.26em] uppercase text-[#1D3045] hover:text-[#D7263D] transition-colors cursor-pointer"
              >
                <span>Back to Top</span>
                <span className="w-8 h-8 border border-[#0A0A0A] group-hover:border-[#D7263D] group-hover:bg-[#D7263D] group-hover:text-[#FFFFFF] flex items-center justify-center transition-colors">
                  <ArrowUp className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-y-0.5" />
                </span>
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Tips & Easter Eggs Bubble (Appears once on load and reappears every 10 minutes) */}
      <FrequencyTipBubble
        onJumpToEntry={scrollToElement}
        vinylMode={vinylMode}
        onToggleVinylMode={() => setVinylMode((v) => !v)}
        overdriveActive={overdriveActive}
        onTriggerOverdrive={triggerOverdrive}
      />
    </div>
  );
}
