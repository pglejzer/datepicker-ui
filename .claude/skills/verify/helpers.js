(() => {
  if (window.__dp) return;
  const errors = [];
  window.addEventListener('error', (e) => errors.push('pageerror: ' + String(e.message).slice(0, 300)));
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason && e.reason.message ? e.reason.message : e.reason;
    errors.push('unhandledrejection: ' + String(reason).slice(0, 300));
  });
  const originalConsoleError = console.error.bind(console);
  console.error = (...args) => {
    errors.push('console.error: ' + args.map((a) => (a && a.message) || String(a)).join(' ').slice(0, 300));
    originalConsoleError(...args);
  };
  const FREEZE_CSS =
    '*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}' +
    'html{scroll-behavior:auto!important}';
  const addStyle = (id, css) => {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('style');
      el.id = id;
      (document.head || document.documentElement).appendChild(el);
    }
    el.textContent = css;
  };
  const removeStyle = (id) => {
    const el = document.getElementById(id);
    if (el) el.remove();
  };
  const whenDom = (fn) => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  };
  whenDom(() => addStyle('verify-freeze', FREEZE_CSS));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
  const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const until = async (predicate, timeout) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const value = predicate();
      if (value) return value;
      await sleep(50);
    }
    return null;
  };
  const SURFACE = ':is(.dp-ui__container--docked:popover-open, .dp-ui__dialog[open] .dp-ui__container)';
  const surface = () => document.querySelector(SURFACE);
  const resolve = (selector) => selector.replace(/^S(?=\s|$)/, SURFACE);
  const describe = (el) => {
    if (!el) return null;
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (cls ? '.' + cls : '');
  };
  const center = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };
  const hits = (el, x, y) => {
    const top = document.elementFromPoint(x, y);
    return !!top && (top === el || el.contains(top));
  };
  const visible = (el) => {
    if (el.offsetParent === null) return false;
    const p = center(el);
    return p.x >= 0 && p.y >= 0 && p.x < innerWidth && p.y < innerHeight && hits(el, p.x, p.y);
  };
  const containerIn = (selector) => {
    const el = document.querySelector(resolve(selector));
    if (!el) return null;
    return el.matches('.dp-ui__container') ? el : el.querySelector('.dp-ui__container');
  };
  const rootFor = async (rootSelector) => {
    if (!rootSelector) return surface();
    const root = containerIn(rootSelector);
    if (root) {
      root.scrollIntoView({ block: 'center', behavior: 'instant' });
      await frames();
    }
    return root;
  };
  const compact = (obj) =>
    Object.fromEntries(
      Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && !v.length)),
    );
  const settle = async () => {
    await sleep(60);
    await until(
      () => !document.querySelector('.dp-ui__container--morphing, .dp-ui__pager--dragging, .dp-ui__ghost'),
      2000,
    );
    const running = document.getAnimations().filter((a) => a.playState === 'running');
    if (running.length) await Promise.race([Promise.all(running.map((a) => a.finished.catch(() => null))), sleep(1500)]);
    await frames();
  };
  const dates = (root, cls) =>
    root ? Array.from(root.querySelectorAll('td.dp-ui__date.' + cls)).map((td) => td.dataset.date) : [];
  const has = (el, cls) => (el ? el.classList.contains('dp-ui__container--' + cls) : null);
  const readState = (inputSelector, rootSelector) => {
    const c = rootSelector ? containerIn(rootSelector) : surface();
    const q = (s) => (c ? c.querySelector(s) : null);
    const txt = (s) => (q(s) ? q(s).textContent.trim() : null);
    const input = inputSelector ? document.querySelector(resolve(inputSelector)) : null;
    const host = input ? input.closest('.dp-ui') : null;
    const hidden = host ? host.querySelector('input.dp-ui__form-value') : null;
    const confirm = q('.dp-ui__text-button--confirm, .dp-ui__text-button--save');
    let mode = null;
    if (c) {
      if (has(c, 'docked')) mode = 'docked';
      else if (has(c, 'modal')) mode = 'modal';
      else if (has(c, 'inline')) mode = 'inline';
    }
    const box = c ? c.getBoundingClientRect() : null;
    return compact({
      open: !!surface(),
      mode,
      theme: c ? c.dataset.theme || (c.closest('[data-theme]') || {}).dataset?.theme : null,
      scheme: c ? c.dataset.colorScheme || (c.closest('[data-color-scheme]') || {}).dataset?.colorScheme : null,
      placement: c ? c.dataset.placement : null,
      positioning: c ? c.dataset.positioning : null,
      range: has(c, 'range'),
      presets: has(c, 'presets'),
      multiMonth: has(c, 'multi-month'),
      inputView: has(c, 'input'),
      fullscreen: has(c, 'fullscreen'),
      menuOpen: has(c, 'menu-open'),
      display: c ? getComputedStyle(c).display : null,
      size: box ? [Math.round(box.width), Math.round(box.height)] : null,
      headline: txt('.dp-ui__headline'),
      captions: c
        ? Array.from(c.querySelectorAll('caption, .dp-ui__menu-button--month .dp-ui__menu-button-label, .dp-ui__menu-button--year .dp-ui__menu-button-label, .dp-ui__menu-button--year-grid .dp-ui__menu-button-label'))
            .filter(visible)
            .map((e) => e.textContent.trim())
            .slice(0, 4)
        : [],
      selected: dates(c, 'dp-ui__date--selected'),
      rangeStart: dates(c, 'dp-ui__date--range-start')[0],
      rangeEnd: dates(c, 'dp-ui__date--range-end')[0],
      inRange: dates(c, 'dp-ui__date--in-range').length,
      pressedPreset: txt('.dp-ui__preset[aria-pressed="true"]'),
      confirmDisabled: confirm ? confirm.disabled || confirm.getAttribute('aria-disabled') === 'true' : null,
      focusInSurface: c ? c.contains(document.activeElement) : null,
      focusedDate: document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.date : null,
      active: describe(document.activeElement),
      inputValue: input ? input.value : null,
      inputInvalid: input ? input.getAttribute('aria-invalid') : null,
      expanded: input ? input.getAttribute('aria-expanded') : null,
      formValue: hidden ? hidden.value : null,
    });
  };
  const fingerprint = (rootSelector, ignoreSelector) => {
    const root = document.querySelector(resolve(rootSelector));
    if (!root) return { root: rootSelector, viewport: [innerWidth, innerHeight], count: 0, missing: true, nodes: [] };
    const ignored = ignoreSelector ? Array.from(document.querySelectorAll(ignoreSelector)) : [];
    const isIgnored = (el) => ignored.some((i) => i === el || i.contains(el));
    const pickSelector = '[class*="dp-ui"], button, input, select, [role], table, caption, td, th, svg';
    const styleProps = [
      'display',
      'visibility',
      'opacity',
      'color',
      'background-color',
      'border-top-color',
      'border-top-width',
      'border-radius',
      'font-size',
      'font-weight',
      'line-height',
      'box-shadow',
      'transform',
      'z-index',
    ];
    const ariaProps = ['aria-selected', 'aria-pressed', 'aria-disabled', 'aria-expanded', 'aria-current', 'disabled', 'hidden'];
    const base = root.getBoundingClientRect();
    const counters = {};
    const label = (el) => {
      const dp = Array.from(el.classList)
        .filter((c) => c.startsWith('dp-ui'))
        .sort();
      return el.tagName.toLowerCase() + (dp.length ? '.' + dp.join('.') : '');
    };
    const nodes = [];
    for (const el of [root, ...root.querySelectorAll(pickSelector)]) {
      if (isIgnored(el)) continue;
      const key = label(el);
      counters[key] = (counters[key] || 0) + 1;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const style = {};
      for (const p of styleProps) style[p] = cs.getPropertyValue(p);
      const aria = {};
      for (const a of ariaProps) if (el.hasAttribute(a)) aria[a] = el.getAttribute(a);
      nodes.push({
        el: key + '#' + counters[key],
        rect: [Math.round(r.left - base.left), Math.round(r.top - base.top), Math.round(r.width), Math.round(r.height)],
        text: el.children.length === 0 ? (el.textContent || '').trim().slice(0, 40) : undefined,
        value: el.tagName === 'INPUT' ? el.value : undefined,
        aria,
        style,
      });
    }
    return { root: rootSelector, viewport: [innerWidth, innerHeight], count: nodes.length, missing: false, nodes };
  };
  const clickEl = async (el) => {
    let p = center(el);
    if (!hits(el, p.x, p.y)) {
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      await frames();
      p = center(el);
    }
    if (!hits(el, p.x, p.y)) return { ok: false, error: 'not clickable, top: ' + describe(document.elementFromPoint(p.x, p.y)) };
    const init = { bubbles: true, cancelable: true, view: window, clientX: p.x, clientY: p.y, button: 0, pointerType: 'mouse', isPrimary: true };
    el.dispatchEvent(new PointerEvent('pointerdown', init));
    el.dispatchEvent(new PointerEvent('pointerup', init));
    el.click();
    await settle();
    return { ok: true };
  };
  const selectableDays = (root) =>
    Array.from(root.querySelectorAll('td.dp-ui__date[data-date]')).filter(
      (td) =>
        !td.classList.contains('dp-ui__date--disabled') &&
        !td.classList.contains('dp-ui__date--outside-month') &&
        visible(td),
    );
  const probes = {};
  let pickerClass = null;
  const findPicker = async () => {
    if (pickerClass) return pickerClass;
    const entry = performance
      .getEntriesByType('resource')
      .map((e) => e.name)
      .find((n) => /\/src\/index\.ts(\?|$)/.test(n));
    if (!entry) return null;
    const mod = await import(/* @vite-ignore */ entry);
    pickerClass = mod.default || null;
    return pickerClass;
  };
  const PROBE_EVENTS = ['open', 'close', 'cancel', 'confirm', 'update', 'error', 'select:day', 'range:start', 'range:end', 'navigate'];
  window.__dp = {
    async ready(selector, options = {}) {
      const el = await until(() => document.querySelector(selector), options.timeout || 20000);
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      if (options.extraWait) await sleep(options.extraWait);
      await frames();
      return { ready: !!el, selector };
    },
    hide(css) {
      addStyle('verify-hide', css);
      return { ok: true };
    },
    async top() {
      window.scrollTo(0, 0);
      await frames();
      return { ok: true };
    },
    async reveal(selector) {
      const el = document.querySelector(resolve(selector));
      if (!el) return { ok: false, error: 'not found: ' + selector };
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      await settle();
      return { ok: true };
    },
    async settle() {
      await settle();
      return { ok: true };
    },
    async wait(ms) {
      await sleep(ms);
      return { ok: true };
    },
    async open(selector) {
      const input = document.querySelector(resolve(selector));
      if (!input) return { ok: false, error: 'not found: ' + selector };
      input.scrollIntoView({ block: 'center', behavior: 'instant' });
      await frames();
      const p = center(input);
      if (!hits(input, p.x, p.y)) return { ok: false, error: 'covered by ' + describe(document.elementFromPoint(p.x, p.y)) };
      input.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: p.x, clientY: p.y, pointerType: 'mouse', isPrimary: true }));
      input.click();
      const s = await until(() => surface(), 3000);
      await settle();
      if (!s) return { ok: false, error: 'no surface opened' };
      return { ok: true, ...readState(selector) };
    },
    async openStable(selector, count = 30) {
      removeStyle('verify-freeze');
      try {
        const input = document.querySelector(resolve(selector));
        if (!input) return { ok: false, error: 'not found: ' + selector };
        input.scrollIntoView({ block: 'center', behavior: 'instant' });
        await frames();
        input.click();
        const samples = [];
        for (let i = 0; i < count; i++) {
          await frame();
          const s = surface();
          if (!s) continue;
          const r = s.getBoundingClientRect();
          samples.push(getComputedStyle(s).display + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
        }
        const layouts = [...new Set(samples)];
        return { ok: samples.length > 0, stable: layouts.length === 1, layouts };
      } finally {
        addStyle('verify-freeze', FREEZE_CSS);
        await settle();
      }
    },
    async click(selector) {
      const all = Array.from(document.querySelectorAll(resolve(selector)));
      const el = all.find(visible) || all[0];
      if (!el) return { ok: false, error: 'not found: ' + selector };
      return clickEl(el);
    },
    async day(iso, rootSelector) {
      const root = await rootFor(rootSelector);
      if (!root) return { ok: false, error: 'no surface' };
      const td = root.querySelector('td.dp-ui__date[data-date="' + iso + '"]');
      if (!td) return { ok: false, error: 'no day ' + iso };
      const r = await clickEl(td);
      return { ...r, iso, disabled: td.classList.contains('dp-ui__date--disabled') };
    },
    async pick(n, rootSelector) {
      const root = await rootFor(rootSelector);
      if (!root) return { ok: false, error: 'no surface' };
      const days = selectableDays(root);
      const td = n < 0 ? days[days.length + n] : days[n];
      if (!td) return { ok: false, error: 'no selectable day #' + n + ' of ' + days.length };
      const iso = td.dataset.date;
      const r = await clickEl(td);
      return { ...r, iso };
    },
    async disabledDays(rootSelector) {
      const root = await rootFor(rootSelector);
      if (!root) return { error: 'no surface' };
      const all = Array.from(root.querySelectorAll('td.dp-ui__date[data-date]:not(.dp-ui__date--outside-month)')).filter(visible);
      return { total: all.length, disabled: all.filter((td) => td.classList.contains('dp-ui__date--disabled')).length };
    },
    async outside() {
      await sleep(50);
      const init = { bubbles: true, cancelable: true, clientX: 5, clientY: 5, pointerType: 'mouse', isPrimary: true };
      document.body.dispatchEvent(new PointerEvent('pointerdown', init));
      document.body.dispatchEvent(new PointerEvent('pointerup', init));
      document.body.dispatchEvent(new MouseEvent('click', init));
      await settle();
      return { ok: true };
    },
    focus(selector) {
      const el = document.querySelector(resolve(selector));
      if (!el) return { ok: false, error: 'not found: ' + selector };
      el.focus();
      return { ok: document.activeElement === el, active: describe(document.activeElement) };
    },
    async type(selector, value, options = {}) {
      const el = document.querySelector(resolve(selector));
      if (!el) return { ok: false, error: 'not found: ' + selector };
      el.focus();
      el.value = String(value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      if (!options.keepFocus) el.blur();
      await settle();
      return { ok: true, value: el.value };
    },
    async waitOpen(timeout = 3000) {
      const s = await until(() => surface(), timeout);
      await settle();
      return { open: !!s, ...readState() };
    },
    async waitClosed(timeout = 4000) {
      await until(() => !surface(), timeout);
      await sleep(100);
      return { closed: !surface() };
    },
    state(inputSelector, rootSelector) {
      return readState(inputSelector, rootSelector);
    },
    value(selector) {
      const el = document.querySelector(resolve(selector));
      return { value: el ? el.value : null };
    },
    text(selector) {
      const el = document.querySelector(resolve(selector));
      return { text: el ? el.textContent.trim() : null };
    },
    count(selector) {
      return { count: document.querySelectorAll(resolve(selector)).length };
    },
    errors() {
      return { errors: errors.slice() };
    },
    async probe(id, options = {}) {
      const DP = await findPicker();
      if (!DP) return { ok: false, error: 'DatepickerUI module not found in the Vite resource list (lib demo only)' };
      if (probes[id]) return { ok: false, error: 'probe exists: ' + id };
      const host = document.createElement('div');
      const index = Object.keys(probes).length;
      host.style.cssText = `position:fixed;top:${8 + 52 * index}px;right:8px;z-index:4999;background:#fff;padding:4px`;
      const input = document.createElement('input');
      input.id = id;
      host.appendChild(input);
      document.body.appendChild(host);
      const log = [];
      const picker = new DP(input, options);
      picker.create();
      PROBE_EVENTS.forEach((name) => picker.on(name, () => log.push(name)));
      probes[id] = { picker, log, host };
      return { ok: true };
    },
    log(id) {
      const p = probes[id];
      return p ? { log: p.log.join(','), count: p.log.length } : { error: 'no probe ' + id };
    },
    clearLog(id) {
      const p = probes[id];
      if (p) p.log.length = 0;
      return { ok: !!p };
    },
    call(id, method, ...args) {
      const p = probes[id];
      if (!p) return { error: 'no probe ' + id };
      const result = p.picker[method](...args);
      return { result: result === undefined ? null : JSON.parse(JSON.stringify(result)) };
    },
    surfaceCount() {
      return {
        docked: document.querySelectorAll('.dp-ui__container--docked:popover-open').length,
        modal: document.querySelectorAll('.dp-ui__dialog[open]').length,
      };
    },
    fingerprint,
  };
})();
