/**
 * Shared time formatting utilities.
 * Previously duplicated in ActiveAlertCard, SystemCard, and NotificationRow.
 */

/**
 * Returns a human-readable relative time string (e.g. "5m ago", "2h ago").
 */
export function timeAgo(timestamp: string): string {
    const now = Date.now();
    const diff = now - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

/**
 * Returns a short date/time string (e.g. "Feb 24, 08:30 PM").
 */
export function shortDateTime(timestamp: string): string {
    return new Date(timestamp).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Returns a full date/time string for detail views.
 */
export function fullDateTime(timestamp: string): string {
    return new Date(timestamp).toLocaleString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}
