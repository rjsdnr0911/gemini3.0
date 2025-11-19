import React from 'react';
import { GameScene } from './components/GameScene';
import { UI } from './components/UI';

function App() {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      <GameScene />
      <UI />
    </div>
  );
}

export default App;
