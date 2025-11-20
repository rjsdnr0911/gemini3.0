
import React, { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../store';
import { WEAPONS, WIN_SCORE } from '../constants';
import { GameState } from '../types';
import { Crosshair, Heart, Target, Trophy, Skull, RefreshCw, X, Move, Minimize2, Crosshair as AimIcon, RotateCw } from 'lucide-react';
import { analyzeMatch } from '../services/geminiService';
import { controls } from '../controls';
import { ChatBox } from './ChatBox';

export const UI = () => {
  const {
    health,
    ammo,
    currentWeapon,
    playerScore,
    enemyScore,
    gameState,
    stats,
    setAnalysis,
    analysisResult,
    resetGame,
    lastHitTime,
    // Multiplayer
    isMultiplayer,
    setMultiplayer,
    myPeerId,
    connectionStatus,
    isHost,
    killFeed,
    killBanner,
    isReady,
    isOpponentReady,
    roundsWon,
    opponentRoundsWon,
    roundWinner,
    settings,
    updateSettings
  } = useGameStore();

  const [showMultiplayerMenu, setShowMultiplayerMenu] = useState(false);
  const [targetPeerId, setTargetPeerId] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [showHitMarker, setShowHitMarker] = useState(false);
  const weapon = WEAPONS[currentWeapon];
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // Scope visibility check
  const [scopeVisible, setScopeVisible] = useState(false);

  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    const interval = setInterval(() => {
      // Hide scope if controls say aiming but we are actually cycling (handled in Player.tsx state, but UI needs to know visual state)
      // Player.tsx updates controls.aim? No, it updates local state. 
      // But Player logic sets `setIsAiming` based on cycle.
      // However, this UI component doesn't see `isAiming` from Player. 
      // We can check `controls.aim` here, but visually we need to hide scope if we are cycling.
      // Since `isCycling` isn't in global store, we rely on the fact that `controls.aim` is the raw input.
      // Wait, to properly hide scope when cycling, we need that state.
      // For now, basic check:
      const aiming = controls.aim && (currentWeapon === 'SNIPER' || currentWeapon === 'RIFLE');
      if (aiming !== scopeVisible) setScopeVisible(aiming);
    }, 50);
    return () => clearInterval(interval);
  }, [gameState, currentWeapon, scopeVisible]);


  useEffect(() => {
    if (gameState === 'GAME_OVER' && !analysisResult) {
      setAnalysis("Requesting HQ Analysis...");
      analyzeMatch(stats, playerScore >= WIN_SCORE).then(setAnalysis);
    }
  }, [gameState, stats, playerScore, analysisResult, setAnalysis]);

  useEffect(() => {
    if (Date.now() - lastHitTime < 100) {
      setShowHitMarker(true);
      const timer = setTimeout(() => setShowHitMarker(false), 150);
      return () => clearTimeout(timer);
    }
  }, [lastHitTime]);

  // --- Mobile Touch Handlers ---
  const joystickRef = useRef<HTMLDivElement>(null);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });

  const handleJoystickStart = (e: React.TouchEvent) => {
    // Initial touch logic
  };

  const handleJoystickMove = (e: React.TouchEvent) => {
    if (!joystickRef.current) return;
    const touch = e.touches[0];
    const rect = joystickRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = (touch.clientX - centerX) / (rect.width / 2);
    const deltaY = (touch.clientY - centerY) / (rect.height / 2);

    // Clamp distance
    const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);
    const maxDist = 1;
    const factor = distance > maxDist ? maxDist / distance : 1;

    const finalX = deltaX * factor;
    const finalY = deltaY * factor;

    setJoystickPos({ x: finalX * 30, y: finalY * 30 });
    controls.moveVector = { x: finalX, y: finalY };
  };

  const handleJoystickEnd = () => {
    setJoystickPos({ x: 0, y: 0 });
    controls.moveVector = { x: 0, y: 0 };
  };

  const lookPadRef = useRef<HTMLDivElement>(null);
  const lastTouchRef = useRef<{ x: number, y: number } | null>(null);

  useEffect(() => {
    const pad = lookPadRef.current;
    if (!pad) return;

    const onTouchStart = (e: TouchEvent) => {
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      e.preventDefault();
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!lastTouchRef.current) return;
      const now = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      // Sensitivity Factor: Multiplier to make touch look feel natural
      const sensitivity = 1.5;
      const deltaX = (now.x - lastTouchRef.current.x) * sensitivity;
      const deltaY = (now.y - lastTouchRef.current.y) * sensitivity;

      controls.lookDelta = { x: deltaX, y: deltaY };
      lastTouchRef.current = now;
      e.preventDefault();
    };

    const onTouchEnd = (e: TouchEvent) => {
      lastTouchRef.current = null;
      controls.lookDelta = { x: 0, y: 0 };
      e.preventDefault();
    };

    pad.addEventListener('touchstart', onTouchStart, { passive: false });
    pad.addEventListener('touchmove', onTouchMove, { passive: false });
    pad.addEventListener('touchend', onTouchEnd, { passive: false });
    return () => {
      pad.removeEventListener('touchstart', onTouchStart);
      pad.removeEventListener('touchmove', onTouchMove);
      pad.removeEventListener('touchend', onTouchEnd);
    };
  }, []);


  // --- Early Returns for Menu/Game Over moved to ensure Hooks run consistently ---
  // We will render these conditionally inside the return statement or use a separate component structure.
  // However, to fix the "Rendered more hooks than during the previous render" error quickly without refactoring everything:
  // We must ensure all `use` hooks (useEffect, useState, useRef, useGameStore) are called BEFORE any early return.

  // All hooks are already above. Let's check if there are any hidden ones.
  // `useGameStore` is called at top. `useState`, `useEffect`, `useRef` are called.
  // Ah, `useGameStore(state => state.killFeed)` inside the JSX map is a hook call!
  // And `useGameStore(state => state.killBanner)` inside JSX is also a hook call!
  // These are inside the return statement, which is fine IF the return statement is always reached.
  // BUT, we have early returns for MENU and GAME_OVER above!
  // So when state changes from MENU to PLAYING, the component re-renders and suddenly hits the main return,
  // which contains NEW hook calls (useGameStore selectors) that weren't hit in the MENU return.

  // FIX: Extract these selections to the top level.


  if (gameState === GameState.MENU) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center z-50 text-white overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 z-[-1] bg-cover bg-center"
          style={{
            backgroundImage: 'url(/main_menu_bg.png)',
            filter: 'brightness(0.4) blur(2px)'
          }}
        />

        {/* Animated Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px] [transform:perspective(500px)_rotateX(60deg)] origin-bottom opacity-30 animate-pulse pointer-events-none"></div>

        <h1 className="text-6xl font-bold mb-8 text-cyan-400 tracking-tighter" style={{ textShadow: '0 0 20px cyan' }}>
          NEON FRAG
        </h1>

        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setShowSettings(true)}
            className="px-8 py-4 bg-gray-700 hover:bg-gray-600 rounded text-xl font-bold transition-all hover:scale-105"
          >
            SETTINGS
          </button>
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-gray-900 p-8 rounded-lg border border-cyan-500 w-96">
              <h2 className="text-2xl font-bold mb-6 text-cyan-400">SETTINGS</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-1">Mouse Sensitivity ({settings.sensitivity.toFixed(1)})</label>
                  <input
                    type="range"
                    min="0.1"
                    max="5.0"
                    step="0.1"
                    value={settings.sensitivity}
                    onChange={(e) => updateSettings({ sensitivity: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Zoom Sensitivity ({settings.zoomSensitivity.toFixed(1)})</label>
                  <input
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.1"
                    value={settings.zoomSensitivity}
                    onChange={(e) => updateSettings({ zoomSensitivity: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Nickname</label>
                  <input
                    type="text"
                    value={useGameStore.getState().nickname}
                    onChange={(e) => useGameStore.getState().setNickname(e.target.value)}
                    className="w-full bg-black p-2 rounded border border-gray-600 focus:border-cyan-500 outline-none text-white"
                    placeholder="Enter Nickname"
                    maxLength={12}
                  />
                </div>
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="mt-8 w-full py-2 bg-cyan-600 hover:bg-cyan-500 rounded font-bold"
              >
                CLOSE
              </button>
            </div>
          </div>
        )}

        {!showMultiplayerMenu ? (
          <div className="flex flex-col gap-4">
            <button
              onClick={() => {
                setMultiplayer(false, false);
                useGameStore.getState().setGameState(GameState.PLAYING);
              }}
              className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 rounded text-2xl font-bold transition-all clip-path-slant"
            >
              DEPLOY TO ARENA (SINGLE)
            </button>
            <button
              onClick={() => {
                setMultiplayer(true, true); // Default to host init
                setShowMultiplayerMenu(true);
              }}
              className="px-8 py-4 bg-purple-600 hover:bg-purple-500 rounded text-2xl font-bold transition-all clip-path-slant"
            >
              ONLINE MULTIPLAYER
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 bg-gray-900 p-8 rounded-lg border border-purple-500">
            <h2 className="text-2xl font-bold mb-4 text-center">ONLINE LOBBY</h2>

            <div className="flex gap-4 mb-4">
              <button
                onClick={() => setMultiplayer(true, true)}
                className={`flex-1 py-2 rounded ${useGameStore.getState().isHost ? 'bg-purple-600' : 'bg-gray-700'}`}
              >
                HOST GAME
              </button>
              <button
                onClick={() => setMultiplayer(true, false)}
                className={`flex-1 py-2 rounded ${!useGameStore.getState().isHost ? 'bg-cyan-600' : 'bg-gray-700'}`}
              >
                JOIN GAME
              </button>
            </div>

            {useGameStore.getState().isHost ? (
              <div className="text-center">
                <p className="text-gray-400 mb-2">Your Room ID:</p>
                <div className="bg-black p-4 rounded text-xl font-mono select-all cursor-pointer text-yellow-400" onClick={(e) => navigator.clipboard.writeText(e.currentTarget.innerText)}>
                  {myPeerId || 'Generating...'}
                </div>
                <p className="text-sm text-gray-500 mt-2">Share this ID with your friend</p>
                <div className="mt-4 text-cyan-400 animate-pulse">
                  {connectionStatus === 'CONNECTING' ? 'Waiting for opponent...' : connectionStatus}
                </div>

                {connectionStatus === 'CONNECTED' && (
                  <div className="mt-6">
                    <div className="flex justify-center gap-8 mb-4">
                      <div className={`text-xl font-bold ${isReady ? 'text-green-500' : 'text-gray-500'}`}>
                        YOU: {isReady ? 'READY' : 'NOT READY'}
                      </div>
                      {/* Opponent status hidden as requested */}
                    </div>

                    <div className="flex flex-col gap-4 items-center">
                      <button
                        onClick={() => {
                          const newReady = !isReady;
                          useGameStore.getState().setReady(newReady);
                          window.dispatchEvent(new CustomEvent('SEND_READY', { detail: { isReady: newReady } }));
                        }}
                        className={`px-8 py-3 rounded font-bold text-xl ${isReady ? 'bg-green-600' : 'bg-gray-600'}`}
                      >
                        {isReady ? 'READY!' : 'CLICK TO READY'}
                      </button>

                      {/* LAUNCH BUTTON - Always visible for Host */}
                      <button
                        onClick={() => {
                          console.log('Dispatching START_GAME event');
                          window.dispatchEvent(new CustomEvent('START_GAME'));
                        }}
                        className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded animate-bounce"
                      >
                        LAUNCH MISSION
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-gray-400">Enter Host ID:</p>
                <input
                  type="text"
                  value={targetPeerId}
                  onChange={(e) => setTargetPeerId(e.target.value)}
                  className="bg-black p-3 rounded text-white border border-gray-600 focus:border-cyan-500 outline-none"
                  placeholder="Paste Room ID here"
                />
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('CONNECT_PEER', { detail: { targetId: targetPeerId } }));
                  }}
                  disabled={!targetPeerId || connectionStatus === 'CONNECTED'}
                  className="mt-2 py-3 bg-cyan-600 hover:bg-cyan-500 rounded font-bold disabled:opacity-50"
                >
                  {connectionStatus === 'CONNECTED' ? 'CONNECTED!' : 'CONNECT & JOIN'}
                </button>

                {connectionStatus === 'CONNECTED' && (
                  <div className="mt-6 text-center">
                    <div className="flex justify-center gap-8 mb-4">
                      <div className={`text-xl font-bold ${isReady ? 'text-green-500' : 'text-gray-500'}`}>
                        YOU: {isReady ? 'READY' : 'NOT READY'}
                      </div>
                      {/* Host status hidden as requested */}
                    </div>

                    <button
                      onClick={() => {
                        const newReady = !isReady;
                        useGameStore.getState().setReady(newReady);
                        window.dispatchEvent(new CustomEvent('SEND_READY', { detail: { isReady: newReady } }));
                      }}
                      className={`px-8 py-3 rounded font-bold text-xl ${isReady ? 'bg-green-600' : 'bg-gray-600'}`}
                    >
                      {isReady ? 'READY!' : 'CLICK TO READY'}
                    </button>

                    {isReady && isOpponentReady && (
                      <div className="mt-4 text-yellow-400 animate-pulse font-bold">
                        WAITING FOR HOST TO START...
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setShowMultiplayerMenu(false)}
              className="mt-4 text-gray-400 hover:text-white underline"
            >
              Back to Menu
            </button>
          </div>
        )
        }

        <div className="mt-12 text-gray-400 text-sm">
          WASD to Move • SPACE to Jump • CLICK to Shoot • R to Reload
        </div>
        <div className="absolute bottom-4 left-4 w-1/3 h-1/3 pointer-events-auto">
          <ChatBox />
        </div>
      </div >
    );
  }

  if (gameState === 'GAME_OVER') {
    const won = useGameStore.getState().matchWinner === 'YOU';
    return (
      <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 text-white">
        <h1 className={`text-7xl font-bold mb-2 ${won ? 'text-green-500' : 'text-red-500'}`}>
          {won ? 'MATCH VICTORY' : 'MATCH DEFEAT'}
        </h1>
        <div className="flex gap-8 mb-8 text-2xl font-mono">
          <span className="text-cyan-400">{useGameStore.getState().nickname}: {playerScore}</span>
          <span className="text-gray-500">-</span>
          <span className="text-purple-400">{useGameStore.getState().opponentNickname}: {enemyScore}</span>
        </div>

        <div className="bg-gray-800 border-l-4 border-yellow-500 p-6 max-w-2xl w-full mb-8 shadow-lg">
          <h3 className="text-yellow-500 font-bold mb-2 flex items-center gap-2">
            <Target size={20} /> TACTICAL ANALYSIS (GEMINI AI)
          </h3>
          <p className="text-gray-300 text-lg italic leading-relaxed min-h-[100px]">
            {analysisResult}
          </p>
        </div>

        <button
          onClick={resetGame}
          className="py-3 px-8 bg-white text-black font-bold hover:bg-gray-200 rounded flex items-center gap-2"
        >
          <RefreshCw size={20} /> REPLAY MISSION
        </button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      <ChatBox />
      {/* --- SNIPER SCOPE OVERLAY --- */}
      {scopeVisible && currentWeapon === 'SNIPER' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
          {/* CSS Radial Gradient Mask for Scope */}
          <div className="absolute inset-0" style={{
            background: 'radial-gradient(circle closest-side, transparent 30%, black 31%)',
          }}></div>

          {/* Crosshair Lines (Only visible in center) */}
          <div className="relative w-full h-full flex items-center justify-center opacity-80">
            <div className="w-full h-[1px] bg-black absolute"></div>
            <div className="h-full w-[1px] bg-black absolute"></div>
            {/* Round Score */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-4 text-2xl font-bold text-white drop-shadow-lg">
              <span className="text-cyan-400">{useGameStore.getState().nickname} {roundsWon}</span>
              <span className="text-gray-400">-</span>
              <span className="text-red-500">{opponentRoundsWon} {useGameStore.getState().opponentNickname}</span>
            </div>

            {/* Round End Message */}
            {roundWinner && (
              <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
                <div className="bg-black/50 px-12 py-6 rounded-lg backdrop-blur-sm border border-white/20 animate-in fade-in zoom-in duration-300">
                  <h2 className={`text-6xl font-black italic tracking-tighter ${roundWinner === 'YOU' ? 'text-cyan-400' : 'text-red-500'}`} style={{ textShadow: '0 0 30px currentColor' }}>
                    {roundWinner === 'YOU' ? 'ROUND WON' : 'ROUND LOST'}
                  </h2>
                </div>
              </div>
            )}

            {/* Kill Feed */}
            {/* Mil-dots */}
            <div className="absolute w-[400px] h-[1px] flex justify-between">
              {[...Array(9)].map((_, i) => <div key={i} className="w-[1px] h-[10px] bg-black"></div>)}
            </div>
            <div className="absolute h-[400px] w-[1px] flex flex-col justify-between">
              {[...Array(9)].map((_, i) => <div key={i} className="h-[1px] w-[10px] bg-black"></div>)}
            </div>
          </div>

          <div className="absolute bottom-[20%] text-green-500 text-xs font-mono tracking-widest opacity-80">
            RANGE: {Math.floor(Math.random() * 100 + 50)}m <br />
            WIND: NEGATIVE
          </div>
        </div>
      )}

      {/* --- ROUND END OVERLAY (Global) --- */}
      {roundWinner && (
        <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none">
          <div className="bg-black/50 px-12 py-6 rounded-lg backdrop-blur-sm border border-white/20 animate-in fade-in zoom-in duration-300">
            <h2 className={`text-6xl font-black italic tracking-tighter ${roundWinner === 'YOU' ? 'text-cyan-400' : 'text-red-500'}`} style={{ textShadow: '0 0 30px currentColor' }}>
              {roundWinner === 'YOU' ? 'ROUND WON' : 'ROUND LOST'}
            </h2>
          </div>
        </div>
      )}

      {/* --- RED DOT OVERLAY (RIFLE) --- */}
      {scopeVisible && currentWeapon === 'RIFLE' && (
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Vignette / Housing Blur */}
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(circle at center, transparent 10%, rgba(0,0,0,0.4) 30%, rgba(0,0,0,0.8) 100%)'
          }}></div>

          {/* Scope Housing Ring */}
          <div className="w-[400px] h-[400px] rounded-full border-[20px] border-black/90 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex items-center justify-center relative backdrop-blur-[2px]">
            {/* Glass Reflection Hint */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-30"></div>

            {/* Red Dot */}
            <div className="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,1)] animate-pulse"></div>

            {/* Inner Ring Markings */}
            <div className="absolute w-full h-full opacity-30">
              <div className="absolute top-1/2 left-2 w-4 h-[2px] bg-white"></div>
              <div className="absolute top-1/2 right-2 w-4 h-[2px] bg-white"></div>
              <div className="absolute bottom-2 left-1/2 w-[2px] h-4 bg-white"></div>
            </div>
          </div>
        </div>
      )}

      {/* Default Crosshair (Hidden if Scoped) */}
      {!scopeVisible && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Crosshair className="text-white/80 opacity-80" size={24} />
          <div className="w-1 h-1 bg-red-500 rounded-full absolute" />
        </div>
      )}

      {/* Hit Marker */}
      {showHitMarker && (
        <div className="absolute inset-0 flex items-center justify-center">
          <X className="text-red-500/80 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]" size={48} strokeWidth={3} />
        </div>
      )}

      {/* Scoreboard Top */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-12 text-3xl font-black bg-black/50 px-8 py-2 rounded-full backdrop-blur-sm border border-white/10">
        <div className="text-cyan-400 flex items-center gap-2">
          <Trophy size={24} /> {roundsWon}
        </div>
        <div className="text-purple-500 flex items-center gap-2">
          {opponentRoundsWon} <Skull size={24} />
        </div>
      </div>

      {/* Health & Ammo */}
      <div className={`absolute bottom-8 left-8 ${isMobile ? 'bottom-[150px]' : ''}`}>
        <div className="flex items-center gap-3 text-white bg-gray-900/80 p-4 rounded-tl-2xl rounded-br-2xl border-l-4 border-green-500">
          <Heart className="text-green-500 fill-green-500" size={32} />
          <span className="text-4xl font-bold tracking-tighter">{health}</span>
        </div>
      </div>

      <div className={`absolute bottom-8 right-8 flex flex-col items-end gap-2 ${isMobile ? 'bottom-[150px]' : ''}`}>
        <div className="text-white/70 font-mono text-sm mb-1">{weapon.name}</div>
        <div className="flex items-center gap-4 text-white bg-gray-900/80 p-4 rounded-tr-2xl rounded-bl-2xl border-r-4" style={{ borderColor: weapon.color }}>
          <div className="text-right">
            <div className="text-5xl font-bold leading-none">{ammo[currentWeapon]}</div>
            <div className="text-xs text-gray-400">/ {weapon.maxAmmo}</div>
          </div>
        </div>
      </div>

      {/* --- KILL FEED --- */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 items-end pointer-events-none">
        {killFeed.map((feed) => {
          let WeaponIcon = Target;
          if (feed.weapon === 'RIFLE') WeaponIcon = Crosshair;
          if (feed.weapon === 'SNIPER') WeaponIcon = AimIcon;
          if (feed.weapon === 'PISTOL') WeaponIcon = Move; // Placeholder
          if (feed.weapon === 'KNIFE') WeaponIcon = X;

          const killerName = (feed.killer === 'YOU' || feed.killer === 'Player') ? useGameStore.getState().nickname : useGameStore.getState().opponentNickname;
          const victimName = (feed.victim === 'YOU' || feed.victim === 'Player') ? useGameStore.getState().nickname : useGameStore.getState().opponentNickname;

          return (
            <div key={feed.id} className="bg-black/60 text-white px-3 py-1 rounded border-r-2 border-red-500 flex items-center gap-2 text-sm animate-in slide-in-from-right fade-in duration-300">
              <span className={feed.killer === 'Player' || feed.killer === 'YOU' ? 'text-cyan-400 font-bold' : 'text-red-400'}>{killerName}</span>
              <WeaponIcon size={14} className="text-gray-400" />
              <span className={feed.victim === 'Player' || feed.victim === 'YOU' ? 'text-cyan-400 font-bold' : 'text-red-400'}>{victimName}</span>
            </div>
          );
        })}
      </div>

      {/* --- KILL BANNER (VALORANT STYLE) --- */}
      {killBanner && (
        <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none animate-in zoom-in fade-in duration-200">
          <div className="relative">
            {/* Skull Icon Background */}
            <Skull size={120} className="text-red-500/20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-150 blur-sm" />
            <Skull size={80} className="text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]" />
          </div>
          <div className="text-5xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 tracking-tighter mt-2 drop-shadow-lg">
            ELIMINATED
          </div>
          <div className="text-red-500 font-mono tracking-[0.5em] text-sm font-bold mt-1">
            {useGameStore.getState().opponentNickname.toUpperCase()}
          </div>
        </div>
      )}

      {/* --- MOBILE CONTROLS OVERLAY --- */}
      {isMobile && (
        <div className="absolute inset-0 pointer-events-auto">
          {/* Left Joystick Area - Enlarged */}
          <div className="absolute bottom-12 left-8 w-40 h-40 bg-white/10 rounded-full border border-white/20 flex items-center justify-center z-30"
            ref={joystickRef}
            onTouchStart={handleJoystickStart}
            onTouchMove={handleJoystickMove}
            onTouchEnd={handleJoystickEnd}
          >
            <div className="w-16 h-16 bg-cyan-500/50 rounded-full shadow-[0_0_10px_cyan]"
              style={{ transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)` }}
            />
          </div>

          {/* Right Look Pad (Takes up right half) - Increased Z-index to capture touches over scene */}
          <div
            ref={lookPadRef}
            className="absolute top-0 right-0 w-1/2 h-full z-10 touch-none"
            style={{ background: 'rgba(0,0,0,0.001)' }} // Hack to ensure events capture on some browsers
          />

          {/* Action Buttons (Right Side) - Higher Z-index to sit above Look Pad */}
          <div className="absolute bottom-12 right-8 flex flex-col gap-6 z-20" onTouchStart={(e) => e.stopPropagation()}>
            <div className="flex gap-6 justify-end">
              <button
                className="w-20 h-20 bg-white/10 border border-white/30 rounded-full flex items-center justify-center active:bg-white/30 backdrop-blur-sm"
                onTouchStart={(e) => { e.stopPropagation(); controls.reload = true; }}
              >
                <RotateCw className="text-white w-8 h-8" />
              </button>
              <button
                className="w-20 h-20 bg-yellow-500/20 border border-yellow-500 rounded-full flex items-center justify-center active:bg-yellow-500/50 backdrop-blur-sm"
                onTouchStart={(e) => { e.stopPropagation(); controls.jump = true; }}
              >
                <Move className="text-yellow-500 rotate-[-90deg] w-8 h-8" />
              </button>
            </div>
            <div className="flex gap-6 justify-end">
              <button
                className="w-20 h-20 bg-purple-500/20 border border-purple-500 rounded-full flex items-center justify-center active:bg-purple-500/50 backdrop-blur-sm"
                onTouchStart={(e) => { e.stopPropagation(); controls.aim = true; }}
                onTouchEnd={(e) => { e.stopPropagation(); controls.aim = false; }}
              >
                <AimIcon className="text-purple-500 w-8 h-8" />
              </button>
              <button
                className="w-24 h-24 bg-red-500/20 border-2 border-red-500 rounded-full flex items-center justify-center active:bg-red-500/50 backdrop-blur-sm"
                onTouchStart={(e) => { e.stopPropagation(); controls.fire = true; }}
                onTouchEnd={(e) => { e.stopPropagation(); controls.fire = false; }}
              >
                <Target className="text-red-500 w-10 h-10" />
              </button>
            </div>
            <div className="flex justify-end">
              <button
                className="w-16 h-16 bg-gray-800/80 rounded-full flex items-center justify-center border border-gray-600 backdrop-blur-sm"
                onTouchStart={(e) => { e.stopPropagation(); controls.crouch = true; }}
                onTouchEnd={(e) => { e.stopPropagation(); controls.crouch = false; }}
              >
                <Minimize2 className="text-white w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Weapon Switcher (Center Bottom) */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4 z-20" onTouchStart={(e) => e.stopPropagation()}>
            {[1, 2, 3, 0].map(num => (
              <button
                key={num}
                className={`w-14 h-14 flex items-center justify-center border rounded-lg font-bold text-xl transition-all active:scale-95 ${(num === 1 && currentWeapon === 'RIFLE') ||
                  (num === 2 && currentWeapon === 'PISTOL') ||
                  (num === 3 && currentWeapon === 'KNIFE') ||
                  (num === 0 && currentWeapon === 'SNIPER')
                  ? 'bg-cyan-600 text-white border-cyan-400 shadow-[0_0_10px_cyan]'
                  : 'bg-black/60 text-white/50 border-white/20'
                  }`}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  if (num === 1) controls.weapon1 = true;
                  if (num === 2) controls.weapon2 = true;
                  if (num === 3) controls.weapon3 = true;
                  if (num === 0) controls.weapon4 = true;
                }}
              >
                {num === 0 ? 'S' : num}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
