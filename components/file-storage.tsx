"use client";
import { FileJson, FolderOpen, Save } from "lucide-react";
import type useNotebook from "@/lib/use-notebook";
type Storage = ReturnType<typeof useNotebook>;

export function FileStorageBanner({ storage: s, onManage }: { storage: Storage; onManage: () => void }) {
  const connected = s.fileStatus === "connected", attention = s.fileName && !connected;
  return <div className={`local-file-bar ${connected ? "connected" : attention ? "needs-attention" : ""}`}>
    <FileJson size={20} /><div className="local-file-description"><strong>{s.fileName || "选择一个本地手帐文件"}</strong><p>{attention ? s.fileError || "请重新授权此文件。当前修改尚未写回磁盘。" : connected ? s.saveState === "saving" ? "正在写回本地文件…" : s.saveState === "error" ? "尚未写回文件，请重试或另存为。" : "摊位、品书与代购记录会自动保存回这个文件。" : s.fileSupported ? "指定保存位置，之后每次修改自动写回同一个 JSON 文件。" : "当前浏览器不支持直接写回文件，请使用桌面版 Chrome 或 Edge。"}</p></div>
    <div className="local-file-actions">{connected ? <><button className="button small" disabled={s.fileBusy || s.saveState === "saving"} onClick={s.syncNow}><Save size={13} />立即保存</button><button className="text-button" onClick={onManage}>管理文件</button></> : <>{attention && <button className="button small" disabled={s.fileBusy} onClick={s.reconnect}>重新授权 / 读取</button>}<button className="button small primary" disabled={!s.fileSupported || s.fileBusy} onClick={s.saveAs}><Save size={13} />{s.fileName ? "另存为新文件" : "选择保存文件"}</button>{!s.fileName && <button className="text-button" disabled={!s.fileSupported || s.fileBusy} onClick={s.openFile}>打开已有手帐</button>}</>}</div>
  </div>;
}

export function FileStoragePanel({ storage: s }: { storage: Storage }) {
  return <section className="file-storage-panel"><div className="row-between"><div><span className="eyebrow">YOUR LOCAL NOTEBOOK</span><h3>自动保存到指定文件</h3></div><FileJson size={23} /></div><p>首次通过系统窗口选择位置并授权，之后修改会写回同一个文件。品书图片和馆内底图也包含在 JSON 中。</p>
    {s.fileName && <div className="file-target"><FileJson size={17} /><div><strong>{s.fileName}</strong><small>{s.fileStatus === "connected" ? "已绑定 · 自动写回" : "连接需要恢复 · 尚未写回"}</small></div><button className="text-button" disabled={s.fileBusy || s.saveState === "saving"} onClick={s.syncNow}>{s.fileStatus === "connected" ? "立即保存" : "重试保存"}</button></div>}
    {!s.fileSupported && <p className="file-support-hint">此浏览器不支持选择并持续写回文件。请在桌面版 Chrome / Edge 打开网页；这里仍可下载备份和导入。</p>}
    {s.fileError && <p className="file-support-hint" role="alert">{s.fileError}</p>}
    <div className="row wrap"><button className="button primary small" disabled={!s.fileSupported || s.fileBusy} onClick={s.saveAs}><Save size={14} />{s.fileName ? "另存为…" : "选择保存文件"}</button><button className="button small" disabled={!s.fileSupported || s.fileBusy} onClick={s.openFile}><FolderOpen size={14} />打开已有手帐</button>{s.fileName && s.fileStatus !== "connected" && <button className="button small" disabled={s.fileBusy} onClick={s.reconnect}>重新授权</button>}{s.fileName && <button className="text-button" disabled={s.fileBusy} onClick={s.detach}>断开文件</button>}</div>
    <small className="file-location-note">保存位置由系统文件选择器决定；网页只显示文件名。刷新会尝试重新连接，权限过期时需要再次授权。</small>{s.cacheWarning && <p className="file-support-hint">{s.cacheWarning}</p>}
  </section>;
}
