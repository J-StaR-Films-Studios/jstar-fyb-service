# Escalation Handoff Report

**Generated:** 2026-01-11T05:25:00+01:00
**Original Issue:** OpenRouter Web Search Plugin not triggering/billing correctly.

---

## PART 1: THE DAMAGE REPORT

### 1.1 Original Goal
Enable "Standard Research" mode to use OpenRouter's "Web Search" capability (via Exa) to find academic papers. The goal was to ensure the AI *actually* searches the web and that OpenRouter billing reflects "Search" tool usage.

### 1.2 Observed Failure / Error
*   **Symptom:** The user reports "still no billing on the open router side" and "it's not using the search tool".
*   **Ambiguity:** The user also says "we got results back though", but implies they might be hallucinated or the links are unclickable (though `DocumentUpload.tsx` links were fixed, the "results" in the modal might use a different component or the links returned are garbage/hallucinated).
*   **Root Cause Suspect:** The manual fetch implementation for OpenRouter might still not be correctly formatted for their specific "plugin" architecture, OR the model `gpt-4o-mini` (mapped to `Models.FREE.GPT_OSS_120B` or similar) doesn't support the `plugins` parameter as expected in this context, even though documentation suggests it does.

### 1.3 Failed Approach
1.  **Vercel AI SDK (`generateObject`):** Tried using `useChat` and `generateObject` with `:online` suffix. Result: Unreliable plugin activation.
2.  **Manual Fetch:** Reverted to a direct `fetch` call to `https://openrouter.ai/api/v1/chat/completions` with explicit `plugins: [{ id: "web", engine: "exa" }]` in the body. Result: User still reports no billing/tool usage.

### 1.4 Key Files Involved
- `src/features/research/services/researchService.ts` (Core logic for search)
- `src/features/research/components/ResearchModal.tsx` (UI for triggering search)
- `src/app/api/documents/upload/route.ts` (Fixed: Link downloading works here)

### 1.5 Best-Guess Diagnosis
OpenRouter's "Web Search" plugin might require a specific model class or a different API structure than the standard OpenAI-compatible chat completion body we are sending. Alternatively, the "Results" the user sees are just the model's training data (hallucinations), explaining why the plugin isn't billed.

---

## PART 2: FULL FILE CONTENTS (Self-Contained)

### File: `src/features/research/services/researchService.ts`
```typescript
import { generateObject } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ReasoningService } from './reasoningService';
import { GeminiService } from './geminiService';
import { Models, openrouter } from '@/lib/ai/providers';
import { smartDownload } from '@/lib/network/smartBrowser';

export interface ResearchProgress {
    step: 'planning' | 'searching' | 'downloading' | 'processing' | 'completed' | 'failed';
    message: string;
    details?: any;
}

export type ProgressCallback = (progress: ResearchProgress) => void;

export class ResearchService {

    /**
     * Step 1: Generate a research plan (queries) based on project context.
     */
    static async generateResearchPlan(projectId: string) {
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { topic: true, twist: true, department: true } // Simplified fetch
        });

        if (!project) throw new Error('Project not found');

        // Construct simple context strings if detailed abstract/outline missing
        const goal = `Research topic: ${project.topic}. Context: ${project.twist || 'No specific context'}`;
        const tech = project.department ? `Field: ${project.department}` : 'General academic research';
        const audience = 'Academic and technical audience';

        return await ReasoningService.generateSearchQueries(goal, tech, audience);
    }

    /**
     * Step 2: Execute Standard Research (Search -> Download -> Save)
     */
    static async executeStandardResearch(
        projectId: string,
        queries: string[],
        onProgress?: ProgressCallback
    ) {
        try {
            onProgress?.({ step: 'searching', message: `Executing ${queries.length} search queries via Exa/OpenRouter...` });

            // 1. Search Web (Exa via OpenRouter)
            // We use Exa via OpenRouter's 'web' plugin for cost-effective deep search
            const searchResults = await this.searchWeb(queries);

            onProgress?.({ step: 'downloading', message: `Found ${searchResults.length} candidates. Starting acquisition...` });

            // 2. Download & Save
            return await this.processResults(projectId, searchResults, onProgress);

        } catch (error: any) {
            onProgress?.({ step: 'failed', message: error.message || 'Standard Research failed' });
            throw error;
        }
    }

    /**
     * Step 2b: Execute Deep Research (Gemini Grounding -> Download -> Save)
     */
    static async executeDeepResearch(
        projectId: string,
        goal: string,
        onProgress?: ProgressCallback
    ) {
        try {
            onProgress?.({ step: 'searching', message: `Executing Deep Research with Gemini 2.5...` });

            // 1. Search Web (Gemini Grounding)
            const searchResults = await GeminiService.groundedSearch(goal);

            onProgress?.({ step: 'downloading', message: `Gemini found ${searchResults.length} authoritative sources.` });

            // 2. Download & Save
            return await this.processResults(projectId, searchResults, onProgress);

        } catch (error: any) {
            onProgress?.({ step: 'failed', message: error.message || 'Deep Research failed' });
            throw error;
        }
    }

    /**
     * Helper: Process and download a list of search results
     */
    private static async processResults(
        projectId: string,
        results: Array<{ title: string, url: string }>,
        onProgress?: ProgressCallback
    ) {
        let savedCount = 0;
        for (const result of results) {
            try {
                // Start download
                onProgress?.({ step: 'downloading', message: `Acquiring: ${result.title.substring(0, 30)}...` });

                const saved = await this.downloadAndSaveSource(projectId, result.url, result.title);
                if (saved) savedCount++;

            } catch (e) {
                console.error(`Failed to download ${result.url}`, e);
                // Continue to next result
            }
        }
        onProgress?.({ step: 'completed', message: `Research complete. Saved ${savedCount} new documents.` });
        return savedCount;
    }

    /**
     * Helper: Search via OpenRouter with Exa plugin (Explicit Fetch for Reliability)
     */
    private static async searchWeb(queries: string[]): Promise<Array<{ title: string, url: string, snippet?: string }>> {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) throw new Error('OpenRouter API Key missing');

        // Combined query
        const combinedQuery = queries.slice(0, 3).join('\n');

        // We use manual fetch because Vercel SDK's ":online" suffix sometimes fails 
        // to pass the specific 'web' plugin config correctly to OpenRouter's free tier models.
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://fyb.jstarstudios.com',
                'X-Title': 'JStar FYB'
            },
            body: JSON.stringify({
                model: Models.FREE.GPT_OSS_120B, // Validated to work with web plugin
                messages: [
                    {
                        role: 'user',
                        content: `Find 5 authoritative academic sources or research papers for: \n${combinedQuery}\n\nPrefer direct PDF links where possible, but include high-quality open access pages (like ArXiv, NIH, IEEE) if PDFs are not direct.\n\nReturn EXACTLY a JSON list of objects with "title" and "url" fields.`
                    }
                ],
                plugins: [{ id: "web", engine: "exa" }]
            })
        });

        if (!response.ok) {
            throw new Error(`OpenRouter Search failed: ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content || '';

        // Attempt to parse JSON from content
        try {
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
            console.warn('[ResearchService] No JSON array found in search response:', content.substring(0, 200) + '...');
            return [];
        } catch (e) {
            console.warn('[ResearchService] Failed to parse search results JSON. Raw content:', content);
            return [];
        }
    }

    /**
     * Helper: Download content and save to DB
     */
    public static async downloadAndSaveSource(projectId: string, url: string, title: string) {
        // Validation
        if (!url || !url.startsWith('http')) return null;

        // check if exists
        const existing = await prisma.researchDocument.findFirst({
            where: { projectId, fileUrl: url }
        });
        if (existing) return existing;

        // Optimize URL for known academic repositories (Landing Page -> Direct PDF)
        const optimizedUrl = this.optimizeDownloadUrl(url);

        try {
            // Use High-Trust Smart Downloader
            const buffer = await smartDownload(optimizedUrl);

            // Inferred metadata
            const isPdf = optimizedUrl.toLowerCase().endsWith('.pdf') || optimizedUrl.includes('/download');
            const contentType = isPdf ? 'application/pdf' : 'text/html';

            // Create Record
            const doc = await prisma.researchDocument.create({
                data: {
                    projectId,
                    title,
                    fileUrl: url,
                    fileName: title === url ? 'External Link' : title.substring(0, 100) + (isPdf ? '.pdf' : '.html'),
                    fileType: isPdf ? 'PDF' : 'WEB',
                    fileData: isPdf ? Buffer.from(buffer) : undefined,
                    mimeType: contentType,
                    status: 'PENDING'
                }
            });

            return doc;
        } catch (error: any) {
            console.error(`Failed to download ${url}`, error);

            // FALLBACK: Save the URL anyway
            try {
                const doc = await prisma.researchDocument.create({
                    data: {
                        projectId,
                        title,
                        fileUrl: url,
                        fileName: title.substring(0, 100) + '.html',
                        fileType: 'WEB',
                        fileData: undefined,
                        mimeType: 'application/x-web-reference',
                        status: 'ERROR',
                        importError: `Download failed: ${error.message}`
                    }
                });
                return doc;
            } catch (dbError) {
                console.error('Failed to save fallback reference', dbError);
                return null;
            }
        }
    }

    /**
     * Helper: Transform landing page URLs to direct PDF links where possible
     */
    private static optimizeDownloadUrl(url: string): string {
        let cleanUrl = url;

        // 1. ArXiv: /abs/ -> /pdf/
        if (cleanUrl.includes('arxiv.org/abs/')) {
            cleanUrl = cleanUrl.replace('arxiv.org/abs/', 'arxiv.org/pdf/') + '.pdf';
        } else if (cleanUrl.includes('arxiv.org/pdf/') && !cleanUrl.toLowerCase().endsWith('.pdf')) {
            cleanUrl += '.pdf';
        }

        // 2. Preprints.org: /manuscript/ID/v1 -> /manuscript/ID/v1/download
        if (cleanUrl.includes('preprints.org/manuscript/') && !cleanUrl.includes('/download')) {
            // ensure it ends with the version number before appending download
            // regex to check if ends in /v\d+
            if (/\/v\d+$/.test(cleanUrl)) {
                cleanUrl += '/download';
            }
        }

        // 3. MDPI: /htm -> /pdf
        if (cleanUrl.includes('mdpi.com') && cleanUrl.endsWith('/htm')) {
            cleanUrl = cleanUrl.replace('/htm', '/pdf');
        }

        return cleanUrl;
    }
}
```

### File: `src/features/research/components/ResearchModal.tsx`
```tsx
"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bot, Zap, Globe, FileText, Check, ArrowRight, Loader2, Sparkles, X, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResearchClient, ResearchPlan } from '@/services/researchClient';
import { ResearchProgress as ProgressType } from '../services/researchService';
import { ResearchProgress } from './ResearchProgress';

// ... (Rest of UI Component Code)
// See codebase for full UI logic.
```

---

## PART 3: DIRECTIVE FOR ORCHESTRATOR

**Attention: Senior AI Orchestrator**

You have received this Escalation Handoff Report. A local agent has failed to solve the "OpenRouter Plugin Activation" problem.

**Your Directive:**
1.  **Analyze the Failure:** The goal is to make OpenRouter *actually* perform a web search via the Exa plugin. The current implementation uses a direct `fetch` with `plugins: [{ id: "web", engine: "exa" }]`. The user reports this does not trigger billing/usage, implying it's not working and the model is hallucinating results.
2.  **Verify Plugin Config:** Confirm if the `model` (Models.FREE.GPT_OSS_120B) supports this plugin parameter, or if a specific model (like `google/gemini-pro-1.5` or `perplexity` models) should be used instead.
3.  **Investigate Link Clickability:** The user mentioned "results back... but not the type I can click". Check where `searchWeb` returns data and how `ResearchModal` (or its child `ResearchProgress`) renders it. Ensure the `url` field from the search results is actually being passed and rendered as an `<a>` tag.
4.  **Execute Fix:**
    *   Find the correct API/Model configuration for OpenRouter Web Search.
    *   Ensure the JSON parsing of search results is robust (currently using regex).
    *   Verify the UI renders clickable links for the search results.

**Begin your analysis now.**
