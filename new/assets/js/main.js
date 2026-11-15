/* =========================================================
   Rrjeti Agency · main.js (no dependencies)
   ========================================================= */

/* ---- Edit these in one place ---- */
const RRJETI = {
  FEE_RATE: 0.10,             // 10% of gross monthly revenue
  ADS_SHARE_OF_FEE: 0.40,     // share of the fee that goes to Meta ads
  PRODUCTION_SHARE: 0.35,     // photo, video, design, website
  MIN_MONTHLY_REVENUE: 5000,  // percentage model threshold (€ gross)
  FORMSPREE: 'https://formspree.io/f/moqgzlvo',
  WHATSAPP: '38345775515',    // +383 45 77 55 15
  META_PIXEL_ID: '',          // e.g. '1234567890'; empty = pixel never loads
  CHILLI_HOUSE_URL: 'https://chili-house.com/'
};

document.documentElement.classList.remove('no-js');
const EN = (document.documentElement.lang || '').startsWith('en');
const t = (sq, en) => (EN ? en : sq);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const LOC = EN ? 'en-US' : 'de-DE';
const eur = n => (EN ? '€' + Math.round(n).toLocaleString(LOC) : Math.round(n).toLocaleString(LOC) + ' €');
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } }
};

/* ---------- header: scroll state, hide on scroll down, mobile menu ---------- */
(() => {
  const header = $('.site-header');
  if (!header) return;
  let last = window.scrollY;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    header.classList.toggle('scrolled', y > 10);
    const menuOpen = $('.mobile-menu.open');
    if (!menuOpen && window.innerWidth < 1025) header.classList.toggle('hide', y > last && y > 160);
    else header.classList.remove('hide');
    last = y;
  }, { passive: true });

  const btn = $('.menu-btn');
  const menu = $('.mobile-menu');
  if (btn && menu) {
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      menu.classList.toggle('open', !open);
    });
    $$('a', menu).forEach(a => a.addEventListener('click', () => {
      btn.setAttribute('aria-expanded', 'false');
      menu.classList.remove('open');
    }));
  }
})();

/* ---------- WhatsApp links ---------- */
$$('[data-wa]').forEach(a => {
  if (RRJETI.WHATSAPP) {
    a.href = 'https://wa.me/' + RRJETI.WHATSAPP + '?text=' + encodeURIComponent(t('Përshëndetje Rrjeti, dua të di më shumë për marketingun me 10%.', 'Hi Rrjeti, I would like to know more about the 10% marketing.'));
    a.target = '_blank'; a.rel = 'noopener';
  }
});

/* ---------- Chili House links ---------- */
$$('[data-chilli]').forEach(a => {
  if (RRJETI.CHILLI_HOUSE_URL) { a.href = RRJETI.CHILLI_HOUSE_URL; }
  else { a.removeAttribute('target'); a.href = '#chilli-house'; a.title = 'Linku i Chili House mungon (main.js → CHILLI_HOUSE_URL)'; }
});

/* ---------- logos: same visual weight ----------
   Wide logos get shorter, square logos get smaller, so none looks huge.
   Sets --s = 1/sqrt(aspect ratio); CSS turns it into a height. */
$$('.logo-tile img, .client-logo img').forEach(img => {
  const fit = () => {
    if (!img.naturalWidth) return;
    const r = img.naturalWidth / img.naturalHeight;
    img.style.setProperty('--s', (1 / Math.sqrt(Math.max(0.6, r))).toFixed(3));
    img.classList.add('sized');
  };
  if (img.complete) fit(); else img.addEventListener('load', fit, { once: true });
});

/* ---------- reveal on scroll ---------- */
(() => {
  // split headlines into words
  $$('[data-words]').forEach(el => {
    if (reduceMotion) return;
    const walk = node => {
      Array.from(node.childNodes).forEach(child => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const w = document.createElement('span'); w.className = 'w';
            const inner = document.createElement('span'); inner.textContent = part;
            w.appendChild(inner); frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    walk(el);
    el.classList.add('words');
    $$('.w > span', el).forEach((s, i) => { s.style.transitionDelay = (i * 45) + 'ms'; });
  });
  $$('.stagger').forEach(g => Array.from(g.children).forEach((c, i) => { c.style.transitionDelay = (i * 55) + 'ms'; }));

  const targets = $$('.reveal, .stagger, .words, .chart');
  if (reduceMotion || !('IntersectionObserver' in window)) { targets.forEach(t => t.classList.add('in')); return; }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  targets.forEach(t => io.observe(t));
})();

/* ---------- count-up numbers: <span data-count="270" data-suffix="+"> ---------- */
(() => {
  const els = $$('[data-count]');
  if (!els.length) return;
  const run = el => {
    const end = parseFloat(el.dataset.count);
    const dec = (el.dataset.count.split('.')[1] || '').length;
    const pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    if (reduceMotion) { el.textContent = pre + end.toLocaleString(LOC, { minimumFractionDigits: dec }) + suf; return; }
    const t0 = performance.now(), dur = 1400;
    const tick = t => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + (end * e).toLocaleString(LOC, { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }), { threshold: 0.5 });
  els.forEach(el => io.observe(el));
})();

/* ---------- glass spotlight ---------- */
if (window.matchMedia('(hover: hover)').matches && !reduceMotion) {
  $$('.glass.spot').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });
}

/* ---------- calculator ---------- */
(() => {
  const range = $('#calc-rev');
  if (!range) return;
  const set = (sel, v) => $$(sel).forEach(el => { el.textContent = v; });
  const update = () => {
    const rev = Number(range.value);
    const fee = rev * RRJETI.FEE_RATE;
    const ads = fee * RRJETI.ADS_SHARE_OF_FEE;
    const prod = fee * RRJETI.PRODUCTION_SHARE;
    set('[data-calc="rev"]', eur(rev));
    set('[data-calc="fee"]', eur(fee));
    set('[data-calc="ads"]', eur(ads));
    set('[data-calc="prod"]', eur(prod));
    set('[data-calc="rest"]', eur(fee - ads - prod));
    set('[data-calc="ads-pct"]', Math.round(RRJETI.ADS_SHARE_OF_FEE * 100) + '%');
    set('[data-calc="prod-pct"]', Math.round(RRJETI.PRODUCTION_SHARE * 100) + '%');
    const a = $('.b-ads'), p = $('.b-prod');
    if (a) a.style.width = (RRJETI.ADS_SHARE_OF_FEE * 100) + '%';
    if (p) p.style.width = (RRJETI.PRODUCTION_SHARE * 100) + '%';
    range.setAttribute('aria-valuetext', eur(rev) + t(' qarkullim bruto, ', ' gross revenue, ') + eur(fee) + t(' në muaj', ' a month'));
    const low = $('#calc-low');
    if (low) low.hidden = rev > RRJETI.MIN_MONTHLY_REVENUE;
  };
  range.addEventListener('input', update);
  update();
})();

/* ---------- tabs (si-funksionon examples) ---------- */
$$('[data-tabs]').forEach(wrap => {
  const tabs = $$('[role="tab"]', wrap);
  const show = tab => {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    const rev = Number(tab.dataset.rev);
    const fee = rev * RRJETI.FEE_RATE;
    $$('[data-ex="rev"]', wrap).forEach(e => { e.textContent = eur(rev); });
    $$('[data-ex="fee"]', wrap).forEach(e => { e.textContent = eur(fee); });
    $$('[data-ex="ads"]', wrap).forEach(e => { e.textContent = eur(fee * RRJETI.ADS_SHARE_OF_FEE); });
    $$('[data-ex="prod"]', wrap).forEach(e => { e.textContent = eur(fee * RRJETI.PRODUCTION_SHARE); });
    $$('[data-ex="rest"]', wrap).forEach(e => { e.textContent = eur(fee * (1 - RRJETI.ADS_SHARE_OF_FEE - RRJETI.PRODUCTION_SHARE)); });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => show(t));
    t.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      n.focus(); show(n);
    });
  });
  show(tabs[0]);
});

/* ---------- FAQ accordion ---------- */
$$('.faq-q').forEach(q => {
  q.addEventListener('click', () => {
    const open = q.getAttribute('aria-expanded') === 'true';
    q.setAttribute('aria-expanded', String(!open));
    const a = document.getElementById(q.getAttribute('aria-controls'));
    if (a) a.hidden = open;
  });
});

/* ---------- filters: <div data-filter-group="x"> buttons with data-filter; items with data-cat="a b" ---------- */
$$('[data-filter-group]').forEach(group => {
  const name = group.dataset.filterGroup;
  const items = $$(`[data-filter-item="${name}"]`);
  const btns = $$('[data-filter]', group);
  btns.forEach(b => b.addEventListener('click', () => {
    btns.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    const f = b.dataset.filter;
    items.forEach(it => { it.hidden = !(f === 'all' || (it.dataset.cat || '').split(' ').includes(f)); });
  }));
});

/* ---------- carousels with arrows ---------- */
$$('[data-carousel]').forEach(wrap => {
  const track = $('.carousel', wrap);
  const prev = $('[data-prev]', wrap), next = $('[data-next]', wrap);
  if (!track) return;
  const step = () => {
    const first = track.firstElementChild;
    return first ? first.getBoundingClientRect().width + 12 : 300;
  };
  const sync = () => {
    if (prev) prev.disabled = track.scrollLeft < 4;
    if (next) next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
  };
  if (prev) prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: reduceMotion ? 'auto' : 'smooth' }));
  if (next) next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: reduceMotion ? 'auto' : 'smooth' }));
  track.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync);
  sync();
});

/* ---------- offer preselect: links with data-offer="fiks" open the form with that option ---------- */
(() => {
  const pick = val => $$('select[name="oferta"]').forEach(s => {
    const o = Array.from(s.options).find(op => op.value === val);
    if (o) s.value = val;
  });
  $$('[data-offer]').forEach(a => a.addEventListener('click', () => {
    store.set('rrjeti_offer', a.dataset.offer);
    pick(a.dataset.offer);
  }));
  const q = new URLSearchParams(location.search).get('oferta') || store.get('rrjeti_offer');
  if (q) pick(q);
})();

/* ---------- UTM capture into hidden fields ---------- */
(() => {
  const params = new URLSearchParams(location.search);
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach(k => {
    const v = params.get(k);
    if (v) store.set('rrjeti_' + k, v);
  });
  $$('form[data-formspree]').forEach(f => {
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].forEach(k => {
      const v = store.get('rrjeti_' + k);
      if (!v) return;
      const i = document.createElement('input'); i.type = 'hidden'; i.name = k; i.value = v; f.appendChild(i);
    });
  });
})();

/* ---------- forms → Formspree ---------- */
function validate(scope) {
  let ok = true;
  $$('[required]', scope).forEach(el => {
    const good = el.type === 'radio' ? !!$(`input[name="${el.name}"]:checked`, scope) : el.value.trim() !== '';
    el.classList.toggle('invalid', !good);
    if (!good && ok) { el.focus(); ok = false; }
  });
  return ok;
}
async function sendForm(form) {
  const msg = $('.form-msg', form);
  const btn = $('button[type="submit"]', form);
  if (!validate(form)) return false;
  if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = t('Duke dërguar…', 'Sending…'); }
  try {
    const res = await fetch(RRJETI.FORMSPREE, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('status ' + res.status);
    const name = (new FormData(form).get('emri') || '').toString().trim().split(' ')[0];
    if (form.dataset.redirect) {
      location.href = form.dataset.redirect + (name ? '?emri=' + encodeURIComponent(name) : '');
      return true;
    }
    if (msg) { msg.hidden = false; msg.className = 'form-msg ok'; msg.textContent = t('Faleminderit', 'Thank you') + (name ? ', ' + name : '') + t('! E morëm. Do të të kontaktojmë së shpejti.', '! We got it and will contact you soon.'); }
    form.reset();
    firePixel('Lead');
    return true;
  } catch (e) {
    if (msg) { msg.hidden = false; msg.className = 'form-msg err'; msg.textContent = t('Diçka nuk shkoi. Provo përsëri ose na shkruaj në WhatsApp.', 'Something went wrong. Please try again or message us on WhatsApp.'); }
    return false;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label; }
  }
}
$$('form[data-formspree]').forEach(f => f.addEventListener('submit', e => { e.preventDefault(); sendForm(f); }));

/* ---------- multi-step application ---------- */
(() => {
  const form = $('#apply-form');
  if (!form) return;
  const steps = $$('.step', form);
  const names = ['Biznesi', 'Numrat', 'Kontakti'];
  let i = 0;
  const show = n => {
    i = n;
    steps.forEach((s, k) => { s.hidden = k !== n; });
    $('#step-no').textContent = n + 1;
    $('#step-name').textContent = names[n];
    $('#step-bar').style.width = Math.round(((n + 1) / steps.length) * 100) + '%';
    $('#step-back').disabled = n === 0;
    $('#step-next').hidden = n === steps.length - 1;
    $('#step-submit').hidden = n !== steps.length - 1;
    const first = $('input, select', steps[n]);
    if (first && n > 0) first.focus();
  };
  $('#step-next').addEventListener('click', () => { if (validate(steps[i])) show(i + 1); });
  $('#step-back').addEventListener('click', () => show(Math.max(0, i - 1)));
  show(0);
})();

/* ---------- thank-you page name ---------- */
(() => {
  const el = $('[data-thanks-name]');
  if (!el) return;
  const n = new URLSearchParams(location.search).get('emri');
  if (n) el.textContent = ', ' + n.slice(0, 40);
})();

/* ---------- mobile sticky bar ---------- */
(() => {
  const bar = $('.mobile-bar');
  const hero = $('.hero');
  if (!bar) return;
  document.body.classList.add('has-bar');
  if (!hero || !('IntersectionObserver' in window)) { bar.classList.add('show'); return; }
  new IntersectionObserver(([e]) => bar.classList.toggle('show', !e.isIntersecting), { threshold: 0.05 }).observe(hero);
})();

/* ---------- cookie consent + Meta Pixel (only after "Pranoj") ---------- */
let pixelLoaded = false;
function loadPixel() {
  if (pixelLoaded || !RRJETI.META_PIXEL_ID) return;
  pixelLoaded = true;
  /* eslint-disable */
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  window.fbq('init', RRJETI.META_PIXEL_ID);
  window.fbq('track', 'PageView');
}
function firePixel(ev) { if (pixelLoaded && window.fbq) window.fbq('track', ev); }
(() => {
  const banner = $('#cookie');
  const c = store.get('rrjeti_consent');
  if (c === 'yes') { loadPixel(); if ($('[data-thanks-name]')) firePixel('Lead'); }
  if (!banner || c || !RRJETI.META_PIXEL_ID) return;
  banner.hidden = false;
  $('#cookie-yes', banner).addEventListener('click', () => { store.set('rrjeti_consent', 'yes'); banner.hidden = true; loadPixel(); });
  $('#cookie-no', banner).addEventListener('click', () => { store.set('rrjeti_consent', 'no'); banner.hidden = true; });
})();
$$('[data-wa], a[href^="tel:"]').forEach(a => a.addEventListener('click', () => firePixel('Contact')));


/* ---------- scroll motion: progress bar, parallax, reveal variants, tilt ---------- */
(() => {
  if (reduceMotion) return;
  // side-by-side blocks slide in from their side, big media scales in
  $$('.row').forEach(row => {
    const kids = Array.from(row.children).filter(c => !c.classList.contains('glow') && !c.classList.contains('bead') && !c.matches('.reveal, .stagger'));
    if (kids.length === 2) { kids[0].classList.add('reveal-left'); kids[1].classList.add('reveal-right'); }
  });
  $$('.feature-visual, .browser, .table-wrap, .cta-panel, .retain-stat').forEach(el => { if (!el.matches('.reveal, .reveal-left, .reveal-right')) el.classList.add('reveal-scale'); });
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal-left, .reveal-right, .reveal-scale, .eyebrow').forEach(el => io.observe(el));

  // parallax on glows and chrome beads + scroll progress bar
  $$('.glow, .bead').forEach((el, i) => { if (!el.hasAttribute('data-parallax')) el.setAttribute('data-parallax', el.classList.contains('bead') ? (0.18 + (i % 3) * 0.06) : 0.08); });
  const par = $$('[data-parallax]');
  const bar = document.createElement('div'); bar.className = 'scroll-progress'; bar.setAttribute('aria-hidden', 'true'); document.body.appendChild(bar);
  let ticking = false;
  const update = () => {
    ticking = false;
    const y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = 'scaleX(' + (h > 0 ? y / h : 0) + ')';
    par.forEach(el => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) return;
      const speed = parseFloat(el.dataset.parallax) || 0.1;
      el.style.translate = '0 ' + ((r.top + r.height / 2 - innerHeight / 2) * -speed).toFixed(1) + 'px';
    });
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();

  // gentle 3D tilt on cards (mouse only)
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('.glass.card.spot, .case-card, .stat-strip .stat').forEach(card => {
      card.classList.add('tilt');
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = 'perspective(900px) rotateX(' + (-y * 5).toFixed(2) + 'deg) rotateY(' + (x * 6).toFixed(2) + 'deg) translateY(-3px)';
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }
})();

/* ---------- liquid-chrome shapes: layered parallax (mouse + scroll on desktop, scroll only on phones) ---------- */
(() => {
  const css = document.querySelector('link[rel="stylesheet"][href*="main.css"]');
  const shapeUrl = n => css ? new URL('../img/shapes/' + n, css.href).href : 'assets/img/shapes/' + n;
  // sub-page heroes get a ring + blob pair
  $$('section.hero').forEach(hero => {
    if (hero.querySelector('.hero-visual, .hero-deco')) return;
    const d = document.createElement('div'); d.className = 'hero-deco'; d.setAttribute('aria-hidden', 'true');
    // each page gets its own pair from the shape library
    const pairs = { 'si-funksionon': ['percent', 'star'], 'puna': ['ribbon', 'spheres'], 'rastet': ['star', 'drop'], 'rreth-nesh': ['links', 'holes'], '10-perqind': ['percent', 'thinring'] };
    const seg = location.pathname.replace(/^\/(en\/)?/, '').split('/')[0];
    const [a, b] = pairs[seg] || (seg ? ['infinity', 'drop'] : ['ring', 'blob']);
    const img = n => '<img src="' + shapeUrl(n + '-360.webp') + '" srcset="' + shapeUrl(n + '-360.webp') + ' 360w, ' + shapeUrl(n + '-640.webp') + ' 640w" sizes="(max-width: 760px) 120px, 230px" alt="" decoding="async">';
    d.innerHTML = '<span class="layer d-ring" data-depth="1">' + img(a) + '</span><span class="layer d-blob" data-depth="1.8">' + img(b) + '</span>';
    hero.prepend(d);
  });
  if (reduceMotion) return;

  const scenes = $$('.hero-visual[data-shapes], .hero-deco').map(el => ({ el, layers: $$('[data-depth]', el).map(l => ({ l, d: parseFloat(l.dataset.depth) || 1 })) }));
  const heroText = document.querySelector('.hero .hero-text');
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const wide = () => innerWidth > 760;
  let mx = 0, my = 0, tx = 0, ty = 0, raf = 0;

  const frame = () => {
    raf = 0;
    mx += (tx - mx) * 0.08; my += (ty - my) * 0.08;
    const y = window.scrollY, k = wide() ? 1 : 0.45;
    scenes.forEach(({ el, layers }) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > innerHeight + 100) return;
      layers.forEach(({ l, d }) => {
        const sx = mx * d * 22, sy = my * d * 16 - y * d * 0.14 * k, rot = mx * d * 2.4 + y * d * 0.012 * k;
        l.style.transform = 'translate3d(' + sx.toFixed(1) + 'px,' + sy.toFixed(1) + 'px,0) rotate(' + rot.toFixed(2) + 'deg)';
      });
    });
    if (heroText && wide() && y < innerHeight * 1.2) {
      heroText.style.transform = 'translate3d(0,' + (y * 0.12).toFixed(1) + 'px,0)';
      heroText.style.opacity = Math.max(0.25, 1 - y / (innerHeight * 1.1)).toFixed(3);
    }
    // case images drift inside their frames
    if (wide()) $$('.case-card .case-img').forEach(img => {
      const r = img.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      img.style.translate = '0 ' + (((r.top + r.height / 2) / innerHeight - 0.5) * -26).toFixed(1) + 'px';
    });
    if (Math.abs(tx - mx) > 0.002 || Math.abs(ty - my) > 0.002) raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', kick, { passive: true });
  if (fine) window.addEventListener('pointermove', e => { tx = e.clientX / innerWidth * 2 - 1; ty = e.clientY / innerHeight * 2 - 1; kick(); }, { passive: true });
  kick();
})();
