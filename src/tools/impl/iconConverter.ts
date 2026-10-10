/** Icon 图标转换器：图片 → 多尺寸 .ico / PNG（全本地 canvas 处理） */
import type { ToolSpec } from '../types';
import { downloadBlob, fmtBytes, toast } from '../ui';

const ICON_SIZES = [16, 24, 32, 48, 64, 128, 256];
const COMMON = [16, 32, 48, 256];

async function buildIco(entries: { size: number; blob: Blob }[]): Promise<Blob> {
  const frames: { size: number; buf: Uint8Array }[] = [];
  for (const e of entries) frames.push({ size: e.size, buf: new Uint8Array(await e.blob.arrayBuffer()) });
  const header = new Uint8Array(6 + 16 * frames.length);
  const dv = new DataView(header.buffer);
  dv.setUint16(0, 0, true); // reserved
  dv.setUint16(2, 1, true); // type: icon
  dv.setUint16(4, frames.length, true);
  let offset = 6 + 16 * frames.length;
  frames.forEach((f, i) => {
    const p = 6 + 16 * i;
    header[p] = f.size >= 256 ? 0 : f.size; // 256 记作 0
    header[p + 1] = f.size >= 256 ? 0 : f.size;
    dv.setUint16(p + 4, 1, true); // color planes
    dv.setUint16(p + 6, 32, true); // bits per pixel
    dv.setUint32(p + 8, f.buf.length, true);
    dv.setUint32(p + 12, offset, true);
    offset += f.buf.length;
  });
  return new Blob([header, ...frames.map((f) => f.buf)], { type: 'image/x-icon' });
}

export const iconConverter: ToolSpec = {
  fields: [],
  outputs: [],
  note: '图片只在本机浏览器内处理，不会上传；生成的是标准 ICO（内嵌 PNG 帧），Windows、macOS、Linux 均可直接使用。',
  custom: (root) => {
    const state = {
      img: null as HTMLImageElement | null,
      file: null as File | null,
      sizes: new Set<number>(COMMON),
      bg: 'transparent',
      color: '#ffffff',
      out: 'ico' as 'ico' | 'png',
      results: [] as { size: number; blob: Blob; url: string }[],
      warn: '',
    };

    root.innerHTML = `
      <div class="ic-grid">
        <div class="ic-col">
          <h4><span class="n">1</span>选择图片</h4>
          <div class="drop" data-drop>
            <div class="big">🖼️</div><b>拖放图片到这里</b>
            <p>或点击选择 · PNG / JPG / WebP / GIF 首帧</p>
            <input type="file" accept="image/*" hidden data-file>
          </div>
          <div class="preview" data-preview hidden>
            <div class="thumb"><img alt="已选图片预览" data-thumb></div>
            <div class="fmeta" data-meta></div>
            <div class="mini-acts"><button data-reselect>重新选择</button><button data-remove>移除</button></div>
          </div>
          <div class="warn-line" data-warn hidden></div>
        </div>
        <div class="ic-col">
          <h4><span class="n">2</span>输出尺寸</h4>
          <div class="size-grid">${ICON_SIZES.map((n) => `<label><input type="checkbox" data-size="${n}"${COMMON.includes(n) ? ' checked' : ''}>${n}</label>`).join('')}</div>
          <div class="mini-acts"><button data-sizes="all">全选</button><button data-sizes="common">常用 ${COMMON.join('/')}</button><button data-sizes="none">全不选</button></div>
          <h4 style="margin-top:18px"><span class="n">3</span>背景与输出</h4>
          <div class="radio-row">
            <label class="on"><input type="radio" name="icbg" value="transparent" checked>透明</label>
            <label><input type="radio" name="icbg" value="white">白色</label>
            <label><input type="radio" name="icbg" value="custom">自定义</label>
          </div>
          <div class="color-row" style="margin-top:10px"><input type="color" value="#ffffff" data-color><span class="hex" data-hex>#ffffff（仅「自定义」生效）</span></div>
          <div class="radio-row" style="margin-top:14px">
            <label class="on"><input type="radio" name="icout" value="ico" checked>单个 .ico</label>
            <label><input type="radio" name="icout" value="png">PNG 尺寸包（逐个下载）</label>
          </div>
        </div>
        <div class="ic-col">
          <h4><span class="n">4</span>生成与下载</h4>
          <div class="muted" style="font-size:12.5px" data-summary></div>
          <button class="btn btn-primary" style="width:100%;margin-top:12px" data-run disabled>生成图标</button>
          <div class="warn-line" data-error hidden></div>
          <div data-out></div>
        </div>
      </div>`;

    const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
    const drop = q('[data-drop]');
    const fileInput = q<HTMLInputElement>('[data-file]');
    const preview = q('[data-preview]');
    const thumb = q<HTMLImageElement>('[data-thumb]');
    const meta = q('[data-meta]');
    const warn = q('[data-warn]');
    const errorEl = q('[data-error]');
    const summary = q('[data-summary]');
    const runBtn = q<HTMLButtonElement>('[data-run]');
    const outBox = q('[data-out]');

    const sorted = () => [...state.sizes].sort((a, b) => a - b);
    const baseName = () => (state.file?.name ?? 'icon').replace(/\.[^.]+$/, '') || 'icon';

    const refresh = () => {
      const sizes = sorted();
      const canRun = !!state.img && sizes.length > 0;
      runBtn.disabled = !canRun;
      runBtn.textContent = state.results.length ? '重新生成' : '生成图标';
      summary.textContent = !state.img
        ? '先选择一张图片，再生成图标'
        : sizes.length
          ? `已选 ${sizes.length} 个尺寸：${sizes.join(' / ')} · 输出 ${state.out === 'ico' ? '单个 .ico（多尺寸合成）' : 'PNG 尺寸包'}`
          : '未选择任何尺寸（生成按钮已禁用）';
      // 尺寸勾选状态同步
      root.querySelectorAll<HTMLInputElement>('[data-size]').forEach((cb) => {
        cb.checked = state.sizes.has(Number(cb.dataset.size));
      });
    };

    const renderOutputs = () => {
      if (!state.results.length) {
        outBox.innerHTML = '<div class="out-empty" style="margin-top:14px">生成后在这里预览各尺寸，并下载 .ico 或 PNG</div>';
        return;
      }
      outBox.innerHTML = `
        <div class="out-grid">
          ${state.results
            .map(
              (r) => `<div class="out-cell"><div class="box"><img src="${r.url}" alt="${r.size}"></div>
              <div class="nm">${r.size}×${r.size}</div>
              <button class="btn btn-ghost btn-sm" style="width:100%;margin-top:6px" data-dl="${r.size}">PNG</button></div>`,
            )
            .join('')}
        </div>
        <div class="out-foot">
          <button class="btn btn-primary btn-sm" data-download>${state.out === 'ico' ? '下载 .ico' : '下载 PNG 尺寸包'}</button>
          <button class="btn btn-ghost btn-sm" data-copy-name>复制文件名</button>
          <span class="muted" style="font-size:11.5px;font-family:var(--mono)">${state.results.length} 帧 · ${state.out === 'ico' ? '单个文件' : '逐个下载'}</span>
        </div>`;

      outBox.querySelector<HTMLElement>('[data-download]')?.addEventListener('click', async () => {
        if (state.out === 'ico') {
          const blob = await buildIco(state.results);
          downloadBlob(blob, `${baseName()}.ico`);
          toast(`已下载 ${baseName()}.ico（${state.results.length} 帧 · ${fmtBytes(blob.size)}）`);
        } else {
          state.results.forEach((r, i) => setTimeout(() => downloadBlob(r.blob, `${baseName()}-${r.size}.png`), i * 300));
          toast(`开始逐个下载 ${state.results.length} 个 PNG`);
        }
      });
      outBox.querySelector<HTMLElement>('[data-copy-name]')?.addEventListener('click', () => {
        const name = state.out === 'ico' ? `${baseName()}.ico` : `${baseName()}-{size}.png`;
        void navigator.clipboard.writeText(name).then(() => toast('已复制文件名模板'));
      });
      outBox.querySelectorAll<HTMLElement>('[data-dl]').forEach((btn) =>
        btn.addEventListener('click', () => {
          const r = state.results.find((x) => String(x.size) === btn.dataset.dl);
          if (r) {
            downloadBlob(r.blob, `${baseName()}-${r.size}.png`);
            toast(`已下载 ${r.size}×${r.size}.png`);
          }
        }),
      );
    };

    const clearResults = () => {
      state.results.forEach((r) => URL.revokeObjectURL(r.url));
      state.results = [];
    };

    const loadFile = (file: File | null | undefined) => {
      if (!file) return;
      if (!/^image\//.test(file.type)) {
        toast(`请选择图片文件（当前：${file.type || '未知类型'}）`);
        return;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        state.img = img;
        state.file = file;
        state.warn = Math.max(img.naturalWidth, img.naturalHeight) > 4000 ? `图片较大（${img.naturalWidth}×${img.naturalHeight}），生成时按目标尺寸降采样。` : '';
        clearResults();
        errorEl.hidden = true;
        preview.hidden = false;
        thumb.src = url;
        meta.textContent = `${file.name} · ${img.naturalWidth}×${img.naturalHeight} · ${fmtBytes(file.size)}`;
        warn.hidden = !state.warn;
        warn.textContent = state.warn;
        renderOutputs();
        refresh();
        toast(`已载入 ${file.name}`);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        toast('这个图片无法解码，换一张试试');
      };
      img.src = url;
    };

    const generate = async () => {
      if (!state.img || !state.sizes.size) return;
      const sizes = sorted();
      runBtn.disabled = true;
      runBtn.textContent = '生成中…';
      clearResults();
      const results: typeof state.results = [];
      for (const size of sizes) {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        if (state.bg !== 'transparent') {
          ctx.fillStyle = state.bg === 'white' ? '#ffffff' : state.color;
          ctx.fillRect(0, 0, size, size);
        }
        ctx.drawImage(state.img, 0, 0, size, size);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (blob) results.push({ size, blob, url: URL.createObjectURL(blob) });
        await new Promise((r) => setTimeout(r, 20));
      }
      state.results = results;
      renderOutputs();
      refresh();
      toast(`已生成 ${results.length} 帧`);
    };

    /* 交互绑定 */
    drop.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      loadFile(fileInput.files?.[0]);
      fileInput.value = '';
    });
    drop.addEventListener('dragover', (e) => {
      e.preventDefault();
      drop.classList.add('over');
    });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', (e) => {
      e.preventDefault();
      drop.classList.remove('over');
      loadFile(e.dataTransfer?.files?.[0]);
    });
    root.querySelector('[data-reselect]')?.addEventListener('click', () => fileInput.click());
    root.querySelector('[data-remove]')?.addEventListener('click', () => {
      state.img = null;
      state.file = null;
      state.warn = '';
      clearResults();
      preview.hidden = true;
      warn.hidden = true;
      renderOutputs();
      refresh();
    });
    root.querySelectorAll<HTMLInputElement>('[data-size]').forEach((cb) =>
      cb.addEventListener('change', () => {
        const size = Number(cb.dataset.size);
        if (cb.checked) state.sizes.add(size);
        else state.sizes.delete(size);
        refresh();
      }),
    );
    root.querySelectorAll<HTMLElement>('[data-sizes]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const mode = btn.dataset.sizes;
        state.sizes = mode === 'all' ? new Set(ICON_SIZES) : mode === 'none' ? new Set() : new Set(COMMON);
        refresh();
      }),
    );
    root.querySelectorAll<HTMLInputElement>('input[name=icbg]').forEach((radio) =>
      radio.addEventListener('change', () => {
        state.bg = radio.value;
        root.querySelectorAll('input[name=icbg]').forEach((r) => r.closest('label')?.classList.toggle('on', (r as HTMLInputElement).checked));
      }),
    );
    root.querySelectorAll<HTMLInputElement>('input[name=icout]').forEach((radio) =>
      radio.addEventListener('change', () => {
        state.out = radio.value as 'ico' | 'png';
        root.querySelectorAll('input[name=icout]').forEach((r) => r.closest('label')?.classList.toggle('on', (r as HTMLInputElement).checked));
        renderOutputs();
        refresh();
      }),
    );
    const colorInput = q<HTMLInputElement>('[data-color]');
    const syncColor = () => {
      state.color = colorInput.value;
      q('[data-hex]').textContent = `${colorInput.value}（仅「自定义」生效）`;
    };
    colorInput.addEventListener('input', syncColor);
    colorInput.addEventListener('change', syncColor);
    runBtn.addEventListener('click', () => void generate());

    renderOutputs();
    refresh();
  },
};
