import data from '../data/tools.json';

export interface Category {
  slug: string;
  name: string;
  en: string;
  icon: string;
  color: string;
  memo: string;
}

export interface Tool {
  slug: string;
  cat: string;
  name: string;
  memo: string;
}

export const CATEGORIES = data.categories as Category[];
export const TOOLS = data.tools as Tool[];
export const HOT = data.hot as string[];

export const CATEGORY_MAP: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c]),
);
export const TOOL_MAP: Record<string, Tool> = Object.fromEntries(TOOLS.map((t) => [t.slug, t]));

export const toolsOfCategory = (slug: string): Tool[] => TOOLS.filter((t) => t.cat === slug);
export const categoryOf = (tool: Tool): Category =>
  CATEGORY_MAP[tool.cat] ?? { slug: 'other', name: '未分类', en: 'Other', icon: '🧰', color: '#512bd4', memo: '' };

export const TOTAL_TOOLS = TOOLS.length;
export const TOTAL_CATEGORIES = CATEGORIES.length;

const tokenize = (q: string) => String(q ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean);

const haystack = (t: Tool) => {
  const c = categoryOf(t);
  return `${t.name} ${t.memo} ${t.slug} ${c.name} ${c.en}`.toLowerCase();
};

/** 关键词匹配：全部词命中（工具名 / 描述 / slug / 分类） */
export const matchTool = (tool: Tool, q: string) => {
  const tokens = tokenize(q);
  if (!tokens.length) return false;
  const hay = haystack(tool);
  return tokens.every((tok) => hay.includes(tok));
};

export const searchTools = (q: string): Tool[] => (tokenize(q).length ? TOOLS.filter((t) => matchTool(t, q)) : []);
