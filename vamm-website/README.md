# Vamm

Student Investment Lab by the CaGa CaGa team.

Extract the ZIP and open the whole folder in VS Code. Open `index.html` in your browser or use Live Server for a static preview. Use the included Node.js server for the OpenAI Mentor, quizzes, and web search. Keep all HTML, CSS, JavaScript, and `images/` files together.

To run the included local server, open a VS Code terminal in this folder with Node.js 22 or newer:

```powershell
node server.mjs
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000). If port 8000 is in use, run `node server.mjs 8080` and open [http://127.0.0.1:8080](http://127.0.0.1:8080).

## Connect the AI Mentor, quizzes, and web search

1. Copy `.env.example` to `.env` in the folder containing `server.mjs`. Set `OPENAI_API_KEY` to your [OpenAI API key](https://platform.openai.com/api-keys). This one key enables Mentor chat, quiz generation, and live web search. Keep `.env` private on your computer.
2. Start the server with `node server.mjs` (append `8080` if port 8000 is busy). It automatically loads the private `.env` beside `server.mjs`. Restart the server after changing your key. Open the localhost address printed in the terminal. Keep `.env.example` blank when uploading the project to GitHub.
3. Open **AI Investment Mentor** and send an investing question. The **Mentor · OpenAI** label identifies a generated reply. OpenAI receives the question and up to four preceding messages from that chat. Vamm saves chats in the current browser; **Your chats** reopens them on the same device and address. If OpenAI is unavailable, the chat labels the scripted answer **Mentor · Practice**. The **Review my virtual portfolio** shortcut uses the simulator’s calculations in your browser.
4. In **Missions & Challenges → Quiz Center**, choose **Stock Basics**, **Risk Detective**, or **Facts, Opinions & News**. Select **5, 10, or 15 questions**, then click **Start Quiz**. The server sends the selected topic and question count to OpenAI. A reviewed five-question sample is available when you want to practice without AI.
5. Use **Search sources** in the top bar from any section. Submit a question to search the live web through OpenAI. Results show clickable numbered citations and source links. The lookup sends only the submitted question and section.

The OpenAI Responses API handles [Mentor replies](https://developers.openai.com/api/docs/guides/text), [quiz generation](https://developers.openai.com/api/docs/guides/structured-outputs), and [web search](https://developers.openai.com/api/docs/guides/tools-web-search). You can use the practice features without an API key. The Node server runs on `127.0.0.1` for local testing. A live site needs a Node host with private server environment variables and access controls for the paid API routes.

## Try the demo

1. **Home** lists the features and shows your available virtual cash, completed lessons, and learning XP. Virtual cash changes when you buy or sell in Simulator. Select a feature in the desktop rail or phone's bottom navigation; use the panel button at the top to collapse or reopen the sidebar.
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

Sentiment practice stories and labels are curated examples. The demo profile is stored locally. Feature artwork and the brand mark are local SVG files in `images/` and can be replaced with your own artwork.

TradingView charts, current news, and external learning links require an internet connection and depend on their publishers.

## Motion and appearance

The midnight studio design combines a dark navigation shell, an illustrated learning orbit, and bright reading panels. Cards reveal as they enter view, with gentle hover feedback and decorative movement in the Home illustration. The illustration is not market data. Financial values are displayed directly without decorative counting animations.

Use the **Motion on/off** button in the top bar to pause or resume decorative animation. This preference stays on the device. The operating system's reduced-motion setting always takes priority. Decorative motion pauses when the page is hidden, and the Home illustration pauses outside the viewport. Without `motion.js`, all content remains visible and interactive with decorations still.

## Project files

| File | Purpose |
| --- | --- |
| `index.html`, `style.css` | Site structure, responsive layout, and colors. |
| `app.js`, `model.js` | Page behavior, learning content, quizzes, simulated trades, and progress. |
| `motion.js` | Optional reveal effects, visibility handling, and the saved motion preference. |
| `news-feed.js`, `web-research.js` | TradingView news and the shared OpenAI source lookup. |
| `server.mjs`, `ai-service.mjs` | Local hosting and the server-side OpenAI routes. |
| `.env.example`, `.gitignore` | Local key template and rules that exclude private key files from Git. |
| `images/` | Local SVG brand and feature artwork. |
