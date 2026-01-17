import { z } from "zod";

/**
 * Environment validation schema for critical API keys and configuration
 */
const envSchema = z.object({
    // Database configuration
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    DATABASE_PROVIDER: z.enum(["sqlite", "postgresql", "mysql"]).optional(),

    // Authentication
    GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
    GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),
    PARTNER_SECRET: z.string().optional(), // Used for Partner/Influencer auth
    BETTER_AUTH_SECRET: z.string().optional(), // Fallback for Partner auth

    // Payment processing
    PAYSTACK_SECRET_KEY: z.string().min(1, "PAYSTACK_SECRET_KEY is required"),

    // AI services
    OPENROUTER_API_KEY: z.string().optional(), // Kept for DeepSeek R1 (Future)
    GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
    GEMINI_API_KEY: z.string().optional(), // For RAG/File Search features

    // Application configuration
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

/**
 * CRITICAL SECURITY FIX: Runtime environment validation with security checks
 * Throws error if critical environment variables are missing or invalid
 */
export function validateEnvironment() {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        const errorMessage = "Environment validation failed. Missing required variables.";

        console.error("[ENV VALIDATION] Critical environment variables missing:");
        console.error(result.error.toString());

        // CRITICAL SECURITY FIX: In production, throw error to prevent application startup
        if (process.env.NODE_ENV === "production") {
            throw new Error(errorMessage);
        }

        // In development, log warning but allow startup
        console.warn("[ENV VALIDATION] Development mode: Continuing with missing environment variables");
        return false;
    }

    const securityChecks = [
        {
            key: 'GROQ_API_KEY',
            value: result.data.GROQ_API_KEY,
            name: 'Groq API Key'
        },
        {
            key: 'PAYSTACK_SECRET_KEY',
            value: result.data.PAYSTACK_SECRET_KEY,
            name: 'Paystack Secret Key'
        },
        {
            key: 'GOOGLE_CLIENT_SECRET',
            value: result.data.GOOGLE_CLIENT_SECRET,
            name: 'Google Client Secret'
        }
    ];

    for (const check of securityChecks) {
        if (!check.value || check.value.trim() === '') {
            const errorMsg = `[ENV VALIDATION] ${check.name} is missing or empty`;
            console.error(errorMsg);

            if (process.env.NODE_ENV === "production") {
                throw new Error(errorMsg);
            }
        } else if (check.value.length < 10) {
            const errorMsg = `[ENV VALIDATION] ${check.name} appears to be invalid (too short)`;
            console.error(errorMsg);

            if (process.env.NODE_ENV === "production") {
                throw new Error(errorMsg);
            }
        }
    }

    console.log("[ENV VALIDATION] All critical environment variables are present and valid");
    return true;
}

/**
 * Get validated environment variables with type safety
 */
export function getEnv() {
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
        throw new Error("Environment variables not properly configured");
    }

    return result.data;
}

/**
 * Check if specific API keys are available
 */
export function checkApiKey(key: keyof typeof envSchema.shape): boolean {
    try {
        const env = getEnv();
        return !!env[key];
    } catch {
        return false;
    }
}

/**
 * Validate specific service configuration
 */
export function validateService(service: 'payment' | 'ai' | 'auth'): boolean {
    const env = getEnv();

    switch (service) {
        case 'payment':
            return !!env.PAYSTACK_SECRET_KEY;
        case 'ai':
            return !!env.GROQ_API_KEY;
        case 'auth':
            return !!env.GOOGLE_CLIENT_ID && !!env.GOOGLE_CLIENT_SECRET;
        default:
            return false;
    }
}

// Note: Removed auto-validation on import to prevent side effects
// Applications should call validateEnvironment() explicitly during initialization