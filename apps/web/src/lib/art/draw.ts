/* eslint-disable */
// @ts-nocheck
/**
 * Mã vẽ SVG cho lá bài, mặt sau và linh vật, chuyển nguyên từ bản mẫu tarot.html.
 * Đây là mã tạo chuỗi SVG (không có logic nghiệp vụ), nên giữ nguyên để hình giống bản mẫu.
 */
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const f = (n) => Math.round(n * 10) / 10;

const DECKS = {
  rws: { id: 'rws', name: 'Rider–Waite–Smith', voice: 'Kinh điển, rõ ràng, dễ đọc.', bg: 'url(#g-rws-bg)', frame: '#C9A55B', ink: '#3A2E4A', accent: '#E3A63A', soft: '#F1DDAF', sky: '#C9DDF0', water: '#6E9CCB', text: '#3A2E4A' },
  moon: { id: 'moon', name: 'Nguyệt Quang', voice: 'Bộ này hợp với những câu hỏi về nội tâm.', bg: 'url(#g-moon-bg)', frame: '#CFC8FF', ink: '#EEEBFF', accent: '#F5E2A8', soft: '#6E62B8', sky: '#5B4F9E', water: '#A49BEA', text: '#EEEBFF' },
  lotus: { id: 'lotus', name: 'Hoa Đăng', voice: 'Nhẹ nhàng như đèn hoa đăng trôi trên sông.', bg: 'url(#g-lotus-bg)', frame: '#E48AAE', ink: '#6A2C4C', accent: '#EE9A4E', soft: '#F6C3D5', sky: '#FBD9E6', water: '#D9789F', text: '#6A2C4C' }
};
const DECK_IDS = ['rws', 'moon', 'lotus'];

const L = (x1, y1, x2, y2, c, w = 3) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
const C = (cx, cy, r, fill, stroke, sw = 3) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill || 'none'}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : ''}/>`;
const P = (d, fill, stroke, sw = 3) => `<path d="${d}" fill="${fill || 'none'}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"` : ''}/>`;
const R = (x, y, w, h, fill, rx = 0, stroke, sw = 2) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : ''}/>`;
const E = (cx, cy, rx, ry, fill, rot = 0, extra = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ''} ${extra}/>`;
const T = (x, y, txt, fill, size = 14) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="${size}" font-weight="700" fill="${fill}">${txt}</text>`;
const starPath = (cx, cy, R1, r1, n = 5) => {
  let d = '';
  for (let k = 0; k < n * 2; k++) {
    const rad = k % 2 === 0 ? R1 : r1;
    const a = -Math.PI / 2 + (k * Math.PI) / n;
    d += (k ? 'L' : 'M') + f(cx + rad * Math.cos(a)) + ' ' + f(cy + rad * Math.sin(a));
  }
  return d + 'Z';
};
const heartPath = (cx, cy, s) => `M${cx} ${f(cy + s * 0.9)} C${f(cx - s * 1.4)} ${cy} ${f(cx - s * 0.9)} ${f(cy - s)} ${cx} ${f(cy - s * 0.35)} C${f(cx + s * 0.9)} ${f(cy - s)} ${f(cx + s * 1.4)} ${cy} ${cx} ${f(cy + s * 0.9)}Z`;
const crescentPath = (cx, cy, r, k = 0.55) => `M${cx} ${cy - r} A${r} ${r} 0 1 0 ${cx} ${cy + r} A${f(r * k)} ${r} 0 1 1 ${cx} ${cy - r}Z`;
const rays = (cx, cy, r1, r2, n, c, w, off = 0) => {
  let s = '';
  for (let k = 0; k < n; k++) {
    const a = off + (k * 2 * Math.PI) / n;
    s += L(f(cx + r1 * Math.cos(a)), f(cy + r1 * Math.sin(a)), f(cx + r2 * Math.cos(a)), f(cy + r2 * Math.sin(a)), c, w);
  }
  return s;
};
const wheat = (x, y, p) => L(x, y, x, y - 58, p.accent, 2.5) +
  [0, 1, 2, 3].map((k) => E(x - 5, y - 18 - k * 12, 3.5, 7, p.accent, -25) + E(x + 5, y - 18 - k * 12, 3.5, 7, p.accent, 25)).join('') +
  E(x, y - 64, 3.5, 7, p.accent);

const SYMBOLS = {
  emperor: (p) => P('M24 150 L60 96 L84 124 L118 80 L176 150 Z', p.soft, p.frame, 1.5) +
    R(58, 132, 84, 112, p.sky, 6, p.ink, 2) + C(100, 150, 12, p.ink) +
    P('M88 138 L92 124 L100 132 L108 124 L112 138 Z', p.accent, p.ink, 1.5) +
    P('M100 162 L78 236 H122 Z', p.accent, p.ink, 2.5) +
    C(138, 166, 6, 'none', p.ink, 2.5) + L(138, 172, 138, 214, p.ink, 2.5) + L(130, 182, 146, 182, p.ink, 2.5) +
    L(40, 262, 160, 262, p.frame, 2),
  hierophant: (p) => R(38, 80, 20, 170, p.soft, 3, p.ink, 1.5) + R(142, 80, 20, 170, p.soft, 3, p.ink, 1.5) +
    P('M100 150 L76 240 H124 Z', p.accent, p.ink, 2.5) + C(100, 136, 12, p.ink) +
    P('M91 124 L93 104 L100 96 L107 104 L109 124 Z', p.accent, p.ink, 1.5) + L(92, 112, 108, 112, p.ink, 1.5) +
    L(126, 150, 126, 232, p.ink, 3) + L(118, 160, 134, 160, p.ink, 2.5) + L(120, 170, 132, 170, p.ink, 2) +
    L(80, 262, 120, 282, p.accent, 4) + L(120, 262, 80, 282, p.accent, 4) +
    C(77, 259, 5, 'none', p.accent, 3) + C(123, 259, 5, 'none', p.accent, 3),
  chariot: (p) => P('M44 80 H156 L148 96 H52 Z', p.sky, p.ink, 2) +
    [66, 84, 100, 116, 134].map((x) => P(starPath(x, 88, 4, 1.7), p.accent)).join('') +
    L(56, 96, 56, 178, p.ink, 2.5) + L(144, 96, 144, 178, p.ink, 2.5) +
    C(100, 128, 11, p.ink) + P('M86 140 H114 L118 180 H82 Z', p.accent, p.ink, 2) +
    R(48, 178, 104, 40, p.soft, 4, p.ink, 2.5) + C(72, 226, 12, 'none', p.ink, 3) + C(128, 226, 12, 'none', p.ink, 3) +
    E(64, 266, 18, 11, p.ink) + E(136, 266, 18, 11, p.soft, 0, `stroke="${p.ink}" stroke-width="2"`),
  strength: (p) => P('M76 76 C76 62 98 62 100 76 C102 90 124 90 124 76 C124 62 102 62 100 76 C98 90 76 90 76 76 Z', 'none', p.accent, 3.5) +
    C(74, 136, 11, p.ink) + P('M74 148 L56 232 H92 Z', p.soft, p.ink, 2.5) +
    rays(128, 202, 20, 34, 14, p.accent, 5) + C(128, 202, 22, p.accent) + C(128, 202, 17, p.soft, p.ink, 2) +
    C(122, 198, 2.5, p.ink) + C(134, 198, 2.5, p.ink) + P('M124 207 Q128 211 132 207', 'none', p.ink, 2) +
    L(82, 176, 110, 196, p.ink, 3) + [60, 84, 150].map((x) => C(x, 270, 4, p.accent)).join(''),
  hermit: (p) => P('M20 292 L100 214 L180 292 Z', p.soft, p.frame, 1.5) +
    P('M92 122 L68 214 H114 Z', p.soft, p.ink, 2.5) + C(92, 112, 11, p.ink) + P('M78 112 Q92 88 106 112', 'none', p.ink, 3) +
    L(70, 124, 60, 232, p.ink, 3) + L(118, 128, 124, 140, p.ink, 2) +
    `<g opacity=".3">${C(125, 152, 18, p.accent)}</g>` + R(116, 140, 18, 24, 'none', 2, p.ink, 2) +
    P(starPath(125, 152, 7, 3, 6), p.accent),
  justice: (p) => R(34, 80, 18, 170, p.soft, 3, p.ink, 1.5) + R(148, 80, 18, 170, p.soft, 3, p.ink, 1.5) +
    C(100, 124, 11, p.ink) + P('M92 112 L96 102 L100 108 L104 102 L108 112 Z', p.accent) +
    P('M100 136 L80 232 H120 Z', p.accent, p.ink, 2.5) +
    L(132, 88, 132, 182, p.ink, 3) + L(124, 170, 140, 170, p.ink, 3) +
    L(56, 150, 92, 150, p.ink, 2) + L(74, 142, 74, 150, p.ink, 2) + L(56, 150, 56, 160, p.ink, 1.5) + L(92, 150, 92, 160, p.ink, 1.5) +
    P('M48 160 Q56 170 64 160 Z', p.accent, p.ink, 1.5) + P('M84 160 Q92 170 100 160 Z', p.accent, p.ink, 1.5),
  hanged: (p) => L(44, 64, 156, 64, p.ink, 6) + L(52, 64, 52, 288, p.ink, 6) + L(148, 64, 148, 288, p.ink, 6) +
    [[64, 60], [92, 60], [124, 60], [48, 120], [152, 160]].map(([x, y]) => E(x, y, 6, 3, p.accent, -25)).join('') +
    L(100, 64, 100, 92, p.ink, 2) + L(100, 92, 100, 138, p.ink, 3) + P('M100 104 L116 120 L100 130', 'none', p.ink, 3) +
    P('M86 138 H114 L100 198 Z', p.accent, p.ink, 2.5) +
    `<circle cx="100" cy="214" r="21" fill="none" stroke="${p.accent}" stroke-width="3" opacity=".8"/>` + C(100, 214, 12, p.ink),
  death: (p) => C(100, 252, 32, p.accent) + R(20, 252, 160, 40, p.soft, 0) + L(20, 252, 180, 252, p.frame, 2) +
    R(50, 210, 16, 42, p.ink) + P('M48 211 L58 198 L68 211 Z', p.ink) + R(134, 210, 16, 42, p.ink) + P('M132 211 L142 198 L152 211 Z', p.ink) +
    L(56, 70, 56, 196, p.ink, 3) + R(56, 76, 88, 70, p.ink, 4) +
    [0, 1, 2, 3, 4].map((k) => { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5; return C(f(100 + 11 * Math.cos(a)), f(111 + 11 * Math.sin(a)), 9, p.soft); }).join('') +
    C(100, 111, 6, p.accent),
  temperance: (p) => P('M88 128 Q54 116 48 170 Q70 150 92 150 Z', p.sky, p.ink, 1.5) + P('M112 128 Q146 116 152 170 Q130 150 108 150 Z', p.sky, p.ink, 1.5) +
    P('M100 120 L80 212 H120 Z', p.soft, p.ink, 2.5) + C(100, 108, 11, p.ink) + P('M94 140 L106 140 L100 151 Z', p.accent) +
    P('M60 166 h16 l-3 13 h-10 Z', p.accent, p.ink, 1.5) + P('M124 148 h16 l-3 13 h-10 Z', p.accent, p.ink, 1.5) +
    P('M76 170 Q102 146 128 156', 'none', p.water, 2.5) +
    P('M24 262 Q62 252 100 262 T176 262', 'none', p.water, 3) + P('M154 252 Q142 200 160 124', 'none', p.frame, 2) + C(160, 114, 9, p.accent),
  devil: (p) => `<g transform="rotate(180 100 84)">${P(starPath(100, 84, 20, 8), 'none', p.accent, 2)}</g>` +
    P('M82 142 Q40 122 34 172 Q60 160 86 162 Z', p.ink) + P('M118 142 Q160 122 166 172 Q140 160 114 162 Z', p.ink) +
    P('M88 122 L80 102 L96 116 Z', p.ink) + P('M112 122 L120 102 L104 116 Z', p.ink) + C(100, 134, 17, p.ink) +
    C(94, 132, 2.5, p.accent) + C(106, 132, 2.5, p.accent) +
    R(76, 176, 48, 30, p.soft, 3, p.ink, 2) +
    C(60, 220, 8, p.ink) + P('M60 228 L52 264 H68 Z', p.soft, p.ink, 2) + C(140, 220, 8, p.ink) + P('M140 228 L132 264 H148 Z', p.soft, p.ink, 2) +
    `<g stroke-dasharray="3 3">${P('M80 200 Q70 214 64 232', 'none', p.ink, 1.5)}${P('M120 200 Q130 214 136 232', 'none', p.ink, 1.5)}</g>`,
  tower: (p) => P('M30 292 L70 242 H130 L170 292 Z', p.soft, p.frame, 1.5) + R(78, 120, 44, 124, p.soft, 2, p.ink, 2.5) +
    R(92, 150, 16, 20, p.accent, 2) + R(92, 192, 16, 20, p.accent, 2) +
    `<g transform="rotate(-24 100 98)">${P('M76 106 L82 90 L91 100 L100 86 L109 100 L118 90 L124 106 Z', p.accent, p.ink, 1.5)}</g>` +
    P('M152 48 L130 90 L144 92 L120 134', 'none', p.accent, 4) +
    [[58, 150], [142, 172], [52, 200], [150, 214], [64, 120]].map(([x, y]) => P(`M${x} ${y} q5 7 0 11 q-5 -4 0 -11z`, p.accent)).join(''),
  judgement: (p) => E(100, 100, 66, 18, p.sky) + C(100, 72, 12, p.ink) +
    P('M88 82 Q60 70 56 100 Q74 92 92 94 Z', p.soft, p.ink, 1.5) + P('M112 82 Q140 70 144 100 Q126 92 108 94 Z', p.soft, p.ink, 1.5) +
    P('M106 92 L148 136 L156 128 Z', p.accent, p.ink, 1.5) + R(138, 138, 20, 15, p.soft, 1, p.ink, 1.5) +
    L(148, 138, 148, 153, p.accent, 2) + L(138, 145, 158, 145, p.accent, 2) +
    [60, 100, 140].map((x) => C(x, 196, 9, p.ink) + P(`M${x} 206 L${x - 10} 238 H${x + 10} Z`, p.soft, p.ink, 2) + L(x - 6, 210, x - 14, 192, p.ink, 2.5) + L(x + 6, 210, x + 14, 192, p.ink, 2.5)).join('') +
    R(34, 238, 132, 16, p.ink, 3) + P('M28 274 Q64 264 100 274 T172 274', 'none', p.water, 3),
  fool: (p) => C(150, 74, 15, p.accent) + rays(150, 74, 21, 28, 10, p.accent, 2.5) +
    P('M22 288 L70 206 L102 240 L146 186 L180 288 Z', p.soft, p.frame, 1.5) +
    P('M92 140 L74 198 L110 198 Z', p.accent, p.ink, 2.5) + C(92, 128, 11, p.ink) +
    L(84, 198, 78, 226, p.ink) + L(100, 198, 108, 224, p.ink) +
    L(98, 152, 134, 116, p.ink, 2.5) + C(138, 112, 8, p.soft, p.ink, 2.5) + C(74, 160, 5, p.soft, p.ink, 2),
  magician: (p) => P('M76 76 C76 62 98 62 100 76 C102 90 124 90 124 76 C124 62 102 62 100 76 C98 90 76 90 76 76 Z', 'none', p.accent, 3.5) +
    L(100, 104, 100, 190, p.ink, 5) + C(100, 102, 5, p.accent) + C(100, 192, 5, p.accent) +
    R(34, 212, 132, 10, p.ink, 3) + P('M46 192 H68 L64 210 H50 Z', p.soft, p.ink, 2) + C(88, 201, 9, p.accent, p.ink, 2) +
    L(112, 210, 128, 184, p.ink, 3) + L(114, 194, 126, 200, p.ink, 2) + L(148, 210, 154, 184, p.ink, 3) + C(154, 182, 3, p.accent) +
    [50, 75, 100, 125, 150].map((x) => C(x, 252, 6, p.soft, p.frame, 1.5)).join('') +
    [62, 88, 112, 138].map((x) => E(x, 252, 6, 3, p.accent, -30)).join(''),
  priestess: (p) => `<g opacity=".6">${P('M66 92 Q100 112 134 92 V242 Q100 224 66 242 Z', p.sky)}</g>` +
    R(42, 72, 24, 182, p.ink, 3) + R(134, 72, 24, 182, p.soft, 3, p.ink, 2) + T(54, 100, 'B', p.soft) + T(146, 100, 'J', p.ink) +
    P('M100 140 L80 232 H120 Z', p.soft, p.ink, 2.5) + C(100, 128, 12, p.accent) + C(100, 110, 5, 'none', p.ink, 2) +
    R(90, 168, 20, 26, p.accent, 3) +
    `<g transform="rotate(-90 100 254)">${P(crescentPath(100, 254, 16), p.accent)}</g>`,
  empress: (p) => Array.from({ length: 12 }, (_, k) => {
    const a = Math.PI * (1.1 + (0.8 * k) / 11);
    return P(starPath(f(100 + 62 * Math.cos(a)), f(132 + 62 * Math.sin(a)), 6, 2.6), p.accent);
  }).join('') +
    C(100, 152, 26, p.soft, p.ink, 4) + L(100, 178, 100, 232, p.ink, 4) + L(82, 210, 118, 210, p.ink, 4) +
    wheat(46, 276, p) + wheat(154, 276, p) + P('M30 266 Q100 248 170 266', 'none', p.frame, 2.5),
  lovers: (p) => C(100, 74, 17, p.accent) + rays(100, 74, 23, 31, 12, p.accent, 2.5) +
    P('M68 256 L100 200 L132 256 Z', p.soft, p.frame, 1.5) +
    P('M60 162 L44 222 H76 Z', p.soft, p.ink, 2.5) + C(60, 150, 11, p.ink) +
    P('M140 162 L124 222 H156 Z', p.soft, p.ink, 2.5) + C(140, 150, 11, p.ink) +
    P(heartPath(100, 150, 15), p.accent, p.ink, 2),
  wheel: (p) => C(100, 166, 64, p.soft, p.ink, 4) + rays(100, 166, 13, 62, 8, p.ink, 2.5, Math.PI / 8) +
    C(100, 166, 44, 'none', p.ink, 2.5) + C(100, 166, 12, p.accent, p.ink, 2.5) +
    [0, 1, 2, 3].map((k) => { const a = (k * Math.PI) / 2; return C(f(100 + 54 * Math.cos(a)), f(166 + 54 * Math.sin(a)), 4.5, p.accent); }).join('') +
    [[40, 70], [160, 70], [40, 268], [160, 268]].map(([x, y]) => P(starPath(x, y, 9, 3.6), p.accent)).join(''),
  star: (p) => P(starPath(100, 116, 42, 15, 8), p.accent, p.ink, 2) +
    [[46, 70, 9], [154, 70, 9], [38, 132, 7], [162, 132, 7], [56, 190, 8], [150, 196, 7]].map(([x, y, r]) => P(starPath(x, y, r, f(r * 0.42), 8), p.accent)).join('') +
    P('M118 152 Q136 196 124 230', 'none', p.water, 3) +
    [234, 250, 266].map((y) => P(`M28 ${y} Q52 ${y - 10} 76 ${y} T124 ${y} T172 ${y}`, 'none', p.water, 3)).join(''),
  moon: (p) => C(100, 104, 38, p.accent) + `<g opacity=".22">${P(crescentPath(100, 104, 38, 0.55), p.ink)}</g>` +
    rays(100, 104, 46, 54, 16, p.accent, 2) +
    [[78, 160], [92, 168], [108, 164], [122, 172], [100, 180]].map(([x, y]) => P(`M${x} ${y} q4 6 0 9 q-4 -3 0 -9z`, p.accent)).join('') +
    R(30, 196, 26, 72, p.ink) + P('M27 197 L43 176 L59 197 Z', p.ink) +
    R(144, 196, 26, 72, p.ink) + P('M141 197 L157 176 L173 197 Z', p.ink) +
    E(100, 284, 62, 8, p.water, 0, 'opacity=".5"') +
    P('M100 282 C82 262 118 246 100 226 C88 210 104 198 100 186', 'none', p.water, 3),
  sun: (p) => rays(100, 124, 46, 62, 16, p.accent, 4) + rays(100, 124, 46, 54, 16, p.accent, 3, Math.PI / 16) +
    C(100, 124, 36, p.accent, p.ink, 2.5) + C(88, 118, 3, p.ink) + C(112, 118, 3, p.ink) +
    P('M90 134 Q100 142 110 134', 'none', p.ink, 2.5) +
    R(26, 232, 148, 12, p.soft, 2, p.frame, 1.5) +
    [48, 78, 122, 152].map((x) => L(x, 232, x, 214, p.ink, 2) + C(x, 208, 8, p.accent, p.ink, 1.5) + C(x, 208, 3, p.ink)).join(''),
  world: (p) => `<ellipse cx="100" cy="166" rx="50" ry="84" fill="none" stroke="${p.soft}" stroke-width="12"/>` +
    `<ellipse cx="100" cy="166" rx="50" ry="84" fill="none" stroke="${p.accent}" stroke-width="5" stroke-dasharray="7 9" stroke-linecap="round"/>` +
    P('M90 76 L110 88 M110 76 L90 88', 'none', p.ink, 3) + P('M90 244 L110 256 M110 244 L90 256', 'none', p.ink, 3) +
    C(100, 130, 9, p.ink) + P('M100 140 Q86 172 100 204 Q114 172 100 140 Z', p.accent, p.ink, 2) +
    P('M84 152 Q100 166 116 150', 'none', p.ink, 2.5) + L(100, 204, 92, 226, p.ink) + L(100, 204, 110, 222, p.ink) +
    [[36, 62], [164, 62], [36, 276], [164, 276]].map(([x, y]) => C(x, y, 10, p.soft, p.ink, 2)).join('')
};

/* ---- Hình Bộ Ẩn Phụ: biểu tượng từng chất + cách xếp theo số ---- */
const suitColor = (suit, p) => ({ wands: p.accent, cups: p.water, swords: p.sky, pentacles: p.frame }[suit]);
const glyph = (suit, x, y, s, p) => {
  if (suit === 'wands') {
    return L(x, y + s, x, y - s * 0.7, p.ink, s * 0.3) + L(x, y + s, x, y - s * 0.7, p.accent, s * 0.18) +
      P(`M${x} ${f(y - s * 1.05)} Q${f(x + s * 0.5)} ${f(y - s * 0.6)} ${x} ${f(y - s * 0.15)} Q${f(x - s * 0.5)} ${f(y - s * 0.6)} ${x} ${f(y - s * 1.05)}Z`, p.accent, p.ink, 1.4) +
      E(f(x - s * 0.5), f(y + s * 0.15), s * 0.28, s * 0.12, p.soft, -35) + E(f(x + s * 0.5), f(y + s * 0.4), s * 0.28, s * 0.12, p.soft, 35);
  }
  if (suit === 'cups') {
    return P(`M${f(x - s * 0.8)} ${f(y - s * 0.7)} H${f(x + s * 0.8)} Q${f(x + s * 0.8)} ${f(y + s * 0.2)} ${x} ${f(y + s * 0.25)} Q${f(x - s * 0.8)} ${f(y + s * 0.2)} ${f(x - s * 0.8)} ${f(y - s * 0.7)}Z`, p.water, p.ink, 1.6) +
      E(x, f(y - s * 0.7), s * 0.8, s * 0.16, p.soft, 0, `stroke="${p.ink}" stroke-width="1.3"`) +
      L(x, f(y + s * 0.25), x, f(y + s * 0.75), p.ink, s * 0.14) + E(x, f(y + s * 0.85), s * 0.55, s * 0.15, p.ink);
  }
  if (suit === 'swords') {
    return P(`M${x} ${f(y - s)} L${f(x + s * 0.2)} ${f(y - s * 0.7)} V${f(y + s * 0.3)} H${f(x - s * 0.2)} V${f(y - s * 0.7)}Z`, p.soft, p.ink, 1.4) +
      L(f(x - s * 0.55), f(y + s * 0.3), f(x + s * 0.55), f(y + s * 0.3), p.ink, s * 0.16) +
      L(x, f(y + s * 0.3), x, f(y + s * 0.8), p.ink, s * 0.15) + C(x, f(y + s * 0.9), s * 0.13, p.accent, p.ink, 1.2);
  }
  return C(x, y, s * 0.92, p.accent, p.ink, 1.6) + P(starPath(x, y, s * 0.72, s * 0.28), p.soft, p.ink, 1.3);
};
const PIPS = {
  2: [[.5, .2], [.5, .8]], 3: [[.5, .1], [.5, .5], [.5, .9]],
  4: [[.2, .2], [.8, .2], [.2, .8], [.8, .8]], 5: [[.2, .2], [.8, .2], [.5, .5], [.2, .8], [.8, .8]],
  6: [[.2, .15], [.8, .15], [.2, .5], [.8, .5], [.2, .85], [.8, .85]],
  7: [[.2, .12], [.8, .12], [.2, .5], [.8, .5], [.2, .88], [.8, .88], [.5, .31]],
  8: [[.2, .12], [.8, .12], [.2, .5], [.8, .5], [.2, .88], [.8, .88], [.5, .31], [.5, .69]],
  9: [[.2, .1], [.8, .1], [.2, .37], [.8, .37], [.2, .63], [.8, .63], [.2, .9], [.8, .9], [.5, .5]],
  10: [[.2, .1], [.8, .1], [.2, .37], [.8, .37], [.2, .63], [.8, .63], [.2, .9], [.8, .9], [.5, .23], [.5, .77]]
};
const courtFigure = (suit, rank, p) => {
  const col = suitColor(suit, p);
  const cape = rank === 'king' ? P('M54 268 L66 152 H134 L146 268Z', p.soft, p.ink, 1.6) : '';
  const robe = rank === 'queen'
    ? P('M62 268 L84 160 H116 L138 268Z', col, p.ink, 2)
    : P(`M72 268 L${rank === 'king' ? 80 : 84} 160 H${rank === 'king' ? 120 : 116} L128 268Z`, col, p.ink, 2);
  const crown = {
    page: P('M80 98 Q100 66 120 98 Z', col, p.ink, 2) + C(100, 72, 4, p.accent, p.ink, 1.2),
    knight: P('M78 104 Q80 70 100 68 Q122 70 122 104 Z', p.soft, p.ink, 2) + P('M100 68 Q132 52 128 90', 'none', col, 5) + L(80, 98, 120, 98, p.ink, 2),
    queen: P('M78 100 L82 72 L92 88 L100 66 L108 88 L118 72 L122 100 Z', p.accent, p.ink, 2),
    king: P('M76 100 L78 66 L90 84 L100 60 L110 84 L122 66 L124 100 Z', p.accent, p.ink, 2) + C(100, 84, 3.5, col, p.ink, 1)
  }[rank];
  return rays(100, 120, 60, 72, 16, p.frame, 1.4) + cape + robe + R(90, 140, 20, 22, p.soft, 4, p.ink, 1.5) +
    C(100, 120, 21, p.soft, p.ink, 2) + C(93, 118, 2, p.ink) + C(107, 118, 2, p.ink) + P('M94 129 Q100 134 106 129', 'none', p.ink, 1.8) +
    crown + glyph(suit, 148, 196, 34, p) + L(128, 200, 148, 200, p.ink, 3.5) +
    L(40, 280, 160, 280, p.frame, 2);
};
const minorSymbol = (id) => {
  const m = /^(wands|cups|swords|pentacles)-(ace|\d+|page|knight|queen|king)$/.exec(String(id || ''));
  if (!m) return null;
  const [, suit, rank] = m;
  return (p) => {
    if (rank === 'ace') {
      return rays(100, 168, 70, 88, 20, p.frame, 1.6) + C(100, 168, 64, 'none', p.frame, 1.2) +
        glyph(suit, 100, 168, 56, p) + P(starPath(46, 96, 9, 3.4, 4), p.accent) + P(starPath(156, 244, 7, 2.6, 4), p.accent) +
        L(40, 288, 160, 288, p.frame, 2);
    }
    if (/^\d+$/.test(rank)) {
      const n = Number(rank);
      const s = n <= 3 ? 29 : n <= 6 ? 25 : n <= 8 ? 21 : 19;
      return (PIPS[n] || []).map(([u, v]) => glyph(suit, f(52 + u * 96), f(70 + v * 208), s, p)).join('');
    }
    return courtFigure(suit, rank, p);
  };
};

const faceSVG = (c, deckId) => {
  const p = DECKS[deckId] || DECKS.rws;
  const name = String(c.name || '').toUpperCase();
  const sym = SYMBOLS[c.symbol] || SYMBOLS[c.id] || minorSymbol(c.symbol || c.id) || SYMBOLS.star;
  return `<svg viewBox="0 0 200 340" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">` +
    `<rect width="200" height="340" rx="14" fill="${p.bg}"/>` +
    `<rect x="9" y="9" width="182" height="322" rx="9" fill="none" stroke="${p.frame}" stroke-width="1.5"/>` +
    `<text x="100" y="37" text-anchor="middle" font-size="15" font-weight="600" letter-spacing="2" fill="${p.text}">${esc(c.num || '')}</text>` +
    sym(p) +
    `<text x="100" y="317" text-anchor="middle" font-size="${name.length > 16 ? 9 : name.length > 12 ? 11 : 13}" font-weight="600" letter-spacing="1.2" fill="${p.text}">${esc(name)}</text>` +
    `</svg>`;
};

export const backSVG = (deckId) => `<svg viewBox="0 0 200 340" aria-hidden="true" focusable="false"><use href="#back-${deckId}"/></svg>`;

/** Tạo SVG mặt trước. card cần: id, numeral, name. */
export const faceSvgFor = (card, deckId) => faceSVG({ id: card.id, num: card.numeral, name: card.name, symbol: card.id }, deckId);

export const spriteMarkup = () => {
  const gold = '#E7C97A';
  const lotusPetals = [-2, -1, 1, 2, 0].map((k) =>
    `<path d="M100 196 C86 172 88 142 100 124 C112 142 114 172 100 196Z" fill="#fff" fill-opacity="${k === 0 ? 0.95 : 0.7}" transform="rotate(${k * 30} 100 196)"/>`).join('');
  const sprite = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
    <linearGradient id="g-hat" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8B5CF6"/><stop offset="1" stop-color="#EC4899"/></linearGradient>
    <linearGradient id="g-rws-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FCF7EA"/><stop offset="1" stop-color="#F4E8CC"/></linearGradient>
    <linearGradient id="g-moon-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2B2559"/><stop offset="1" stop-color="#4A3A7E"/></linearGradient>
    <linearGradient id="g-lotus-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF5F7"/><stop offset="1" stop-color="#FADDE8"/></linearGradient>
    <linearGradient id="g-back-rws" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3B2C66"/><stop offset="1" stop-color="#5E4291"/></linearGradient>
    <linearGradient id="g-back-moon" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1C1A44"/><stop offset="1" stop-color="#3A2F74"/></linearGradient>
    <linearGradient id="g-back-lotus" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F7B6CE"/><stop offset="1" stop-color="#E383AD"/></linearGradient>
    <pattern id="p-lattice" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0H16M0 0V16" stroke="${gold}" stroke-opacity=".25" stroke-width="1"/></pattern>
    <pattern id="p-dots" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="7" cy="7" r="1.1" fill="#CFC8FF" fill-opacity=".45"/></pattern>
    <pattern id="p-petals" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M12 4 C15 9 15 15 12 20 C9 15 9 9 12 4Z" fill="#fff" fill-opacity=".2"/></pattern>
    <symbol id="back-rws" viewBox="0 0 200 340">
      <rect width="200" height="340" rx="14" fill="url(#g-back-rws)"/><rect width="200" height="340" rx="14" fill="url(#p-lattice)"/>
      <rect x="10" y="10" width="180" height="320" rx="9" fill="none" stroke="${gold}" stroke-width="1.5" stroke-opacity=".85"/>
      <rect x="16" y="16" width="168" height="308" rx="6" fill="none" stroke="${gold}" stroke-width=".8" stroke-opacity=".5"/>
      ${rays(100, 170, 44, 60, 16, gold, 1.5)}
      <circle cx="100" cy="170" r="40" fill="#43317A" stroke="${gold}" stroke-width="1.5"/>
      <path d="${starPath(100, 170, 26, 10, 8)}" fill="${gold}"/>
      <circle cx="100" cy="58" r="5" fill="${gold}"/><circle cx="100" cy="282" r="5" fill="${gold}"/>
    </symbol>
    <symbol id="back-moon" viewBox="0 0 200 340">
      <rect width="200" height="340" rx="14" fill="url(#g-back-moon)"/><rect width="200" height="340" rx="14" fill="url(#p-dots)"/>
      <rect x="10" y="10" width="180" height="320" rx="9" fill="none" stroke="#CFC8FF" stroke-width="1.2" stroke-opacity=".7"/>
      <circle cx="100" cy="170" r="58" fill="none" stroke="#CFC8FF" stroke-opacity=".35"/>
      <g transform="rotate(-30 100 170)"><path d="${crescentPath(100, 170, 44, 0.6)}" fill="#F5E2A8"/></g>
      ${[[56, 74, 7], [148, 96, 5], [64, 262, 5], [142, 270, 8], [100, 40, 4], [100, 300, 4]].map(([x, y, r]) => `<path d="${starPath(x, y, r, f(r * 0.4), 4)}" fill="#F5E2A8"/>`).join('')}
    </symbol>
    <symbol id="back-lotus" viewBox="0 0 200 340">
      <rect width="200" height="340" rx="14" fill="url(#g-back-lotus)"/><rect width="200" height="340" rx="14" fill="url(#p-petals)"/>
      <rect x="10" y="10" width="180" height="320" rx="9" fill="none" stroke="#fff" stroke-width="1.5" stroke-opacity=".8"/>
      <circle cx="100" cy="84" r="16" fill="#F3A25B"/><path d="M92 70h16M92 98h16M100 60v8" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
      ${lotusPetals}
      <path d="M40 222 Q70 212 100 222 T160 222" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="2"/>
      <path d="M52 238 Q76 230 100 238 T148 238" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2"/>
    </symbol>
    <symbol id="mq-img" viewBox="0 0 635 640"><image href="/miu.webp" width="635" height="640"/></symbol>
  </defs></svg>`;
  return sprite;
};


export const mascotSVG = () => `<svg class="mascot-svg" viewBox="0 0 635 640" aria-hidden="true" focusable="false">
  <g class="m-body"><g class="m-head"><use href="#mq-img" width="635" height="640"/></g></g>
  <g class="m-spark">
    <path d="${starPath(40, 190, 26, 10, 4)}" fill="#F5C66B"/>
    <path d="${starPath(600, 300, 22, 8, 4)}" fill="#F472B6"/>
    <path d="${starPath(585, 120, 18, 7, 4)}" fill="#A78BFA"/>
    <path d="${starPath(30, 420, 16, 6, 4)}" fill="#F472B6"/>
  </g>
</svg>`;

export { DECKS, DECK_IDS, starPath, crescentPath, rays };
