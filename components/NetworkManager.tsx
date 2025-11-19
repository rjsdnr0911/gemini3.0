import React, { useEffect, useRef } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { useGameStore } from '../store';
import { NetworkPacket, GameState } from '../types';
import { Vector3, Quaternion } from 'three';

export const NetworkManager = () => {
    const peerRef = useRef<Peer | null>(null);
    const connRef = useRef<DataConnection | null>(null);

    const {
        isMultiplayer,
        isHost,
        setPeerIds,
        setConnectionStatus,
        updateRemotePlayer,
        gameState,
        setGameState,
        setHealth,
        incrementEnemyScore,
        incrementPlayerScore
    } = useGameStore();

    // Initialize Peer
    useEffect(() => {
        if (!isMultiplayer) return;

        const peer = new Peer();
        peerRef.current = peer;

        peer.on('open', (id) => {
            console.log('My Peer ID:', id);
            setPeerIds(id, '');
            if (isHost) {
                setConnectionStatus('CONNECTING'); // Waiting for join
            }
        });

        peer.on('connection', (conn) => {
            console.log('Incoming connection:', conn.peer);
            handleConnection(conn);
        });

        peer.on('error', (err) => {
            console.error('Peer error:', err);
            setConnectionStatus('DISCONNECTED');
        });

        return () => {
            peer.destroy();
        };
    }, [isMultiplayer, isHost]);

    const handleConnection = (conn: DataConnection) => {
        connRef.current = conn;
        setConnectionStatus('CONNECTED');
        setPeerIds(peerRef.current?.id || '', conn.peer);

        // Start Game if Host
        if (isHost) {
            setTimeout(() => {
                conn.send({ type: 'START', timestamp: Date.now() });
                setGameState(GameState.PLAYING);
            }, 1000);
        }

        conn.on('data', (data: any) => {
            handleData(data);
        });

        conn.on('close', () => {
            console.log('Connection closed');
            setConnectionStatus('DISCONNECTED');
            setGameState(GameState.MENU);
        });
    };

    const handleData = (packet: NetworkPacket) => {
        switch (packet.type) {
            case 'UPDATE':
                updateRemotePlayer(packet.payload);
                break;
            case 'SHOOT':
                // Visuals handled by event listener in Effects.tsx
                window.dispatchEvent(new CustomEvent('SHOOT', {
                    detail: {
                        start: packet.payload.start,
                        end: packet.payload.end,
                        color: '#ef4444' // Red for enemy
                    }
                }));
                break;
            case 'HIT':
                // Received damage
                const dmg = packet.payload.damage;
                const newHealth = Math.max(0, useGameStore.getState().health - dmg);
                setHealth(newHealth);

                // If I died, tell the killer
                if (newHealth <= 0) {
                    connRef.current?.send({
                        type: 'KILL',
                        timestamp: Date.now(),
                        payload: { victim: peerRef.current?.id }
                    });
                    setGameState(GameState.GAME_OVER);
                }
                break;
            case 'KILL':
                // I killed the opponent
                incrementPlayerScore();
                break;
            case 'START':
                setGameState(GameState.PLAYING);
                break;
        }
    };

    // Listen for Join (if client)
    useEffect(() => {
        // This is handled by UI calling connectToPeer
    }, []);

    // Expose connect function globally or via store? 
    // Better to keep it here. We can use a custom event or store action to trigger connection.
    // Let's use a window event for simplicity in this rapid proto.
    useEffect(() => {
        const connectHandler = (e: any) => {
            const targetId = e.detail.targetId;
            if (peerRef.current && !isHost) {
                const conn = peerRef.current.connect(targetId);
                conn.on('open', () => {
                    handleConnection(conn);
                });
            }
        };
        window.addEventListener('CONNECT_PEER', connectHandler);
        return () => window.removeEventListener('CONNECT_PEER', connectHandler);
    }, [isHost]);

    // Sync Loop (Send Update)
    useEffect(() => {
        if (!connRef.current || gameState !== GameState.PLAYING) return;

        const interval = setInterval(() => {
            // Get local player state from... where? 
            // Player component should update a ref or store?
            // Or we can dispatch an event "PLAYER_UPDATE" from Player.tsx and listen here.
            // Let's use a window event listener for local player updates to keep it decoupled.
        }, 50); // 20 ticks/sec

        return () => clearInterval(interval);
    }, [gameState]);

    // Listen for Local Player Updates to Send
    useEffect(() => {
        const sendUpdate = (e: any) => {
            if (connRef.current?.open) {
                connRef.current.send({
                    type: 'UPDATE',
                    timestamp: Date.now(),
                    payload: e.detail
                });
            }
        };

        const sendShoot = (e: any) => {
            if (connRef.current?.open) {
                connRef.current.send({
                    type: 'SHOOT',
                    timestamp: Date.now(),
                    payload: e.detail
                });
            }
        };

        const sendHit = (e: any) => {
            if (connRef.current?.open) {
                // I hit the enemy (RemotePlayer)
                // Send damage packet
                connRef.current.send({
                    type: 'HIT',
                    timestamp: Date.now(),
                    payload: { damage: e.detail.damage }
                });
            }
        };

        window.addEventListener('PLAYER_UPDATE', sendUpdate);
        window.addEventListener('SHOOT', sendShoot);
        window.addEventListener('ENEMY_HIT', sendHit); // Listen for hits on RemotePlayer

        return () => {
            window.removeEventListener('PLAYER_UPDATE', sendUpdate);
            window.removeEventListener('SHOOT', sendShoot);
            window.removeEventListener('ENEMY_HIT', sendHit);
        };
    }, []);

    return null; // Logic only component
};
