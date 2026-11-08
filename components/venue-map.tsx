"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Check, ChevronRight, Crosshair, ImagePlus, Layers, MapPin, Maximize2, Minus, MousePointer2, Plus, RotateCcw, X } from "lucide-react";
import { HALLS, PRIORITIES, hallName, type AppData, type Booth, type HallId } from "@/lib/model";
import { readImage } from "@/lib/db";

const boxes: Record<HallId, [number, number, number, number]> = { east3: [500, 262, 114, 158], east2: [632, 262, 114, 158], east1: [764, 262, 114, 158], east7: [898, 262, 105, 158], west2: [159, 237, 102, 155], west1: [285, 237, 102, 155], south1: [65, 483, 123, 111], south2: [211, 483, 123, 111] };
function Tables({ x, y, width, height, detailed = false }: { x: number; y: number; width: number; height: number; detailed?: boolean }) {
  const cols = detailed ? 7 : 3; const rows = detailed ? 5 : 4;
  const left = x + width * .13, top = y + height * .2, w = width * .74, h = height * .65;
  return <g aria-hidden="true">{Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => {
    const tw = w / cols * .65, th = h / rows * .38, tx = left + c * w / cols, ty = top + r * h / rows;
    return <g key={`${r}-${c}`}><rect x={tx} y={ty} width={tw} height={th} rx={1.5} fill="#e2e7df" stroke="#cdd5ca" strokeWidth={.6} /><line x1={tx} y1={ty + th / 2} x2={tx + tw} y2={ty + th / 2} stroke="#c4cdbf" strokeWidth={.6} />{detailed && Array.from({ length: 5 }, (_, n) => <line key={n} x1={tx + tw * (n + 1) / 6} y1={ty} x2={tx + tw * (n + 1) / 6} y2={ty + th} stroke="#c4cdbf" strokeWidth={.7} />)}</g>;
  }))}</g>;
}
type Props = { data: AppData; booths: Booth[]; hall: HallId | "all"; setHall: (h: HallId | "all") => void; visible: HallId[]; setVisible: (h: HallId[]) => void; selected: string | null; onSelect: (id: string) => void; placing: Booth | null; setPlacing: (b: Booth | null) => void; onPlace: (id: string, x: number, y: number) => void; onData: (data: AppData) => void; notify: (message: string) => void };
export default function VenueMap({ data, booths, hall, setHall, visible, setVisible, selected, onSelect, placing, setPlacing, onPlace, onData, notify }: Props) {
  const [zoom, setZoom] = useState(1), [pan, setPan] = useState({ x: 0, y: 0 }), [layers, setLayers] = useState(false), [busy, setBusy] = useState(false);
  const svg = useRef<SVGSVGElement>(null), fileRef = useRef<HTMLInputElement>(null), panelRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number; moved: boolean } | null>(null);
  useEffect(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, [hall]);
  const view = `${-pan.x + (1 - 1 / zoom) * 525} ${-pan.y + (1 - 1 / zoom) * 335} ${1050 / zoom} ${670 / zoom}`;
  const changeZoom = (amount: number) => setZoom(v => Math.max(.75, Math.min(3, v + amount)));
  function pointerDown(e: PointerEvent<SVGSVGElement>) {
    if (placing || (e.target as Element).closest("[data-interactive]")) return;
    drag.current = { x: e.clientX, y: e.clientY, ox: pan.x, oy: pan.y, moved: false }; e.currentTarget.setPointerCapture(e.pointerId);
  }
  function pointerMove(e: PointerEvent<SVGSVGElement>) {
    if (!drag.current || !svg.current) return;
    const d = drag.current; if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 4) d.moved = true;
    const scale = 1050 / svg.current.getBoundingClientRect().width / zoom;
    setPan({ x: d.ox + (e.clientX - d.x) * scale, y: d.oy + (e.clientY - d.y) * scale });
  }
  function place(e: React.MouseEvent<SVGSVGElement>) {
    if (!placing || hall === "all" || !svg.current) return;
    const point = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.current.getScreenCTM()!.inverse());
    const x = (point.x - 80) / 890, y = (point.y - 80) / 500;
    if (x < .025 || x > .975 || y < .04 || y > .96) { notify("请在馆内底图区域点击落点"); return; }
    onPlace(placing.id, x, y); setPlacing(null);
  }
  async function upload(file?: File) {
    if (!file || hall === "all") return; setBusy(true);
    try { const image = await readImage(file); onData({ ...data, floorplans: { ...data.floorplans, [hall]: image } }); notify("馆内底图已更新；原有落点保持相对位置，请按新底图核对"); } catch (e) { notify((e as Error).message); } finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  }
  const marker = (b: Booth, overview: boolean) => {
    if (b.x === null || b.y === null || !visible.includes(b.hall)) return null;
    const box = overview ? boxes[b.hall] : [80, 80, 890, 500];
    const px = box[0] + b.x * box[2], py = box[1] + b.y * box[3], color = PRIORITIES[b.priority].color, active = selected === b.id;
    return <g key={b.id} data-interactive="true" className="map-marker" role="button" tabIndex={0} aria-label={`查看 ${b.circle} ${hallName(b.hall)} ${b.block}-${b.space}`} transform={`translate(${px} ${py})`} onClick={e => { e.stopPropagation(); if (!placing) onSelect(b.id); }} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(b.id); } }}>
      {active && <circle r={overview ? 23 : 28} fill={color} opacity=".15" />}
      <path d="M0 5C-3 0-13-8-13-16a13 13 0 1 1 26 0C13-8 3 0 0 5Z" fill={b.visit === "visited" ? "#485c53" : color} stroke="white" strokeWidth="2.5" />
      <text y="-12" textAnchor="middle" fill="white" fontSize="10" fontWeight="700">{b.visit === "visited" ? "✓" : PRIORITIES[b.priority].short}</text>
      {(!overview || active) && <g transform="translate(19 -26)"><rect width={Math.min(200, b.circle.length * 13 + 22)} height="29" rx="6" fill="white" stroke="#e3e5df" /><text x="10" y="19" fontSize="12" fontWeight="600" fill="#39443d">{b.circle}</text></g>}
      <title>{b.circle} · {hallName(b.hall)} · {b.block}-{b.space} · 手动示意落点</title>
    </g>;
  };
  return <div className="map-panel" ref={panelRef}>
    <div className="map-toolbar"><div className="map-breadcrumb"><button className={hall === "all" ? "selected" : ""} onClick={() => { setHall("all"); setPlacing(null); }}><Layers size={15} />全馆总览</button>{hall !== "all" && <><ChevronRight size={14} /><strong>{hallName(hall)} 馆</strong></>}</div><div className="map-tools"><span className="subtle map-version">C109 · 1F 示意</span><button className={`icon-button ${layers ? "active" : ""}`} aria-label="控制馆区显示" aria-expanded={layers} onClick={() => setLayers(!layers)}><Layers size={17} /></button><button className="icon-button" aria-label="全屏地图" onClick={async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await panelRef.current?.requestFullscreen(); } catch { notify("当前浏览器不支持全屏，可使用地图缩放"); } }}><Maximize2 size={16} /></button></div></div>
    <div className="hall-tabs" role="group" aria-label="选择馆区"><button className={hall === "all" ? "active" : ""} onClick={() => { setHall("all"); setPlacing(null); }}>全部场馆</button>{HALLS.map(h => <button key={h.id} className={hall === h.id ? "active" : ""} onClick={() => { setHall(h.id); setPlacing(null); }}>{h.name}<span>{booths.filter(b => b.hall === h.id).length}</span></button>)}</div>
    <div className={`map-canvas ${placing ? "placing" : ""}`}>
      <div className="map-caption"><span className="eyebrow">{hall === "all" ? "TOKYO BIG SIGHT" : HALLS.find(h => h.id === hall)?.en}</span><strong>{hall === "all" ? "东京国际展示场" : `${hallName(hall)} 馆 · 我的摊位地图`}</strong><span>{hall === "all" ? "点击馆区，探索你的收藏" : data.floorplans[hall] ? "自定义底图 · 可重新定位摊位" : "岛型 / 壁摊示意 · 支持上传实际底图"}</span></div>
      {layers && <div className="layers-popover"><div className="row-between"><strong>显示馆区</strong><button className="icon-button" aria-label="关闭图层" onClick={() => setLayers(false)}><X size={14} /></button></div>{HALLS.map(h => <label key={h.id}><input type="checkbox" checked={visible.includes(h.id)} onChange={() => setVisible(visible.includes(h.id) ? visible.filter(id => id !== h.id) : [...visible, h.id])} /><span>{h.name} 馆</span><small>{h.en}</small></label>)}</div>}
      {placing && <div className="placing-banner"><MousePointer2 size={16} /><span>在底图上点击，定位「{placing.circle}」</span><button onClick={() => setPlacing(null)} aria-label="取消定位"><X size={16} /></button></div>}
      <svg ref={svg} viewBox={view} className="venue-svg" aria-label={hall === "all" ? "C109 全馆示意地图" : `${hallName(hall)} 馆摊位示意地图`} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onClick={place}>
        <defs><pattern id="map-dots" width="19" height="19" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".75" fill="#dce0d9" /></pattern><pattern id="closed-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line y2="7" stroke="#d9ddd6" strokeWidth="2" /></pattern><filter id="map-shadow"><feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#354b37" floodOpacity=".055" /></filter></defs>
        <rect x="-3000" y="-2000" width="7000" height="5000" fill="url(#map-dots)" />
        {hall === "all" ? <>
          <g className="site-landscape" aria-hidden="true"><path d="M40 420Q80 402 117 425L390 425Q434 419 459 445" fill="none" stroke="#dbe3d7" strokeWidth="16" strokeLinecap="round" /><path d="M35 623H363" fill="none" stroke="#dce5e6" strokeWidth="14" /><text x="52" y="651" fill="#9cafad" fontSize="10" letterSpacing="5">TOKYO BAY</text>{[55, 88, 120, 420, 448].map((x, i) => <g key={x}><circle cx={x} cy={i < 3 ? 445 : 495} r="8" fill="#d7e3d2" /><circle cx={x - 2} cy={i < 3 ? 442 : 492} r="5" fill="#e4ebdf" /></g>)}</g>
          <g aria-hidden="true"><path d="M272 396V448H371V507M386 311L447 311V229H488M274 447L193 464" fill="none" stroke="#e0e4dc" strokeWidth="25" strokeLinejoin="round" /><path d="M272 396V448H371V507M386 311L447 311V229H488M274 447L193 464" fill="none" stroke="#fbfcf8" strokeWidth="19" strokeLinejoin="round" /><text x="288" y="453" fill="#939d90" fontSize="9">中央通路</text><text transform="translate(443 294) rotate(-90)" fill="#939d90" fontSize="9">東西連絡通路</text></g>
          <g aria-hidden="true"><rect x="489" y="210" width="400" height="28" rx="3" fill="#e6e9e1" /><text x="689" y="229" textAnchor="middle" fill="#8b9687" fontSize="10" letterSpacing="4">GALLERIA / ガレリア</text><text x="500" y="69" fill="#8d9989" fontSize="11" letterSpacing="3">EAST EXHIBITION HALL</text>{[6, 5, 4].map((n, i) => <g key={n}><rect x={500 + i * 132} y="88" width="114" height="106" rx="5" fill="#eef0ea" stroke="#d8ded3" /><rect x={500 + i * 132} y="88" width="114" height="106" rx="5" fill="url(#closed-hatch)" /><text x={557 + i * 132} y="134" textAnchor="middle" fill="#a0a799" fontSize="17">东 {n}</text><text x={557 + i * 132} y="158" textAnchor="middle" fill="#969f8e" fontSize="10">施工停用</text></g>)}</g>
          {HALLS.map(h => { const [x, y, w, height] = boxes[h.id], shown = visible.includes(h.id), count = booths.filter(b => b.hall === h.id).length; return <g key={h.id} data-interactive="true" className="hall-shape" role="button" tabIndex={0} aria-label={`进入${h.name}馆`} opacity={shown ? 1 : .25} onClick={e => { e.stopPropagation(); setHall(h.id); }} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setHall(h.id); } }}><rect x={x} y={y} width={w} height={height} rx="5" fill={h.group === "east" ? "#f7f8f2" : h.group === "west" ? "#f5f6ee" : "#eef4f0"} stroke="#c9d3c2" strokeWidth="1.5" filter="url(#map-shadow)" /><Tables x={x} y={y} width={w} height={height} /><text x={x + 12} y={y + 23} fill="#64745b" fontSize="16" fontWeight="600">{h.name}</text><text x={x + w - 12} y={y + 22} textAnchor="end" fill="#99a18f" fontSize="9">{count} 摊</text><path d={`M${x + w * .4} ${y + height}h${w * .2}`} stroke="#8da785" strokeWidth="5" /><title>{h.name} · {count} 个收藏 · 点击查看馆内地图</title></g>; })}
          <g aria-hidden="true"><text x="158" y="214" fill="#8d9989" fontSize="10" letterSpacing="2">WEST HALL</text><text x="66" y="465" fill="#8d9989" fontSize="10" letterSpacing="2">SOUTH HALL</text><rect x="342" y="518" width="85" height="63" rx="6" fill="#f0e9de" stroke="#d6cdbd" />{[0, 1].map(r => [0, 1].map(c => <path key={`${r}${c}`} d={`M${350 + c * 36} ${526 + r * 23}l15 20 15-20z`} fill="#cec5b6" stroke="#f8f4ed" strokeWidth="2" />))}<text x="384" y="604" textAnchor="middle" fill="#8c8b7b" fontSize="11">会议棟 / 入口方向</text><path d="M570 513h150" stroke="#d5dbcf" strokeWidth="1" /><text x="570" y="540" fill="#9da794" fontSize="10" letterSpacing="3">YOUR NEXT FAVORITE IS HERE.</text></g>
          {booths.map(b => marker(b, true))}
        </> : <g>
          <rect x="80" y="80" width="890" height="500" rx="5" fill="#fbfcf8" stroke="#bdc9b5" strokeWidth="2" />
          {data.floorplans[hall] ? <image href={data.floorplans[hall]!.src} x="80" y="80" width="890" height="500" preserveAspectRatio="none" /> : <><Tables x={80} y={80} width={890} height={500} detailed /><text x="115" y="121" fill="#9da694" fontSize="12" letterSpacing="3">壁摊 / WALL SPACES — 示意</text><path d="M80 300h890M525 80v500" stroke="#edf0e6" strokeWidth="21" /><text x="525" y="305" textAnchor="middle" fill="#a4ad9d" fontSize="11" letterSpacing="8">主 通 道 示 意</text><path d="M415 580h220" stroke="#91ac84" strokeWidth="7" /><text x="525" y="614" textAnchor="middle" fill="#91a386" fontSize="11">通路方向（非实际出入口）</text></>}
          {visible.includes(hall) && booths.filter(b => b.hall === hall).map(b => marker(b, false))}
        </g>}
      </svg>
      <div className="map-zoom"><button aria-label="放大地图" onClick={() => changeZoom(.25)}><Plus size={17} /></button><span>{Math.round(zoom * 100)}%</span><button aria-label="缩小地图" onClick={() => changeZoom(-.25)}><Minus size={17} /></button><i /><button aria-label="重置地图视角" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><Crosshair size={17} /></button></div>
      <div className="map-footnote"><MousePointer2 size={12} />拖动平移 · 按钮缩放<span>拓扑示意，非官方导航图</span></div>
    </div>
    <div className="map-legend"><div className="legend-dots">{Object.entries(PRIORITIES).map(([key, p]) => <span key={key}><i style={{ background: p.color }} />{p.label}</span>)}<span><i className="outlined" />未定位摊位见右侧</span></div>{hall !== "all" && <div className="row"><input hidden ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={e => upload(e.target.files?.[0])} /><button className="text-button" disabled={busy} onClick={() => fileRef.current?.click()}><ImagePlus size={14} />{busy ? "处理图片…" : "上传馆内底图"}</button>{data.floorplans[hall] && <button className="icon-button" aria-label="恢复示意底图" onClick={() => { const floorplans = { ...data.floorplans }; delete floorplans[hall]; onData({ ...data, floorplans }); }}><RotateCcw size={14} /></button>}</div>}</div>
  </div>;
}
