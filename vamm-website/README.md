# Vamm

Student Investment Lab by the CaGa CaGa team.

Extract the ZIP and open the whole folder in VS Code. Open `index.html` in your browser or use Live Server for a static preview. Use the included Node.js server for OpenAI quizzes and Google lookup. Keep all HTML, CSS, JavaScript, and `images/` files together.

To run the included local server, open a VS Code terminal in this folder with Node.js 22 or newer:

```powershell
node server.mjs
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000). If port 8000 is in use, run `node server.mjs 8080` and open [http://127.0.0.1:8080](http://127.0.0.1:8080).

## Connect live quizzes and Google lookup

1. Copy `.env.example` to `.env` in this folder. Set `OPENAI_API_KEY` to your [OpenAI API key](https://developers.openai.com/api/docs/quickstart) for quiz generation. Set `GEMINI_API_KEY` to your [Google AI Studio API key](https://ai.google.dev/gemini-api/docs/api-key) for Google Search lookup. Each key enables its own feature. Keep `.env` on your computer.
2. Start the server from that folder with `node --env-file=.env server.mjs` (append `8080` if port 8000 is busy). Use the localhost address printed in the terminal. The server reads the keys; no keys belong in HTML, browser JavaScript, or GitHub.
3. In **Missions & Challenges → Quiz Center**, choose **Stock Basics**, **Risk Detective**, or **Facts, Opinions & News**. Select **5, 10, or 15 questions**, then click **Start Quiz**. The server sends the selected topic and question count to OpenAI. The key stays on the server. A reviewed five-question sample is available when you want to practice without AI.
4. Use **Search sources** in the top bar from any section. Submit a question to look up current sources through Google Search. Results show links to the sources. The lookup sends only the submitted question and section; it does not send your saved chats, portfolio, or trades.

The [OpenAI Responses API](https://developers.openai.com/api/docs/guides/structured-outputs) generates quizzes based on the selected course. [Google Search grounding](https://ai.google.dev/gemini-api/docs/generate-content/google-search?hl=en) powers source lookup. The keys are optional for the offline practice features. The local server binds to `127.0.0.1`; this setup is for local testing.

## Try the demo

1. **Home** lists the features and shows your available virtual cash, completed lessons, and learning XP. Virtual cash changes when you buy or sell in Simulator. Select a feature icon in the left rail; use the panel button at the top to collapse or reopen the sidebar.
2. Open **Learning Academy** and choose a course from the catalog. Each course shows its level, duration, and an expandable **Course outline**. The ten lessons cover stock basics, portfolio risk, company research, charts, compounding, inflation, and fees. Each has a diagram, learning goals, key takeaways, and a short reflection. The first lesson of each course is available; **Lesson Complete** and **Next Lesson** unlock the following step within that course. Scored quizzes stay in **Missions & Challenges**.
3. In **Market & Simulator**, use the three links under **Practice Workspace**. **Real Market** opens TradingView on NASDAQ:AAPL with daily candles and symbol switching. **Simulator** lets you buy and sell fictional stocks with virtual IDR. Its generated demo prices and chart update every five seconds while Simulator or Portfolio is visible. **Portfolio** shows cash, holdings, profit/loss, and the fixed price of each completed transaction. Transaction history has **10, 20, or 50 rows per page** with Previous/Next controls; pagination does not delete records. The Home balance shows available virtual cash.
4. Open **AI Investment Mentor** and send a question in the compact chat panel. **New Chat** starts an empty conversation, and **Your chats** reopens saved conversations. Open a chat’s **⋯** menu and choose **Delete chat** to remove it after confirmation. A conversation is saved after its first message. Reopen the page or choose **End demo session** in **Demo profile** to begin with a fresh chat while keeping earlier messages.
5. Open **News & Sentiment Lab** for current financial headlines from the official TradingView News Feed. The provider checks for new stories every few minutes while visible. Publishers and publication times appear with the stories; the outer status shows when the widget loaded. **Refresh news** reconnects the widget. Older, dated **Sentiment practice examples** remain below the current feed. **Try Sentiment Challenge** opens the quiz in Missions & Challenges.
6. In **Missions & Challenges**, answer one question at a time with no timer. You can revisit and change answers before submitting. The result shows your score, an explanation for every question, and concepts to review. **80%** passes the challenge and awards **100 XP** the first time that pass is saved. Drafts, last and best scores, and rewards stay in this browser. You can repeat any challenge without earning the same reward twice.
7. **Demo profile** shows saved activity and your virtual portfolio value. **End demo session** starts a fresh Mentor chat while leaving saved chats and practice progress available.

Learning sources were reviewed on **7 November 2026**. Lessons link directly to SEC Investor.gov, FINRA, Fidelity Learn, and Bank Indonesia. Further-learning links go to publisher pages. Local lesson text is curated; it does not automatically rewrite itself when a publisher changes a page. Charts and money examples in lessons are illustrative. Check the source page for its latest version and local rules before applying a concept to a real account.

Each lesson awards **10 Academy points** once. Milestones at **20, 50, 80, and 100 points** unlock badges and bonus XP. The points and rewards are calculated from completed lessons, so reviewing a lesson does not award them again.

Your progress, trades, and conversations are saved in the current browser at the address you use to open the demo. Choose the same file path or localhost address when you return.

Simulator prices are generated examples. They update independently of the external TradingView chart.

The Mentor uses scripted educational responses. Sentiment practice stories and labels are curated examples, and simulator trading data is generated. The demo profile is stored locally. Feature artwork and the brand mark are local SVG files in `images/` and can be replaced with your own artwork.

TradingView charts, current news, and external learning links require an internet connection and depend on their publishers. The optional local server adds API routes for quiz generation and source lookup. TradingView continues to supply its chart and news directly.

## Project files

| File | Purpose |
| --- | --- |
| `index.html`, `style.css` | Site structure, responsive layout, and colors. |
| `app.js`, `model.js` | Page behavior, learning content, quizzes, simulated trades, and progress. |
| `news-feed.js`, `web-research.js` | TradingView news and the shared Google source lookup. |
| `server.mjs`, `ai-service.mjs` | Local hosting and the server-side OpenAI and Google routes. |
| `.env.example`, `.gitignore` | Local key template and rules that exclude private key files from Git. |
| `images/` | Local SVG brand and feature artwork. |
