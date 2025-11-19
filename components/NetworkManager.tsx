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
            case 'PLAYER_UPDATE':
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
                const hitWeapon = packet.payload.weapon;
                const newHealth = Math.max(0, useGameStore.getState().health - dmg);
                setHealth(newHealth);

                // If I died, tell the killer
                if (newHealth <= 0) {
                    connRef.current?.send({
                        type: 'KILL',
                        payload: {
                            victim: peerRef.current?.id,
                            weapon: hitWeapon // Tell them what killed me
                        }
                    });
                    setGameState(GameState.GAME_OVER);
                    // Show feed for myself (I died)
                    useGameStore.getState().addKillFeed('Enemy', 'Player', hitWeapon);
                    useGameStore.getState().showKillBanner('ELIMINATED BY ENEMY');
                }
                break;
            case 'KILL':
                // I killed the opponent
                const killWeapon = packet.payload.weapon || useGameStore.getState().currentWeapon;
                incrementPlayerScore(killWeapon);
                break;
            case 'START':
                setGameState(GameState.PLAYING);
                break;
            case 'CHAT':
                useGameStore.getState().addChatMessage('Opponent', packet.payload.text);
                break;
            case 'READY':
                useGameStore.getState().setOpponentReady(packet.payload.isReady);
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
                    type: 'PLAYER_UPDATE',
                    payload: e.detail
                });
            }
        };

        const sendShoot = (e: any) => {
            if (connRef.current?.open) {
                connRef.current.send({
                    type: 'SHOOT',
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
                    payload: {
                        damage: e.detail.damage,
                        weapon: useGameStore.getState().currentWeapon
                    }
                });
            }
        };

        const sendChat = (e: any) => {
            if (connRef.current?.open) {
                connRef.current.send({
                    type: 'CHAT',
                    payload: { text: e.detail.text }
                });
            }
        };

        const sendReady = (e: any) => {
            if (connRef.current?.open) {
                connRef.current.send({
                    type: 'READY',
                    payload: { isReady: e.detail.isReady }
                });
            }
        };

        const startGame = () => {
            if (connRef.current?.open && isHost) {
                connRef.current.send({ type: 'START', payload: {} });
                setGameState(GameState.PLAYING);
            }
        };

        window.addEventListener('PLAYER_UPDATE', sendUpdate);
        window.addEventListener('SHOOT', sendShoot);
        window.addEventListener('ENEMY_HIT', sendHit); // Listen for hits on RemotePlayer
        window.addEventListener('SEND_CHAT', sendChat);
        window.addEventListener('SEND_READY', sendReady);
        window.addEventListener('START_GAME', startGame);

        return () => {
            window.removeEventListener('PLAYER_UPDATE', sendUpdate);
            window.removeEventListener('SHOOT', sendShoot);
            window.removeEventListener('ENEMY_HIT', sendHit);
            window.removeEventListener('SEND_CHAT', sendChat);
            window.removeEventListener('SEND_READY', sendReady);
            window.removeEventListener('START_GAME', startGame);
        };
    }, []);

    return null; // Logic only component
};
