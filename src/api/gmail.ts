import { Notification, NotificationStatus } from '../types';

/**
 * Fetches the list of recent messages from the Gmail inbox.
 * Filters for emails matching Smart Escape system alert patterns.
 */
export async function fetchGmailMessages(accessToken: string, maxResults = 20): Promise<Notification[]> {
    // 1. Get list of message IDs
    const listRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=subject:(SmartEscape OR "Smart Escape" OR SMART-ESC)`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!listRes.ok) {
        const errBody = await listRes.text();
        console.error('[GmailService] Failed to list messages:', errBody);
        throw new Error(`Failed to list messages: ${listRes.status}`);
    }

    const listData = await listRes.json();
    const messageIds: { id: string }[] = listData.messages || [];

    if (messageIds.length === 0) return [];

    // 2. Fetch each message in parallel (batch of details)
    const messagePromises = messageIds.map((msg) =>
        fetchMessageDetail(accessToken, msg.id)
    );

    const messages = await Promise.all(messagePromises);
    return messages.filter(Boolean) as Notification[];
}

/**
 * Fetches a single message detail and parses it into a Notification.
 */
async function fetchMessageDetail(accessToken: string, messageId: string): Promise<Notification | null> {
    try {
        const res = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!res.ok) return null;

        const data = await res.json();
        return parseEmailToNotification(data);
    } catch (e) {
        console.error(`[GmailService] Error fetching message ${messageId}:`, e);
        return null;
    }
}

/**
 * Parses a raw Gmail API message object into a Notification.
 */
function parseEmailToNotification(message: any): Notification {
    const headers = message.payload?.headers || [];

    const subjectHeader = headers.find((h: any) => h.name.toLowerCase() === 'subject');
    const dateHeader = headers.find((h: any) => h.name.toLowerCase() === 'date');

    const subject: string = subjectHeader?.value || 'No Subject';
    const dateStr: string = dateHeader?.value || new Date().toISOString();

    // Extract body text
    let bodyText = '';
    if (message.payload?.body?.data) {
        bodyText = decodeBase64Url(message.payload.body.data);
    } else if (message.payload?.parts) {
        const textPart = message.payload.parts.find(
            (p: any) => p.mimeType === 'text/plain' && p.body?.data
        );
        if (textPart) {
            bodyText = decodeBase64Url(textPart.body.data);
        }
    }

    // Parse system ID and status from subject/body
    const systemId = extractSystemId(subject, bodyText);
    const status = extractStatus(subject, bodyText);

    return {
        id: message.id,
        systemId,
        timestamp: new Date(dateStr).toISOString(),
        status,
        message: bodyText.trim().substring(0, 200) || subject,
        isRead: !(message.labelIds || []).includes('UNREAD'),
    };
}

/**
 * Extracts a system ID from the subject or body.
 * Looks for patterns like SMART-ESC-001 or SystemID: XYZ
 */
function extractSystemId(subject: string, body: string): string {
    const combined = `${subject} ${body}`;

    // Match pattern: SMART-ESC-XXX
    const match = combined.match(/SMART-ESC-\w+/i);
    if (match) return match[0].toUpperCase();

    // Match pattern: SystemID: XXX or System ID: XXX
    const sysMatch = combined.match(/system\s*id:\s*(\S+)/i);
    if (sysMatch) return sysMatch[1].toUpperCase();

    return 'UNKNOWN';
}

/**
 * Extracts a notification status from the subject or body.
 */
function extractStatus(subject: string, body: string): NotificationStatus {
    const combined = `${subject} ${body}`.toUpperCase();

    if (combined.includes('OFFLINE') || combined.includes('HEARTBEAT LOST') || combined.includes('DISCONNECTED')) {
        return 'OFFLINE';
    }
    if (combined.includes('ALERT') || combined.includes('FIRE') || combined.includes('CRITICAL') || combined.includes('EMERGENCY')) {
        return 'ALERT';
    }
    if (combined.includes('WARNING') || combined.includes('WARN')) {
        return 'WARNING';
    }
    return 'INFO';
}

/**
 * Decodes a base64url-encoded string (Gmail API format).
 */
function decodeBase64Url(data: string): string {
    try {
        const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
        // atob is available in React Native
        return decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
    } catch {
        return '';
    }
}

/**
 * Sends an email (notification/command) via Gmail API.
 */
export async function sendGmailMessage(
    accessToken: string,
    to: string,
    subject: string,
    body: string
): Promise<boolean> {
    const rawMessage = createRawEmail(to, subject, body);

    const res = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ raw: rawMessage }),
        }
    );

    if (!res.ok) {
        const errBody = await res.text();
        console.error('[GmailService] Failed to send:', errBody);
        return false;
    }

    return true;
}

/**
 * Inserts a message directly into the inbox (appears as received, not sent).
 * Uses the Gmail API insert endpoint with INBOX + UNREAD labels.
 */
export async function insertGmailMessage(
    accessToken: string,
    fromEmail: string,
    subject: string,
    body: string
): Promise<boolean> {
    const rawMessage = createRawEmail(fromEmail, subject, body);

    const res = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/import?internalDateSource=receivedTime',
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                raw: rawMessage,
                labelIds: ['INBOX', 'UNREAD'],
            }),
        }
    );

    if (!res.ok) {
        const errBody = await res.text();
        console.error('[GmailService] Failed to insert:', errBody);
        return false;
    }

    return true;
}

/**
 * Creates the RFC 2822 formatted raw email, base64url encoded.
 */
function createRawEmail(to: string, subject: string, body: string): string {
    const emailLines = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        body,
    ];

    const email = emailLines.join('\r\n');
    // Encode to base64url
    const encoded = btoa(
        encodeURIComponent(email).replace(/%([0-9A-F]{2})/g, (_, p1) =>
            String.fromCharCode(parseInt(p1, 16))
        )
    )
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    return encoded;
}
