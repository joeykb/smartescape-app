/**
 * Centralized status theme configuration.
 * Previously duplicated across ActiveAlertCard, NotificationRow, SystemCard,
 * system/[id].tsx, and feed.tsx with varying subsets of the same data.
 */

import { AlertCircle, AlertTriangle, WifiOff, Info, CheckCircle } from 'lucide-react-native';
import { NotificationStatus } from '../types';

export interface StatusTheme {
    icon: any;
    color: string;
    bgColor: string;
    borderColor: string;
    label: string;
}

export const STATUS_THEME: Record<NotificationStatus, StatusTheme> = {
    ALERT: {
        icon: AlertCircle,
        color: '#ef4444',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        label: 'ALERT',
    },
    OFFLINE: {
        icon: WifiOff,
        color: '#ef4444',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        label: 'OFFLINE',
    },
    WARNING: {
        icon: AlertTriangle,
        color: '#f59e0b',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
        label: 'WARNING',
    },
    INFO: {
        icon: Info,
        color: '#3b82f6',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
        label: 'INFO',
    },
    HEALTHY: {
        icon: CheckCircle,
        color: '#10b981',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30',
        label: 'HEALTHY',
    },
};

/**
 * Quick lookup for just the status color (used in filter chips, badges, etc.)
 */
export const STATUS_COLORS: Record<NotificationStatus | 'ALL', string> = {
    ALL: '#10b981',
    ALERT: '#ef4444',
    OFFLINE: '#ef4444',
    WARNING: '#f59e0b',
    INFO: '#3b82f6',
    HEALTHY: '#10b981',
};
