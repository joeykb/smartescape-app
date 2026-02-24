export type NotificationStatus = 'OFFLINE' | 'ALERT' | 'WARNING' | 'INFO' | 'HEALTHY';

export interface Notification {
    id: string;
    systemId: string;
    timestamp: string; // ISO 8601
    status: NotificationStatus;
    message: string;
    isRead: boolean;
    count?: number; // Number of duplicate alerts grouped into this one
}

export interface System {
    id: string;
    status: NotificationStatus;
    lastSeen: string; // ISO 8601
    location?: string;
}

export type Theme = 'light' | 'dark' | 'system';
