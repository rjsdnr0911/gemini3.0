
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, CuboidCollider } from '@react-three/rapier';
import { Vector3, MeshStandardMaterial, Raycaster, MathUtils } from 'three';
import { useGameStore } from '../store';
import { GameState } from '../types';
import { MAP_WIDTH, MAP_LENGTH } from '../constants';

enum AIState {
  IDLE = 'IDLE',
  CHASE = 'CHASE',
  STRAFE = 'STRAFE',
  RETREAT = 'RETREAT',
  SEEK_COVER = 'SEEK_COVER'
}

// Hardcoded tactical points near obstacles defined in Map.tsx
const COVER_POINTS = [
  new Vector3(0, 1, 0),       // Center
  new Vector3(8, 1, 10),      // Right Box
  new Vector3(-8, 1, -10),    // Left Box
  new Vector3(10, 1, -20),    // Far Right
  new Vector3(-10, 1, 20),    // Far Left
  new Vector3(12, 1, 0),      // High Ground Base
];

export const Enemy = () => {
  const rigidBody = useRef<RapierRigidBody>(null);
  const materialRef = useRef<MeshStandardMaterial>(null);
  const [hp, setHp] = useState(100);
  const [hitFlash, setHitFlash] = useState(0);
  
  // AI State
  const aiState = useRef<AIState>(AIState.IDLE);
  const lastStateChange = useRef(0);
  const strafeDir = useRef(1); // 1 or -1
  
  // Combat State
  const lastShootTime = useRef(0);
  const burstCount = useRef(0);
  const isReloading = useRef(false);
  
  // Navigation
  const stuckTimer = useRef(0);
  const lastPos = useRef(new Vector3());
  
  const { 
    gameState, 
    incrementPlayerScore, 
    setHealth, 
    health: playerHealth,
    incrementEnemyScore
  } = useGameStore();
  
  const { scene, camera } = useThree();
  const raycaster = useMemo(() => new Raycaster(), []);

  // Respawn Logic
  const respawn = () => {
    setHp(100);
    setHitFlash(0);
    aiState.current = AIState.IDLE;
    isReloading.current = false;
    burstCount.current = 0;
    
    if (rigidBody.current) {
        // Spawn at random end of map opposite to player roughly
        const spawnZ = camera.position.z > 0 ? -35 : 35;
        rigidBody.current.setTranslation({ x: (Math.random() - 0.5) * 10, y: 5, z: spawnZ }, true);
        rigidBody.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
  };

  useEffect(() => {
    if (gameState === GameState.MENU) {
        respawn();
    }
  }, [gameState]);

  // Damage Handler
  useEffect(() => {
    const handleHit = (e: any) => {
        const damage = e.detail.damage;
        setHitFlash(1);
        
        // Reaction: If hit, immediately try to strafe or retreat
        if (Math.random() > 0.5) {
             aiState.current = AIState.STRAFE;
             strafeDir.current *= -1;
        }

        setHp(prev => {
            const newHp = prev - damage;
            if (newHp <= 0) {
                incrementPlayerScore();
                // Move to graveyard immediately to avoid ghost collisions or interaction
                if (rigidBody.current) {
                    rigidBody.current.setTranslation({ x: 0, y: -100, z: 0 }, true);
                    rigidBody.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
                }
                setTimeout(respawn, 2000); // Respawn delay
                return 0; 
            }
            // Trigger retreat if low HP
            if (newHp < 30 && aiState.current !== AIState.RETREAT) {
                aiState.current = AIState.RETREAT;
                lastStateChange.current = Date.now();
            }
            return newHp;
        });
    };
    window.addEventListener('ENEMY_HIT', handleHit);
    return () => window.removeEventListener('ENEMY_HIT', handleHit);
  }, [incrementPlayerScore]);


  useFrame((state, delta) => {
    if (!rigidBody.current || gameState !== GameState.PLAYING || hp <= 0) return;

    const now = Date.now();
    
    // --- 1. VISUALS ---
    if (hitFlash > 0) {
        setHitFlash(prev => Math.max(0, prev - delta * 5));
    }
    if (materialRef.current) {
        const isAggro = aiState.current === AIState.CHASE || aiState.current === AIState.STRAFE;
        const baseColor = hp < 30 ? "#ef4444" : (isAggro ? "#ef4444" : "#d946ef");
        
        materialRef.current.color.set(hitFlash > 0 ? "#ffffff" : baseColor);
        materialRef.current.emissive.set(hitFlash > 0 ? "#ffffff" : (isAggro ? "#7f1d1d" : "#86198f"));
        materialRef.current.emissiveIntensity = hitFlash > 0 ? 2 : 0.5;
    }

    // --- 2. PERCEPTION ---
    const botPos = new Vector3().copy(rigidBody.current.translation() as Vector3);
    const playerPos = camera.position.clone();
    const distToPlayer = botPos.distanceTo(playerPos);
    const dirToPlayer = new Vector3().subVectors(playerPos, botPos).normalize();

    // Line of Sight Check
    // Ensure we don't pass NaNs if bot overlaps player exactly
    if (dirToPlayer.lengthSq() < 0.001) {
         dirToPlayer.set(0, 0, 1);
    }

    raycaster.set(botPos, dirToPlayer);
    raycaster.far = 100;
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    // Check if first hit is player (approximated by distance) or obstacle
    // We assume if we hit a wall closer than the player, we don't have LOS
    let hasLOS = true;
    for (const hit of intersects) {
        if (hit.object.name === 'WALL' || hit.object.name === 'FLOOR') {
            if (hit.distance < distToPlayer - 1) { // Buffer
                hasLOS = false;
                break;
            }
        }
    }

    // --- 3. DECISION MAKING (State Machine) ---
    // State Transitions
    if (now - lastStateChange.current > 1000) { // Check every 1s approx for major state changes
         if (hp < 30) {
             aiState.current = AIState.RETREAT;
         } else if (distToPlayer < 15 && hasLOS) {
             aiState.current = AIState.STRAFE;
         } else if (distToPlayer > 20) {
             aiState.current = AIState.CHASE;
         } else if (!hasLOS) {
             aiState.current = AIState.CHASE; // Hunt down
         }
         
         // Randomly switch strafe direction
         if (aiState.current === AIState.STRAFE && Math.random() > 0.7) {
             strafeDir.current *= -1;
         }
    }

    // --- 4. MOVEMENT EXECUTION ---
    const moveVec = new Vector3(0, 0, 0);
    const speed = 5.5; // Slightly slower than player

    switch (aiState.current) {
        case AIState.CHASE:
            moveVec.copy(dirToPlayer).multiplyScalar(speed);
            break;
            
        case AIState.STRAFE:
            // Perpendicular vector for strafing
            const strafe = new Vector3().crossVectors(dirToPlayer, new Vector3(0, 1, 0)).normalize();
            moveVec.copy(strafe).multiplyScalar(speed * 0.8 * strafeDir.current);
            // Add slight forward/backward bias to keep range
            if (distToPlayer > 15) moveVec.add(dirToPlayer.multiplyScalar(2));
            else if (distToPlayer < 5) moveVec.sub(dirToPlayer.multiplyScalar(2));
            break;
            
        case AIState.RETREAT:
            // Run away from player towards nearest cover
            // Simple: Run away
            moveVec.copy(dirToPlayer).negate().multiplyScalar(speed * 1.1); // Panic run
            
            // Find cover point
            let bestCover = COVER_POINTS[0];
            let maxScore = -Infinity;
            
            COVER_POINTS.forEach(p => {
                const dToP = p.distanceTo(playerPos);
                const dToBot = p.distanceTo(botPos);
                // Heuristic: Far from player, close to bot
                const score = dToP - dToBot;
                if (score > maxScore) {
                    maxScore = score;
                    bestCover = p;
                }
            });
            
            const dirToCover = new Vector3().subVectors(bestCover, botPos).normalize();
            moveVec.add(dirToCover.multiplyScalar(3)); // Blend runaway + cover seek
            break;
            
        case AIState.IDLE:
        default:
            moveVec.set(0, 0, 0);
            break;
    }
    
    // Stuck detection
    if (botPos.distanceTo(lastPos.current) < 0.02 && moveVec.length() > 0) {
        stuckTimer.current += delta;
        if (stuckTimer.current > 0.5) {
            // Jump or move random
            rigidBody.current.applyImpulse({ x: 0, y: 5, z: 0 }, true);
            moveVec.add(new Vector3(Math.random()-0.5, 0, Math.random()-0.5).multiplyScalar(10));
            stuckTimer.current = 0;
        }
    } else {
        stuckTimer.current = 0;
    }
    lastPos.current.copy(botPos);

    // Apply movement
    rigidBody.current.setLinvel({ x: moveVec.x, y: rigidBody.current.linvel().y, z: moveVec.z }, true);


    // --- 5. COMBAT (Shooting) ---
    if (hasLOS && distToPlayer < 60 && hp > 0) {
        // Burst fire logic
        const burstDelay = 100; // ms between shots in burst
        const burstCooldown = 1500; // ms between bursts
        const shotsPerBurst = 3;
        
        if (isReloading.current) {
             if (now - lastShootTime.current > 2000) {
                 isReloading.current = false;
                 burstCount.current = 0;
             }
        } else {
            // Ready to shoot
            if (now - lastShootTime.current > (burstCount.current === 0 ? burstCooldown : burstDelay)) {
                // Fire!
                lastShootTime.current = now;
                burstCount.current++;
                
                // Calculate accuracy (worse if moving, worse if far)
                const spread = 0.05 + (distToPlayer * 0.001) + (aiState.current === AIState.STRAFE ? 0.05 : 0);
                const accuracyCheck = Math.random();
                
                // Visual tracer/shot effect would be spawned here (omitted for simple logic)
                
                if (accuracyCheck > spread) {
                    // Hit!
                    const dmg = 8 + Math.random() * 4; // 8-12 dmg per shot
                    setHealth(Math.max(0, playerHealth - dmg));
                    if (playerHealth - dmg <= 0) {
                        incrementEnemyScore();
                    }
                }

                if (burstCount.current >= shotsPerBurst) {
                    isReloading.current = true;
                    burstCount.current = 0;
                    
                    // Change movement after shooting
                    if (aiState.current === AIState.CHASE) aiState.current = AIState.STRAFE;
                }
            }
        }
    }
  });

  // DO NOT UNMOUNT RIGIDBODY! Just hide mesh and move away.
  // Unmounting causes Rapier memory access errors if updated in the same frame.
  
  return (
    <RigidBody 
        ref={rigidBody} 
        position={[0, 5, -35]} 
        colliders={false} 
        enabledRotations={[false, false, false]}
        type="dynamic"
        friction={0} // Smooth movement
    >
        <CuboidCollider args={[0.7, 1.0, 0.7]} />
        
        <group position={[0, 0, 0]} rotation={[0, Math.PI, 0]} visible={hp > 0}>
             {/* Body */}
             <mesh name="ENEMY_HITBOX" position={[0, 0, 0]}>
                <capsuleGeometry args={[0.7, 2, 8]} />
                <meshStandardMaterial ref={materialRef} color="#d946ef" />
            </mesh>
            {/* Head / Visor */}
            <mesh position={[0, 0.6, 0.5]}>
                <boxGeometry args={[0.6, 0.25, 0.3]} />
                <meshStandardMaterial color={aiState.current === AIState.RETREAT ? "#facc15" : "#00ff00"} emissiveIntensity={2} toneMapped={false} />
            </mesh>
            {/* Weapon */}
            <mesh position={[0.6, 0, 0.6]}>
                 <boxGeometry args={[0.15, 0.2, 0.8]} />
                 <meshStandardMaterial color="#cbd5e1" />
            </mesh>
            {/* Tactical Vest */}
             <mesh position={[0, -0.2, 0.6]}>
                 <boxGeometry args={[0.8, 0.8, 0.2]} />
                 <meshStandardMaterial color="#475569" />
            </mesh>
        </group>
    </RigidBody>
  );
};
