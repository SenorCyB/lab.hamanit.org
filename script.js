/* ================================================================
   HAMAN IT — interactions.js  v4
   Cyber Dashboard Interactivity Layer
   ================================================================ */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════════
     1.  CYBER CANVAS
         Lives INSIDE the hero section (position: absolute).
         Circuit-grid of nodes + glowing packet animations.
         Mouse proximity brightens nearby nodes/edges.
         Scroll speed triggers bursts of packets.
  ══════════════════════════════════════════════════════════════ */
  class CyberCanvas {
    constructor () {
      this.canvas = document.getElementById('cyber-canvas');
      if (!this.canvas) return;
      this.ctx         = this.canvas.getContext('2d');
      this.nodes       = [];
      this.edges       = [];
      this.packets     = [];
      this.mouse       = { x: -9999, y: -9999 };
      this.lastScrollY = 0;
      this.frame       = 0;
      this._setup();
    }

    _setup () {
      this._resize();

      /* Resize whenever hero changes size */
      const ro = new ResizeObserver(() => {
        clearTimeout(this._rt);
        this._rt = setTimeout(() => this._resize(), 200);
      });
      if (this.canvas.parentElement) ro.observe(this.canvas.parentElement);

      /* Mouse only meaningful inside the hero */
      this.canvas.parentElement?.addEventListener('mousemove', e => {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
      });
      this.canvas.parentElement?.addEventListener('mouseleave', () => {
        this.mouse.x = -9999;
        this.mouse.y = -9999;
      });

      window.addEventListener('scroll', () => this._onScroll(), { passive: true });
      this._tick();
    }

    _resize () {
      const parent = this.canvas.parentElement;
      if (!parent) return;
      this.canvas.width  = parent.offsetWidth;
      this.canvas.height = parent.offsetHeight;
      this._buildCircuit();
    }

    /* Circuit-board style grid: nodes at jittered grid positions */
    _buildCircuit () {
      const W    = this.canvas.width;
      const H    = this.canvas.height;
      const CELL = 120;
      const JIT  = CELL * 0.30;
      const cols = Math.ceil(W / CELL);
      const rows = Math.ceil(H / CELL);

      this.nodes   = [];
      this.edges   = [];
      this.packets = [];

      for (let r = 0; r <= rows; r++)
        for (let c = 0; c <= cols; c++)
          this.nodes.push({
            x: c * CELL + (Math.random() - 0.5) * JIT * 2,
            y: r * CELL + (Math.random() - 0.5) * JIT * 2,
          });

      const idx = (r, c) => r * (cols + 1) + c;

      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= cols; c++) {
          /* Horizontal */
          if (c < cols && Math.random() > 0.12)
            this.edges.push([idx(r, c), idx(r, c + 1)]);
          /* Vertical */
          if (r < rows && Math.random() > 0.12)
            this.edges.push([idx(r, c), idx(r + 1, c)]);
          /* Rare diagonal — adds circuit off-ramp feel */
          if (c < cols && r < rows && Math.random() > 0.88)
            this.edges.push([idx(r, c), idx(r + 1, c + 1)]);
        }
      }
    }

    _onScroll () {
      const delta = Math.abs(window.scrollY - this.lastScrollY);
      this.lastScrollY = window.scrollY;
      if (delta > 2) {
        const burst = Math.min(Math.floor(delta / 6) + 1, 8);
        for (let i = 0; i < burst; i++) this._spawn();
      }
    }

    _spawn () {
      if (!this.edges.length) return;
      const edge = this.edges[Math.floor(Math.random() * this.edges.length)];
      const rev  = Math.random() > 0.5;
      this.packets.push({
        a    : rev ? edge[1] : edge[0],
        b    : rev ? edge[0] : edge[1],
        t    : 0,
        speed: 0.004 + Math.random() * 0.010,
        size : 2.2 + Math.random() * 1.8,
        glow : 8   + Math.random() * 10,
      });
    }

    _pal () {
      const lm = document.documentElement.getAttribute('data-theme') === 'light';
      return {
        lm,
        edge : lm ? 'rgba(37,88,212,'  : 'rgba(107,164,255,',
        node : lm ? 'rgba(37,88,212,'  : 'rgba(107,164,255,',
        pCore: lm ? '#4a7de8'          : '#c8dcff',
        pGlow: lm ? 'rgba(37,88,212,'  : 'rgba(107,164,255,',
      };
    }

    _tick () {
      this.frame++;
      const ctx = this.ctx;
      const pal = this._pal();
      const MR  = 160;   /* mouse influence radius */

      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      /* ── Edges ── */
      this.edges.forEach(([ai, bi]) => {
        const a = this.nodes[ai], b = this.nodes[bi];
        if (!a || !b) return;
        const mx   = (a.x + b.x) / 2 - this.mouse.x;
        const my   = (a.y + b.y) / 2 - this.mouse.y;
        const mb   = Math.max(0, 1 - Math.sqrt(mx * mx + my * my) / MR) * 0.28;
        const base = pal.lm ? 0.05 : 0.07;
        ctx.beginPath();
        ctx.strokeStyle = pal.edge + (base + mb) + ')';
        ctx.lineWidth   = 0.7;
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      });

      /* ── Nodes ── */
      this.nodes.forEach(n => {
        const dx = n.x - this.mouse.x, dy = n.y - this.mouse.y;
        const mb = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / MR) * 0.6;
        const al = (pal.lm ? 0.15 : 0.22) + mb;
        const r  = 1.2 + mb * 3;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, 6.283);
        ctx.fillStyle = pal.node + al + ')';
        ctx.fill();
        /* Soft halo on mouse-near nodes */
        if (mb > 0.3) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 4 + mb * 4, 0, 6.283);
          ctx.fillStyle = pal.node + (mb * 0.2) + ')';
          ctx.fill();
        }
      });

      /* ── Idle trickle ── */
      if (this.frame % 55 === 0 && this.packets.length < 22) this._spawn();

      /* ── Packets ── */
      this.packets = this.packets.filter(p => {
        p.t += p.speed;
        if (p.t >= 1) return false;
        const a = this.nodes[p.a], b = this.nodes[p.b];
        if (!a || !b) return false;
        const x = a.x + (b.x - a.x) * p.t;
        const y = a.y + (b.y - a.y) * p.t;
        /* Glow halo */
        const g = ctx.createRadialGradient(x, y, 0, x, y, p.glow);
        g.addColorStop(0,    pal.pGlow + '0.80)');
        g.addColorStop(0.42, pal.pGlow + '0.30)');
        g.addColorStop(1,    pal.pGlow + '0)');
        ctx.beginPath();
        ctx.arc(x, y, p.glow, 0, 6.283);
        ctx.fillStyle = g;
        ctx.fill();
        /* Solid core */
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, 6.283);
        ctx.fillStyle = pal.pCore;
        ctx.fill();
        return true;
      });

      requestAnimationFrame(() => this._tick());
    }
  }

  /* ══════════════════════════════════════════════════════════════
     2.  CUSTOM CURSOR
         Instant dot + lerped ring.
         Expands on hover, snaps on click, crosshair on hover.
  ══════════════════════════════════════════════════════════════ */
  class CustomCursor {
    constructor () {
      this.dot  = document.getElementById('cursor-dot');
      this.ring = document.getElementById('cursor-ring');
      if (!this.dot || !this.ring) return;
      this.mx = 0; this.my = 0;
      this.rx = 0; this.ry = 0;
      this._bind();
      this._loop();
    }

    _bind () {
      document.addEventListener('mousemove', e => {
        this.mx = e.clientX;
        this.my = e.clientY;
        this.dot.style.transform = `translate(${this.mx}px,${this.my}px)`;
      });
      document.addEventListener('mousedown', () => {
        this.ring.classList.add('ring--click');
        this.dot.classList.add('dot--click');
      });
      document.addEventListener('mouseup', () => {
        this.ring.classList.remove('ring--click');
        this.dot.classList.remove('dot--click');
      });
      document.addEventListener('mouseleave', () => {
        this.dot.style.opacity  = '0';
        this.ring.style.opacity = '0';
      });
      document.addEventListener('mouseenter', () => {
        this.dot.style.opacity  = '1';
        this.ring.style.opacity = '0.65';
      });

      /* Event-delegated hover detection */
      const sel = 'a, button, .service-card, .skill-card, .project-row, ' +
                  'input, textarea, label, .nav-cta, .btn-primary, ' +
                  '.btn-ghost, .contact-link-item, .theme-toggle';
      document.addEventListener('mouseover', e => {
        if (e.target.closest(sel)) this.ring.classList.add('ring--hover');
      });
      document.addEventListener('mouseout', e => {
        if (e.target.closest(sel)) this.ring.classList.remove('ring--hover');
      });
    }

    _loop () {
      this.rx += (this.mx - this.rx) * 0.115;
      this.ry += (this.my - this.ry) * 0.115;
      this.ring.style.transform = `translate(${this.rx}px,${this.ry}px)`;
      requestAnimationFrame(() => this._loop());
    }
  }

  /* ══════════════════════════════════════════════════════════════
     3.  CLICK RIPPLE
  ══════════════════════════════════════════════════════════════ */
  function initRipple () {
    document.addEventListener('click', e => {
      const r = document.createElement('span');
      r.className = 'click-ripple';
      r.style.left = e.clientX + 'px';
      r.style.top  = e.clientY + 'px';
      document.body.appendChild(r);
      r.addEventListener('animationend', () => r.remove());
    });
  }

  /* ══════════════════════════════════════════════════════════════
     4.  SECTION LABEL GLITCH
         Characters scramble then resolve on hover.
  ══════════════════════════════════════════════════════════════ */
  function initGlitch () {
    const CHARS = '!<>-_\\/[]{}—=+*^?#@~|';
    document.querySelectorAll('.section-label').forEach(el => {
      const orig = (el.firstChild?.nodeType === 3)
        ? el.firstChild.textContent.trim()
        : el.textContent.trim();
      let timer = null;

      const setLabel = text => {
        if (el.firstChild?.nodeType === 3) {
          el.firstChild.textContent = text;
        } else {
          el.textContent = text;
        }
      };

      el.addEventListener('mouseenter', () => {
        clearInterval(timer);
        let iter = 0;
        timer = setInterval(() => {
          setLabel(
            orig.split('').map((ch, i) => {
              if (ch === ' ') return ' ';
              if (i < iter)   return orig[i];
              return CHARS[Math.floor(Math.random() * CHARS.length)];
            }).join('')
          );
          if (iter >= orig.length) { setLabel(orig); clearInterval(timer); }
          iter += 1.6;
        }, 36);
      });

      el.addEventListener('mouseleave', () => {
        clearInterval(timer);
        setLabel(orig);
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════
     5.  STAT COUNTER ANIMATION
         Numbers count up from zero when scrolled into view.
  ══════════════════════════════════════════════════════════════ */
  function initCounters () {
    const els = document.querySelectorAll('.stat-num');
    if (!els.length) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(({ isIntersecting, target: el }) => {
        if (!isIntersecting) return;
        const raw = el.textContent.trim();
        const num = parseFloat(raw.replace(/[^\d.]/g, ''));
        const sfx = raw.replace(/[\d.]/g, '');
        if (isNaN(num)) return;
        const dur = 1500, t0 = performance.now();
        const tick = now => {
          const p = Math.min((now - t0) / dur, 1);
          el.textContent = Math.round(num * (1 - Math.pow(1 - p, 3))) + sfx;
          p < 1 ? requestAnimationFrame(tick) : el.classList.add('counted');
        };
        requestAnimationFrame(tick);
        io.unobserve(el);
      });
    }, { threshold: 0.6 });
    els.forEach(el => io.observe(el));
  }

  /* ══════════════════════════════════════════════════════════════
     6.  CARD SCAN-LINE SWEEP
         Inject sweep div so CSS can animate without ::pseudo conflicts.
  ══════════════════════════════════════════════════════════════ */
  function initScanLines () {
    document.querySelectorAll('.skill-card, .service-card').forEach(card => {
      const s = document.createElement('div');
      s.className = 'card-sweep';
      card.appendChild(s);
    });
  }

  /* ══════════════════════════════════════════════════════════════
     BOOT
  ══════════════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', () => {
    new CyberCanvas();
    new CustomCursor();
    initRipple();
    initGlitch();
    initCounters();
    initScanLines();
    /* initHeroLetters removed — no letter glow on name */
  });

})();
