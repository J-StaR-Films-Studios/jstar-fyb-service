
export const COMMON_ACADEMIC_RULES = `
**I. GENERAL INSTRUCTIONS & WRITING STYLE:**

1.  **Sources & Referencing:**
    *   **Credibility:** Use peer-reviewed, credible academic sources (journals, conference proceedings). Avoid blogs.
    *   **Recency:** Prioritize sources from the last 5 years.
    *   **In-Text Citations:** Use APA style \`(Author, Year)\`. Do NOT include the paper title inline.
    *   **Tone:** Formal, objective, British English. No colloquialisms.
    *   **Formatting:** Justified text, standard academic headings.

2.  **Structure:**
    *   Use Markdown headings (\`##\`, \`###\`) for sections.
    *   Ensure logical flow between paragraphs.

3.  **Visuals & Diagrams (CRITICAL):**
    *   When a section requires a diagram (e.g., Architecture, Flowchart, Use Case), you have **TWO OPTIONS**:
        *   **OPTION A (Preferred):** Generate valid **Mermaid.js** code block.
            \`\`\`mermaid
            graph TD; A[Input] --> B[Process];
            \`\`\`
        *   **OPTION B (Fallback):** If you cannot generate the code, use this **EXACT** placeholder format:
            \`[Figure X.X: <Title> - <Detailed Description of exactly what should be drawn here using what tools>]\`
    *   **NEVER** refuse to generate a diagram. **NEVER** just describe it in a paragraph without using one of the above formats.
`;

export const getChapterSpecificPrompt = (chapterNumber: number, topic: string): string => {
    switch (chapterNumber) {
        case 1:
            return `
**CHAPTER ONE: INTRODUCTION**

**GOAL:** Establish the research context, problem, and objectives for the topic: "${topic}".

**REQUIRED SECTIONS:**
1.  **1.1 BACKGROUND OF THE STUDY:** Establish context and relevance.
2.  **1.2 MOTIVATION:** Identify gaps/limitations in existing work that drive this study.
3.  **1.3 AIM AND OBJECTIVES:**
    *   **Aim:** One concise sentence stating the primary goal.
    *   **Objectives:** A numbered list of SMART objectives (e.g., "To develop...", "To evaluate...").
4.  **1.4 METHODOLOGY (OVERVIEW):** Brief summary of the approach.
    *   **RECOMMENDED:** Include a **Methodology Flowchart** here to visualize the steps.
    *   *Format:* Use a \`mermaid\` flowchart OR the \`[Figure 1.1: Methodology Flowchart - ...]\` placeholder.
5.  **1.5 CONTRIBUTION TO KNOWLEDGE:** How this advances the field.

**RESTRICTIONS:**
*   **NO** Results or Conclusion here.
*   **NO** Reference list at the end (use inline citations only).
`;

        case 2:
            return `
**CHAPTER TWO: LITERATURE REVIEW**

**GOAL:** Critically analyze existing works related to "${topic}".

**REQUIRED SECTIONS:**
1.  **2.1 INTRODUCTION:** Brief scope of the review.
2.  **2.2 THEMATIC REVIEW:** Group related works by themes (e.g., "Methodologies", "Existing Systems").
    *   *Compare and Contrast* authors. Don't just list them.
3.  **2.3 CHALLENGES/GAPS:** Discuss common limitations in the field.
4.  **2.4 SUMMARY & GAPS:** Explicitly state what is missing in current literature and how this study fills it.

**RESTRICTIONS:**
*   **NO** description of *your* new system here (that's Ch3). Focus on *others'* work.
*   **NO** Reference list at the end.
`;

        case 3:
            return `
**CHAPTER THREE: METHODOLOGY / SYSTEM ANALYSIS**

**GOAL:** Detail the proposed solution or research framework for "${topic}".

**REQUIRED SECTIONS:**
1.  **3.1 OVERVIEW:** High-level description of the system/approach.
2.  **3.2 ARCHITECTURE/DESIGN:** System architecture, block diagrams, or research framework.
    *   **MANDATORY:** You **MUST** include a System Block Diagram or Architecture Diagram here.
    *   **USE MERMAID:** Generate a \`mermaid\` code block for the system architecture.
    *   *Alternative:* If complex to generate, use the \`[Figure 3.1: ...]\` placeholder format described in standard rules.
3.  **3.3 COMPONENTS/MODULES:** Detailed breakdown of specific modules (e.g., "Data Collection", "Algorithm Design").
4.  **3.4 TOOLS & TECHNOLOGIES:** Justify the choice of tools (e.g., React, Python, etc.).

**RESTRICTIONS:**
*   Use **Future Tense** if proposing, or **Past Tense** if describing what was built.
*   **NO** Results (save for Ch4).
*   **NO** Reference list at the end.
`;

        case 4:
            return `
**CHAPTER FOUR: IMPLEMENTATION & RESULTS**

**GOAL:** Present the built solution and evaluation results.

**REQUIRED SECTIONS:**
1.  **4.1 IMPLEMENTATION DETAILS:** Specifics of the development environment and setup.
2.  **4.2 RESULTS/FINDINGS:** Present data, screenshots, or system outputs.
    *   **VISUALS REQUIRED:** You must include figures/tables.
    *   **SCREENSHOTS:** Since you cannot take screenshots, you **MUST** use the placeholder format: e.g., \`[Figure 4.1: Screenshot of Login Page - showing fields for email and password]\`.
    *   **CHARTS:** For data results (e.g., accuracy comparison), use **Mermaid** pie/bar charts or meaningful tables.
3.  **4.3 EVALUATION/DISCUSSION:** Analyze the performance (Accuracy, Usability, etc.).
4.  **4.4 COMPARISON:** Compare findings with objectives/literatre.

**RESTRICTIONS:**
*   Use **Past Tense** (e.g., "The system achieved...").
*   **NO** Reference list at the end.
`;

        case 5:
            return `
**CHAPTER FIVE: CONCLUSION & RECOMMENDATIONS**

**GOAL:** Summarize the study and provide future direction.

**REQUIRED SECTIONS:**
1.  **5.1 CONCLUSION:** Recap the aim, objectives, and key achievements.
2.  **5.2 LIMITATIONS:** Honest discussion of constraints.
3.  **5.3 RECOMMENDATIONS:** Advice for future researchers/practitioners.
4.  **5.4 FUTURE WORK:** Specific enhancements planned.
5.  **REFERENCES:**
    *   Generate a full APA-style reference list of all sources cited in Chapters 1-5.
    *   Alphabetical order.

**RESTRICTIONS:**
*   This is the **ONLY** chapter that includes a References list at the end.
`;

        default:
            return `
**GENERIC CHAPTER GUIDELINES**
Structure the content logically with Introduction, Body Paragraphs, and Summary.
Adhere to standard academic tone and citation rules.
**NO** Reference list at the end.
`;
    }
};
