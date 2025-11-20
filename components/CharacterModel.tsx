import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Vector3, MathUtils } from 'three';
import { Outlines } from '@react-three/drei';

interface CharacterModelProps {
    color?: string;
    isMoving?: boolean;
    animationSpeed?: number;
}

export const CharacterModel = ({ color = '#06b6d4', isMoving = false, animationSpeed = 10 }: CharacterModelProps) => {
    const group = useRef<Group>(null);
    const leftLeg = useRef<Group>(null);
    const rightLeg = useRef<Group>(null);
    const leftArm = useRef<Group>(null);
    const rightArm = useRef<Group>(null);
    const head = useRef<Group>(null);

    // Materials
    const bodyColor = color;
    const jointColor = '#111';
    const glowColor = color;
    const outlineColor = "#ffffff"; // White outline for high visibility
    const outlineThickness = 0.05;

    useFrame((state) => {
        if (!group.current) return;

        const t = state.clock.getElapsedTime();

        // Idle Animation (Breathing)
        if (head.current) {
            head.current.position.y = 1.6 + Math.sin(t * 2) * 0.02;
        }

        // Walk Animation
        if (isMoving) {
            const legAmp = 0.5;
            const armAmp = 0.4;

            if (leftLeg.current) leftLeg.current.rotation.x = Math.sin(t * animationSpeed) * legAmp;
            if (rightLeg.current) rightLeg.current.rotation.x = Math.sin(t * animationSpeed + Math.PI) * legAmp;

            if (leftArm.current) leftArm.current.rotation.x = Math.sin(t * animationSpeed + Math.PI) * armAmp;
            if (rightArm.current) rightArm.current.rotation.x = Math.sin(t * animationSpeed) * armAmp;
        } else {
            // Reset limbs
            if (leftLeg.current) leftLeg.current.rotation.x = MathUtils.lerp(leftLeg.current.rotation.x, 0, 0.1);
            if (rightLeg.current) rightLeg.current.rotation.x = MathUtils.lerp(rightLeg.current.rotation.x, 0, 0.1);
            if (leftArm.current) leftArm.current.rotation.x = MathUtils.lerp(leftArm.current.rotation.x, 0, 0.1);
            if (rightArm.current) rightArm.current.rotation.x = MathUtils.lerp(rightArm.current.rotation.x, 0, 0.1);
        }
    });

    return (
        <group ref={group} dispose={null}>
            {/* Torso */}
            <mesh position={[0, 1.1, 0]} castShadow>
                <boxGeometry args={[0.5, 0.6, 0.3]} />
                <meshStandardMaterial color={bodyColor} roughness={0.3} metalness={0.8} />
                <Outlines thickness={outlineThickness} color={outlineColor} />
            </mesh>
            {/* Chest Plate (Glow) */}
            <mesh position={[0, 1.2, 0.16]}>
                <boxGeometry args={[0.3, 0.3, 0.05]} />
                <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={2} />
            </mesh>

            {/* Head */}
            <group ref={head} position={[0, 1.6, 0]}>
                <mesh castShadow>
                    <boxGeometry args={[0.3, 0.35, 0.35]} />
                    <meshStandardMaterial color={bodyColor} roughness={0.3} metalness={0.8} />
                    <Outlines thickness={outlineThickness} color={outlineColor} />
                </mesh>
                {/* Visor */}
                <mesh position={[0, 0.05, 0.18]}>
                    <boxGeometry args={[0.25, 0.1, 0.05]} />
                    <meshStandardMaterial color="#000" emissive={glowColor} emissiveIntensity={3} />
                </mesh>
            </group>

            {/* Left Arm */}
            <group ref={leftArm} position={[-0.35, 1.3, 0]}>
                <mesh position={[0, -0.3, 0]} castShadow>
                    <boxGeometry args={[0.15, 0.7, 0.15]} />
                    <meshStandardMaterial color={jointColor} />
                    <Outlines thickness={outlineThickness} color={outlineColor} />
                </mesh>
                <mesh position={[0, -0.3, 0]}>
                    <boxGeometry args={[0.16, 0.3, 0.16]} />
                    <meshStandardMaterial color={bodyColor} />
                </mesh>
            </group>

            {/* Right Arm */}
            <group ref={rightArm} position={[0.35, 1.3, 0]}>
                <mesh position={[0, -0.3, 0]} castShadow>
                    <boxGeometry args={[0.15, 0.7, 0.15]} />
                    <meshStandardMaterial color={jointColor} />
                    <Outlines thickness={outlineThickness} color={outlineColor} />
                </mesh>
                <mesh position={[0, -0.3, 0]}>
                    <boxGeometry args={[0.16, 0.3, 0.16]} />
                    <meshStandardMaterial color={bodyColor} />
                </mesh>
            </group>

            {/* Left Leg */}
            <group ref={leftLeg} position={[-0.15, 0.8, 0]}>
                <mesh position={[0, -0.4, 0]} castShadow>
                    <boxGeometry args={[0.18, 0.8, 0.18]} />
                    <meshStandardMaterial color={jointColor} />
                    <Outlines thickness={outlineThickness} color={outlineColor} />
                </mesh>
                <mesh position={[0, -0.6, 0]} castShadow>
                    <boxGeometry args={[0.2, 0.4, 0.2]} />
                    <meshStandardMaterial color={bodyColor} />
                </mesh>
            </group>

            {/* Right Leg */}
            <group ref={rightLeg} position={[0.15, 0.8, 0]}>
                <mesh position={[0, -0.4, 0]} castShadow>
                    <boxGeometry args={[0.18, 0.8, 0.18]} />
                    <meshStandardMaterial color={jointColor} />
                    <Outlines thickness={outlineThickness} color={outlineColor} />
                </mesh>
                <mesh position={[0, -0.6, 0]} castShadow>
                    <boxGeometry args={[0.2, 0.4, 0.2]} />
                    <meshStandardMaterial color={bodyColor} />
                </mesh>
            </group>
        </group>
    );
};
