import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateToDDMMYY(timestamp: number | undefined): string {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 'Invalid Date';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
  const year = String(date.getFullYear()).slice(-2); // Get last two digits of year
  return `${day}/${month}/${year}`;
}

export function formatTimestampToDateTime(timestamp: number | undefined): string {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 'Invalid Date';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function formatTimestampToDate(timestamp: number | undefined): string {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 'Invalid Date';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Notification sound utility
let notificationAudio: HTMLAudioElement | null = null;
let soundEnabled = true;

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
  localStorage.setItem('notificationSoundEnabled', enabled.toString());
}

export function isSoundEnabled(): boolean {
  const stored = localStorage.getItem('notificationSoundEnabled');
  return stored !== null ? stored === 'true' : true; // Default to enabled
}

export function playNotificationSound() {
  try {
    // Check if sound is enabled
    if (!isSoundEnabled()) {
      return;
    }

    if (!notificationAudio) {
			notificationAudio = new Audio('/notification.mp3');
      notificationAudio.volume = 0.6;
      notificationAudio.preload = 'auto';
    }
    
    notificationAudio.currentTime = 0;
    const playPromise = notificationAudio.play();
    
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.log('Notification sound could not be played:', error.message);
      });
    }
  } catch (error) {
    console.log('Error playing notification sound:', error);
  }
}

export function enableNotificationSound() {
  try {
    if (!notificationAudio) {
      notificationAudio = new Audio('/notification.mp3');
      notificationAudio.volume = 0.6;
      notificationAudio.preload = 'auto';
    }
    
    // Enable audio context with a silent test
    const testAudio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
    testAudio.volume = 0.01;
    testAudio.play().catch(() => {});
  } catch (error) {
    console.log('Error enabling notification sound:', error);
  }
}
