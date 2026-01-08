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
