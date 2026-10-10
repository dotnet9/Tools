# 码坊工具箱 Tools

**浏览器里的开发者小工具** —— tools.codewf.com

10 个分类、91 个工具，打开即用。全部计算在浏览器内完成：不上传数据、不需要账号、没有后端接口。

## 技术栈

- **Astro 5**（静态生成，输出为目录形式）
- 零框架客户端脚本（原生 TS，按 slug 挂载工具）
- 设计令牌与组件样式与文档站（doc.codewf.com）同源（Fluent 白 × .NET 紫 `#512bd4`，暗色紫黑系）
- 收藏 / 最近使用 / 主题全部走 `localStorage`

## 快速开始

```bash
npm install
npm run dev       # 开发：http://localhost:4321
npm run build     # 构建到 dist/
npm run preview   # 预览构建产物
```

## 目录结构

```
src/
  data/tools.json          工具清单（单一事实源：10 分类 / 91 工具）
  config/site.ts            站点配置（域名、仓库、存储键前缀）
  lib/tools.ts              清单读取与搜索
  lib/store.ts              本地存储：收藏 / 最近使用 / 主题
  styles/global.css         设计令牌与全局样式（自 design/ 原型迁移）
  layouts/BaseLayout.astro  页面骨架（主题、搜索浮层、收藏计数、快捷键）
  components/               页头 / 页脚 / 搜索浮层 / 工具卡
  pages/
    index.astro             首页（搜索优先 + 分类磁贴 + 每类预览）
    tools.astro             全部工具（分类筛选 / 分组 / 名称 / 可用优先）
    [slug].astro            工具详情（91 个静态路由，未实现则显示占位详情）
    search.astro            搜索结果（客户端筛选 + 高亮 + 空态）
    favorites.astro         我的收藏
    recent.astro            最近使用
    about.astro             关于（站点声明与实现状态）
    404.astro               错误页
  tools/
    types.ts                工具规格模型（FieldSpec / OutputSpec / ToolContext）
    manifest.ts             实现清单（可用 / 待迁移 / 开发中，页面与客户端共用）
    registry.ts             slug → ToolSpec 注册表（仅客户端）
    runtime.ts              规格驱动运行时（渲染表单、绑定输入、写输出）
    ui.ts                   toast / 复制 / 下载 / 格式化
    impl/                   工具实现（basics 规格集、iconConverter、misc）
design/index.html           单文件设计原型（评审存档，保留）
public/                     favicon、robots.txt
```

## URL 约定

| 路径 | 页面 |
|---|---|
| `/` | 首页 |
| `/tools/`、`/tools?c=converter`、`/tools?sort=status` | 全部工具 / 分类筛选 / 排序 |
| `/{slug}` | 工具详情，如 `/timestamp`、`/icon-converter`（短路径，不带 `/tool` 前缀） |
| `/search?q=jwt` | 搜索结果 |
| `/favorites/`、`/recent/`、`/about/` | 收藏 / 最近使用 / 关于 |

## 工具实现方式

页面只渲染一个容器（`<div data-tool="{slug}">`），由 `src/tools/runtime.ts` 在客户端挂载，两种形态：

1. **规格工具**（大多数）：在 `impl/basics.ts` 里写 `fields` / `outputs` / `run(ctx)`，运行时生成表单与结果块，
   输入变化即时计算（`autoRun: false` 时显示运行按钮）。该模型对齐桌面版 CodeWF.Toolbox 的 `ToolSpec` 约定，
   便于两端共用同一套字段与算法语义。
2. **自定义工具**：`custom(root)` 自行渲染 DOM 与绑定交互，适合文件、canvas、定时刷新等非表单场景
   （见 `impl/iconConverter.ts` 与 `impl/misc.ts` 的时间戳）。

新增一个工具：

1. 在 `src/tools/impl/` 写实现；
2. 在 `src/tools/registry.ts` 注册；
3. 把 slug 加进 `src/tools/manifest.ts` 的 `LIVE_TOOLS`（页面上的「可用 / 开发中」标记由此推导）。

## 实现状态（清单 91 个）

| 状态 | 数量 | 说明 |
|---|---|---|
| 可用 | 35 | 浏览器内真实实现，卡片与详情页标注「可用」 |
| 待迁移 | 1 | 挪车码：主站依赖服务端生成二维码，需重新设计纯前端方案 |
| 开发中 | 55 | 已登记清单，详情页显示占位说明与「提需求」入口 |

已实现的 35 个：时间戳、日期时间、整数进制、罗马数字、Base64 字符串、颜色格式、命名格式、文本转 NATO 音标、
文本与二进制、文本与 Unicode、列表转换、Markdown 转 HTML、URL Slug、Icon 图标转换器、随机 Token、文本哈希、
UUID、ULID、密码强度、URL 编解码、HTML 实体、Chmod、JSON 格式化、JSON 压缩、JSON 转 CSV、邮箱规范化、
正则速查、Git 速查、随机端口、数学表达式、百分比、温度、文本统计、字符串脱敏、数字缩写。

## 数据与边界

- 工具清单在 `src/data/tools.json`（自 `design/index.html` 原型内嵌清单迁入，原出处 `Assets.Dotnet9/site/tools/tools.json`）。
- 纯前端：没有 API、没有账号；除外部链接与统计脚本外不发起网络请求。
- 收藏 / 最近使用只存本机浏览器，换设备不同步。

## 待办

- [ ] 部署：GitHub Actions 构建 + 服务器 rsync，Nginx 配 `tools.codewf.com`
- [ ] 继续迁移工具到纯前端：YAML/TOML/XML 互转、二维码、JWT 解析、正则测试器等
- [ ] 主站 `CodeWF` 移除 `/tool` 路由与菜单（或重定向到本站短路径）
- [ ] `Assets.Dotnet9/site/tools/*` 与截图资源随主站改造一并清理
