---
tags:
- '#ai-assistance'
- '#ai-concepts'
- '#ai-workflow'
- '#content-creation'
- '#content-strategy'
- '#creative-workflow'
- '#education'
- '#film-making'
- '#filmmaking'
- '#filmmaking-workflow'
- '#research-compilation'
- '#structured-notes'
- '#template'
- '#tutorial'
- '#workflow'
---
ai_processed: true
---

> [!NOTE]
> **Implementation Status**: This prompt is integrated into the `POST /api/documents/[id]/extract` endpoint using `openai/gpt-oss-120b` for automatic research synthesis.

**Option 1 (Concise & Effective):**

> As an AI research assistant, for each research paper in the provided text, extract and summarize the following:
>
> 1.  **Paper Title**
> 2.  **Authors**
> 3.  **Publication Year**
> 4.  **Objective(s)**
> 5.  **Motivation(s)**
> 6.  **Methodology**
> 7.  **Contribution(s)**
> 8.  **Limitation(s)**
>
> Present this information sequentially for each paper using the *exact* structured format below. Summaries should be concise. Infer information if clear, and state '[Detail not found]' (e.g., '[Year not found in text]') if genuinely missing.
>
> **"Paper Title Extracted From Text"**
> Authors: [List of Authors]
> Year: [Publication Year]
>
> Objective:
> *   [Summary]
> Motivation:
> *   [Summary]
> Methodology:
> *   [Summary]
> Contribution:
> *   [Summary]
> Limitations:
> *   [Summary]