/**
 * 客户端工具注册表：slug → ToolSpec
 * 仅在浏览器执行（runtime.mountTools 使用），Astro 页面通过 manifest.ts 判断是否已实现。
 */
import type { ToolSpec } from './types';
import { basicsRegistry } from './impl/basics';
import { iconConverter } from './impl/iconConverter';
import { timestamp, slugifyString } from './impl/misc';

export const registry: Record<string, ToolSpec> = {
  ...basicsRegistry,
  'slugify-string': slugifyString,
  'icon-converter': iconConverter,
  timestamp,
};
