import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, RapierRigidBody, CuboidCollider } from '@react-three/rapier';
import { Vector3, MeshStandardMaterial, Raycaster, MathUtils } from 'three';
import { useGameStore } from '../store';
import { GameState } from '../types';
import { MAP_WIDTH, MAP_LENGTH } from '../constants';
import { CharacterModel } from './CharacterModel';

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

const STOP_DISTANCE = 15;
const MOVE_SPEED = 5.5;

export const Enemy = () => {
    const rigidBody = useRef<RapierRigidBody>(null);
    const materialRef = useRef<MeshStandardMaterial>(null);
    const { playerPosition, incrementEnemyScore, incrementPlayerScore, showKillBanner, addKillFeed, gameState, health: playerHealth, setHealth: setPlayerHealth } = useGameStore();

    const [health, setHealth] = useState(100);
    const [isDead, setIsDead] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
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

    const { scene, camera } = useThree();
    const raycaster = useMemo(() => new Raycaster(), []);

    // Respawn Logic
    const respawnTimeout = useRef<NodeJS.Timeout | null>(null);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            if (respawnTimeout.current) clearTimeout(respawnTimeout.current);
        };
    }, []);

    const respawn = () => {
        if (!isMounted.current) return;

        setHealth(100);
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

    // Damage Handler
    const isDeadRef = useRef(false); // Fix: Prevent double counting

    useEffect(() => {
        const handleHit = (e: any) => {
            if (isDeadRef.current) return; // Ignore if already dead

            const damage = e.detail.damage;
            setHitFlash(1);

            // Reaction: If hit, immediately try to strafe or retreat
            if (Math.random() > 0.5) {
                aiState.current = AIState.STRAFE;
                strafeDir.current *= -1;
            }

            setHealth(prev => {
                const newHp = prev - damage;
                if (newHp <= 0) {
                    isDeadRef.current = true; // Lock death
                    incrementPlayerScore();

                    // Round Logic
                    useGameStore.getState().incrementRoundScore('YOU');
                    useGameStore.getState().showKillBanner(1);
                    useGameStore.getState().addKillFeed('YOU', 'ENEMY', 'RIFLE'); // Assuming Rifle for now or pass weapon in event

                    // Move to graveyard
                    if (rigidBody.current) {
                        rigidBody.current.setTranslation({ x: 0, y: -100, z: 0 }, true);
                        rigidBody.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
                    }

                    // Check Match Over
                    const state = useGameStore.getState();
                    if (state.matchWinner) {
                        // Game Over handled by UI via store state
                        // But we should stop respawning
                    } else {
                        // Schedule New Round
                        if (respawnTimeout.current) clearTimeout(respawnTimeout.current);
                        respawnTimeout.current = setTimeout(() => {
                            useGameStore.getState().resetRound();
                            window.dispatchEvent(new CustomEvent('RESET_PLAYER'));
                            respawn();
                            isDeadRef.current = false; // Unlock for next round
                        }, 3000);
                    }
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
        return () => {
            window.removeEventListener('ENEMY_HIT', handleHit);
            if (respawnTimeout.current) clearTimeout(respawnTimeout.current);
        };
    }, [incrementPlayerScore]);


    useFrame((state, delta) => {
        if (!rigidBody.current || gameState !== GameState.PLAYING) return;

        // Check Player Death (Single Player)
        // We check this here because Enemy component is active in Single Player
        if (playerHealth <= 0 && !isDeadRef.current) { // Ensure we don't trigger if enemy is already dead (draw?) or multiple times
            // Wait, playerHealth is from store. We need a local lock for player death too?
            // Actually, playerHealth <= 0 will stay true until reset.
            // So we need a flag to say "we handled player death for this round".
            // But `Enemy` component shouldn't manage Player death logic ideally.
            // However, for Single Player, someone has to trigger the round end if Player dies.
            // Let's use a ref for player death handled.
        }

        // Actually, let's handle Player Death in Player.tsx or a central manager?
        // But the user asked to fix it here.
        // Let's add a check: if player is dead and we haven't reacted yet.

        if (health <= 0) return; // Don't update AI if dead

        const now = Date.now();

        // --- 1. VISUALS ---
        if (hitFlash > 0) {
            setHitFlash(prev => Math.max(0, prev - delta * 5));
        }
        // Note: Material update logic removed as we are using CharacterModel now, 
        // but we can pass hitFlash to CharacterModel if we want later.

        // --- 2. PERCEPTION ---
        const botPos = new Vector3().copy(rigidBody.current.translation() as Vector3);
        const playerPos = camera.position.clone();
        const distToPlayer = botPos.distanceTo(playerPos);
        const dirToPlayer = new Vector3().subVectors(playerPos, botPos).normalize();

        // Line of Sight Check
        if (dirToPlayer.lengthSq() < 0.001) {
            dirToPlayer.set(0, 0, 1);
        }

        raycaster.set(botPos, dirToPlayer);
        raycaster.far = 100;
        const intersects = raycaster.intersectObjects(scene.children, true);

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
        if (now - lastStateChange.current > 1000) {
            if (health < 30) {
                aiState.current = AIState.RETREAT;
            } else if (distToPlayer < 15 && hasLOS) {
                aiState.current = AIState.STRAFE;
            } else if (distToPlayer > 20) {
                aiState.current = AIState.CHASE;
            } else if (!hasLOS) {
                aiState.current = AIState.CHASE;
            }

            if (aiState.current === AIState.STRAFE && Math.random() > 0.7) {
                strafeDir.current *= -1;
            }
        }

        // --- 4. MOVEMENT EXECUTION ---
        const moveVec = new Vector3(0, 0, 0);

        switch (aiState.current) {
            case AIState.CHASE:
                moveVec.copy(dirToPlayer).multiplyScalar(MOVE_SPEED);
                break;
            case AIState.STRAFE:
                const strafe = new Vector3().crossVectors(dirToPlayer, new Vector3(0, 1, 0)).normalize();
                moveVec.copy(strafe).multiplyScalar(MOVE_SPEED * 0.8 * strafeDir.current);
                if (distToPlayer > 15) moveVec.add(dirToPlayer.multiplyScalar(2));
                else if (distToPlayer < 5) moveVec.sub(dirToPlayer.multiplyScalar(2));
                break;
            case AIState.RETREAT:
                moveVec.copy(dirToPlayer).negate().multiplyScalar(MOVE_SPEED * 1.1);
                let bestCover = COVER_POINTS[0];
                let maxScore = -Infinity;
                COVER_POINTS.forEach(p => {
                    const dToP = p.distanceTo(playerPos);
                    const dToBot = p.distanceTo(botPos);
                    const score = dToP - dToBot;
                    if (score > maxScore) {
                        maxScore = score;
                        bestCover = p;
                    }
                });
                const dirToCover = new Vector3().subVectors(bestCover, botPos).normalize();
                moveVec.add(dirToCover.multiplyScalar(3));
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
                rigidBody.current.applyImpulse({ x: 0, y: 5, z: 0 }, true);
                moveVec.add(new Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).multiplyScalar(10));
                stuckTimer.current = 0;
            }
        } else {
            stuckTimer.current = 0;
        }
        lastPos.current.copy(botPos);

        // Apply movement
        rigidBody.current.setLinvel({ x: moveVec.x, y: rigidBody.current.linvel().y, z: moveVec.z }, true);

        // Update isMoving state for animation
        setIsMoving(moveVec.length() > 0.1);

        // --- 5. COMBAT (Shooting) ---
        if (hasLOS && distToPlayer < 60 && health > 0) {
            const burstDelay = 100;
            const burstCooldown = 1500;
            const shotsPerBurst = 3;

            if (isReloading.current) {
                if (now - lastShootTime.current > 2000) {
                    isReloading.current = false;
                    burstCount.current = 0;
                }
            } else {
                if (now - lastShootTime.current > (burstCount.current === 0 ? burstCooldown : burstDelay)) {
                    lastShootTime.current = now;
                    burstCount.current++;

                    const spread = 0.05 + (distToPlayer * 0.001) + (aiState.current === AIState.STRAFE ? 0.05 : 0);
                    const accuracyCheck = Math.random();

                    const startPos = botPos.clone().add(new Vector3(0, 0.5, 0));
                    const right = new Vector3().crossVectors(dirToPlayer, new Vector3(0, 1, 0)).normalize();
                    startPos.add(right.multiplyScalar(0.4));

                    let endPos = playerPos.clone();
                    if (accuracyCheck <= spread) {
                        endPos.add(new Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2));
                    } else {
                        const dmg = 8 + Math.random() * 4;
                        // Player Damage Handling
                        const newPlayerHealth = Math.max(0, playerHealth - dmg);
                        setPlayerHealth(newPlayerHealth);

                        if (newPlayerHealth <= 0) {
                            // Player Died Logic
                            // We need to ensure this only triggers once per round.
                            // But since we are in useFrame, and health will stay 0 until reset...
                            // We rely on the fact that we only shoot if health > 0? 
                            // No, we shoot if ENEMY health > 0.
                            // We need to check if we ALREADY triggered player death.
                            // But wait, if player health is 0, we shouldn't shoot anymore.
                            // But we just dealt damage.

                            incrementEnemyScore();
                            useGameStore.getState().incrementRoundScore('ENEMY');
                            useGameStore.getState().addKillFeed('ENEMY', 'YOU', 'RIFLE');

                            // Check Match Over
                            const state = useGameStore.getState();
                            if (!state.matchWinner) {
                                // Schedule Reset
                                setTimeout(() => {
                                    useGameStore.getState().resetRound();
                                    window.dispatchEvent(new CustomEvent('RESET_PLAYER'));
                                    respawn();
                                    isDeadRef.current = false;
                                }, 3000);
                            }
                        }
                    }

                    window.dispatchEvent(new CustomEvent('SHOOT', {
                        detail: {
                            start: startPos,
                            end: endPos,
                            color: '#ef4444'
                        }
                    }));

                    if (burstCount.current >= shotsPerBurst) {
                        isReloading.current = true;
                        burstCount.current = 0;
                        if (aiState.current === AIState.CHASE) aiState.current = AIState.STRAFE;
                    }
                }
            }
        }
    });

    return (
        <RigidBody
            ref={rigidBody}
            position={[0, 5, -35]}
            colliders={false}
            enabledRotations={[false, false, false]}
            type="dynamic"
            friction={0}
        >
            <CuboidCollider args={[0.7, 1.0, 0.7]} />

            <group position={[0, 0, 0]} rotation={[0, Math.PI, 0]} visible={health > 0}>
                {/* Visuals Container */}
                <group position={[0, -0.9, 0]}>
                    {/* Hitbox (Invisible) */}
                    <mesh name="ENEMY_HITBOX" visible={false} position={[0, 0.9, 0]}>
                        <capsuleGeometry args={[0.4, 1.8, 4, 8]} />
                        <meshBasicMaterial color="red" wireframe />
                    </mesh>

                    {/* Head Hitbox (Invisible) */}
                    <mesh name="HEAD_HITBOX" visible={false} position={[0, 1.6, 0]}>
                        <boxGeometry args={[0.35, 0.4, 0.35]} />
                        <meshBasicMaterial color="yellow" wireframe />
                    </mesh>

                    {/* 3D Character Model */}
                    <CharacterModel color="#ef4444" isMoving={isMoving} />

                    {/* Weapon */}
                    <mesh position={[0.3, 1.3, 0.4]}>
                        <boxGeometry args={[0.1, 0.1, 0.6]} />
                        <meshStandardMaterial color="#333" />
                    </mesh>
                </group>
            </group>
        </RigidBody>
    );
};
