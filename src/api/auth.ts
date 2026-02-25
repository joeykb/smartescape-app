// src/api/auth.ts
import { Config } from '../constants/config';

export const GOOGLE_WEB_CLIENT_ID = Config.GOOGLE_WEB_CLIENT_ID;
export const GOOGLE_ANDROID_CLIENT_ID = Config.GOOGLE_ANDROID_CLIENT_ID;

/**
 * Fetches the Google User Profile info using an access token.
 */
export async function fetchGoogleUserInfo(accessToken: string) {
    const response = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch user info from Google');
    }

    return response.json();
}
