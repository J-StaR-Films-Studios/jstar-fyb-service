import { tool } from 'ai';
import { z } from 'zod';
import { logger } from '@/lib/logger';

export const chatTools = {
    suggestTopics: tool({
        description: `MANDATORY tool for suggesting project topics. You MUST call this tool when presenting topic options.
TRIGGER: After learning the user's department/course.
SYNTAX: suggestTopics({ topics: [{ title: "...", twist: "...", difficulty: "Safe Bet" | "Insane Mode" }] })
POSITIVE: User says "I study Computer Science" → Call suggestTopics with 2 options.
NEGATIVE: Never write topics as plain text. If you want to suggest topics, you MUST use this tool.`,
        inputSchema: z.object({
            topics: z.array(z.object({
                title: z.string(),
                twist: z.string().describe('The feature that makes it special'),
                difficulty: z.enum(['Safe Bet', 'Insane Mode']),
            })),
        }),
        execute: async ({ topics }) => {
            logger.info({ topics }, '[TOOL CALL] suggestTopics');
            return { topics, suggested: true };
        },
    }),
    setComplexity: tool({
        description: 'Updates the visual complexity meter (1-5). Use this IMMEDIATELY after they propose a topic to show them how hard it is.',
        inputSchema: z.object({
            level: z.number().min(1).max(5).describe('1=Basic HTML, 3=React/Node, 5=AI/Blockchain'),
            reason: z.string().describe('Short punchy reason (e.g. "Requires complex API integration")'),
        }),
        execute: async ({ level, reason }) => {
            logger.info({ level, reason }, '[TOOL CALL] setComplexity');
            return { level, reason, updated: true };
        },
    }),
    getPricing: tool({
        description: 'Get the current J Star pricing tiers.',
        inputSchema: z.object({}),
        execute: async () => {
            logger.info('Fetching pricing tiers', '[TOOL CALL] getPricing');
            return {
                basic: "₦120,000",
                standard: "₦200,000",
                premium: "₦320,000"
            };
        }
    }),
    measureConviction: tool({
        description: 'Internal tool to track user interest (0-100). Call this when user shows interest or hesitation.',
        inputSchema: z.object({
            score: z.number().min(0).max(100).describe('Estimated conviction score based on user sentiment'),
            reason: z.string().describe('Why you gave this score'),
        }),
        execute: async ({ score, reason }) => {
            logger.info({ score, reason }, '[TOOL CALL] measureConviction');
            return { score, reason, tracked: true };
        }
    }),
    requestContactInfo: tool({
        description: `MANDATORY tool to collect user's WhatsApp number.
TRIGGER: When user agrees to a topic and seems ready to proceed.
SYNTAX: requestContactInfo({ reason: "To send the architecture specs" })
POSITIVE: User says "ok let's do this" → Call requestContactInfo.
NEGATIVE: Never say "drop your WhatsApp" or "send me your number" in plain text. You MUST use this tool.`,
        inputSchema: z.object({
            reason: z.string().describe('Context for asking (e.g. "To send architecture")'),
        }),
        execute: async ({ reason }) => {
            logger.info({ reason }, '[TOOL CALL] requestContactInfo');
            return { reason, requesting: true };
        }
    }),
    confirmTopic: tool({
        description: `MANDATORY tool to finalize the topic after getting WhatsApp.
TRIGGER: After user provides their phone number (e.g. "08012345678").
SYNTAX: confirmTopic({ topic: "Project Title", twist: "The unique angle" })
POSITIVE: User shares phone → Call confirmTopic with the agreed topic.
NEGATIVE: Never end conversation or say "we're done" without calling this tool.`,
        inputSchema: z.object({
            topic: z.string().describe('The confirmed project topic title'),
            twist: z.string().describe('The unique angle/twist'),
        }),
        execute: async ({ topic, twist }) => {
            logger.info({ topic, twist }, '[TOOL CALL] confirmTopic');
            return { topic, twist, confirmed: true };
        }
    })
};
