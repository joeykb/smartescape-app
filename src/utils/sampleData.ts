import { NotificationStatus } from '../types';
import { sendGmailMessage } from '../api/gmail';

const SYSTEM_IDS = [
    'SMART-ESC-001', 'SMART-ESC-002', 'SMART-ESC-003',
    'SMART-ESC-004', 'SMART-ESC-005', 'SMART-ESC-006',
];

const STATUSES: NotificationStatus[] = ['ALERT', 'OFFLINE', 'WARNING', 'INFO', 'HEALTHY'];

const MESSAGES: Record<NotificationStatus, string[]> = {
    ALERT: [
        'Fire detected in Zone A - Evacuate immediately',
        'Smoke alarm triggered on Floor 3',
        'Emergency: High temperature in Server Room B',
        'Critical: Gas leak detected in Kitchen Area',
        'Fire suppression system activated in Warehouse',
    ],
    OFFLINE: [
        'Heartbeat lost - System unresponsive for 5 minutes',
        'Connection timeout - Last ping 10 minutes ago',
        'Network disconnected - Check hardware',
        'Sensor module offline - Battery may be depleted',
    ],
    WARNING: [
        'Battery level below 20% - Charge recommended',
        'Sensor reading anomaly detected - Manual inspection advised',
        'Firmware update available - v3.2.1',
        'High humidity detected in Control Room',
    ],
    INFO: [
        'Daily system check completed successfully',
        'Scheduled maintenance window starting in 1 hour',
        'New device registered on network',
        'Configuration backup completed',
    ],
    HEALTHY: [
        'All systems operational',
        'Routine health check passed',
        'Sensors calibrated successfully',
        'Network connectivity stable',
    ],
};

function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

interface GeneratedAlert {
    systemId: string;
    status: NotificationStatus;
    message: string;
}

function generateAlertData(count: number, randomize: boolean): GeneratedAlert[] {
    const alerts: GeneratedAlert[] = [];

    for (let i = 0; i < count; i++) {
        let status: NotificationStatus;

        if (randomize) {
            status = pickRandom(STATUSES);
        } else {
            const roll = Math.random();
            if (roll < 0.35) status = 'ALERT';
            else if (roll < 0.55) status = 'OFFLINE';
            else if (roll < 0.75) status = 'WARNING';
            else if (roll < 0.9) status = 'INFO';
            else status = 'HEALTHY';
        }

        alerts.push({
            systemId: pickRandom(SYSTEM_IDS),
            status,
            message: pickRandom(MESSAGES[status]),
        });
    }

    return alerts;
}

/**
 * Sends sample alerts as real emails to the user's own inbox via Gmail API.
 * @returns { sent: number, errors: string[] }
 */
export async function sendSampleAlerts(
    accessToken: string,
    userEmail: string,
    count: number,
    randomize: boolean,
    onProgress?: (sent: number, total: number) => void,
): Promise<{ sent: number; errors: string[] }> {
    const alerts = generateAlertData(count, randomize);
    let sent = 0;
    const errors: string[] = [];

    for (let i = 0; i < alerts.length; i++) {
        const alert = alerts[i];
        const subject = `${alert.systemId} ${alert.status} - ${alert.message.split(' - ')[0]}`;
        const body = [
            'Smart Escape System Alert',
            '',
            `System ID: ${alert.systemId}`,
            `Status: ${alert.status}`,
            '',
            alert.message,
            '',
            'This is an automated alert from the Smart Escape monitoring system.',
        ].join('\n');

        try {
            const success = await sendGmailMessage(accessToken, userEmail, subject, body);
            if (success) {
                sent++;
            } else {
                errors.push(`Alert ${i + 1}: API returned failure`);
            }
        } catch (e: any) {
            const errMsg = e?.message || String(e);
            errors.push(`Alert ${i + 1}: ${errMsg}`);
            console.error(`[SampleData] Failed to send alert ${i + 1}:`, errMsg);
        }

        onProgress?.(i + 1, alerts.length);

        // Small delay to avoid rate limits
        if (i < alerts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    return { sent, errors };
}
