# PDF Search Highlighting

## Goal
Implement visible, robust search highlighting in the `DocumentViewerModal` PDF viewer.

## Problem
The current implementation using `react-pdf`'s `customTextRenderer` results in invisible highlights. This is likely due to CSS stacking contexts, transparency inheritance, or `TextLayer` rendering specifics in `react-pdf`.

## Solutions

### Strategy A: CSS Override (Preferred)
Force visibility of the highlight `mark` element within the `TextLayer`.
- Ensure `z-index` is high.
- Ensure `mix-blend-mode` is compatible or removed.
- Use `!important` on background colors to override any potentially conflicting library styles.
- Verify `opacity` inheritance.

### Strategy B: dedicated Highlight Layer (Fallback)
If Strategy A fails, we will implement an overlay layer.
- **Components**: `HighlightOverlay` component rendered on top of `Page`.
- **Logic**: 
    - Use `pdf.js` `getTextContent` to retrieve text items.
    - Match user query against items.
    - **Geometry**: Retrieve `transform` (matrix) and `width`/`height` from `TextItem`.
    - **Positioning**: Render absolute `div`s using the calculated geometry.
    - **Complexity**: High. Requires manual substring width calculation or bounding box approximation.

## Implementation Details (Strategy A)
Modify `textRenderer` in `DocumentViewerModal.tsx`:
- Use a `span` instead of `mark` (or style `mark` aggressively).
- Apply:
    ```css
    backgroundColor: 'yellow',
    color: 'transparent', // Maintain transparent text for selection
    position: 'relative',
    zIndex: 10,
    mixBlendMode: 'normal' // specific test
    ```

## Implementation Details (Strategy B)
- **Files**: `DocumentViewerModal.tsx`
- **New Component**: `SearchHighlights.tsx` (internal or separate)
- **Math**:
    ```javascript
    const tx = item.transform; // [scaleX, skewY, skewX, scaleY, x, y]
    // Map to viewport
    const viewport = page.getViewport({ scale: currentScale });
    const [px, py] = viewport.convertToViewportPoint(tx[4], tx[5]);
    ```

## Components
- `DocumentViewerModal.tsx`: Main integration point.
