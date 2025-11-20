import { Vector3 } from 'three';

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER'
}

export enum WeaponType {
  RIFLE = 'RIFLE',
  PISTOL = 'PISTOL',
  KNIFE = 'KNIFE',
  SNIPER = 'SNIPER'
}

export interface PlayerState {
  position: { x: number, y: number, z: number };
  rotation: { x: number, y: number, z: number };
  velocity: { x: number, y: number, z: number };
  animState: string;
  currentWeapon: WeaponType;
  isFiring: boolean;
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

export type NetworkPacket =
  | { type: 'PLAYER_UPDATE', payload: PlayerState }
  | { type: 'SHOOT', payload: { start: Vector3, end: Vector3, color: string } }
  | { type: 'IMPACT', payload: { position: Vector3, normal: Vector3, color: string } }
  | { type: 'ENEMY_HIT', payload: { damage: number, isHeadshot: boolean } }
  | { type: 'HIT', payload: { damage: number, weapon: WeaponType } }
  | { type: 'KILL', payload: { victim: string, weapon: WeaponType } }
  | { type: 'CHAT', payload: { text: string } }
  | { type: 'READY', payload: { isReady: boolean } }
  | { type: 'START', payload: {} }
  | { type: 'PING', payload: { time: number } }
  | { type: 'PONG', payload: { time: number } }
  | { type: 'ROUND_END', payload: { winner: string } } // winner: 'HOST' or 'CLIENT'
  | { type: 'NEW_ROUND' };

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
