
import React, { useRef, useEffect, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, CuboidCollider } from '@react-three/rapier';
import { Vector3, Raycaster, Euler, Group, MathUtils, PerspectiveCamera, Vector2 } from 'three';
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
  const lastStepTime = useRef(0);
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

    const duration = state.currentWeapon === WeaponType.SNIPER ? 3000 : 2000;
    const timer = setTimeout(() => {
      state.reloadWeapon();
      state.setReloading(false);
    }, duration);

    // Store timer reference for cleanup (using a ref defined in component scope)
    reloadTimer.current = timer;
  };

  const reloadTimer = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    return () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
    };
  }, []);

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
      if (Math.sqrt(controls.moveVector.x ** 2 + controls.moveVector.y ** 2) > 0.8 && !controls.crouch) {
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

    // --- Jump Logic with Raycast Ground Check ---
    const raycaster = new Raycaster();
    const rbPos = rigidBody.current.translation();
    // Fix: Convert Rapier Vector to Three.js Vector3
    raycaster.set(new Vector3(rbPos.x, rbPos.y, rbPos.z), new Vector3(0, -1, 0));
    raycaster.far = 1.5;

    const intersects = raycaster.intersectObjects(scene.children, true);
    const isGrounded = intersects.some(hit => hit.distance < 1.2 && (hit.object.name === 'FLOOR' || hit.object.name === 'WALL'));

    // Fallback: Velocity check if raycast fails (e.g. on edge)
    const isVelocityGrounded = Math.abs(velocity.y) < 0.1;

    if (controls.jump && (isGrounded || isVelocityGrounded) && !controls.crouch) {
      rigidBody.current.applyImpulse({ x: 0, y: PLAYER_JUMP_FORCE, z: 0 }, true);
      controls.jump = false;
      audio.playJump();
    }

    // Footsteps
    if ((isGrounded || isVelocityGrounded) && direction.length() > 0.1) {
      const stepInterval = controls.sprint ? 300 : 500; // Faster steps when sprinting
      const now = Date.now();
      if (!lastStepTime.current) lastStepTime.current = 0;

      if (now - lastStepTime.current > stepInterval) {
        audio.playFootstep();
        lastStepTime.current = now;
      }
    } else {
      // Reset step timer when stopping so next step is immediate
      if (lastStepTime.current && Date.now() - lastStepTime.current > 500) {
        lastStepTime.current = 0;
      }
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
    } else if (controls.sprint && controls.forward && !controls.crouch) {
      targetFov = baseFov + 10; // Sprint FOV effect
    }

    // Fix: Check if camera is PerspectiveCamera before accessing fov
    if (camera instanceof PerspectiveCamera) {
      camera.fov = MathUtils.lerp(camera.fov, targetFov, delta * 10);
      camera.updateProjectionMatrix();
    }

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
    // --- 5. Network Sync ---
    if (useGameStore.getState().isMultiplayer) {
      window.dispatchEvent(new CustomEvent('PLAYER_UPDATE', {
        detail: {
          position: rigidBody.current.translation(),
          rotation: { x: camera.rotation.x, y: camera.rotation.y, z: camera.rotation.z },
          velocity: rigidBody.current.linvel(),
          animState: controls.jump ? 'JUMP' : (controls.forward || controls.left ? 'RUN' : 'IDLE'), // Simple anim state
          currentWeapon: currentWeapon,
          isFiring: isFiring
        }
      }));
    }
  });

  const fireWeapon = (damage: number, range: number) => {
    const raycaster = new Raycaster();
    // Fix: Use Vector2 for setFromCamera
    raycaster.setFromCamera(new Vector2(0, 0), camera);
    raycaster.far = range;

    const intersects = raycaster.intersectObjects(scene.children, true);

    let hitEnemy = false;
    let endPoint = new Vector3().copy(camera.position).add(camera.getWorldDirection(new Vector3()).multiplyScalar(range));

    for (const hit of intersects) {
      if (hit.object.name === 'WEAPON_MODEL' || hit.object.type === 'LineSegments') continue;

      // Update end point to hit point
      endPoint.copy(hit.point);

      window.dispatchEvent(new CustomEvent('IMPACT', {
        detail: {
          position: hit.point,
          normal: hit.face?.normal || new Vector3(0, 1, 0),
          color: hit.object.name === 'ENEMY_HITBOX' ? '#d946ef' : '#fbbf24'
        }
      }));

      if ((hit.object.name === 'ENEMY_HITBOX' || hit.object.name === 'HEAD_HITBOX') && hit.distance <= range) {
        hitEnemy = true;
        const isHeadshot = hit.object.name === 'HEAD_HITBOX';
        const finalDamage = isHeadshot ? damage * 2 : damage;

        if (isHeadshot) {
          audio.playHeadshot(); // We will implement this next
        } else {
          audio.playHit();
        }

        window.dispatchEvent(new CustomEvent('ENEMY_HIT', { detail: { damage: finalDamage, isHeadshot } }));
        break;
      }

      if (hit.object.name === 'WALL' || hit.object.name === 'FLOOR') {
        break;
      }
    }

    // Dispatch SHOOT event for tracer
    // Start position: slightly offset from camera to simulate weapon barrel
    const startPos = new Vector3().copy(camera.position);
    const right = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const down = new Vector3(0, -1, 0).applyQuaternion(camera.quaternion);
    startPos.add(right.multiplyScalar(0.2)).add(down.multiplyScalar(0.2)); // Right and down

    window.dispatchEvent(new CustomEvent('SHOOT', {
      detail: {
        start: startPos,
        end: endPoint,
        color: '#06b6d4' // Cyan for player
      }
    }));

    recordShot(hitEnemy);
  };

  // Determine Spawn Point based on Host/Client
  const isHost = useGameStore(state => state.isHost);
  const spawnPos = isHost ? [0, 5, 35] : [0, 5, -35]; // Opposite ends
  const spawnRot = isHost ? [0, Math.PI, 0] : [0, 0, 0]; // Face each other

  return (
    <group>
      <RigidBody
        ref={rigidBody}
        position={spawnPos as [number, number, number]}
        rotation={spawnRot as [number, number, number]} // Initial rotation
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
