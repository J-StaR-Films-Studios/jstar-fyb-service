import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

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
    console.error("[Auth] Environment validation failed:", envValidation.error);
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
        console.error("[Auth] CRITICAL: SQLite is not allowed in production environment");
        throw new Error("SQLite database provider is not secure for production use");
    }

    // Additional security check for production database URL
    const dbUrl = envValidation.data.DATABASE_URL;
    if (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')) {
        console.error("[Auth] CRITICAL: Local database URLs are not allowed in production");
        throw new Error("Production environment must use secure database connections");
    }
}

// Security logging for database configuration - only log provider, not environment variables
console.log(`[Auth] Database provider configured: ${dbProvider} (Environment: ${process.env.NODE_ENV || 'development'})`);

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: dbProvider,
    }),
    emailAndPassword: {
        enabled: true,
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
});
