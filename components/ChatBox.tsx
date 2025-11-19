import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store';

export const ChatBox = () => {
    const { chatMessages, addChatMessage, isMultiplayer } = useGameStore();
    const [inputText, setInputText] = useState('');
    const [isVisible, setIsVisible] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
                if (isVisible) {
                    // Send message or close
                    if (inputText.trim()) {
                        sendMessage();
                    } else {
                        setIsVisible(false);
                        inputRef.current?.blur();
                        // Re-lock pointer if playing
                        const canvas = document.querySelector('canvas');
                        canvas?.requestPointerLock();
                    }
                } else {
                    // Open chat
                    setIsVisible(true);
                    setTimeout(() => inputRef.current?.focus(), 10);
                    document.exitPointerLock();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isVisible, inputText]);

    const sendMessage = () => {
        if (!inputText.trim()) return;

        // Add locally
        addChatMessage('Me', inputText);

        // Send network event
        window.dispatchEvent(new CustomEvent('SEND_CHAT', {
            detail: { text: inputText }
        }));

        setInputText('');
        setIsVisible(false);
        inputRef.current?.blur();

        // Re-lock pointer
        const canvas = document.querySelector('canvas');
        canvas?.requestPointerLock();
    };

    if (!isMultiplayer) return null;

    return (
        <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            width: '300px',
            pointerEvents: isVisible ? 'auto' : 'none',
            zIndex: 1000
        }}>
            {/* Messages Area */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                marginBottom: '10px',
                maxHeight: '200px',
                overflowY: 'auto',
                textShadow: '1px 1px 2px black'
            }}>
                {chatMessages.map((msg, i) => (
                    <div key={i} style={{
                        color: msg.sender === 'Me' ? '#34d399' : (msg.sender === 'System' ? '#fbbf24' : '#fff'),
                        fontSize: '14px',
                        opacity: (Date.now() - msg.timestamp > 10000 && !isVisible) ? 0 : 1,
                        transition: 'opacity 0.5s'
                    }}>
                        <span style={{ fontWeight: 'bold' }}>{msg.sender}: </span>
                        <span>{msg.text}</span>
                    </div>
                ))}
            </div>

            {/* Input Area */}
            <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.5)',
                    border: '1px solid #34d399',
                    color: 'white',
                    padding: '8px',
                    borderRadius: '4px',
                    opacity: isVisible ? 1 : 0,
                    transition: 'opacity 0.2s'
                }}
                placeholder="Press Enter to chat..."
            />
        </div>
    );
};
