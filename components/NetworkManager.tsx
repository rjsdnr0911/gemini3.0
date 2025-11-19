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
                // Visuals handled by event listener in Effects.tsx? 
                // We need to dispatch local event for Effects to pick up
                window.dispatchEvent(new CustomEvent('SHOOT', {
                    detail: {
                        start: packet.payload.start,
                        end: packet.payload.end,
                        color: '#ef4444' // Red for enemy
                    }
                }));
                break;
            case 'HIT':
                // I got hit
                setHealth(packet.payload.newHealth);
                break;
            case 'KILL':
                // I died (confirmed by killer) or I killed?
                // Usually killer sends "I killed you" or victim sends "I died".
                // Let's trust the shooter for hit detection (Client Authoritative)
                if (packet.payload.victim === peerRef.current?.id) {
                    // I died
                    incrementEnemyScore();
                }
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
            // I hit the enemy
            if (connRef.current?.open) {
                // We need to tell enemy they got hit.
                // But wait, Player.tsx handles local damage for AI.
                // For MP, we need to send damage to opponent.
                // Let's assume Player.tsx dispatches 'ENEMY_HIT' when hitting the "RemotePlayer" collider.
                // We need to distinguish AI hit vs Player hit.
            }
        };

        window.addEventListener('PLAYER_UPDATE', sendUpdate);
        window.addEventListener('SHOOT', sendShoot); // Re-use local shoot event?
        // Wait, 'SHOOT' event in Player.tsx is for visuals. We can piggyback on it.

        return () => {
            window.removeEventListener('PLAYER_UPDATE', sendUpdate);
            window.removeEventListener('SHOOT', sendShoot);
        };
    }, []);

    return null; // Logic only component
};
