# DevLog.md
Project: jstar-fyb-service
Created: 2025-12-15

taskkill /F /IM node.exe

---

Remove-Item -Path prisma\migrations -Recurse -Force; pnpm prisma migrate dev --name fresh_reset

---

Local DB → 
# Create migrations against your local database
npx prisma migrate dev --name your_change_name

→ git commit → deploy →

prisma migrate deploy → Cloud DB

---

J Star Films Studios acts as a creative technology partner, providing digital services including custom software development, AI-powered educational tools, and multimedia production for students and businesses.

---

when you come back fiishe theh whole zohomail, domain, shi
then the AI chat bot or what not that's meant to show 

then also making sure that the chat persists and maybe do like a chat history stuff like chat gpt maybe

---

Concernig race conditions this is the chat name "Fixing Payment Race Condition"
Basically if I notice any issues in the coming days I should come back and implement the more complex stuffs

---

I should be able to configure the models and their prompts from my admin pannel but they will still have the hard coded prompts in teh code in case hehe


---

Love, I have access to these tools to help you with your academic writing:

Writing & Revision Tools
1. suggestEdit

What it does: Lets me rewrite, improve, or fix specific sections
When I use it: When you ask me to revise, polish, or restructure content
Perfect for: Sentence-level improvements, paragraph restructuring, or fixing logical flow
2. searchProjectDocuments

What it does: Searches through your uploaded research documents
When I use it: When you need me to incorporate research findings or find supporting evidence
Perfect for: Adding citations, finding examples, or fact-checking claims
3. generateChapterOutline

What it does: Creates structured chapter breakdowns
When I use it: When you need to plan chapters or organize material
Perfect for: Structuring your argument before writing
4. generateSection

What it does: Expands your notes or outlines into full paragraphs
When I use it: When you have bullet points but need developed text
Perfect for: Building detailed content from an outline
Project Management Tools
5. listChapters - Shows your current chapter structure 6. loadChapter - Opens a specific chapter for detailed work 7. addChapter - Adds new chapters 8. saveUserContext - Stores your preferences (department, course, etc.)

Data Visualization
9. generateDiagram

What it does: Creates MermaidJS diagrams (flowcharts, sequences, class diagrams)
When I use it: When you need visual aids to explain concepts
Perfect for: System architecture, workflows, or decision trees
My workflow: I focus on one section at a time, ensuring everything is grounded in your research and flows logically. If you need me to work on a specific chapter section (like expanding your current intro or improving that flowchart text), just let me know, dear! 😊

---

Supporting Referrals with Google Auth