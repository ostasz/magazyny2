import { TRPCError } from "@trpc/server";
import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { users } from "../../drizzle/schema";
import { getDb } from "../db";
import { publicProcedure, router } from "../_core/trpc";
import { sdk } from "../_core/sdk";
import { eq } from "drizzle-orm";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { nanoid } from "nanoid";
import { getSessionCookieOptions } from "../_core/cookies";

export const authRouter = router({
    register: publicProcedure
        .input(
            z.object({
                email: z.string().email(),
                password: z.string().min(8),
                name: z.string().min(2),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

            const existingUser = await db.select().from(users).where(eq(users.email, input.email)).limit(1);

            if (existingUser.length > 0) {
                throw new TRPCError({
                    code: "CONFLICT",
                    message: "User with this email already exists",
                });
            }

            const hashedPassword = await hash(input.password, 10);
            const openId = `local_${nanoid()}`;

            await db.insert(users).values({
                email: input.email,
                password: hashedPassword,
                name: input.name,
                openId: openId,
                loginMethod: "email",
                role: "user",
            });

            // Auto login after register
            const token = await sdk.createSessionToken(openId, {
                name: input.name,
                expiresInMs: ONE_YEAR_MS,
            });

            const cookieOptions = getSessionCookieOptions(ctx.req);
            ctx.res.cookie(COOKIE_NAME, token, {
                ...cookieOptions,
                maxAge: ONE_YEAR_MS,
            });

            return { token };
        }),

    login: publicProcedure
        .input(
            z.object({
                email: z.string().email(),
                password: z.string(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

            const usersFound = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
            const user = usersFound[0];

            if (!user || !user.password) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Invalid email or password",
                });
            }

            const isValid = await compare(input.password, user.password);

            if (!isValid) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Invalid email or password",
                });
            }

            const token = await sdk.createSessionToken(user.openId, {
                name: user.name || "",
                expiresInMs: ONE_YEAR_MS,
            });

            const cookieOptions = getSessionCookieOptions(ctx.req);
            ctx.res.cookie(COOKIE_NAME, token, {
                ...cookieOptions,
                maxAge: ONE_YEAR_MS,
            });

            return { token };
        }),

    me: publicProcedure.query((opts) => opts.ctx.user),

    logout: publicProcedure.mutation(({ ctx }) => {
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
        return {
            success: true,
        } as const;
    }),
});

