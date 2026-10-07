import { randomBytes } from "crypto";
import { NextResponse } from "next/server"
import { getBungieClientId, OAUTH_STATE_COOKIE, oauthStateCookieOptions } from "@/lib/oauth";

// Long enough to log in on Bungie, with a platform account
const STATE_MAX_AGE = 10 * 60;

/** Starts the login: sends the browser to Bungie's authorization page with a fresh state. */
const GET = async () => {
    const clientId = getBungieClientId();
    if (!clientId) {
        return NextResponse.json({ error: "Missing client id" }, { status: 500 });
    }

    const state = randomBytes(16).toString("hex");
    const authorizeUrl = new URL("https://www.bungie.net/en/OAuth/Authorize");
    authorizeUrl.search = new URLSearchParams({ client_id: clientId, response_type: "code", state }).toString();

    const res = NextResponse.redirect(authorizeUrl);
    res.cookies.set(OAUTH_STATE_COOKIE, state, { ...oauthStateCookieOptions, maxAge: STATE_MAX_AGE });
    return res;
}

export { GET }
