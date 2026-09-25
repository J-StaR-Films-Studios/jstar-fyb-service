import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { logger } from "./logger";

export const rateLimiters = {
    ai: {
        requests: 20,
        window: "1 m",
        identifier: "ai",
    },
    payment: {
        requests: 5,
        window: "1 m",
        identifier: "payment",
    },
    auth: {
        requests: 10,
        window: "1 m",
        identifier: "auth",
    },
    upload: {
        requests: 10,
        window: "1 m",
        identifier: "upload",
    },
} as const;

export type RateLimitType = keyof typeof rateLimiters;

const ratelimitCache = new Map<RateLimitType, Ratelimit>();

function getRateLimiter(type: RateLimitType): Ratelimit | null {
    if (ratelimitCache.has(type)) {
        return ratelimitCache.get(type)!;
    }

    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!redisUrl || !redisToken) {
        logger.warn("Upstash Redis not configured. Rate limiting disabled.", "[RateLimit]");
        return null;
    }

    try {
        const redis = new Redis({
            url: redisUrl,
            token: redisToken,
        });

        const config = rateLimiters[type];

        const ratelimit = new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(config.requests, config.window as any),
            analytics: true,
            prefix: "jstar-fyb",
        });

        ratelimitCache.set(type, ratelimit);
        return ratelimit;
    } catch (error) {
        logger.error(`Failed to initialize rate limiter: ${error}`, "[RateLimit]");
        return null;
    }
}

export async function checkRateLimit(
    identifier: string,
    type: RateLimitType = "ai"
): Promise<{ success: boolean; limit: number; remaining: number; reset: Date } | null> {
    const limiter = getRateLimiter(type);

    if (!limiter) {
        return null;
    }

    const config = rateLimiters[type];
    const key = `${config.identifier}:${identifier}`;

    try {
        const result = await limiter.limit(key);
        // Upstash treats timeouts as success; paid routes must not do so.
        if (result.reason === "timeout") {
            logger.error("Rate limit check timed out", "[RateLimit]");
            return null;
        }
        return {
            success: result.success,
            limit: result.limit,
            remaining: result.remaining,
            reset: new Date(result.reset),
        };
    } catch (error) {
        logger.error(`Rate limit check failed: ${error}`, "[RateLimit]");
        return null;
    }
}

export async function applyRateLimit(
    identifier: string,
    type: RateLimitType = "ai",
    options: { failClosed?: boolean } = {}
): Promise<NextResponse | null> {
    const result = await checkRateLimit(identifier, type);

    if (!result) {
        return options.failClosed
            ? NextResponse.json({ error: "Rate limiting unavailable. Please try again later." }, { status: 503 })
            : null;
    }

    if (!result.success) {
        logger.warn(`Rate limit exceeded for ${type}:${identifier}`, "[RateLimit]");
        return NextResponse.json(
            {
                error: "Too many requests. Please try again later.",
                retryAfter: Math.ceil((result.reset.getTime() - Date.now()) / 1000),
            },
            {
                status: 429,
                headers: {
                    "X-RateLimit-Limit": result.limit.toString(),
                    "X-RateLimit-Remaining": result.remaining.toString(),
                    "X-RateLimit-Reset": result.reset.toISOString(),
                    "Retry-After": Math.ceil((result.reset.getTime() - Date.now()) / 1000).toString(),
                },
            }
        );
    }

    return null;
}

// All public AI endpoints share this key, so forged IP headers cannot bypass the total cap.
export async function applyAnonymousAiRateLimit(request: Request): Promise<NextResponse | null> {
    const perIpResponse = await applyRateLimit(getClientIdentifier(request), "ai", { failClosed: true });
    if (perIpResponse) return perIpResponse;

    return applyRateLimit("anonymous:shared", "ai", { failClosed: true });
}

export function getClientIdentifier(request: Request, userId?: string): string {
    if (userId) {
        return `user:${userId}`;
    }

    const xff = request.headers.get("x-forwarded-for");
    if (xff) {
        return `ip:${xff.split(",")[0].trim()}`;
    }

    const realIp = request.headers.get("x-real-ip");
    if (realIp) {
        return `ip:${realIp}`;
    }

    return `anonymous:${Date.now()}`;
}
