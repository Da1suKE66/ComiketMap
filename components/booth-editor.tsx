"use client";
import { useRef, useState } from "react";
import { ArrowUpRight, Check, ImagePlus, MapPin, Plus, Save, ShoppingBag, Trash2, UserRound, X } from "lucide-react";
import Modal from "./modal";
import { DAYS, HALLS, PRIORITIES, isCorporate, boothSchema, itemPurchased, itemTotal, newItem, totals, uid, yen, type Booth, type ImageAsset, type Item, type Recipient } from "@/lib/model";
import { readImage } from "@/lib/db";

export default function BoothEditor({ booth, recipients, onSave, onClose, onDelete }: { booth: Booth; recipients: Recipient[]; onSave: (b: Booth, recipients: Recipient[]) => void; onClose: () => void; onDelete?: () => void }) {
  const [b, setB] = useState<Booth>(() => structuredClone(booth)), [people, setPeople] = useState(recipients), [tab, setTab] = useState("info"), [error, setError] = useState(""), [uploading, setUploading] = useState(false), [personName, setPersonName] = useState(""), [preview, setPreview] = useState<ImageAsset | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const patch = (value: Partial<Booth>) => setB(prev => ({ ...prev, ...value }));
  const updateItem = (id: string, value: Partial<Item>) => setB(prev => ({ ...prev, items: prev.items.map(i => i.id === id ? { ...i, ...value } : i) }));
  async function upload(files: FileList | null) {
    if (!files) return;
    if (b.images.length + files.length > 15) { setError("每个摊位最多保存 15 张品书图片"); return; }
    setUploading(true); setError("");
    try { const images: ImageAsset[] = []; for (const file of Array.from(files)) images.push(await readImage(file)); setB(prev => ({ ...prev, images: [...prev.images, ...images] })); } catch (e) { setError((e as Error).message); } finally { setUploading(false); if (input.current) input.current.value = ""; }
  }
  function save() {
    const candidate = { ...b, circle: b.circle.trim(), artist: b.artist.trim(), block: b.block.trim(), space: b.space.trim().toLowerCase(), items: b.items.map(i => ({ ...i, name: i.name.trim() })) };
    const result = boothSchema.safeParse(candidate);
    if (!result.success) { setError(result.error.issues.map(i => i.message === "String must contain at least 1 character(s)" ? "请填写社团名称、区域、摊位号与商品名称" : i.message).slice(0, 2).join("；")); return; }
    for (const i of candidate.items) {
      if (new Set(i.orders.map(o => o.recipientId)).size !== i.orders.length) { setError(`「${i.name}」有重复的代购对象，请合并数量`); return; }
      if (i.orders.some(o => !people.some(p => p.id === o.recipientId))) { setError("请选择有效的代购对象"); return; }
    }
    onSave(result.data, people);
  }
  function addPerson() {
    const name = personName.trim();
    if (!name) { setError("请填写代购对象名称"); return; }
    if (people.some(p => p.name.toLocaleLowerCase() === name.toLocaleLowerCase())) { setError("这个代购对象已经存在"); return; }
    setPeople([...people, { id: uid(), name, note: "" }]); setPersonName(""); setError("");
  }
  const sum = totals([b]);
  return <>
    <Modal title={booth.circle ? "编辑摊位" : "添加摊位"} onClose={onClose} wide>
      <div className="editor-tabs"><button className={tab === "info" ? "active" : ""} onClick={() => setTab("info")}><MapPin size={15} />摊位信息</button><button className={tab === "images" ? "active" : ""} onClick={() => setTab("images")}><ImagePlus size={15} />品书图片 <small>{b.images.length}</small></button><button className={tab === "items" ? "active" : ""} onClick={() => setTab("items")}><ShoppingBag size={15} />购买与代购 <small>{b.items.length}</small></button></div>
      <div className="editor-body">
        {tab === "info" && <div className="form-grid">
          <label>{isCorporate(b.hall) ? "企业／品牌名称" : "サークル / 社团名称"} <em>*</em><input autoFocus maxLength={120} value={b.circle} placeholder="例如：雨の日レコード" onChange={e => patch({ circle: e.target.value })} /></label>
          <label>画师名称<input maxLength={500} value={b.artist} placeholder="画师的昵称" onChange={e => patch({ artist: e.target.value })} /></label>
          <label>参加日期 <em>*</em><select value={b.day} onChange={e => patch({ day: Number(e.target.value) as Booth["day"] })}>{DAYS.map(d => <option key={d.id} value={d.id}>{d.label} · {d.full}（{d.weekday}）</option>)}</select></label>
          <label>所在场馆 <em>*</em><select value={b.hall} onChange={e => patch({ hall: e.target.value as Booth["hall"], x: null, y: null })}>{HALLS.map(h => <option key={h.id} value={h.id}>{h.name} 馆 / {h.en}{isCorporate(h.id) ? " · 4F 企业" : " · 1F 同人"}</option>)}</select></label>
          <label>区域 / ブロック {!isCorporate(b.hall) && <em>*</em>}<input maxLength={8} value={b.block} placeholder={isCorporate(b.hall) ? "企业馆可留空" : "例如：ア、A、あ、a"} onChange={e => patch({ block: e.target.value })} /></label>
          <label>{isCorporate(b.hall) ? "企业编号" : "摊位号 / スペース"} <em>*</em><input maxLength={5} value={b.space} placeholder={isCorporate(b.hall) ? "例如：1111、2141" : "例如：24a、08b、12ab"} onChange={e => patch({ space: e.target.value })} /></label>
          <label>画师粉丝数<input type="number" min="0" max="2000000000" step="1" value={b.fans ?? ""} placeholder="暂不清楚可留空" onChange={e => patch({ fans: e.target.value === "" ? null : Number(e.target.value) })} /></label>
          <label>X 用户名<input maxLength={120} value={b.xHandle} placeholder="@username（手动记录）" onChange={e => patch({ xHandle: e.target.value })} /></label>
          <div className="form-full"><label>优先级</label><div className="priority-options">{Object.entries(PRIORITIES).map(([key, p]) => <button key={key} className={b.priority === key ? "selected" : ""} onClick={() => patch({ priority: key as Booth["priority"] })}><span className={`priority-letter priority-${key}`}>{p.short}</span>{p.label}{b.priority === key && <Check size={14} />}</button>)}</div></div>
          <label>品书发布状态<select value={b.status} onChange={e => patch({ status: e.target.value as Booth["status"] })}><option value="pending">暂定 · 等待品书</option><option value="published">已发布品书</option></select></label>
          <label>到访状态<select value={b.visit} onChange={e => patch({ visit: e.target.value as Booth["visit"] })}><option value="planned">尚未到访</option><option value="visited">已经到访</option><option value="soldout">已售罄</option></select></label>
          <label className="form-full">备忘<textarea rows={3} maxLength={4000} value={b.notes} placeholder="限购、排队、想说的话，都可以记在这里。" onChange={e => patch({ notes: e.target.value })} /></label>
          <p className="form-hint form-full"><MapPin size={14} />保存后可在分馆地图手动定位；更换场馆会清除原来的落点。</p>
        </div>}
        {tab === "images" && <><div className="section-heading"><div><h3>把品书收在一起</h3><p>支持多张图片，点击可放大查看。</p></div><span className="subtle">{b.images.length} / 15 张</span></div><input hidden ref={input} type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={e => upload(e.target.files)} /><button className="image-drop" disabled={uploading} onClick={() => input.current?.click()}><ImagePlus size={27} /><strong>{uploading ? "正在处理图片…" : "选择品书图片"}</strong><span>JPG / PNG / WebP · ≤ 15 MB</span></button><div className="image-grid">{b.images.map(img => <div className="image-tile" key={img.id}><button className="image-preview" onClick={() => setPreview(img)}><img src={img.src} alt={img.name} /></button><div><span title={img.name}>{img.name}</span><button className="icon-button danger-text" aria-label={`移除 ${img.name}`} onClick={() => patch({ images: b.images.filter(i => i.id !== img.id) })}><Trash2 size={15} /></button></div></div>)}</div></>}
        {tab === "items" && <><div className="section-heading"><div><h3>商品</h3></div><button className="button small" onClick={() => patch({ items: [...b.items, newItem()] })}><Plus size={15} />添加商品</button></div>
          {b.items.length === 0 && <div className="empty-state compact"><ShoppingBag size={30} /><h3>暂无商品</h3><button className="button primary small" onClick={() => patch({ items: [newItem()] })}><Plus size={15} />添加商品</button></div>}
          {b.items.map((item, index) => <div className="item-editor" key={item.id}><div className="item-editor-heading"><span>商品 {index + 1}</span><button className="icon-button danger-text" aria-label={`移除商品 ${index + 1}`} onClick={() => patch({ items: b.items.filter(i => i.id !== item.id) })}><Trash2 size={16} /></button></div><div className="item-inputs"><label>商品名称 <em>*</em><input maxLength={120} value={item.name} placeholder="新刊名称 / 套组名称" onChange={e => updateItem(item.id, { name: e.target.value })} /></label><label>种类<select value={item.kind} onChange={e => updateItem(item.id, { kind: e.target.value as Item["kind"] })}>{["本子", "画集", "周边", "套组", "其他"].map(k => <option key={k}>{k}</option>)}</select></label><label>单价（JPY）<input type="number" min="0" max="100000000" step="1" value={item.price ?? ""} placeholder="待定" onChange={e => updateItem(item.id, { price: e.target.value === "" ? null : Number(e.target.value) })} /></label></div><div className="allocation-head"><span>购买对象</span><span>计划数量</span><span>已购数量</span><span /></div><div className="allocation-row"><span className="row"><UserRound size={15} />自己</span><input aria-label={`商品 ${index + 1} 自购数量`} type="number" min="0" max="9999" value={item.selfQuantity} onChange={e => updateItem(item.id, { selfQuantity: Number(e.target.value), selfPurchased: Math.min(item.selfPurchased, Number(e.target.value)) })} /><input aria-label={`商品 ${index + 1} 自购已购数量`} type="number" min="0" max={item.selfQuantity} value={item.selfPurchased} onChange={e => updateItem(item.id, { selfPurchased: Number(e.target.value) })} /><span /></div>
            {item.orders.map(order => <div className="allocation-row" key={order.id}><select aria-label="代购对象" value={order.recipientId} onChange={e => updateItem(item.id, { orders: item.orders.map(o => o.id === order.id ? { ...o, recipientId: e.target.value } : o) })}>{people.filter(p => p.id === order.recipientId || !item.orders.some(o => o.recipientId === p.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select><input aria-label={`商品 ${index + 1} ${people.find(p => p.id === order.recipientId)?.name} 代购数量`} type="number" min="0" max="9999" value={order.quantity} onChange={e => updateItem(item.id, { orders: item.orders.map(o => o.id === order.id ? { ...o, quantity: Number(e.target.value), purchased: Math.min(o.purchased, Number(e.target.value)) } : o) })} /><input aria-label={`商品 ${index + 1} ${people.find(p => p.id === order.recipientId)?.name} 已购数量`} type="number" min="0" max={order.quantity} value={order.purchased} onChange={e => updateItem(item.id, { orders: item.orders.map(o => o.id === order.id ? { ...o, purchased: Number(e.target.value) } : o) })} /><button className="icon-button" aria-label="移除这笔代购" onClick={() => updateItem(item.id, { orders: item.orders.filter(o => o.id !== order.id) })}><X size={15} /></button></div>)}
            <div className="row-between item-bottom"><button className="text-button" disabled={people.every(p => item.orders.some(o => o.recipientId === p.id))} onClick={() => { const p = people.find(p => !item.orders.some(o => o.recipientId === p.id)); if (p) updateItem(item.id, { orders: [...item.orders, { id: uid(), recipientId: p.id, quantity: 1, purchased: 0 }] }); }}><Plus size={14} />添加一笔代购</button><span>{itemTotal(item)} 件 · {item.price === null ? "单价待定" : yen(item.price * itemTotal(item))}</span></div></div>)}
          <div className="quick-person"><label htmlFor="quick-person">新增代购对象</label><div className="row"><input id="quick-person" maxLength={80} placeholder="例如：小林" value={personName} onChange={e => setPersonName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addPerson(); } }} /><button className="button small" onClick={addPerson}><Plus size={14} />新建对象</button></div></div><div className="form-total"><span>计划 {sum.quantity} 件 / 其中代购 {sum.proxy} 件</span><strong>{yen(sum.estimate)}{sum.unknown > 0 && <small> + {sum.unknown} 件价格待定</small>}</strong></div>
        </>}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-footer">{onDelete ? <button className="text-button danger-text" onClick={onDelete}><Trash2 size={15} />删除摊位</button> : <span className="subtle">* 为必填信息</span>}<div className="row"><button className="button" onClick={onClose}>取消</button><button className="button primary" disabled={uploading} onClick={save}><Save size={16} />保存摊位</button></div></div>
    </Modal>
    {preview && <Modal title={preview.name} onClose={() => setPreview(null)} wide><div className="lightbox"><img src={preview.src} alt={preview.name} /></div></Modal>}
  </>;
}
