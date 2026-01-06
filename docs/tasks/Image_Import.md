# 🎯 Task: Image Import & Resizing

**Objective:** Implement a robust image handling system allowing users to import images from local devices or web URLs, resize them, and embed them into the Chapter Editor.
**Priority:** High
**Scope:** Frontend (Dialogs, Editor Integration) and Backend (Upload API, Serving).

---

## 📋 Requirements

### Functional Requirements
- **[REQ-001]** Users can upload images from their local device (Computer or Phone).
- **[REQ-002]** Users can import images via a valid web URL.
- **[REQ-003]** Users can specify dimensions (Width/Height) for the image before insertion.
- **[REQ-004]** Images are inserted into the Markdown editor as HTML (`<img src="..." width="..." />`) to support resizing, or standard Markdown if no size is set.
- **[REQ-005]** The feature works seamlessly on both Desktop (`WritingCanvas`) and Mobile (`SectionEditor`).

### Technical Requirements
- **[TECH-001]** Extend `api/documents/upload` or create `api/uploads` to accept `image/jpeg`, `image/png`, `image/webp`, `image/gif`.
- **[TECH-002]** Ensure uploaded images are served efficiently via `api/documents/[id]/serve` or similar.
- **[TECH-003]** File size limit: 5MB for images.
- **[TECH-004]** Secure filename sanitization (already present, verify for images).

---

## 🏗️ Implementation Plan

### Phase 1: Backend & API
- [ ] Create/Update `src/app/api/uploads/route.ts` (or modify `documents/upload`) to handle image MIME types.
- [ ] Ensure `src/app/api/documents/[id]/serve/route.ts` correctly serves image headers (content-type).

### Phase 2: UI Components
- [ ] Create `src/features/builder/components/v2/ImagePickerDialog.tsx`.
  - Tabs: "Upload" (File Picker), "Web" (URL Input).
  - Preview area.
  - "Size" controls (Width/Height inputs, optional "Maintain Aspect Ratio").
  - "Insert" button.

### Phase 3: Editor Integration
- [ ] Update `WritingCanvas.tsx` (Desktop):
  - Replace `insertFormatting('image')` immediate logic with opening `ImagePickerDialog`.
  - Handle result: Insert HTML/Markdown at cursor.
- [ ] Update `SectionEditor.tsx` (Mobile):
  - Pass `onImageClick` prop (similar to `onEnhanceClick`) or handle locally if Dialog is shared.
  - Open `ImagePickerDialog` (responsive modal).

### Phase 4: Testing
- [ ] Verify Mobile Upload (iOS/Android file picker).
- [ ] Verify Desktop Upload.
- [ ] Verify URL Import.
- [ ] Verify Resizing renders correctly in Preview/Export.

---

## 📁 Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/features/builder/components/v2/ImagePickerDialog.tsx` | Create | The main UI for handling imports. |
| `src/app/api/documents/upload/route.ts` | Modify | Allow image MIME types. |
| `src/features/builder/components/v2/WritingCanvas.tsx` | Modify | wire up new dialog. |
| `src/features/builder/components/v2/SectionEditor.tsx` | Modify | wire up new dialog. |

---

## ✅ Success Criteria

- [ ] "Image" button opens a dialog instead of inserting placeholder text.
- [ ] User can see a preview of what they are inserting.
- [ ] Markdown content reflects the chosen size (e.g. `<img width="300" ... />`).
- [ ] Images load correctly in the editor preview.

---

## 🚀 Getting Started

1. Check `src/app/api/documents/upload/route.ts` and add Image MIME types to validation.
2. Build the `ImagePickerDialog` component.
3. Hook it up!
