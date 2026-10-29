class AudioCoachService {
  private audioCtx: AudioContext | null = null;
  private voiceEnabled: boolean = true;
  private soundEnabled: boolean = true;
  private language: 'th-TH' | 'en-US' = 'th-TH';

  constructor() {
    // Lazy initialize AudioContext on first user interaction
  }

  private initAudio() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  public setPreferences(sound: boolean, voice: boolean, lang: 'th-TH' | 'en-US') {
    this.soundEnabled = sound;
    this.voiceEnabled = voice;
    this.language = lang;
  }

  /**
   * Synthesize a crisp electronic beep
   */
  public playTone(freq: number, durationSec: number = 0.15, type: OscillatorType = 'sine') {
    if (!this.soundEnabled) return;
    this.initAudio();
    if (!this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.2, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + durationSec);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + durationSec);
    } catch (e) {
      console.warn('Audio tone error:', e);
    }
  }

  public playCountdownBeep(count: number) {
    if (!this.soundEnabled) return;
    // Ascending pitch: 3 (500Hz), 2 (600Hz), 1 (700Hz)
    const freq = 450 + (4 - count) * 80;
    this.playTone(freq, 0.18, 'triangle');
  }

  public playIntervalChangeBeep() {
    if (!this.soundEnabled) return;
    this.initAudio();
    if (!this.audioCtx) return;

    // High energetic double beep
    this.playTone(880, 0.12, 'square');
    setTimeout(() => {
      this.playTone(1174, 0.22, 'sine');
    }, 130);
  }

  public playWorkoutCompleteSound() {
    if (!this.soundEnabled) return;
    const notes = [523, 659, 783, 1046]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 0.25, 'triangle');
      }, idx * 140);
    });
  }

  /**
   * Speak a voice announcement using Web Speech API
   */
  public speak(text: string) {
    if (!this.voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    try {
      window.speechSynthesis.cancel(); // Stop prior speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.language;
      utterance.rate = 1.05; // Slightly energetic pacing
      utterance.pitch = 1.0;

      // Find best available voice for language
      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find(v => v.lang.startsWith(this.language.substring(0, 2)));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
    }
  }

  /**
   * Formats and announces the next interval change
   */
  public announceInterval(stepName: string, speedKmh: number, inclineLevel: number) {
    if (this.language === 'th-TH') {
      const msg = `เริ่มช่วง ${stepName} ความเร็ว ${speedKmh} ความชันระดับ ${inclineLevel}`;
      this.speak(msg);
    } else {
      const msg = `Start ${stepName}. Speed ${speedKmh} kilometers per hour, incline level ${inclineLevel}`;
      this.speak(msg);
    }
  }

  public announceUpcoming(secondsLeft: number, nextSpeed: number, nextIncline: number) {
    if (this.language === 'th-TH') {
      const msg = `อีก ${secondsLeft} วินาที เตรียมปรับความเร็ว ${nextSpeed} ความชันระดับ ${nextIncline}`;
      this.speak(msg);
    } else {
      const msg = `${secondsLeft} seconds left. Prepare for speed ${nextSpeed}, incline ${nextIncline}`;
      this.speak(msg);
    }
  }

  public announceCompletion() {
    if (this.language === 'th-TH') {
      this.speak('ยินดีด้วยครับ! คุณออกกำลังกายสำเร็จตามโปรแกรมแล้ว ยอดเยี่ยมมาก!');
    } else {
      this.speak('Congratulations! Workout completed. Great job!');
    }
  }
}

export const audioCoach = new AudioCoachService();
