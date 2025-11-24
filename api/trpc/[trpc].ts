import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../../server/routers";
import type { User } from "../../drizzle/schema";
import { sdk } from "../../server/_core/sdk";

// Vercel serverless function handler
export default async function handler(req: Request) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\/trpc\/?/, "");

    // Authenticate user from request
    let user: User | null = null;
    try {
        // Extract cookie header for authentication
        const cookieHeader = req.headers.get("cookie");
        if (cookieHeader) {
            user = await sdk.authenticateRequestFromCookie(cookieHeader);
        }
    } catch (error) {
        // Authentication is optional for public procedures
        user = null;
    }

    return fetchRequestHandler({
        endpoint: "/api/trpc",
        req,
        router: appRouter,
        createContext: () => ({ user, req }),
    });
}

export const config = {
    runtime: "nodejs",
    maxDuration: 60, // Vercel Pro allows 60 seconds
};
