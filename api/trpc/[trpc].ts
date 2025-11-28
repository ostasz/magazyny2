import { nodeHTTPRequestHandler } from "@trpc/server/adapters/node-http";
import { appRouter } from "../../server/routers";
import type { User } from "../../drizzle/schema";
import { sdk } from "../../server/_core/sdk";
import type { IncomingMessage, ServerResponse } from "http";

// Vercel serverless function handler
export default async function handler(req: IncomingMessage, res: ServerResponse) {
    return nodeHTTPRequestHandler({
        router: appRouter,
        req,
        res,
        createContext: async () => {
            // Authenticate user from request
            let user: User | null = null;
            try {
                // Extract cookie header for authentication
                const cookieHeader = req.headers["cookie"];
                if (cookieHeader) {
                    user = await sdk.authenticateRequestFromCookie(cookieHeader);
                }
            } catch (error) {
                // Authentication is optional for public procedures
                user = null;
            }
            return { user, req: req as any, res: res as any };
        },
    });
}

export const config = {
    runtime: "nodejs",
    maxDuration: 60, // Vercel Pro allows 60 seconds
};
