
import React, { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, Object3D, Color, Vector3 } from 'three';

interface Particle {
  position: [number, number, number];
  velocity: [number, number, number];
  life: number;
  color: string;
}

export const Effects = () => {
  const meshRef = useRef<InstancedMesh>(null);
  const particles = useRef<Particle[]>([]);
  const dummy = new Object3D();
  const MAX_PARTICLES = 100;

  const tracerMeshRef = useRef<InstancedMesh>(null);
  const tracers = useRef<{ start: Vector3, end: Vector3, life: number, color: string }[]>([]);
  const tracerDummy = new Object3D();
  const MAX_TRACERS = 50;

  useEffect(() => {
    const handleImpact = (e: any) => {
      const { position, normal, color } = e.detail;

      // Spawn burst
      for (let i = 0; i < 8; i++) {
        if (particles.current.length >= MAX_PARTICLES) particles.current.shift();

        const spread = 0.5;
        const velocity: [number, number, number] = [
          normal.x * 2 + (Math.random() - 0.5) * spread,
          normal.y * 2 + (Math.random() - 0.5) * spread,
          normal.z * 2 + (Math.random() - 0.5) * spread,
        ];

        particles.current.push({
          position: [position.x, position.y, position.z],
          velocity,
          life: 1.0, // 1 second life
          color: color || '#fbbf24' // Default spark color
        });
      }
    };

    const handleShoot = (e: any) => {
      const { start, end, color } = e.detail;
      if (tracers.current.length >= MAX_TRACERS) tracers.current.shift();

      tracers.current.push({
        start: new Vector3(start.x, start.y, start.z),
        end: new Vector3(end.x, end.y, end.z),
        life: 1.0, // 0.1s duration normalized to 1.0? No, let's use real time or frames. 
        // Let's say life is 1.0 and we decay fast.
        color: color || '#ffffff'
      });
    };

    window.addEventListener('IMPACT', handleImpact);
    window.addEventListener('SHOOT', handleShoot);
    return () => {
      window.removeEventListener('IMPACT', handleImpact);
      window.removeEventListener('SHOOT', handleShoot);
    };
  }, []);

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Update particles
      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        p.life -= delta * 2;

        // Gravity
        p.velocity[1] -= delta * 5;

        // Move
        p.position[0] += p.velocity[0] * delta;
        p.position[1] += p.velocity[1] * delta;
        p.position[2] += p.velocity[2] * delta;

        if (p.life <= 0) {
          particles.current.splice(i, 1);
        }
      }

      // Render particles
      meshRef.current.count = particles.current.length;
      const color = new Color();

      particles.current.forEach((p, i) => {
        dummy.position.set(p.position[0], p.position[1], p.position[2]);
        const scale = p.life * 0.1;
        dummy.scale.set(scale, scale, scale);
        dummy.rotation.set(Math.random(), Math.random(), Math.random());
        dummy.updateMatrix();

        meshRef.current!.setMatrixAt(i, dummy.matrix);
        meshRef.current!.setColorAt(i, color.set(p.color));
      });

      meshRef.current.instanceMatrix.needsUpdate = true;
      if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    }

    // Update Tracers
    if (tracerMeshRef.current) {
      for (let i = tracers.current.length - 1; i >= 0; i--) {
        tracers.current[i].life -= delta * 5; // Fast decay
        if (tracers.current[i].life <= 0) {
          tracers.current.splice(i, 1);
        }
      }

      tracerMeshRef.current.count = tracers.current.length;
      const tColor = new Color();

      tracers.current.forEach((t, i) => {
        // Position at midpoint
        const mid = new Vector3().addVectors(t.start, t.end).multiplyScalar(0.5);
        tracerDummy.position.copy(mid);

        // Look at end
        tracerDummy.lookAt(t.end);

        // Scale length to distance, thickness fades
        const dist = t.start.distanceTo(t.end);
        tracerDummy.scale.set(0.05 * t.life, 0.05 * t.life, dist); // Z is length

        tracerDummy.updateMatrix();
        tracerMeshRef.current!.setMatrixAt(i, tracerDummy.matrix);
        tracerMeshRef.current!.setColorAt(i, tColor.set(t.color));
      });

      tracerMeshRef.current.instanceMatrix.needsUpdate = true;
      if (tracerMeshRef.current.instanceColor) tracerMeshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PARTICLES]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      <instancedMesh ref={tracerMeshRef} args={[undefined, undefined, MAX_TRACERS]}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshBasicMaterial toneMapped={false} transparent opacity={0.8} />
      </instancedMesh>
    </group>
  );
};
