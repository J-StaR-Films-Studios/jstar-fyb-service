import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { magicLink } from "better-auth/plugins";
import { logger } from "@/lib/logger";

// CRITICAL SECURITY FIX: Enhanced environment validation schema with runtime validation
const envSchema = z.object({
    DATABASE_PROVIDER: z.enum(["sqlite", "postgresql", "mysql"]).optional(),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
    GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
});

// CRITICAL SECURITY FIX: Runtime environment validation with security checks
const envValidation = envSchema.safeParse(process.env);
if (!envValidation.success) {
    logger.error("[Auth] Environment validation failed: " + envValidation.error.toString());
    throw new Error("Missing required environment variables for authentication");
}

const prisma = new PrismaClient();

// CRITICAL SECURITY FIX: Secure database provider configuration with validation
const dbProvider = (envValidation.data.DATABASE_PROVIDER || "postgresql") as "sqlite" | "postgresql" | "mysql";

// CRITICAL SECURITY FIX: Strict production database provider validation
// Note: We check for actual deployment (VERCEL env) rather than just NODE_ENV
// because `next build` runs with NODE_ENV=production even locally
const isActuallyDeployed = process.env.VERCEL || process.env.RAILWAY_ENVIRONMENT || process.env.RENDER;

if (process.env.NODE_ENV === "production" && isActuallyDeployed) {
    if (dbProvider === "sqlite") {
        logger.error("[Auth] CRITICAL: SQLite is not allowed in production environment");
        throw new Error("SQLite database provider is not secure for production use");
    }

    // Additional security check for production database URL
    const dbUrl = envValidation.data.DATABASE_URL;
    if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
        logger.error("[Auth] CRITICAL: Local database URLs are not allowed in production");
        throw new Error("Production environment must use secure database connections");
    }
}

// Security logging for database configuration - only log provider, not environment variables
logger.info(`[Auth] Database provider configured: ${dbProvider} (Environment: ${process.env.NODE_ENV || 'development'})`);

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: dbProvider,
    }),
    emailAndPassword: {
        enabled: true,
        password: {
            hash: async (password: string) => {
                const { hash } = await import("bcryptjs");
                return await hash(password, 10);
            },
            verify: async ({ password, hash }: { password: string; hash: string }) => {
                const { compare } = await import("bcryptjs");
                return await compare(password, hash);
            }
        }
    },
    socialProviders: {
        google: {
            clientId: envValidation.data.GOOGLE_CLIENT_ID,
            clientSecret: envValidation.data.GOOGLE_CLIENT_SECRET,
        },
    },
    user: {
        additionalFields: {
            role: {
                type: "string",
                defaultValue: "USER",
            },
        },
    },
    // CSRF protection
    csrf: {
        enabled: true,
    },
    plugins: [
        magicLink({
            sendMagicLink: async ({ email, token, url }) => {
                const { Resend } = await import("resend");
                const resend = new Resend(process.env.RESEND_API_KEY);

                logger.info(`[Auth] Sending Magic Link to ${email}`);

                await resend.emails.send({
                    from: process.env.RESEND_FROM_EMAIL || "J-Star Projects <onboarding@resend.dev>",
                    to: email,
                    subject: "Sign in to J-Star FYB Service",
                    html: `
                        <h1>Log in to your account</h1>
                        <p>Click the link below to sign in:</p>
                        <a href="${url}">Sign In</a>
                        <p>If you didn't request this, just ignore it.</p>
                    `
                });
            },
        }),
    ],
});
