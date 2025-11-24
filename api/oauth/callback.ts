import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import * as db from "../../server/db";
import { getSessionCookieOptions } from "../../server/_core/cookies";
import { sdk } from "../../server/_core/sdk";

export default async function handler(req: Request) {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
        return new Response(JSON.stringify({ error: "code and state are required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const tokenResponse = await sdk.exchangeCodeForToken(code, state);
        const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

        if (!userInfo.openId) {
            return new Response(JSON.stringify({ error: "openId missing from user info" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        await db.upsertUser({
            openId: userInfo.openId,
            name: userInfo.name || null,
            email: userInfo.email ?? null,
            loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
            lastSignedIn: new Date(),
        });

        const sessionToken = await sdk.createSessionToken(userInfo.openId, {
            name: userInfo.name || "",
            expiresInMs: ONE_YEAR_MS,
        });

        // Create cookie header for redirect
        // Note: For serverless, we need to construct Set-Cookie header manually
        const cookieOptions = getSessionCookieOptions(req as any);
        const cookieValue = `${COOKIE_NAME}=${sessionToken}; Path=/; Max-Age=${Math.floor(ONE_YEAR_MS / 1000)}; HttpOnly; SameSite=Lax${cookieOptions.secure ? '; Secure' : ''}`;

        return new Response(null, {
            status: 302,
            headers: {
                "Location": "/",
                "Set-Cookie": cookieValue,
            },
        });
    } catch (error) {
        console.error("[OAuth] Callback failed", error);
        return new Response(JSON.stringify({ error: "OAuth callback failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}

export const config = {
    runtime: "nodejs",
};
