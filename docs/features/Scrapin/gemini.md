This is a classic "Serverless vs. Heavy Browser" conflict. You are trying to fit a tank (Chrome) into a suitcase (Vercel Serverless).

Here is the evaluation of your options and the recommended Technical Strategy.

### The Evaluation

#### 1. Smart Headers & TLS Mimicry (`got-scraping`)

* **Verdict:** **Essential, but not a silver bullet.**
* **Why:** `got-scraping` is the best Node.js library for this right now. It automatically manages HTTP/2, header order, and TLS ciphers to look like a real browser (Chrome/Firefox).
* **The Trap:** It works perfectly for "dumb" blocks (User-Agent checks, basic WAFs). It **fails** against JavaScript challenges (Cloudflare Turnstile, "Checking your browser..." screens) because it cannot execute the JavaScript required to generate the clearance cookie. ResearchGate and IEEE often use these JS barriers.

#### 2. Serverless Chrome (`@sparticuz/chromium`)

* **Verdict:** **DO NOT DO THIS.**
* **Why:**
* **The 50MB Limit:** Vercel's function size limit is strict. Chromium binaries are constantly growing. You will spend hours fighting "Error: Function size 50.01MB" by deleting fonts and compressing binaries, only for it to break on the next update.
* **Timeouts:** Vercel Pro allows 60s timeouts (Hobby is 10s). A "Deep Research" download often takes longer than 10s to navigate, solve a captcha, and download a 5MB PDF.
* **Cold Starts:** Booting Chromium adds 2-5 seconds of latency.



#### 3. The "API" Reality

* **Verdict:** **The only reliable path for "High Trust" targets.**
* **Why:** Academic sites are aggressive. They don't just check headers; they check mouse movements and JS execution. "Fighting" this in code means you are now maintaining a scraping bot, not building an AI agent.

---

### The Recommended Strategy: "The Hybrid Fallback"

Do not rely on a single method. Use a **Waterfall Approach** to minimize costs while guaranteeing success.

#### Step 1: The "Low Cost" Try (Code-Only)

First, attempt to download the PDF using `got-scraping` directly from your Vercel function. This costs $0.

* It bypasses basic blocks (403s caused by bad headers).
* It handles HTTP/2 and TLS fingerprints automatically.

#### Step 2: The "High Trust" Fallback (API)

If Step 1 returns a `403`, `429`, or a body containing text like "Verify you are human", **catch that error** and route the specific request to a Scraper API.

* This keeps your bill low (you only pay for the 20% of difficult PDFs).
* You don't need a full browser; you just need the PDF buffer.

---

### Implementation Guide

#### 1. Install the "Magic" Library

Don't use `axios` or `fetch`. Use `got-scraping`. It is built by the Apify team specifically to mimic browser TLS fingerprints in Node.js.

```bash
npm install got-scraping

```

#### 2. The Robust Downloader Code

Create a utility function `smartDownload.ts`.

```typescript
import { gotScraping } from 'got-scraping';

export async function smartDownload(url: string): Promise<Buffer> {
  try {
    // STRATEGY 1: Direct "High-Mimicry" Request
    // got-scraping auto-rotates headers and mimics a modern browser's TLS 
    const response = await gotScraping({
      url,
      responseType: 'buffer',
      // Mimic specific browser behavior
      headerGeneratorOptions: {
        browsers: [{ name: 'chrome', minVersion: 110 }],
        devices: ['desktop'],
        locales: ['en-US'],
        operatingSystems: ['windows'],
      },
      // Important: Academic sites often redirect (e.g., DOI links)
      followRedirect: true, 
      retry: { limit: 2 }, 
    });

    // Check if we actually got a PDF or a "You are blocked" HTML page
    const contentType = response.headers['content-type'];
    if (contentType && !contentType.includes('pdf')) {
      throw new Error('BLOCKED_OR_NOT_PDF');
    }

    return response.body;

  } catch (error: any) {
    // STRATEGY 2: Fallback to Scraper API (Only if Strategy 1 fails)
    if (error.message === 'BLOCKED_OR_NOT_PDF' || error.response?.statusCode === 403 || error.response?.statusCode === 429) {
      console.log(`Direct access failed for ${url}. Rerouting via Scraper API...`);
      return await downloadViaProxy(url);
    }
    throw error;
  }
}

// Minimal implementation of the "Break Glass" API
async function downloadViaProxy(targetUrl: string): Promise<Buffer> {
  // Use a service like ZenRows, ScraperAPI, or ScrapingBee here.
  // Example using a generic Scraper API pattern:
  const proxyUrl = `https://api.zenrows.com/v1/?apikey=${process.env.SCRAPER_KEY}&url=${encodeURIComponent(targetUrl)}&render_js=true`;
  
  const response = await fetch(proxyUrl);
  if (!response.ok) throw new Error(`API failed: ${response.statusText}`);
  return Buffer.from(await response.arrayBuffer());
}

```

### Why this wins:

1. **Vercel Safe:** No Chromium binary. Tiny bundle size.
2. **Cost Effective:** You only use the paid API for the hardest 10-20% of papers (e.g., IEEE Xplore often requires JS rendering; a direct PDF link from a university repo often does not).
3. **TLS Solved:** `got-scraping` generates the `ClientHello` TLS handshake that matches the headers it sends, preventing the "Mismatch" flag that Cloudflare looks for.

### A Note on "PDF Parsing"

Once you have the buffer, you need to parse it. **Do not use `pdf-parse**` (it's old/buggy). Use **`pdf2json`** or Mozilla's **`pdfjs-dist`** (but be careful with `pdfjs-dist` in serverless as it uses a worker; strict configuration is needed).

For the absolute lightest serverless PDF text extraction, I recommend sending the PDF buffer to a dedicated endpoint or using:

```bash
npm install pdf-parse-new

```

(A maintained fork of the original).

### Next Step

Would you like me to write the **Next.js API Route handler** that wraps this logic and streams the PDF status back to your frontend agent?