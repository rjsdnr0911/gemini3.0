import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../store';
import { Vector3, Quaternion } from 'three';
import { Text } from '@react-three/drei';

export const RemotePlayer = () => {
    const remotePlayer = useGameStore(state => state.remotePlayer);
    const isMultiplayer = useGameStore(state => state.isMultiplayer);

    const groupRef = useRef<any>(null);
    const bodyRef = useRef<any>(null);
    const headRef = useRef<any>(null);

    useFrame((state, delta) => {
        if (!remotePlayer || !groupRef.current) return;

        // Interpolate position for smoothness (simple lerp)
        const targetPos = new Vector3(remotePlayer.position.x, remotePlayer.position.y, remotePlayer.position.z);
        groupRef.current.position.lerp(targetPos, 0.2); // 0.2 factor for smoothing

        // Rotation (Y axis for body)
        // We don't have body rotation in packet, only camera rotation.
        // Let's use camera rotation Y for body facing.
        // remotePlayer.rotation is Euler {x,y,z}
        groupRef.current.rotation.y = remotePlayer.rotation.y;

        // Head/Camera pitch (X axis)
        if (headRef.current) {
            headRef.current.rotation.x = remotePlayer.rotation.x;
        }
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

            {/* Body Capsule Representation */}
            <mesh ref={bodyRef} position={[0, 0.9, 0]} name="ENEMY_HITBOX">
                <capsuleGeometry args={[0.4, 1.8, 4, 8]} />
                <meshStandardMaterial color="#ef4444" roughness={0.8} />
            </mesh>

            {/* Head / Visor */}
            <group ref={headRef} position={[0, 1.6, 0]}>
                <mesh position={[0, 0, 0.2]}>
                    <boxGeometry args={[0.3, 0.2, 0.2]} />
                    <meshStandardMaterial color="#000000" emissive="#ef4444" emissiveIntensity={2} />
                </mesh>
            </group>

            {/* Weapon (Simple Box for now) */}
            <group position={[0.3, 1.3, 0.4]} rotation={[0, 0, 0]}>
                <mesh>
                    <boxGeometry args={[0.1, 0.1, 0.6]} />
                    <meshStandardMaterial color="#333" />
                </mesh>
            </group>
        </group>
    );
};
