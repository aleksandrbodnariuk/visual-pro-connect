
let audioContext: AudioContext | null = null;

export const playNotificationSound = () => {
  try {
    // Створюємо AudioContext лише при першому використанні
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Генеруємо короткий звуковий сигнал програмно
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Налаштування звуку - м'який "плінь"
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
    oscillator.frequency.setValueAtTime(1320, audioContext.currentTime + 0.1); // E6 note
    oscillator.type = 'sine';

    // Гучність з плавним затуханням
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.error('Could not play notification sound:', error);
  }
};
