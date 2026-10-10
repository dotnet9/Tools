/**
 * 站点级配置（替换域名/仓库地址时只改这里）
 */
export const SITE = {
  name: '码坊工具箱',
  enName: 'Tools',
  url: 'https://tools.codewf.com',
  /** 站点定位，用于首页标题与 meta */
  tagline: '浏览器里的开发者小工具',
  description:
    '码坊工具箱 tools.codewf.com：浏览器内即刻可用的开发者在线工具，覆盖转换、编码、网络、文本等 10 大分类，所有计算在本地完成，不上传数据。',
  owner: 'CodeWF 码坊',
  repo: 'https://github.com/dotnet9/Tools',
  issues: 'https://github.com/dotnet9/Tools/issues',
  docsUrl: 'https://doc.codewf.com',
  blogUrl: 'https://codewf.com',
  /** 本地数据键前缀（收藏 / 最近使用 / 主题） */
  storagePrefix: 'codewf-tools',
} as const;
