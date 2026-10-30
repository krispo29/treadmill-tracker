import type { ScenicTheme, ScenicWeather } from '../components/ScenicJourneyModal';

/**
 * Procedural Flow State Audio Engine for Scenic Journey
 * Synthesizes 100% real-time natural soundscapes (Rain, Wind, Wind Chimes, Birds, Crickets, Waves)
 * via Web Audio API with zero external audio assets, zero bandwidth, and zero lag.
 */
class ScenicAudioEngine {
  private ctx: AudioContext | null = null;
  private isEnabled: boolean = true;
  private volume: number = 0.5; // 0.0 to 1.0

  // Master Gain Node for ambient sounds
  private masterGain: GainNode | null = null;

  // Background noise stream (Rain / Breeze / Waves)
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private noiseGain: GainNode | null = null;

  // Additional rain texture layer
  private rainHighFilter: BiquadFilterNode | null = null;
  private rainHighGain: GainNode | null = null;

  // LFO for breathing wind / ocean wave surging
  private lfoOsc: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;

  // Periodic natural creature / chime timer (Birds, Crickets, Fuurin wind chimes)
  private periodicTimer: number | null = null;
  private isRunning: boolean = false;

  // Track active state
  private currentTheme: ScenicTheme = 'countryside';
  private currentWeather: ScenicWeather = 'clear';

  constructor() {
    try {
      const savedEnabled = localStorage.getItem('scenic_ambient_enabled');
      if (savedEnabled !== null) {
        this.isEnabled = savedEnabled === 'true';
      }
      const savedVol = localStorage.getItem('scenic_ambient_volume');
      if (savedVol !== null) {
        const v = parseFloat(savedVol);
        if (!isNaN(v) && v >= 0 && v <= 1) this.volume = v;
      }
    } catch {
      // Safe fallback if localStorage not available
    }
  }

  /**
   * Lazily initialize AudioContext upon first user interaction
   */
  private initContext(): boolean {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioClass) {
        this.ctx = new AudioClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.ctx && !this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isEnabled ? this.volume : 0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    return !!this.ctx;
  }

  /**
   * Generate a 3-second continuous seamless looping pink-noise buffer
   */
  private createPinkNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    const sampleRate = this.ctx.sampleRate;
    const bufferSize = sampleRate * 3;
    const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
    const data = buffer.getChannelData(0);

    // Paul Kellet's filtered pink noise algorithm
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.07;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  /**
   * Start or crossfade soundscape according to current theme and weather
   */
  public updateState(theme: ScenicTheme, weather: ScenicWeather) {
    this.currentTheme = theme;
    this.currentWeather = weather;

    if (!this.isRunning || !this.isEnabled) return;
    this.reconfigureSoundscape();
  }

  /**
   * Start procedural soundscape
   */
  public start(theme?: ScenicTheme, weather?: ScenicWeather) {
    if (theme) this.currentTheme = theme;
    if (weather) this.currentWeather = weather;
    this.isRunning = true;

    if (!this.isEnabled) return;
    if (!this.initContext() || !this.ctx) return;

    this.reconfigureSoundscape();
    this.scheduleNextPeriodicSound();
  }

  /**
   * Stop all active nodes cleanly
   */
  public stop() {
    this.isRunning = false;
    if (this.periodicTimer !== null) {
      window.clearTimeout(this.periodicTimer);
      this.periodicTimer = null;
    }
    this.teardownNoise();
  }

  private teardownNoise() {
    try {
      if (this.noiseSource) {
        this.noiseSource.stop();
        this.noiseSource.disconnect();
        this.noiseSource = null;
      }
      if (this.lfoOsc) {
        this.lfoOsc.stop();
        this.lfoOsc.disconnect();
        this.lfoOsc = null;
      }
      if (this.noiseGain) {
        this.noiseGain.disconnect();
        this.noiseGain = null;
      }
      if (this.noiseFilter) {
        this.noiseFilter.disconnect();
        this.noiseFilter = null;
      }
      if (this.rainHighGain) {
        this.rainHighGain.disconnect();
        this.rainHighGain = null;
      }
      if (this.rainHighFilter) {
        this.rainHighFilter.disconnect();
        this.rainHighFilter = null;
      }
    } catch {
      // Ignore disconnect errors during teardown
    }
  }

  /**
   * Reconfigure procedural synthesizer filters based on weather and theme
   */
  private reconfigureSoundscape() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Smoothly fade out previous stream before reconfiguring
    if (this.noiseGain) {
      this.noiseGain.gain.linearRampToValueAtTime(0.001, now + 0.3);
    }
    if (this.rainHighGain) {
      this.rainHighGain.gain.linearRampToValueAtTime(0.001, now + 0.3);
    }

    setTimeout(() => {
      if (!this.isRunning || !this.ctx || !this.masterGain) return;
      this.teardownNoise();

      const noiseBuf = this.createPinkNoiseBuffer();
      if (!noiseBuf) return;

      this.noiseSource = this.ctx.createBufferSource();
      this.noiseSource.buffer = noiseBuf;
      this.noiseSource.loop = true;

      this.noiseFilter = this.ctx.createBiquadFilter();
      this.noiseGain = this.ctx.createGain();

      const curTime = this.ctx.currentTime;

      if (this.currentWeather === 'rain') {
        // COZY DRIZZLE SOUNDSCAPE
        // Bandpass pink noise around 1100Hz with light Q
        this.noiseFilter.type = 'bandpass';
        this.noiseFilter.frequency.setValueAtTime(1100, curTime);
        this.noiseFilter.Q.setValueAtTime(0.7, curTime);

        // Secondary high-frequency hiss for fine rain droplets
        this.rainHighFilter = this.ctx.createBiquadFilter();
        this.rainHighFilter.type = 'highpass';
        this.rainHighFilter.frequency.setValueAtTime(3200, curTime);

        this.rainHighGain = this.ctx.createGain();
        this.rainHighGain.gain.setValueAtTime(0.001, curTime);
        this.rainHighGain.gain.linearRampToValueAtTime(0.18, curTime + 0.8);

        this.noiseGain.gain.setValueAtTime(0.001, curTime);
        this.noiseGain.gain.linearRampToValueAtTime(0.38, curTime + 0.8);

        this.noiseSource.connect(this.noiseFilter);
        this.noiseFilter.connect(this.noiseGain);
        this.noiseGain.connect(this.masterGain);

        this.noiseSource.connect(this.rainHighFilter);
        this.rainHighFilter.connect(this.rainHighGain);
        this.rainHighGain.connect(this.masterGain);

      } else if (this.currentWeather === 'mist') {
        // MYSTICAL MOUNTAIN DRONE & DEEP BREEZE
        this.noiseFilter.type = 'lowpass';
        this.noiseFilter.frequency.setValueAtTime(260, curTime);
        this.noiseFilter.Q.setValueAtTime(1.5, curTime);

        this.noiseGain.gain.setValueAtTime(0.001, curTime);
        this.noiseGain.gain.linearRampToValueAtTime(0.24, curTime + 1.2);

        this.noiseSource.connect(this.noiseFilter);
        this.noiseFilter.connect(this.noiseGain);
        this.noiseGain.connect(this.masterGain);

      } else if (this.currentTheme === 'sunset') {
        // OCEAN SHORE BREAK & SURGING WARM TIDE
        this.noiseFilter.type = 'lowpass';
        this.noiseFilter.frequency.setValueAtTime(450, curTime);

        this.noiseGain.gain.setValueAtTime(0.001, curTime);
        this.noiseGain.gain.linearRampToValueAtTime(0.30, curTime + 1.0);

        // LFO for wave surge effect (0.16 Hz ~ 6.2s cycle)
        this.lfoOsc = this.ctx.createOscillator();
        this.lfoGain = this.ctx.createGain();
        this.lfoOsc.type = 'sine';
        this.lfoOsc.frequency.setValueAtTime(0.16, curTime);
        this.lfoGain.gain.setValueAtTime(160, curTime); // sweeps filter +/- 160Hz

        this.lfoOsc.connect(this.lfoGain);
        this.lfoGain.connect(this.noiseFilter.frequency);
        this.lfoOsc.start();

        this.noiseSource.connect(this.noiseFilter);
        this.noiseFilter.connect(this.noiseGain);
        this.noiseGain.connect(this.masterGain);

      } else {
        // SAKURA / COUNTRYSIDE / NIGHT GENTLE MEADOW BREEZE
        this.noiseFilter.type = 'lowpass';
        const cutoff = this.currentTheme === 'night' ? 240 : 360;
        this.noiseFilter.frequency.setValueAtTime(cutoff, curTime);

        this.noiseGain.gain.setValueAtTime(0.001, curTime);
        this.noiseGain.gain.linearRampToValueAtTime(0.22, curTime + 1.0);

        // Gentle breathing wind LFO
        this.lfoOsc = this.ctx.createOscillator();
        this.lfoGain = this.ctx.createGain();
        this.lfoOsc.type = 'sine';
        this.lfoOsc.frequency.setValueAtTime(0.12, curTime);
        this.lfoGain.gain.setValueAtTime(80, curTime);

        this.lfoOsc.connect(this.lfoGain);
        this.lfoGain.connect(this.noiseFilter.frequency);
        this.lfoOsc.start();

        this.noiseSource.connect(this.noiseFilter);
        this.noiseFilter.connect(this.noiseGain);
        this.noiseGain.connect(this.masterGain);
      }

      this.noiseSource.start();
    }, 320);
  }

  /**
   * Natural periodic creature sounds (Birds, Crickets, Japanese Wind Chime)
   */
  private scheduleNextPeriodicSound() {
    if (!this.isRunning) return;

    // Delay varies naturally
    const nextDelayMs = 4000 + Math.random() * 8000;
    this.periodicTimer = window.setTimeout(() => {
      if (this.isRunning && this.isEnabled) {
        this.triggerPeriodicSound();
      }
      this.scheduleNextPeriodicSound();
    }, nextDelayMs);
  }

  private triggerPeriodicSound() {
    if (!this.ctx || !this.masterGain) return;
    if (this.currentWeather === 'rain') return; // In heavy rain, focus on pure rainfall

    if (this.currentTheme === 'sakura') {
      this.playJapaneseWindChime();
    } else if (this.currentTheme === 'countryside') {
      this.playMorningBirdsong();
    } else if (this.currentTheme === 'night') {
      this.playNightCricket();
    } else if (this.currentTheme === 'sunset') {
      if (Math.random() > 0.5) this.playJapaneseWindChime();
    }
  }

  /**
   * Japanese Glass Wind Chime (Fuurin / 風鈴)
   * High crystal pentatonic frequencies with dual partials
   */
  private playJapaneseWindChime() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    // Pentatonic crystal bell frequencies (Hz)
    const bellNotes = [2093.00, 2349.32, 2793.83, 3135.96, 3520.00];
    const freq = bellNotes[Math.floor(Math.random() * bellNotes.length)];

    // Fundamental Bell Sine
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.linearRampToValueAtTime(0.06, now + 0.005);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(now);
    osc1.stop(now + 1.8);

    // Glass Overtone partial (2.76x overtone typical of glass bells)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2.76, now);

    gain2.gain.setValueAtTime(0.001, now);
    gain2.gain.linearRampToValueAtTime(0.025, now + 0.004);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(now);
    osc2.stop(now + 0.8);
  }

  /**
   * Sweet Morning Birdsong Chirp
   */
  private playMorningBirdsong() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const chirpCount = 2 + Math.floor(Math.random() * 2);

    for (let c = 0; c < chirpCount; c++) {
      const chirpStart = now + c * 0.12;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';

      // Rapid ascending & descending pitch sweep
      const baseFreq = 2700 + Math.random() * 500;
      osc.frequency.setValueAtTime(baseFreq, chirpStart);
      osc.frequency.linearRampToValueAtTime(baseFreq + 700, chirpStart + 0.04);
      osc.frequency.linearRampToValueAtTime(baseFreq + 200, chirpStart + 0.09);

      gain.gain.setValueAtTime(0.001, chirpStart);
      gain.gain.linearRampToValueAtTime(0.045, chirpStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, chirpStart + 0.09);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(chirpStart);
      osc.stop(chirpStart + 0.1);
    }
  }

  /**
   * Relaxing Lo-Fi Midnight Cricket Chirp
   */
  private playNightCricket() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const pulses = 3;

    for (let p = 0; p < pulses; p++) {
      const pulseStart = now + p * 0.055;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(4400, pulseStart);

      gain.gain.setValueAtTime(0.001, pulseStart);
      gain.gain.linearRampToValueAtTime(0.035, pulseStart + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, pulseStart + 0.045);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(pulseStart);
      osc.stop(pulseStart + 0.05);
    }
  }

  /**
   * Set Master Volume (0.0 to 1.0)
   */
  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem('scenic_ambient_volume', this.volume.toString());
    } catch {}

    if (this.ctx && this.masterGain && this.isEnabled) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  /**
   * Toggle Ambient sound on/off
   */
  public toggleEnabled(): boolean {
    this.setEnabled(!this.isEnabled);
    return this.isEnabled;
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    try {
      localStorage.setItem('scenic_ambient_enabled', this.isEnabled.toString());
    } catch {}

    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.isEnabled ? this.volume : 0, this.ctx.currentTime);
    }

    if (this.isEnabled && this.isRunning) {
      this.reconfigureSoundscape();
    }
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }
}

export const scenicAudioEngine = new ScenicAudioEngine();
