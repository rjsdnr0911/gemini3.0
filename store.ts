
import { create } from 'zustand';
import { GameState, WeaponType, MatchStats, WeaponStats } from './types';
import { WEAPONS } from './constants';

interface GameStore {
  gameState: GameState;
  setGameState: (state: GameState) => void;

  // Player State
  health: number;
  currentWeapon: WeaponType;
  ammo: Record<WeaponType, number>;
  isReloading: boolean;
  setHealth: (hp: number) => void;
  switchWeapon: (weapon: WeaponType) => void;
  decrementAmmo: () => void;
  reloadWeapon: () => void;
  setReloading: (status: boolean) => void;

  // Score
  playerScore: number;
  enemyScore: number;
  incrementPlayerScore: () => void;
  incrementEnemyScore: () => void;

  // Stats for Gemini & UX
  stats: MatchStats;
  lastHitTime: number; // For Hit Marker
  recordShot: (hit: boolean) => void;
  resetGame: () => void;
  setAnalysis: (analysis: string) => void;
  // Kill Feed & Banner
  killFeed: { killer: string, victim: string, weapon: string, id: number }[];
  killBanner: { count: number, visible: boolean } | null;
  addKillFeed: (killer: string, victim: string, weapon: string) => void;
  showKillBanner: (count: number) => void;

  analysisResult: string;
}

const INITIAL_STATS: MatchStats = {
  playerKills: 0,
  enemyKills: 0,
  shotsFired: 0,
  shotsHit: 0,
  startTime: 0,
  endTime: 0,
  winningWeapon: 'None'
};

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: GameState.MENU,
  setGameState: (state) => {
    const current = get().gameState;
    // Start timer when entering game
    if (state === GameState.PLAYING && current !== GameState.PLAYING) {
      set((s) => ({ stats: { ...s.stats, startTime: Date.now() } }));
    }
    // End timer when game over
    if (state === GameState.GAME_OVER) {
      set((s) => ({ stats: { ...s.stats, endTime: Date.now() } }));
    }
    set({ gameState: state });
  },

  health: 100,
  currentWeapon: WeaponType.RIFLE,
  ammo: {
    [WeaponType.RIFLE]: WEAPONS[WeaponType.RIFLE].maxAmmo,
    [WeaponType.PISTOL]: WEAPONS[WeaponType.PISTOL].maxAmmo,
    [WeaponType.KNIFE]: 1,
    [WeaponType.SNIPER]: WEAPONS[WeaponType.SNIPER].maxAmmo,
  },
  isReloading: false,

  setHealth: (hp) => set({ health: hp }),
  switchWeapon: (weapon) => {
    if (get().isReloading) return; // Cancel reload or block switch? Block for now.
    set({ currentWeapon: weapon });
  },
  decrementAmmo: () => set((state) => ({
    ammo: { ...state.ammo, [state.currentWeapon]: Math.max(0, state.ammo[state.currentWeapon] - 1) }
  })),
  reloadWeapon: () => set((state) => ({
    ammo: { ...state.ammo, [state.currentWeapon]: WEAPONS[state.currentWeapon].maxAmmo }
  })),
  setReloading: (status) => set({ isReloading: status }),

  playerScore: 0,
  enemyScore: 0,
  incrementPlayerScore: () => {
    set((state) => ({
      playerScore: state.playerScore + 1,
      stats: { ...state.stats, playerKills: state.stats.playerKills + 1 }
    }));
    get().addKillFeed('YOU', 'ENEMY', WEAPONS[get().currentWeapon].name);
    get().showKillBanner(get().playerScore + 1); // Current score is updated in next render cycle, but here we use +1 for immediate feedback logic or just use score. Actually state update is async in React but sync in Zustand actions usually. 
    // Wait, Zustand set is synchronous. So reading state.playerScore inside the updater is correct.
    // Let's just pass the new score.
  },
  incrementEnemyScore: () => {
    set((state) => ({
      enemyScore: state.enemyScore + 1,
      stats: { ...state.stats, enemyKills: state.stats.enemyKills + 1 }
    }));
    get().addKillFeed('ENEMY', 'YOU', 'RIFLE'); // Enemy always uses Rifle/Default for now
  },

  stats: INITIAL_STATS,
  lastHitTime: 0,
  recordShot: (hit) => set((state) => ({
    lastHitTime: hit ? Date.now() : state.lastHitTime,
    stats: {
      ...state.stats,
      shotsFired: state.stats.shotsFired + 1,
      shotsHit: hit ? state.stats.shotsHit + 1 : state.stats.shotsHit,
      winningWeapon: WEAPONS[state.currentWeapon].name
    }
  })),

  resetGame: () => set({
    gameState: GameState.MENU,
    health: 100,
    playerScore: 0,
    enemyScore: 0,
    ammo: {
      [WeaponType.RIFLE]: WEAPONS[WeaponType.RIFLE].maxAmmo,
      [WeaponType.PISTOL]: WEAPONS[WeaponType.PISTOL].maxAmmo,
      [WeaponType.KNIFE]: 1,
      [WeaponType.SNIPER]: WEAPONS[WeaponType.SNIPER].maxAmmo,
    },
    isReloading: false,
    stats: INITIAL_STATS,
    analysisResult: ''
  }),

  killFeed: [],
  killBanner: null,

  addKillFeed: (killer, victim, weapon) => set((state) => {
    const newFeed = [...state.killFeed, { killer, victim, weapon, id: Date.now() }];
    if (newFeed.length > 5) newFeed.shift();
    return { killFeed: newFeed };
  }),

  showKillBanner: (count) => {
    set({ killBanner: { count, visible: true } });
    setTimeout(() => set({ killBanner: null }), 3000);
  },

  analysisResult: '',
  setAnalysis: (text) => set({ analysisResult: text })
}));
