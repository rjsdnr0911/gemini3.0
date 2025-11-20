
import { WeaponType, WeaponStats } from './types';

export const MAP_WIDTH = 30;
export const MAP_LENGTH = 80; // Long rectangular map
export const WIN_SCORE = 3;

export const PLAYER_SPEED = 5;
export const PLAYER_SPRINT_SPEED = 8;
export const PLAYER_CROUCH_SPEED = 2.5;
export const PLAYER_JUMP_FORCE = 7; // Increased from 5

export const PLAYER_HEIGHT = 1.6;
export const PLAYER_CROUCH_HEIGHT = 1.0;

export const ROUND_WIN_COUNT = 3; // Best of 5 (First to 3)

export const WEAPONS: Record<WeaponType, WeaponStats> = {
  [WeaponType.RIFLE]: {
    name: 'ASSAULT RIFLE',
    damage: 15,
    fireRate: 100,
    ammo: 30,
    maxAmmo: 30,
    range: 100,
    color: '#3b82f6', // Blue
    recoil: 0.05,
    type: WeaponType.RIFLE
  },
  [WeaponType.PISTOL]: {
    name: 'TACTICAL PISTOL',
    damage: 25,
    fireRate: 250,
    ammo: 12,
    maxAmmo: 12,
    range: 50,
    color: '#eab308', // Yellow
    recoil: 0.1,
    type: WeaponType.PISTOL
  },
  [WeaponType.KNIFE]: {
    name: 'COMBAT KNIFE',
    damage: 50,
    fireRate: 500,
    ammo: 1,
    maxAmmo: 1,
    range: 3,
    color: '#ef4444', // Red
    recoil: 0,
    type: WeaponType.KNIFE
  },
  [WeaponType.SNIPER]: {
    name: 'AWP SNIPER',
    damage: 100, // One shot kill usually
    fireRate: 1500, // Slow bolt action
    ammo: 5,
    maxAmmo: 5,
    range: 200,
    color: '#a855f7', // Purple
    recoil: 0.5, // High recoil
    type: WeaponType.SNIPER
  }
};
