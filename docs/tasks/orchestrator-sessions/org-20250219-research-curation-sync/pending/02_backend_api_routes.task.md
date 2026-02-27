# Task: Create Search & Save API Routes

**Session ID:** org-20250219-research-curation-sync
**Source:** Orchestrator
**Priority:** P0
**Dependencies:** Task 01 (`01_backend_service_split.task.md`) must be completed first
**Created At:** 2026-02-19T01:00:00+01:00

---

## 📋 Objective

Create two new API routes:
1. `/api/research/search` — runs hybrid search, streams progress, returns raw results (no DB save)
2. `/api/research/save` — accepts selected papers/sources and saves them to DB

## 🎯 Files to Create

### File 1: `src/app/api/research/search/route.ts` [NEW]

This route is based on the **existing** `/api/research/execute/route.ts` (79 lines). The key difference: it calls `ResearchService.searchOnly()` instead of `executeHybridResearch()` and includes the raw results in the final streamed line.

**Reference the existing execute route at:** `src/app/api/research/execute/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';
import { ResearchService, ResearchProgress } from '@/features/research/services/researchService';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { projectId, queries, deepGoal } = body;

    if (!projectId) {
      return new NextResponse('Project ID required', { status: 400 });
    }

    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return new NextResponse('Queries array required', { status: 400 });
    }

    if (!deepGoal) {
      return new NextResponse('Deep goal (research topic) required', { status: 400 });
    }

    // Sentinel: Prevent IDOR by verifying project ownership
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true }
    });

    if (!project) {
      return new NextResponse('Project not found', { status: 404 });
    }

    const isAdmin = (user as { role?: string }).role === 'ADMIN';
    if (project.userId !== user.id && !isAdmin) {
      return new NextResponse('Forbidden: Access denied', { status: 403 });
    }

    // Create Streaming Response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendUpdate = (step: string, message: string, details?: any) => {
          const data = JSON.stringify({ step, message, details });
          controller.enqueue(encoder.encode(data + '\n'));
        };

        const onProgress = (p: ResearchProgress) => {
          sendUpdate(p.step, p.message, p.details);
        };

        try {
          // KEY DIFFERENCE: searchOnly() returns results instead of saving
          const results = await ResearchService.searchOnly(projectId, queries, deepGoal, onProgress);

          // Send the raw results as the final line with a special step
          const resultData = JSON.stringify({
            step: 'results',
            message: 'Search results ready for curation',
            results: {
              academic: results.academic,
              web: results.web
            }
          });
          controller.enqueue(encoder.encode(resultData + '\n'));

        } catch (error: any) {
          sendUpdate('failed', error.message || 'Search failed');
        } finally {
          controller.close();
        }
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('[API] Research/Search Error:', error);
    return new NextResponse(error.message || 'Internal Error', { status: 500 });
  }
}
```

### File 2: `src/app/api/research/save/route.ts` [NEW]

This route accepts selected papers and web sources and saves them to DB.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-server';
import { ResearchService } from '@/features/research/services/researchService';
import { SemanticScholarPaper } from '@/features/research/services/semanticScholarService';
import { GroundedWebSource } from '@/features/research/services/geminiService';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, selectedPapers, selectedWebSources } = body as {
      projectId: string;
      selectedPapers: SemanticScholarPaper[];
      selectedWebSources: GroundedWebSource[];
    };

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    if (!selectedPapers && !selectedWebSources) {
      return NextResponse.json({ error: 'No papers or sources selected' }, { status: 400 });
    }

    // Sentinel: Prevent IDOR
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const isAdmin = (user as { role?: string }).role === 'ADMIN';
    if (project.userId !== user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const savedCount = await ResearchService.saveSelected(
      projectId,
      selectedPapers || [],
      selectedWebSources || []
    );

    return NextResponse.json({
      success: true,
      savedCount,
      message: `Saved ${savedCount} documents to your Research Library`
    });

  } catch (error: any) {
    console.error('[API] Research/Save Error:', error);
    return NextResponse.json({ error: error.message || 'Save failed' }, { status: 500 });
  }
}
```

## 🚫 Constraints

- Both routes MUST include auth check (`getCurrentUser()`) and IDOR prevention (project ownership)
- The search route MUST stream progress just like the existing execute route
- The search route sends a **final line** with `step: 'results'` containing the full results array
- The save route is a simple JSON POST/response (no streaming needed)
- Do NOT modify the existing `/api/research/execute/route.ts`

## ✅ Definition of Done

- [ ] `/api/research/search/route.ts` created — streams progress + returns raw results
- [ ] `/api/research/save/route.ts` created — saves selected papers to DB
- [ ] Both routes have auth + IDOR checks
- [ ] `npx tsc --noEmit` passes

---

*Generated by /mode-orchestrator*
