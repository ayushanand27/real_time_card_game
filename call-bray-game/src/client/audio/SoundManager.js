/**
 * Sound Manager for Call Bray Game
 * Handles all audio effects and background music
 */

class SoundManager {
  constructor() {
    this.sounds = new Map();
    this.backgroundMusic = null;
    this.isMuted = false;
    this.volume = 0.7;
    this.audioContext = null;
    
    this.init();
  }

  /**
   * Initialize audio context and load sounds
   */
  async init() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      await this.loadSounds();
    } catch (error) {
      console.warn('Audio context not supported:', error);
    }
  }

  /**
   * Load all sound effects
   */
  async loadSounds() {
    const soundConfigs = [
      { name: 'cardDeal', file: 'card-deal.mp3', volume: 0.6 },
      { name: 'cardPlay', file: 'card-play.mp3', volume: 0.8 },
      { name: 'lastCardPower', file: 'power-up.wav', volume: 1.0 },
      { name: 'nilBidFail', file: 'sad-trombone.mp3', volume: 0.9 },
      { name: 'nilBidSuccess', file: 'success-fanfare.mp3', volume: 0.8 },
      { name: 'blindBidWin', file: 'victory-trumpet.mp3', volume: 0.9 },
      { name: 'blindBidFail', file: 'fail-buzzer.mp3', volume: 0.8 },
      { name: 'trickWon', file: 'trick-won.mp3', volume: 0.7 },
      { name: 'gameStart', file: 'game-start.mp3', volume: 0.8 },
      { name: 'gameEnd', file: 'game-end.mp3', volume: 0.9 },
      { name: 'timerWarning', file: 'timer-warning.mp3', volume: 0.6 },
      { name: 'buttonClick', file: 'button-click.mp3', volume: 0.5 },
      { name: 'notification', file: 'notification.mp3', volume: 0.6 },
      { name: 'shuffle', file: 'card-shuffle.mp3', volume: 0.7 },
      { name: 'bidPlace', file: 'bid-place.mp3', volume: 0.6 }
    ];

    for (const config of soundConfigs) {
      await this.loadSound(config);
    }
  }

  /**
   * Load individual sound file
   */
  async loadSound(config) {
    try {
      const audio = new Audio(`/assets/sounds/${config.file}`);
      audio.volume = config.volume * this.volume;
      audio.preload = 'auto';
      
      // Wait for audio to load
      await new Promise((resolve, reject) => {
        audio.addEventListener('canplaythrough', resolve);
        audio.addEventListener('error', reject);
        audio.load();
      });
      
      this.sounds.set(config.name, audio);
    } catch (error) {
      console.warn(`Failed to load sound: ${config.name}`, error);
    }
  }

  /**
   * Play sound effect
   */
  play(soundName, options = {}) {
    if (this.isMuted) return;
    
    const sound = this.sounds.get(soundName);
    if (!sound) {
      console.warn(`Sound not found: ${soundName}`);
      return;
    }

    try {
      // Clone audio for overlapping sounds
      const audioClone = sound.cloneNode();
      audioClone.volume = (options.volume || 1) * this.volume;
      
      if (options.rate) {
        audioClone.playbackRate = options.rate;
      }
      
      audioClone.play().catch(error => {
        console.warn(`Failed to play sound: ${soundName}`, error);
      });
      
      // Clean up cloned audio after playing
      audioClone.addEventListener('ended', () => {
        audioClone.remove();
      });
    } catch (error) {
      console.warn(`Error playing sound: ${soundName}`, error);
    }
  }

  /**
   * Play background music
   */
  async playBackgroundMusic(trackName = 'ambient') {
    if (this.isMuted) return;
    
    try {
      if (this.backgroundMusic) {
        this.backgroundMusic.pause();
        this.backgroundMusic = null;
      }
      
      this.backgroundMusic = new Audio(`/assets/music/${trackName}.mp3`);
      this.backgroundMusic.volume = 0.3 * this.volume;
      this.backgroundMusic.loop = true;
      
      await this.backgroundMusic.play();
    } catch (error) {
      console.warn('Failed to play background music:', error);
    }
  }

  /**
   * Stop background music
   */
  stopBackgroundMusic() {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
      this.backgroundMusic = null;
    }
  }

  /**
   * Set volume for all sounds
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    
    // Update all loaded sounds
    this.sounds.forEach(sound => {
      sound.volume = sound.volume * this.volume;
    });
    
    if (this.backgroundMusic) {
      this.backgroundMusic.volume = 0.3 * this.volume;
    }
  }

  /**
   * Toggle mute state
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    
    if (this.isMuted) {
      this.stopBackgroundMusic();
    }
    
    return this.isMuted;
  }

  /**
   * Game event sound triggers
   */
  onCardDeal() {
    this.play('cardDeal');
  }

  onCardPlay(card, isLastCard = false) {
    this.play('cardPlay');
    
    if (isLastCard) {
      // Delay power sound slightly
      setTimeout(() => {
        this.play('lastCardPower', { volume: 1.2 });
      }, 200);
    }
  }

  onBidPlace(bidType, bidAmount) {
    this.play('bidPlace');
    
    // Special sounds for special bids
    if (bidType === 'nil') {
      this.play('notification');
    } else if (bidType === 'blind') {
      this.play('notification', { volume: 1.1 });
    }
  }

  onBidResult(bid, tricksWon) {
    if (bid.type === 'nil') {
      if (tricksWon === 0) {
        this.play('nilBidSuccess');
      } else {
        this.play('nilBidFail');
      }
    } else if (bid.type === 'blind') {
      if (tricksWon >= 7) {
        this.play('blindBidWin');
      } else {
        this.play('blindBidFail');
      }
    }
  }

  onTrickWon() {
    this.play('trickWon');
  }

  onGameStart() {
    this.play('gameStart');
    this.playBackgroundMusic('game-ambient');
  }

  onGameEnd() {
    this.play('gameEnd');
    this.stopBackgroundMusic();
  }

  onTimerWarning() {
    this.play('timerWarning', { volume: 0.8 });
  }

  onButtonClick() {
    this.play('buttonClick');
  }

  onShuffle() {
    this.play('shuffle');
  }

  /**
   * Create custom sound effect using Web Audio API
   */
  createCustomSound(frequency, duration, type = 'sine') {
    if (!this.audioContext || this.isMuted) return;
    
    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      oscillator.type = type;
      
      gainNode.gain.setValueAtTime(0.1 * this.volume, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (error) {
      console.warn('Failed to create custom sound:', error);
    }
  }

  /**
   * Play notification sound with custom frequency
   */
  playNotification(priority = 'normal') {
    const frequencies = {
      low: 440,
      normal: 660,
      high: 880
    };
    
    this.createCustomSound(frequencies[priority], 0.3);
  }

  /**
   * Get sound loading status
   */
  getLoadingStatus() {
    const total = 15; // Total number of sounds
    const loaded = this.sounds.size;
    
    return {
      loaded,
      total,
      percentage: Math.round((loaded / total) * 100)
    };
  }

  /**
   * Preload specific sounds for immediate use
   */
  async preloadCriticalSounds() {
    const criticalSounds = ['cardPlay', 'buttonClick', 'notification'];
    
    for (const soundName of criticalSounds) {
      if (!this.sounds.has(soundName)) {
        await this.loadSound({
          name: soundName,
          file: `${soundName}.mp3`,
          volume: 0.7
        });
      }
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stopBackgroundMusic();
    this.sounds.clear();
    
    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}

// Create singleton instance
const soundManager = new SoundManager();

// Export both class and instance
export { SoundManager, soundManager };

// Default export for convenience
export default soundManager; 