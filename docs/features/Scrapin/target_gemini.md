You are building an "Open Access Sniper." To get clean, direct PDF links and skip the paywalled landing pages of publishers (Elsevier, Springer, IEEE), you must rely on **Google Dorks** (advanced operators) that target **institutional repositories** and **pre-print servers** where the "Author's Copy" lives legally.

Here are the 7 Master Templates to program into your agent.

### 1. The Queries (Programmatic Templates)

Use these templates by replacing `{topic}` with your search term.

#### A. The "Academic Repo" Hunter (High Precision)

This targets university domains where professors host their own papers to bypass paywalls.

> `"{topic}" filetype:pdf (site:.edu OR site:.ac.uk OR site:.edu.au)`

#### B. The "Pre-Print" Aggregator

Targets the major open-access servers where papers are published before peer review.

> `"{topic}" (site:arxiv.org OR site:biorxiv.org OR site:medrxiv.org OR site:ssrn.com)`

#### C. The "Author's Version" Bypass

Authors are often allowed to post their "Accepted Manuscript" (the version before the publisher adds their logo). We search for the specific legal text they are required to include.

> `"{topic}" filetype:pdf ("accepted manuscript" OR "draft version" OR "author's copy" OR "to appear in")`

#### D. The "NIH / Government" Goldmine

For healthcare/AI topics, the US government mandates open access for funded research (PubMed Central).

> `"{topic}" filetype:pdf (site:nih.gov OR site:europa.eu OR site:who.int)`

#### E. The "Directory of Open Access"

Targets directories specifically built to index open access journals.

> `"{topic}" site:doaj.org OR site:sciencedirect.com/science/article/pii/S`

#### F. The "Anti-SEO" Filter (Cleanest Results)

This query aggressively removes slides, books, and social media junk to save you token costs.

> `"{topic}" filetype:pdf -site:pinterest.* -site:slideshare.net -site:facebook.com -site:linkedin.com`

---

### 2. The Logic: Why These Work

* **`filetype:pdf` vs `ext:pdf`:** They are functionally similar, but `filetype` is sometimes stricter on the HTTP header content type, whereas `ext` looks at the URL extension. Using `filetype:pdf` is the standard for ensuring you get a binary file, not a webpage *about* a PDF.
* **`site:.edu` & `site:.ac...`:** Commercial publishers use `.com` or `.org`. Universities use `.edu` (USA), `.ac.uk` (UK), `.ac.in` (India), etc. By restricting your search to these TLDs (Top Level Domains), you automatically filter out 90% of paywalls and land on university library repositories.
* **The "Accepted Manuscript" keywords:** When a scientist signs a copyright transfer to IEEE or Nature, the contract usually says: *"You may post the accepted version on your personal website."* Searching for the specific phrases used in those contracts finds these legal loopholes.
* **The Negation (`-site`):** This is critical for an automated agent. Sites like Pinterest and SlideShare have excellent SEO and often clog results with non-authoritative content. Excluding them keeps your ingestion pipeline clean.

---

### 3. The "Secret" Repos (Bot-Friendly Whitelist)

If your agent can prioritize specific domains, whitelist these. They are "High Trust" because they exist solely to distribute PDFs.

| Domain | Description | Trust Level | Bot Friendliness |
| --- | --- | --- | --- |
| **arxiv.org** | Physics, CS, AI standard. | 100% | High (Stable URLs) |
| **biorxiv.org** | Biology pre-prints. | 100% | High |
| **ncbi.nlm.nih.gov** | PubMed Central (Healthcare). | 100% | High |
| **semanticscholar.org** | AI-driven search engine. | 90% | Med (Good for finding links) |
| **openaccess.thecvf.com** | Computer Vision Foundation. | 100% | High (Direct PDFs) |
| **aclweb.org** | Computational Linguistics. | 100% | High (Direct PDFs) |

### 4. Applied Example

**Topic:** "Impact of AI on Healthcare"

**The "Smart" Query to run first:**

```text
"Impact of AI on Healthcare" filetype:pdf (site:.edu OR site:.gov OR site:arxiv.org) -draft

```

**Why this wins:**

1. **"Impact of AI on Healthcare"**: Quotes force an exact phrase match (higher relevance).
2. **`filetype:pdf`**: Ensures the result is a document.
3. **`(site:.edu OR ...)`**: Forces the result to come from a University, Government, or ArXiv (skipping news articles and blogs).
4. **`-draft`**: Optional, but helps remove unfinished work if you only want final papers.

### Next Step for your Agent

Once you get these URLs, your **Vercel Downloader** (from the previous context) should check the URL domain.

* If it matches `arxiv.org` or `.edu`, attempt a **Direct Download** (Strategy 1).
* If the URL is from `sciencedirect.com` or `nature.com`, **skip it** or flag it for a "Human Review" queue, as these are likely paywalled even if they appear in search.