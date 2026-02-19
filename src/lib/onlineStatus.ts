/**
 * Check if a user is online based on their last_seen timestamp.
 * A user is considered online if last_seen is within the last 5 minutes.
 */
export function isUserOnline(lastSeen: string | null | undefined): boolean {
  if (!lastSeen) return false;
  const lastSeenDate = new Date(lastSeen);
  const now = new Date();
  const diffMs = now.getTime() - lastSeenDate.getTime();
  return diffMs < 5 * 60 * 1000; // 5 minutes
}

/**
 * Format the last seen time into a human-readable Ukrainian string.
 */
export function formatLastSeenStatus(lastSeen: string | null | undefined): string {
  if (!lastSeen) return '';
  
  if (isUserOnline(lastSeen)) {
    return 'Зараз у мережі';
  }
  
  const lastSeenDate = new Date(lastSeen);
  const now = new Date();
  const diffMs = now.getTime() - lastSeenDate.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 60) {
    return `Активність ${diffMinutes} хв тому`;
  } else if (diffHours < 24) {
    const hourWord = diffHours === 1 ? 'годину' : diffHours < 5 ? 'години' : 'годин';
    return `Активність ${diffHours} ${hourWord} тому`;
  } else if (diffDays === 1) {
    return 'Активність вчора';
  } else if (diffDays < 7) {
    const dayWord = diffDays < 5 ? 'дні' : 'днів';
    return `Активність ${diffDays} ${dayWord} тому`;
  } else {
    return `Активність ${lastSeenDate.toLocaleDateString('uk-UA')}`;
  }
}
