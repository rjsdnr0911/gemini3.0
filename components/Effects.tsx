
import React, { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, Object3D, Color } from 'three';

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

    window.addEventListener('IMPACT', handleImpact);
    return () => window.removeEventListener('IMPACT', handleImpact);
  }, []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

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

    // Render instances
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
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PARTICLES]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
};
