# The "Master Research Query" Prompt

**Context:**
I am building an automated research agent. It uses a standard search API (like Google/Exa) to find academic papers.
I need to know the **exact search strings** (Google Dorks) that yield the highest probability of finding **Direct, Open-Access PDFs** and avoiding paywalled landing pages (like standard IEEE/Springer abstract pages).

**The Goal:**
Give me a set of 5-10 master search query templates that I can programmatically fill with a topic.

**Specific Constraints:**
1.  **Direct Downloads:** I want links that end in `.pdf` or go to open repositories (ArXiv, biorxiv, etc.).
2.  **Bypass Paywalls:** I want to find the "Author's Copy" or "University Repository" version of a paper, not the $30 publisher version.
3.  **High Quality:** The results must be academic/authoritative, not SEO spam.

**Please provide:**
1.  **The Queries:** A list of query templates using operators (e.g., `filetype:pdf`, `site:edu`, `-site:...`).
2.  **The Logic:** Why these specific operators work to filter out noise.
3.  **The "Secret" Repos:** A list of domains (like `site:arxiv.org`) that are high-trust and bot-friendly.

**Example Input Topic:** "Impact of AI on Healthcare"
**Desired Output:** The specific search strings you would type to get the PDF immediately.
