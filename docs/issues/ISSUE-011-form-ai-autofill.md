---
title: "[Feature] Agency Form AI Auto-Fill"
labels: frontend, ai, enhancement
---

## User Story

As a user filling the agency form, I want AI to suggest complexity and twist, so that my lead is pre-qualified and I get better service.

## Proposed Solution

### New Form Fields

1. **Complexity** (1-5 visual selector) - Auto-filled, editable
2. **Suggested Twist** (text input) - Auto-filled, editable  
3. **Notes** (textarea) - Optional, manual entry

### Behavior

1. User enters Topic + Department
2. On topic blur (debounced 500ms), call `/api/analyze-topic`
3. Auto-fill complexity + twist fields
4. Show subtle loading indicator during analysis
5. User can override any AI suggestions

### File to Modify
`src/features/agency/components/AgencySignupForm.tsx`

### Implementation

```tsx
// Add to form state
const [formData, setFormData] = useState({
  // ... existing
  complexity: 3,
  twist: '',
  notes: '',
});

const [isAnalyzing, setIsAnalyzing] = useState(false);

// Debounced analysis
const analyzeTopicDebounced = useDebouncedCallback(async () => {
  if (!formData.topic || !formData.department) return;
  
  setIsAnalyzing(true);
  try {
    const res = await fetch('/api/analyze-topic', {
      method: 'POST',
      body: JSON.stringify({ 
        topic: formData.topic, 
        department: formData.department 
      }),
    });
    const data = await res.json();
    setFormData(prev => ({
      ...prev,
      complexity: data.complexity,
      twist: data.suggestedTwist,
    }));
  } catch (e) {
    // Silent fail, user can fill manually
  } finally {
    setIsAnalyzing(false);
  }
}, 500);

// Trigger on topic change
useEffect(() => {
  if (formData.topic.length > 10) {
    analyzeTopicDebounced();
  }
}, [formData.topic, formData.department]);
```

### UI Components

```tsx
{/* Complexity Selector */}
<div className="flex gap-2">
  {[1,2,3,4,5].map(n => (
    <button
      key={n}
      type="button"
      onClick={() => setFormData(p => ({...p, complexity: n}))}
      className={`w-10 h-10 rounded-lg ${
        formData.complexity >= n ? 'bg-primary' : 'bg-white/10'
      }`}
    >
      {n}
    </button>
  ))}
  {isAnalyzing && <Loader2 className="animate-spin" />}
</div>

{/* Twist Input */}
<input
  name="twist"
  value={formData.twist}
  onChange={handleChange}
  placeholder="AI will suggest a twist..."
/>

{/* Notes */}
<textarea
  name="notes"
  value={formData.notes}
  onChange={handleChange}
  placeholder="Any additional notes..."
/>
```

## Acceptance Criteria

- [x] Complexity selector (1-5) added to form
- [x] Twist field (text) added to form  
- [x] Notes field (textarea) added to form
- [x] Auto-analyze triggers on topic blur (debounced 500ms/800ms)
- [x] Loading indicator during analysis
- [x] User can override AI suggestions
- [x] Form still works if AI fails (graceful degradation)
- [x] All new fields passed to agencySignupAction

## Implementation Status
**Status:** ✅ Completed
**Method:** Implemented in `src/features/agency/components/AgencySignupForm.tsx`. Uses `use-debounce` (800ms) and connects to `/api/analyze-topic`. AI suggestions populate form state which can be overridden.

## Dependencies

- Issue #63 (AI Topic Analyzer Endpoint)
- `use-debounce` package (or implement manually)
