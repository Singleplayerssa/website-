/* Official provider updates headlines while the news component is on screen. */
window.financialNewsFeed = (() => {
  const elementName = 'tv-news-feed';
  const moduleUrl = 'https://widgets.tradingview-widget.com/w/en/tv-news-feed.js';
  const sourceUrl = 'https://www.tradingview.com/news/';
  let registration = null;
  let moduleFailed = false;
  let currentHost = null;
  let onState = null;
  let request = 0;
  let timeout = null;

  function ensureModule() {
    if (customElements.get(elementName)) return Promise.resolve();
    if (registration) return registration;

    registration = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = moduleUrl;
      script.dataset.financialNewsModule = '';
      script.addEventListener('error', () => {
        moduleFailed = true;
        reject(new Error('News module unavailable'));
      }, { once: true });
      customElements.whenDefined(elementName).then(resolve);
      document.head.append(script);
    });
    return registration;
  }

  function publish(status, loadedAt = null) {
    if (!currentHost?.isConnected) return;
    currentHost.dataset.feedState = status;
    currentHost.setAttribute('aria-busy', String(status === 'loading'));
    onState?.({ status, loadedAt });
  }

  function placeholder(title, description, withLink = false) {
    const box = document.createElement('div');
    box.className = 'news-feed-placeholder';
    const heading = document.createElement('h3');
    heading.textContent = title;
    const text = document.createElement('p');
    text.textContent = description;
    box.append(heading, text);
    if (withLink) {
      const link = document.createElement('a');
      link.href = sourceUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Read current headlines on TradingView ↗';
      box.append(link);
    }
    return box;
  }

  function load() {
    if (!currentHost?.isConnected) return;
    const activeRequest = ++request;
    const host = currentHost;
    const isCurrent = () => request === activeRequest && currentHost === host && host.isConnected;
    window.clearTimeout(timeout);
    publish('loading');

    const loading = placeholder('Connecting to the market newsroom', 'Loading financial headlines from TradingView…');
    host.replaceChildren(loading);
    const widget = document.createElement(elementName);
    widget.setAttribute('assets-type', 'all');
    widget.setAttribute('news-type', 'top-stories');
    widget.setAttribute('layout-mode', 'grid');
    widget.setAttribute('item-size', 'normal');
    widget.setAttribute('theme', 'light');
    widget.setAttribute('aria-label', 'Financial headlines from TradingView');
    widget.hidden = true;
    host.append(widget);

    const fail = () => {
      if (!isCurrent()) return;
      window.clearTimeout(timeout);
      host.replaceChildren(placeholder(
        'The newsroom is temporarily unavailable',
        'Use Refresh news to reconnect, or open the source directly.',
        true,
      ));
      publish('error');
    };

    timeout = window.setTimeout(fail, 20_000);
    widget.addEventListener('tv-widget-error', fail);

    ensureModule().then(() => {
      if (!isCurrent() || !widget.isConnected) return;
      window.clearTimeout(timeout);
      loading.remove();
      widget.hidden = false;
      // Provider stories expose their own publication times and loading states.
      publish('ready', Date.now());
    }, fail);
  }

  function mount(host, callback) {
    destroy();
    if (!(host instanceof HTMLElement) || typeof callback !== 'function') return;
    currentHost = host;
    onState = callback;
    load();
  }

  function refresh() {
    if (!currentHost?.isConnected) return;
    if (moduleFailed && !customElements.get(elementName)) {
      window.location.reload();
      return;
    }
    load();
  }

  function destroy() {
    request += 1;
    window.clearTimeout(timeout);
    timeout = null;
    currentHost?.replaceChildren();
    currentHost = null;
    onState = null;
  }

  return { mount, refresh, destroy };
})();

