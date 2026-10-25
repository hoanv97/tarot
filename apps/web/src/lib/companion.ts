/* eslint-disable */
// @ts-nocheck
/**
 * Linh vật bay Cú Mơ (canvas hạt sáng + con cú), chuyển từ bản mẫu tarot.html.
 * Gọi initCompanion() ở client; hàm trả về cleanup.
 */
import { starPath, f } from '@/lib/art/draw';
import { KEYS, storeGet, storeSet } from '@/lib/store';
import { pickOne } from '@/lib/motion';

export const initCompanion = () => {
  const ac = new AbortController();
  const signal = ac.signal;
  const rand = Math.random;
  const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => !!reduceMQ.matches;
    const INTERACTIVE = 'a,button,input,select,textarea,label,.deal-card,.slot-card,[role="tab"],.chip';
    const LINES = [
      'Hú hú! Cú Mơ đây.',
      'Cú Mơ là bạn đồng hành của Miu đó.',
      'Bụi sao này rắc miễn phí nha!',
      'Đừng bắt Cú Mơ, Cú Mơ đang tuần tra mà.',
      'Hôm nay bạn rút lá chưa?',
      'Hú… nhột quá!',
      'Cú Mơ bay vòng vòng để giữ may mắn cho bạn.'
    ];
    const COLORS = ['#A78BFA', '#F472B6', '#F5C66B', '#C084FC'];
    const owl = `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <ellipse class="cm-wing cm-wing-l" cx="23" cy="60" rx="11" ry="17" fill="#8E73E0"/>
      <ellipse class="cm-wing cm-wing-r" cx="77" cy="60" rx="11" ry="17" fill="#8E73E0"/>
      <path d="M28 36 L23 20 L39 31 Z" fill="#8E73E0"/><path d="M72 36 L77 20 L61 31 Z" fill="#8E73E0"/>
      <ellipse cx="50" cy="58" rx="29" ry="31" fill="#B49CF5" stroke="#7B5CD6" stroke-width="1.5"/>
      <ellipse cx="50" cy="71" rx="17" ry="16" fill="#FFF4E3"/>
      <path d="M40 67 q3 3 6 0 M48 67 q3 3 6 0 M44 74 q3 3 6 0 M52 74 q3 3 6 0" fill="none" stroke="#E8CFA8" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="38" cy="48" r="14" fill="#D9CCFA"/><circle cx="62" cy="48" r="14" fill="#D9CCFA"/>
      <g class="cm-eyes">
        <circle cx="38" cy="48" r="10.5" fill="#fff"/><circle cx="62" cy="48" r="10.5" fill="#fff"/>
        <circle cx="39.5" cy="49.5" r="7" fill="#2A1E45"/><circle cx="63.5" cy="49.5" r="7" fill="#2A1E45"/>
        <circle cx="42" cy="46" r="2.6" fill="#fff"/><circle cx="66" cy="46" r="2.6" fill="#fff"/>
        <circle cx="37" cy="52.6" r="1.2" fill="#fff"/><circle cx="61" cy="52.6" r="1.2" fill="#fff"/>
      </g>
      <g class="cm-happy" fill="none" stroke="#2A1E45" stroke-width="3" stroke-linecap="round"><path d="M30 50 Q38 41 46 50"/><path d="M54 50 Q62 41 70 50"/></g>
      <path d="M46.5 56 L53.5 56 L50 62 Z" fill="#F5B14C"/>
      <ellipse cx="28.5" cy="59" rx="5" ry="3" fill="#F9A8D4" opacity=".75"/><ellipse cx="71.5" cy="59" rx="5" ry="3" fill="#F9A8D4" opacity=".75"/>
      <ellipse cx="43" cy="89" rx="4.5" ry="2.6" fill="#F5B14C"/><ellipse cx="57" cy="89" rx="4.5" ry="2.6" fill="#F5B14C"/>
      <g transform="rotate(14 58 26)">
        <path d="M44 29 C48 18 54 8 67 2 C64 10 66 20 72 29 Z" fill="url(#g-hat)"/>
        <ellipse cx="58" cy="30" rx="20" ry="4.5" fill="url(#g-hat)"/>
        <path d="M45.5 26.5 C52 24.5 64 24.5 70.5 26.5 L71 29 C64 27.5 52 27.5 45 29 Z" fill="#FBCFE8"/>
        <path d="${starPath(67, 3, 3.8, 1.6)}" fill="#F5C66B"/>
      </g>
    </svg>`;

    const canvas = document.createElement('canvas');
    canvas.className = 'magic-trail';
    canvas.setAttribute('aria-hidden', 'true');
    const el = document.createElement('div');
    el.className = 'companion';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<div class="cm-sprite"><div class="cm-bob">${owl}</div></div><div class="cm-bubble"></div>`;
    document.body.append(canvas, el);
    const sprite = el.querySelector('.cm-sprite');
    const bubble = el.querySelector('.cm-bubble');
    const ctx = canvas.getContext('2d');
    
    let enabled = storeGet(KEYS.companion, true) !== false;
    let raf = 0, last = 0, W = innerWidth, H = innerHeight;
    let x = -80, y = 140, vx = 0, vy = 0, tx = 0, ty = 0;
    let mode = 'fly', idleUntil = 0, facing = 1, hovering = false, emitAcc = 0, checkAcc = 0;
    let pending = null, sayTimer = 0, wakeTimer = 0, blinkTimer = 0, idleSince = 0, dirty = false, lastPlace = '';
    const parts = [];
    const spriteCache = new Map();

    let sizeCache = 0;
    const size = () => sizeCache || (sizeCache = el.offsetWidth || 64);
    const bounds = () => {
      const s = size();
      return { minX: 12, maxX: W - s - 12, minY: 66, maxY: H - s - (W <= 720 ? 104 : 20) };
    };
    const clamp = (v, a, b) => Math.min(Math.max(v, a), Math.max(a, b));

    const resize = () => {
      W = innerWidth; H = innerHeight; sizeCache = 0;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const b = bounds();
      x = clamp(x, -100, b.maxX); y = clamp(y, b.minY, b.maxY);
      tx = clamp(tx, b.minX, b.maxX); ty = clamp(ty, b.minY, b.maxY);
      if (reduced()) perch();
    };

    const overInteractive = (cx, cy) => {
      if (cx < 0 || cy < 0 || cx > W || cy > H) return false;
      const stack = document.elementsFromPoint(cx, cy);
      for (const node of stack) {
        if (node === el || el.contains(node) || node === canvas) continue;
        return !!(node.closest && node.closest(INTERACTIVE));
      }
      return false;
    };

    /* Ưu tiên lề trống trên màn rộng, tránh đậu lên nút */
    const pickTarget = () => {
      const b = bounds();
      const s = size();
      const gutter = (W - 1080) / 2;
      let best = null;
      for (let i = 0; i < 14; i++) {
        let nx;
        if (gutter > s + 30 && rand() < 0.65) {
          nx = rand() < 0.5 ? 12 + rand() * (gutter - s - 24) : W - gutter + 12 + rand() * (gutter - s - 24);
        } else {
          nx = b.minX + rand() * (b.maxX - b.minX);
        }
        const ny = b.minY + rand() * (b.maxY - b.minY);
        const far = Math.hypot(nx - x, ny - y) > 160;
        if (!overInteractive(nx + s / 2, ny + s / 2) && far) { best = [nx, ny]; break; }
        if (!best) best = [nx, ny];
      }
      [tx, ty] = best;
      mode = 'fly';
    };

    /* Ảnh hạt sáng dựng sẵn để không phải dùng shadowBlur mỗi khung hình */
    const particleSprite = (color, kind) => {
      const key = color + kind;
      if (spriteCache.has(key)) return spriteCache.get(key);
      const c = document.createElement('canvas');
      c.width = c.height = 48;
      const g = c.getContext('2d');
      const glow = g.createRadialGradient(24, 24, 0, 24, 24, 24);
      glow.addColorStop(0, '#ffffff');
      glow.addColorStop(0.25, color);
      glow.addColorStop(1, 'rgba(255,255,255,0)');
      g.globalAlpha = kind === 'star' ? 0.55 : 1;
      g.fillStyle = glow;
      g.fillRect(0, 0, 48, 48);
      if (kind === 'star') {
        g.globalAlpha = 1;
        g.fillStyle = color;
        g.fill(new Path2D(starPath(24, 24, 20, 5, 4)));
        g.fillStyle = '#fff';
        g.fill(new Path2D(starPath(24, 24, 8, 2.2, 4)));
      }
      spriteCache.set(key, c);
      return c;
    };

    const emit = (px, py, burst = false) => {
      if (parts.length > (W <= 720 ? 90 : 160)) parts.shift();
      const a = rand() * Math.PI * 2;
      const sp = burst ? 1.6 + rand() * 2.8 : 0.35 * rand();
      parts.push({
        x: px, y: py,
        vx: (burst ? Math.cos(a) * sp : -vx * 0.18 + Math.cos(a) * sp),
        vy: (burst ? Math.sin(a) * sp : -vy * 0.18 + Math.sin(a) * sp + 0.08),
        life: 0, max: (burst ? 45 : 38) + rand() * 40,
        size: (burst ? 5 : 3) + rand() * 5,
        seed: rand() * 6.28,
        color: pickOne(COLORS), kind: rand() < (burst ? 0.55 : 0.35) ? 'star' : 'dot'
      });
    };
    const burst = (n = 34) => {
      const s = size();
      for (let i = 0; i < n; i++) emit(x + s / 2, y + s / 2, true);
    };

    const say = (text) => {
      bubble.textContent = text;
      bubble.classList.toggle('below', y < 120);
      bubble.style.setProperty('--bx', '0px');
      const bw = bubble.offsetWidth;
      const cx = x + size() / 2;
      let bx = 0;
      if (cx - bw / 2 < 8) bx = 8 - (cx - bw / 2);
      if (cx + bw / 2 > W - 8) bx = W - 8 - (cx + bw / 2);
      bubble.style.setProperty('--bx', `${f(bx)}px`);
      bubble.classList.add('show');
      clearTimeout(sayTimer);
      sayTimer = setTimeout(() => bubble.classList.remove('show'), 2600);
    };

    const place = () => {
      const tilt = f(clamp(vx * 4, -14, 14));
      const key = `${f(x)}|${f(y)}|${tilt}|${facing}`;
      if (key === lastPlace) return;
      lastPlace = key;
      el.style.transform = `translate3d(${f(x)}px,${f(y)}px,0)`;
      sprite.style.transform = `rotate(${tilt}deg) scaleX(${facing})`;
    };

    const step = (now) => {
      const dt = Math.min(50, now - (last || now)) / 16.67;
      last = now;
      const s = size();
      if (!hovering && mode === 'fly') {
        const dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy);
        if (d < 6) {
          mode = 'idle';
          idleSince = now;
          idleUntil = now + 2000 + rand() * 3000;
          if (pending) { burst(26); if (pending.text) say(pending.text); pending = null; }
        } else {
          const sp = 3.1 * Math.min(1, d / 130) + 0.3;
          vx += (dx / d * sp - vx) * 0.055 * dt;
          vy += (dy / d * sp - vy) * 0.055 * dt;
        }
      } else {
        vx *= Math.pow(0.88, dt); vy *= Math.pow(0.88, dt);
        if (mode === 'idle' && !hovering && now > idleUntil) pickTarget();
      }
      x += vx * dt; y += vy * dt;
      if (vx > 0.3) facing = 1; else if (vx < -0.3) facing = -1;
      const speed = Math.hypot(vx, vy);
      el.classList.toggle('is-flying', speed > 0.7);
      place();

      /* Đang nghỉ mà nằm trên nút bấm thì dời đi */
      checkAcc += dt;
      if (checkAcc > 40) {
        checkAcc = 0;
        if (mode === 'idle' && !hovering && overInteractive(x + s / 2, y + s / 2)) idleUntil = now;
      }

      const settling = mode === 'idle' && now - idleSince < 1200;
      emitAcc += (speed > 0.5 ? speed * 0.6 : settling ? 0.05 : 0) * dt;
      while (emitAcc >= 1) {
        emitAcc -= 1;
        emit(x + s / 2 - facing * s * 0.28 + (rand() - 0.5) * 8, y + s * 0.62 + (rand() - 0.5) * 8);
      }

      if (parts.length || dirty) {
        ctx.clearRect(0, 0, W, H);
        dirty = parts.length > 0;
        ctx.globalCompositeOperation = document.documentElement.getAttribute('data-theme') === 'dark' ? 'lighter' : 'source-over';
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        if (p.life >= p.max) { parts.splice(i, 1); continue; }
        p.vx *= Math.pow(0.97, dt); p.vy = p.vy * Math.pow(0.97, dt) + 0.012 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        const k = p.life / p.max;
        const tw = 0.75 + 0.25 * Math.sin(p.life * 0.45 + p.seed);
        const r = p.size * tw * (1 - k * 0.5);
        ctx.globalAlpha = (1 - k) * (1 - k * 0.3);
        ctx.drawImage(particleSprite(p.color, p.kind), p.x - r, p.y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
      if (mode === 'idle' && !pending && parts.length === 0 && Math.hypot(vx, vy) < 0.05) {
        raf = 0;
        // Đang được ngắm (hovering) thì chờ pointerleave đánh thức; không thì dậy khi hết giờ nghỉ.
        if (!hovering) wakeTimer = setTimeout(() => { wakeTimer = 0; start(); }, Math.max(80, idleUntil - performance.now()));
        return;
      }
      raf = requestAnimationFrame(step);
    };

    const stop = () => { cancelAnimationFrame(raf); raf = 0; clearTimeout(wakeTimer); wakeTimer = 0; };
    const start = () => {
      if (raf || !enabled || document.hidden || reduced()) return;
      clearTimeout(wakeTimer); wakeTimer = 0;
      last = 0;
      raf = requestAnimationFrame(step);
    };
    const perch = () => {
      const b = bounds();
      x = b.maxX; y = b.maxY; vx = vy = 0; facing = -1;
      place();
      ctx.clearRect(0, 0, W, H);
    };

    const setEnabled = (on) => {
      enabled = on;
      storeSet(KEYS.companion, on);
      el.hidden = !on;
      canvas.hidden = !on;
      if (!on) { stop(); parts.length = 0; return; }
      if (reduced()) { perch(); return; }
      x = -80; y = bounds().minY + 40; pickTarget(); start();
    };

    /* Chỉ dừng lại ngắm khi đang nghỉ: đang bay ngang nút bấm thì không được đứng chắn */
    el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse' && mode === 'idle') { hovering = true; el.classList.add('is-curious'); } });
    el.addEventListener('pointerleave', () => { hovering = false; el.classList.remove('is-curious'); start(); });
    el.addEventListener('click', () => {
      say(pickOne(LINES));
      if (reduced()) return;
      burst(); start();
      el.classList.remove('is-loop'); void el.offsetWidth; el.classList.add('is-loop');
      setTimeout(() => { el.classList.remove('is-loop'); hovering = false; el.classList.remove('is-curious'); pickTarget(); start(); }, 950);
    });
    window.addEventListener('miu:companion', (e) => setEnabled(!!(e.detail && e.detail.on)), { signal });
    window.addEventListener('resize', resize, { signal });
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()), { signal });
    reduceMQ.addEventListener('change', () => { stop(); if (enabled) (reduced() ? perch() : (pickTarget(), start())); }, { signal });

    window.addEventListener('miu:route', () => { if (enabled && !reduced()) { hovering = false; pickTarget(); start(); } }, { signal });
    window.addEventListener('miu:flip', (e) => {
      if (!enabled || reduced() || !e.detail) return;
      const r = e.detail.rect; if (!r) return;
      const b = bounds();
      tx = clamp(r.right + 6, b.minX, b.maxX);
      ty = clamp(r.top - size() * 0.5, b.minY, b.maxY);
      mode = 'fly';
      pending = { text: e.detail.reversed ? 'Hú… lá ngược, nghe Miu giải thích nhé.' : 'Hú! Lá đẹp ghê.' };
      start();
    }, { signal });

    blinkTimer = setInterval(() => {
      if (!enabled || document.hidden || reduced()) return;
      el.classList.add('is-blink');
      setTimeout(() => el.classList.remove('is-blink'), 320);
    }, 4600);

    resize();
    el.hidden = !enabled;
    canvas.hidden = !enabled;
    if (enabled) { if (reduced()) perch(); else { pickTarget(); start(); } }
    return () => { ac.abort(); stop(); clearInterval(blinkTimer); clearTimeout(sayTimer); el.remove(); canvas.remove(); };
};
