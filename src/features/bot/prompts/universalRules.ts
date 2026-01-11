export const UNIVERSAL_ACADEMIC_RULES = `
**Objective:** Generate a comprehensive, high-quality research paper on the \`[TOPIC TO BE PROVIDED BY USER]\`. Adhere strictly to the structure, formatting, citation, and content guidelines outlined below.

**I. GENERAL INSTRUCTIONS & WRITING STYLE:**

1.  **Sources & Referencing:**
    *   **Credibility:** You MUST use credible, academic sources. Prioritize peer-reviewed research papers, scholarly articles, and conference proceedings. Avoid general websites, blogs, or non-academic online content unless explicitly instructed for a specific, justifiable reason.
    *   **Recency:** Sources should primarily be **no more than 5 years old** from the current date, unless citing foundational/seminal works essential for historical context.
    *   **Source Discovery:** Utilize academic databases like Google Scholar, IEEE Xplore, ACM Digital Library, PubMed, Scopus, etc., to find relevant literature. You are expected to simulate the process of *reading and synthesizing information* from these sources.
    *   **In-Text Citations:**
        *   Use the author-year format: \`(Author, Year)\`. For example: \`(Smith, 2021)\`.
        *   If there are multiple authors, use \`(Smith et al., 2021)\`.
        *   When the author's name is part of the narrative, use: \`Smith (2021) stated...\` or \`...as demonstrated by Smith et al. (2021).\`
        *   **CRITICAL:** Do NOT include the title of the paper/source within the in-text citation. Only include the author(s) and the year.
    *   **References Chapter:**
        *   A dedicated chapter titled "**REFERENCES**" must be the absolute last section of the document.
        *   List all cited sources alphabetically by the primary author's last name. Use a consistent academic citation style (e.g., APA, IEEE – *User may specify preferred style if needed, otherwise use APA as a default*).

2.  **Formatting & Layout:**
    *   **Text Justification:** All body text must be justified.
    *   **Font and Spacing:** Use Times New Roman, 12-point font, with 1.5 line spacing for all body text.
    *   **Headings:**
        *   **Main Chapter Headings:**
            *   Line 1: \`CHAPTER [NUMBER IN WORDS, ALL CAPS]\` (e.g., \`CHAPTER ONE\`)
            *   Line 2: \`[CHAPTER TITLE, ALL CAPS]\` (e.g., \`INTRODUCTION\`)
            *   Followed by a blank line before the first section heading.
        *   **Section Headings (e.g., 1.1, 1.2):**
            *   \`[Section Number] [SECTION TITLE, ALL CAPS]\` (e.g., \`1.1 BACKGROUND OF THE STUDY\`)
            *   Ensure section titles are descriptive and relevant.
    *   **Figures and Tables:** If used (especially in Chapters 3 and 4), they must be:
        *   Clearly labelled with a number and a descriptive caption (e.g., "Figure 3.1: System Architecture Diagram").
        *   Referenced in the text (e.g., "...as seen in Figure 3.1." or "Table 4.2 summarizes the performance results.").

3.  **Tense:**
    *   **Abstract, Introduction (problem statement, motivation):** Predominantly present tense, but past tense may be used when referring to completed foundational work.
    *   **Literature Review:** Primarily past tense when discussing findings of previous studies (e.g., "Smith (2020) found..."). Present tense can be used for established theories or general statements.
    *   **Methodology (Chapter 1 overview and Chapter 3 details):** Describe the methods *used* in the research in the **past tense** (e.g., "The system was developed using...", "Data were collected through...").
    *   **Results/Implementation (Chapter 4):** Report findings and describe the implementation process in the **past tense** (e.g., "The model achieved an accuracy of...", "The UI was implemented with...").
    *   **Discussion/Conclusion (Chapter 5):** Present tense when interpreting results and discussing implications (e.g., "These findings suggest..."). Past tense when referring back to the specific results of *this* study. Future tense for "Future Work."

4.  **Writing Style & Tone:**
    *   Maintain a formal, objective, and academic tone throughout the paper.
    *   Avoid colloquialisms, slang, and overly casual language.
    *   Ensure clarity, conciseness, and logical flow between paragraphs and sections.
    *   The aim is to produce a document that mimics the structure, rigor, and sentence construction of a high-quality academic research paper.

**II. RESEARCH PAPER STRUCTURE & CONTENT GUIDELINES:**

**CHAPTER ONE**
**INTRODUCTION**

*   **1.1 BACKGROUND OF THE STUDY**
    *   Provide essential context for \`[TOPIC]\`.
    *   Establish the importance and relevance of \`[TOPIC]\`.
    *   Cite relevant foundational literature.
*   **1.2 MOTIVATION**
    *   Clearly state the motivation for this research. This should often stem from identifying limitations, gaps, or unresolved challenges in existing works related to \`[TOPIC]\`.
    *   Example structure: "Despite developments in \`[related field/existing solutions for TOPIC]\`, key challenges remain. Existing approaches often struggle with \`[limitation 1] (Author1, Year)\`, \`[limitation 2] (Author2, Year)\`, and \`[limitation 3] (Author3, Year)\`. Additionally, \`[another observed gap, e.g., lack of real-world feedback integration if relevant to TOPIC]\`."
    *   Ensure all claims of limitations are referenced with credible sources.
*   **1.3 AIM AND OBJECTIVES**
    *   **Aim:** A concise, overarching statement declaring the primary goal of the research.
        *   Example: "The aim of this research is to develop/investigate/analyze/evaluate \`[primary goal related to TOPIC]\` by addressing the aforementioned limitations."
        *   Keep the aim statement focused. Remove any sentences following it that describe *how* it will be achieved (that's for the objectives).
    *   **Objectives:** A list of specific, measurable, achievable, relevant, and time-bound (SMART, implicitly) actions that will be undertaken to achieve the aim.
        *   Example structure:
            1.  To develop \`[specific component/system related to TOPIC]\` that \`[key function]\`.
            2.  To implement \`[specific features/methodologies relevant to TOPIC]\`.
            3.  To evaluate the \`[effectiveness/performance/usability]\` of the \`[developed system/proposed method]\` by \`[briefly state evaluation approach, e.g., comparing with existing methods, conducting user studies, etc. Avoid over-detailing specific metrics here; save for Chapter 4]\`.
*   **1.4 METHODOLOGY (OVERVIEW)**
    *   Provide a concise summary of the research methodology that will be employed to achieve the objectives.
    *   Briefly outline the key steps/phases of your approach (e.g., data collection, system design, development, analysis, evaluation).
    *   **A flowchart visually representing this summarized methodology is highly recommended here.**
    *   Avoid deep technical details; these belong in Chapter 3.
*   **1.5 CONTRIBUTION TO KNOWLEDGE**
    *   Clearly articulate the expected contributions of this research to the field of \`[TOPIC]\`.
    *   Explain how this study aims to advance existing knowledge, address identified gaps, or offer novel solutions/insights.
    *   Example structure: "This research seeks to address these limitations by \`[summarize your approach]\`. By leveraging insights from prior research and refining existing methodologies, this study aims to advance \`[specific aspect of TOPIC or its application]\`."

**CHAPTER TWO**
**LITERATURE REVIEW**

*   **2.1 [DESCRIPTIVE TITLE RELATED TO THE LITERATURE BEING REVIEWED, e.g., "ADVANCEMENTS IN [KEY AREA OF TOPIC]" or "THEORETICAL FOUNDATIONS OF [TOPIC]"]**
    *   **Do NOT use "Introduction to the Literature Review" as the title for section 2.1.**
    *   Provide a brief introduction to the scope and organization of the literature review.
*   **2.2 THEMATIC CATEGORIZATION OF RELATED WORKS: [SUB-THEME 1, e.g., METHODOLOGIES, APPLICATIONS, THEORETICAL MODELS]**
    *   Systematically review existing literature relevant to \`[TOPIC]\`.
    *   Organize the review into thematic categories or key areas of research.
    *   Critically analyze and synthesize findings from various sources, highlighting similarities, differences, and trends.
    *   Discuss specific studies (e.g., Author et al., Year) within their relevant thematic subsections, detailing their approaches, findings, and limitations.
*   **2.3 [SUB-THEME 2, e.g., CHALLENGES IN [TOPIC], CURRENT TOOLS FOR [TOPIC]]**
    *   (Continue with thematic subsections as needed)
*   **2.X [IF APPLICABLE, e.g., MATHEMATICAL FOUNDATIONS OF [RELEVANT THEORY/TECHNIQUE]]**
    *   If mathematical underpinnings of certain theories or techniques (e.g., NLP, machine learning models) are crucial and discussed in literature, they can be reviewed here.
*   **2.Y [DESCRIPTIVE TITLE FOR RELEVANCE, e.g., "SYNTHESIS AND RELEVANCE TO THE CURRENT STUDY" or "IDENTIFIED GAPS AND THE CURRENT STUDY'S FOCUS"]**
    *   **Do NOT use "Relevance to your work" as the title.**
    *   Summarize the key findings from the literature review.
    *   Explicitly connect the reviewed literature to the current research, highlighting how it informs the proposed study and justifies its necessity by clearly identifying the gaps this research aims to fill.

**CHAPTER THREE**
**SYSTEM ANALYSIS AND DESIGN (or RESEARCH METHODOLOGY if not system-focused)**

*   **3.1 [APPROPRIATE TITLE, e.g., PROPOSED SYSTEM OVERVIEW or RESEARCH FRAMEWORK]**
    *   Provide a detailed description of the proposed system, model, framework, or research methodology.
    *   Elaborate on the concise overview provided in Chapter 1.
*   **3.2 SYSTEM ARCHITECTURE (if applicable)**
    *   Describe the overall architecture of the proposed system.
    *   Use diagrams (e.g., block diagrams, flowcharts) to illustrate components and their interactions.
    *   Detail front-end and back-end components if developing a software system.
*   **3.3 [COMPONENT/MODULE 1, e.g., DATA COLLECTION AND PREPROCESSING, NLP MODULE]**
    *   Detail specific components, modules, algorithms, or procedures.
    *   Explain the choice of specific technologies, tools, or techniques (e.g., "a TypeScript framework was selected for the front-end due to...", "Flask was utilized for the back-end API because..."). Generalize to "appropriate modern technologies relevant to \`[TOPIC]\`."
    *   If designing a system (like the job portal example), emphasize principles of user-centricity, streamlined interface, and focus on core functionalities.
*   **3.4 [COMPONENT/MODULE 2, e.g., MODEL DEVELOPMENT, IMAGE GENERATION MODULE]**
    *   (Continue with detailed subsections as needed)
*   **3.5 USER INTERFACE (UI) DESIGN (if applicable)**
    *   Describe the UI design and user interaction flow. Include mockups or design principles if actual implementation screenshots are for Chapter 4.

**CHAPTER FOUR**
**SYSTEM IMPLEMENTATION AND DISCUSSION (or RESULTS AND DISCUSSION)**

*   **4.1 [APPROPRIATE TITLE, e.g., IMPLEMENTATION DETAILS or EXPERIMENTAL SETUP]**
    *   **Do NOT use "Introduction to System Implementation."**
    *   Describe the environment, tools, and specific steps taken to implement the system or conduct the research.
*   **4.2 [PRESENTATION OF RESULTS/FINDINGS - SUBSECTION 1, e.g., TEST CASE 1: BASIC FUNCTIONALITY]**
    *   Present the results of the implementation, experiments, or analysis.
    *   **CRITICAL:** Use figures (screenshots, graphs, charts) and tables extensively to illustrate results.
    *   Always refer to figures in the text (e.g., "...as seen in Figure 4.1, the system processed the input script and generated...").
    *   Organize results logically, possibly by test cases, scenarios, or research questions.
*   **4.3 [PRESENTATION OF RESULTS/FINDINGS - SUBSECTION 2, e.g., PERFORMANCE EVALUATION]**
    *   Discuss performance metrics, accuracy, efficiency, user feedback (if collected), etc.
    *   Be objective in presenting findings, including any unexpected or negative results.
*   **4.4 DISCUSSION**
    *   Interpret the results in the context of the research objectives and the literature reviewed in Chapter 2.
    *   Explain the significance of the findings.
    *   Compare your results with existing work, if applicable.

**CHAPTER FIVE**
**CONCLUSION AND RECOMMENDATIONS**

*   **5.1 CONCLUSION**
    *   Summarize the entire research project.
    *   Reiterate the aim and objectives.
    *   Briefly summarize the key findings and whether the objectives were met.
    *   Restate the main contributions of the research.
*   **5.2 LIMITATIONS OF THE STUDY**
    *   Honestly discuss any limitations encountered during the research or inherent in the methodology/system.
    *   This could include scope limitations, methodological constraints, limitations of tools/data used, or aspects that could not be fully addressed.
*   **5.3 RECOMMENDATIONS**
    *   Based on the findings and limitations, provide practical recommendations for \`[target audience, e.g., practitioners, developers, future researchers in the field of TOPIC]\`.
*   **5.4 CHALLENGES ENCOUNTERED**
    *   Describe significant challenges faced during the research process (e.g., technical difficulties, data acquisition issues, unexpected complexities) and how they were addressed or their impact.
*   **5.5 FUTURE WORK (incorporates "Planned Future Enhancements")**
    *   Suggest specific directions for future research that could build upon this study.
    *   Outline potential enhancements, new features, or unexplored avenues related to \`[TOPIC]\`.
`;
