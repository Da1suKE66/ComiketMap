"use client";
import { FileJson, FolderOpen, Save } from "lucide-react";
import type useNotebook from "@/lib/use-notebook";
type Storage = ReturnType<typeof useNotebook>;

export function FileStorageBanner({ storage: s, onManage }: { storage: Storage; onManage: () => void }) {
  const connected = s.fileStatus === "connected", attention = s.fileName && !connected;
  if (connected && s.saveState !== "error" && !s.cacheWarning) return null;
  return <div className={`local-file-bar ${connected ? "connected" : attention ? "needs-attention" : ""}`}>
    <FileJson size={20} /><div className="local-file-description"><strong>{s.fileName || "本地保存"}</strong><p>{attention ? s.fileError || "文件需要重新授权，修改尚未写回。" : s.saveState === "error" ? "尚未写回文件，请重试或另存为。" : s.cacheWarning || (s.fileSupported ? "选择 JSON 文件后自动保存。" : "当前浏览器不支持自动保存，请用桌面 Chrome / Edge。")}</p></div>
    <div className="local-file-actions">{connected ? <><button className="button small" disabled={s.fileBusy || s.saveState === "saving"} onClick={s.syncNow}><Save size={13} />立即保存</button><button className="text-button" onClick={onManage}>管理文件</button></> : <>{attention && <button className="button small" disabled={s.fileBusy} onClick={s.reconnect}>重新授权 / 读取</button>}<button className="button small primary" disabled={!s.fileSupported || s.fileBusy} onClick={s.saveAs}><Save size={13} />{s.fileName ? "另存为新文件" : "选择保存文件"}</button>{!s.fileName && <button className="text-button" disabled={!s.fileSupported || s.fileBusy} onClick={s.openFile}>打开已有手帐</button>}</>}</div>
  </div>;
}

export function FileStoragePanel({ storage: s }: { storage: Storage }) {
  return <section className="file-storage-panel"><div className="row-between"><h3>本地文件</h3><FileJson size={23} /></div><p>修改自动写回所选 JSON 文件，包含品书和底图。</p>
    {s.fileName && <div className="file-target"><FileJson size={17} /><div><strong>{s.fileName}</strong><small>{s.fileStatus === "connected" ? "已绑定 · 自动写回" : "连接需要恢复 · 尚未写回"}</small></div><button className="text-button" disabled={s.fileBusy || s.saveState === "saving"} onClick={s.syncNow}>{s.fileStatus === "connected" ? "立即保存" : "重试保存"}</button></div>}
    {!s.fileSupported && <p className="file-support-hint">此浏览器不支持选择并持续写回文件。请在桌面版 Chrome / Edge 打开网页；这里仍可下载备份和导入。</p>}
    {s.fileError && <p className="file-support-hint" role="alert">{s.fileError}</p>}
    <div className="row wrap"><button className="button primary small" disabled={!s.fileSupported || s.fileBusy} onClick={s.saveAs}><Save size={14} />{s.fileName ? "另存为…" : "选择保存文件"}</button><button className="button small" disabled={!s.fileSupported || s.fileBusy} onClick={s.openFile}><FolderOpen size={14} />打开已有手帐</button>{s.fileName && s.fileStatus !== "connected" && <button className="button small" disabled={s.fileBusy} onClick={s.reconnect}>重新授权</button>}{s.fileName && <button className="text-button" disabled={s.fileBusy} onClick={s.detach}>断开文件</button>}</div>
    <details className="file-storage-help"><summary>保存说明</summary><p>首次通过系统窗口选择位置并授权。网页只显示文件名，权限过期时需重新授权。</p><p>无需登录。记录保存在所选文件，浏览器缓存仅用于恢复。未绑定文件时可下载备份。</p></details>{s.cacheWarning && <p className="file-support-hint">{s.cacheWarning}</p>}
  </section>;
}
