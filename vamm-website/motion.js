(() => {
  'use strict';

  const main = document.querySelector('#main');
  const toolbar = document.querySelector('.toolbar-actions');
  if (!main || !toolbar) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const storageKey = 'vamm-motion-preference';
  let preference = 'on';
  try { if (localStorage.getItem(storageKey) === 'off') preference = 'off'; } catch {}

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.id = 'motion-toggle';
  toggle.className = 'motion-toggle';
  toggle.innerHTML = '<svg class="motion-toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="motion-pause" d="M9 5v14M15 5v14"/><path class="motion-play" d="m8 5 11 7-11 7Z"/></svg><span class="motion-toggle-label"></span>';
  toolbar.prepend(toggle);

  const reveal = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-revealed');
      reveal.unobserve(entry.target);
    }
  }, { threshold: 0.05 }) : null;
  const heroVisibility = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    for (const entry of entries) entry.target.classList.toggle('hero-visible', entry.isIntersecting);
  }) : null;

  function prepareView() {
    reveal?.disconnect();
    heroVisibility?.disconnect();
    const enabled = document.body.dataset.motion === 'on';
    const panels = main.querySelectorAll('.home-hero, .home-metric, .feature-card, .page-heading, .screen > .card:not(.quiz-panel), .academy-course-card, .mission-card');
    panels.forEach((panel, index) => {
      panel.setAttribute('data-reveal', '');
      panel.style.setProperty('--reveal-delay', `${Math.min(index, 5) * 60}ms`);
      if (!enabled || !reveal || panel.contains(document.activeElement)) panel.classList.add('is-revealed');
      else if (!panel.classList.contains('is-revealed')) reveal.observe(panel);
    });
    const hero = main.querySelector('.home-hero');
    if (hero) {
      if (heroVisibility) heroVisibility.observe(hero);
      else hero.classList.add('hero-visible');
    }
  }

  function sync() {
    const enabled = preference === 'on' && !reduced.matches;
    document.body.dataset.motion = enabled ? 'on' : 'off';
    document.body.classList.add('motion-ready');
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.setAttribute('aria-label', reduced.matches ? 'Animations off: reduced motion is enabled in device settings' : 'Decorative animations');
    toggle.title = reduced.matches ? 'Reduced motion is enabled in your device settings' : enabled ? 'Pause decorative animations' : 'Play decorative animations';
    toggle.disabled = reduced.matches;
    toggle.querySelector('.motion-toggle-label').textContent = enabled ? 'Motion on' : 'Motion off';
    prepareView();
  }

  toggle.addEventListener('click', () => {
    preference = document.body.dataset.motion === 'on' ? 'off' : 'on';
    try { localStorage.setItem(storageKey, preference); } catch {}
    sync();
  });
  reduced.addEventListener('change', sync);
  window.addEventListener('storage', event => {
    if (event.key !== storageKey) return;
    preference = event.newValue === 'off' ? 'off' : 'on';
    sync();
  });
  document.addEventListener('visibilitychange', () => {
    document.body.dataset.pageHidden = String(document.hidden);
  });
  main.addEventListener('focusin', event => {
    const panel = event.target.closest('[data-reveal]');
    if (panel) {
      panel.classList.add('is-revealed');
      reveal?.unobserve(panel);
    }
  });
  new MutationObserver(prepareView).observe(main, { childList: true });
  document.body.dataset.pageHidden = String(document.hidden);
  sync();
})();
