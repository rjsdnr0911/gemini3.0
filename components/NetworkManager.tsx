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
        const setupConnection = () => {
            connRef.current = conn;
            setConnectionStatus('CONNECTED');
            setPeerIds(peerRef.current?.id || '', conn.peer);

            // Send initial Ready status
            console.log('Connection established. Sending initial READY:', useGameStore.getState().isReady);
            conn.send({
                type: 'READY',
                payload: { isReady: useGameStore.getState().isReady }
            });

            // Start Heartbeat
            conn.send({ type: 'PING', payload: { time: Date.now() } });
        };

        if (conn.open) {
            setupConnection();
        } else {
            conn.on('open', () => {
                console.log('Connection now open');
                setupConnection();
            });
        }

        conn.on('data', (data: any) => {
            handleData(data);
        });

        conn.on('close', () => {
            console.log('Connection closed');
            setConnectionStatus('DISCONNECTED');
            setGameState(GameState.MENU);
            useGameStore.getState().addChatMessage('SYSTEM', 'Connection Lost');
        });

        conn.on('error', (err) => {
            console.error('Connection error:', err);
            useGameStore.getState().addChatMessage('SYSTEM', `Conn Error: ${err}`);
        });
    };

    const handleData = (packet: NetworkPacket) => {
        // console.log('Received packet:', packet.type); // Too noisy for frame updates
        switch (packet.type) {
            case 'PING':
                connRef.current?.send({ type: 'PONG', payload: { time: packet.payload.time } });
                break;
            case 'PONG':
                // Calculate latency if needed, for now just confirms connection
                // console.log('Ping:', Date.now() - packet.payload.time, 'ms');
                break;
            case 'PLAYER_UPDATE':
                updateRemotePlayer(packet.payload);
                break;
            case 'SHOOT':
                window.dispatchEvent(new CustomEvent('SHOOT', {
                    detail: {
                        start: packet.payload.start,
                        end: packet.payload.end,
                        color: '#ef4444'
                    }
                }));
                break;
            case 'HIT':
                const dmg = packet.payload.damage;
                const hitWeapon = packet.payload.weapon;
                const newHealth = Math.max(0, useGameStore.getState().health - dmg);
                setHealth(newHealth);
                if (newHealth <= 0) {
                    connRef.current?.send({
                        type: 'KILL',
                        payload: {
                            victim: peerRef.current?.id,
                            weapon: hitWeapon
                        }
                    });
                    setGameState(GameState.GAME_OVER);
                    useGameStore.getState().addKillFeed('Enemy', 'Player', hitWeapon);
                    useGameStore.getState().showKillBanner(1);
                }
                break;
            case 'KILL':
                const killWeapon = packet.payload.weapon || useGameStore.getState().currentWeapon;
                incrementPlayerScore(killWeapon);
                break;
            case 'START':
                console.log('Received START packet. Starting game!');
                useGameStore.getState().addChatMessage('SYSTEM', 'Game Started!');
                setGameState(GameState.PLAYING);
                break;
            case 'CHAT':
                useGameStore.getState().addChatMessage('Opponent', packet.payload.text);
                break;
            case 'READY':
                console.log('Received READY packet:', packet.payload);
                useGameStore.getState().addChatMessage('SYSTEM', `Opponent is ${packet.payload.isReady ? 'READY' : 'NOT READY'}`);
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
            console.log('Attempting to send READY:', e.detail.isReady);
            if (connRef.current) {
                console.log('Connection open status:', connRef.current.open);
                connRef.current.send({
                    type: 'READY',
                    payload: { isReady: e.detail.isReady }
                });
                console.log('READY packet sent');
            } else {
                console.warn('Cannot send READY: Connection not open');
            }
        };

        const startGame = () => {
            const currentIsHost = useGameStore.getState().isHost;
            if (connRef.current && currentIsHost) {
                console.log('Host starting game...');
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
