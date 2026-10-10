/**
 * 规格驱动的工具运行时。
 *
 * Astro 在构建时根据 registry 输出每个工具容器：
 *   <div data-tool="timestamp" data-variant="spec">
 *     <div data-slot="body"></div>          ← 按 spec 渲染表单与输出
 *   </div>
 * 本模块在客户端按 slug 找到实现并绑定。
 *
 * 对齐 CodeWF.Toolbox 的 ToolSpec 模型：字段取值 → run() → 结果写入输出块。
 */
import type { FieldSpec, OutputSpec, ToolContext, ToolSpec } from './types';
import { copyText, toast } from './ui';

const esc = (s: string): string =>
  String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]!);

function fieldHTML(f: FieldSpec): string {
  const id = `f-${f.key}`;
  switch (f.kind) {
    case 'textarea':
      return `<div class="field"><label for="${id}">${esc(f.label)}</label>
        <textarea id="${id}" data-field="${f.key}" rows="${f.rows ?? 6}" placeholder="${esc(f.placeholder ?? '')}">${esc(f.value ?? '')}</textarea>
        ${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ''}</div>`;
    case 'number':
      return `<div class="field"><label for="${id}">${esc(f.label)}</label>
        <input id="${id}" type="number" data-field="${f.key}" value="${esc(f.value ?? '')}" placeholder="${esc(f.placeholder ?? '')}">
        ${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ''}</div>`;
    case 'select':
      return `<div class="field"><label for="${id}">${esc(f.label)}</label>
        <select id="${id}" data-field="${f.key}">${(f.options ?? [])
          .map((o) => `<option value="${esc(o)}"${o === f.value ? ' selected' : ''}>${esc(o)}</option>`)
          .join('')}</select>
        ${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ''}</div>`;
    case 'checkbox':
      return `<div class="field"><label class="check"><input id="${id}" type="checkbox" data-field="${f.key}"${
        f.checked ? ' checked' : ''
      }> <span>${esc(f.label)}</span></label>${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ''}</div>`;
    case 'file':
      return `<div class="field"><label for="${id}">${esc(f.label)}</label>
        <input id="${id}" type="file" data-field="${f.key}" accept="${esc(f.accept ?? '')}">
        ${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ''}</div>`;
    default:
      return `<div class="field"><label for="${id}">${esc(f.label)}</label>
        <input id="${id}" type="text" data-field="${f.key}" value="${esc(f.value ?? '')}" placeholder="${esc(f.placeholder ?? '')}">
        ${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ''}</div>`;
  }
}

function outputHTML(o: OutputSpec): string {
  return `<div class="out-block"><div class="out-head"><span>${esc(o.label)}</span>
    <button class="btn btn-ghost btn-sm" data-copy="${o.key}">复制</button></div>
    <pre class="out" data-out="${o.key}" style="${o.height ? `min-height:${o.height}px;` : ''}"></pre></div>`;
}

export function specBodyHTML(spec: ToolSpec): string {
  const files = spec.fields.filter((f) => f.kind === 'file');
  const inputs = spec.fields.filter((f) => f.kind !== 'file');
  return `
  <div class="spec">
    ${spec.note ? `<div class="note">${esc(spec.note)}</div>` : ''}
    <div class="spec-grid">
      <div class="spec-inputs">
        ${files.map(fieldHTML).join('')}
        ${inputs.map(fieldHTML).join('')}
        ${
          spec.autoRun === false
            ? `<button class="btn btn-primary" data-run>${esc(spec.runLabel ?? '运行')}</button>`
            : `<div class="hint auto-hint">输入变化即时计算 · <span class="kbd">纯本地处理</span></div>`
        }
      </div>
      <div class="spec-outputs">${spec.outputs.map(outputHTML).join('')}</div>
    </div>
    <div class="tool-error" data-error hidden></div>
  </div>`;
}

function mountSpec(root: HTMLElement, spec: ToolSpec): void {
  const body = root.querySelector<HTMLElement>('[data-slot="body"]');
  if (!body) return;
  body.innerHTML = specBodyHTML(spec);

  const get = (key: string): string => {
    const el = body.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[data-field="${key}"]`);
    if (!el) return '';
    return el.type === 'checkbox' ? (el.checked ? '1' : '') : el.value;
  };
  const fileEl = (key: string): HTMLInputElement | null => body.querySelector<HTMLInputElement>(`[data-field="${key}"][type="file"]`);
  const errorEl = body.querySelector<HTMLElement>('[data-error]');

  let timer = 0;
  const run = async (): Promise<void> => {
    if (errorEl) {
      errorEl.hidden = true;
      errorEl.textContent = '';
    }
    const ctx: ToolContext = {
      get,
      num: (key) => Number.parseFloat(get(key)) || 0,
      bool: (key) => !!get(key),
      file: (key) => fileEl(key)?.files?.[0] ?? null,
      set: (key, value) => {
        const out = body.querySelector<HTMLElement>(`[data-out="${key}"]`);
        if (out) out.textContent = value == null ? '' : String(value);
      },
      setHtml: (key, html) => {
        const out = body.querySelector<HTMLElement>(`[data-out="${key}"]`);
        if (out) out.innerHTML = html;
      },
      error: (message) => {
        if (!errorEl) {
          toast(message);
          return;
        }
        errorEl.hidden = false;
        errorEl.textContent = message;
      },
      clearError: () => {
        if (!errorEl) return;
        errorEl.hidden = true;
        errorEl.textContent = '';
      },
      mount: (key) => body.querySelector<HTMLElement>(`[data-out="${key}"]`),
      rerun: () => void run(),
    };
    try {
      await spec.run(ctx);
    } catch (e) {
      ctx.error(e instanceof Error ? e.message : String(e));
    }
  };

  if (spec.autoRun !== false) {
    body.querySelectorAll<HTMLElement>('[data-field]').forEach((el) => {
      const evt = el.tagName === 'SELECT' || el.getAttribute('type') === 'checkbox' || el.getAttribute('type') === 'file' ? 'change' : 'input';
      el.addEventListener(evt, () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => void run(), 120);
      });
    });
  } else {
    body.querySelector('[data-run]')?.addEventListener('click', () => void run());
  }

  body.querySelectorAll<HTMLElement>('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const out = body.querySelector<HTMLElement>(`[data-out="${btn.dataset.copy}"]`);
      copyText(out?.textContent ?? '', '已复制结果');
    });
  });

  void run();
}

/** 绑定页面上所有工具容器（由 [slug].astro 与自定义组件调用） */
export function mountTools(registry: Record<string, ToolSpec>): void {
  document.querySelectorAll<HTMLElement>('[data-tool]').forEach((root) => {
    const slug = root.dataset.tool!;
    const spec = registry[slug];
    if (!spec) return;
    if (spec.custom) {
      const slot = root.querySelector<HTMLElement>('[data-slot="custom"]');
      if (slot) {
        const ctx = {
          set: () => {},
          setHtml: () => {},
          error: (m: string) => toast(m),
          clearError: () => {},
          mount: () => null,
          get: () => '',
          num: () => 0,
          bool: () => false,
          file: () => null,
          rerun: () => {},
        } as unknown as ToolContext;
        void spec.custom(slot, ctx);
      }
      return;
    }
    mountSpec(root, spec);
  });
}
