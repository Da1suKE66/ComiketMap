import { dataSchema, type AppData } from "./model";

export type NotebookFileHandle = Pick<FileSystemFileHandle, "name" | "kind" | "getFile" | "createWritable"> & {
  queryPermission(options: { mode: "readwrite" }): Promise<PermissionState>;
  requestPermission(options: { mode: "readwrite" }): Promise<PermissionState>;
};
type FileOptions = { id: string; types: { description: string; accept: Record<string, string[]> }[]; excludeAcceptAllOption: boolean };
type PickerWindow = Window & {
  showSaveFilePicker?: (options: FileOptions & { suggestedName: string }) => Promise<NotebookFileHandle>;
  showOpenFilePicker?: (options: FileOptions & { multiple: false }) => Promise<NotebookFileHandle[]>;
};
export type FileBinding = { handle: NotebookFileHandle; modified: number; size: number; data: AppData };
export const MAX_FILE_BYTES = 60 * 1024 * 1024;
const options: FileOptions = { id: "comipath-notebook", types: [{ description: "ComiPath 手帐（JSON）", accept: { "application/json": [".json"] } }], excludeAcceptAllOption: true };
export function supportsLocalFiles() { return typeof window !== "undefined" && typeof (window as PickerWindow).showSaveFilePicker === "function" && typeof (window as PickerWindow).showOpenFilePicker === "function"; }
export function pickSaveFile() {
  if (!supportsLocalFiles()) throw new Error("请在桌面版 Chrome 或 Edge 中打开网页，以选择并持续写回本地文件。");
  return (window as PickerWindow).showSaveFilePicker!({ ...options, suggestedName: "ComiPath-C109.json" });
}
export async function pickOpenFile() {
  if (!supportsLocalFiles()) throw new Error("当前浏览器不支持绑定本地文件，请使用桌面版 Chrome 或 Edge。");
  const [handle] = await (window as PickerWindow).showOpenFilePicker!({ ...options, multiple: false });
  if (!handle) throw new DOMException("未选择文件", "AbortError");
  await grantFilePermission(handle); return handle;
}
export async function grantFilePermission(handle: NotebookFileHandle) {
  if (await handle.queryPermission({ mode: "readwrite" }) === "granted") return;
  if (await handle.requestPermission({ mode: "readwrite" }) !== "granted") throw new Error("未取得文件读写权限。请允许访问后重试，或另存为新文件。");
}
export async function readNotebookFile(handle: NotebookFileHandle): Promise<FileBinding> {
  const file = await handle.getFile();
  if (file.size > MAX_FILE_BYTES) throw new Error("手帐文件不能超过 60 MB");
  let json: unknown;
  try { json = JSON.parse(await file.text()); } catch { throw new Error("这个文件不是有效的 JSON 手帐，文件内容未被修改。"); }
  const result = dataSchema.safeParse(json);
  if (!result.success) throw new Error(`手帐文件校验失败：${result.error.issues[0]?.message}。文件内容未被修改。`);
  return { handle, modified: file.lastModified, size: file.size, data: result.data };
}
export async function writeNotebookFile(binding: FileBinding, data: AppData) {
  if (await binding.handle.queryPermission({ mode: "readwrite" }) !== "granted") throw new Error("本地文件权限已失效，请点击重新授权，或另存为新文件。");
  const current = await binding.handle.getFile();
  if (current.lastModified !== binding.modified || current.size !== binding.size) throw new Error("目标文件已被其他程序或标签页修改。请重新打开文件或另存为，当前修改尚未写回。");
  const json = JSON.stringify(dataSchema.parse(data), null, 2);
  if (new Blob([json]).size > MAX_FILE_BYTES) throw new Error("手帐已超过 60 MB，请减少图片或拆分手帐后再保存。");
  const stream = await binding.handle.createWritable();
  try { await stream.write(json); await stream.close(); } catch (error) { try { await stream.abort(); } catch {} throw error; }
  const saved = await binding.handle.getFile();
  binding.modified = saved.lastModified; binding.size = saved.size; binding.data = data;
}
export async function createNotebookFile(handle: NotebookFileHandle, data: AppData) {
  const file = await handle.getFile();
  const binding: FileBinding = { handle, modified: file.lastModified, size: file.size, data };
  await writeNotebookFile(binding, data); return binding;
}
export const isPickerCancelled = (error: unknown) => error instanceof DOMException && error.name === "AbortError";
