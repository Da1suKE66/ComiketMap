"use client";
import { useState } from "react";
import { Save, Trash2 } from "lucide-react";
import Modal from "./modal";
import { DAYS, HALLS, boothDraftSchema, completeBoothDraft, isCorporate, type Booth, type BoothDraft } from "@/lib/model";

export default function BoothDraftEditor({ draft, onClose, onSave, onDelete }: {
  draft: BoothDraft; onClose: () => void; onSave: (draft: BoothDraft, booth: Booth | null) => void; onDelete?: () => void;
}) {
  const [value, setValue] = useState(draft), [error, setError] = useState("");
  const patch = (next: Partial<BoothDraft>) => setValue(v => ({ ...v, ...next }));
  function save() {
    const result = boothDraftSchema.safeParse({ ...value, circle: value.circle.trim(), artist: value.artist.trim(), block: value.block.trim(), space: value.space.trim().toLowerCase(), xHandle: value.xHandle.trim() });
    if (!result.success) { setError("请填写名称，并检查字段长度。"); return; }
    const booth = completeBoothDraft(result.data);
    if (value.day && value.hall && value.space && (isCorporate(value.hall) || value.block) && !booth) { setError(isCorporate(value.hall) ? "企业编号需为 3–5 位数字。" : "摊位号需为两位数字，可加 a、b 或 ab（如 04ab）。"); return; }
    onSave(result.data, booth);
  }
  return <Modal title="补充摊位" onClose={onClose}>
    <div className="editor-body"><div className="form-grid">
      <label>名称 <em>*</em><input autoFocus maxLength={120} value={value.circle} onChange={e => patch({ circle: e.target.value })} /></label>
      <label>画师名称<input maxLength={500} value={value.artist} onChange={e => patch({ artist: e.target.value })} /></label>
      <label>参加日期<select value={value.day ?? ""} onChange={e => patch({ day: e.target.value ? Number(e.target.value) as BoothDraft["day"] : null })}><option value="">待补充</option>{DAYS.map(d => <option key={d.id} value={d.id}>{d.full}（{d.weekday}）</option>)}</select></label>
      <label>所在场馆<select value={value.hall ?? ""} onChange={e => patch({ hall: e.target.value ? e.target.value as BoothDraft["hall"] : null })}><option value="">待补充</option>{HALLS.map(h => <option key={h.id} value={h.id}>{h.name}{isCorporate(h.id) ? " · 4F 企业" : ""}</option>)}</select></label>
      <label>区域 / ブロック<input maxLength={8} value={value.block} onChange={e => patch({ block: e.target.value })} /></label>
      <label>{value.hall && isCorporate(value.hall) ? "企业编号" : "摊位号 / スペース"}<input maxLength={5} value={value.space} onChange={e => patch({ space: e.target.value })} /></label>
      <label className="form-full">X 用户名<input maxLength={120} value={value.xHandle} onChange={e => patch({ xHandle: e.target.value })} /></label>
      <label className="form-full">备忘<textarea rows={3} maxLength={4000} value={value.notes} onChange={e => patch({ notes: e.target.value })} /></label>
    </div><p className="form-hint">日期和地点补齐后，自动移入摊位清单并可参与路线规划。</p>{error && <p className="form-error" role="alert">{error}</p>}</div>
    <div className="modal-footer">{onDelete ? <button className="text-button danger-text" onClick={onDelete}><Trash2 size={14} />删除记录</button> : <span />}<button className="button primary" onClick={save}><Save size={15} />保存记录</button></div>
  </Modal>;
}
