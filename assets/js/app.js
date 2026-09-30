/* ══════════════════════════════════════════════════════════════════
   Trade Hub · سكربت الواجهة
   شاشة التحميل · الثيم · اللغة · قائمة الموبايل · الكوكيز · الظهور
   ══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;

  /* ── 1) شاشة التحميل ─────────────────────────────────────────
     بنقفلها لما الخطوط والصور تجهز، مع سقف زمني عشان
     ما نحبسش المستخدم لو حصل بطء في الشبكة. */
  (function loader() {
    var el = document.getElementById('loader');
    if (!el) {
      root.classList.remove('is-loading');
      return;
    }

    var fill = el.querySelector('.ld-fill');
    var progress = 0;
    var closed = false;

    function setProgress(p) {
      progress = Math.max(progress, Math.min(p, 100));
      if (fill) fill.style.width = progress + '%';
    }

    // تقدّم تدريجي "متباطئ" — بيوصل ٩٠٪ ويستنى الجاهزية الحقيقية
    var tick = setInterval(function () {
      setProgress(progress + (90 - progress) * 0.16 + 1);
      if (progress >= 89) clearInterval(tick);
    }, 90);

    function close() {
      if (closed) return;
      closed = true;
      clearInterval(tick);
      clearTimeout(hardStop);
      setProgress(100);
      setTimeout(function () {
        el.setAttribute('data-done', 'true');
        root.classList.remove('is-loading');
        // نشيله من شجرة الوصول بعد انتهاء التلاشي
        setTimeout(function () { el.setAttribute('hidden', ''); }, 600);
        window.dispatchEvent(new CustomEvent('th:ready'));
      }, reduceMotion ? 0 : 180);
    }

    // سقف أقصى: ٣.٥ ثانية مهما حصل
    var hardStop = setTimeout(close, 3500);

    function whenReady() {
      var waits = [];
      if (document.fonts && document.fonts.ready) waits.push(document.fonts.ready);
      // ندي الخطوط ١.٨ ثانية بالكتير، وبعدها نكمّل
      Promise.race([
        Promise.all(waits),
        new Promise(function (r) { setTimeout(r, 1800); }),
      ]).then(function () {
        // نستنى فريم واحد عشان أول رسم يبقى جاهز
        requestAnimationFrame(function () { requestAnimationFrame(close); });
      });
    }

    if (document.readyState === 'complete') whenReady();
    else window.addEventListener('load', whenReady, { once: true });
  })();

  /* ── 2) الثيم ─────────────────────────────────────────────────
     القراءة الأولية من localStorage بتحصل في <head> عشان نمنع
     وميض الشاشة البيضاء. هنا بنتعامل مع الزر بس. */
  (function theme() {
    var btn = document.getElementById('themeBtn');
    var icon = document.getElementById('themeIcon');
    if (!btn || !icon) return;

    var MOON = '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';
    var SUN =
      '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4' +
      'M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';

    function sysDark() {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches;
    }
    function current() {
      var t = root.getAttribute('data-theme');
      return t || (sysDark() ? 'dark' : 'light');
    }
    function paint() {
      var dark = current() === 'dark';
      icon.innerHTML = dark ? SUN : MOON;
      btn.setAttribute('aria-label', dark ? 'التبديل للوضع الفاتح' : 'التبديل للوضع الداكن');
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', dark ? '#060d0c' : '#f6f9f9');
    }

    paint();
    btn.addEventListener('click', function () {
      var next = current() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('th-theme', next); } catch (e) {}
      paint();
    });
  })();

  /* ── 3) اللغة ─────────────────────────────────────────────────
     الإنجليزية هي الأصل في الـ DOM؛ العربية من القاموس. */
  (function language() {
    var AR = window.TH_AR || {};
    var btn = document.getElementById('langBtn');
    var nodes = Array.prototype.slice.call(document.querySelectorAll('[data-i18n]'));

    /* ── صفحات بلغة واحدة ──────────────────────────────────────
       الصفحات القانونية إنجليزي بالكامل ومفيهاش أي [data-i18n].
       لو سِبنا التبديل يشتغل عليها، الاتجاه بيبقى RTL والنص
       الإنجليزي بيتحاذي يمين وعلامات الترقيم بتقع في الناحية الغلط.
       فبنقفلها على اتجاهها ونخفي الزر — مفيش حاجة يبدّلها. */
    var lock = root.getAttribute('data-lang-lock');
    if (lock) {
      root.setAttribute('lang', lock);
      root.setAttribute('dir', lock === 'ar' ? 'rtl' : 'ltr');
      document.body.setAttribute('data-lang', lock);
      if (btn) btn.setAttribute('hidden', '');
      return;
    }

    // نخزّن النص الإنجليزي الأصلي مرة واحدة
    nodes.forEach(function (n) { n.dataset.en = n.innerHTML; });

    var lang = 'en';

    function apply(next) {
      lang = next === 'ar' ? 'ar' : 'en';
      var isAr = lang === 'ar';

      nodes.forEach(function (n) {
        var key = n.getAttribute('data-i18n');
        n.innerHTML = isAr && AR[key] != null ? AR[key] : n.dataset.en;
      });

      root.setAttribute('lang', lang);
      root.setAttribute('dir', isAr ? 'rtl' : 'ltr');
      document.body.setAttribute('data-lang', lang);

      if (btn) {
        btn.textContent = isAr ? 'English' : 'العربية';
        btn.setAttribute('aria-label', isAr ? 'Switch to English' : 'التبديل إلى العربية');
      }

      // نترجم العناوين اللي برا الـ DOM المرئي كمان
      var title = document.querySelector('title[data-i18n-title]');
      if (title) {
        var k = title.getAttribute('data-i18n-title');
        if (!title.dataset.en) title.dataset.en = title.textContent;
        title.textContent = isAr && AR[k] ? AR[k] : title.dataset.en;
      }

      try { localStorage.setItem('th-lang', lang); } catch (e) {}
      window.dispatchEvent(new CustomEvent('th:lang', { detail: { lang: lang } }));
    }

    var saved = null;
    try { saved = localStorage.getItem('th-lang'); } catch (e) {}
    // لو أول زيارة، نحترم لغة المتصفح
    if (!saved && navigator.language && /^ar/i.test(navigator.language)) saved = 'ar';
    if (saved === 'ar') apply('ar');

    if (btn) {
      btn.addEventListener('click', function () { apply(lang === 'ar' ? 'en' : 'ar'); });
    }
    window.THsetLang = apply;
  })();

  /* ── 4) قائمة الموبايل ───────────────────────────────────────
     درج منزلق مع حبس التركيز والإغلاق بـ Escape. */
  (function mobileNav() {
    var wrap = document.getElementById('mobileNav');
    var open = document.getElementById('burger');
    if (!wrap || !open) return;

    var close = wrap.querySelector('.close-nav');
    var scrim = wrap.querySelector('.scrim');
    var sheet = wrap.querySelector('.sheet');
    var lastFocus = null;

    function setOpen(state) {
      wrap.setAttribute('data-open', state ? 'true' : 'false');
      open.setAttribute('aria-expanded', state ? 'true' : 'false');
      document.body.style.overflow = state ? 'hidden' : '';
      if (state) {
        lastFocus = document.activeElement;
        var first = sheet.querySelector('a,button');
        if (first) setTimeout(function () { first.focus(); }, 340);
      } else if (lastFocus) {
        lastFocus.focus();
      }
    }

    open.addEventListener('click', function () { setOpen(true); });
    if (close) close.addEventListener('click', function () { setOpen(false); });
    if (scrim) scrim.addEventListener('click', function () { setOpen(false); });

    // أي رابط جوه الدرج بيقفله
    sheet.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (wrap.getAttribute('data-open') === 'true') setOpen(false);
    });

    // حبس التركيز جوه الدرج
    wrap.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || wrap.getAttribute('data-open') !== 'true') return;
      var items = sheet.querySelectorAll('a[href],button:not([disabled])');
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });

    // لو الشاشة كبرت، نقفل الدرج
    window.addEventListener('resize', function () {
      if (window.innerWidth > 920 && wrap.getAttribute('data-open') === 'true') setOpen(false);
    });
  })();

  /* ── 5) ظل الـ nav عند التمرير + الرابط النشط ────────────────── */
  (function navState() {
    var nav = document.querySelector('header.nav');
    if (!nav) return;

    var onScroll = function () {
      nav.setAttribute('data-scrolled', window.scrollY > 8 ? 'true' : 'false');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // تمييز القسم الحالي في الـ nav
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav-links a[href^="#"]'));
    if (!links.length || !('IntersectionObserver' in window)) return;

    var sections = links
      .map(function (a) { return document.querySelector(a.getAttribute('href')); })
      .filter(Boolean);

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          links.forEach(function (a) {
            a.setAttribute(
              'aria-current',
              a.getAttribute('href') === '#' + entry.target.id ? 'true' : 'false'
            );
          });
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    sections.forEach(function (s) { io.observe(s); });
  })();

  /* ── 6) نسخ البريد ───────────────────────────────────────────── */
  (function copyMail() {
    var el = document.getElementById('copyMail');
    var text = document.getElementById('mailText');
    if (!el || !text) return;

    var busy = false;
    function run() {
      if (busy) return;
      var value = text.textContent;

      function done() {
        busy = true;
        var original = text.textContent;
        text.textContent = 'تم النسخ ✓';
        setTimeout(function () { text.textContent = original; busy = false; }, 1400);
      }
      function fallback() {
        try {
          var range = document.createRange();
          range.selectNodeContents(text);
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        } catch (e) {}
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(done, fallback);
      } else {
        fallback();
      }
    }

    el.addEventListener('click', run);
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); run(); }
    });
  })();

  /* ── 7) شريط الكوكيز ────────────────────────────────────────── */
  (function cookies() {
    var bar = document.getElementById('cookieBar');
    if (!bar) return;

    var accepted = null;
    try { accepted = localStorage.getItem('th-cookies'); } catch (e) {}
    if (accepted === 'ok') return;

    // نعرضه بعد ما شاشة التحميل تختفي
    window.addEventListener('th:ready', function () {
      setTimeout(function () { bar.setAttribute('data-show', 'true'); }, 700);
    });

    var ok = bar.querySelector('.cb-accept');
    if (ok) {
      ok.addEventListener('click', function () {
        bar.setAttribute('data-show', 'false');
        try { localStorage.setItem('th-cookies', 'ok'); } catch (e) {}
        setTimeout(function () { bar.setAttribute('hidden', ''); }, 500);
      });
    }
  })();

  /* ── 8) ظهور تدريجي عند التمرير ─────────────────────────────── */
  (function reveal() {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach(function (n) { n.classList.add('in'); });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    items.forEach(function (n) { io.observe(n); });
  })();

  /* ── 9) السنة في الفوتر ─────────────────────────────────────── */
  (function year() {
    var el = document.getElementById('yr');
    if (el) el.textContent = new Date().getFullYear();
  })();
})();
