
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

export interface NetworkPacket {
  type: 'PLAYER_UPDATE' | 'SHOOT' | 'HIT' | 'KILL' | 'CHAT' | 'READY' | 'START' | 'PING' | 'PONG';
  payload: any;
}

export interface RemotePlayerState {
  position: { x: number, y: number, z: number };
  rotation: { x: number, y: number, z: number };
  velocity: { x: number, y: number, z: number };
  animState: string;
  currentWeapon: WeaponType;
  isFiring: boolean;
}

export interface ChatMessage {
  sender: string; // 'Me' or 'Opponent' or 'System'
  text: string;
  timestamp: number;
}
