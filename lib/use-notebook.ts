"use client";
import { useEffect, useRef, useState } from "react";
import { loadData, loadFileHandle, saveData, saveFileHandle } from "./db";
import { dataSchema, emptyData, type AppData } from "./model";
import { cleanRoutePlans } from "./routes";
import { createNotebookFile, grantFilePermission, isPickerCancelled, pickOpenFile, pickSaveFile, readNotebookFile, supportsLocalFiles, writeNotebookFile, type FileBinding, type NotebookFileHandle } from "./local-file";

function hasRecoveryChanges(cached: AppData, disk: AppData) {
  return cached.updatedAt > disk.updatedAt || (cached.updatedAt === disk.updatedAt && JSON.stringify(cached) !== JSON.stringify(disk));
}

export default function useNotebook(notify: (message: string) => void) {
  const [data, setData] = useState<AppData | null>(null), [loadError, setLoadError] = useState(""), [saveState, setSaveState] = useState("loading");
  const [fileName, setFileName] = useState(""), [fileStatus, setFileStatus] = useState<"unbound" | "connected" | "permission" | "error">("unbound"), [fileError, setFileError] = useState(""), [fileBusy, setFileBusy] = useState(false), [fileSupported, setFileSupported] = useState(false), [cacheWarning, setCacheWarning] = useState("");
  const [pendingOpen, setPendingOpen] = useState<FileBinding | null>(null);
  const latest = useRef<AppData | null>(null), binding = useRef<FileBinding | null>(null), remembered = useRef<NotebookFileHandle | null>(null), queue = useRef<Promise<void>>(Promise.resolve()), revision = useRef(0), dirty = useRef(false), operation = useRef(false), notifyRef = useRef(notify); notifyRef.current = notify;
  const update = (value: AppData) => { latest.current = value; setData(value); };
  async function cache(value: AppData) {
    try { await saveData(value); setCacheWarning(""); return true; } catch { setCacheWarning("浏览器恢复缓存暂不可用；请确认本地文件保存成功。"); return false; }
  }
  async function remember(handle: NotebookFileHandle | null) {
    try { await saveFileHandle(handle); } catch { setCacheWarning("文件已保存，但浏览器无法记住位置；下次打开时请重新选择此文件。"); }
  }
  function failed(error: unknown) {
    const message = error instanceof Error ? error.message : "本地文件保存失败，请重试或另存为。";
    setSaveState("error"); if (remembered.current) { setFileStatus("error"); setFileError(message); }
    notifyRef.current(message);
  }
  function enqueue(action: () => Promise<void>) { const task = queue.current.catch(() => {}).then(action); queue.current = task; return task; }
  useEffect(() => {
    let active = true; setFileSupported(supportsLocalFiles());
    (async () => {
      const [cached, target] = await Promise.allSettled([loadData(), loadFileHandle()]); if (!active) return;
      const stored = cached.status === "fulfilled" ? cached.value : null;
      const handle = target.status === "fulfilled" ? target.value : null;
      if (cached.status === "rejected") setCacheWarning("浏览器恢复缓存读取失败；可直接打开本地手帐文件。");
      if (handle) {
        remembered.current = handle; setFileName(handle.name);
        try {
          if (await handle.queryPermission({ mode: "readwrite" }) !== "granted") {
            if (!active) return; update(stored ?? emptyData()); setFileStatus("permission"); setSaveState("saved"); return;
          }
          const disk = await readNotebookFile(handle); if (!active) return;
          if (stored && hasRecoveryChanges(stored, disk.data)) {
            update(stored); dirty.current = true; setFileStatus("error"); setSaveState("error"); setFileError("浏览器中有较新的未写回修改。可另存为新文件保留修改，或重新打开磁盘上的手帐。"); return;
          }
          binding.current = disk; update(disk.data); setFileStatus("connected"); setSaveState("saved"); await cache(disk.data); return;
        } catch (error) {
          if (!active) return; update(stored ?? emptyData()); setFileStatus("error"); setSaveState("error"); setFileError((error as Error).message || "无法读取之前绑定的文件，请重新选择。"); return;
        }
      }
      if (cached.status === "rejected") { setLoadError("浏览器缓存读取失败，请打开本地手帐或导入备份；也可以选择文件创建空白手帐。"); setSaveState("error"); return; }
      const initial = stored ?? emptyData(); update(initial); setSaveState("saved"); if (!stored) await cache(initial);
    })().catch(e => { if (active) { setLoadError((e as Error).message); setSaveState("error"); } });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const prevent = (e: BeforeUnloadEvent) => { if (saveState === "saving" || saveState === "error") e.preventDefault(); };
    window.addEventListener("beforeunload", prevent); return () => window.removeEventListener("beforeunload", prevent);
  }, [saveState]);
  function change(next: AppData) {
    const result = dataSchema.safeParse({ ...cleanRoutePlans(next), updatedAt: new Date().toISOString() });
    if (!result.success) { notifyRef.current(result.error.issues[0]?.message ?? "数据校验失败"); return false; }
    const value = result.data; update(value); setLoadError(""); setSaveState("saving"); dirty.current = true; const current = ++revision.current;
    void enqueue(async () => {
      const cached = await cache(value);
      if (binding.current) { await writeNotebookFile(binding.current, value); setFileStatus("connected"); setFileError(""); }
      else if (remembered.current) throw new Error("修改尚未写回本地文件，请重新授权、打开文件或另存为。");
      else if (!cached) throw new Error("无法保存浏览器缓存，请选择一个本地文件保留修改。");
      if (current === revision.current) { setSaveState("saved"); dirty.current = false; }
    }).catch(failed);
    return true;
  }
  async function saveAs() {
    if (operation.current) return; operation.current = true; setFileBusy(true);
    try {
      const handle = await pickSaveFile(); // The picker must run directly in the click gesture.
      await enqueue(async () => {
        setSaveState("saving"); const value = latest.current ?? emptyData(), current = revision.current;
        const saved = await createNotebookFile(handle, value);
        binding.current = saved; remembered.current = handle; setFileName(handle.name); setFileStatus("connected"); setFileError("");
        if (!latest.current) update(value); await cache(value); await remember(handle); setLoadError("");
        if (current === revision.current) { setSaveState("saved"); dirty.current = false; }
      });
      notifyRef.current(`已保存到 ${handle.name}，后续修改会自动写回此文件`);
    } catch (error) { if (!isPickerCancelled(error)) failed(error); } finally { operation.current = false; setFileBusy(false); }
  }
  async function openFile() {
    if (operation.current) return; operation.current = true; setFileBusy(true);
    try { const handle = await pickOpenFile(); const candidate = await readNotebookFile(handle); setPendingOpen(candidate); } catch (error) { if (!isPickerCancelled(error)) notifyRef.current((error as Error).message || "无法打开手帐文件"); } finally { operation.current = false; setFileBusy(false); }
  }
  async function approveOpen() {
    if (!pendingOpen || operation.current) return false; operation.current = true; setFileBusy(true);
    try {
      await enqueue(async () => {
        const disk = await readNotebookFile(pendingOpen.handle); revision.current++; binding.current = disk; remembered.current = disk.handle;
        update(disk.data); setFileName(disk.handle.name); setFileStatus("connected"); setFileError(""); setLoadError(""); dirty.current = false;
        await cache(disk.data); await remember(disk.handle); setSaveState("saved");
      });
      setPendingOpen(null); notifyRef.current("本地手帐已打开，修改会保存回同一个文件"); return true;
    } catch (error) { notifyRef.current((error as Error).message || "文件已变化，请重新选择"); return false; } finally { operation.current = false; setFileBusy(false); }
  }
  async function reconnect() {
    if (!remembered.current || operation.current) return; operation.current = true; setFileBusy(true);
    try {
      await grantFilePermission(remembered.current);
      const disk = await readNotebookFile(remembered.current);
      if (dirty.current || (latest.current && hasRecoveryChanges(latest.current, disk.data))) setPendingOpen(disk);
      else await enqueue(async () => { revision.current++; binding.current = disk; update(disk.data); await cache(disk.data); setFileStatus("connected"); setFileError(""); setSaveState("saved"); });
    } catch (error) { if (!isPickerCancelled(error)) { setFileError((error as Error).message || "重新授权失败"); setFileStatus("error"); notifyRef.current((error as Error).message); } } finally { operation.current = false; setFileBusy(false); }
  }
  async function syncNow() {
    if (!binding.current) { await reconnect(); return; }
    if (operation.current) return; operation.current = true; setFileBusy(true);
    try {
      await grantFilePermission(binding.current.handle);
      const current = revision.current; setSaveState("saving");
      await enqueue(async () => { const value = latest.current!; await writeNotebookFile(binding.current!, value); await cache(value); if (current === revision.current) { setSaveState("saved"); dirty.current = false; } setFileStatus("connected"); setFileError(""); });
      notifyRef.current("已写回本地手帐文件");
    } catch (error) { failed(error); } finally { operation.current = false; setFileBusy(false); }
  }
  async function detach() {
    if (operation.current) return; operation.current = true; setFileBusy(true);
    try { await enqueue(async () => { await saveFileHandle(null); binding.current = null; remembered.current = null; setFileName(""); setFileStatus("unbound"); setFileError(""); if (latest.current) await cache(latest.current); setSaveState("saved"); }); notifyRef.current("已断开文件，磁盘上的手帐仍保留"); } catch (error) { failed(error); } finally { operation.current = false; setFileBusy(false); }
  }
  return { data, loadError, saveState, change, fileName, fileStatus, fileError, fileBusy, fileSupported, cacheWarning, saveAs, openFile, reconnect, syncNow, detach, pendingOpen, approveOpen, cancelOpen: () => setPendingOpen(null) };
}
