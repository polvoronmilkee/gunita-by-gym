// GameOn Portal Integration
// See GameOn Portal API Integration Guide for details.

// Use Vite proxy for local dev, direct URL for production
const isLocalDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const isDevServer = isLocalDev && (window.location.port === '5173' || window.location.port === '3000' || window.location.port === '8080');

export const API_BASE = isDevServer ? '/portal-api' : 'https://gameonportal.ph/api';

/**
 * Initiates the portal session, opens the browser, and polls for authorization.
 * Resolves with true if authorized, false if failed/expired.
 * @param {string} gameId 
 * @returns {Promise<boolean>}
 */
export async function authorizePortal(gameId) {
  try {
    // Phase 1: Create Session
    const response = await fetch(`${API_BASE}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: gameId }),
    });

    if (!response.ok) {
      console.error("Failed to create portal session");
      return false;
    }

    const data = await response.json();
    const sessionToken = data.sessionToken;
    const signinUrl = data.signinUrl;

    if (!sessionToken || !signinUrl) return false;

    // Store current active session token for the unlock phase
    localStorage.setItem("gunita_portal_session", sessionToken);

    // Phase 2: Open Browser
    window.open(signinUrl, '_blank');

    // Phase 3: Poll Authorization
    return new Promise((resolve) => {
      let pollCount = 0;
      const maxPolls = 60; // 3 minutes at 3s intervals

      const pollingInterval = setInterval(async () => {
        pollCount++;
        if (pollCount > maxPolls) {
          clearInterval(pollingInterval);
          resolve(false);
          return;
        }

        try {
          const pollRes = await fetch(`${API_BASE}/session`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${sessionToken}`,
              Accept: 'application/json',
            },
          });

          if (pollRes.ok) {
            const pollData = await pollRes.json();
            if (pollData.status === 'authorized') {
              clearInterval(pollingInterval);
              resolve(true);
            } else if (pollData.status === 'expired') {
              clearInterval(pollingInterval);
              resolve(false);
            }
          }
        } catch (err) {
          console.warn("Polling error", err);
        }
      }, 3000);
    });
  } catch (e) {
    console.error("Portal API Error", e);
    return false;
  }
}

/**
 * Unlocks the artifact for the currently authorized session.
 * @returns {Promise<boolean>}
 */
export async function unlockPortalArtifact() {
  const sessionToken = localStorage.getItem("gunita_portal_session");
  if (!sessionToken) return false;

  try {
    const response = await fetch(`${API_BASE}/artifacts/unlock`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    });
    
    return response.ok;
  } catch (e) {
    console.error("Failed to unlock artifact", e);
    return false;
  }
}

/**
 * High-level helper for connecting and instantly unlocking an artifact.
 * @param {string} gameId 
 */
export async function connectAndUnlock(gameId) {
  const isAuthorized = await authorizePortal(gameId);
  if (isAuthorized) {
    const unlocked = await unlockPortalArtifact();
    return unlocked;
  }
  return false;
}
