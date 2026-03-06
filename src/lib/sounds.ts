
let audioContext: AudioContext | null = null;
let notificationAudio: HTMLAudioElement | null = null;

/**
 * Play notification sound using an MP3 file.
 * Falls back to programmatic oscillator if the file fails.
 */
export const playNotificationSound = () => {
  try {
    // Try HTML Audio first (works reliably with mp3 files)
    if (!notificationAudio) {
      notificationAudio = new Audio('/sounds/notification.mp3');
      notificationAudio.volume = 0.5;
    }
    
    // Reset to start if already playing
    notificationAudio.currentTime = 0;
    
    const playPromise = notificationAudio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // If Audio play fails (autoplay policy), fall back to oscillator
        playOscillatorSound();
      });
    }
  } catch (error) {
    console.warn('[Sound] Audio playback failed, using fallback:', error);
    playOscillatorSound();
  }
};

/**
 * Fallback: programmatic oscillator sound
 */
function playOscillatorSound() {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Soft "pling" sound
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(1320, audioContext.currentTime + 0.1);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.error('[Sound] Could not play notification sound:', error);
  }
}
