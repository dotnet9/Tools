/** 时间戳转换器（带实时刷新）与 URL Slug 生成器 */
import type { ToolSpec } from '../types';
import { toast } from '../ui';

const pad = (n: number) => String(n).padStart(2, '0');
const localDateTime = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

export const timestamp: ToolSpec = {
  fields: [],
  outputs: [],
  note: '所有转换都在本机完成；「当前时间戳」按秒显示，可开启自动刷新。',
  custom: (root) => {
    root.innerHTML = `
      <div class="ts-grid">
        <div class="ic-col">
          <h4><span class="n">1</span>当前时间</h4>
          <div class="now-row"><b data-now>—</b><span>秒</span></div>
          <div class="mini-acts">
            <button data-start>开始刷新</button><button data-stop>停止刷新</button><button data-tick>刷新一次</button>
          </div>
          <div class="hint" data-now-more></div>
        </div>
        <div class="ic-col">
          <h4><span class="n">2</span>时间戳 → 日期时间</h4>
          <input type="text" data-ts placeholder="例如 1735689600" value="">
          <div class="radio-row" style="margin-top:10px">
            <label class="on"><input type="radio" name="tsunit" value="s" checked>秒</label>
            <label><input type="radio" name="tsunit" value="ms">毫秒</label>
          </div>
          <div class="mini-acts" style="margin-top:10px"><button data-fill-now>填入当前</button><button data-copy-ts>复制结果</button></div>
          <pre class="out" data-out-ts style="min-height:120px;margin-top:10px"></pre>
        </div>
        <div class="ic-col">
          <h4><span class="n">3</span>日期时间 → 时间戳</h4>
          <input type="datetime-local" data-dt step="1">
          <div class="radio-row" style="margin-top:10px">
            <label class="on"><input type="radio" name="dtunit" value="s" checked>秒</label>
            <label><input type="radio" name="dtunit" value="ms">毫秒</label>
          </div>
          <div class="mini-acts" style="margin-top:10px"><button data-now-dt>用当前时间</button><button data-copy-dt>复制结果</button></div>
          <pre class="out" data-out-dt style="min-height:120px;margin-top:10px"></pre>
        </div>
      </div>
      <div class="tool-error" data-error hidden></div>`;

    const q = <T extends HTMLElement>(s: string) => root.querySelector<T>(s)!;
    let timer = 0;

    const nowMore = () => {
      const d = new Date();
      q('[data-now-more]').textContent = `毫秒 ${Date.now()} · 本地时间 ${localDateTime(d)} · ISO ${d.toISOString()}`;
    };
    const tick = () => {
      q('[data-now]').textContent = String(Math.floor(Date.now() / 1000));
      nowMore();
    };

    const convertTs = () => {
      const raw = q<HTMLInputElement>('[data-ts]').value.trim();
      const out = q('[data-out-ts]');
      const err = q('[data-error]');
      if (!raw) {
        out.textContent = '';
        err.hidden = true;
        return;
      }
      if (!/^-?\d+$/.test(raw)) {
        err.hidden = false;
        err.textContent = '时间戳应为整数（可带负号）';
        out.textContent = '';
        return;
      }
      err.hidden = true;
      const unit = (root.querySelector<HTMLInputElement>('input[name=tsunit]:checked')?.value ?? 's') as 's' | 'ms';
      const ms = unit === 's' ? Number(raw) * 1000 : Number(raw);
      const d = new Date(ms);
      if (Number.isNaN(d.getTime())) {
        err.hidden = false;
        err.textContent = '超出可表示的时间范围';
        return;
      }
      out.textContent = [
        `本地时间   ${localDateTime(d)}`,
        `ISO 8601   ${d.toISOString()}`,
        `UTC        ${d.toUTCString()}`,
        `秒         ${Math.floor(ms / 1000)}`,
        `毫秒       ${ms}`,
      ].join('\n');
    };

    const convertDt = () => {
      const value = q<HTMLInputElement>('[data-dt]').value;
      const out = q('[data-out-dt]');
      if (!value) {
        out.textContent = '';
        return;
      }
      const ms = new Date(value).getTime();
      if (Number.isNaN(ms)) {
        out.textContent = '无法解析该时间';
        return;
      }
      out.textContent = [`秒     ${Math.floor(ms / 1000)}`, `毫秒   ${ms}`, `ISO    ${new Date(ms).toISOString()}`].join('\n');
    };

    const setUnitLabels = () => {
      root.querySelectorAll<HTMLInputElement>('input[name=tsunit],input[name=dtunit]').forEach((r) =>
        r.addEventListener('change', () => {
          root
            .querySelectorAll(`input[name=${r.name}]`)
            .forEach((x) => x.closest('label')?.classList.toggle('on', (x as HTMLInputElement).checked));
          if (r.name === 'tsunit') convertTs();
          else convertDt();
        }),
      );
    };

    q<HTMLInputElement>('[data-dt]').value = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 19);
    q('[data-start]').addEventListener('click', () => {
      window.clearInterval(timer);
      tick();
      timer = window.setInterval(tick, 1000);
      toast('已开始每秒刷新');
    });
    q('[data-stop]').addEventListener('click', () => {
      window.clearInterval(timer);
      timer = 0;
      toast('已停止刷新');
    });
    q('[data-tick]').addEventListener('click', tick);
    q('[data-fill-now]').addEventListener('click', () => {
      q<HTMLInputElement>('[data-ts]').value = String(Math.floor(Date.now() / 1000));
      convertTs();
    });
    q('[data-now-dt]').addEventListener('click', () => {
      q<HTMLInputElement>('[data-dt]').value = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 19);
      convertDt();
    });
    q('[data-copy-ts]').addEventListener('click', () => void navigator.clipboard.writeText(q('[data-out-ts]').textContent ?? '').then(() => toast('已复制结果')));
    q('[data-copy-dt]').addEventListener('click', () => void navigator.clipboard.writeText(q('[data-out-dt]').textContent ?? '').then(() => toast('已复制结果')));
    q<HTMLInputElement>('[data-ts]').addEventListener('input', convertTs);
    q<HTMLInputElement>('[data-dt]').addEventListener('input', convertDt);
    setUnitLabels();

    tick();
    convertTs();
    convertDt();
  },
};

/* 常用汉字 → 拼音（覆盖开发/工具类标题常用字；生僻字会被移除并在说明中提示） */
const PINYIN: Record<string, string> = {
  码: 'ma', 坊: 'fang', 工: 'gong', 具: 'ju', 箱: 'xiang', 在: 'zai', 线: 'xian', 时: 'shi', 间: 'jian', 戳: 'chuo',
  转: 'zhuan', 换: 'huan', 器: 'qi', 图: 'tu', 片: 'pian', 标: 'biao', 生: 'sheng', 成: 'cheng', 文: 'wen', 档: 'dang',
  解: 'jie', 析: 'xi', 编: 'bian', 加: 'jia', 密: 'mi', 随: 'sui', 机: 'ji', 串: 'chuan', 数: 'shu', 字: 'zi',
  颜: 'yan', 色: 'se', 温: 'wen', 度: 'du', 列: 'lie', 表: 'biao', 统: 'tong', 计: 'ji', 正: 'zheng', 则: 'ze',
  达: 'da', 式: 'shi', 测: 'ce', 试: 'shi', 网: 'wang', 络: 'luo', 掩: 'yan', 址: 'zhi', 子: 'zi', 键: 'jian',
  盘: 'pan', 按: 'an', 设: 'she', 备: 'bei', 信: 'xin', 息: 'xi', 语: 'yu', 言: 'yan', 支: 'zhi', 付: 'fu',
  算: 'suan', 复: 'fu', 利: 'li', 百: 'bai', 分: 'fen', 比: 'bi', 占: 'zhan', 位: 'wei', 脱: 'tuo', 敏: 'min',
  差: 'cha', 异: 'yi', 较: 'jiao', 哈: 'ha', 希: 'xi', 校: 'jiao', 验: 'yan', 签: 'qian', 名: 'ming', 强: 'qiang',
  弱: 'ruo', 评: 'ping', 估: 'gu', 钥: 'yao', 对: 'dui', 称: 'cheng', 非: 'fei', 助: 'zhu', 记: 'ji', 词: 'ci',
  符: 'fu', 令: 'ling', 查: 'cha', 看: 'kan', 一: 'yi', 格: 'ge', 化: 'hua', 压: 'ya', 缩: 'suo', 合: 'he',
  并: 'bing', 离: 'li', 导: 'dao', 出: 'chu', 入: 'ru', 上: 'shang', 传: 'chuan', 下: 'xia', 载: 'zai', 折: 'zhe',
  叠: 'die', 归: 'gui', 国: 'guo', 际: 'ji', 无: 'wu', 障: 'zhang', 碍: 'ai', 安: 'an', 全: 'quan', 通: 'tong',
  用: 'yong', 开: 'kai', 发: 'fa', 者: 'zhe', 面: 'mian', 板: 'ban', 页: 'ye', 洪: 'hong', 过: 'guo', 滤: 'lv',
  中: 'zhong', 英: 'ying', 互: 'hu', 拼: 'pin', 音: 'yin', 提: 'ti', 取: 'qu', 空: 'kong', 进: 'jin', 排: 'pai',
  序: 'xu', 去: 'qu', 重: 'chong', 反: 'fan', 向: 'xiang', 大: 'da', 小: 'xiao', 写: 'xie', 前: 'qian', 后: 'hou',
  缀: 'zhui', 截: 'jie', 断: 'duan', 保: 'bao', 留: 'liu', 结: 'jie', 尾: 'wei', 长: 'chang', 量: 'liang', 个: 'ge',
  项: 'xiang', 每: 'mei', 行: 'hang', 段: 'duan', 落: 'luo', 句: 'ju', 阅: 'yue', 读: 'du', 预: 'yu', 熵: 'shang',
  值: 'zhi', 集: 'ji', 暴: 'bao', 力: 'li', 破: 'po', 秒: 'miao', 毫: 'hao', 钟: 'zhong', 天: 'tian', 年: 'nian',
  当: 'dang', 本: 'ben', 地: 'di', 北: 'bei', 京: 'jing', 海: 'hai', 深: 'shen', 圳: 'zhen', 广: 'guang', 州: 'zhou',
  杭: 'hang', 都: 'du', 源: 'yuan', 目: 'mu', 章: 'zhang', 笔: 'bi', 教: 'jiao', 程: 'cheng', 快: 'kuai', 捷: 'jie',
  启: 'qi', 动: 'dong', 桌: 'zhuo', 客: 'ke', 户: 'hu', 端: 'duan', 服: 'fu', 务: 'wu', 库: 'ku', 组: 'zu',
  件: 'jian', 框: 'kuang', 架: 'jia', 插: 'cha', 部: 'bu', 署: 'shu', 构: 'gou', 建: 'jian', 打: 'da', 包: 'bao',
  布: 'bu', 版: 'ban', 日: 'ri', 志: 'zhi', 监: 'jian', 控: 'kong', 性: 'xing', 能: 'neng', 优: 'you', 调: 'diao',
  错: 'cuo', 误: 'wu', 常: 'chang', 警: 'jing', 告: 'gao', 示: 'shi', 帮: 'bang', 说: 'shuo', 明: 'ming', 使: 'shi',
  方: 'fang', 法: 'fa', 例: 'li', 参: 'can', 考: 'kao',
};

const slugify = (input: string, opts: { lower: boolean; pinyin: boolean; sep: string; keepCase: boolean }): { slug: string; dropped: number } => {
  let dropped = 0;
  const normalized = input.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const parts: string[] = [];
  for (const ch of normalized) {
    if (/[A-Za-z0-9]/.test(ch)) {
      parts.push('|' + ch);
      continue;
    }
    if (opts.pinyin && PINYIN[ch]) {
      parts.push('|' + PINYIN[ch]);
      continue;
    }
    if (/[\u4e00-\u9fa5]/.test(ch)) {
      dropped++;
      continue;
    }
    if (/[\s\-_/.,:;!?'"()[\]{}()（）【】、，。：；！？·—－]/.test(ch)) {
      parts.push(' ');
      continue;
    }
    dropped++;
  }
  let words = parts
    .join('')
    .split(/\||\s+/)
    .map((w) => w.trim())
    .filter(Boolean);
  if (opts.lower) words = words.map((w) => w.toLowerCase());
  const slug = words.join(opts.sep).replace(new RegExp(`${opts.sep}{2,}`, 'g'), opts.sep).replace(new RegExp(`^${opts.sep}|${opts.sep}$`, 'g'), '');
  return { slug, dropped };
};

export const slugifyString: ToolSpec = {
  fields: [
    { kind: 'textarea', key: 'title', label: '标题 / 短语', value: '码坊工具箱：浏览器里的开发者小工具', rows: 3 },
    { kind: 'checkbox', key: 'pinyin', label: '中文转拼音（常用字内置映射）', checked: true },
    { kind: 'checkbox', key: 'lower', label: '转小写', checked: true },
    { kind: 'select', key: 'sep', label: '分隔符', options: ['-', '_', '.'], value: '-' },
    { kind: 'text', key: 'maxLen', label: '最大长度（0 不限制）', value: '80' },
  ],
  outputs: [
    { key: 'slug', label: 'Slug', height: 60 },
    { key: 'detail', label: '诊断信息', height: 90 },
  ],
  note: '纯本地生成，不调用任何翻译接口；中文按内置常用字拼音映射转换，未被收录的字会被移除（诊断信息里给出数量）。',
  run: (ctx) => {
    const input = ctx.get('title');
    const result = slugify(input, { lower: ctx.bool('lower'), pinyin: ctx.bool('pinyin'), sep: ctx.get('sep') || '-', keepCase: true });
    const maxLen = Math.max(0, ctx.num('maxLen'));
    let slug = result.slug;
    const truncated = maxLen > 0 && slug.length > maxLen;
    if (truncated) {
      const cut = slug.slice(0, maxLen);
      const lastSep = cut.lastIndexOf(ctx.get('sep') || '-');
      slug = lastSep > maxLen * 0.6 ? cut.slice(0, lastSep) : cut;
    }
    ctx.set('slug', slug);
    ctx.set(
      'detail',
      [
        `原始长度        ${[...input].length}`,
        `slug 长度       ${slug.length}${truncated ? '（已按最大长度截断）' : ''}`,
        `中文映射        ${ctx.bool('pinyin') ? '已开启' : '已关闭（中文会被移除）'}`,
        `被移除字符数    ${result.dropped}`,
        `URL 示例        ${ctx.get('title') ? `https://tools.codewf.com/${slug}` : '—'}`,
      ].join('\n'),
    );
  },
};
