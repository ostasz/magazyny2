import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    // In development, if auth fails, provide a mock admin user
    if (process.env.NODE_ENV === "development") {
      // user = {
      //   id: 1,
      //   openId: "dev-user-id",
      //   name: "Dev User",
      //   email: "dev@example.com",
      //   role: "admin",
      //   loginMethod: "dev",
      //   createdAt: new Date(),
      //   updatedAt: new Date(),
      //   lastSignedIn: new Date(),
      // };
      user = null;
    } else {
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
