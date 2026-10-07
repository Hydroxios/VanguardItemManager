import { NextRequest, NextResponse } from "next/server"

const POST = async (req: NextRequest) => {

    const clientId = process.env.NODE_ENV === 'production' ? process.env.BUNGIE_CLIENT_ID! : process.env.BUNGIE_CLIENT_ID_DEV!;
    const clientSecret = process.env.NODE_ENV === 'production' ? process.env.BUNGIE_CLIENT_SECRET! : process.env.BUNGIE_CLIENT_SECRET_DEV!;

    if (!clientId) {
        return NextResponse.json({ error: "Missing client id" }, { status: 500 });
    }

    if (!clientSecret) {
        return NextResponse.json({ error: "Missing client secret" }, { status: 500 });
    }

    let body: { code?: string, refresh_token?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    // Either exchange an authorization code (login) or refresh an existing token
    let grant: Record<string, string>;
    if (typeof body.code === "string" && body.code) {
        grant = { grant_type: "authorization_code", code: body.code };
    } else if (typeof body.refresh_token === "string" && body.refresh_token) {
        grant = { grant_type: "refresh_token", refresh_token: body.refresh_token };
    } else {
        return NextResponse.json({ error: "Missing code or refresh_token" }, { status: 400 });
    }

    try {
        const res = await fetch("https://www.bungie.net/Platform/App/OAuth/token/", {
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

        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to reach Bungie token endpoint" }, { status: 502 });
    }

}

export { POST }
