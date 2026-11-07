(() => {
  'use strict';

  const profile = document.querySelector('.toolbar > .profile-button');
  if (!profile) return;
  const topics = {
    home: 'Find reliable beginner investing resources.',
    academy: 'Find primary sources that explain a basic investing concept.',
    market: 'Find a reliable explanation of stock quotes and order types.',
    mentor: 'Find primary sources that explain price-to-earnings ratios.',
    missions: 'Find learning resources for practicing investing concepts.',
    news: 'Find recent financial updates from official publishers.',
    profile: 'Find educational resources on tracking a practice portfolio.',
  };
  const canSearch = location.protocol === 'http:' || location.protocol === 'https:';
  const actions = document.createElement('div');
  actions.className = 'toolbar-actions';
  const opener = document.createElement('button');
  opener.id = 'open-source-search';
  opener.className = 'source-search-trigger';
  opener.type = 'button';
  opener.setAttribute('aria-label', 'Search sources');
  opener.setAttribute('aria-haspopup', 'dialog');
  opener.setAttribute('aria-controls', 'source-search-dialog');
  opener.innerHTML = '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 4.2 4.2"/></svg><span class="source-search-trigger-label">Search sources</span>';
  profile.before(actions);
  actions.append(opener, profile);

  const dialog = document.createElement('dialog');
  dialog.id = 'source-search-dialog';
  dialog.className = 'source-search-dialog';
  dialog.setAttribute('aria-labelledby', 'source-search-title');
  dialog.setAttribute('aria-describedby', 'source-search-provider');
  dialog.innerHTML = `<header class="source-search-header"><div><span class="eyebrow">Research</span><h2 id="source-search-title">Search sources</h2></div><button type="button" class="icon-button" aria-label="Close source search" data-close-source-search>×</button></header>
    <div class="source-search-body">
      <p id="source-search-provider">Live web search via OpenAI. Selecting Search sends your question and current section.</p>
      <form id="source-search-form" class="source-search-form">
        <label for="source-search-query">Question</label>
        <textarea id="source-search-query" required minlength="3" maxlength="400" rows="3" autofocus></textarea>
        <div class="actions"><button type="submit" class="primary">Search</button><button type="button" id="cancel-source-search" hidden>Cancel search</button></div>
      </form>
      <p id="source-search-status" class="source-search-status" role="status" aria-live="polite"></p>
      <section id="source-search-result" class="source-search-result" aria-labelledby="source-search-result-title" hidden>
        <h3 id="source-search-result-title" tabindex="-1">Research result</h3>
        <p id="source-search-answer" class="source-search-answer"></p>
        <div id="source-search-source-list"><h4>Sources</h4><ol id="source-search-sources"></ol></div>
      </section>
    </div>`;
  document.body.append(dialog);

  const form = dialog.querySelector('form');
  const query = dialog.querySelector('textarea');
  const submit = form.querySelector('[type="submit"]');
  const cancel = dialog.querySelector('#cancel-source-search');
  const status = dialog.querySelector('#source-search-status');
  const result = dialog.querySelector('#source-search-result');
  const answer = dialog.querySelector('#source-search-answer');
  const sourceList = dialog.querySelector('#source-search-sources');
  let activeRequest = null;
  let section = 'home';

  function showStatus(message, error = false) {
    status.classList.toggle('error', error);
    status.setAttribute('role', error ? 'alert' : 'status');
    status.setAttribute('aria-live', error ? 'assertive' : 'polite');
    status.textContent = message;
  }

  function busy(isBusy) {
    submit.setAttribute('aria-disabled', String(isBusy || !canSearch));
    cancel.hidden = !isBusy;
    result.setAttribute('aria-busy', String(isBusy));
  }

  function stopRequest() {
    const request = activeRequest;
    activeRequest = null;
    request?.abort();
    busy(false);
  }

  function clearResult() {
    result.hidden = true;
    answer.replaceChildren();
    sourceList.replaceChildren();
  }

  function safeUrl(value) {
    if (typeof value !== 'string') return null;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password ? url : null;
    } catch { return null; }
  }

  function sourceLink(source, text) {
    const anchor = document.createElement('a');
    anchor.href = source.url.href;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = text;
    anchor.setAttribute('aria-label', `${text}${text === source.title ? '' : ' ' + source.title} (opens in a new tab)`);
    return anchor;
  }

  function showResult(payload) {
    if (typeof payload?.answer !== 'string' || !payload.answer.trim() || payload.answer.length > 30_000 || !Array.isArray(payload.sources)) return false;
    const sources = payload.sources.slice(0, 60).map(item => {
      const url = safeUrl(item?.url);
      if (!url) return null;
      return { url, title: typeof item.title === 'string' && item.title.trim() ? item.title.trim().slice(0, 220) : url.hostname };
    });
    const fragments = document.createDocumentFragment();
    let linked = false;
    for (const part of payload.answer.split(/(\[\d+\])/)) {
      const marker = /^\[(\d+)\]$/.exec(part);
      const source = marker && sources[Number(marker[1]) - 1];
      if (source) {
        const link = sourceLink(source, part);
        link.className = 'source-search-citation';
        fragments.append(link);
        linked = true;
      } else fragments.append(document.createTextNode(part));
    }
    if (!linked) return false;
    answer.append(fragments);
    sources.forEach((source, index) => {
      if (!source) return;
      const item = document.createElement('li');
      item.value = index + 1;
      item.append(sourceLink(source, source.title));
      sourceList.append(item);
    });
    result.hidden = false;
    showStatus('Search complete.');
    dialog.querySelector('#source-search-result-title').focus();
    return true;
  }

  opener.addEventListener('click', () => {
    const hash = location.hash.slice(1).split('/')[0];
    section = Object.hasOwn(topics, hash) ? hash : 'home';
    query.value = topics[section];
    query.setCustomValidity('');
    clearResult();
    busy(false);
    showStatus(canSearch ? '' : 'Open the localhost version of Vamm to search sources.');
    dialog.showModal();
    query.select();
  });
  dialog.querySelector('[data-close-source-search]').addEventListener('click', () => { stopRequest(); dialog.close(); });
  dialog.addEventListener('cancel', stopRequest);
  dialog.addEventListener('close', () => { stopRequest(); clearResult(); opener.focus({ preventScroll: true }); });
  window.addEventListener('hashchange', () => { if (dialog.open) { stopRequest(); dialog.close(); } });
  query.addEventListener('input', () => {
    query.setCustomValidity('');
    if (activeRequest || !result.hidden) {
      stopRequest();
      clearResult();
      showStatus('Question changed. Select Search for updated sources.');
    }
  });
  cancel.addEventListener('click', () => { stopRequest(); showStatus('Search canceled.'); submit.focus(); });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!canSearch || activeRequest || !dialog.open) return;
    const text = query.value.trim();
    if (text.length < 3 || text.length > 400) {
      query.setCustomValidity('Enter a question with 3 to 400 characters.');
      query.reportValidity();
      return;
    }
    const request = new AbortController();
    activeRequest = request;
    clearResult();
    busy(true);
    showStatus('Searching the web for sources…');
    try {
      const response = await fetch('/api/research', {
        method: 'POST', mode: 'same-origin', credentials: 'omit', cache: 'no-store', redirect: 'error',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ section, query: text }), signal: request.signal,
      });
      const payload = await response.json();
      if (activeRequest !== request || !dialog.open) return;
      if (!response.ok) showStatus(typeof payload?.error === 'string' && payload.error.trim() ? payload.error.trim().slice(0, 260) : 'Source search is unavailable. Try again.', true);
      else if (!showResult(payload)) showStatus('Source search returned an incomplete result. Try again.', true);
    } catch {
      if (activeRequest === request && dialog.open) showStatus('Couldn’t reach source search. Check the local server and try again.', true);
    } finally {
      if (activeRequest === request) { activeRequest = null; busy(false); }
    }
  });
})();
