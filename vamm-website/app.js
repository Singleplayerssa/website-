const {
  lessons, assets, annualRates, inflation, stageAt, scenarios, watchlist, advance, market, sum,
  startingCash, lastMarketDay, stocks, newAccount, portfolio, executeTrade, courses, quizzes, news, academySources, academyResources,
  quotePrice, quoteSeries, advanceDemoQuotes,
  academyTracks, academyMilestones, academyPointsPerLesson,
  quizPacks, quizCounts, validateQuizQuestions, scoreQuiz,
} = simulationModel;

const sections = {
  home: 'Home',
  academy: 'Learning Academy',
  market: 'Market & Simulator',
  mentor: 'AI Investment Mentor',
  missions: 'Missions & Challenges',
  news: 'News & Sentiment Lab',
  profile: 'Demo profile',
};
const marketTabs = {
  tradingview: 'Real Market', stocks: 'Simulator', portfolio: 'Portfolio',
};
const missionTabs = { dashboard: 'Missions', quizzes: 'Quiz Center' };
const prompts = ['What is a stock?', 'Explain the P/E ratio', 'How does diversification work?', 'Review my virtual portfolio'];
const challenges = [
  { id: 'first', title: 'First Investment', description: 'Get a perfect score in the introductory stocks quiz.', quiz: 'stocks', reward: 20 },
  { id: 'diversifier', title: 'Smart Diversifier', description: 'Hold a virtual stock in at least three sectors.', reward: 40 },
  { id: 'detective', title: 'Risk Detective', description: 'Identify five investment risks in the Investment Risks quiz.', quiz: 'risk', reward: 30 },
  { id: 'analyst', title: 'Market Analyst', description: 'Separate facts from opinions in the Fact vs. Opinion quiz.', quiz: 'market-analyst', reward: 25 },
];
const legacyQuizPacks = { stocks: 'stocks-101', risk: 'risk-and-return', 'market-analyst': 'facts-and-news' };

const main = document.querySelector('#main');
const workspace = document.querySelector('.workspace');
const sidebar = document.querySelector('#sidebar');
const panel = document.querySelector('#feature-panel');
const panelContent = document.querySelector('#panel-content');
const menu = document.querySelector('#menu');
const backdrop = document.querySelector('#backdrop');
const narrowScreen = window.matchMedia('(max-width: 760px)');
const announcer = document.querySelector('#announcer');

const studentKey = 'caga-caga-student-v1';
const sessionKey = 'caga-caga-sessions-v1';
const quizProgressKey = 'caga-caga-quiz-center-v1';
const quizReward = 100;
const memoryOnly = new Set();
let student = loadStudent();
let sessions = loadSessions();
let quizRecords = readQuizRecords() ?? {};
const unsavedQuizDrafts = new Map();
const unsavedQuizResults = new Map();
let page = route();
let renderedHash = location.hash;
let chat = null;
let pendingChatDeleteId = null;
let chatDeleteTrigger = null;
let journey = null;
let marketView = 'tradingview';
let historyPageSize = 10;
let historyPage = 0;
let ticker = stocks[0].ticker;
let stockSearch = '';
let lessonId = null;
let academyTrackId = null;
let quizGeneration = null;
let scenario = { asset: 0, event: 0, range: 30 };

const rupiahFormat = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const creditFormat = new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const percentFormat = new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 2 });
const dateFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'Asia/Jakarta' });
const rupiah = value => value == null || !Number.isFinite(value) ? 'Unavailable' : rupiahFormat.format(value);
const credits = value => value == null || !Number.isFinite(value) ? 'Unavailable' : creditFormat.format(value) + ' credits';
const percent = value => value == null || !Number.isFinite(value) ? 'Unavailable' : percentFormat.format(value);
const signed = (value, format = rupiah) => value == null || !Number.isFinite(value) ? 'Unavailable' : (value > 0 ? '+' : value < 0 ? '−' : '') + format(Math.abs(value));
const date = value => dateFormat.format(new Date(value));
const escape = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);
const idForSession = () => crypto.randomUUID?.() ?? crypto.getRandomValues(new Uint32Array(4)).join('-');
const hasCompleted = id => student.completedLessons.includes(id);
const stockByTicker = symbol => stocks.find(stock => stock.ticker === symbol);
const quizById = id => quizzes.find(quiz => quiz.id === id);
const quizPackById = id => quizPacks.find(pack => pack.id === id);
const courseById = id => courses.find(course => course.id === id);
const activeAcademyTrack = () => academyTracks.find(track => track.id === academyTrackId);
const completedAcademyCount = () => courses.filter(course => hasCompleted(course.id)).length;
const academyPoints = () => completedAcademyCount() * academyPointsPerLesson;

function readStorage(key, fallback) {
  if (memoryOnly.has(key)) return fallback;
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    memoryOnly.add(key);
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    memoryOnly.delete(key);
  } catch {
    memoryOnly.add(key);
  }
  renderStorageStatus();
}

function loadStudent(fallback) {
  const fresh = { account: newAccount(), completedLessons: [], quizResults: {}, rewards: [] };
  const stored = readStorage(studentKey, fallback ?? fresh);
  if (stored === null) return fresh;
  const account = stored?.account;
  const valid = Number.isSafeInteger(account?.cash) && account.cash >= 0
    && Number.isInteger(account.day) && account.day >= 0 && account.day <= lastMarketDay
    && account.holdings && Array.isArray(account.trades) && Array.isArray(stored.completedLessons)
    && stored.quizResults && Array.isArray(stored.rewards);
  return valid ? stored : fallback ?? fresh;
}

function loadSessions(fallback = []) {
  const stored = readStorage(sessionKey, fallback);
  if (!Array.isArray(stored)) return [];
  return stored.filter(item => typeof item?.id === 'string' && typeof item.title === 'string'
    && (item.kind === 'chat' || (item.kind === 'sim' && Array.isArray(item.sim?.timeline)))
    && Array.isArray(item.messages));
}

function saveStudent(next) {
  student = next;
  writeStorage(studentKey, student);
}

function saveSession(record) {
  const updated = { ...record, updated: Date.now() };
  sessions = [updated, ...loadSessions(sessions).filter(item => item.id !== updated.id)];
  writeStorage(sessionKey, sessions);
  return updated;
}

function renderStorageStatus() {
  const status = document.querySelector('#storage-status');
  status.hidden = memoryOnly.size === 0;
  status.textContent = memoryOnly.size
    ? 'This browser could not read or save some demo data. Changes may only be available during this visit.'
    : '';
}

function announce(text) {
  announcer.textContent = text;
}

function route() {
  const key = location.hash.slice(1);
  if (key === 'missions/quizzes' || key.startsWith('missions/quiz/')) return 'missions';
  return Object.hasOwn(sections, key) ? key : 'home';
}

function quizRoute() {
  const match = location.hash.match(/^#missions\/quiz\/([^/]+)(?:\/(run|result))?$/);
  return match ? { id: match[1], stage: match[2] ?? 'setup' } : null;
}

function setMenu(open) {
  const overlay = narrowScreen.matches && open;
  panel.hidden = !open;
  backdrop.hidden = !overlay;
  workspace.inert = overlay;
  document.body.classList.toggle('sidebar-collapsed', !open);
  const label = open ? 'Hide sidebar' : 'Show sidebar';
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', label);
  menu.title = label;
}

function go(next, hash = next) {
  page = next;
  if (location.hash !== '#' + hash) location.hash = hash;
  showPage();
}

function showPage() {
  quizGeneration?.abort();
  quizGeneration = null;
  student = loadStudent(student);
  sessions = loadSessions(sessions);
  quizRecords = readQuizRecords() ?? quizRecords;
  if (narrowScreen.matches) setMenu(false);
  renderedHash = location.hash;
  render();
  window.scrollTo(0, 0);
  main.focus({ preventScroll: true });
}

function rerender(selector = '#view-title') {
  render();
  const target = main.querySelector(selector);
  if (target) target.focus();
}

function heading(kicker, title, description) {
  return `<div class="page-heading"><span class="eyebrow">${kicker}</span><h1 id="view-title" tabindex="-1">${title}</h1>
    <p>${description}</p></div>`;
}

function metric(label, value, detail = '', id = '') {
  return `<div class="metric"><small>${label}</small><strong class="metric-number"${id ? ` id="${id}"` : ''}>${value}</strong>${detail ? `<small${id ? ` id="${id}-detail"` : ''}>${detail}</small>` : ''}</div>`;
}

function chip(label, style = '') {
  return `<span class="chip ${style}">${label}</span>`;
}

function featureImage(id) {
  return `<img src="./images/${id}.svg" width="40" height="40" alt="">`;
}

function gainText(value, format = rupiah) {
  if (value == null || !Number.isFinite(value)) return '<span>Unavailable</span>';
  const color = value > 0 ? 'positive' : value < 0 ? 'negative' : '';
  return `<span class="${color}">${signed(value, format)}</span>`;
}

function bestScore(id) {
  return student.quizResults[id] ?? 0;
}

function xpTotal() {
  const quizXp = sum(quizzes.map(quiz => bestScore(quiz.id) * 10));
  const missionXp = sum(challenges.filter(item => student.rewards.includes(item.id)).map(item => item.reward));
  const points = academyPoints();
  const academyXp = sum(academyMilestones.filter(milestone => points >= milestone.points).map(milestone => milestone.xp));
  const packXp = quizPacks.filter(pack => quizRecord(pack.id).rewardEarned).length * quizReward;
  return quizXp + missionXp + academyXp + packXp;
}

function panelButton(label, data, current = false, extra = '') {
  const title = escape(label);
  return `<button class="panel-link ${extra}" ${data} title="${title}"${current ? ' aria-current="true"' : ''}><span>${title}</span></button>`;
}

function panelGroup(label, items) {
  return `<p class="panel-label">${label}</p><div class="panel-list">${items}</div>`;
}

function renderPanel() {
  let content;
  if (page === 'mentor') {
    const history = sessions.filter(item => item.kind === 'chat' && item.messages.length > 0);
    const items = history.map(item => `<div class="chat-history-row">${panelButton(item.title, `data-chat="${escape(item.id)}"`, item.id === chat?.id)}<details class="chat-options"><summary class="chat-options-button" aria-label="${escape('Chat options: ' + item.title)}"><span aria-hidden="true">•••</span></summary><div class="chat-options-menu"><button type="button" data-delete-chat="${escape(item.id)}">Delete chat</button></div></details></div>`).join('');
    content = panelButton('＋ New Chat', 'data-action="new-chat"', false, 'new-chat')
      + panelGroup('Your chats', items || '<p class="panel-empty">Your conversations will appear here.</p>');
  } else if (page === 'academy') {
    content = '';
  } else if (page === 'market') {
    content = panelGroup('Practice Workspace', Object.entries(marketTabs)
      .map(([id, title]) => panelButton(title, `data-market-tab="${id}"`, marketView === id)).join(''));
  } else if (page === 'missions') {
    content = panelGroup('Activities', Object.entries(missionTabs)
      .map(([id, title]) => panelButton(title, `data-mission-tab="${id}"`, id === 'dashboard' ? location.hash === '#missions' : location.hash !== '#missions')).join(''));
  } else if (page === 'news') {
    content = panelGroup('Explore', panelButton('Market headlines', 'data-page="news"', true)
      + panelButton('Try the Facts and News Quiz', 'data-quiz="facts-and-news"'));
  } else if (page === 'profile') {
    content = panelGroup('Student workspace', panelButton('Demo profile', 'data-page="profile"', true)
      + panelButton('Back to Home', 'data-page="home"'));
  } else {
    content = '';
  }
  const scrollTop = panelContent.scrollTop;
  panelContent.innerHTML = content;
  panelContent.scrollTop = scrollTop;
}

function home() {

  const done = completedAcademyCount();
  const features = [
    ['academy', 'Pick up a short lesson or start with the basics.', 'Knowledge'],
    ['market', 'Search fictional stocks and place practice orders with your virtual balance.', 'Practice'],
    ['mentor', 'Ask a question or get feedback on the risk in your virtual portfolio.', 'Perspective'],
    ['missions', 'Test what you know, practice new skills, and earn XP.', 'Progress'],
    ['news', 'Follow financial headlines and practice reading the sentiment behind them.', 'Context'],
  ];
  return `<div class="screen home-screen">
    <section class="hero home-hero">
      <div class="hero-content">
        <div class="hero-meta"><span class="eyebrow">Student investment lab</span><span class="lab-status">Learn · practice · reflect</span></div>
        <h1 id="view-title" tabindex="-1">Learn to invest.<span>One move at a time.</span></h1>
        <p>Build your investing skills with short lessons, market stories, and a virtual account to practice what you learn.</p>
      </div>
      <figure class="hero-graphic home-illustration">
        <svg viewBox="0 0 380 248" aria-hidden="true" focusable="false">
          <rect x="12" y="12" width="356" height="224" rx="20" fill="#eef1ff"/>
          <rect x="25" y="24" width="330" height="200" rx="14" fill="#fff" stroke="#d9dfef"/>
          <path d="M45 73H335M45 111H335M45 149H335M45 187H335M92 60V187M150 60V187M208 60V187M266 60V187M324 60V187" fill="none" stroke="#e8ecf6"/>
          <rect x="45" y="40" width="52" height="5" rx="2.5" fill="#20283e"/>
          <rect x="104" y="40" width="31" height="5" rx="2.5" fill="#d9dfef"/>
          <circle cx="315" cy="42" r="3" fill="#d6ef87"/><circle cx="327" cy="42" r="3" fill="#d9dfef"/>
          <path d="M45 153 73 146 100 156 129 121 157 130 185 99 214 112 242 90 270 105 298 79 327 92V187H45Z" fill="#eef1ff"/>
          <path d="M45 153 73 146 100 156 129 121 157 130 185 99 214 112 242 90 270 105 298 79 327 92" fill="none" stroke="#3458e8" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M45 131 91 135 138 125 185 140 232 129 279 143 327 130" fill="none" stroke="#d58b79" stroke-width="2" stroke-dasharray="4 5" stroke-linecap="round"/>
          <path d="M242 65V187" stroke="#8d9dc9" stroke-dasharray="3 5"/>
          <circle cx="242" cy="90" r="9" fill="#d6ef87"/><circle cx="242" cy="90" r="3.5" fill="#20283e"/>
          <rect x="45" y="202" width="43" height="4" rx="2" fill="#3458e8"/>
          <rect x="99" y="202" width="29" height="4" rx="2" fill="#d58b79"/>
          <rect x="290" y="199" width="37" height="10" rx="5" fill="#edf2df"/>
        </svg>
        <figcaption class="illustration-caption">Illustrative learning chart</figcaption>
      </figure>
    </section>
    <div class="metrics home-metrics">
      <div class="home-metric cash"><span class="metric-symbol" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 9h18m-6 5h2"/></svg></span>${metric('Virtual cash', rupiah(student.account.cash), 'Available for practice orders')}</div>
      <div class="home-metric lessons"><span class="metric-symbol" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v14m0-14C9 3 5 3 3 4v14c3-1 6-1 9 2 3-3 6-3 9-2V4c-2-1-6-1-9 2Z"/></svg></span>${metric('Lessons completed', done + ' / ' + courses.length, 'Learning Academy')}</div>
      <div class="home-metric xp"><span class="metric-symbol" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m13 3-8 11h6l-1 7 9-12h-6l1-6Z"/></svg></span>${metric('Learning XP', xpTotal() + ' XP', 'Academy milestones, quizzes and missions')}</div>
    </div>
    <section class="screen home-features" aria-labelledby="available-title">
      <div class="section-heading"><div><span class="section-index">Five ways to learn</span><h2 id="available-title">What’s on Vamm</h2><p>Select a feature in the left rail to get started.</p></div></div>
      <ul class="feature-overview">
        ${features.map(([key, description, kind], index) => `<li class="card feature-card" data-accent="${key}">
          <span class="feature-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><div class="feature-visual">${featureImage(key)}</div>
          <div class="feature-copy"><span class="feature-kind">${kind}</span><h3>${sections[key]}</h3><p>${description}</p></div>
        </li>`).join('')}
      </ul>
    </section>
  </div>`;
}

function unlockedLesson(id, track = activeAcademyTrack()) {
  if (!track) return false;
  const index = track.lessons.indexOf(id);
  return index >= 0 && (hasCompleted(id) || track.lessons.slice(0, index).every(hasCompleted));
}

function academyTrackMeta(track) {
  const minutes = sum(track.lessons.map(id => courseById(id).minutes));
  return `<div class="academy-course-meta">${chip(escape(track.level))}${chip(minutes + ' min')}${chip(track.lessons.length + ' lessons')}</div>`;
}

function academyCatalog() {
  const points = academyPoints();
  const nextMilestone = academyMilestones.find(milestone => milestone.points > points);
  return `<div class="screen academy-screen academy-catalog-view">
    ${heading('Learn at your pace', 'Learning Academy', 'Choose a course, follow its lessons, and earn milestones along the way.')}
    <p class="academy-points-note"><strong id="academy-points">${points}</strong> Academy points · ${completedAcademyCount()} lessons completed</p>
    <section class="academy-catalog" aria-labelledby="academy-courses-title">
      <div class="section-heading"><h2 id="academy-courses-title">Courses</h2><p>Start with the topic you want to understand.</p></div>
      <div class="academy-course-grid">${academyTracks.map(track => {
        const complete = track.lessons.filter(hasCompleted).length;
        const label = complete === track.lessons.length ? 'Review course' : complete ? 'Continue course' : 'Start course';
        return `<article class="card academy-course-card" data-academy-track="${escape(track.id)}" data-academy-art="${escape(track.art)}">
          <div class="academy-course-art" aria-hidden="true">${featureImage(track.art)}</div>
          <div class="academy-course-info">
            ${academyTrackMeta(track)}
            <h3>${escape(track.title)}</h3><p>${escape(track.description)}</p>
            <p class="academy-course-progress">${complete} of ${track.lessons.length} lessons complete</p>
            <progress aria-label="${escape(track.title + ' progress')}" max="${track.lessons.length}" value="${complete}">${complete} of ${track.lessons.length}</progress>
            <details class="academy-course-outline"><summary>Course outline</summary><ol>${track.lessons.map(id => {
              const lesson = courseById(id);
              const status = hasCompleted(id) ? 'Completed' : unlockedLesson(id, track) ? 'Available' : 'Locked';
              return `<li><span>${escape(lesson.title)}</span><small class="academy-outline-status">${lesson.minutes} min · ${status}</small></li>`;
            }).join('')}</ol></details>
            <button type="button" class="primary" data-course="${escape(track.id)}" aria-label="${escape(label + ': ' + track.title)}">${label}</button>
          </div>
        </article>`;
      }).join('')}</div>
    </section>
    <section class="card academy-milestones" aria-labelledby="academy-milestones-title">
      <h2 id="academy-milestones-title">Learning milestones</h2>
      <p>Earn ${academyPointsPerLesson} Academy points when you first complete a lesson. Each milestone adds its XP bonus automatically.</p>
      <p class="academy-next-reward">${nextMilestone ? 'Next reward at ' + nextMilestone.points + ' points · ' + nextMilestone.xp + ' XP' : 'All current milestone rewards earned'}</p>
      <ul class="academy-milestone-list">${academyMilestones.map(milestone => {
        const earned = points >= milestone.points;
        return `<li class="academy-milestone" data-milestone="${milestone.points}" data-state="${earned ? 'earned' : 'locked'}">
          <span class="academy-milestone-icon" aria-hidden="true">${earned ? '✓' : '◇'}</span>
          <strong class="academy-milestone-title">${escape(milestone.title)}</strong>
          <span class="academy-milestone-reward">${milestone.points} points · ${milestone.xp} XP</span>
          <span class="academy-milestone-status">${earned ? 'Earned' : 'Locked'}</span>
        </li>`;
      }).join('')}</ul>
    </section>
  </div>`;
}

function academy() {
  const track = activeAcademyTrack();
  if (!track) return academyCatalog();
  if (!unlockedLesson(lessonId, track)) {
    lessonId = track.lessons.find(id => !hasCompleted(id)) ?? track.lessons[0];
  }
  const course = courseById(lessonId);
  const complete = track.lessons.filter(hasCompleted).length;
  const points = academyPoints();
  const nextMilestone = academyMilestones.find(milestone => milestone.points > points);
  return `<div class="screen academy-screen academy-course-view" data-academy-track="${escape(track.id)}">
    <div class="academy-course-nav"><button type="button" data-action="all-courses"><span aria-hidden="true">←</span> All courses</button></div>
    <header class="academy-course-header">${heading('Learning Academy', escape(track.title), escape(track.description))}${academyTrackMeta(track)}</header>
    <section class="card academy-progress">
      <div class="row"><h2>Course progress</h2>${chip(complete + ' of ' + track.lessons.length + ' complete')}</div>
      <progress aria-label="${escape(track.title + ' progress')}" max="${track.lessons.length}" value="${complete}">${complete} of ${track.lessons.length}</progress>
      <p class="academy-points-note"><strong id="academy-points">${points}</strong> Academy points${nextMilestone ? ' · Next milestone at ' + nextMilestone.points + ' points' : ' · All current milestone rewards earned'}</p>
    </section>
    <div class="lesson-tabs" role="tablist" aria-label="Course lessons">
      ${track.lessons.map((id, index) => {
        const item = courseById(id);
        const selected = id === lessonId;
        const unlocked = unlockedLesson(id, track);
        return `<button role="tab" id="tab-${item.id}" aria-controls="lesson-panel" aria-selected="${selected}"
          tabindex="${selected ? 0 : -1}" data-lesson="${item.id}"${unlocked ? '' : ' disabled'}>
          <span class="tab-step" aria-hidden="true">${hasCompleted(item.id) ? '✓' : String(index + 1).padStart(2, '0')}</span>
          <span>${item.title}<small>${hasCompleted(item.id) ? 'Completed' : unlocked ? item.level : 'Complete earlier lessons to unlock'}</small></span>
        </button>`;
      }).join('')}
    </div>
    <section id="lesson-panel" role="tabpanel" aria-labelledby="tab-${course.id}">
      ${lessonView(course, track)}
    </section>
  </div>`;
}

function lessonView(course, track) {
  const index = track.lessons.indexOf(course.id);
  const isLast = index === track.lessons.length - 1;
  return `<article class="card prose lesson-content">
    <div class="lesson-intro"><span class="eyebrow">Lesson ${index + 1} of ${track.lessons.length} · ${course.minutes} min</span><h2 id="course-title" tabindex="-1">${escape(course.title)}</h2><p>${escape(course.description)}</p></div>
    <div class="lesson-opening">
      <section class="lesson-goals" aria-labelledby="lesson-goals-title"><h3 id="lesson-goals-title">In this lesson</h3><ul>${course.objectives.map(item => `<li>${escape(item)}</li>`).join('')}</ul></section>
      ${lessonVisual(course)}
    </div>
    <div class="lesson-sections">${course.sections.map(([title, body], index) => `<section class="lesson-section"><span class="lesson-section-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><div class="lesson-section-copy"><h3>${escape(title)}</h3><p>${escape(body)}</p></div></section>`).join('')}</div>
    <section class="lesson-takeaways" aria-labelledby="lesson-takeaways-title"><h3 id="lesson-takeaways-title">What to take with you</h3><ul>${course.takeaways.map(item => `<li>${escape(item)}</li>`).join('')}</ul></section>
    <aside class="lesson-watchout"><strong>Keep in mind</strong><p>${escape(course.watchout)}</p></aside>
    <details class="lesson-reflection"><summary><span class="eyebrow">Apply it yourself</span><span class="reflection-prompt">${escape(course.reflection.prompt)}</span><span class="reflection-reveal">Reveal a way to reason</span></summary><div class="reflection-answer"><strong>One way to reason</strong><p>${escape(course.reflection.answer)}</p></div></details>
    ${hasCompleted(course.id) ? `<p class="notice">${isLast ? 'Lesson complete. Review this course or choose another one.' : 'Lesson complete. The next lesson is ready when you are.'}</p>` : `<p>${isLast ? 'Mark the final lesson complete to record your progress.' : 'When the key ideas make sense, mark this lesson complete or continue to the next lesson.'}</p>`}
    <div class="actions lesson-actions">
      <button data-complete-lesson="${course.id}"${hasCompleted(course.id) ? ' disabled' : ''}>${hasCompleted(course.id) ? '✓ Lesson Complete' : 'Lesson Complete'}</button>
      ${isLast ? '<button type="button" data-action="all-courses">All courses</button>' : `<button class="primary" data-next-lesson="${course.id}">Next Lesson <span aria-hidden="true">→</span></button>`}
    </div>
    <section class="lesson-sources" aria-labelledby="lesson-sources-title">
      <div class="lesson-source-heading"><div><h3 id="lesson-sources-title">Learn from the source</h3><p>Reviewed <time datetime="${escape(course.reviewedOn)}">${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(course.reviewedOn))}</time></p></div></div>
      <div class="lesson-source-grid">${academySources[course.id].map(source => `<a class="lesson-source-card" href="${escape(source.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escape(source.title + ' — ' + source.publisher + ' (opens in a new tab)')}"><span class="source-publisher">${escape(source.publisher)}</span><strong>${escape(source.title)}</strong><span class="source-description">${escape(source.description)}</span><span class="source-latest">Open publisher page for the latest version <span aria-hidden="true">↗</span></span></a>`).join('')}</div>
      <details class="academy-resource-hubs"><summary>Keep learning with current sources</summary><p>Ongoing learning hubs from these publishers.</p>
        <div class="lesson-source-grid">${academyResources.map(source => `<a class="lesson-source-card" href="${escape(source.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escape(source.title + ' — ' + source.publisher + ' (opens in a new tab)')}"><span class="source-publisher">${escape(source.publisher)}</span><strong>${escape(source.title)}</strong><span class="source-description">${escape(source.description)}</span><span class="source-latest">Open publisher page for the latest version <span aria-hidden="true">↗</span></span></a>`).join('')}</div>
      </details>
    </section>
  </article>`;
}

function lessonVisual(course) {
  const { kind, title, caption } = course.visual;
  let diagram;
  switch (kind) {
    case 'stocks':
      diagram = `<div class="diagram-grid ownership-diagram"><div class="ownership-grid" aria-hidden="true">${Array.from({ length: 100 }, (_, index) => `<span${index === 0 ? ' class="is-owned"' : ''}></span>`).join('')}</div><div class="ownership-key"><span class="diagram-label">Your ownership</span><strong class="diagram-value">1 of 100 shares</strong><span class="diagram-result">1%</span><p class="diagram-note">Each square represents one equal share.</p></div></div>`;
      break;
    case 'prices':
      diagram = `<div class="diagram-grid order-flow"><div class="diagram-cell"><span class="diagram-label">Buyer · bid</span><strong class="diagram-value">${rupiah(990)}</strong><span class="diagram-note">A quoted buying price</span></div><div class="diagram-arrow" aria-hidden="true">↔</div><div class="diagram-cell"><span class="diagram-label">Seller · ask</span><strong class="diagram-value">${rupiah(1010)}</strong><span class="diagram-note">A quoted selling price</span></div></div><div class="diagram-result"><span class="diagram-label">Ask − bid = spread</span><strong>${rupiah(20)} per share</strong></div><p class="diagram-note">A trade needs matching orders. The displayed quote can change before execution.</p>`;
      break;
    case 'returns':
      diagram = `<div class="diagram-grid returns-equation"><div class="diagram-cell"><span class="diagram-label">Sale − purchase</span><strong class="diagram-value">${rupiah(200)}</strong><span class="diagram-note">${rupiah(2200)} − ${rupiah(2000)}</span></div><span class="diagram-arrow" aria-hidden="true">+</span><div class="diagram-cell"><span class="diagram-label">Dividend received</span><strong class="diagram-value">${rupiah(50)}</strong></div><span class="diagram-arrow" aria-hidden="true">−</span><div class="diagram-cell"><span class="diagram-label">Total costs</span><strong class="diagram-value">${rupiah(20)}</strong></div></div><div class="diagram-result"><span class="diagram-label">Net gain before tax</span><strong>${rupiah(230)}</strong></div>`;
      break;
    case 'risk':
      diagram = `<svg class="lesson-diagram" viewBox="0 0 640 280" role="img" aria-label="${escape(caption)}" font-family="inherit" font-size="16" fill="#27334b"><rect x="365" y="38" width="238" height="180" rx="12" fill="#eef1f7"/><path d="M52 220H605M52 48V220" fill="none" stroke="#8a95aa"/><text x="52" y="26" font-size="17" font-weight="600">Illustrative price</text><path d="M54 78 110 92 166 85 222 122 278 156 334 180" fill="none" stroke="#3458e8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M334 44V220" stroke="#b5634f" stroke-width="2" stroke-dasharray="5 5"/><circle cx="334" cy="180" r="7" fill="#b5634f"/><text x="323" y="32" text-anchor="end" fill="#914c3d">Cash needed</text><text x="484" y="100" text-anchor="middle" font-size="28" font-weight="600">?</text><text x="484" y="137" text-anchor="middle">Future price unknown</text><text x="484" y="166" text-anchor="middle">Recovery is not assumed</text><text x="52" y="251">Money invested</text><text x="334" y="251" text-anchor="middle">Cash deadline</text><text x="605" y="251" text-anchor="end">Time →</text></svg>`;
      break;
    case 'diversification':
      diagram = `<div class="allocation-stack" aria-hidden="true"><span style="width:50%">50%</span><span style="width:30%">30%</span><span style="width:20%">20%</span></div><ul class="allocation-key"><li><span>Technology</span><strong>50%</strong></li><li><span>Consumer goods</span><strong>30%</strong></li><li><span>Energy</span><strong>20%</strong></li></ul><p class="diagram-note">Half the investment still depends on one sector.</p>`;
      break;
    case 'fundamentals':
      diagram = `<div class="diagram-grid fundamentals-flow"><div class="diagram-cell"><span class="diagram-label">Revenue</span><strong class="diagram-value">${rupiah(1000000)}</strong></div><span class="diagram-arrow" aria-hidden="true">−</span><div class="diagram-cell"><span class="diagram-label">Total expenses</span><strong class="diagram-value">${rupiah(800000)}</strong></div><span class="diagram-arrow" aria-hidden="true">=</span><div class="diagram-cell"><span class="diagram-label">Earnings</span><strong class="diagram-value">${rupiah(200000)}</strong></div></div><div class="ratio-equation"><span class="diagram-label">Separate P/E example</span><strong>${rupiah(2000)} price ÷ ${rupiah(100)} EPS = 20×</strong></div>`;
      break;
    case 'technical':
      diagram = `<svg class="lesson-diagram" viewBox="0 0 640 280" role="img" aria-label="${escape(caption)}" font-family="inherit" font-size="16" fill="#27334b"><rect x="58" y="36" width="546" height="112" rx="8" fill="#eef1ff"/><rect x="58" y="169" width="546" height="76" rx="8" fill="#eff3e9"/><text x="62" y="24" font-size="17" font-weight="600">Price · illustrative units</text><path d="M95 124 161 104 227 115 293 69 359 88 425 59 491 77 557 51" fill="none" stroke="#3458e8" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><text x="62" y="166" font-weight="600">Volume · shares traded</text><g fill="#778f4b"><rect x="76" y="203" width="38" height="35"/><rect x="142" y="186" width="38" height="52"/><rect x="208" y="198" width="38" height="40"/><rect x="274" y="177" width="38" height="61"/><rect x="340" y="211" width="38" height="27"/><rect x="406" y="193" width="38" height="45"/><rect x="472" y="217" width="38" height="21"/><rect x="538" y="200" width="38" height="38"/></g><text x="62" y="270">Earlier</text><text x="333" y="270" text-anchor="middle">Same observed time window</text><text x="600" y="270" text-anchor="end">Later</text></svg>`;
      break;
    case 'compounding':
    case 'inflation':
    case 'costs': {
      const bars = course.example.bars;
      const max = Math.max(...bars.map(([, value]) => value));
      diagram = `<div class="academy-lesson-bars">${bars.map(([label, value, display]) => `<div class="bar-row"><span>${escape(label)}</span><div class="bar" aria-hidden="true"><span style="--bar-size:${100 * value / max}%"></span></div><strong>${escape(display)}</strong></div>`).join('')}</div>`;
      break;
    }
  }
  const timeseries = kind === 'risk' || kind === 'technical';
  return `<figure class="lesson-visual" data-visual-kind="${escape(kind)}" aria-labelledby="visual-${course.id}"><div class="lesson-visual-heading"><span class="eyebrow">See the idea</span><h3 id="visual-${course.id}">${escape(title)}</h3></div><div class="lesson-visual-frame${timeseries ? ' diagram-timeseries' : ''}"${timeseries ? ' tabindex="0" role="region" aria-label="Scrollable lesson diagram"' : ` role="img" aria-label="${escape(caption)}"`}>${diagram}</div>${timeseries ? '<p class="diagram-scroll-hint">Swipe or use arrow keys to explore the diagram.</p>' : ''}<figcaption class="chart-caption">${escape(caption)}</figcaption></figure>`;
}

function lineChart(values, label, tickFormat, eventIndex = null, timeLabel = 'Day') {
  const low = Math.min(...values);
  const high = Math.max(...values);
  const gap = Math.max((high - low) * .12, high * .003, 1);
  const min = low - gap;
  const max = high + gap;
  const y = value => 147 - (value - min) * 117 / (max - min);
  const x = index => 75 + index * 466 / Math.max(values.length - 1, 1);
  const points = values.map((value, index) => `${x(index)},${y(value)}`).join(' ');
  const last = values.length - 1;
  const color = values[last] >= values[0] ? '#2a7a55' : '#a44636';
  const labels = [min, (min + max) / 2, max];
  return `<svg class="chart" viewBox="0 0 558 178" role="img" aria-label="${escape(label)}">
    <defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${color}" stop-opacity=".22"/><stop offset="1" stop-color="${color}" stop-opacity=".02"/></linearGradient></defs>
    ${labels.map(value => `<path d="M75 ${y(value)}H541" stroke="#e2e9e1"/><text x="67" y="${y(value) + 4}" text-anchor="end" fill="#52655b" font-size="12">${tickFormat(value)}</text>`).join('')}
    <polygon points="75,147 ${points} ${x(last)},147" fill="url(#chart-fill)"/>
    ${eventIndex === null ? '' : `<path d="M${x(eventIndex)} 26V147" stroke="#5b7063" stroke-dasharray="4 4"/><text x="${x(eventIndex)}" y="18" text-anchor="middle" fill="#52655b" font-size="12">Event · day ${eventIndex + 1}</text>`}
    <polyline points="${points}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${x(last)}" cy="${y(values[last])}" r="4.5" fill="${color}" stroke="white" stroke-width="2"/>
    <text x="75" y="168" fill="#52655b" font-size="12">${timeLabel} 1</text><text x="541" y="168" text-anchor="end" fill="#52655b" font-size="12">${timeLabel} ${values.length}</text>
  </svg>`;
}

function marketScreen() {
  const views = { tradingview: tradingViewScreen, stocks: stockMarket, portfolio: portfolioView };
  return `<div class="screen market-screen">
    ${heading('Practice Workspace', 'Market &amp; Simulator', 'Use the sidebar to explore Real Market, place virtual orders in Simulator, or review Portfolio.')}
    ${views[marketView]()}
  </div>`;
}

function tradingViewScreen() {
  return `<section class="card tradingview-card">
    <div class="row"><div><p class="eyebrow">TradingView · Daily candles</p><h2>Real Market</h2></div>${chip('External chart', 'neutral')}</div>
    <p>The chart starts with NASDAQ:AAPL. Use its symbol selector to view another company. TradingView quotes may be delayed, and the selected instrument determines the chart currency.</p>
    <div class="live-chart-frame">
      <tv-advanced-chart symbol="NASDAQ:AAPL" interval="1D" theme="dark" allow-symbol-change></tv-advanced-chart>
      <p class="live-chart-status" role="status">Loading the TradingView chart…</p>
    </div>
    <div class="row"><p><small>Simulator orders use generated demo execution prices. TradingView supplies this independent external chart.</small></p><a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer">Charts by TradingView<span class="sr"> (opens in a new tab)</span></a></div>
  </section>`;
}

function demoQuoteTick(account) {
  const tick = account.quoteTick === undefined ? 0 : account.quoteTick;
  return Number.isSafeInteger(tick) && tick >= 0 ? tick : null;
}

function demoQuotesAvailable(account) {
  const tick = demoQuoteTick(account);
  return tick !== null && tick < Number.MAX_SAFE_INTEGER
    && (account.quoteUpdatedAt === undefined || (account.quoteUpdatedAt === null && tick === 0)
      || (Number.isSafeInteger(account.quoteUpdatedAt) && account.quoteUpdatedAt >= 0
        && account.quoteUpdatedAt <= Date.now() && Number.isFinite(new Date(account.quoteUpdatedAt).getTime())))
    && stocks.every(stock => quotePrice(account, stock) !== null && quoteSeries(account, stock).length > 0);
}

function demoQuoteStatus() {
  const account = student.account;
  if (!demoQuotesAvailable(account)) return 'Demo quote data is unavailable. Orders are paused; stored data has been kept.';
  const updated = account.quoteUpdatedAt ? new Intl.DateTimeFormat('en', { timeStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(account.quoteUpdatedAt) + ' WIB' : 'initial quote';
  return `Simulated stream / Demo source · Quote ${demoQuoteTick(account)} · ${updated}`;
}

function demoQuoteNotice() {
  const available = demoQuotesAvailable(student.account);
  return `<p id="demo-quote-status" class="${available ? 'chart-caption' : 'error'}" role="${available ? 'status' : 'alert'}" aria-live="${available ? 'off' : 'assertive'}">${demoQuoteStatus()}</p>`;
}

function dailyChange(stock) {
  const values = quoteSeries(student.account, stock);
  if (!values.length || quotePrice(student.account, stock) === null) return null;
  if (values.length === 1) return 0;
  return (values.at(-1) - values.at(-2)) / values.at(-2);
}

function stockChart(stock) {
  const values = quoteSeries(student.account, stock);
  if (!values.length || quotePrice(student.account, stock) === null) return '<p class="error">Demo chart data is unavailable. Stored holdings and trades have been kept.</p>';
  const description = `${stock.name} · Generated educational price history from ${rupiah(values[0])} to ${rupiah(values.at(-1))} across ${values.length} quotes. Rolling history keeps up to 60 quotes.`;
  return `${lineChart(values, description, rupiah, null, 'Quote')}<figcaption class="chart-caption">${description}</figcaption>`;
}

function stockRows() {
  const q = stockSearch.trim().toLowerCase();
  const results = stocks.filter(item => [item.ticker, item.name, item.sector].some(value => value.toLowerCase().includes(q)));
  if (!results.length) return '<tr><td colspan="3">No stocks match that search.</td></tr>';
  return results.map(stock => `<tr>
    <th scope="row"><button class="table-link" data-stock="${stock.ticker}"${stock.ticker === ticker ? ' aria-current="true"' : ''}>${stock.ticker}</button><br><small>${stock.name}</small></th>
    <td data-demo-price="${stock.ticker}">${rupiah(quotePrice(student.account, stock))}</td>
    <td data-demo-change="${stock.ticker}">${gainText(dailyChange(stock), percent)}</td>
  </tr>`).join('');
}

function stockMarket() {
  return `<section class="card market-summary">
    <div class="row">
      <div><p class="eyebrow">Simulated stream / Demo execution prices</p><h2>Simulator</h2></div>${chip('Generated demo quotes', 'neutral')}
    </div>
    <p>Fictional companies · Virtual IDR. Generated demo prices update every 5 seconds while Simulator or Portfolio is visible. Orders use these generated demo prices.</p>
    ${demoQuoteNotice()}
  </section>
  <div class="split equal market-grid">
    <section class="card stock-directory">
      <h2>Find a stock</h2>
      <label class="field" for="stock-search"><span class="sr">Search by company name, ticker, or sector</span>
        <input type="search" id="stock-search" value="${escape(stockSearch)}" placeholder="Search name or ticker">
      </label>
      <div class="table-wrap"><table><caption class="sr">Fictional stocks and demo execution prices</caption><thead><tr><th scope="col">Company</th><th scope="col">Demo price</th><th scope="col">Latest move</th></tr></thead><tbody id="stock-rows">${stockRows()}</tbody></table></div>
    </section>
    ${stockDetail(stockByTicker(ticker))}
  </div>`;
}

function stockDetail(stock) {
  const { account } = student;
  const current = quotePrice(account, stock);
  const available = demoQuotesAvailable(account);
  return `<section class="card trade-panel">
    <div class="row"><div><p class="eyebrow">${stock.ticker} · ${stock.sector}</p><h2 id="stock-title" tabindex="-1">${stock.name}</h2></div>${chip('Demo prices')}</div>
    <p>${stock.description}</p>
    <div class="row stock-price-row"><strong id="stock-price">Demo price ${rupiah(current)} per share</strong><span id="stock-change">${gainText(dailyChange(stock), percent)}</span></div>
    <figure id="stock-chart">${stockChart(stock)}</figure>
    <p class="sample-financials"><small>Sample financials · EPS ${rupiah(stock.eps)} · P/E <span id="stock-pe">${current === null ? 'Unavailable' : (current / stock.eps).toFixed(1) + '×'}</span> · Dividend per share ${rupiah(stock.dividend)}</small></p>
    <form id="trade-form" class="screen order-form" data-quote-tick="${demoQuoteTick(account) ?? ''}" data-quote-price="${current ?? ''}">
      <fieldset class="screen">
        <legend>Place a virtual order</legend>
        <p><small>Orders use the demo price shown above and update your virtual account.</small></p>
        <p id="trade-balance"><small>Cash available ${rupiah(account.cash)} · Shares owned ${account.holdings[stock.ticker]?.quantity ?? 0}</small></p>
        <label class="field" for="trade-quantity">Shares<input id="trade-quantity" name="quantity" type="number" required min="1" step="1" inputmode="numeric" value="1"></label>
        <output id="trade-estimate" for="trade-quantity" class="chart-caption">${available ? 'Demo order value ' + rupiah(current) : 'Demo quote unavailable. Orders are paused.'}</output>
        <p class="error" id="trade-error" role="alert"></p>
        <div class="actions order-actions">
          <button class="primary" name="side" value="buy"${available ? '' : ' disabled'}>Buy virtually</button>
          <button name="side" value="sell"${available ? '' : ' disabled'}>Sell virtually</button>
        </div>
      </fieldset>
    </form>
    <p id="trade-result" class="notice" hidden></p>
  </section>`;
}

function portfolioView() {
  const { account } = student;
  const summary = portfolio(account);
  const allocation = [...new Set(summary.positions.map(item => item.stock.sector))].map(sector => [
    sector, summary.total === null ? null : sum(summary.positions.filter(item => item.stock.sector === sector).map(item => item.value)),
  ]);
  allocation.push(['Cash', account.cash]);
  return `<p class="notice">Simulated stream / Demo execution prices. Portfolio values and P&amp;L update with generated demo prices every 5 seconds while this view is visible. TradingView market data is separate.</p>
  ${demoQuoteNotice()}
  <div class="metrics portfolio-metrics">
    ${metric('Portfolio value', rupiah(summary.total), 'Started at ' + rupiah(startingCash), 'portfolio-total')}
    ${metric('Virtual cash', rupiah(account.cash), 'Available for practice orders', 'portfolio-cash')}
    ${metric('Total virtual return', gainText(summary.gain), signed(summary.gain == null ? null : summary.gain / startingCash, percent), 'portfolio-gain')}
  </div>
  <div class="split">
    <section class="card holdings-panel">
      <div class="row"><h2>Your holdings</h2>${chip(summary.sectors + (summary.sectors === 1 ? ' sector' : ' sectors'))}</div>
      ${summary.positions.length ? `<div class="table-wrap"><table><thead><tr>
        <th scope="col">Stock</th><th scope="col">Shares</th><th scope="col">Value</th><th scope="col">Unrealized gain</th>
      </tr></thead><tbody>${summary.positions.map(item => `<tr>
        <th scope="row"><button class="table-link" data-stock="${item.stock.ticker}">${item.stock.ticker}</button><br><small>${item.stock.sector}</small></th>
        <td>${item.quantity}</td><td data-holding-value="${item.stock.ticker}">${rupiah(item.value)}</td><td data-holding-gain="${item.stock.ticker}">${gainText(item.gain)}</td>
      </tr>`).join('')}</tbody></table></div>` : '<p class="empty">Your first virtual purchase will appear here.</p>'}
      <div class="actions"><button data-mentor="Review my virtual portfolio">Review with Mentor</button></div>
    </section>
    <section class="card allocation-panel"><h2>Asset allocation</h2><p>Share of total portfolio value, including virtual cash.</p>
      ${allocation.map(([name, value]) => {
        const portion = summary.total === null ? null : value / summary.total;
        return `<div class="bar-row" data-portfolio-sector="${escape(name)}"><span>${name}</span><div class="bar" aria-hidden="true"><span style="--bar-size:${portion === null ? 0 : portion * 100}%"></span></div><strong>${percent(portion)}</strong></div>`;
      }).join('')}
    </section>
  </div>
  ${transactionHistory(account.trades)}`;
}

function transactionHistory(trades) {
  const pages = Math.max(1, Math.ceil(trades.length / historyPageSize));
  historyPage = Math.max(0, Math.min(historyPage, pages - 1));
  const start = historyPage * historyPageSize;
  const end = Math.min(start + historyPageSize, trades.length);
  return `<section class="card history-panel" id="transaction-history">
    <h2>Transaction history</h2>
    ${trades.length ? `<div class="table-wrap"><table><caption class="sr">Completed virtual transactions</caption><thead><tr>
      <th scope="col">Date</th><th scope="col">Order</th><th scope="col">Shares</th><th scope="col">Demo price</th><th scope="col">Total</th>
    </tr></thead><tbody id="history-rows">${trades.slice(start, end).map(item => `<tr>
      <td>${date(item.timestamp)} · ${item.quoteTick === undefined ? 'Day ' + (item.day + 1) : 'Demo quote ' + item.quoteTick}</td><th scope="row">${item.side === 'buy' ? 'Buy' : 'Sell'} ${escape(item.ticker)}</th>
      <td>${item.quantity}</td><td>${rupiah(item.price)}</td><td>${rupiah(item.value)}</td>
    </tr>`).join('')}</tbody></table></div>` : '<p class="empty">Your virtual orders will appear here after you place a trade.</p>'}
    <div class="history-pagination">
      <label class="history-page-size" for="history-page-size">Rows per page<select id="history-page-size">${[10, 20, 50].map(size => `<option value="${size}"${size === historyPageSize ? ' selected' : ''}>${size}</option>`).join('')}</select></label>
      <p class="history-page-info" id="history-page-info" role="status" aria-live="polite" tabindex="-1">Showing ${trades.length ? start + 1 : 0}–${end} of ${trades.length} transactions</p>
      <div class="history-page-actions"><button type="button" data-action="history-previous" aria-controls="transaction-history"${historyPage === 0 ? ' disabled' : ''}>Previous</button><button type="button" data-action="history-next" aria-controls="transaction-history"${historyPage >= pages - 1 ? ' disabled' : ''}>Next</button></div>
    </div>
  </section>`;
}

function refreshTransactionHistory(selector) {
  const history = main.querySelector('#transaction-history');
  if (!history) return;
  history.outerHTML = transactionHistory(student.account.trades);
  const target = main.querySelector(selector);
  (target?.disabled ? main.querySelector('#history-page-info') : target)?.focus({ preventScroll: true });
}

function updateTradeEstimate() {
  const input = main.querySelector('#trade-quantity');
  if (!input) return;
  const price = quotePrice(student.account, stockByTicker(ticker));
  const available = demoQuotesAvailable(student.account);
  const quantity = input.valueAsNumber;
  const value = price === null ? null : price * quantity;
  main.querySelector('#trade-estimate').textContent = !available
    ? 'Demo quote unavailable. Orders are paused.'
    : Number.isSafeInteger(quantity) && quantity > 0 && Number.isSafeInteger(value)
      ? 'Demo order value ' + rupiah(value) : 'Enter a whole number of shares with a safe order value.';
  main.querySelectorAll('#trade-form button').forEach(button => { button.disabled = !available; });
}

function refreshDemoQuotes() {
  const status = main.querySelector('#demo-quote-status');
  if (!status) return;
  const account = student.account;
  const available = demoQuotesAvailable(account);
  status.className = available ? 'chart-caption' : 'error';
  status.setAttribute('role', available ? 'status' : 'alert');
  status.setAttribute('aria-live', available ? 'off' : 'assertive');
  status.textContent = demoQuoteStatus();
  if (marketView === 'stocks') {
    main.querySelectorAll('[data-demo-price]').forEach(cell => {
      cell.textContent = rupiah(quotePrice(account, stockByTicker(cell.dataset.demoPrice)));
    });
    main.querySelectorAll('[data-demo-change]').forEach(cell => {
      cell.innerHTML = gainText(dailyChange(stockByTicker(cell.dataset.demoChange)), percent);
    });
    const stock = stockByTicker(ticker);
    const price = quotePrice(account, stock);
    main.querySelector('#stock-price').textContent = 'Demo price ' + rupiah(price) + ' per share';
    main.querySelector('#stock-change').innerHTML = gainText(dailyChange(stock), percent);
    main.querySelector('#stock-chart').innerHTML = stockChart(stock);
    main.querySelector('#stock-pe').textContent = price === null ? 'Unavailable' : (price / stock.eps).toFixed(1) + '×';
    main.querySelector('#trade-balance small').textContent = `Cash available ${rupiah(account.cash)} · Shares owned ${account.holdings[stock.ticker]?.quantity ?? 0}`;
    const form = main.querySelector('#trade-form');
    form.dataset.quoteTick = demoQuoteTick(account) ?? '';
    form.dataset.quotePrice = price ?? '';
    updateTradeEstimate();
  } else if (marketView === 'portfolio') {
    const summary = portfolio(account);
    main.querySelector('#portfolio-total').textContent = rupiah(summary.total);
    main.querySelector('#portfolio-cash').textContent = rupiah(account.cash);
    main.querySelector('#portfolio-gain').innerHTML = gainText(summary.gain);
    main.querySelector('#portfolio-gain-detail').textContent = signed(summary.gain == null ? null : summary.gain / startingCash, percent);
    main.querySelectorAll('[data-holding-value]').forEach(cell => {
      cell.textContent = rupiah(summary.positions.find(item => item.stock.ticker === cell.dataset.holdingValue)?.value);
    });
    main.querySelectorAll('[data-holding-gain]').forEach(cell => {
      cell.innerHTML = gainText(summary.positions.find(item => item.stock.ticker === cell.dataset.holdingGain)?.gain);
    });
    main.querySelectorAll('[data-portfolio-sector]').forEach(row => {
      const sector = row.dataset.portfolioSector;
      const value = summary.total === null ? null : sector === 'Cash' ? account.cash : sum(summary.positions.filter(item => item.stock.sector === sector).map(item => item.value));
      const portion = summary.total === null ? null : value / summary.total;
      row.querySelector('.bar span').style.setProperty('--bar-size', (portion === null ? 0 : portion * 100) + '%');
      row.querySelector('strong').textContent = percent(portion);
    });
  }
}

function createJourney(example = false) {
  const record = {
    id: idForSession(), kind: 'sim', title: example ? 'Example · First allowance' : 'Life-stage simulation', messages: [],
    sim: { allowance: example ? 50 : 25, weights: example ? [40, 20, 40] : [50, 20, 30], month: 0, balances: [0, 0, 0], timeline: [] },
  };
  return example ? stepJourney(record, record.sim, 12) : record;
}

function stepJourney(record, plan, months) {
  const { balances, ...entry } = advance(plan, months);
  return saveSession({ ...record, sim: { ...plan, balances, month: entry.month, timeline: [...plan.timeline, entry] } });
}

function lifeEvent(event) {
  const limit = event.amount !== event.impact ? ` (modeled expense ${credits(-event.amount)}, limited to available funds)` : '';
  return `${event.name} · ${signed(event.impact, credits)}${limit}`;
}

function journeySummary(record) {
  const entry = record?.sim.timeline.at(-1);
  if (!entry) return 'Advance the timeline to compare your balance with its buying power after inflation.';
  const impacts = entry.impacts.length ? entry.impacts.map(lifeEvent).join('. ') + '.' : 'No life event occurred in this step.';
  return `You added ${credits(entry.contributions)} in allowance. Growth added ${credits(entry.growth)}. ${impacts} Your balance of ${credits(entry.nominal)} has the buying power of ${credits(entry.real)} at starting prices.`;
}

function journeyView() {
  const saved = sessions.filter(item => item.kind === 'sim');
  const sim = journey?.sim;
  const latest = sim?.timeline.at(-1);
  return `<section class="card">
    <div class="row"><div><p class="eyebrow">Modeled results · Fictional credits</p><h2>Life-stage lab</h2></div>
      <div class="actions"><button data-action="journey-start">Start a simulation</button><button data-action="journey-example">Try an example</button></div>
    </div>
    <p>Explore how compounding, inflation, and life events can affect your buying power.</p>
    ${saved.length ? `<details><summary>Saved simulations</summary><div class="actions">
      ${saved.map(item => `<button data-journey="${escape(item.id)}" aria-pressed="${item.id === journey?.id}">${escape(item.title)} · Month ${item.sim.month}</button>`).join('')}
    </div></details>` : ''}
  </section>
  ${sim ? `<section class="card">
    <h2>Plan your next step</h2>
    <form id="journey-form" class="screen">
      <label class="field">Monthly allowance (credits)<input name="allowance" type="number" min="0" max="10000" step=".01" required value="${sim.allowance}"></label>
      <fieldset><legend>Allocation (must total 100%)</legend><div class="fields">
        ${assets.map((asset, index) => `<label>${asset} (%)<input name="weight" type="number" required min="0" max="100" step="1" value="${sim.weights[index]}"></label>`).join('')}
      </div></fieldset>
      <p id="journey-error" class="error" role="alert"></p>
      <div class="actions"><button class="primary" name="months" value="6">Advance 6 months</button><button name="months" value="12">Advance 1 year</button></div>
      <p><small>Fixed annual demo rates · ${assets.map((asset, index) => asset + ' ' + percent(annualRates[index])).join(' · ')} · Inflation ${percent(inflation)}</small></p>
    </form>
  </section>
  <section class="card"><div class="row"><h2>${stageAt(sim.month)}</h2>${chip('Month ' + sim.month)}</div>
    <div class="metrics">${metric('Nominal balance', credits(latest?.nominal ?? 0))}${metric('In starting prices', credits(latest?.real ?? 0))}</div>
    <p>${assets.map((asset, index) => asset + ' ' + credits(sim.balances[index])).join(' · ')}</p>
    <p>${journeySummary(journey)}</p>
    <div class="actions"><button data-mentor="Explain my life-stage result">Discuss with Mentor</button></div>
  </section>
  <section class="card"><h2>Timeline</h2>
    ${latest ? `<div class="table-wrap"><table><thead><tr><th scope="col">Month / stage</th><th scope="col">Nominal</th><th scope="col">In starting prices</th><th scope="col">Life event</th></tr></thead><tbody>
      ${sim.timeline.map(item => `<tr><th scope="row">${item.month} · ${stageAt(item.month)}</th><td>${credits(item.nominal)}</td><td>${credits(item.real)}</td><td>${item.impacts.map(lifeEvent).join('<br>') || 'No event'}</td></tr>`).join('')}
    </tbody></table></div>` : '<p>Your timeline starts when you advance the simulation.</p>'}
  </section>
  ${journey.messages.length ? `<section class="card"><h2>Saved reflections</h2><div class="log">${messageBubbles(journey.messages)}</div></section>` : ''}` : ''}`;
}

function scenarioResult() {
  return market(scenario.asset, scenario.event, scenario.range);
}

function scenarioExplanation(result) {
  const direction = result.change > 0 ? 'rise' : 'fall';
  return `${result.scenario.cause} The model assumes a ${percent(Math.abs(result.change))} price ${direction} for ${result.asset.name}. A sample portfolio with ${result.shares} shares changes by ${signed(result.impact, credits)}.`;
}

function scenariosView() {
  const result = scenarioResult();
  const choices = (items, key) => items.map(([value, label]) => `<button data-scenario="${key}" data-value="${value}" aria-pressed="${scenario[key] === value}">${label}</button>`).join('');
  const values = Array.from({ length: scenario.range }, (_, index) => index < result.eventDay - 1 ? result.asset.price : result.end);
  return `<section class="card">
    <div><p class="eyebrow">Standalone scenario · Fictional credits</p><h2>Explore a price shock</h2></div>
    <p>Change the event and see how the sample portfolio reacts. The practice trading account has its own market prices.</p>
    <div class="actions" aria-label="Select asset">${choices(watchlist.map((item, index) => [index, item.name]), 'asset')}</div>
    <div class="actions" aria-label="Select event">${choices(scenarios.map((item, index) => [index, item.name]), 'event')}</div>
    <div class="actions" aria-label="Select chart range">${choices([[30, '30 days'], [90, '90 days']], 'range')}</div>
  </section>
  <section class="card"><div class="row"><h2>${result.asset.name}</h2>${chip('Simulated prices')}</div>
    <figure>${lineChart(values, `${result.asset.name} from ${credits(result.asset.price)} to ${credits(result.end)} after ${result.scenario.event}`, value => creditFormat.format(value), result.eventDay - 1)}
      <figcaption class="chart-caption">Day ${result.eventDay} · ${result.scenario.event} · ${signed(result.change, percent)}</figcaption>
    </figure>
    <p>${scenarioExplanation(result)}</p>
    <p>Reflection · Would this change matter differently if you needed the money next week?</p>
    <div class="actions"><button data-mentor="Explain the simulated market scenario">Discuss with Mentor</button></div>
  </section>
  <div class="metrics">
    ${metric('Sample starting funds', credits(result.startingFunds))}
    ${metric('Sample cash balance', credits(result.cash))}
    ${metric('Sample portfolio', credits(result.total), signed(result.impact, credits))}
  </div>`;
}


function missionStatus(item) {
  if (student.rewards.includes(item.id)) return 'Completed';
  if (item.quiz) {
    const required = quizById(item.quiz).questions.length;
    if (bestScore(item.quiz) === required) return 'Ready to claim';
    return Object.hasOwn(student.quizResults, item.quiz) ? 'In progress' : 'Available';
  }
  const { sectors } = portfolio(student.account);
  if (sectors >= 3) return 'Ready to claim';
  return sectors ? 'In progress' : 'Available';
}

function missionsScreen() {
  const active = quizRoute();
  if (active) return quizScreen(active);
  if (location.hash !== '#missions') return quizCenter();
  return `<div class="screen missions-screen">
    ${heading('Practice and progress', 'Missions &amp; Challenges', 'Build investing skills with quizzes and virtual portfolio challenges.')}
    <div class="actions"><button type="button" class="primary" data-mission-tab="quizzes">Open Quiz Center</button></div>
    ${missionDashboard()}
  </div>`;
}

function missionDashboard() {
  const { sectors } = portfolio(student.account);
  const visible = challenges.filter(item => !item.quiz || ['Ready to claim', 'Completed'].includes(missionStatus(item)));
  return `<div class="metrics">
    ${metric('Learning XP', xpTotal() + ' XP', 'Academy milestones, quizzes and missions')}
    ${metric('Missions completed', student.rewards.length)}
    ${metric('Quiz packs passed', quizPacks.filter(pack => quizRecord(pack.id).rewardEarned).length + ' / ' + quizPacks.length)}
  </div>
  <div class="split equal">
    ${visible.map(item => {
      const status = missionStatus(item);
      return `<article class="card mission-card">
        <div class="row">${chip(status, status === 'Ready to claim' ? 'gold' : '')}<small>+${item.reward} XP</small></div>
        <h2>${item.title}</h2><p>${item.description}</p>
        ${item.id === 'diversifier' ? `<p class="progress-line"><progress max="3" value="${Math.min(sectors, 3)}" aria-label="Sectors in portfolio"></progress><span>${Math.min(sectors, 3)} of 3 sectors</span></p>` : ''}
        <div class="actions">
          ${status === 'Ready to claim' ? `<button class="primary" data-claim="${item.id}">Claim ${item.reward} XP</button>` : ''}
          ${item.quiz ? `<button data-quiz="${legacyQuizPacks[item.quiz]}">Practice again</button>` : '<button data-market-tab="stocks">Open simulator</button>'}
        </div>
      </article>`;
    }).join('')}
  </div>`;
}

function readQuizRecords() {
  try {
    const records = JSON.parse(localStorage.getItem(quizProgressKey)) ?? {};
    if (typeof records === 'object' && !Array.isArray(records)) return records;
  } catch {
    // Keep the confirmed in-memory snapshot if browser storage is unavailable.
  }
  memoryOnly.add(quizProgressKey);
  return null;
}

function quizRecord(id, records = quizRecords) {
  const record = records[id] ?? {};
  const attemptCount = Number.isSafeInteger(record.attemptCount) && record.attemptCount >= 0 ? record.attemptCount : 0;
  const best = Number.isInteger(record.bestScore) && record.bestScore >= 0 && record.bestScore <= 100 ? record.bestScore : 0;
  return { draft: record.draft ?? null, last: record.last ?? null, bestScore: best, attemptCount,
    rewardEarned: record.rewardEarned === true && best >= 80 && attemptCount > 0 };
}

function restoreQuizAttempt(raw) {
  if (raw?.version !== 1 || typeof raw.id !== 'string' || !raw.id || !['openai', 'reviewed'].includes(raw.source)) return null;
  const questions = validateQuizQuestions(raw.questions, raw.questions?.length);
  if (!questions || !Array.isArray(raw.answers) || raw.answers.length !== questions.length
    || !Number.isInteger(raw.index) || raw.index < 0 || raw.index >= questions.length
    || !raw.answers.every((answer, index) => answer === null || (Number.isInteger(answer) && answer >= 0 && answer < questions[index].choices.length))) return null;
  return { id: raw.id, version: 1, questions, answers: raw.answers, index: raw.index, source: raw.source };
}

function quizDraft(id) {
  return unsavedQuizDrafts.get(id)?.attempt ?? restoreQuizAttempt(quizRecord(id).draft);
}

function quizLast(id) {
  const record = quizRecord(id);
  const attempt = restoreQuizAttempt(record.last);
  const result = attempt && scoreQuiz(attempt.questions, attempt.answers);
  return result ? { ...attempt, ...result, awarded: record.rewardEarned && result.passed && record.last.awarded === true } : null;
}

function commitQuizRecord(id, update) {
  const records = readQuizRecords();
  if (!records) {
    renderStorageStatus();
    return false;
  }
  quizRecords = records;
  const current = quizRecord(id, records);
  const next = update(current);
  if (!next) return false;
  if (next === current) return true;
  const updated = { ...records, [id]: next };
  writeStorage(quizProgressKey, updated);
  if (memoryOnly.has(quizProgressKey)) return false;
  quizRecords = updated;
  return true;
}

function persistQuizDraft(id, attempt) {
  const pending = unsavedQuizDrafts.get(id);
  const expectedId = pending ? pending.expectedId : quizRecord(id).draft?.id ?? null;
  unsavedQuizDrafts.set(id, { attempt, expectedId });
  const saved = commitQuizRecord(id, current => {
    if (current.last?.id === attempt.id || (current.draft?.id ?? null) !== expectedId) return null;
    return { ...current, draft: attempt };
  });
  if (saved) unsavedQuizDrafts.delete(id);
  return saved;
}

function persistQuizResult(id) {
  const pending = unsavedQuizResults.get(id);
  if (!pending) return false;
  const { attempt, expectedId } = pending;
  const saved = commitQuizRecord(id, current => {
    if (current.last?.id === attempt.id) return current;
    if ((current.draft?.id ?? null) !== expectedId || current.attemptCount === Number.MAX_SAFE_INTEGER) return null;
    const awarded = attempt.passed && !current.rewardEarned;
    return { draft: null, last: { ...attempt, awarded }, bestScore: Math.max(current.bestScore, attempt.score),
      attemptCount: current.attemptCount + 1, rewardEarned: current.rewardEarned || awarded };
  });
  if (saved) {
    unsavedQuizResults.delete(id);
    unsavedQuizDrafts.delete(id);
  }
  return saved;
}

function quizCenter() {
  const passed = quizPacks.filter(pack => quizRecord(pack.id).rewardEarned).length;
  return `<div class="screen quiz-screen">
    ${heading('Learning practice', 'Quiz Center', 'Check what you understand, read the explanations, and practice again anytime.')}
    <div class="quiz-hub-progress"><strong>${passed} of ${quizPacks.length} challenges passed</strong><p>No time limit. Every answer has an explanation.</p></div>
    <div class="quiz-pack-grid">${quizPacks.map(pack => {
      const record = quizRecord(pack.id);
      const draft = quizDraft(pack.id);
      const last = quizLast(pack.id);
      const pending = unsavedQuizResults.has(pack.id);
      const state = record.rewardEarned ? 'passed' : draft ? 'in-progress' : last ? 'attempted' : 'not-started';
      const status = record.rewardEarned ? 'Passed' : pending ? 'Result awaiting save' : draft ? 'In progress' : last ? 'Attempted' : 'Ready to start';
      return `<article class="card quiz-pack-card" data-quiz-pack="${pack.id}" data-state="${state}">
        <div class="row"><span class="quiz-pack-icon">${featureImage(pack.icon)}</span><span class="quiz-pack-state">${status}</span></div>
        <h2>${escape(pack.title)}</h2><p>${escape(pack.description)}</p>
        <p class="quiz-pack-meta">Beginner · 5, 10 or 15 questions · ${record.rewardEarned ? '100 XP earned' : '100 XP on first pass'}</p>
        ${draft && !pending ? `<p>${draft.answers.filter(answer => answer !== null).length} of ${draft.questions.length} answered</p>` : ''}
        ${last ? `<p>Last ${last.score}/100 · Best ${record.bestScore}/100 · ${record.attemptCount} ${record.attemptCount === 1 ? 'attempt' : 'attempts'}</p>` : ''}
        <div class="actions quiz-pack-actions">
          ${pending ? `<button type="button" class="primary" data-review-quiz="${pack.id}">Review unsaved result</button>`
            : draft ? `<button type="button" class="primary" data-resume-quiz="${pack.id}">Continue quiz</button>`
              : last && record.rewardEarned ? `<button type="button" class="primary" data-review-quiz="${pack.id}">Review answers</button>`
                : `<button type="button" class="primary" data-quiz="${pack.id}">${last ? 'Try again' : 'Start challenge'}</button>`}
          ${last && !pending ? `<button type="button" data-${draft || !record.rewardEarned ? 'review-quiz' : 'quiz'}="${pack.id}">${draft ? 'Review last result' : record.rewardEarned ? 'Try again' : 'Review answers'}</button>` : ''}
        </div>
      </article>`;
    }).join('')}</div>
    <p class="quiz-footer">Educational practice · Fictional examples</p>
  </div>`;
}

function quizScreen(active) {
  const pack = quizPackById(active.id);
  if (!pack) return `<div class="screen quiz-screen"><section class="card quiz-panel"><h1 id="quiz-title" tabindex="-1">Quiz unavailable</h1><p>This challenge is unavailable.</p><button type="button" data-mission-tab="quizzes">Back to Quiz Center</button></section></div>`;
  const draft = quizDraft(pack.id);
  const pending = unsavedQuizResults.get(pack.id)?.attempt;
  const last = quizLast(pack.id);
  let content;
  if (active.stage !== 'setup' && pending) content = quizResult(pack, pending, true);
  else if (active.stage === 'run' && draft) content = quizRunner(pack, draft);
  else if (active.stage === 'result' && last) content = quizResult(pack, last, false);
  else content = quizSetup(pack, draft);
  return `<div class="screen quiz-screen">${content}</div>`;
}

function quizSetup(pack, draft) {
  const localFile = location.protocol === 'file:';
  const unavailableDraft = quizRecord(pack.id).draft && !draft;
  return `<section class="card quiz-panel quiz-setup" data-quiz-pack="${pack.id}">
    <div class="actions"><button type="button" class="quiz-back" data-mission-tab="quizzes">Back to Quiz Center</button></div>
    <span class="eyebrow">Challenge overview</span><h1 id="quiz-title" tabindex="-1">${escape(pack.title)}</h1><p>${escape(pack.description)}</p>
    <ul class="quiz-concepts">${pack.concepts.map(concept => `<li>${escape(concept)}</li>`).join('')}</ul>
    <p>Choose one answer per question. You can change answers before submitting. Explanations appear with your results.</p>
    <label class="quiz-count-field" for="quiz-count">Number of questions<select id="quiz-count">${quizCounts.map(count => `<option value="${count}">${count} questions</option>`).join('')}</select></label>
    <p id="quiz-target">Target 4 of 5 correct (80%). No time limit.</p>
    ${unavailableDraft ? '<p class="error" role="alert">The saved draft cannot be opened. Start a fresh quiz to use the current material.</p>' : ''}
    ${draft ? `<p>A draft is available. Starting a new quiz will replace that draft.</p><div class="actions"><button type="button" data-resume-quiz="${pack.id}">Continue saved quiz</button></div>` : ''}
    <div class="actions quiz-setup-actions">
      <button type="button" class="primary" data-action="start-quiz" aria-describedby="quiz-status" aria-disabled="${localFile}">Start Quiz</button>
      <button type="button" data-action="use-quiz-sample">Use reviewed sample (5 questions)</button>
    </div>
    <p id="quiz-status" class="quiz-status" role="status" aria-live="polite">${localFile ? 'Open the app through localhost to generate a quiz. The reviewed sample is available here.' : ''}</p>
    <p class="quiz-footer">Educational practice · Fictional examples</p>
  </section>`;
}

function quizRunner(pack, attempt) {
  const { index, questions, answers } = attempt;
  const total = questions.length;
  const answered = answers.filter(answer => answer !== null).length;
  const question = questions[index];
  const last = index === total - 1;
  const unsaved = unsavedQuizDrafts.has(pack.id);
  return `<section class="card quiz-panel quiz-runner" data-quiz-pack="${pack.id}">
    <div class="actions"><button type="button" class="quiz-back" data-action="exit-quiz">Exit quiz</button></div>
    <h1 id="quiz-title" tabindex="-1">${escape(pack.title)}</h1>
    <div class="row quiz-run-header"><strong>Question ${index + 1} of ${total}</strong><span id="quiz-progress-count">${answered} of ${total} answered</span></div>
    <progress class="quiz-progress-bar" max="${total}" value="${answered}" aria-label="Questions answered">${answered} of ${total}</progress>
    <div class="quiz-number-grid" role="group" aria-label="Question numbers">${questions.map((_, i) => `<button type="button" data-question-index="${i}" data-answered="${answers[i] !== null}"${i === index ? ' aria-current="step"' : ''} aria-label="Question ${i + 1}, ${answers[i] !== null ? 'answered' : 'unanswered'}">${i + 1}${answers[i] !== null ? '<span aria-hidden="true"> ✓</span>' : ''}</button>`).join('')}</div>
    <fieldset class="quiz-question"><legend id="quiz-question-title" tabindex="-1">${escape(question.prompt)}</legend><p>Choose one answer.</p>
      ${question.choices.map((choice, option) => `<label class="option quiz-answer"><input type="radio" name="quiz-answer" value="${option}"${option === answers[index] ? ' checked' : ''}><span class="quiz-option-letter" aria-hidden="true">${String.fromCharCode(65 + option)}</span><span>${escape(choice)}</span></label>`).join('')}
    </fieldset>
    ${unsaved ? '<div class="quiz-status error" role="alert"><p>Answers have not been saved. Keep this tab open to continue.</p><button type="button" data-action="save-quiz-draft">Save answers again</button></div>' : ''}
    ${last && answered !== total ? '<p>Answer every question to see your results.</p>' : ''}
    <div class="actions quiz-run-actions">
      ${index > 0 ? '<button type="button" data-action="quiz-previous">Previous</button>' : ''}
      ${last ? `<button type="button" class="primary" data-action="submit-quiz"${answered === total ? '' : ' disabled'}>Submit answers</button>` : `<button type="button" class="primary" data-action="quiz-next"${answers[index] === null ? ' disabled' : ''}>Next question</button>`}
    </div>
    <p class="quiz-footer">${attempt.source === 'openai' ? 'OpenAI practice set' : 'Reviewed sample'} · Fictional examples${unsaved ? '' : ' · Progress saved on this device'}</p>
    <dialog class="quiz-exit-dialog" id="quiz-exit-dialog" aria-labelledby="quiz-exit-title" aria-describedby="quiz-exit-description"><h2 id="quiz-exit-title">Exit quiz?</h2><p id="quiz-exit-description">${unsaved ? 'Your unsaved changes will be discarded if you exit.' : 'Your answers are saved on this device. You can continue later.'}</p><div class="dialog-actions"><button type="button" data-action="stay-in-quiz" autofocus>Stay in quiz</button><button type="button" data-action="confirm-quiz-exit">${unsaved ? 'Exit without saving' : 'Save and exit'}</button></div></dialog>
  </section>`;
}

function quizResult(pack, result, unsaved) {
  const record = quizRecord(pack.id);
  const tags = [...new Set(result.questions.filter((question, i) => question.answer !== result.answers[i]).map(question => question.tag))];
  const next = quizPacks.find(item => item.id !== pack.id && !quizRecord(item.id).rewardEarned);
  return `<section class="card quiz-panel quiz-result" data-quiz-pack="${pack.id}">
    <div class="quiz-result-summary"><span class="eyebrow">${escape(pack.title)}</span>
      <h1 id="quiz-result" tabindex="-1">${result.passed ? 'Learning target met' : 'Keep practicing'}</h1>
      <strong class="quiz-result-score">${result.score}/100</strong><p>${result.correct} of ${result.total} answers correct. ${result.correct === result.total ? 'All answers were correct on this attempt.' : 'The passing target is 80%.'}</p>
      ${unsaved ? '<p class="quiz-status error" role="alert">Result not saved. Save again to keep this score and any first-pass XP.</p>'
        : result.awarded ? `<p class="notice">+${quizReward} XP earned on this attempt.</p>` : record.rewardEarned ? '<p>First-pass XP already earned for this challenge.</p>' : ''}
    </div>
    ${tags.length ? `<div><h2>Concepts to review</h2><ul class="quiz-concept-tags">${tags.map(tag => `<li>${escape(tag)}</li>`).join('')}</ul></div>` : '<p>Try another challenge to put these ideas into practice.</p>'}
    <section class="quiz-review-list" aria-labelledby="quiz-review-title"><h2 id="quiz-review-title">Answer explanations</h2>
      ${result.questions.map((question, index) => {
        const correct = result.answers[index] === question.answer;
        return `<details class="quiz-review-item" data-state="${correct ? 'correct' : 'review'}"${correct ? '' : ' open'}><summary>Question ${index + 1} · ${correct ? '✓ Correct' : 'Review this answer'}</summary>
          <div class="quiz-review-body"><h3>${escape(question.prompt)}</h3><dl><dt>Your answer</dt><dd>${escape(question.choices[result.answers[index]])}</dd><dt>Correct answer</dt><dd>${escape(question.choices[question.answer])}</dd></dl><p>${escape(question.why)}</p><p>Concept · ${escape(question.tag)}</p></div>
        </details>`;
      }).join('')}
    </section>
    <div class="actions quiz-result-actions">
      ${unsaved ? '<button type="button" class="primary" data-action="save-quiz-result">Save result again</button>' : `
        ${result.passed && next ? `<button type="button" class="primary" data-quiz="${next.id}">Next challenge</button>` : ''}
        <button type="button"${!result.passed ? ' class="primary"' : ''} data-quiz="${pack.id}">Try again</button>
        ${result.passed && !next ? '<button type="button" data-market-tab="stocks">Try the simulator</button>' : ''}
      `}
      <button type="button" data-mission-tab="quizzes">Back to Quiz Center</button>
    </div>
    <p class="quiz-footer">${result.source === 'openai' ? 'OpenAI practice set' : 'Reviewed sample'} · Fictional examples${unsaved ? '' : ' · Result saved on this device'}</p>
  </section>`;
}

function updateQuizStartStatus(message, error = false) {
  const status = main.querySelector('#quiz-status');
  if (!status) return;
  status.classList.toggle('error', error);
  status.setAttribute('role', error ? 'alert' : 'status');
  status.textContent = message;
  main.querySelector('[data-action="start-quiz"]').setAttribute('aria-disabled', String(Boolean(quizGeneration)));
  main.querySelector('#quiz-count').disabled = Boolean(quizGeneration);
}

async function startQuiz() {
  if (quizGeneration || location.protocol === 'file:') return;
  const pack = quizPackById(quizRoute()?.id);
  const count = Number(main.querySelector('#quiz-count')?.value);
  if (!pack || !quizCounts.includes(count)) return;
  const hash = location.hash;
  const controller = new AbortController();
  quizGeneration = controller;
  updateQuizStartStatus('Preparing ' + count + ' questions with OpenAI…');
  let questions;
  let error = 'OpenAI could not return a valid question set. Try starting again.';
  try {
    const response = await fetch('/api/quiz', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      signal: controller.signal, body: JSON.stringify({ topicId: pack.id, count }) });
    const payload = await response.json();
    if (response.ok) questions = validateQuizQuestions(payload?.questions, count);
    else if (typeof payload?.error === 'string' && payload.error.trim()) error = payload.error.slice(0, 240);
  } catch {
    error = 'Could not reach the quiz service. Check your connection and try again.';
  }
  if (quizGeneration !== controller || controller.signal.aborted || location.hash !== hash) return;
  quizGeneration = null;
  if (questions) beginQuiz(pack.id, questions, 'openai');
  else updateQuizStartStatus(error, true);
}

function useQuizSample() {
  const pack = quizPackById(quizRoute()?.id);
  if (!pack) return;
  const questions = validateQuizQuestions(pack.questions, 5);
  if (questions) beginQuiz(pack.id, questions, 'reviewed');
}

function beginQuiz(id, questions, source) {
  const attempt = { id: idForSession(), version: 1, questions, answers: Array(questions.length).fill(null), index: 0, source };
  unsavedQuizDrafts.delete(id);
  unsavedQuizResults.delete(id);
  persistQuizDraft(id, attempt);
  openQuiz(id, 'run');
}

function chooseQuizAnswer(value) {
  const id = quizRoute()?.id;
  const draft = quizDraft(id);
  if (!draft || unsavedQuizResults.has(id) || !Number.isInteger(value) || value < 0 || value >= draft.questions[draft.index].choices.length) return;
  const answers = [...draft.answers];
  answers[draft.index] = value;
  persistQuizDraft(id, { ...draft, answers });
  rerender('[name="quiz-answer"]:checked');
}

function moveQuizQuestion(index) {
  const id = quizRoute()?.id;
  const draft = quizDraft(id);
  if (!draft || unsavedQuizResults.has(id) || !Number.isInteger(index) || index < 0 || index >= draft.questions.length) return;
  if (index !== draft.index) persistQuizDraft(id, { ...draft, index });
  rerender('#quiz-question-title');
}

function stepQuiz(offset) {
  const draft = quizDraft(quizRoute()?.id);
  if (draft && (offset < 0 || draft.answers[draft.index] !== null)) moveQuizQuestion(draft.index + offset);
}

function submitQuiz() {
  const id = quizRoute()?.id;
  const draft = quizDraft(id);
  if (!draft || unsavedQuizResults.has(id) || draft.index !== draft.questions.length - 1) return;
  const result = scoreQuiz(draft.questions, draft.answers);
  if (!result) return;
  const pending = unsavedQuizDrafts.get(id);
  const expectedId = pending ? pending.expectedId : draft.id;
  unsavedQuizResults.set(id, { attempt: { ...draft, ...result }, expectedId });
  persistQuizResult(id);
  openQuiz(id, 'result');
}

function retryQuizDraftSave() {
  const id = quizRoute()?.id;
  const pending = unsavedQuizDrafts.get(id);
  if (pending && persistQuizDraft(id, pending.attempt)) announce('Quiz answers saved.');
  rerender('#quiz-question-title');
}

function retryQuizResultSave() {
  const id = quizRoute()?.id;
  if (persistQuizResult(id)) announce('Quiz result saved.');
  rerender('#quiz-result');
}

function closeQuizExit() {
  main.querySelector('#quiz-exit-dialog')?.close();
  main.querySelector('[data-action="exit-quiz"]')?.focus();
}

function confirmQuizExit() {
  unsavedQuizDrafts.delete(quizRoute()?.id);
  openMissions('quizzes');
}

function newsScreen() {
  const styles = { Neutral: 'neutral', Positive: '', Negative: 'negative' };
  return `<div class="screen news-screen">
    ${heading('Market briefing', 'News &amp; Sentiment Lab', 'Follow current financial headlines, then practice reading the evidence behind a story.')}
    <section class="card news-feed-card" aria-labelledby="financial-news-title">
      <div class="row news-feed-heading"><div><p class="eyebrow">Financial news</p><h2 id="financial-news-title">Market headlines</h2></div>${chip('TradingView', 'neutral')}</div>
      <p class="news-feed-meta">Source: TradingView · Checks for new stories automatically while visible.</p>
      <p class="news-feed-status" id="financial-news-status" role="status" aria-live="polite">Loading current financial news from TradingView…</p>
      <div class="news-feed-host" id="financial-news-feed" aria-busy="true"></div>
      <div class="actions news-feed-actions"><button type="button" data-action="refresh-news">Refresh news</button><a href="https://www.tradingview.com/news/" target="_blank" rel="noopener noreferrer">Open TradingView News <span aria-hidden="true">↗</span><span class="sr"> (opens in a new tab)</span></a></div>
    </section>
    <details class="sentiment-practice">
      <summary>Sentiment practice examples</summary>
      <div class="sentiment-practice-content">
        <section class="news-intro">
          <div class="row"><h2>Read the evidence</h2>${chip('Dated examples')}</div>
          <p>These source articles and curated sentiment examples are separate from the current feed. Sentiment describes the information in an article; prices can respond differently as expectations and other news change.</p>
          <div class="actions"><button class="primary" data-quiz="facts-and-news">Try the Facts and News Quiz <span aria-hidden="true">→</span></button></div>
        </section>
        ${news.map(story => `<article class="card news-story">
          <div class="row"><p class="eyebrow">${story.topic}</p>${chip(story.sentiment, styles[story.sentiment])}</div>
          <h2>${story.title}</h2>
          <small class="story-meta">${story.publisher} · <time datetime="${story.date}">${date(story.date)}</time></small>
          <p>${story.summary}</p>
          <details><summary>Why ${story.sentiment.toLowerCase()}?</summary><p>${story.reasoning}</p></details>
          <div class="actions"><a class="button" href="${story.url}" target="_blank" rel="noopener noreferrer">Read source <span aria-hidden="true">↗</span><span class="sr"> (opens in a new tab)</span></a></div>
        </article>`).join('')}
      </div>
    </details>
  </div>`;
}

function mountFinancialNews() {
  const host = main.querySelector('#financial-news-feed');
  const status = main.querySelector('#financial-news-status');
  if (!host || !status) return;
  const update = state => {
    if (page !== 'news' || !host.isConnected) return;
    const loading = state.status === 'loading';
    const ready = state.status === 'ready';
    const loadedAt = Number.isSafeInteger(state.loadedAt) && state.loadedAt >= 0 && Number.isFinite(new Date(state.loadedAt).getTime())
      ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(state.loadedAt) + ' WIB' : null;
    status.className = 'news-feed-status' + (loading || ready ? '' : ' error');
    status.setAttribute('role', loading || ready ? 'status' : 'alert');
    status.textContent = loading ? 'Loading current financial news from TradingView…'
      : ready ? 'Widget loaded' + (loadedAt ? ' at ' + loadedAt : '') + ' · TradingView checks for new stories automatically.'
        : 'TradingView financial news is unavailable. Refresh the feed or open TradingView News.';
    host.setAttribute('aria-busy', String(loading));
    main.querySelector('[data-action="refresh-news"]').setAttribute('aria-disabled', String(loading));
  };
  if (typeof window.financialNewsFeed?.mount !== 'function') {
    update({ status: 'error', loadedAt: null });
    return;
  }
  window.financialNewsFeed.mount(host, update);
}

function refreshFinancialNews() {
  if (main.querySelector('[data-action="refresh-news"]')?.getAttribute('aria-disabled') === 'true') return;
  if (typeof window.financialNewsFeed?.refresh === 'function') window.financialNewsFeed.refresh();
  else mountFinancialNews();
}

function profileScreen() {
  const summary = portfolio(student.account);
  return `<div class="screen profile-screen">
    ${heading('Your workspace', 'Demo profile', 'See the learning and investing activity saved in this browser.')}
    <section class="card profile-card">
      <div class="profile-name"><span class="avatar" aria-hidden="true">ST</span><div><h2>Student</h2><p>Local demo profile</p></div></div>
      <p>On this device, your completed lessons, scores, virtual trades, and conversations stay available between visits.</p>
    </section>
    <div class="metrics">
      ${metric('Lessons completed', completedAcademyCount() + ' / ' + courses.length)}
      ${metric('Learning XP', xpTotal() + ' XP')}
      ${metric('Virtual portfolio value', rupiah(summary.total))}
    </div>
    <section class="card"><h2>Demo session</h2><p>End this session to open a fresh Mentor chat. You can still reopen saved chats from the sidebar.</p>
      <div class="actions"><button data-action="end-demo">End demo session</button></div>
    </section>
  </div>`;
}

function messageBubbles(items) {
  return items.map(item => {
    const isStudent = item.role === 'You';
    return `<div class="bubble${isStudent ? ' user' : ''}"><strong>${isStudent ? 'You' : 'Mentor'}</strong><p>${escape(item.text)}</p></div>`;
  }).join('');
}

function mentor() {
  const messages = chat?.messages ?? [];
  return `<div class="screen chat-screen">
    <div class="row chat-header">
      <h1 class="sr" id="view-title" tabindex="-1">AI Investment Mentor</h1>
      <span class="eyebrow">Learning conversation</span>${chip('Scripted demo', 'neutral')}
    </div>
    ${messages.length ? `<div class="log" role="log" aria-label="Conversation" tabindex="0">${messageBubbles(messages)}</div>` : `<div class="chat-intro">
      <div class="chat-welcome"><div class="mentor-mark">${featureImage('mentor')}</div>
        <h2>What would you like to learn?</h2>
        <p>Ask about an investing term or look at the risk in your virtual portfolio.</p>
      </div>
      <div class="prompt-grid" aria-label="Suggested prompts">${prompts.map(prompt => `<button data-prompt="${escape(prompt)}">${prompt} <span aria-hidden="true">↗</span></button>`).join('')}</div>
    </div>`}
    <div class="composer-wrap">
      <form id="mentor-form" class="composer">
        <label class="sr" for="message">Ask the mentor</label>
        <input id="message" name="message" required maxlength="500" placeholder="Ask about investing…" autocomplete="off">
        <button class="primary">Send <span aria-hidden="true">↑</span></button>
      </form>
      <small class="composer-note">Practice and learning with virtual money.</small>
    </div>
    <dialog class="chat-delete-dialog" id="chat-delete-dialog" aria-labelledby="chat-delete-title" aria-describedby="chat-delete-description"><h2 id="chat-delete-title">Delete chat?</h2><p id="chat-delete-description"></p><div class="dialog-actions"><button type="button" data-action="cancel-delete-chat" autofocus>Cancel</button><button type="button" class="danger" data-action="confirm-delete-chat">Delete</button></div></dialog>
  </div>`;
}

function mentorReply(question) {
  const text = question.toLowerCase();
  if (/should i (buy|sell|invest)|recommend.*(stock|invest)|which stock|guarantee.*(return|profit)|forecast.*price/.test(text)) {
    return 'We can practice comparing virtual holdings, risk, and time horizon. What would you want to check before interpreting a stock’s recent change?';
  }
  if (/portfolio|my holdings/.test(text)) {
    const summary = portfolio(student.account);
    if (summary.total === null || summary.invested === null) return 'Some demo quotes are unavailable. Portfolio valuation and holding weights are currently unavailable. Your saved holdings and trades remain available.';
    if (!summary.positions.length) return 'Your practice portfolio currently holds only virtual cash. After a practice purchase, we can look at how much of the invested amount depends on one company or sector.';
    const largest = summary.positions.reduce((a, b) => a.value >= b.value ? a : b);
    return `Your portfolio holds ${summary.positions.length} ${summary.positions.length === 1 ? 'company' : 'companies'} across ${summary.sectors} ${summary.sectors === 1 ? 'sector' : 'sectors'}. ${largest.stock.name} accounts for ${percent(largest.value / summary.invested)} of the money invested in stocks. If that holding falls, it can have a noticeable effect on the invested portion. What would happen if several of your holdings moved together?`;
  }
  if (/life.stage/.test(text)) return journeySummary(journey);
  if (/market scenario|price shock/.test(text)) return scenarioExplanation(scenarioResult());
  if (/p\s*\/\s*e\b|price.to.earnings/.test(text)) {
    return 'P/E stands for price-to-earnings. Divide share price by earnings per share. A share priced at Rp2,000 with Rp100 in earnings per share has a P/E of 20×. Other context, like growth and debt, matters when you compare two companies.';
  }
  if (/market cap/.test(text)) return 'Market capitalization is a company’s share price multiplied by its total shares outstanding. It describes how the market values the company’s equity at that price.';
  if (/dividend/.test(text)) return 'A dividend is a payment a company may make to shareholders. The company can change the amount or skip the payment as its finances and plans change.';
  const topic = [
    [/compound/, 'Compounding'], [/inflat|buying power/, 'Inflation'], [/diversif/, 'Diversification'],
    [/emergen|saving/, 'Emergency savings'], [/risk|loss/, 'Risk'],
  ].find(([pattern]) => pattern.test(text));
  if (topic) return lessons[topic[1]];
  if (/\bstocks?\b|\bshares?\b/.test(text)) {
    return 'A stock is a unit of ownership in a company. You can gain when its price rises or when the company pays a dividend. The price can also fall. The Academy has a short lesson on how this works.';
  }
  return 'In this demo I can explain stocks, dividends, P/E, market cap, diversification, and the risk in your virtual portfolio. Try one of those topics.';
}

function sendMentor(question) {
  const text = question.trim();
  if (!text) {
    main.querySelector('#message').value = '';
    main.querySelector('#message').focus();
    return;
  }
  sessions = loadSessions(sessions);
  const record = sessions.find(item => item.kind === 'chat' && item.id === chat?.id) ?? {
    id: idForSession(), kind: 'chat', title: text.length > 46 ? text.slice(0, 46) + '…' : text, messages: [],
  };
  student = loadStudent(student);
  const reply = mentorReply(text);
  chat = saveSession({
    ...record,
    messages: [...record.messages, { role: 'You', text }, { role: 'Mentor', text: reply }],
  });
  render();
  focusComposer();
  announce('Mentor replied. ' + reply);
}

function focusComposer(prompt = '') {
  const input = main.querySelector('#message');
  input.value = prompt;
  input.focus({ preventScroll: true });
  window.scrollTo(0, document.documentElement.scrollHeight);
}

function render() {
  window.financialNewsFeed?.destroy();
  const views = { home, academy, market: marketScreen, mentor, missions: missionsScreen, news: newsScreen, profile: profileScreen };
  document.querySelector('#feature-title').textContent = page === 'home' ? 'Home' : sections[page];
  document.querySelector('#location').textContent = page === 'missions' && location.hash !== '#missions' ? 'Learning practice' : sections[page];
  document.title = sections[page] + ' | Vamm';
  sidebar.querySelectorAll('.feature-rail button').forEach(button => {
    if (button.dataset.page === page) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  renderPanel();
  renderStorageStatus();
  main.innerHTML = views[page]();
  if (page === 'mentor') {
    const log = main.querySelector('.log');
    if (log) log.scrollTop = log.scrollHeight;
  }
  if (page === 'news') mountFinancialNews();
}

function showAcademyCatalog() {
  academyTrackId = null;
  lessonId = null;
  go('academy');
  main.querySelector('#view-title').focus({ preventScroll: true });
}

function openAcademyTrack(id) {
  if (!academyTracks.some(track => track.id === id)) return;
  academyTrackId = id;
  lessonId = null;
  go('academy');
  main.querySelector('#view-title').focus({ preventScroll: true });
}

function openLesson(id) {
  if (id && !unlockedLesson(id)) {
    announce('Complete the earlier lessons to unlock this lesson.');
    return;
  }
  lessonId = id;
  go('academy');
  const activeTab = main.querySelector('[role="tab"][aria-selected="true"]');
  const tabList = main.querySelector('.lesson-tabs');
  if (activeTab && tabList) tabList.scrollLeft = Math.max(0, activeTab.offsetLeft - tabList.offsetLeft - 16);
}

function openMarket(view, focus) {
  marketView = Object.hasOwn(marketTabs, view) ? view : 'tradingview';
  go('market');
  if (focus) main.querySelector(focus)?.focus();
}

function openMissions(view) {
  go('missions', view === 'quizzes' ? 'missions/quizzes' : 'missions');
  main.querySelector('#view-title')?.focus({ preventScroll: true });
}

function openQuiz(id, stage = 'setup') {
  if (!quizPackById(id)) return;
  go('missions', 'missions/quiz/' + id + (stage === 'setup' ? '' : '/' + stage));
  const focus = stage === 'run' ? '#quiz-question-title' : stage === 'result' ? '#quiz-result' : '#quiz-title';
  (main.querySelector(focus) ?? main.querySelector('#quiz-title'))?.focus({ preventScroll: true });
}

function saveLessonCompletion(id) {
  student = loadStudent(student);
  if (!unlockedLesson(id)) return false;
  if (!hasCompleted(id)) {
    saveStudent({ ...student, completedLessons: [...student.completedLessons, id] });
  }
  return true;
}

function completeLesson(id) {
  if (!saveLessonCompletion(id)) return;
  const last = activeAcademyTrack().lessons.at(-1) === id;
  rerender(last ? '.lesson-actions [data-action="all-courses"]' : '[data-next-lesson]');
  announce('Lesson complete. Your progress has been saved.');
}

function nextLesson(id) {
  if (!saveLessonCompletion(id)) return;
  const ids = activeAcademyTrack().lessons;
  const next = ids[ids.indexOf(id) + 1];
  if (!next) return;
  openLesson(next);
  main.querySelector('#course-title').focus({ preventScroll: true });
  announce('Lesson complete. Next lesson opened.');
}

function claimReward(id) {
  student = loadStudent(student);
  const item = challenges.find(challenge => challenge.id === id);
  if (!item || missionStatus(item) !== 'Ready to claim') return;
  saveStudent({ ...student, rewards: [...student.rewards, id] });
  rerender();
  announce('Mission completed. You earned ' + item.reward + ' XP.');
}

function tickDemoQuotes() {
  if (document.hidden || page !== 'market' || !['stocks', 'portfolio'].includes(marketView)) return;
  const latest = loadStudent(student);
  const next = advanceDemoQuotes(latest.account, Date.now());
  student = latest;
  if (next !== latest.account) saveStudent({ ...latest, account: next });
  refreshDemoQuotes();
}

const actions = {
  'all-courses': showAcademyCatalog,
  'new-chat': startChat,
  'end-demo': startChat,
  'start-quiz': startQuiz,
  'use-quiz-sample': useQuizSample,
  'quiz-previous': () => stepQuiz(-1),
  'quiz-next': () => stepQuiz(1),
  'submit-quiz': submitQuiz,
  'save-quiz-draft': retryQuizDraftSave,
  'save-quiz-result': retryQuizResultSave,
  'exit-quiz': () => main.querySelector('#quiz-exit-dialog')?.showModal(),
  'stay-in-quiz': closeQuizExit,
  'confirm-quiz-exit': confirmQuizExit,
  'cancel-delete-chat': cancelChatDeletion,
  'confirm-delete-chat': confirmChatDeletion,
  'history-previous': () => {
    historyPage--;
    refreshTransactionHistory('[data-action="history-previous"]');
  },
  'history-next': () => {
    historyPage++;
    refreshTransactionHistory('[data-action="history-next"]');
  },
  'refresh-news': refreshFinancialNews,
  'journey-start': () => {
    journey = createJourney();
    openMarket('journey', '#journey-form input');
  },
  'journey-example': () => {
    journey = createJourney(true);
    openMarket('journey', '#journey-form input');
  },
};

function startChat() {
  chat = null;
  go('mentor');
  focusComposer();
  announce('New chat started.');
}

function requestChatDeletion(id, trigger) {
  sessions = loadSessions(sessions);
  const selected = sessions.find(item => item.kind === 'chat' && item.id === id);
  const dialog = main.querySelector('#chat-delete-dialog');
  if (!selected || !dialog) return;
  pendingChatDeleteId = id;
  const options = trigger.closest('.chat-options');
  chatDeleteTrigger = options?.querySelector('summary') ?? trigger;
  if (options) options.open = false;
  dialog.querySelector('#chat-delete-description').textContent = '“' + selected.title + '” will be removed from saved chats in this browser.';
  dialog.showModal();
}

function cancelChatDeletion(restoreFocus = true) {
  main.querySelector('#chat-delete-dialog')?.close();
  pendingChatDeleteId = null;
  if (restoreFocus) (chatDeleteTrigger?.isConnected ? chatDeleteTrigger : panel.querySelector('[data-action="new-chat"]'))?.focus();
  chatDeleteTrigger = null;
}

function confirmChatDeletion() {
  const id = pendingChatDeleteId;
  if (id === null || !main.querySelector('#chat-delete-dialog')?.open) return;
  const latest = loadSessions(sessions);
  const active = chat?.id === id;
  sessions = latest.filter(item => !(item.kind === 'chat' && item.id === id));
  writeStorage(sessionKey, sessions);
  cancelChatDeletion(false);
  if (active) startChat();
  else {
    renderPanel();
    panel.querySelector('[data-action="new-chat"]')?.focus();
  }
  announce(memoryOnly.has(sessionKey) ? 'Chat removed for this visit. Browser storage could not save the change.' : 'Chat deleted.');
}

function closeSidebar() {
  setMenu(false);
  menu.focus();
}

document.addEventListener('click', event => {
  document.querySelectorAll('.chat-options[open]').forEach(options => {
    if (!options.contains(event.target)) options.open = false;
  });
  const button = event.target.closest('button');
  if (!button) return;
  if (button === backdrop || button.id === 'close-panel') {
    closeSidebar();
    return;
  }
  if (button === menu) {
    const opening = panel.hidden;
    setMenu(opening);
    if (opening && narrowScreen.matches) document.querySelector('#close-panel').focus();
    return;
  }

  const data = button.dataset;
  if (data.page === 'academy') showAcademyCatalog();
  else if (data.page) go(data.page);
  else if (data.action) actions[data.action]?.();
  else if (data.deleteChat) requestChatDeletion(data.deleteChat, button);
  else if (data.course) openAcademyTrack(data.course);
  else if (data.lesson) openLesson(data.lesson);
  else if (data.completeLesson) completeLesson(data.completeLesson);
  else if (data.nextLesson) nextLesson(data.nextLesson);
  else if (data.quiz) openQuiz(data.quiz);
  else if (data.resumeQuiz) openQuiz(data.resumeQuiz, 'run');
  else if (data.reviewQuiz) openQuiz(data.reviewQuiz, 'result');
  else if (data.questionIndex !== undefined) moveQuizQuestion(Number(data.questionIndex));
  else if (data.missionTab) openMissions(data.missionTab);
  else if (data.claim) claimReward(data.claim);
  else if (data.marketTab) openMarket(data.marketTab);
  else if (data.stock) {
    ticker = data.stock;
    openMarket('stocks', '#stock-title');
  } else if (data.journey) {
    journey = sessions.find(item => item.id === data.journey);
    openMarket('journey', '#journey-form input');
  } else if (data.scenario) {
    scenario[data.scenario] = Number(data.value);
    rerender(`[data-scenario="${data.scenario}"][data-value="${data.value}"]`);
  } else if (data.chat) {
    chat = sessions.find(item => item.id === data.chat) ?? null;
    go('mentor');
    focusComposer();
  } else if (data.prompt) sendMentor(data.prompt);
  else if (data.mentor) {
    go('mentor');
    focusComposer(data.mentor);
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !main.querySelector('#chat-delete-dialog')?.open) {
    const options = document.querySelector('.chat-options[open]');
    if (options) {
      event.preventDefault();
      const focused = options.contains(document.activeElement);
      options.open = false;
      if (focused) options.querySelector('summary').focus();
      return;
    }
  }

  const tab = event.target.closest('[role="tab"][data-lesson]');
  if (tab && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    const enabled = [...main.querySelectorAll('[role="tab"]:not(:disabled)')];
    const index = enabled.indexOf(tab);
    let target;
    if (event.key === 'Home') target = enabled[0];
    else if (event.key === 'End') target = enabled.at(-1);
    else {
      const offset = event.key === 'ArrowRight' ? 1 : -1;
      target = enabled[(index + offset + enabled.length) % enabled.length];
    }
    openLesson(target.dataset.lesson);
    main.querySelector('[role="tab"][aria-selected="true"]').focus();
    return;
  }

  if (event.key === 'Escape' && !panel.hidden && (sidebar.contains(document.activeElement) || document.activeElement === menu)) {
    closeSidebar();
  }
});

document.addEventListener('cancel', event => {
  if (event.target.id === 'chat-delete-dialog') {
    event.preventDefault();
    cancelChatDeletion();
  } else if (event.target.id === 'quiz-exit-dialog') {
    event.preventDefault();
    closeQuizExit();
  }
}, true);

document.addEventListener('input', event => {
  if (event.target.id === 'stock-search') {
    stockSearch = event.target.value;
    main.querySelector('#stock-rows').innerHTML = stockRows();
  } else if (event.target.id === 'trade-quantity') {
    updateTradeEstimate();
    main.querySelector('#trade-error').textContent = '';
  }
});

document.addEventListener('change', event => {
  if (event.target.name === 'quiz-answer' && event.target.checked) {
    chooseQuizAnswer(Number(event.target.value));
    return;
  }
  if (event.target.id === 'quiz-count') {
    const count = Number(event.target.value);
    if (quizCounts.includes(count)) main.querySelector('#quiz-target').textContent = 'Target ' + Math.ceil(count * 4 / 5) + ' of ' + count + ' correct (80%). No time limit.';
    return;
  }
  if (event.target.id !== 'history-page-size') return;
  const size = Number(event.target.value);
  if (![10, 20, 50].includes(size)) return;
  historyPageSize = size;
  historyPage = 0;
  refreshTransactionHistory('#history-page-size');
});

function placeTrade(form, side) {
  const shownTick = form.dataset.quoteTick === '' ? null : Number(form.dataset.quoteTick);
  const shownPrice = form.dataset.quotePrice === '' ? null : Number(form.dataset.quotePrice);
  student = loadStudent(student);
  if (!demoQuotesAvailable(student.account) || !Number.isSafeInteger(shownTick) || shownTick !== demoQuoteTick(student.account)
    || !Number.isSafeInteger(shownPrice) || shownPrice !== quotePrice(student.account, stockByTicker(ticker))) {
    refreshDemoQuotes();
    main.querySelector('#trade-error').textContent = demoQuotesAvailable(student.account)
      ? 'The demo quote changed. Order paused; review the updated price and submit again.'
      : 'Demo quotes are unavailable. Orders are paused.';
    return;
  }
  const quantity = Number(new FormData(form).get('quantity'));
  const result = executeTrade(student.account, ticker, side, quantity, Date.now());
  if (result.error) {
    main.querySelector('#trade-error').textContent = result.error;
    return;
  }
  saveStudent({ ...student, account: result.account });
  rerender('#trade-quantity');
  const verb = side === 'buy' ? 'Bought' : 'Sold';
  const message = `${verb} ${quantity} ${quantity === 1 ? 'share' : 'shares'} of ${ticker} for ${rupiah(result.trade.value)} in virtual money.`;
  const notice = main.querySelector('#trade-result');
  notice.textContent = message;
  notice.hidden = false;
  announce(message);
}

function submitJourney(form, months) {
  const data = new FormData(form);
  const weights = data.getAll('weight').map(Number);
  if (sum(weights) !== 100) {
    main.querySelector('#journey-error').textContent = 'Your allocation totals ' + sum(weights) + '%. Adjust it to 100% before advancing.';
    form.elements.weight[0].focus();
    return;
  }
  const plan = { ...journey.sim, weights, allowance: Number(data.get('allowance')) };
  journey = stepJourney(journey, plan, months);
  rerender(`[name="months"][value="${months}"]`);
  announce('Life-stage simulation advanced to month ' + journey.sim.month + '.');
}

document.addEventListener('submit', event => {
  const form = event.target;
  if (!['mentor-form', 'trade-form', 'journey-form'].includes(form.id)) return;
  event.preventDefault();
  if (form.id === 'mentor-form') sendMentor(form.elements.message.value);
  else if (form.id === 'trade-form') placeTrade(form, event.submitter?.value ?? 'buy');
  else submitJourney(form, Number(event.submitter?.value ?? 6));
});

window.addEventListener('hashchange', () => {
  if (location.hash === renderedHash || location.hash === '#main') return;
  page = route();
  showPage();
});

window.addEventListener('storage', event => {
  if (event.key === sessionKey) {
    sessions = loadSessions(sessions);
    if (page === 'mentor') renderPanel();
  }
});

document.querySelector('.skip').addEventListener('click', event => {
  event.preventDefault();
  main.focus();
});

narrowScreen.addEventListener('change', event => setMenu(!event.matches));
window.setInterval(tickDemoQuotes, 5000);
setMenu(!narrowScreen.matches);
render();
