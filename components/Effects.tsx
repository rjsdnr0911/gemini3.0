
import React, { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, Object3D, Color, Vector3 } from 'three';

interface Particle {
  position: [number, number, number];
  velocity: [number, number, number];
  life: number;
  color: string;
}

interface Tracer {
  start: Vector3;
  end: Vector3;
  life: number;
  color: string;
}

export const Effects = () => {
  // Impact Particles
  const meshRef = useRef<InstancedMesh>(null);
  const particles = useRef<Particle[]>([]);
  const dummy = new Object3D();
  const MAX_PARTICLES = 50;

  // Bullet Tracers
  const tracerMeshRef = useRef<InstancedMesh>(null);
  const tracers = useRef<Tracer[]>([]);
  const tracerDummy = new Object3D();
  const MAX_TRACERS = 20;

  // Muzzle Flashes
  const flashMeshRef = useRef<InstancedMesh>(null);
  const flashes = useRef<{ position: Vector3, life: number }[]>([]);
  const flashDummy = new Object3D();
  const MAX_FLASHES = 10;

  useEffect(() => {
    const handleImpact = (e: any) => {
      const { position, normal, color } = e.detail;

      // Spawn burst
      for (let i = 0; i < 12; i++) {
        if (particles.current.length >= MAX_PARTICLES) particles.current.shift();

        const spread = 0.8;
        const velocity: [number, number, number] = [
          normal.x * 3 + (Math.random() - 0.5) * spread,
          normal.y * 3 + (Math.random() - 0.5) * spread,
          normal.z * 3 + (Math.random() - 0.5) * spread,
        ];

        particles.current.push({
          position: [position.x, position.y, position.z],
          velocity,
          life: 0.5 + Math.random() * 0.5,
          color: color || '#fbbf24'
        });
      }
    };

    const handleShoot = (e: any) => {
      const { start, end, color } = e.detail;

      // Tracer
      if (tracers.current.length >= MAX_TRACERS) tracers.current.shift();
      tracers.current.push({
        start: new Vector3(start.x, start.y, start.z),
        end: new Vector3(end.x, end.y, end.z),
        life: 1.0,
        color: color || '#ffffff'
      });

      // Muzzle Flash
      if (flashes.current.length >= MAX_FLASHES) flashes.current.shift();
      flashes.current.push({
        position: new Vector3(start.x, start.y, start.z),
        life: 1.0
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
        p.life -= delta * 3; // Faster fade

        // Gravity
        p.velocity[1] -= delta * 8;

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
        const scale = p.life * 0.15;
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
        tracers.current[i].life -= delta * 8; // Very fast tracer
        if (tracers.current[i].life <= 0) {
          tracers.current.splice(i, 1);
        }
      }

      tracerMeshRef.current.count = tracers.current.length;
      const tColor = new Color();

      tracers.current.forEach((t, i) => {
        const mid = new Vector3().addVectors(t.start, t.end).multiplyScalar(0.5);
        tracerDummy.position.copy(mid);
        tracerDummy.lookAt(t.end);
        const dist = t.start.distanceTo(t.end);
        tracerDummy.scale.set(0.03 * t.life, 0.03 * t.life, dist);
        tracerDummy.updateMatrix();
        tracerMeshRef.current!.setMatrixAt(i, tracerDummy.matrix);
        tracerMeshRef.current!.setColorAt(i, tColor.set(t.color));
      });

      tracerMeshRef.current.instanceMatrix.needsUpdate = true;
      if (tracerMeshRef.current.instanceColor) tracerMeshRef.current.instanceColor.needsUpdate = true;
    }

    // Update Flashes
    if (flashMeshRef.current) {
      for (let i = flashes.current.length - 1; i >= 0; i--) {
        flashes.current[i].life -= delta * 15; // Extremely fast flash
        if (flashes.current[i].life <= 0) {
          flashes.current.splice(i, 1);
        }
      }

      flashMeshRef.current.count = flashes.current.length;
      const fColor = new Color('#fbbf24'); // Gold/Yellow flash

      flashes.current.forEach((f, i) => {
        flashDummy.position.copy(f.position);
        // Random rotation for variety
        flashDummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        const scale = 0.3 * f.life;
        flashDummy.scale.set(scale, scale, scale);
        flashDummy.updateMatrix();

        flashMeshRef.current!.setMatrixAt(i, flashDummy.matrix);
        flashMeshRef.current!.setColorAt(i, fColor);
      });

      flashMeshRef.current.instanceMatrix.needsUpdate = true;
      if (flashMeshRef.current.instanceColor) flashMeshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* Impact Particles */}
      <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PARTICLES]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {/* Tracers */}
      <instancedMesh ref={tracerMeshRef} args={[undefined, undefined, MAX_TRACERS]}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshBasicMaterial toneMapped={false} transparent opacity={0.8} />
      </instancedMesh>

      {/* Muzzle Flashes */}
      <instancedMesh ref={flashMeshRef} args={[undefined, undefined, MAX_FLASHES]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#fbbf24" toneMapped={false} transparent opacity={0.9} />
      </instancedMesh>
    </group>
  );
};
