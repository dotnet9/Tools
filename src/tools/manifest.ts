/**
 * 实现清单（同构，页面与客户端都可读；不引入任何 DOM 代码）
 * 每新增一个工具实现，把 slug 加到 LIVE_TOOLS，并在 registry.ts 注册。
 */

/** 已是浏览器内真实实现的工具（slug） */
export const LIVE_TOOLS: string[] = [
  // 转换器
  'date-converter', 'base-converter', 'roman-numeral-converter', 'base64-string-converter',
  'color-converter', 'case-converter', 'text-to-nato-alphabet', 'text-to-binary', 'text-to-unicode',
  'list-converter', 'markdown-to-html', 'timestamp', 'slugify-string',
  // 加密与安全
  'token-generator', 'hash-text', 'uuid-generator', 'ulid-generator', 'password-strength-analyser',
  // 网页工具
  'url-encoder', 'html-entities',
  // 图像与视频
  'icon-converter',
  // 开发工具
  'chmod-calculator', 'json-viewer', 'json-minify', 'json-to-csv', 'email-normalizer',
  'regex-memo', 'git-memo', 'random-port-generator',
  // 数学工具
  'math-evaluator', 'percentage-calculator',
  // 计量工具
  'temperature-converter',
  // 文本工具
  'text-statistics', 'string-obfuscator', 'numeronym-generator',
];

/** 使用自定义界面（非规格表单）的工具 */
export const CUSTOM_TOOLS: string[] = ['icon-converter', 'timestamp'];

/** 本站暂无实现、仍待迁移到浏览器的工具（对应原型里的「待迁移」，如挪车码：需服务端生成二维码） */
export const PENDING_TOOLS: string[] = ['nuoche'];

const live = new Set(LIVE_TOOLS);
const custom = new Set(CUSTOM_TOOLS);
const pending = new Set(PENDING_TOOLS);

export const isLive = (slug: string): boolean => live.has(slug);
export const isCustom = (slug: string): boolean => custom.has(slug);
export const isPending = (slug: string): boolean => pending.has(slug);

export type ToolState = 'live' | 'pending' | 'todo';

export const toolState = (slug: string): ToolState => (isLive(slug) ? 'live' : isPending(slug) ? 'pending' : 'todo');

export const STATE_LABEL: Record<ToolState, string> = {
  live: '可用',
  pending: '待迁移',
  todo: '开发中',
};

export const liveCount = (): number => LIVE_TOOLS.length;
export const todoCount = (total: number): number => total - LIVE_TOOLS.length - PENDING_TOOLS.length;
