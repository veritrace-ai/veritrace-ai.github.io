/* ==========================================================================
   VeriTrace AI — Motion Engine
   GSAP + ScrollTrigger + SplitText + Lenis
   Declarative: behaviour is driven by data-attributes in the markup.
   ========================================================================== */
(function () {
  'use strict';

  /* ----------------------------------------------------------------------
     0. Guards & helpers
     ---------------------------------------------------------------------- */
  var doc = document;
  var root = doc.documentElement;
  var hasGSAP = typeof window.gsap !== 'undefined';
  var hasST = typeof window.ScrollTrigger !== 'undefined';
  var hasSplit = typeof window.SplitText !== 'undefined';
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var IS_TOUCH = window.matchMedia('(hover: none), (pointer: coarse)').matches;

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  /* ----------------------------------------------------------------------
     0b. Failsafe reveal
     Guarantees the page is never left blank behind the preloader — covers
     script errors, missing vendors, throttled rAF and background tabs.
     ---------------------------------------------------------------------- */
  var revealed = false;
  function forceReveal() {
    if (revealed) return;
    revealed = true;
    root.classList.remove('vt-js');
    root.classList.add('vt-ready');
    doc.body.classList.remove('vt-locked', 'vt-menu-open');
    if (lenis) { try { lenis.start(); } catch (e) {} }
    var pre = doc.querySelector('.preloader');
    if (pre) { pre.style.display = 'none'; }
    try {
      gsap.set('[data-reveal],[data-fade],[data-stagger] > *, .split-line-inner, .split-word, .split-char',
        { clearProps: 'all' });
    } catch (e) {}
    if (hasST) { try { window.ScrollTrigger.refresh(); } catch (e) {} }
  }
  window.vtForceReveal = forceReveal;

  // Catch any runtime error before the curtain lifts.
  window.addEventListener('error', function () {
    if (!root.classList.contains('vt-ready')) forceReveal();
  });
  window.addEventListener('unhandledrejection', function () {
    if (!root.classList.contains('vt-ready')) forceReveal();
  });

  // Hard timeout — if the intro hasn't finished, get out of the way.
  window.setTimeout(function () {
    if (!root.classList.contains('vt-ready')) forceReveal();
  }, 5000);

  // If the tab is hidden during load, rAF is throttled — don't leave a curtain up.
  doc.addEventListener('visibilitychange', function () {
    if (!doc.hidden && !root.classList.contains('vt-ready')) {
      window.setTimeout(function () {
        if (!root.classList.contains('vt-ready')) forceReveal();
      }, 900);
    }
  });

  if (!hasGSAP) {
    forceReveal();
    return;
  }

  var gsap = window.gsap;
  gsap.registerPlugin.apply(gsap, [window.ScrollTrigger, window.SplitText, window.ScrollToPlugin, window.CustomEase].filter(Boolean));

  if (REDUCED) {
    revealed = true;
    root.classList.remove('vt-js');
    root.classList.add('vt-ready');
    initStatic();
    return;
  }

  gsap.defaults({ ease: 'power3.out', duration: 0.9 });
  gsap.config({ nullTargetWarn: false });

  /* ----------------------------------------------------------------------
     1. Lenis smooth scroll
     ---------------------------------------------------------------------- */
  var lenis = null;
  if (typeof window.Lenis !== 'undefined') {
    lenis = new window.Lenis({
      duration: 1.1,
      lerp: 0.1,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
      infinite: false
    });
    lenis.on('scroll', function () { if (hasST) window.ScrollTrigger.update(); });
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    window.vtLenis = lenis; // exposed for debugging and integration testing
  }

  var bodyLocked = false;
  function lockScroll(lock) {
    bodyLocked = lock;
    doc.body.classList.toggle('vt-locked', lock);
    if (lenis) { lock ? lenis.stop() : lenis.start(); }
  }
  function scrollToTarget(target) {
    if (lenis) { lenis.scrollTo(target, { offset: -70, duration: 1.2 }); }
    else {
      var el = typeof target === 'string' ? $(target) : target;
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - 70, behavior: 'smooth' });
    }
  }

  /* ----------------------------------------------------------------------
     2. Custom cursor
     ---------------------------------------------------------------------- */
  function initCursor() {
    if (IS_TOUCH) return;
    var ring = doc.createElement('div');
    var dot = doc.createElement('div');
    ring.className = 'cursor';
    dot.className = 'cursor-dot';
    doc.body.appendChild(ring);
    doc.body.appendChild(dot);

    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var rx = mx, ry = my;

    gsap.set([ring, dot], { xPercent: -50, yPercent: -50, opacity: 0 });

    window.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      gsap.to(dot, { x: mx, y: my, duration: 0.14, ease: 'power2.out', opacity: 1, overwrite: true });
    }, { passive: true });

    gsap.ticker.add(function () {
      rx += (mx - rx) * 0.14;
      ry += (my - ry) * 0.14;
      gsap.set(ring, { x: rx, y: ry });
    });

    var hoverSel = 'a, button, [data-cursor], input, textarea, select, .card, .price, .hpin__panel';
    doc.addEventListener('mouseover', function (e) {
      if (e.target.closest && e.target.closest(hoverSel)) doc.body.classList.add('vt-cursor-hover');
    });
    doc.addEventListener('mouseout', function (e) {
      if (e.target.closest && e.target.closest(hoverSel)) doc.body.classList.remove('vt-cursor-hover');
    });
    doc.addEventListener('mouseleave', function () { gsap.to([ring, dot], { opacity: 0, duration: 0.3 }); });
    doc.addEventListener('mouseenter', function () { gsap.to([ring, dot], { opacity: 1, duration: 0.3 }); });
  }

  /* ----------------------------------------------------------------------
     3. Navigation
     ---------------------------------------------------------------------- */
  function initNav() {
    var nav = $('.nav');
    if (!nav) return;
    var inner = $('.nav__inner', nav);
    var progress = $('.nav__progress', nav);
    var lastY = window.pageYOffset;
    var stuck = false, hidden = false;

    function onScroll(y) {
      var shouldStick = y > 40;
      if (shouldStick !== stuck) {
        stuck = shouldStick;
        nav.classList.toggle('is-stuck', stuck);
      }
      // hide on scroll-down, show on scroll-up (only past the fold)
      var goingDown = y > lastY;
      var shouldHide = goingDown && y > 520 && !doc.body.classList.contains('vt-menu-open');
      if (shouldHide !== hidden) {
        hidden = shouldHide;
        nav.classList.toggle('is-hidden', hidden);
      }
      lastY = y;

      if (progress) {
        var max = doc.documentElement.scrollHeight - window.innerHeight;
        var p = max > 0 ? Math.min(1, y / max) : 0;
        progress.style.transform = 'scaleX(' + p + ')';
      }
    }

    if (lenis) { lenis.on('scroll', function (e) { onScroll(e.scroll); }); }
    else { window.addEventListener('scroll', function () { onScroll(window.pageYOffset); }, { passive: true }); }

    // Anchor smooth scroll
    doc.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href');
      if (!id || id === '#') return;
      var target = $(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      scrollToTarget(target);
    });

    // Mobile drawer
    var toggle = $('.nav__toggle');
    var drawer = $('.drawer');
    var drawerLinks = drawer ? $$('a', drawer) : [];
    var tl = null;

    if (drawer) {
      tl = gsap.timeline({ paused: true })
        .fromTo(drawer, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.72, ease: 'expo.inOut' })
        .fromTo(drawerLinks, { yPercent: 120, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, stagger: 0.055, ease: 'power3.out' }, '-=0.32')
        .fromTo('.drawer__foot', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, '-=0.4');
    }

    function openMenu() {
      if (!tl) return;
      doc.body.classList.add('vt-menu-open');
      lockScroll(true);
      tl.play();
    }
    function closeMenu() {
      if (!tl || !doc.body.classList.contains('vt-menu-open')) return;
      doc.body.classList.remove('vt-menu-open');
      lockScroll(false);
      tl.reverse();
    }
    window.vtCloseMenu = closeMenu;

    if (toggle) {
      toggle.addEventListener('click', function () {
        doc.body.classList.contains('vt-menu-open') ? closeMenu() : openMenu();
      });
    }
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

    // Active link
    var path = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
    $$('.nav__link').forEach(function (a) {
      var href = (a.getAttribute('href') || '').split('/').pop().toLowerCase();
      if (href && href === path) a.classList.add('is-active');
    });
  }

  /* ----------------------------------------------------------------------
     4. Split text reveal
     ---------------------------------------------------------------------- */
  var splitCache = [];

  function splitElement(el, type) {
    if (!hasSplit) {
      // Graceful fallback: reveal whole element as one block
      return { lines: [el], words: [el], chars: [el], targets: [el], revert: function () {} };
    }
    var s = new window.SplitText(el, {
      type: type,
      linesClass: 'split-line',
      wordsClass: 'split-word',
      charsClass: 'split-char',
      lineThreshold: 0.3
    });
    splitCache.push(s);
    return s;
  }

  function wrapLines(lines) {
    return lines.map(function (line) {
      if (line.querySelector && line.querySelector(':scope > .split-line-inner')) return line;
      var inner = doc.createElement('span');
      inner.className = 'split-line-inner';
      inner.style.display = 'block';
      inner.style.willChange = 'transform';
      while (line.firstChild) inner.appendChild(line.firstChild);
      line.appendChild(inner);
      return line;
    });
  }

  function initSplits() {
    $$('[data-split]').forEach(function (el) {
      // Skip the hero title — handled by the intro timeline.
      if (el.hasAttribute('data-hero-title')) return;

      var type = el.getAttribute('data-split') || 'lines';
      var delay = parseFloat(el.getAttribute('data-delay') || '0');
      var stagger = parseFloat(el.getAttribute('data-stagger') || (type === 'chars' ? 0.018 : type === 'words' ? 0.03 : 0.1));

      var split = splitElement(el, type);
      // The container itself carries visibility:hidden so nothing flashes
      // before splitting; reveal it now that the children own the animation.
      gsap.set(el, { autoAlpha: 1 });
      var trigger = el.getAttribute('data-trigger');
      var isImmediate = el.hasAttribute('data-immediate');

      var targets, hiddenFrom;

      if (type === 'lines') {
        wrapLines(split.lines);
        targets = $$('.split-line-inner', el);
        hiddenFrom = { yPercent: 118, opacity: 0 };
      } else if (type === 'words') {
        targets = split.words;
        hiddenFrom = { yPercent: 112, opacity: 0 };
      } else {
        targets = split.chars;
        hiddenFrom = { yPercent: 110, opacity: 0, rotateX: -55 };
      }

      gsap.set(targets, hiddenFrom);

      var cfg = {
        yPercent: 0, opacity: 1, rotateX: 0,
        duration: type === 'lines' ? 1.15 : type === 'chars' ? 0.9 : 1,
        ease: type === 'chars' ? 'power4.out' : 'expo.out',
        stagger: stagger,
        delay: delay
      };

      if (isImmediate) {
        gsap.to(targets, cfg);
      } else {
        gsap.to(targets, Object.assign({}, cfg, {
          scrollTrigger: {
            trigger: trigger ? $(trigger) : el,
            start: el.getAttribute('data-start') || 'top 86%',
            once: true
          }
        }));
      }
    });
  }

  /* ----------------------------------------------------------------------
     5. Reveal / stagger / parallax / counters / marquee / draw
     ---------------------------------------------------------------------- */
  function initReveals() {
    $$('[data-reveal]').forEach(function (el) {
      var y = parseFloat(el.getAttribute('data-reveal-y') || '34');
      var x = parseFloat(el.getAttribute('data-reveal-x') || '0');
      var d = parseFloat(el.getAttribute('data-delay') || '0');
      var scale = parseFloat(el.getAttribute('data-reveal-scale') || '1');
      var start = el.getAttribute('data-start') || 'top 88%';

      gsap.set(el, { autoAlpha: 0, y: y, x: x, scale: scale });
      gsap.to(el, {
        autoAlpha: 1, y: 0, x: 0, scale: 1, duration: 1.05, delay: d, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: start, once: true }
      });
    });

    $$('[data-stagger]').forEach(function (group) {
      var kids = $$(group.getAttribute('data-stagger') || ':scope > *', group);
      if (!kids.length) return;
      var amount = parseFloat(group.getAttribute('data-stagger-amount') || '0.09');
      var y = parseFloat(group.getAttribute('data-stagger-y') || '38');
      gsap.set(kids, { autoAlpha: 0, y: y });
      gsap.to(kids, {
        autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: amount,
        scrollTrigger: { trigger: group, start: group.getAttribute('data-start') || 'top 84%', once: true }
      });
    });

    $$('[data-clip]').forEach(function (el) {
      gsap.fromTo(el, { clipPath: 'inset(0 0 100% 0)' }, {
        clipPath: 'inset(0 0 0% 0)', duration: 1.3, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      });
    });
  }

  function initParallax() {
    $$('[data-parallax]').forEach(function (el) {
      var speed = parseFloat(el.getAttribute('data-parallax')) || 0.12;
      gsap.fromTo(el, { yPercent: -speed * 50 }, {
        yPercent: speed * 50, ease: 'none',
        scrollTrigger: { trigger: el.getAttribute('data-parallax-scope') ? $(el.getAttribute('data-parallax-scope')) : el, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
  }

  function initCounters() {
    $$('[data-count]').forEach(function (el) {
      var end = parseFloat(el.getAttribute('data-count')) || 0;
      var dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
      var dur = parseFloat(el.getAttribute('data-duration') || '2');
      var prefix = el.getAttribute('data-prefix') || '';
      var suffix = el.getAttribute('data-suffix') || '';
      var numEl = el.querySelector('[data-count-num]') || el;
      var suffixEl = el.querySelector('.suffix');
      if (suffixEl && !suffixEl.hasAttribute('data-count-num')) suffixEl.textContent = suffix;

      var obj = { v: 0 };
      gsap.to(obj, {
        v: end, duration: dur, ease: 'expo.out',
        snap: dec ? { v: 1 / Math.pow(10, dec) } : { v: 1 },
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        onUpdate: function () {
          var num = obj.v.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
          numEl.textContent = prefix + num;
        }
      });
    });
  }

  function initMarquees() {
    $$('[data-marquee]').forEach(function (el) {
      var track = el.querySelector('.marquee__track') || el;
      var group = track.querySelector('.marquee__group');
      if (!group) return;
      var clone = group.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);

      var dir = parseFloat(el.getAttribute('data-marquee')) || 1;
      var speed = parseFloat(el.getAttribute('data-marquee-speed') || '26');

      gsap.set(track, { xPercent: dir > 0 ? 0 : -50 });
      gsap.to(track, {
        xPercent: dir > 0 ? -50 : 0,
        duration: speed, ease: 'none', repeat: -1
      });
    });
  }

  function initDraws() {
    $$('[data-draw]').forEach(function (svg) {
      var paths = $$('path, line, polyline, circle, rect', svg).filter(function (p) {
        return p.tagName.toLowerCase() !== 'rect' && p.tagName.toLowerCase() !== 'circle';
      });
      if (!paths.length) paths = $$('path, line, polyline', svg);
      paths.forEach(function (p) {
        var len = 0;
        try { len = p.getTotalLength(); } catch (e) { len = 0; }
        if (!len) return;
        gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
      });
      gsap.to(paths, {
        strokeDashoffset: 0, duration: 2.1, ease: 'power2.inOut', stagger: 0.16,
        scrollTrigger: { trigger: svg, start: svg.getAttribute('data-start') || 'top 86%', once: true }
      });
    });
  }

  /* ----------------------------------------------------------------------
     6. Pinned horizontal scroll
     ---------------------------------------------------------------------- */
  function initHorizontal() {
    $$('[data-hpin]').forEach(function (el) {
      var track = el.querySelector('.hpin__track');
      if (!track) return;
      var panels = $$('.hpin__panel', track);
      var bar = el.querySelector('.hpin__progress span');

      function amount() { return Math.max(0, track.scrollWidth - window.innerWidth + 80); }

      var tween = gsap.to(track, {
        x: function () { return -amount(); },
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: function () { return '+=' + (amount() + window.innerHeight * 0.6); },
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
          anticipatePin: 1,
          onUpdate: function (self) {
            if (bar) bar.style.transform = 'scaleX(' + self.progress + ')';
            var idx = Math.min(panels.length - 1, Math.round(self.progress * (panels.length - 1)));
            panels.forEach(function (p, i) { p.classList.toggle('is-active', i === idx); });
          }
        }
      });
      return tween;
    });
  }

  /* ----------------------------------------------------------------------
     7. Scrollytelling
     ---------------------------------------------------------------------- */
  function initScrolly() {
    $$('[data-scrolly]').forEach(function (el) {
      var steps = $$('.scrolly__step', el);
      var layers = $$('.scrolly__layer', el);
      if (!steps.length || !layers.length) return;

      gsap.set(layers.slice(1), { autoAlpha: 0, scale: 1.06 });

      steps.forEach(function (step, i) {
        window.ScrollTrigger.create({
          trigger: step,
          start: 'top 62%',
          end: 'bottom 42%',
          onEnter: function () { activate(i); },
          onEnterBack: function () { activate(i); }
        });
      });

      function activate(i) {
        steps.forEach(function (s, j) { s.classList.toggle('is-active', i === j); });
        layers.forEach(function (l, j) {
          if (j === i) {
            gsap.set(l, { zIndex: 2 });
            gsap.to(l, { autoAlpha: 1, scale: 1, duration: 0.75, ease: 'power3.out', overwrite: true });
          } else {
            gsap.set(l, { zIndex: 0 });
            gsap.to(l, { autoAlpha: 0, scale: 1.04, duration: 0.55, ease: 'power2.out', overwrite: true });
          }
        });
      }
    });
  }

  /* ----------------------------------------------------------------------
     8. Micro-interactions: tilt, magnetic, spotlight, highlight
     ---------------------------------------------------------------------- */
  function initTilt() {
    if (IS_TOUCH) return;
    $$('[data-tilt]').forEach(function (el) {
      var strength = parseFloat(el.getAttribute('data-tilt')) || 8;
      var rect;
      el.addEventListener('mouseenter', function () { rect = el.getBoundingClientRect(); });
      el.addEventListener('mousemove', function (e) {
        if (!rect) rect = el.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width - 0.5;
        var py = (e.clientY - rect.top) / rect.height - 0.5;
        gsap.to(el, {
          rotateY: px * strength, rotateX: -py * strength,
          transformPerspective: 900, transformOrigin: 'center',
          duration: 0.55, ease: 'power2.out'
        });
      });
      el.addEventListener('mouseleave', function () {
        gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.8, ease: 'elastic.out(1, 0.55)' });
      });
    });
  }

  function initMagnetic() {
    if (IS_TOUCH) return;
    $$('[data-magnetic]').forEach(function (el) {
      var strength = parseFloat(el.getAttribute('data-magnetic')) || 0.32;
      var rect;
      el.addEventListener('mouseenter', function () { rect = el.getBoundingClientRect(); });
      el.addEventListener('mousemove', function (e) {
        if (!rect) rect = el.getBoundingClientRect();
        var x = (e.clientX - rect.left - rect.width / 2) * strength;
        var y = (e.clientY - rect.top - rect.height / 2) * strength;
        gsap.to(el, { x: x, y: y, duration: 0.5, ease: 'power2.out' });
        var label = el.querySelector('.btn__label');
        if (label) gsap.to(label, { x: x * 0.22, y: y * 0.22, duration: 0.5, ease: 'power2.out' });
      });
      el.addEventListener('mouseleave', function () {
        gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' });
        var label = el.querySelector('.btn__label');
        if (label) gsap.to(label, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' });
      });
    });
  }

  function initSpotlight() {
    if (IS_TOUCH) return;
    $$('.spotlight').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  function initHighlight() {
    $$('[data-hl]').forEach(function (el) {
      if (!hasSplit) return;
      var s = new window.SplitText(el, { type: 'words', wordsClass: 'hl' });
      splitCache.push(s);
      gsap.set(s.words, { opacity: 0.22 });
      gsap.to(s.words, {
        opacity: 1, duration: 0.4, stagger: 0.06, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 76%', end: 'bottom 46%', scrub: true }
      });
    });
  }

  /* ----------------------------------------------------------------------
     9. Tabs, accordion, forms
     ---------------------------------------------------------------------- */
  function initTabs() {
    $$('[data-tabs]').forEach(function (wrap) {
      var btns = $$('.tabs__btn', wrap);
      var panels = $$('.tabs__panel', wrap);
      btns.forEach(function (btn, i) {
        btn.addEventListener('click', function () {
          btns.forEach(function (b, j) { b.classList.toggle('is-active', i === j); });
          panels.forEach(function (p, j) {
            p.classList.toggle('is-active', i === j);
            if (i === j) {
              gsap.fromTo(p, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.65, ease: 'expo.out' });
              window.dispatchEvent(new Event('resize'));
            }
          });
          if (hasST) window.ScrollTrigger.refresh();
        });
      });
    });
  }

  function initAccordion() {
    $$('[data-acc]').forEach(function (wrap) {
      var items = $$('.acc__item', wrap);
      items.forEach(function (item) {
        var q = $('.acc__q', item);
        var a = $('.acc__a', item);
        var inner = $('.acc__a-inner', a) || a;
        if (!q || !a) return;
        var open = item.classList.contains('is-open');
        gsap.set(a, { height: open ? 'auto' : 0, autoAlpha: open ? 1 : 0 });

        q.addEventListener('click', function () {
          var isOpen = item.classList.contains('is-open');
          if (isOpen) {
            item.classList.remove('is-open');
            gsap.to(a, { height: 0, autoAlpha: 0, duration: 0.5, ease: 'power3.inOut' });
          } else {
            items.forEach(function (other) {
              if (other === item || !other.classList.contains('is-open')) return;
              other.classList.remove('is-open');
              gsap.to($('.acc__a', other), { height: 0, autoAlpha: 0, duration: 0.45, ease: 'power3.inOut' });
            });
            item.classList.add('is-open');
            gsap.set(a, { height: 'auto', autoAlpha: 1 });
            var h = a.offsetHeight;
            gsap.fromTo(a, { height: 0, autoAlpha: 0 }, { height: h, autoAlpha: 1, duration: 0.6, ease: 'power3.inOut', onComplete: function () { gsap.set(a, { height: 'auto' }); if (hasST) window.ScrollTrigger.refresh(); } });
          }
          if (hasST) window.setTimeout(function () { window.ScrollTrigger.refresh(); }, 620);
        });
      });
    });
  }

  function initForms() {
    $$('[data-form]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var ok = form.querySelector('.form__ok');
        var btn = form.querySelector('[type="submit"]');
        if (btn) { btn.disabled = true; btn.style.opacity = '0.7'; }
        window.setTimeout(function () {
          if (ok) {
            ok.classList.add('is-visible');
            gsap.fromTo(ok, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'expo.out' });
          }
          form.reset();
          if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
        }, 750);
      });
    });
  }

  /* ----------------------------------------------------------------------
     9b. Scroll spy for sticky sub navigation
     ---------------------------------------------------------------------- */
  function initScrollSpy() {
    if (!hasST) return;
    $$('[data-spy]').forEach(function (nav) {
      var links = $$('.subnav__link', nav);
      if (!links.length) return;
      var map = [];
      links.forEach(function (link) {
        var href = link.getAttribute('href');
        if (!href || href.charAt(0) !== '#' || href === '#') return;
        var section = doc.getElementById(href.slice(1));
        if (!section) return;
        map.push({ link: link, section: section });
        window.ScrollTrigger.create({
          trigger: section,
          start: 'top 45%',
          end: 'bottom 45%',
          onToggle: function (self) {
            if (!self.isActive) return;
            links.forEach(function (l) { l.classList.toggle('is-active', l === link); });
            if (link.scrollIntoView) {
              try { link.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }); } catch (e) {}
            }
          }
        });
      });
      if (map.length) map[0].link.classList.add('is-active');
    });
  }

  /* ----------------------------------------------------------------------
     9c. Product verification demo
     ---------------------------------------------------------------------- */
  function initVerify() {
    var form = $('[data-verify]');
    if (!form) return;

    var idle = $('[data-verify-idle]');
    var results = $$('[data-verify-result]');
    var input = $('[data-verify] input[name="code"]');
    var submit = $('[data-verify-submit]');
    var idleHtml = idle ? idle.innerHTML : '';

    // Demo registry — deterministic results for the sample codes.
    var REGISTRY = {
      'VT-2291-8F3A-0043': 'ok',
      'VT-2847-11C2-0197': 'warn',
      'VT-0000-0000-0000': 'bad'
    };

    function normalise(v) {
      return String(v || '').trim().toUpperCase().replace(/\s+/g, '');
    }

    function show(kind, code) {
      results.forEach(function (r) {
        r.classList.toggle('is-visible', r.getAttribute('data-verify-result') === kind);
      });
      var shown = results.filter(function (r) { return r.getAttribute('data-verify-result') === kind; })[0];
      if (shown) {
        var codeEl = shown.querySelector('.mono');
        if (kind === 'bad' && codeEl) codeEl.textContent = code;
        gsap.fromTo(shown, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'expo.out' });
      }
      if (idle) idle.style.display = 'none';
      if (hasST) window.setTimeout(function () { window.ScrollTrigger.refresh(); }, 60);
    }

    function lookup(code) {
      var key = normalise(code);
      if (REGISTRY[key]) return REGISTRY[key];
      // Any well-formed but unknown code is treated as unrecognised.
      return 'bad';
    }

    function run(code) {
      var label = submit ? submit.querySelector('.btn__label') : null;
      var original = label ? label.textContent : '';
      if (label) label.textContent = 'Checking registry…';
      if (submit) submit.disabled = true;

      var finish = function () {
        if (label) label.textContent = original;
        if (submit) submit.disabled = false;
        show(lookup(code), normalise(code));
      };

      if (lenis) {
        // Keep the delay purely cosmetic — it reads as a registry round trip.
        window.setTimeout(finish, 620);
      } else {
        finish();
      }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      run(input ? input.value : '');
    });

    $$('[data-verify-demo]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var code = chip.getAttribute('data-verify-demo');
        if (input) input.value = code;
        run(code);
      });
    });

    $$('[data-verify-scan]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var label = btn.querySelector('.btn__label');
        if (!label) return;
        var original = label.textContent;
        label.textContent = 'Camera unavailable in demo';
        window.setTimeout(function () { label.textContent = original; }, 1800);
      });
    });
  }

  /* ----------------------------------------------------------------------
     9d. Status page decorations
     ---------------------------------------------------------------------- */
  function initUptime() {
    $$('[data-uptime]').forEach(function (host) {
      var count = parseInt(host.getAttribute('data-uptime') || '60', 10);
      var seed = parseInt(host.getAttribute('data-uptime-seed') || '1', 10);
      var rand = mulberry(seed);
      var today = new Date();
      var html = '';

      for (var i = count - 1; i >= 0; i--) {
        var d = new Date(today.getTime() - i * 86400000);
        var iso = d.toISOString().slice(0, 10);
        var label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        // Deterministic: most days healthy, occasional degraded / outage day.
        var r = rand();
        var cls = r > 0.972 ? ' down' : r > 0.94 ? ' warn' : '';
        var state = cls === ' down' ? 'Outage' : cls === ' warn' ? 'Degraded performance' : 'Operational';
        html += '<span class="' + cls.trim() + '" title="' + label + ' — ' + state + '"></span>';
      }
      host.innerHTML = html;
    });

    var stamp = $('[data-status-time]');
    if (stamp) {
      var now = new Date();
      stamp.textContent = now.toLocaleString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }) + ' IST';
    }
  }

  /* ----------------------------------------------------------------------
     10. Decorative QR generator
     ---------------------------------------------------------------------- */
  function initQR() {
    $$('[data-qr]').forEach(function (host) {
      var n = parseInt(host.getAttribute('data-qr') || '21', 10);
      var seed = parseInt(host.getAttribute('data-qr-seed') || '7', 10);
      var cell = 100 / n;
      var rand = mulberry(seed);
      var out = '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Sample VeriTrace unit QR code">';
      out += '<rect width="100" height="100" fill="#fff"/>';

      function finder(x, y) {
        var s = '';
        s += '<rect x="' + (x * cell) + '" y="' + (y * cell) + '" width="' + (7 * cell) + '" height="' + (7 * cell) + '" fill="#04101c"/>';
        s += '<rect x="' + ((x + 1) * cell) + '" y="' + ((y + 1) * cell) + '" width="' + (5 * cell) + '" height="' + (5 * cell) + '" fill="#fff"/>';
        s += '<rect x="' + ((x + 2) * cell) + '" y="' + ((y + 2) * cell) + '" width="' + (3 * cell) + '" height="' + (3 * cell) + '" fill="#0A2540"/>';
        return s;
      }
      function reserved(x, y) {
        return (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
      }
      out += finder(0, 0) + finder(n - 7, 0) + finder(0, n - 7);

      for (var y = 0; y < n; y++) {
        for (var x = 0; x < n; x++) {
          if (reserved(x, y)) continue;
          if (rand() > 0.52) {
            out += '<rect x="' + (x * cell) + '" y="' + (y * cell) + '" width="' + cell + '" height="' + cell + '" fill="#0A2540"/>';
          }
        }
      }
      // Centre brand accent
      out += '<rect x="' + (9 * cell) + '" y="' + (9 * cell) + '" width="' + (3 * cell) + '" height="' + (3 * cell) + '" rx="' + (cell * 0.6) + '" fill="#00B8D9"/>';
      out += '</svg>';
      host.innerHTML = out;
    });
  }

  function mulberry(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* ----------------------------------------------------------------------
     11. Ambient background drift
     ---------------------------------------------------------------------- */
  function initAmbient() {
    var orbs = $$('.bg-fx__orb');
    if (!orbs.length || IS_TOUCH) return;
    orbs.forEach(function (orb, i) {
      gsap.to(orb, {
        x: (i % 2 ? -1 : 1) * (60 + i * 24),
        y: (i % 2 ? 1 : -1) * (44 + i * 18),
        duration: 16 + i * 5,
        repeat: -1, yoyo: true, ease: 'sine.inOut'
      });
    });
  }

  /* ----------------------------------------------------------------------
     12. Hero intro (post-preloader)
     ---------------------------------------------------------------------- */
  function buildHeroIntro() {
    var title = $('[data-hero-title]');
    var seq = [];

    if (title && hasSplit) {
      var s = new window.SplitText(title, { type: 'lines', linesClass: 'split-line', lineThreshold: 0.3 });
      splitCache.push(s);
      wrapLines(s.lines);
      gsap.set(title, { autoAlpha: 1 });
      var lines = $$('.split-line-inner', title);
      gsap.set(lines, { yPercent: 118, opacity: 0 });
      seq.push({ targets: lines, vars: { yPercent: 0, opacity: 1, duration: 1.3, ease: 'expo.out', stagger: 0.11 } });
    }

    var eyebrow = $('[data-hero="eyebrow"]');
    if (eyebrow) { gsap.set(eyebrow, { autoAlpha: 0, y: 18 }); seq.push({ targets: eyebrow, vars: { autoAlpha: 1, y: 0, duration: 0.8 } }); }

    var sub = $('[data-hero="sub"]');
    if (sub) { gsap.set(sub, { autoAlpha: 0, y: 26 }); seq.push({ targets: sub, vars: { autoAlpha: 1, y: 0, duration: 1.0 } }); }

    var cta = $$('[data-hero="cta"] > *');
    if (cta.length) { gsap.set(cta, { autoAlpha: 0, y: 24 }); seq.push({ targets: cta, vars: { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.09 } }); }

    var proof = $$('[data-hero="proof"] > *');
    if (proof.length) { gsap.set(proof, { autoAlpha: 0, y: 22 }); seq.push({ targets: proof, vars: { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.07 } }); }

    var visual = $('[data-hero="visual"]');
    if (visual) { gsap.set(visual, { autoAlpha: 0, scale: 0.92 }); seq.push({ targets: visual, vars: { autoAlpha: 1, scale: 1, duration: 1.5, ease: 'expo.out' } }); }

    var chips = $$('.chip');
    if (chips.length) { gsap.set(chips, { autoAlpha: 0, y: 20, scale: 0.9 }); seq.push({ targets: chips, vars: { autoAlpha: 1, y: 0, scale: 1, duration: 0.9, stagger: 0.1, ease: 'back.out(1.6)' } }); }

    return seq;
  }

  /* ----------------------------------------------------------------------
     13. Preloader
     ---------------------------------------------------------------------- */
  function initPreloader(onDone) {
    var pre = $('.preloader');

    // Build the hero intro regardless of whether the curtain runs, so the
    // hero always owns and can reveal its own elements.
    var seq = buildHeroIntro();

    // Never run an animated curtain in a background tab (rAF is throttled),
    // and never leave content hidden if there is no curtain at all.
    if (!pre || doc.hidden) {
      if (pre) pre.style.display = 'none';
      revealed = true;
      root.classList.add('vt-ready');
      // Hand the final state straight over — no animation, no hidden content.
      seq.forEach(function (step) { gsap.set(step.targets, { clearProps: 'all' }); });
      onDone();
      if (hasST) window.ScrollTrigger.refresh();
      return;
    }

    lockScroll(true);
    var count = $('.preloader__count', pre);
    var barFill = $('.preloader__bar span', pre);
    var mark = $('.preloader__mark', pre);

    var obj = { v: 0 };
    var tl = gsap.timeline({
      onComplete: function () {
        revealed = true;
        lockScroll(false);
        root.classList.add('vt-ready');
        if (hasST) window.ScrollTrigger.refresh();
      }
    });

    tl.fromTo('.preloader__word', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'expo.out' })
      .fromTo(mark, { autoAlpha: 0, scale: 0.7, rotate: -14 }, { autoAlpha: 1, scale: 1, rotate: 0, duration: 0.7, ease: 'back.out(1.7)' }, '-=0.35');

    if (mark) {
      var paths = $$('path', mark);
      paths.forEach(function (p) {
        var len = 0;
        try { len = p.getTotalLength(); } catch (e) { len = 0; }
        if (len) gsap.set(p, { strokeDasharray: len, strokeDashoffset: len });
      });
      tl.to(paths, { strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut', stagger: 0.1 }, '-=0.5');
    }

    tl.to(obj, {
      v: 100, duration: 1.3, ease: 'power2.inOut',
      onUpdate: function () {
        if (count) count.textContent = String(Math.round(obj.v)).padStart(3, '0');
      }
    }, 0.2);

    if (barFill) tl.to(barFill, { width: '100%', duration: 1.3, ease: 'power2.inOut' }, 0.2);

    tl.to('.preloader__inner', { autoAlpha: 0, y: -22, duration: 0.45, ease: 'power2.in' }, '+=0.1');

    tl.to(pre, {
      clipPath: 'inset(0 0 100% 0)',
      duration: 0.85,
      ease: 'expo.inOut',
      onStart: function () {
        // Fire hero sequence as the curtain lifts
        var t = gsap.timeline();
        seq.forEach(function (step, i) { t.to(step.targets, step.vars, i === 0 ? 0 : '>-0.62'); });
      }
    }, '-=0.05');

    tl.set(pre, { display: 'none' });
  }

  /* ----------------------------------------------------------------------
     14. Static init (reduced motion path)
     ---------------------------------------------------------------------- */
  function initStatic() {
    initQR();
    initVerify();
    initUptime();
    $$('[data-count]').forEach(function (el) {
      var end = parseFloat(el.getAttribute('data-count')) || 0;
      var dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
      var suffix = el.getAttribute('data-suffix') || '';
      var numEl = el.querySelector('[data-count-num]') || el;
      var suffixEl = el.querySelector('.suffix');
      if (suffixEl && !suffixEl.hasAttribute('data-count-num')) suffixEl.textContent = suffix;
      numEl.textContent = end.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    });
    $$('[data-tabs]').forEach(function (wrap) {
      var btns = $$('.tabs__btn', wrap), panels = $$('.tabs__panel', wrap);
      btns.forEach(function (b, i) {
        b.addEventListener('click', function () {
          btns.forEach(function (x, j) { x.classList.toggle('is-active', i === j); });
          panels.forEach(function (p, j) { p.classList.toggle('is-active', i === j); });
        });
      });
    });
    var pre = $('.preloader');
    if (pre) pre.style.display = 'none';
  }

  /* ----------------------------------------------------------------------
     15. Boot
     ---------------------------------------------------------------------- */
  function boot() {
    var year = $('[data-year]');
    if (year) year.textContent = new Date().getFullYear();

    initQR();
    initCursor();
    initNav();
    initAmbient();
    initTabs();
    initAccordion();
    initForms();
    initVerify();
    initSpotlight();
    initTilt();
    initMagnetic();

    // Preloader first — it also drives the hero intro.
    initPreloader(function () {
      root.classList.add('vt-ready');
    });

    // Everything else can initialise straight away; ScrollTriggers created
    // while the body is locked simply resolve once the curtain lifts.
    initSplits();
    initReveals();
    initParallax();
    initCounters();
    initMarquees();
    initDraws();
    initHorizontal();
    initScrolly();
    initHighlight();
    initScrollSpy();
    initUptime();

    if (hasST) {
      window.addEventListener('load', function () { window.ScrollTrigger.refresh(); });
      var rT;
      window.addEventListener('resize', function () {
        window.clearTimeout(rT);
        rT = window.setTimeout(function () { window.ScrollTrigger.refresh(); }, 220);
      });
    }

    doc.body.classList.add('vt-loaded');
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
