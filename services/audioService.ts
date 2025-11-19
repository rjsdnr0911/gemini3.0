
// Simple Procedural Audio Synthesizer using Web Audio API
// No external assets required.

class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  constructor() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3; // Master volume
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.error("Web Audio API not supported");
    }
  }

  private ensureContext() {
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playShoot(type: 'RIFLE' | 'PISTOL') {
    if (!this.ctx || !this.masterGain) return;
    this.ensureContext();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // Gunshot character
    if (type === 'RIFLE') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, this.ctx.currentTime);
        filter.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + 0.1);
    } else {
        osc.type = 'square';
        osc.frequency.setValueAtTime(250, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
    }

    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + (type === 'RIFLE' ? 0.15 : 0.25));

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);

    // Add a noise burst for "kick"
    this.playNoise(0.05);
  }

  playKnife() {
    if (!this.ctx || !this.masterGain) return;
    this.ensureContext();
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1200, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playHit() {
    if (!this.ctx || !this.masterGain) return;
    this.ensureContext();
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playReload() {
     if (!this.ctx || !this.masterGain) return;
     this.ensureContext();
     
     // Slide sound 1
     const osc = this.ctx.createOscillator();
     const gain = this.ctx.createGain();
     osc.frequency.setValueAtTime(400, this.ctx.currentTime);
     osc.frequency.linearRampToValueAtTime(600, this.ctx.currentTime + 0.2);
     gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
     gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
     
     osc.connect(gain);
     gain.connect(this.masterGain);
     osc.start();
     osc.stop(this.ctx.currentTime + 0.25);

     // Click sound 2
     setTimeout(() => {
         const osc2 = this.ctx!.createOscillator();
         const gain2 = this.ctx!.createGain();
         osc2.type = 'square';
         osc2.frequency.setValueAtTime(800, this.ctx!.currentTime);
         gain2.gain.setValueAtTime(0.1, this.ctx!.currentTime);
         gain2.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.05);
         osc2.connect(gain2);
         gain2.connect(this.masterGain!);
         osc2.start();
         osc2.stop(this.ctx!.currentTime + 0.1);
     }, 400);
  }

  playBolt() {
    if (!this.ctx || !this.masterGain) return;
    this.ensureContext();

    // Mechanical "Clunk-Chick" sound
    const t = this.ctx.currentTime;
    
    // 1. Bolt Open
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.frequency.setValueAtTime(200, t);
    osc1.frequency.exponentialRampToValueAtTime(50, t + 0.1);
    gain1.gain.setValueAtTime(0.2, t);
    gain1.gain.linearRampToValueAtTime(0, t + 0.1);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start();
    osc1.stop(t + 0.15);

    // 2. Bolt Close (delayed)
    setTimeout(() => {
        const osc2 = this.ctx!.createOscillator();
        const gain2 = this.ctx!.createGain();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(100, this.ctx!.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(300, this.ctx!.currentTime + 0.05);
        gain2.gain.setValueAtTime(0.1, this.ctx!.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, this.ctx!.currentTime + 0.1);
        osc2.connect(gain2);
        gain2.connect(this.masterGain!);
        osc2.start();
        osc2.stop(this.ctx!.currentTime + 0.15);
    }, 400);
  }

  private playNoise(duration: number) {
    if (!this.ctx || !this.masterGain) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.2;
    noise.connect(gain);
    gain.connect(this.masterGain);
    noise.start();
  }
}

export const audio = new AudioService();
