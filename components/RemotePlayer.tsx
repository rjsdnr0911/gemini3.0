import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store';
import { Vector3 } from 'three';
import { Text } from '@react-three/drei';
import { CharacterModel } from './CharacterModel';

export const RemotePlayer = () => {
    const remotePlayer = useGameStore(state => state.remotePlayer);
    const isMultiplayer = useGameStore(state => state.isMultiplayer);

    const groupRef = useRef<any>(null);
    const [isMoving, setIsMoving] = useState(false);
    const lastPos = useRef(new Vector3());

    useFrame((state, delta) => {
        if (!remotePlayer || !groupRef.current) return;

        // Interpolate position
        const targetPos = new Vector3(remotePlayer.position.x, remotePlayer.position.y, remotePlayer.position.z);
        groupRef.current.position.lerp(targetPos, 0.2);

        // Rotation
        groupRef.current.rotation.y = remotePlayer.rotation.y;

        // Movement detection for animation
        const dist = targetPos.distanceTo(lastPos.current);
        setIsMoving(dist > 0.01);
        lastPos.current.copy(targetPos);
    });

    if (!isMultiplayer || !remotePlayer) return null;

    return (
        <group ref={groupRef}>
            {/* Name Tag */}
            <Text
                position={[0, 2.2, 0]}
                fontSize={0.2}
                color="#ef4444"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.02}
                outlineColor="#000000"
            >
                ENEMY
            </Text>

            {/* Hitbox (Invisible but present for raycasts) */}
            <mesh position={[0, 0.9, 0]} name="ENEMY_HITBOX" visible={false}>
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

            {/* Weapon (Held in hand - simplified for now, attached to body group) */}
            <group position={[0.3, 1.3, 0.4]} rotation={[0, 0, 0]}>
                <mesh>
                    <boxGeometry args={[0.1, 0.1, 0.6]} />
                    <meshStandardMaterial color="#333" />
                </mesh>
            </group>
        </group>
    );
};
