// src/api/auth.ts
export const GOOGLE_WEB_CLIENT_ID = '234622472801-808k3higs0vvq12hunck8pka4fsilb5p.apps.googleusercontent.com';
export const GOOGLE_ANDROID_CLIENT_ID = '234622472801-cnpg133d0be04u81bj28p363bfhcgipt.apps.googleusercontent.com';

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
