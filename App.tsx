import React from 'react';
import { GameScene } from './components/GameScene';
import { UI } from './components/UI';

import { NetworkManager } from './components/NetworkManager';

function App() {
  return (
    <div className="w-full h-screen bg-black">
      <NetworkManager />
      <GameScene />
      <UI />
    </div>
  );
}

export default App;
