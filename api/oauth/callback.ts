import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import * as db from "../../server/db";
import { getSessionCookieOptions } from "../../server/_core/cookies";
import { sdk } from "../../server/_core/sdk";



import type { IncomingMessage, ServerResponse } from "http";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
    // Construct URL manually since req.url is just the path
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const host = req.headers["host"];
    const url = new URL(req.url || "", `${protocol}://${host}`);

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "code and state are required" }));
        return;
    }

    try {
        const tokenResponse = await sdk.exchangeCodeForToken(code, state);
        const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

        if (!userInfo.openId) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "openId missing from user info" }));
            return;
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
        const cookieOptions = getSessionCookieOptions(req as any);
        const cookieValue = `${COOKIE_NAME}=${sessionToken}; Path=/; Max-Age=${Math.floor(ONE_YEAR_MS / 1000)}; HttpOnly; SameSite=Lax${cookieOptions.secure ? '; Secure' : ''}`;

        res.statusCode = 302;
        res.setHeader("Location", "/");
        res.setHeader("Set-Cookie", cookieValue);
        res.end();
    } catch (error) {
        console.error("[OAuth] Callback failed", error);
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "OAuth callback failed" }));
    }
}

export const config = {
    runtime: "nodejs",
};
