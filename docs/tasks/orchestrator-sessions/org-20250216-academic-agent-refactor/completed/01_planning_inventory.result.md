# Inventory Results

## 1. Tool Definitions
| Tool Name | Input Schema | Return Type | Dependencies | Special Notes |
|-----------|--------------|-------------|--------------|---------------|
| `searchProjectDocuments` | `{ query: string }` | String | `GeminiFileSearchService`, `prisma` | Returns search results with sources formatted as string. Uses `GeminiFileSearchService.generateWithGrounding`. |
| `suggestEdit` | `{ chapterNumber: number, currentContentToReplace: string, newContent: string, explanation: string }` | Object | None | Returns structured object for UI to render. |
| `generateDiagram` | `{ title: string, type: enum, description: string, relevantContext: optional string, explanation: string }` | Object | `diagramService` | Delegates to `diagramService.generateDiagramCode`. Returns structured object. |
| `saveUserContext` | `{ department?: string, course?: string, institution?: string }` | String | `prisma` | Updates project context. |
| `getChapterGuidelines` | `{ chapterNumber: number }` | String | `getChapterSpecificPrompt` | Returns guidelines string. |
| `listChapters` | `{}` | String | `ChapterService` | Returns JSON string of chapters + instructions. |
| `loadChapter` | `{ chapterNumber: number }` | String | `ChapterService` | Returns preview string + instructions. |
| `addChapter` | `{ number: number, title: string, initialContent?: string }` | String | `ChapterService` | Returns success message string. |
| `generateChapterOutline` | `{ focus?: string }` | String | `ChapterService` | Returns JSON string of outline + instructions. |
| `generateSection` | `{ chapterNumber: number, sectionTitle: string, content?: string, instructions?: string, context?: string }` | Object | `ChapterService`, `generateText` (AI SDK), `SimpleMutex` | **CRITICAL**: Uses a mutex lock for sequential execution. Supports "Direct Mode" (save content) and "Agentic Mode" (generate content). Saves to DB. |

## 2. API Route Flow
1.  **Request Parsing**: Extracts `projectId`, `messages`, `threadId`, `contextScope` from request body.
2.  **Thread Resolution**: Finds existing thread or creates a new one using `prisma.projectConversation`.
3.  **Context Building**: Uses `ProjectContextService.buildContext` to fetch chapters and research summaries based on `contextScope`.
4.  **System Prompt Construction**: Combines `MONJI_SYSTEM_PROMPT`, academic rules, project context, and research summaries.
5.  **Model Selection**: Uses `selectModel` (defaulting to reasoning models).
6.  **Tool Creation**: Calls `createAcademicTools`.
7.  **Streaming Response**: Uses `streamText` from `ai` SDK.
    *   **Reasoning Config**: Passes `providerOptions` for OpenRouter reasoning models.
    *   **onFinish**:
        *   Saves user message to DB.
        *   Extracts reasoning text.
        *   Extracts tool invocations (from `steps`).
        *   Saves assistant message to DB with content, reasoning, and tool invocations.
8.  **Response**: Returns `toUIMessageStreamResponse` with headers.

## 3. Frontend Components
### `AcademicCopilot.tsx`
*   **State**: Manages `activeThreadId`, `suggestion`, `diagramSuggestion`.
*   **Chat Hook**: Uses `useChat` with a stable ID.
*   **Tool Handling**:
    *   Scans `messages` for `tool-suggestEdit` and `tool-generateDiagram` parts (SDK v6).
    *   Also checks legacy `toolInvocations`.
    *   Sets state to show suggestion cards.
*   **Rendering**: Renders `AcademicMessageBubble`.
*   **Callbacks**: `onApplyEdit`, `onInsertDiagram`, `onToolCompleted` (triggers refresh for mutation tools).

### `AcademicMessageBubble.tsx`
*   **Reasoning**: Displays reasoning in an accordion (`ReasoningAccordion`).
*   **Tool Status**: Shows indicators for running tools (`ToolStatusIndicator`).
*   **Tool Results**: Uses `ToolResultCard` for most tools.
*   **Content**: Renders Markdown.

### `ToolResultCard.tsx`
*   **Specific Renderers**: `loadChapter`, `listChapters`, `searchProjectDocuments`, `generateSection`, `saveUserContext`.
*   **Fallback**: JSON stringify or text cleaning.

### Suggestion Cards
*   `EditSuggestionCard`: Preview/Edit/Apply workflow.
*   `DiagramSuggestionCard`: Preview/Save/Insert workflow using `DiagramPreview`.

## 4. Services Used
*   `ChapterService`: CRUD operations for chapters, outline generation.
*   `ProjectContextService`: Context building for chat.
*   `GeminiFileSearchService`: Document search with grounding.
*   `diagramService`: Mermaid code generation.
*   `prisma`: Database access for threads and messages.

## 5. Potential Issues
*   **Tool Return Types**: Mixed return types (strings vs objects). New agent should standardize this.
*   **Mutex Logic**: `generateSection` has a custom mutex. We need to ensure this behavior is preserved or handled by the new agent loop if it supports sequential execution.
*   **Reasoning Extraction**: Current extraction logic checks multiple fields (`text`, `reasoning`, `content`). Standardizing on SDK v6 `reasoning` part is preferred.
*   **Thread Race Conditions**: Frontend has complex logic to handle thread creation and URL updates to avoid race conditions.

## 6. Migration Complexity
*   **Tools**: Moderate. Need to refactor to pure `zod` schemas and cleaner return types (removing system prompts from returns). `generateSection` is the most complex due to the mutex and hybrid mode.
*   **Agent**: High. Need to construct `ToolLoopAgent` with proper type definitions.
*   **API Route**: Moderate. Mostly cleanup and switching to the new agent.
*   **Frontend**: Low/Moderate. `AcademicCopilot` needs to be updated to use the new typed messages, but the UI components are largely decoupled.
