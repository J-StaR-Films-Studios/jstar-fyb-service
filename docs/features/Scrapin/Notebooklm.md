Building a reliable PDF downloader for a "Deep Research" agent on Vercel requires navigating strict serverless constraints while bypassing sophisticated anti-bot protections. **Standard `fetch()` calls fail because academic sites use TLS fingerprinting and header analysis to identify non-browser traffic.**

The following is a technical evaluation and strategy for your Node.js serverless environment:

### 1. Technical Evaluation of Options

*   **Smart Headers & TLS Mimicry (Recommended):** This is the most viable "code-only" path. Standard libraries like `fetch` or `axios` use the default Node.js TLS stack, which lacks the complex "fingerprint" (ciphers, extensions, and handshake patterns) of a modern browser. **Using a library like `got-scraping` is the industry standard for this.** It mimics the HTTP/2 and TLS signatures of specific browser versions, allowing you to pass "High-Trust" checks without the overhead of a browser.
*   **Serverless Chrome (@sparticuz/chromium):** While possible, it is increasingly difficult on Vercel in 2026. **Browser-based agents are resource-intensive, often leading to high cold-start penalties and execution timeouts.** Furthermore, managing the 50MB bundle limit requires offloading the binary to a layer or external storage, which adds significant complexity and latency to your RAG pipeline.
*   **The Scraper API Reality:** Professional deep research systems (like OpenAI’s or Gemini’s) rely on massive, pre-indexed infrastructure or specialized APIs to ensure 99%+ reliability. **For a solo developer, fighting "cat-and-mouse" games with Cloudflare on IEEE or ResearchGate can be a massive waste of engineering time.**

### 2. The Best Technical Strategy (Code-Only)

To download PDFs reliably on Vercel without a full browser, implement a **"Direct-Link Dorking + TLS Mimicry"** pipeline:

#### Step A: Optimize Discovery (Avoid HTML Scraping)
Instead of scraping a search result page to find a link, have your LLM generate "Google Dorks." This targets the direct PDF URL, reducing the number of requests that could trigger a CAPTCHA.
*   **Query Template:** `site:researchgate.net filetype:pdf "Your Topic"`.
*   **Specialized Repositories:** Direct your agent to academic-specific engines like **ScienceDirect, ResearchGate, or Library Genesis**, which host massive repositories of scholarly papers.

#### Step B: Implementation with `got-scraping`
Switch your download logic to use **`got-scraping`**. This library is specifically designed to bypass blocks by:
1.  **Mimicking TLS Fingerprints:** It rotates the TLS session identifiers to match Chrome/Firefox.
2.  **HTTP/2 Support:** Many academic servers block HTTP/1.1 requests that lack the proper multiplexing headers common in browsers.
3.  **Automatic Header Generation:** It generates realistic `User-Agent`, `Accept-Language`, and `Sec-Fetch-*` headers automatically.

#### Step C: Handle Rate Limits (429s)
Even with perfect headers, academic sites will block your Vercel IP after a few requests. 
*   **Proxy Rotation:** Use a residential or data-center proxy provider. Unlike full "Scraper APIs," raw proxy rotation is inexpensive and can be integrated directly into `got-scraping`.
*   **Randomized Delays:** Implement a "polite" crawler logic with random wait times (0.5s to 1.5s) between downloads to mimic human behavior.

### 3. Summary of Technical Deliverable
| Component | Implementation |
| :--- | :--- |
| **Primary Library** | **`got-scraping`** (Node.js) |
| **Protocol** | Force **HTTP/2** for higher trust. |
| **Search Strategy** | Use LLM to generate **`filetype:pdf`** queries to find direct links. |
| **Header Logic** | Spoof **`User-Agent`** and **`Referer`** to match the search engine source. |
| **Network** | Integrate a **rotating proxy** to bypass 429 and IP-based blocks. |

**Analogy:** Using `fetch()` on an academic site is like trying to enter a high-security gala in pajamas; the guards (Cloudflare) will stop you at the door. Using `got-scraping` is like wearing a rented tuxedo and a fake ID—you look just like the other guests (real browsers) and can walk right in without the effort of building a whole new persona (a full headless browser).