"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-server";
import { cookies } from "next/headers";
import { z } from "zod";
import { ProjectsService } from "@/services/projects.service";

const createProjectSchema = z.object({
    topic: z.string().min(1),
    twist: z.string().optional(),
    abstract: z.string().min(1)
});

// Helper to get or create anonymous ID
async function getAnonymousId(): Promise<string> {
    const cookieStore = await cookies();
    let anonymousId = cookieStore.get('anonymous_id')?.value;

    if (!anonymousId) {
        anonymousId = `anon_${crypto.randomUUID()}`;

        // Set cookie so we can identify this user later when they claim the project
        cookieStore.set('anonymous_id', anonymousId, {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 30 // 30 days
        });
    }
    return anonymousId;
}

export async function createProjectAction(input: z.infer<typeof createProjectSchema>) {
    try {
        const { topic, twist, abstract } = createProjectSchema.parse(input);

        // Get authenticated user (if any)
        const user = await getCurrentUser();

        // For anonymous users, use anonymousId
        const anonymousId = user ? null : await getAnonymousId();

        // Create the project using the service (enforces lock rules)
        // We need to import ProjectsService dynamically or at top level. 
        // Since this is "use server", top level import is fine if the service doesn't use client APIs.
        const project = await ProjectsService.createProject({
            topic,
            twist: twist || "",
            abstract,
            userId: user?.id || null,
            anonymousId: anonymousId,
        });

        return { success: true, projectId: project.id };
    } catch (error: any) {
        console.error("Failed to create project:", error);
        return { success: false, error: error.message || "Failed to create project" };
    }
}
