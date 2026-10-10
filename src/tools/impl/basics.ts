/** 规格工具实现：字段/输出快捷构造 + 首批工具集 */
import type { FieldSpec, OutputSpec, ToolSpec } from '../types';

/* ── 构造助手 ─────────────────────────────────────────── */
export const text = (key: string, label: string, value = '', hint?: string): FieldSpec => ({ kind: 'text', key, label, value, hint });
export const area = (key: string, label: string, value = '', rows = 6, hint?: string): FieldSpec => ({ kind: 'textarea', key, label, value, rows, hint });
export const num = (key: string, label: string, value: number, hint?: string): FieldSpec => ({ kind: 'number', key, label, value: String(value), hint });
export const sel = (key: string, label: string, options: string[], value?: string): FieldSpec => ({ kind: 'select', key, label, options, value: value ?? options[0] });
export const check = (key: string, label: string, checked = false): FieldSpec => ({ kind: 'checkbox', key, label, checked });
export const out = (key: string, label: string, height?: number): OutputSpec => ({ key, label, height });

/* ── 公共小函数 ───────────────────────────────────────── */
const lines = (s: string) => String(s ?? '').split(/\r?\n/);

const escapeHTML = (s: string) =>
  String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]!);

const unescapeHTML = (s: string) =>
  String(s)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');

const toHex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

/** 紧凑 MD5（RFC 1321）实现：crypto.subtle 不提供 MD5 */
export function md5(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const len = bytes.length;
  const withOne = len + 1;
  const padded = new Uint8Array(Math.ceil((withOne + 8) / 64) * 64);
  padded.set(bytes);
  padded[len] = 0x80;
  const bitLen = len * 8;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 8, bitLen >>> 0, true);
  dv.setUint32(padded.length - 4, Math.floor(bitLen / 0x100000000), true);

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
  const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0);

  for (let chunk = 0; chunk < padded.length; chunk += 64) {
    const M = Array.from({ length: 16 }, (_, i) => dv.getUint32(chunk + i * 4, true));
    let [A, B, C, D] = [a0, b0, c0, d0];
    for (let i = 0; i < 64; i++) {
      let F: number;
      let g: number;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }
      F = (F + A + K[i] + M[g]) >>> 0;
      A = D;
      D = C;
      C = B;
      B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) >>> 0;
    }
    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }
  const hex = (n: number) => [0, 8, 16, 24].map((s) => ((n >>> s) & 0xff).toString(16).padStart(2, '0')).join('');
  return hex(a0) + hex(b0) + hex(c0) + hex(d0);
}

/** SHA-1（同步实现，避免依赖 crypto.subtle 的安全上下文限制） */
export function sha1(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const bitLen = bytes.length * 8;
  const padded = new Uint8Array(Math.ceil((bytes.length + 9) / 64) * 64);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 8, Math.floor(bitLen / 0x100000000));
  dv.setUint32(padded.length - 4, bitLen >>> 0);

  let [h0, h1, h2, h3, h4] = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
  for (let chunk = 0; chunk < padded.length; chunk += 64) {
    const w = new Array<number>(80);
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(chunk + i * 4);
    for (let i = 16; i < 80; i++) w[i] = (((w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16]) << 1) | ((w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16]) >>> 31)) >>> 0;
    let [a, b, c, d, e] = [h0, h1, h2, h3, h4];
    for (let i = 0; i < 80; i++) {
      const [f, k] =
        i < 20
          ? [(b & c) | (~b & d), 0x5a827999]
          : i < 40
            ? [b ^ c ^ d, 0x6ed9eba1]
            : i < 60
              ? [(b & c) | (b & d) | (c & d), 0x8f1bbcdc]
              : [b ^ c ^ d, 0xca62c1d6];
      const tmp = ((((a << 5) | (a >>> 27)) + f + e + k + w[i]) >>> 0);
      e = d;
      d = c;
      c = ((b << 30) | (b >>> 2)) >>> 0;
      b = a;
      a = tmp;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }
  return [h0, h1, h2, h3, h4].map((n) => n.toString(16).padStart(8, '0')).join('');
}

async function digest(algo: 'SHA-256' | 'SHA-384' | 'SHA-512', input: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('当前环境（非 https/localhost）不支持 Web Crypto，无法计算该哈希');
  return toHex(await crypto.subtle.digest(algo, new TextEncoder().encode(input)));
}

const md5Hex = (s: string) => md5(s);
const sha1Hex = (s: string) => sha1(s);

const parseJSON = (s: string, label = 'JSON') => {
  try {
    return JSON.parse(s);
  } catch (e) {
    throw new Error(`${label} 解析失败：${e instanceof Error ? e.message : String(e)}`);
  }
};

/* ── 工具实现 ─────────────────────────────────────────── */
export const basicsRegistry: Record<string, ToolSpec> = {
  'uuid-generator': {
    fields: [sel('version', '版本', ['v4', 'Nil UUID'], 'v4'), num('count', '数量', 5), check('upper', '大写'), check('brace', '加花括号')],
    outputs: [out('result', 'UUID', 120)],
    run: (ctx) => {
      const count = Math.max(1, Math.min(100, ctx.num('count') || 1));
      const nil = ctx.get('version') === 'Nil UUID';
      const gen = () =>
        nil
          ? '00000000-0000-0000-0000-000000000000'
          : crypto.randomUUID
            ? crypto.randomUUID()
            : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                const r = (Math.random() * 16) | 0;
                return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
              });
      ctx.set(
        'result',
        Array.from({ length: count }, () => {
          let v = gen();
          if (ctx.bool('upper')) v = v.toUpperCase();
          if (ctx.bool('brace')) v = `{${v}}`;
          return v;
        }).join('\n'),
      );
    },
  },

  'ulid-generator': {
    fields: [num('count', '数量', 5)],
    outputs: [out('result', 'ULID', 120)],
    run: (ctx) => {
      const ENC = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
      const encode = (n: number, len: number) => {
        let s = '';
        for (let i = len - 1; i >= 0; i--) {
          s = ENC[n % 32] + s;
          n = Math.floor(n / 32);
        }
        return s;
      };
      const count = Math.max(1, Math.min(100, ctx.num('count') || 1));
      const make = () => {
        const time = Date.now();
        const rand = new Uint8Array(10);
        crypto.getRandomValues(rand);
        let tail = '';
        for (const b of rand) tail += encode(b, 1) + encode(0, 0);
        let randChars = '';
        for (const b of rand) randChars += ENC[b % 32];
        void tail;
        return encode(time, 10) + randChars;
      };
      ctx.set('result', Array.from({ length: count }, make).join('\n'));
    },
  },

  'token-generator': {
    fields: [
      sel('charset', '字符集', ['字母数字 (A-Za-z0-9)', '十六进制 (0-9a-f)', 'URL 安全 (Base64URL)', '全部 ASCII 可见字符'], '字母数字 (A-Za-z0-9)'),
      num('length', '长度', 32),
      num('count', '数量', 5),
    ],
    outputs: [out('result', '随机字符串', 140)],
    run: (ctx) => {
      const sets: Record<string, string> = {
        '字母数字 (A-Za-z0-9)': 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
        '十六进制 (0-9a-f)': '0123456789abcdef',
        'URL 安全 (Base64URL)': 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
        '全部 ASCII 可见字符': ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~',
      };
      const chars = sets[ctx.get('charset')] ?? sets['字母数字 (A-Za-z0-9)'];
      const length = Math.max(1, Math.min(4096, ctx.num('length') || 1));
      const count = Math.max(1, Math.min(200, ctx.num('count') || 1));
      const make = () => {
        const buf = new Uint32Array(length);
        crypto.getRandomValues(buf);
        let s = '';
        for (const n of buf) s += chars[n % chars.length];
        return s;
      };
      ctx.set('result', Array.from({ length: count }, make).join('\n'));
    },
  },

  'base64-string-converter': {
    fields: [area('text', '输入', 'Hello 码坊', 6), sel('mode', '模式', ['编码为 Base64', '解码 Base64']), check('urlSafe', 'URL 安全（-_ 且去填充）')],
    outputs: [out('result', '结果', 140)],
    run: (ctx) => {
      const input = ctx.get('text');
      if (!input) {
        ctx.set('result', '');
        return;
      }
      const urlSafe = ctx.bool('urlSafe');
      if (ctx.get('mode') === '编码为 Base64') {
        let b64 = btoa(String.fromCharCode(...new TextEncoder().encode(input)));
        if (urlSafe) b64 = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        ctx.set('result', b64);
      } else {
        let s = input.trim().replace(/-/g, '+').replace(/_/g, '/');
        while (s.length % 4) s += '=';
        try {
          const bin = atob(s);
          const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
          ctx.set('result', new TextDecoder().decode(bytes));
        } catch {
          throw new Error('不是合法的 Base64 内容');
        }
      }
    },
  },

  'case-converter': {
    fields: [area('text', '文本', 'CodeWF 码坊工具箱', 5)],
    outputs: [out('result1', 'camelCase', 40), out('result2', 'snake_case', 40), out('result3', 'kebab-case', 40), out('result4', 'PascalCase', 40), out('result5', 'CONSTANT_CASE', 40), out('result6', 'Title Case', 40)],
    run: (ctx) => {
      const words = ctx
        .get('text')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .split(/[^A-Za-z0-9\u4e00-\u9fa5]+/)
        .filter(Boolean);
      const lower = words.map((w) => w.toLowerCase());
      const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      ctx.set('result1', lower.length ? lower[0] + lower.slice(1).map(cap).join('') : '');
      ctx.set('result2', lower.join('_'));
      ctx.set('result3', lower.join('-'));
      ctx.set('result4', words.map(cap).join(''));
      ctx.set('result5', lower.join('_').toUpperCase());
      ctx.set('result6', words.map(cap).join(' '));
    },
  },

  'color-converter': {
    fields: [text('color', '颜色', '#3498db', '支持 #rgb / #rrggbb / rgb() / hsl()')],
    outputs: [out('result', '转换结果', 140)],
    run: (ctx) => {
      const raw = ctx.get('color').trim();
      if (!raw) {
        ctx.set('result', '');
        return;
      }
      let r = 0;
      let g = 0;
      let b = 0;
      const hex = raw.replace(/^#/, '');
      if (/^[0-9a-f]{3}$/i.test(hex)) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else if (/^[0-9a-f]{6}$/i.test(hex)) {
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
      } else if (/^rgba?\(/i.test(raw)) {
        const parts = raw.replace(/^rgba?\(|\)$/gi, '').split(/[\s,]+/).filter(Boolean).map(Number);
        [r, g, b] = parts;
      } else if (/^hsla?\(/i.test(raw)) {
        const parts = raw.replace(/^hsla?\(|\)$/gi, '').split(/[\s,]+/).map((v) => parseFloat(v));
        const [h, s, l] = [parts[0], parts[1] / 100, parts[2] / 100];
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const hp = (((h % 360) + 360) % 360) / 60;
        const x = c * (1 - Math.abs((hp % 2) - 1));
        const m = l - c / 2;
        const rgb = hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
        [r, g, b] = rgb.map((v) => Math.round((v + m) * 255));
      } else {
        throw new Error('无法识别的颜色格式，请用 #rrggbb、rgb() 或 hsl()');
      }
      const [rr, gg, bb] = [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))));
      const max = Math.max(rr, gg, bb) / 255;
      const min = Math.min(rr, gg, bb) / 255;
      const l = (max + min) / 2;
      const d = max - min;
      const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
      let h = 0;
      if (d !== 0) {
        const rr2 = rr / 255;
        const gg2 = gg / 255;
        const bb2 = bb / 255;
        h = max === rr2 ? 60 * (((gg2 - bb2) / d) % 6) : max === gg2 ? 60 * ((bb2 - rr2) / d + 2) : 60 * ((rr2 - gg2) / d + 4);
      }
      h = Math.round((h + 360) % 360);
      const toHex2 = (v: number) => v.toString(16).padStart(2, '0');
      ctx.set(
        'result',
        [
          `HEX        #${toHex2(rr)}${toHex2(gg)}${toHex2(bb)}`,
          `HEX(短)    #${toHex2(rr)[0]}${toHex2(gg)[0]}${toHex2(bb)[0]}`,
          `RGB        rgb(${rr}, ${gg}, ${bb})`,
          `RGBA       rgba(${rr}, ${gg}, ${bb}, 1)`,
          `HSL        hsl(${h}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`,
          `CSS 变量   --color: #${toHex2(rr)}${toHex2(gg)}${toHex2(bb)};`,
          `预览       ██████ (在下方色块查看)`,
        ].join('\n'),
      );
    },
  },

  'temperature-converter': {
    fields: [num('value', '温度值', 25), sel('unit', '单位', ['摄氏度 °C', '华氏度 °F', '开尔文 K', '兰氏度 °R'])],
    outputs: [out('result', '换算结果', 120)],
    run: (ctx) => {
      const v = ctx.num('value');
      const unit = ctx.get('unit');
      const c = unit === '摄氏度 °C' ? v : unit === '华氏度 °F' ? ((v - 32) * 5) / 9 : unit === '开尔文 K' ? v - 273.15 : ((v - 491.67) * 5) / 9;
      const f = (c * 9) / 5 + 32;
      const k = c + 273.15;
      const r = (c + 273.15) * 1.8;
      const fmt = (n: number) => (Math.round(n * 1000) / 1000).toString();
      ctx.set('result', [`摄氏度    ${fmt(c)} °C`, `华氏度    ${fmt(f)} °F`, `开尔文    ${fmt(k)} K`, `兰氏度    ${fmt(r)} °R`].join('\n'));
    },
  },

  'roman-numeral-converter': {
    fields: [text('value', '数值或罗马数字', '2026'), sel('mode', '模式', ['数字 → 罗马数字', '罗马数字 → 数字'])],
    outputs: [out('result', '结果', 60)],
    run: (ctx) => {
      const v = ctx.get('value').trim();
      const table: [number, string][] = [
        [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
      ];
      if (ctx.get('mode') === '数字 → 罗马数字') {
        let n = Number.parseInt(v, 10);
        if (!Number.isFinite(n) || n < 1 || n > 3999) throw new Error('请输入 1–3999 之间的整数');
        let result = '';
        for (const [value, symbol] of table) {
          while (n >= value) {
            result += symbol;
            n -= value;
          }
        }
        ctx.set('result', result);
      } else {
        const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
        const s = v.toUpperCase();
        if (!/^[IVXLCDM]+$/.test(s)) throw new Error('不是合法的罗马数字');
        let total = 0;
        for (let i = 0; i < s.length; i++) {
          const cur = map[s[i]];
          const next = map[s[i + 1]] ?? 0;
          total += cur < next ? -cur : cur;
        }
        ctx.set('result', String(total));
      }
    },
  },

  'base-converter': {
    fields: [text('number', '数值', '42'), num('fromBase', '输入进制', 10), num('toBase', '输出进制', 16)],
    outputs: [out('result', '结果', 60)],
    run: (ctx) => {
      const from = Math.min(36, Math.max(2, ctx.num('fromBase')));
      const to = Math.min(36, Math.max(2, ctx.num('toBase')));
      const raw = ctx.get('number').trim().toLowerCase();
      if (!raw) {
        ctx.set('result', '');
        return;
      }
      const value = Number.parseInt(raw, from);
      if (!Number.isFinite(value)) throw new Error(`不是合法的 ${from} 进制数`);
      ctx.set('result', value.toString(to).toUpperCase());
    },
  },

  'list-converter': {
    fields: [area('list', '列表（每行一项）', 'banana\nApple\ncherry\napple', 6), text('prefix', '前缀'), text('suffix', '后缀'), num('truncate', '截断长度（0 不截断）', 0), sel('operation', '操作', ['不处理', '排序', '反向', '转小写', '转大写', '去重', '去重并排序'])],
    outputs: [out('result', '结果', 140)],
    run: (ctx) => {
      let items = lines(ctx.get('list'));
      if (items.length === 1 && items[0] === '') items = [];
      const op = ctx.get('operation');
      if (op === '排序') items = items.slice().sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
      if (op === '反向') items = items.slice().reverse();
      if (op === '转小写') items = items.map((s) => s.toLowerCase());
      if (op === '转大写') items = items.map((s) => s.toUpperCase());
      if (op === '去重') items = [...new Set(items)];
      if (op === '去重并排序') items = [...new Set(items)].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
      const truncate = Math.max(0, ctx.num('truncate'));
      const prefix = ctx.get('prefix');
      const suffix = ctx.get('suffix');
      ctx.set(
        'result',
        items
          .map((s) => {
            const body = truncate > 0 && s.length > truncate ? s.slice(0, truncate) + '…' : s;
            return prefix + body + suffix;
          })
          .join('\n'),
      );
    },
  },

  'text-to-binary': {
    fields: [area('text', '输入', 'CodeWF', 5), sel('mode', '模式', ['文本 → ASCII 二进制', 'ASCII 二进制 → 文本'])],
    outputs: [out('result', '结果', 120)],
    run: (ctx) => {
      const input = ctx.get('text');
      if (ctx.get('mode') === '文本 → ASCII 二进制') {
        ctx.set('result', [...new TextEncoder().encode(input)].map((b) => b.toString(2).padStart(8, '0')).join(' '));
      } else {
        const bits = input.replace(/[^01]/g, (c) => (/\s/.test(c) ? ' ' : ''));
        const bytes = bits
          .split(/\s+/)
          .filter(Boolean)
          .map((b) => Number.parseInt(b, 2));
        if (bytes.some((b) => !Number.isFinite(b) || b > 255)) throw new Error('二进制内容不合法（每段应为 8 位）');
        ctx.set('result', new TextDecoder().decode(Uint8Array.from(bytes)));
      }
    },
  },

  'text-to-unicode': {
    fields: [area('text', '输入', '码坊', 5), sel('mode', '模式', ['文本 → Unicode 转义', 'Unicode 转义 → 文本']), sel('style', '转义风格', ['\\uXXXX', 'U+XXXX'])],
    outputs: [out('result', '结果', 120)],
    run: (ctx) => {
      const input = ctx.get('text');
      if (ctx.get('mode') === '文本 → Unicode 转义') {
        const parts = [...input].map((ch) => {
          const cp = ch.codePointAt(0)!;
          if (ctx.get('style') === 'U+XXXX') return 'U+' + cp.toString(16).toUpperCase().padStart(4, '0');
          if (cp > 0xffff) {
            const v = cp - 0x10000;
            const hi = 0xd800 + (v >> 10);
            const lo = 0xdc00 + (v & 0x3ff);
            return '\\u' + hi.toString(16).padStart(4, '0') + '\\u' + lo.toString(16).padStart(4, '0');
          }
          return '\\u' + cp.toString(16).padStart(4, '0');
        });
        ctx.set('result', parts.join(''));
      } else {
        ctx.set(
          'result',
          input
            .replace(/U\+([0-9A-Fa-f]{4,6})/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
            .replace(/\\u([0-9A-Fa-f]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))),
        );
      }
    },
  },

  'text-to-nato-alphabet': {
    fields: [area('text', '文本', 'CodeWF', 5)],
    outputs: [out('result', 'NATO 音标', 120)],
    run: (ctx) => {
      const map: Record<string, string> = {
        a: 'Alfa', b: 'Bravo', c: 'Charlie', d: 'Delta', e: 'Echo', f: 'Foxtrot', g: 'Golf', h: 'Hotel', i: 'India', j: 'Juliett',
        k: 'Kilo', l: 'Lima', m: 'Mike', n: 'November', o: 'Oscar', p: 'Papa', q: 'Quebec', r: 'Romeo', s: 'Sierra', t: 'Tango',
        u: 'Uniform', v: 'Victor', w: 'Whiskey', x: 'Xray', y: 'Yankee', z: 'Zulu',
      };
      ctx.set(
        'result',
        [...ctx.get('text')]
          .map((ch) => {
            const lower = ch.toLowerCase();
            if (map[lower]) return map[lower];
            if (/\s/.test(ch)) return '␣';
            return ch;
          })
          .join(' '),
      );
    },
  },

  'url-encoder': {
    fields: [area('text', '内容', 'https://tools.codewf.com/搜索?q=码坊 工具箱', 5), sel('mode', '模式', ['encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI'])],
    outputs: [out('result', '结果', 120)],
    run: (ctx) => {
      const input = ctx.get('text');
      const mode = ctx.get('mode');
      try {
        switch (mode) {
          case 'encodeURIComponent':
            ctx.set('result', encodeURIComponent(input));
            break;
          case 'decodeURIComponent':
            ctx.set('result', decodeURIComponent(input));
            break;
          case 'encodeURI':
            ctx.set('result', encodeURI(input));
            break;
          default:
            ctx.set('result', decodeURI(input));
        }
      } catch {
        throw new Error(`${mode} 失败：内容不是合法的编码结果`);
      }
    },
  },

  'html-entities': {
    fields: [area('text', '内容', '<a href="/tools">工具箱 & 更多</a>', 5), sel('mode', '模式', ['转义（Escape）', '反转义（Unescape）'])],
    outputs: [out('result', '结果', 120)],
    run: (ctx) => {
      const input = ctx.get('text');
      ctx.set('result', ctx.get('mode').startsWith('转义') ? escapeHTML(input) : unescapeHTML(input));
    },
  },

  'json-viewer': {
    fields: [area('json', 'JSON', '{"name":"码坊工具箱","tools":91,"tags":["online","free"]}', 8), num('indent', '缩进空格', 2)],
    outputs: [out('result', '格式化结果', 200)],
    run: (ctx) => {
      const raw = ctx.get('json').trim();
      if (!raw) {
        ctx.set('result', '');
        return;
      }
      ctx.set('result', JSON.stringify(parseJSON(raw), null, Math.max(0, Math.min(10, ctx.num('indent')))));
    },
  },

  'json-minify': {
    fields: [area('json', 'JSON', '{\n  "a": 1,\n  "b": [1, 2, 3]\n}', 8)],
    outputs: [out('result', '压缩结果', 140)],
    run: (ctx) => {
      const raw = ctx.get('json').trim();
      if (!raw) {
        ctx.set('result', '');
        return;
      }
      const minified = JSON.stringify(parseJSON(raw));
      const before = new TextEncoder().encode(raw).length;
      const after = new TextEncoder().encode(minified).length;
      ctx.set('result', `${minified}\n\n/* ${before} → ${after} 字节（省 ${before ? Math.round((1 - after / before) * 100) : 0}%） */`);
    },
  },

  'json-to-csv': {
    fields: [area('json', 'JSON（对象数组或对象）', '[{"name":"码坊","type":"tools"},{"name":"文档站","type":"docs"}]', 8), sel('delimiter', '分隔符', [',', ';', '\\t'])],
    outputs: [out('result', 'CSV', 160)],
    run: (ctx) => {
      const raw = ctx.get('json').trim();
      if (!raw) {
        ctx.set('result', '');
        return;
      }
      let value = parseJSON(raw);
      if (!Array.isArray(value)) value = [value];
      if (!value.length || typeof value[0] !== 'object') throw new Error('JSON 需要是对象或对象数组');
      const keys = [...new Set(value.flatMap((row: Record<string, unknown>) => Object.keys(row ?? {})))];
      const sep = ctx.get('delimiter') === '\\t' ? '\t' : ctx.get('delimiter');
      const cell = (v: unknown) => {
        const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
        return /[",\n\r]|\s/.test(s) && sep === ',' ? `"${s.replace(/"/g, '""')}"` : s;
      };
      ctx.set('result', [keys.join(sep), ...value.map((row: Record<string, unknown>) => keys.map((k) => cell(row?.[k])).join(sep))].join('\n'));
    },
  },

  'text-statistics': {
    fields: [area('text', '文本', '码坊工具箱：浏览器里的开发者小工具。\n所有计算都在本地完成，不上传数据。', 8)],
    outputs: [out('result', '统计结果', 140)],
    run: (ctx) => {
      const text = ctx.get('text');
      const chars = [...text].length;
      const charsNoSpace = [...text.replace(/\s/g, '')].length;
      const bytes = new TextEncoder().encode(text).length;
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const cjk = (text.match(/[\u4e00-\u9fa5]/g) ?? []).length;
      const lineCount = text === '' ? 0 : lines(text).length;
      const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length;
      const sentences = text.split(/[。！？!?.\n]+/).filter((s) => s.trim()).length;
      ctx.set(
        'result',
        [
          `字符数（含空格）   ${chars}`,
          `字符数（不含空白） ${charsNoSpace}`,
          `中文字符           ${cjk}`,
          `UTF-8 字节数       ${bytes}`,
          `词数（空白分词）   ${words}`,
          `行数               ${lineCount}`,
          `段落数             ${paragraphs}`,
          `句子数             ${sentences}`,
          `预计阅读时长       约 ${Math.max(1, Math.round((cjk + words * 1.5) / 300))} 分钟`,
        ].join('\n'),
      );
    },
  },

  'string-obfuscator': {
    fields: [area('text', '原始内容', 'ghp_1234567890abcdefghijklmnopqrstuv', 4), num('keepStart', '保留开头字符数', 4), num('keepEnd', '保留结尾字符数', 4), text('mask', '掩码字符', '*')],
    outputs: [out('result', '脱敏结果', 80)],
    run: (ctx) => {
      const input = ctx.get('text');
      const keepStart = Math.max(0, ctx.num('keepStart'));
      const keepEnd = Math.max(0, ctx.num('keepEnd'));
      const mask = (ctx.get('mask') || '*').charAt(0);
      if (input.length <= keepStart + keepEnd) {
        ctx.set('result', input);
        return;
      }
      ctx.set('result', input.slice(0, keepStart) + mask.repeat(input.length - keepStart - keepEnd) + input.slice(input.length - keepEnd));
    },
  },

  'numeronym-generator': {
    fields: [area('words', '单词（每行一个）', 'internationalization\naccessibility\nKubernetes', 5)],
    outputs: [out('result', '数字缩写', 100)],
    run: (ctx) => {
      ctx.set(
        'result',
        lines(ctx.get('words'))
          .map((w) => w.trim())
          .filter(Boolean)
          .map((word) => (word.length <= 3 ? word : `${word[0]}${word.length - 2}${word[word.length - 1]}`))
          .join('\n'),
      );
    },
  },

  'password-strength-analyser': {
    fields: [text('password', '密码', 'CodeWF-tools-2026!'), num('guesses', '每秒猜测次数（离线）', 1e10)],
    outputs: [out('result', '强度评估', 160)],
    run: (ctx) => {
      const pwd = ctx.get('password');
      if (!pwd) {
        ctx.set('result', '请输入密码');
        return;
      }
      let pool = 0;
      if (/[a-z]/.test(pwd)) pool += 26;
      if (/[A-Z]/.test(pwd)) pool += 26;
      if (/[0-9]/.test(pwd)) pool += 10;
      if (/[^A-Za-z0-9]/.test(pwd)) pool += 33;
      const entropy = pwd.length * Math.log2(pool || 1);
      const perSecond = Math.max(1, ctx.num('guesses'));
      const seconds = Math.pow(2, entropy) / perSecond / 2;
      const human =
        seconds < 1 ? '不到 1 秒' : seconds < 3600 ? `${Math.round(seconds)} 秒` : seconds < 86400 ? `${Math.round(seconds / 3600)} 小时` : seconds < 3.15e7 ? `${Math.round(seconds / 86400)} 天` : seconds < 3.15e12 ? `${(seconds / 3.15e7).toFixed(1)} 年` : '远超宇宙年龄';
      const score = entropy < 28 ? '很弱' : entropy < 40 ? '较弱' : entropy < 60 ? '一般' : entropy < 80 ? '较强' : '很强';
      ctx.set(
        'result',
        [
          `长度              ${pwd.length}`,
          `字符集大小        ${pool}`,
          `信息熵            ${entropy.toFixed(1)} bit`,
          `强度评级          ${score}`,
          `离线猜测速度      ${perSecond.toExponential(0)} 次/秒`,
          `暴力破解时间      约 ${human}`,
          '',
          '说明：熵值按“随机密码”估算，字典词/规律组合的实际强度会更低。',
        ].join('\n'),
      );
    },
  },

  'hash-text': {
    fields: [area('text', '文本', '码坊工具箱', 6), check('upper', '大写输出')],
    outputs: [out('result1', 'MD5', 50), out('result2', 'SHA-1', 50), out('result3', 'SHA-256', 50), out('result4', 'SHA-384', 50), out('result5', 'SHA-512', 50)],
    run: async (ctx) => {
      const input = ctx.get('text');
      const fmt = (s: string) => (ctx.bool('upper') ? s.toUpperCase() : s);
      ctx.set('result1', input ? fmt(md5Hex(input)) : '');
      ctx.set('result2', input ? fmt(sha1Hex(input)) : '');
      ctx.set('result3', input ? fmt(await digest('SHA-256', input)) : '');
      ctx.set('result4', input ? fmt(await digest('SHA-384', input)) : '');
      ctx.set('result5', input ? fmt(await digest('SHA-512', input)) : '');
    },
  },

  'percentage-calculator': {
    fields: [num('a', '数值 A', 25), num('b', '数值 B', 200)],
    outputs: [out('result', '计算结果', 160)],
    run: (ctx) => {
      const a = ctx.num('a');
      const b = ctx.num('b');
      const pct = (x: number) => (Math.round(x * 10000) / 100).toString();
      ctx.set(
        'result',
        [
          `A 是 B 的            ${b === 0 ? '—' : pct((a / b) * 100) + ' %'}`,
          `A 占 B 的比例        ${b === 0 ? '—' : pct((a / b) * 100) + ' %'}`,
          `A 相对于 B 的变化    ${b === 0 ? '—' : pct(((a - b) / b) * 100) + ' %'}`,
          `B 的 A%              ${pct((b * a) / 100)}`,
          `A 增加 10%           ${pct(a * 1.1)}`,
          `A 减少 10%           ${pct(a * 0.9)}`,
          `A × B                ${pct(a * b)}`,
        ].join('\n'),
      );
    },
  },

  'math-evaluator': {
    fields: [text('expr', '表达式', 'sqrt(2) * pow(10, 3) + abs(-4)', '支持 Math.* 函数、^ 表示幂、pi / e 常量'), area('vars', '变量（每行 name=值）', 'a=3\nb=4', 3)],
    outputs: [out('result', '结果', 60)],
    run: (ctx) => {
      const expr = ctx.get('expr').trim();
      if (!expr) {
        ctx.set('result', '');
        return;
      }
      if (/[^0-9A-Za-z_+\-*/%^().,\s]/.test(expr)) throw new Error('表达式含有不支持的字符');
      const vars: Record<string, number> = {};
      for (const line of lines(ctx.get('vars'))) {
        const m = /^\s*([A-Za-z_]\w*)\s*=\s*(-?[\d.]+)\s*$/.exec(line);
        if (m) vars[m[1]] = Number.parseFloat(m[2]);
      }
      const names = Object.keys(vars);
      const scope = { ...vars, pi: Math.PI, e: Math.E, sqrt: Math.sqrt, pow: Math.pow, abs: Math.abs, log: Math.log, log10: Math.log10, exp: Math.exp, sin: Math.sin, cos: Math.cos, tan: Math.tan, round: Math.round, floor: Math.floor, ceil: Math.ceil, min: Math.min, max: Math.max, Math };
      const body = `const {${Object.keys(scope).join(',')}} = S; return (${expr.replace(/\^/g, '**')});`;
      let value: unknown;
      try {
        value = new Function('S', body)(scope);
      } catch (e) {
        throw new Error(`表达式无法计算：${e instanceof Error ? e.message : String(e)}`);
      }
      if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('结果不是有限数值');
      ctx.set('result', `${value}\n\n/* ${expr}${names.length ? '  (变量 ' + names.map((n) => `${n}=${vars[n]}`).join(', ') + ')' : ''} */`);
    },
  },

  'random-port-generator': {
    fields: [num('count', '数量', 5), num('min', '最小端口', 1024), num('max', '最大端口', 65535)],
    outputs: [out('result', '随机端口', 120)],
    run: (ctx) => {
      const min = Math.max(1, Math.min(65535, ctx.num('min')));
      const max = Math.max(min, Math.min(65535, ctx.num('max')));
      const count = Math.max(1, Math.min(200, ctx.num('count') || 1));
      const buf = new Uint32Array(count);
      crypto.getRandomValues(buf);
      const range = max - min + 1;
      ctx.set('result', [...buf].map((n) => min + (n % range)).join('\n'));
    },
  },

  'email-normalizer': {
    fields: [area('emails', '邮箱列表', 'First.Last+tag@Gmail.com\nuser@Example.COM', 6)],
    outputs: [out('result', '规范化结果', 120)],
    run: (ctx) => {
      ctx.set(
        'result',
        lines(ctx.get('emails'))
          .map((e) => e.trim())
          .filter(Boolean)
          .map((email) => {
            const [local, domain = ''] = email.split('@');
            let l = local.toLowerCase();
            const d = domain.toLowerCase();
            const notes: string[] = [];
            if (d === 'gmail.com' || d === 'googlemail.com') {
              const before = l;
              l = l.split('+')[0].replace(/\./g, '');
              if (before !== l) notes.push('Gmail：去点号与 +标签');
            }
            return `${l}@${d}${notes.length ? '   // ' + notes.join('；') : ''}`;
          })
          .join('\n'),
      );
    },
  },

  'chmod-calculator': {
    fields: [
      check('ur', '所有者 读 (4)', true), check('uw', '所有者 写 (2)', true), check('ux', '所有者 执行 (1)', true),
      check('gr', '同组 读 (4)', true), check('gw', '同组 写 (2)'), check('gx', '同组 执行 (1)', true),
      check('or', '其他 读 (4)', true), check('ow', '其他 写 (2)'), check('ox', '其他 执行 (1)', true),
      text('target', '目标', 'file.txt'),
    ],
    outputs: [out('result', '结果', 120)],
    run: (ctx) => {
      const bits = (r: string, w: string, x: string) => (ctx.bool(r) ? 4 : 0) + (ctx.bool(w) ? 2 : 0) + (ctx.bool(x) ? 1 : 0);
      const [u, g, o] = [bits('ur', 'uw', 'ux'), bits('gr', 'gw', 'gx'), bits('or', 'ow', 'ox')];
      const symbolic = [
        [ctx.bool('ur'), ctx.bool('uw'), ctx.bool('ux')],
        [ctx.bool('gr'), ctx.bool('gw'), ctx.bool('gx')],
        [ctx.bool('or'), ctx.bool('ow'), ctx.bool('ox')],
      ]
        .map(([r, w, x]) => `${r ? 'r' : '-'}${w ? 'w' : '-'}${x ? 'x' : '-'}`)
        .join('');
      ctx.set(
        'result',
        [
          `八进制      ${u}${g}${o}`,
          `符号形式    ${symbolic}`,
          `命令        chmod ${u}${g}${o} ${ctx.get('target') || 'file.txt'}`,
          `递归        chmod -R ${u}${g}${o} ${ctx.get('target') || 'dir'}`,
        ].join('\n'),
      );
    },
  },

  'git-memo': {
    fields: [sel('topic', '主题', ['提交与修改', '分支', '撤销与回退', '暂存 stash', '变基与合并', '远程与标签', '查看历史'])],
    outputs: [out('result', '速查表', 300)],
    run: (ctx) => {
      const memo: Record<string, string[]> = {
        '提交与修改': ['git status -sb                      # 简洁状态', 'git add -p                          # 交互式挑选改动', 'git commit -m "feat: xxx"           # 提交', 'git commit --amend --no-edit        # 并入上一次提交', 'git commit --amend -m "new message" # 改提交信息'],
        '分支': ['git switch -c feat/tools            # 新建并切换分支', 'git switch main                     # 切换分支', 'git branch -vv                      # 分支与上游', 'git branch -d feat/tools            # 删除已合并分支', 'git branch -m old new               # 重命名分支'],
        '撤销与回退': ['git restore file.txt                # 丢弃工作区改动', 'git restore --staged file.txt       # 取消暂存', 'git reset --soft HEAD~1             # 撤销提交保留改动', 'git revert <sha>                    # 生成反向提交', 'git reflog                          # 找回丢失的提交'],
        '暂存 stash': ['git stash push -m "wip"             # 暂存当前改动', 'git stash list                      # 列出暂存', 'git stash pop                       # 恢复并删除', 'git stash apply stash@{1}           # 恢复指定暂存', 'git stash drop stash@{0}            # 删除暂存'],
        '变基与合并': ['git rebase main                     # 变基到 main', 'git rebase -i HEAD~3                 # 交互式整理提交', 'git merge --no-ff feat/x            # 保留合并节点', 'git rebase --continue               # 冲突解决后继续', 'git cherry-pick <sha>               # 摘取单个提交'],
        '远程与标签': ['git remote -v                       # 远程地址', 'git fetch --prune                   # 清理失效远端分支', 'git push -u origin main             # 首次推送并跟踪', 'git tag -a v1.0.0 -m "release"      # 附注标签', 'git push --tags                     # 推送标签'],
        '查看历史': ['git log --oneline --graph --all      # 图形化历史', 'git log -p -- file.txt              # 文件历史与差异', 'git blame -L 10,20 file.txt         # 逐行归属', 'git diff main...HEAD                # 与主分支的差异', 'git shortlog -sn                     # 提交数排行'],
      };
      ctx.set('result', (memo[ctx.get('topic')] ?? []).join('\n'));
    },
  },

  'regex-memo': {
    fields: [sel('topic', '主题', ['基础元字符', '字符类', '量词', '分组与引用', '断言', '常用模式'])],
    outputs: [out('result', '速查表', 300)],
    run: (ctx) => {
      const memo: Record<string, string[]> = {
        '基础元字符': ['.            任意字符（不含换行）', '\\d \\D       数字 / 非数字', '\\w \\W       字母数字下划线 / 其反', '\\s \\S       空白 / 非空白', '^  $         行首 / 行尾', '\\b \\B       词边界 / 非词边界'],
        '字符类': ['[abc]        集合内任一字符', '[^abc]       排除集合', '[a-z]        范围', '[\\u4e00-\\u9fa5]  常用汉字范围', '[[:alpha:]]  POSIX 类（部分引擎）', '[a-z&&[^aeiou]]  交集（Java 等）'],
        '量词': ['*            0 次或多次（贪婪）', '+            1 次或多次（贪婪）', '?            0 或 1 次（贪婪）', '*? +? ??     懒惰匹配', '{2,5}        2 到 5 次', '{3,}         至少 3 次'],
        '分组与引用': ['(abc)        捕获分组', '(?:abc)      非捕获分组', '(?<name>abc) 具名分组', '\\1            反向引用第 1 组', '(?=abc)      先行断言', '(?!abc)      否定先行断言'],
        '断言': ['(?=abc)      后面是 abc', '(?!abc)      后面不是 abc', '(?<=abc)     前面是 abc', '(?<!abc)     前面不是 abc', '\\b           词边界', '(?m)^…$      多行模式锚点'],
        '常用模式': [
          '邮箱      ^[\\w.+-]+@[\\w-]+\\.[\\w.]+$',
          'URL       ^https?://[\\w.-]+(?::\\d+)?(?:/[^\\s]*)?$',
          'IPv4      ^(?:\\d{1,3}\\.){3}\\d{1,3}$',
          '手机号    ^1[3-9]\\d{9}$',
          '日期      ^\\d{4}-\\d{2}-\\d{2}$',
          '强密码    ^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*\\W).{8,}$',
          '中文字符  [\\u4e00-\\u9fa5]+',
          '重复行    ^(.*)$[\\r\\n]+\\1',
        ],
      };
      ctx.set('result', (memo[ctx.get('topic')] ?? []).join('\n'));
    },
  },

  'date-converter': {
    fields: [
      text('date', '日期 / 时间戳', '', '留空表示当前时间'),
      sel('format', '输入格式', ['自动识别', 'ISO 8601', 'Unix 秒', 'Unix 毫秒', 'RFC 1123', 'Excel 序列号'], '自动识别'),
      sel('weekday', '星期显示', ['中文（周一）', '英文（Monday）']),
    ],
    outputs: [out('result', '转换结果', 260)],
    run: (ctx) => {
      const raw = ctx.get('date').trim();
      let ms: number;
      const format = ctx.get('format');
      if (!raw) {
        ms = Date.now();
      } else if (format === '自动识别') {
        if (/^\d{11,}$/.test(raw)) ms = Number(raw);
        else if (/^\d{10}$/.test(raw)) ms = Number(raw) * 1000;
        else if (/^\d+(\.\d+)?$/.test(raw) && Number(raw) < 60000) ms = Math.round((Number(raw) - 25569) * 86400000);
        else ms = Date.parse(raw.replace(' ', 'T'));
      } else if (format === 'Unix 秒') ms = Number(raw) * 1000;
      else if (format === 'Unix 毫秒') ms = Number(raw);
      else if (format === 'Excel 序列号') ms = Math.round((Number(raw) - 25569) * 86400000);
      else ms = Date.parse(raw);
      if (!Number.isFinite(ms)) throw new Error('无法识别的时间，请检查输入格式');
      const d = new Date(ms);
      const pad = (n: number) => String(n).padStart(2, '0');
      const zh = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const en = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      ctx.set(
        'result',
        [
          `本地时间      ${local}  ${ctx.get('weekday').startsWith('中文') ? zh[d.getDay()] : en[d.getDay()]}`,
          `ISO 8601      ${d.toISOString()}`,
          `UTC           ${d.toUTCString()}`,
          `RFC 1123      ${d.toUTCString()}`,
          `Unix 秒       ${Math.floor(ms / 1000)}`,
          `Unix 毫秒     ${ms}`,
          `Excel 序列号  ${(ms / 86400000 + 25569).toFixed(6)}`,
          `相对现在      ${ms > Date.now() ? '+' : '-'}${Math.abs(Math.round((ms - Date.now()) / 86400000))} 天`,
          `Mongo ObjectId(前 4 字节)  ${Math.floor(ms / 1000).toString(16)}0000000000000000`,
        ].join('\n'),
      );
    },
  },

  'markdown-to-html': {
    fields: [
      area('markdown', 'Markdown', '# 码坊工具箱\n\n支持 **加粗**、*斜体*、`行内代码`、[链接](https://tools.codewf.com)。\n\n- 纯前端\n- 不上传数据\n\n```js\nconsole.log("hello");\n```', 10),
    ],
    outputs: [out('result', 'HTML', 200)],
    run: (ctx) => {
      const md = ctx.get('markdown');
      if (!md.trim()) {
        ctx.set('result', '');
        return;
      }
      const codeBlocks: string[] = [];
      let html = escapeHTML(md)
        .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang: string, code: string) => {
          codeBlocks.push(`<pre class="md-pre"><code data-lang="${lang}">${code}</code></pre>`);
          return `\u0000${codeBlocks.length - 1}\u0000`;
        })
        .replace(/^###### (.*)$/gm, '<h6>$1</h6>')
        .replace(/^##### (.*)$/gm, '<h5>$1</h5>')
        .replace(/^#### (.*)$/gm, '<h4>$1</h4>')
        .replace(/^### (.*)$/gm, '<h3>$1</h3>')
        .replace(/^## (.*)$/gm, '<h2>$1</h2>')
        .replace(/^# (.*)$/gm, '<h1>$1</h1>')
        .replace(/^\s*&gt; (.*)$/gm, '<blockquote>$1</blockquote>')
        .replace(/^\s*---\s*$/gm, '<hr>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
        .replace(/^(\s*)[-*+] (.*)$/gm, '$1<li>$2</li>')
        .replace(/(<li>[\s\S]*?<\/li>)(?![\s\S]*?<li>)/g, '<ul>$1</ul>')
        .replace(/\u0000(\d+)\u0000/g, (_, i: string) => codeBlocks[Number(i)]);
      html = html
        .split(/\n{2,}/)
        .map((block) => (/^\s*<(h\d|ul|pre|blockquote|hr)/.test(block) ? block : block.trim() ? `<p>${block.replace(/\n/g, '<br>')}</p>` : ''))
        .filter(Boolean)
        .join('\n');
      ctx.set('result', html.replace(/<p><ul>/g, '<ul>').replace(/<\/ul><\/p>/g, '</ul>'));
    },
  },
};
