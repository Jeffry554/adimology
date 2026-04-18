console.log("Stockbit Token Syncer: Background script starting...");

// Configuration - Ganti domain ini dengan domain aplikasi Anda
// const APP_API_URL = "http://localhost:3000/api/update-token"; // Dev
const APP_API_URL = "https://glistening-kashata-399b06.netlify.app/api/update-token"; // Prod
const EXTENSION_SYNC_KEY = "stokbit-sync-2026-rahasia-8f4k";

console.log("Target API URL:", APP_API_URL);

let lastSyncedToken = null;

console.log("Registering webRequest listener...");

function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    console.log("Checking request:", details.url);

    const authHeader = details.requestHeaders.find(
      (header) => header.name.toLowerCase() === "authorization"
    );

    if (authHeader && authHeader.value) {
      if (authHeader.value.startsWith("Bearer ")) {
        const token = authHeader.value.substring(7);

        if (token !== lastSyncedToken) {
          console.log("New token candidate detected...");

          const decoded = parseJwt(token);

          if (!decoded || !decoded.exp) {
            console.log("Skipping non-JWT or invalid token.");
            return;
          }

          console.log("Valid JWT detected from:", details.url);
          const expiresAt = decoded.exp;

          console.log("Token Expiry:", new Date(expiresAt * 1000));

          syncToken(token, expiresAt);
        }
      }
    }
  },
  { urls: ["https://*.stockbit.com/*"] },
  ["requestHeaders", "extraHeaders"]
);

function syncToken(token, expiresAt) {
  const payload = {
    token: token,
    expires_at: expiresAt
  };

  fetch(APP_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Extension-Key': EXTENSION_SYNC_KEY
    },
    body: JSON.stringify(payload)
  })
    .then((response) => {
      if (response.ok) {
        console.log("Token successfully synced to API.");
        lastSyncedToken = token;
      } else {
        console.error("Failed to sync token. Status:", response.status);
      }
    })
    .catch((error) => {
      console.error("Error syncing token:", error);
    });
}
