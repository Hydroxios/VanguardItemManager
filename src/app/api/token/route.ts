import { NextRequest, NextResponse } from "next/server"

const POST = async (req: NextRequest) => {

    const clientId = process.env.NODE_ENV === 'production' ? process.env.BUNGIE_CLIENT_ID! : process.env.BUNGIE_CLIENT_ID_DEV!;
    const clientSecret = process.env.NODE_ENV === 'production' ? process.env.BUNGIE_CLIENT_SECRET! : process.env.BUNGIE_CLIENT_SECRET_DEV!;

    if (!clientId || !clientSecret) {
        return NextResponse.json({ error: "Missing client id or client secret" }, { status: 500 });
    }

    const body = await req.json();

    try {
        const res = await fetch("https://www.bungie.net/Platform/App/OAuth/token/", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: "refresh_token",
                refresh_token: body.refresh_token,
            })
        })

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to refresh token" }, { status: 500 });
    }

}

export { POST }