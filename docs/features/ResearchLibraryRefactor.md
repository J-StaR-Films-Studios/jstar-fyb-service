# Research Library Refactor

## Goal
Restore the inline document upload UI with loading states within the Research Library panel and fix the Document Viewer for newly uploaded/processed files.

## Analysis of Current State
1. **Upload UI**: Currently uses `DirectUploadWrapper` which hides the upload process behind a native file input and relies exclusively on `sonner` toast notifications. The old inline UI (`UploadDocumentForm.tsx`) was deleted.
2. **Document Viewer**: The "View" button in `ResearchDocumentItem.tsx` strictly requires `doc.status === 'PROCESSED'`. If a newly uploaded document stays in `PENDING` or `PROCESSING` state without realtime updates, the user cannot view it. Furthermore, if the processing fails or is slow, the viewer is disconnected.

## Proposed Changes

### 1. Restore Inline Upload UI
- Implement an `uploadingFiles` state in `FloatingResearchPanel.tsx` to track files currently being uploaded.
- Render an inline "Uploading..." card at the top of the document list (especially in the "All" and "Uploaded" tabs) showing the filename and a loading spinner.
- Replace `DirectUploadWrapper` with a custom upload handler function within the component or a dedicated hook that updates the local inline state instead of just relying on toasts.

### 2. Fix Document Viewer disconnected state
- Update `ResearchDocumentItem.tsx` to either relax the `PROCESSED` strict check for viewing raw PDFs (if they are already uploaded to storage before processing completes) OR ensure the UI reflects the real-time processing status (e.g., polling or optimistic UI updates).
- Verify the `/api/documents/[id]/serve` route handles newly uploaded doc IDs correctly.

## Components
- **Client Components**: 
  - `FloatingResearchPanel.tsx` (Modified to handle inline upload state)
  - `ResearchDocumentItem.tsx` (Modified to adjust "View" button visibility)
  - `DocumentViewerModal.tsx` (Verify error handling and loading states)
- **Server Components/API**: No major changes expected unless the serve logic is broken for `PENDING` files.

## Data Flow
1. User clicks "Upload Document".
2. File is selected and immediately added to a local `uploadingDocs` state array in the panel.
3. Panel displays the inline processing card.
4. File is POSTed to `/api/documents/upload`.
5. On success, the local state is cleared and `fetchDocuments()` is called to retrieve the updated list from the server.
