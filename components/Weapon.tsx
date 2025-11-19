
import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group, Vector3, MathUtils } from 'three';
import { WeaponType } from '../types';
import { WEAPONS } from '../constants';

interface WeaponProps {
  type: WeaponType;
  isFiring: boolean;
  isAiming: boolean;
  isReloading: boolean;
  isCycling: boolean; // For Sniper bolt action
}

const MuzzleFlash = ({ color, position }: { color: string, position: [number, number, number] }) => (
  <group position={position}>
    <pointLight intensity={5} distance={3} color={color} />
    <mesh rotation={[0, 0, Math.random() * Math.PI]}>
      <planeGeometry args={[0.3, 0.3]} />
      <meshBasicMaterial color={color === '#0ea5e9' ? "#bae6fd" : "#fef9c3"} transparent opacity={0.8} />
    </mesh>
    <mesh rotation={[0, Math.PI / 2, Math.random() * Math.PI]}>
      <planeGeometry args={[0.3, 0.3]} />
      <meshBasicMaterial color={color === '#0ea5e9' ? "#bae6fd" : "#fef9c3"} transparent opacity={0.8} />
    </mesh>
  </group>
);

const RifleModel = ({ isFiring }: { isFiring: boolean }) => (
  <group position={[0, 0, 0]} rotation={[0, 0, 0]}>
    {/* Main Body */}
    <mesh name="WEAPON_MODEL" position={[0, 0.05, 0.2]}>
      <boxGeometry args={[0.1, 0.18, 0.5]} />
      <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.6} />
    </mesh>
    {/* Top Rail */}
    <mesh name="WEAPON_MODEL" position={[0, 0.15, 0.1]}>
      <boxGeometry args={[0.08, 0.04, 0.6]} />
      <meshStandardMaterial color="#475569" />
    </mesh>
    {/* Barrel */}
    <mesh name="WEAPON_MODEL" position={[0, 0.05, -0.4]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.035, 0.035, 0.8, 16]} />
      <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.2} />
    </mesh>
    {/* Handguard */}
    <mesh name="WEAPON_MODEL" position={[0, 0.05, -0.25]}>
      <boxGeometry args={[0.11, 0.12, 0.45]} />
      <meshStandardMaterial color="#1e293b" roughness={0.6} />
    </mesh>
    {/* Neon Strips */}
    <mesh name="WEAPON_MODEL" position={[0.06, 0.05, -0.25]}>
      <boxGeometry args={[0.01, 0.02, 0.4]} />
      <meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={3} />
    </mesh>
    <mesh name="WEAPON_MODEL" position={[-0.06, 0.05, -0.25]}>
      <boxGeometry args={[0.01, 0.02, 0.4]} />
      <meshStandardMaterial color="#0ea5e9" emissive="#0ea5e9" emissiveIntensity={3} />
    </mesh>
    {/* Magazine */}
    <mesh name="WEAPON_MODEL" position={[0, -0.15, 0.2]} rotation={[0.2, 0, 0]}>
      <boxGeometry args={[0.09, 0.25, 0.12]} />
      <meshStandardMaterial color="#0f172a" roughness={0.5} />
    </mesh>
    {/* Stock */}
    <mesh name="WEAPON_MODEL" position={[0, -0.05, 0.65]}>
      <boxGeometry args={[0.08, 0.15, 0.3]} />
      <meshStandardMaterial color="#334155" />
    </mesh>
    {/* Sight */}
    <group position={[0, 0.2, 0.1]}>
      <mesh name="WEAPON_MODEL" position={[0, 0, 0]}>
        <boxGeometry args={[0.08, 0.02, 0.1]} />
        <meshStandardMaterial color="#000" />
      </mesh>
      <mesh name="WEAPON_MODEL" position={[0, 0.05, -0.04]}>
        <boxGeometry args={[0.09, 0.08, 0.02]} />
        <meshStandardMaterial color="#000" />
      </mesh>
      {/* Red Dot */}
      <mesh position={[0, 0.05, -0.039]}>
        <circleGeometry args={[0.005]} />
        <meshBasicMaterial color="red" />
      </mesh>
    </group>

    {isFiring && <MuzzleFlash color="#0ea5e9" position={[0, 0.05, -0.9]} />}
  </group>
);

const PistolModel = ({ isFiring }: { isFiring: boolean }) => (
  <group position={[0, 0, 0]} rotation={[0, 0, 0]}>
    <mesh name="WEAPON_MODEL" position={[0, -0.1, 0.1]} rotation={[0.15, 0, 0]}>
      <boxGeometry args={[0.09, 0.2, 0.11]} />
      <meshStandardMaterial color="#334155" roughness={0.9} />
    </mesh>
    <mesh name="WEAPON_MODEL" position={[0, 0.02, -0.05]}>
      <boxGeometry args={[0.1, 0.12, 0.4]} />
      <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
    </mesh>
    <mesh name="WEAPON_MODEL" position={[0, -0.06, -0.05]}>
      <boxGeometry args={[0.09, 0.05, 0.35]} />
      <meshStandardMaterial color="#475569" />
    </mesh>
    <mesh name="WEAPON_MODEL" position={[0, 0.08, -0.22]}>
      <boxGeometry args={[0.02, 0.02, 0.02]} />
      <meshStandardMaterial color="#eab308" emissive="#eab308" emissiveIntensity={3} />
    </mesh>
    {isFiring && <MuzzleFlash color="#eab308" position={[0, 0.02, -0.4]} />}
  </group>
);

const KnifeModel = ({ isFiring }: { isFiring: boolean }) => (
  <group position={[0, 0, 0]} rotation={[0.2, -0.3, 0.2]}>
    <mesh name="WEAPON_MODEL" position={[0, -0.05, 0.1]} rotation={[0.4, 0, 0]}>
      <cylinderGeometry args={[0.035, 0.04, 0.25]} />
      <meshStandardMaterial color="#1e293b" />
    </mesh>
    <mesh name="WEAPON_MODEL" position={[0, 0.18, -0.05]} rotation={[Math.PI / 2, 0, 0]}>
      <boxGeometry args={[0.01, 0.35, 0.06]} />
      <meshStandardMaterial color="#f8fafc" metalness={1} roughness={0.1} />
    </mesh>
    <mesh name="WEAPON_MODEL" position={[0, 0.18, -0.08]} rotation={[Math.PI / 2, 0, 0]}>
      <boxGeometry args={[0.005, 0.34, 0.01]} />
      <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={3} />
    </mesh>
  </group>
);

const SniperModel = ({ isFiring, isCycling }: { isFiring: boolean, isCycling: boolean }) => {
  const boltRef = useRef<Group>(null);

  useFrame((state) => {
    if (boltRef.current) {
      // Simple bolt animation: if cycling, move back and forth
      if (isCycling) {
        const t = state.clock.getElapsedTime() * 10;
        // 0 to 1 to 0
        const cyclePos = Math.sin(t) * 0.5 + 0.5;
        boltRef.current.position.z = 0.1 + cyclePos * 0.15;
        boltRef.current.rotation.z = 0.5 - cyclePos * 0.8;
      } else {
        boltRef.current.position.z = MathUtils.lerp(boltRef.current.position.z, 0.1, 0.1);
        boltRef.current.rotation.z = MathUtils.lerp(boltRef.current.rotation.z, 0.5, 0.1);
      }
    }
  });

  return (
    <group position={[0, 0, 0]} rotation={[0, 0, 0]}>
      {/* Body */}
      <mesh name="WEAPON_MODEL" position={[0, 0, 0.2]}>
        <boxGeometry args={[0.12, 0.2, 0.6]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} />
      </mesh>
      {/* Long Barrel */}
      <mesh name="WEAPON_MODEL" position={[0, 0.05, -0.6]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.04, 1.2, 16]} />
        <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Scope */}
      <group position={[0, 0.18, 0.1]}>
        <mesh name="WEAPON_MODEL" position={[0, -0.05, 0]}>
          <boxGeometry args={[0.04, 0.05, 0.2]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <mesh name="WEAPON_MODEL" rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.06, 0.4, 16]} />
          <meshStandardMaterial color="#000000" roughness={0.1} />
        </mesh>
        <mesh position={[0, 0, -0.201]} rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.045]} />
          <meshBasicMaterial color="#818cf8" opacity={0.5} transparent />
        </mesh>
      </group>
      {/* Stock */}
      <mesh name="WEAPON_MODEL" position={[0, -0.05, 0.6]} rotation={[-0.1, 0, 0]}>
        <boxGeometry args={[0.08, 0.15, 0.4]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      {/* Bolt Handle (Animated) */}
      <group ref={boltRef} position={[0.08, 0.05, 0.1]}>
        <mesh name="WEAPON_MODEL" rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 0.1]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} />
        </mesh>
        <mesh position={[0, 0.05, 0]} rotation={[0, 0, 0]}>
          <sphereGeometry args={[0.015]} />
          <meshStandardMaterial color="#334155" />
        </mesh>
      </group>

      {isFiring && <MuzzleFlash color="#a855f7" position={[0, 0.05, -1.3]} />}
    </group>
  );
};

export const Weapon: React.FC<WeaponProps> = ({ type, isFiring, isAiming, isReloading, isCycling }) => {
  const groupRef = useRef<Group>(null);
  const recoilRef = useRef(0);
  const equipProgress = useRef(0);

  useEffect(() => { equipProgress.current = 0; }, [type]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Animation: Equip (smooth lerp to 1)
    equipProgress.current = MathUtils.lerp(equipProgress.current, 1, delta * 5);
    const equipOffset = (1 - equipProgress.current) * -0.5;

    // --- Dynamic Recoil Logic ---
    const targetRecoil = isFiring ? WEAPONS[type].recoil : 0;

    // Determine Lerp Speed (Attack vs Decay)
    let lerpSpeed = 10;

    if (isFiring) {
      lerpSpeed = 40;
      if (type === WeaponType.SNIPER) lerpSpeed = 20;
    } else {
      lerpSpeed = 10;
      if (type === WeaponType.SNIPER) lerpSpeed = 3;
      if (type === WeaponType.PISTOL) lerpSpeed = 15;
    }

    recoilRef.current = MathUtils.lerp(recoilRef.current, targetRecoil, delta * lerpSpeed);


    // Animation: Sway
    const time = state.clock.getElapsedTime();
    const swayX = Math.sin(time * 1.5) * 0.002;
    const swayY = Math.cos(time * 2.5) * 0.002;
    const moveSway = Math.sin(time * 10) * 0.002;

    // Base Position
    let targetPos = new Vector3(0.25, -0.25 + equipOffset, -0.5);

    if (type === WeaponType.RIFLE) {
      if (isAiming) {
        targetPos.set(0, -0.23 + equipOffset, -0.6);
      }
    } else if (type === WeaponType.PISTOL) {
      targetPos.set(0.25, -0.2 + equipOffset, -0.4);
      if (isAiming) targetPos.set(0, -0.15 + equipOffset, -0.3);
    } else if (type === WeaponType.KNIFE) {
      targetPos.set(0.3, -0.2 + equipOffset, -0.3);
    } else if (type === WeaponType.SNIPER) {
      targetPos.set(0.25, -0.3 + equipOffset, -0.6);
      if (isAiming) {
        // Hide model via render logic, but move pos just in case
        targetPos.set(0, -0.5, -0.5);
      }
    }

    // Apply Recoil Impulse
    const zKickMultiplier = type === WeaponType.SNIPER ? 1.5 : 2.5;
    targetPos.z += recoilRef.current * zKickMultiplier;

    // Apply Jitter (Rifle)
    if (isFiring && type === WeaponType.RIFLE) {
      const jitterAmt = 0.01;
      targetPos.x += (Math.random() - 0.5) * jitterAmt;
      targetPos.y += (Math.random() - 0.5) * jitterAmt;
    }

    groupRef.current.position.lerp(targetPos, delta * 15);

    // --- Rotation Logic ---
    let targetRotX = 0;
    const rotMultiplier = type === WeaponType.SNIPER ? 0.5 : (type === WeaponType.PISTOL ? 2.5 : 1.5);
    targetRotX += recoilRef.current * rotMultiplier;

    if (isReloading) {
      targetRotX -= 0.5;
      groupRef.current.rotation.z = MathUtils.lerp(groupRef.current.rotation.z, 0.2, delta * 5);
    } else {
      groupRef.current.rotation.z = MathUtils.lerp(groupRef.current.rotation.z, 0, delta * 5);
    }

    // Cycling Animation (Sniper Bolt)
    if (isCycling && type === WeaponType.SNIPER) {
      targetRotX += 0.1; // Slight muzzle rise
      groupRef.current.rotation.z = MathUtils.lerp(groupRef.current.rotation.z, 0.1, delta * 5);
    }

    if (type === WeaponType.KNIFE && isFiring) {
      targetRotX -= 0.5;
      groupRef.current.rotation.y = -0.5;
    } else if (type === WeaponType.SNIPER && isReloading) {
      groupRef.current.rotation.z = 0.5;
      targetRotX += 0.2;
    } else {
      groupRef.current.rotation.y = MathUtils.lerp(groupRef.current.rotation.y, 0, delta * 10);
    }

    groupRef.current.rotation.x = MathUtils.lerp(groupRef.current.rotation.x, targetRotX, delta * 20);

    groupRef.current.position.x += swayX;
    groupRef.current.position.y += swayY + moveSway;
  });

  // Conditionally render meshes based on aiming state for Sniper AND Rifle
  // Show model if NOT aiming, OR if cycling (because unscope forces show model)
  const showModel = !((type === WeaponType.SNIPER || type === WeaponType.RIFLE) && isAiming);

  return (
    <group ref={groupRef}>
      {type === WeaponType.RIFLE && showModel && <RifleModel isFiring={isFiring} />}
      {type === WeaponType.PISTOL && <PistolModel isFiring={isFiring} />}
      {type === WeaponType.KNIFE && <KnifeModel isFiring={isFiring} />}
      {type === WeaponType.SNIPER && showModel && <SniperModel isFiring={isFiring} isCycling={isCycling} />}
    </group>
  );
};
