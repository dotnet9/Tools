/** 工具规格与运行时类型（对齐 CodeWF.Toolbox 的 ToolSpec/ToolField/ToolOutput 模型，改为浏览器内运行） */

export type FieldKind = 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'file';

export interface FieldSpec {
  key: string;
  label: string;
  kind: FieldKind;
  /** 默认值（text/textarea/number/select 用字符串） */
  value?: string;
  /** select 选项 */
  options?: string[];
  placeholder?: string;
  hint?: string;
  /** 多行文本高度 */
  rows?: number;
  /** file 字段接受类型 */
  accept?: string;
  /** checkbox 默认是否勾选 */
  checked?: boolean;
}

export interface OutputSpec {
  key: string;
  label: string;
  /** code：等宽只读块（默认）；text：普通文本；html：富文本预览 */
  kind?: 'code' | 'text' | 'html';
  /** 输出块高度（px） */
  height?: number;
}

/** 运行时上下文：字段取值 + 结果写入 */
export interface ToolContext {
  get(key: string): string;
  num(key: string): number;
  bool(key: string): boolean;
  file(key: string): File | null;
  /** 写入文本输出（自动安全转义，等宽显示） */
  set(key: string, value: string | number | null | undefined): void;
  /** 写入 HTML 输出（调用方自行保证安全） */
  setHtml(key: string, html: string): void;
  /** 顶部错误提示 */
  error(message: string): void;
  /** 清除错误提示 */
  clearError(): void;
  /** 自定义渲染容器（用于进阶工具，如 canvas 预览） */
  mount(key: string): HTMLElement | null;
  /** 触发一次重算（自动模式下由输入变化触发） */
  rerun(): void;
}

export interface ToolSpec {
  /** 字段与输出定义 */
  fields: FieldSpec[];
  outputs: OutputSpec[];
  /** 运行体：读 ctx 字段，写 ctx 输出 */
  run: (ctx: ToolContext) => void | Promise<void>;
  /** 输入变化时自动重算（默认 true） */
  autoRun?: boolean;
  /** autoRun=false 时的按钮文案 */
  runLabel?: string;
  /** 顶部说明（显示在界面之上） */
  note?: string;
  /** 自定义脚本（进阶工具用，返回 DOM 并自行绑定交互） */
  custom?: (root: HTMLElement, ctx: ToolContext) => void | Promise<void>;
}
