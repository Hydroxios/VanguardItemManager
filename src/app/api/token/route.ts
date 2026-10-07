import { NextRequest, NextResponse } from "next/server"

// The refresh token lives only in this httpOnly cookie, scoped to this route, so client scripts can never read it
const REFRESH_COOKIE = "rtoken";
const COOKIE_PATH = "/api/token";

const setRefreshCookie = (res: NextResponse, value: string, maxAge: number) => {
    res.cookies.set(REFRESH_COOKIE, value, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: COOKIE_PATH,
        maxAge,
    });
}

const clearRefreshCookie = (res: NextResponse) => setRefreshCookie(res, "", 0);

/**
 * Login (`{ code }`) or refresh. A refresh uses the cookie; a `refresh_token` in the body is only
 * accepted to migrate sessions stored in localStorage by older versions.
 * Only the access token is returned to the client.
 */
const POST = async (req: NextRequest) => {

    const clientId = process.env.NODE_ENV === 'production' ? process.env.BUNGIE_CLIENT_ID! : process.env.BUNGIE_CLIENT_ID_DEV!;
    const clientSecret = process.env.NODE_ENV === 'production' ? process.env.BUNGIE_CLIENT_SECRET! : process.env.BUNGIE_CLIENT_SECRET_DEV!;

    if (!clientId) {
        return NextResponse.json({ error: "Missing client id" }, { status: 500 });
    }

    if (!clientSecret) {
        return NextResponse.json({ error: "Missing client secret" }, { status: 500 });
    }

    // An empty body is a refresh using the cookie
    const body: { code?: string, refresh_token?: string } = await req.json().catch(() => ({}));

    // Either exchange an authorization code (login) or refresh an existing token
    let grant: Record<string, string>;
    const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value || body.refresh_token;
    if (typeof body.code === "string" && body.code) {
        grant = { grant_type: "authorization_code", code: body.code };
    } else if (typeof refreshToken === "string" && refreshToken) {
        grant = { grant_type: "refresh_token", refresh_token: refreshToken };
    } else {
        return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    try {
        const bungieRes = await fetch("https://www.bungie.net/Platform/App/OAuth/token/", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                ...grant,
            })
        })

        const data = await bungieRes.json();
        if (!bungieRes.ok || !data.access_token) {
            const res = NextResponse.json(data, { status: bungieRes.status });
            // Bungie rejected the refresh token: the session is over
            if (grant.grant_type === "refresh_token" && (bungieRes.status === 400 || bungieRes.status === 401)) {
                clearRefreshCookie(res);
            }
            return res;
        }

        const res = NextResponse.json({
            access_token: data.access_token,
            expires_in: data.expires_in,
        });
        setRefreshCookie(res, data.refresh_token, data.refresh_expires_in ?? 90 * 24 * 3600);
        return res;
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to reach Bungie token endpoint" }, { status: 502 });
    }

}

/** Logout: drops the refresh token cookie. */
const DELETE = async () => {
    const res = new NextResponse(null, { status: 204 });
    clearRefreshCookie(res);
    return res;
}

export { POST, DELETE }
