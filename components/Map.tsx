import React from 'react';
import { RigidBody } from '@react-three/rapier';
import { MAP_WIDTH, MAP_LENGTH } from '../constants';

const Box = ({ color, ...props }: any) => (
  <RigidBody type="fixed" {...props}>
    <mesh name="WALL">
      <boxGeometry args={props.args} />
      <meshStandardMaterial color={color || "#64748b"} roughness={0.5} />
    </mesh>
    {/* Neon trim for visibility */}
    <mesh position={[0, props.args[1] / 2 - 0.1, props.args[2] / 2 + 0.01]}>
      <planeGeometry args={[props.args[0] * 0.8, 0.1]} />
      <meshBasicMaterial color="#0ea5e9" toneMapped={false} />
    </mesh>
  </RigidBody>
);

export const Map = () => {
  return (
    <group>
      {/* Floor */}
      <RigidBody type="fixed" friction={2}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} name="FLOOR">
          <planeGeometry args={[MAP_WIDTH + 20, MAP_LENGTH + 20]} />
          <meshStandardMaterial color="#334155" roughness={0.8} metalness={0.2} />
        </mesh>
        <gridHelper args={[100, 50, 0x38bdf8, 0x1e293b]} position={[0, 0.02, 0]} />
      </RigidBody>

      {/* Ceiling (invisible collider) */}
      <RigidBody type="fixed" position={[0, 20, 0]}>
        <mesh visible={false}>
          <boxGeometry args={[MAP_WIDTH, 1, MAP_LENGTH]} />
        </mesh>
      </RigidBody>

      {/* Outer Walls */}
      <Box position={[MAP_WIDTH / 2, 5, 0]} args={[1, 10, MAP_LENGTH]} color="#94a3b8" />
      <Box position={[-MAP_WIDTH / 2, 5, 0]} args={[1, 10, MAP_LENGTH]} color="#94a3b8" />
      <Box position={[0, 5, MAP_LENGTH / 2]} args={[MAP_WIDTH, 10, 1]} color="#94a3b8" />
      <Box position={[0, 5, -MAP_LENGTH / 2]} args={[MAP_WIDTH, 10, 1]} color="#94a3b8" />

      {/* --- CENTRAL ARENA --- */}
      {/* Central Pillar - LoS Blocker */}
      <Box position={[0, 3, 0]} args={[4, 6, 4]} color="#cbd5e1" />

      {/* Low Cover around Center */}
      <Box position={[0, 1, 6]} args={[6, 2, 1]} color="#64748b" />
      <Box position={[0, 1, -6]} args={[6, 2, 1]} color="#64748b" />

      {/* --- LEFT WING (High Ground) --- */}
      <RigidBody type="fixed" position={[-12, 3, 0]}>
        <mesh name="FLOOR">
          <boxGeometry args={[6, 0.5, 14]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
        <mesh position={[3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <planeGeometry args={[0.5, 14]} />
          <meshBasicMaterial color="#0ea5e9" side={2} />
        </mesh>
      </RigidBody>
      {/* Ramps Left */}
      <RigidBody type="fixed" position={[-12, 1.5, 9]} rotation={[0.4, 0, 0]}>
        <mesh name="FLOOR"><boxGeometry args={[4, 0.2, 6]} /><meshStandardMaterial color="#64748b" /></mesh>
      </RigidBody>
      <RigidBody type="fixed" position={[-12, 1.5, -9]} rotation={[-0.4, 0, 0]}>
        <mesh name="FLOOR"><boxGeometry args={[4, 0.2, 6]} /><meshStandardMaterial color="#64748b" /></mesh>
      </RigidBody>
      {/* Cover Left */}
      <Box position={[-12, 4, 0]} args={[4, 2, 1]} color="#94a3b8" />


      {/* --- RIGHT WING (Mirrored High Ground) --- */}
      <RigidBody type="fixed" position={[12, 3, 0]}>
        <mesh name="FLOOR">
          <boxGeometry args={[6, 0.5, 14]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
        <mesh position={[-3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <planeGeometry args={[0.5, 14]} />
          <meshBasicMaterial color="#0ea5e9" side={2} />
        </mesh>
      </RigidBody>
      {/* Ramps Right */}
      <RigidBody type="fixed" position={[12, 1.5, 9]} rotation={[0.4, 0, 0]}>
        <mesh name="FLOOR"><boxGeometry args={[4, 0.2, 6]} /><meshStandardMaterial color="#64748b" /></mesh>
      </RigidBody>
      <RigidBody type="fixed" position={[12, 1.5, -9]} rotation={[-0.4, 0, 0]}>
        <mesh name="FLOOR"><boxGeometry args={[4, 0.2, 6]} /><meshStandardMaterial color="#64748b" /></mesh>
      </RigidBody>
      {/* Cover Right */}
      <Box position={[12, 4, 0]} args={[4, 2, 1]} color="#94a3b8" />

      {/* --- SPAWN PROTECTION / COVER --- */}
      <Box position={[10, 1.5, 20]} args={[3, 3, 3]} color="#475569" />
      <Box position={[-10, 1.5, -20]} args={[3, 3, 3]} color="#475569" />

    </group>
  );
};