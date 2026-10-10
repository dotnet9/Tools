/** 站点本地数据：收藏 / 最近使用 / 主题（纯浏览器存储，无后端） */
import { SITE } from '../config/site';

const KEY = {
  theme: `${SITE.storagePrefix}.theme`,
  favorites: `${SITE.storagePrefix}.favorites`,
  recent: `${SITE.storagePrefix}.recent`,
} as const;

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 隐私模式等场景下静默失败 */
  }
};

export interface RecentItem {
  slug: string;
  ts: number;
}

export const RECENT_LIMIT = 12;

export const getTheme = (): 'dark' | 'light' | null => {
  const v = localStorage.getItem(KEY.theme);
  return v === 'dark' || v === 'light' ? v : null;
};

export const setTheme = (theme: 'dark' | 'light'): void => {
  try {
    localStorage.setItem(KEY.theme, theme);
  } catch {
    /* ignore */
  }
};

export const getFavorites = (): string[] => read<string[]>(KEY.favorites, []);

export const isFavorite = (slug: string): boolean => getFavorites().includes(slug);

export function toggleFavorite(slug: string): boolean {
  const list = getFavorites();
  const i = list.indexOf(slug);
  if (i >= 0) list.splice(i, 1);
  else list.unshift(slug);
  write(KEY.favorites, list);
  return i < 0;
}

export const clearFavorites = (): void => write(KEY.favorites, []);

export const getRecents = (): RecentItem[] => read<RecentItem[]>(KEY.recent, []);

export function pushRecent(slug: string): void {
  const list = getRecents().filter((r) => r.slug !== slug);
  list.unshift({ slug, ts: Date.now() });
  write(KEY.recent, list.slice(0, RECENT_LIMIT));
}

export const clearRecents = (): void => write(KEY.recent, []);

export function resetLocalData(): void {
  clearFavorites();
  clearRecents();
  try {
    localStorage.removeItem(KEY.theme);
  } catch {
    /* ignore */
  }
}
