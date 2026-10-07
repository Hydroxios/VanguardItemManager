// Server side only: the Bungie application credentials, and the OAuth `state` that protects the login against CSRF

const isProduction = process.env.NODE_ENV === "production";

// The dev and production Bungie applications are registered separately
export const getBungieClientId = () => isProduction ? process.env.BUNGIE_CLIENT_ID : process.env.BUNGIE_CLIENT_ID_DEV;
export const getBungieClientSecret = () => isProduction ? process.env.BUNGIE_CLIENT_SECRET : process.env.BUNGIE_CLIENT_SECRET_DEV;

/**
 * /api/login stores a random state in this cookie and sends it to Bungie, which hands it back with the authorization
 * code; /api/token only exchanges a code that comes back with the same state, so a code from someone else's login is refused.
 */
export const OAUTH_STATE_COOKIE = "oauth_state";

export const oauthStateCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/api/token",
} as const;
