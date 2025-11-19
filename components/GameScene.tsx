
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, Stars } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { Player } from './Player';
import { Enemy } from './Enemy';
import { Map } from './Map';
import { Effects } from './Effects';
import { RemotePlayer } from './RemotePlayer';
import { GameState } from '../types';
import { useGameStore } from '../store';

export const GameScene = () => {
  const gameState = useGameStore(state => state.gameState);

  return (
    <div className="w-full h-full bg-gray-900">
      <Canvas shadows camera={{ fov: 75 }}>
        {/* Environment Lighting */}
        <hemisphereLight intensity={0.6} groundColor="#0f172a" color="#e2e8f0" />
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[50, 100, 50]}
          intensity={1.5}
          castShadow
          shadow-bias={-0.0001}
        />

        <Sky sunPosition={[100, 20, 100]} turbidity={0.5} rayleigh={0.5} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

        <Physics gravity={[0, -9.81, 0]}>
          <Map />
          {gameState !== GameState.MENU && <Player />}
          {/* Only show AI Enemy in Singleplayer */}
          {gameState !== GameState.MENU && !useGameStore(state => state.isMultiplayer) && <Enemy />}
          {/* RemotePlayer added here, assuming it interacts with physics */}
          {gameState !== GameState.MENU && <RemotePlayer />}
        </Physics>

        {/* Global Effects System */}
        <Effects />

        {/* Lighter Fog for better silhouette visibility */}
        <fog attach="fog" args={['#1e1b4b', 5, 70]} />
      </Canvas>
    </div>
  );
};
