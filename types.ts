
export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  ANALYZING = 'ANALYZING'
}

export enum WeaponType {
  RIFLE = 'RIFLE',
  PISTOL = 'PISTOL',
  KNIFE = 'KNIFE',
  SNIPER = 'SNIPER'
}

export interface WeaponStats {
  name: string;
  damage: number;
  fireRate: number; // ms between shots
  ammo: number;
  maxAmmo: number;
  range: number;
  color: string;
  recoil: number;
  type: WeaponType;
}

export interface MatchStats {
  playerKills: number;
  enemyKills: number;
  shotsFired: number;
  shotsHit: number;
  startTime: number;
  endTime: number;
  winningWeapon: string;
}
