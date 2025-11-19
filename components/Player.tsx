
import React, { useRef, useEffect, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, CuboidCollider } from '@react-three/rapier';
import { Vector3, Raycaster, Euler, Group, MathUtils } from 'three';
import { PointerLockControls } from '@react-three/drei';
import { useGameStore } from '../store';
import { Weapon } from './Weapon';
import { 
  PLAYER_SPEED, 
  PLAYER_SPRINT_SPEED, 
  PLAYER_CROUCH_SPEED, 
  PLAYER_JUMP_FORCE, 
  PLAYER_HEIGHT,
  PLAYER_CROUCH_HEIGHT,
  WEAPONS, 
  WIN_SCORE 
} from '../constants';
import { WeaponType, GameState } from '../types';
import { audio } from '../services/audioService';
import { controls, resetControls } from '../controls';

export const Player = () => {
  const rigidBody = useRef<RapierRigidBody>(null);
  const weaponGroupRef = useRef<Group>(null);
  const { camera, scene } = useThree();
  
  const [isFiring, setIsFiring] = useState(false);
  const [isAiming, setIsAiming] = useState(false);
  const isCycling = useRef(false); // For Sniper bolt action

  const lastShotTime = useRef(0);
  const currentRecoil = useRef(0);
  const baseFov = 75;
  const aimFovRifle = 40;
  const aimFovSniper = 15; // High zoom for sniper
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  // Store access (Reactive for rendering)
  const { 
    currentWeapon, 
    ammo, 
    gameState,
    setGameState,
    recordShot,
    playerScore,
    enemyScore,
    health,
    reloadWeapon,
    isReloading,
    setReloading,
    decrementAmmo,
    switchWeapon
  } = useGameStore();

  // Perform Reload Logic
  const performReload = () => {
     const state = useGameStore.getState();
     if (state.isReloading || state.ammo[state.currentWeapon] === WEAPONS[state.currentWeapon].maxAmmo) return;
     
     // Cancel bolt cycling if reload starts
     isCycling.current = false;

     state.setReloading(true);
     audio.playReload();

     setTimeout(() => {
         state.reloadWeapon();
         state.setReloading(false);
     }, state.currentWeapon === WeaponType.SNIPER ? 3000 : 2000);
  };

  // --- Input Handling ---
  useEffect(() => {
    resetControls();

    const handleKeyDown = (e: KeyboardEvent) => {
      const state = useGameStore.getState();

      if (e.code === 'KeyW') controls.forward = true;
      if (e.code === 'KeyS') controls.backward = true;
      if (e.code === 'KeyA') controls.left = true;
      if (e.code === 'KeyD') controls.right = true;
      if (e.code === 'Space') controls.jump = true;
      if (e.code === 'ShiftLeft') controls.sprint = true;
      if (e.code === 'ControlLeft' || e.code === 'KeyC') controls.crouch = true;
      
      if (e.key === '1') { state.switchWeapon(WeaponType.RIFLE); state.setReloading(false); isCycling.current = false; }
      if (e.key === '2') { state.switchWeapon(WeaponType.PISTOL); state.setReloading(false); isCycling.current = false; }
      if (e.key === '3') { state.switchWeapon(WeaponType.KNIFE); state.setReloading(false); isCycling.current = false; }
      if (e.key === '0' || e.key === '4') { state.switchWeapon(WeaponType.SNIPER); state.setReloading(false); isCycling.current = false; }
      
      if (e.code === 'KeyR') performReload();
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW') controls.forward = false;
      if (e.code === 'KeyS') controls.backward = false;
      if (e.code === 'KeyA') controls.left = false;
      if (e.code === 'KeyD') controls.right = false;
      if (e.code === 'Space') controls.jump = false;
      if (e.code === 'ShiftLeft') controls.sprint = false;
      if (e.code === 'ControlLeft' || e.code === 'KeyC') controls.crouch = false;
    };
    
    const handleMouseDown = (e: MouseEvent) => {
      if (useGameStore.getState().gameState !== GameState.PLAYING) return;
      if (e.button === 0) controls.fire = true;
      if (e.button === 2) controls.aim = true;
    };
    
    const handleMouseUp = (e: MouseEvent) => {
        if (e.button === 0) controls.fire = false;
        if (e.button === 2) controls.aim = false;
    };
    
    const handleContextMenu = (e: MouseEvent) => {
        e.preventDefault();
        return false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []); 

  // Check Win/Loss
  useEffect(() => {
    if (playerScore >= WIN_SCORE || enemyScore >= WIN_SCORE || health <= 0) {
      setGameState(GameState.GAME_OVER);
      document.exitPointerLock();
    }
  }, [playerScore, enemyScore, health, setGameState]);

  // Game Loop
  useFrame((state, delta) => {
    if (!rigidBody.current || gameState !== GameState.PLAYING) return;

    // --- 0. Handle Triggers ---
    if (controls.reload) { performReload(); controls.reload = false; }
    if (controls.weapon1) { switchWeapon(WeaponType.RIFLE); controls.weapon1 = false; setReloading(false); isCycling.current = false; }
    if (controls.weapon2) { switchWeapon(WeaponType.PISTOL); controls.weapon2 = false; setReloading(false); isCycling.current = false; }
    if (controls.weapon3) { switchWeapon(WeaponType.KNIFE); controls.weapon3 = false; setReloading(false); isCycling.current = false; }
    if (controls.weapon4) { switchWeapon(WeaponType.SNIPER); controls.weapon4 = false; setReloading(false); isCycling.current = false; }
    
    setIsFiring(controls.fire);

    // Aim logic: prevent aiming if cycling bolt
    let aiming = controls.aim;
    if (currentWeapon === WeaponType.SNIPER && isCycling.current) {
        aiming = false;
    }
    setIsAiming(aiming);

    // --- 1. Movement Logic ---
    const velocity = rigidBody.current.linvel();
    
    let speed = PLAYER_SPEED;
    if (controls.crouch) speed = PLAYER_CROUCH_SPEED;
    else if (controls.sprint && controls.forward) speed = PLAYER_SPRINT_SPEED;

    const frontVector = new Vector3(0, 0, 0);
    const sideVector = new Vector3(0, 0, 0);

    if (controls.forward) frontVector.z -= 1;
    if (controls.backward) frontVector.z += 1;
    if (controls.left) sideVector.x -= 1;
    if (controls.right) sideVector.x += 1;

    if (Math.abs(controls.moveVector.x) > 0.1 || Math.abs(controls.moveVector.y) > 0.1) {
        sideVector.x = controls.moveVector.x;
        frontVector.z = controls.moveVector.y;
        if (Math.sqrt(controls.moveVector.x**2 + controls.moveVector.y**2) > 0.8 && !controls.crouch) {
            speed = PLAYER_SPRINT_SPEED;
        } else if (controls.crouch) {
            speed = PLAYER_CROUCH_SPEED;
        } else {
            speed = PLAYER_SPEED;
        }
    }

    const euler = new Euler(0, camera.rotation.y, 0, 'YXZ');
    const direction = new Vector3();
    direction
      .addVectors(frontVector, sideVector)
      .normalize()
      .applyEuler(euler)
      .multiplyScalar(speed);

    rigidBody.current.setLinvel({ x: direction.x, y: velocity.y, z: direction.z }, true);

    if (controls.jump && Math.abs(velocity.y) < 0.1 && !controls.crouch) {
       rigidBody.current.applyImpulse({ x: 0, y: PLAYER_JUMP_FORCE, z: 0 }, true);
       controls.jump = false; 
    }

    // --- 2. Camera & Look ---
    const pos = rigidBody.current.translation();
    const targetHeight = controls.crouch ? PLAYER_CROUCH_HEIGHT : PLAYER_HEIGHT;
    const smoothedHeight = MathUtils.lerp(camera.position.y - pos.y, targetHeight, delta * 8);
    
    camera.position.set(pos.x, pos.y + smoothedHeight, pos.z);

    if (controls.lookDelta.x !== 0 || controls.lookDelta.y !== 0) {
        camera.rotation.y -= controls.lookDelta.x * delta * 2; 
        camera.rotation.x -= controls.lookDelta.y * delta * 2; 
        camera.rotation.x = Math.max(-1.5, Math.min(1.5, camera.rotation.x)); 
        controls.lookDelta = { x: 0, y: 0 };
    }
    
    currentRecoil.current = MathUtils.lerp(currentRecoil.current, 0, delta * 10);
    
    let targetFov = baseFov;
    if (isAiming) {
        if (currentWeapon === WeaponType.RIFLE) targetFov = aimFovRifle;
        if (currentWeapon === WeaponType.SNIPER) targetFov = aimFovSniper;
    }
    camera.fov = MathUtils.lerp(camera.fov, targetFov, delta * 10);
    camera.updateProjectionMatrix();

    // --- 3. Weapon Sync ---
    if (weaponGroupRef.current) {
        weaponGroupRef.current.position.copy(camera.position);
        weaponGroupRef.current.rotation.copy(camera.rotation);
        weaponGroupRef.current.rotateX(currentRecoil.current);
    }

    // --- 4. Firing Logic ---
    const now = Date.now();
    const weapon = WEAPONS[currentWeapon];
    
    if (isReloading || (currentWeapon === WeaponType.SNIPER && isCycling.current)) {
        setIsFiring(false);
        return;
    }

    if (isFiring && now - lastShotTime.current > weapon.fireRate && ammo[currentWeapon] > 0) {
      lastShotTime.current = now;
      decrementAmmo();
      fireWeapon(weapon.damage, weapon.range);
      
      if (currentWeapon === WeaponType.KNIFE) audio.playKnife();
      else audio.playShoot(currentWeapon === WeaponType.RIFLE ? 'RIFLE' : 'PISTOL');
      
      currentRecoil.current += (isAiming ? weapon.recoil * 0.5 : weapon.recoil) * 0.5; 
      
      // Trigger Bolt Action for Sniper
      if (currentWeapon === WeaponType.SNIPER) {
          isCycling.current = true;
          // Delay the bolt sound slightly to match kickback
          setTimeout(() => audio.playBolt(), 300);
          
          // Unlock cycling after duration
          setTimeout(() => {
              isCycling.current = false;
          }, 1200); // 1.2s cycle time
      }

    } else if (isFiring && ammo[currentWeapon] <= 0) {
        performReload();
    }
  });

  const fireWeapon = (damage: number, range: number) => {
    const raycaster = new Raycaster();
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    raycaster.far = range;

    const intersects = raycaster.intersectObjects(scene.children, true);

    let hitEnemy = false;
    
    for (const hit of intersects) {
        if (hit.object.name === 'WEAPON_MODEL' || hit.object.type === 'LineSegments') continue;
        
        window.dispatchEvent(new CustomEvent('IMPACT', { 
            detail: { 
                position: hit.point, 
                normal: hit.face?.normal || new Vector3(0, 1, 0),
                color: hit.object.name === 'ENEMY_HITBOX' ? '#d946ef' : '#fbbf24'
            } 
        }));

        if (hit.object.name === 'ENEMY_HITBOX' && hit.distance <= range) {
            hitEnemy = true;
            audio.playHit();
            window.dispatchEvent(new CustomEvent('ENEMY_HIT', { detail: { damage } }));
            break;
        }
        
        if (hit.object.name === 'WALL' || hit.object.name === 'FLOOR') {
            break;
        }
    }
    recordShot(hitEnemy);
  };

  return (
    <group>
        <RigidBody 
            ref={rigidBody} 
            position={[0, 5, 35]} 
            colliders={false} 
            enabledRotations={[false, false, false]}
            mass={1}
            type="dynamic"
        >
            <CuboidCollider args={[0.5, 1, 0.5]} />
        </RigidBody>

        <group ref={weaponGroupRef}>
             <Weapon 
                type={currentWeapon} 
                isFiring={isFiring} 
                isAiming={isAiming}
                isReloading={isReloading} 
                isCycling={isCycling.current}
             />
        </group>

        {gameState === GameState.PLAYING && !isMobile && <PointerLockControls selector="#root" />}
    </group>
  );
};
