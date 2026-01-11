import { ResearchProgress } from "@/features/research/services/researchService";

export interface ResearchPlan {
    core_problem_queries: string[];
    technical_queries: string[];
    context_queries: string[];
}

export class ResearchClient {
    /**
     * Generate a research plan (Standard Mode)
     */
    static async generatePlan(projectId: string): Promise<ResearchPlan> {
        const response = await fetch('/api/research/plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId })
        });

        if (!response.ok) {
            throw new Error(`Plan generation failed: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Execute Research (Standard or Deep) with streaming progress
     */
    static async executeResearch(
        projectId: string,
        mode: 'standard' | 'deep',
        params: { queries?: string[], deepGoal?: string },
        onProgress: (progress: ResearchProgress) => void
    ): Promise<void> {
        const response = await fetch('/api/research/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projectId,
                mode,
                queries: params.queries,
                deepGoal: params.deepGoal
            })
        });

        if (!response.ok) {
            throw new Error(`Execution failed: ${response.statusText}`);
        }

        if (!response.body) return;

        // Handle Streaming Response (NDJSON-like or just lines)
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process lines
            const lines = buffer.split('\n');
            // Keep the last partial line in buffer
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const progress = JSON.parse(line);
                    onProgress(progress);
                } catch (e) {
                    console.warn('Failed to parse progress update:', line);
                }
            }
        }
    }
}
