import { z } from "zod";
export const HALLS = [
  { id: "east1", name: "东 1", en: "EAST 1", group: "east" },
  { id: "east2", name: "东 2", en: "EAST 2", group: "east" },
  { id: "east3", name: "东 3", en: "EAST 3", group: "east" },
  { id: "east7", name: "东 7", en: "EAST 7", group: "east" },
  { id: "west1", name: "西 1", en: "WEST 1", group: "west" },
  { id: "west2", name: "西 2", en: "WEST 2", group: "west" },
  { id: "south1", name: "南 1", en: "SOUTH 1", group: "south" },
  { id: "south2", name: "南 2", en: "SOUTH 2", group: "south" },
  { id: "west3", name: "西 3", en: "WEST 3", group: "west" },
  { id: "west4", name: "西 4", en: "WEST 4", group: "west" },
  { id: "south3", name: "南 3", en: "SOUTH 3", group: "south" },
  { id: "south4", name: "南 4", en: "SOUTH 4", group: "south" },
] as const;
export type HallId = (typeof HALLS)[number]["id"];
export const isCorporate = (hall: HallId) => ["west3", "west4", "south3", "south4"].includes(hall);
export const hallFloor = (hall: HallId) => isCorporate(hall) ? 4 : 1;
export const hallSchema = z.enum(["east1", "east2", "east3", "east7", "west1", "west2", "south1", "south2", "west3", "west4", "south3", "south4"]);
export const routePlanSchema = z.object({ start: z.enum(["eastEntry1", "westSouthEntry2", "entrance2", "galleria1", "atrium1", "southLobby2"]), transfer: z.enum(["west1-outdoor", "indoor"]).optional(), stops: z.array(z.string().max(160)).max(200).refine(ids => new Set(ids).size === ids.length, "路线不能包含重复目标"), enabled: z.boolean() }).strict();
export type RoutePlan = z.infer<typeof routePlanSchema>;
export const DAYS = [
  { id: 1, label: "DAY 1", date: "12.29", full: "2026-12-29", weekday: "周二" },
  { id: 2, label: "DAY 2", date: "12.30", full: "2026-12-30", weekday: "周三" },
  { id: 3, label: "DAY 3", date: "12.31", full: "2026-12-31", weekday: "周四" },
] as const;
export const PRIORITIES = {
  must: { label: "一定要去", color: "#ed7655", short: "S" },
  want: { label: "很想去", color: "#5c9a88", short: "A" },
  maybe: { label: "顺路看看", color: "#8b9eae", short: "B" },
} as const;
const quantity = z.number().int().min(0).max(9999);
const id = z.string().min(1).max(120);
const text = z.string().max(500);
const imageSchema = z.object({ id, name: z.string().max(200), src: z.string().max(9_000_000).refine(s => /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s) || s === "/demo-menu.svg", "图片格式不正确") }).strict();
const orderSchema = z.object({ id, recipientId: id, quantity, purchased: quantity }).strict().refine(o => o.purchased <= o.quantity, "已购数量不能大于计划数量");
export const itemSchema = z.object({
  id, name: z.string().min(1).max(120), kind: z.enum(["本子", "画集", "周边", "套组", "其他"]),
  price: z.number().int().min(0).max(100_000_000).nullable(), selfQuantity: quantity, selfPurchased: quantity, orders: z.array(orderSchema).max(200),
}).strict().refine(i => i.selfPurchased <= i.selfQuantity, "自购已购数量不能大于计划数量");
export const boothSchema = z.object({
  id, circle: z.string().min(1).max(120), artist: text, day: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  hall: hallSchema,
  block: z.string().max(8), space: z.string().max(5),
  fans: z.number().int().min(0).max(2_000_000_000).nullable(), priority: z.enum(["must", "want", "maybe"]), status: z.enum(["pending", "published"]), visit: z.enum(["planned", "visited", "soldout"]),
  x: z.number().min(0.025).max(0.975).nullable(), y: z.number().min(0.04).max(0.96).nullable(),
  mapVersion: z.literal("venue-2026-v1").optional(),
  xHandle: z.string().max(120), notes: z.string().max(4000), images: z.array(imageSchema).max(15), items: z.array(itemSchema).max(100),
}).strict().refine(b => (b.x === null) === (b.y === null), "地图坐标需要同时设置").refine(b => isCorporate(b.hall) ? /^\d{3,5}$/.test(b.space) : b.block.trim().length > 0 && /^\d{2}(?:a|b|ab)?$/.test(b.space), "同人摊位需区域与两位数字摊位号（如 ア / 24a）；企业馆需 3–5 位企业编号");
export const recipientSchema = z.object({ id, name: z.string().min(1).max(80), note: z.string().max(500) }).strict();
export const dataSchema = z.object({
  version: z.literal(1), demo: z.boolean(), updatedAt: z.string().datetime(), booths: z.array(boothSchema).max(2000), recipients: z.array(recipientSchema).max(200),
  floorplans: z.object({ east1: imageSchema.optional(), east2: imageSchema.optional(), east3: imageSchema.optional(), east7: imageSchema.optional(), west1: imageSchema.optional(), west2: imageSchema.optional(), south1: imageSchema.optional(), south2: imageSchema.optional(), west3: imageSchema.optional(), west4: imageSchema.optional(), south3: imageSchema.optional(), south4: imageSchema.optional() }).strict(),
  routePlans: z.object({ "1": routePlanSchema.optional(), "2": routePlanSchema.optional(), "3": routePlanSchema.optional() }).strict().optional(),
}).strict().superRefine((data, ctx) => {
  const ids = new Set<string>();
  const register = (value: string) => { if (ids.has(value)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "备份包含重复的记录 ID" }); ids.add(value); };
  data.recipients.forEach(r => register(r.id));
  if (new Set(data.recipients.map(r => r.name.trim().toLocaleLowerCase())).size !== data.recipients.length) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "代购对象名称重复" });
  const recipients = new Set(data.recipients.map(r => r.id));
  for (const b of data.booths) {
    register(b.id); b.images.forEach(i => register(i.id));
    for (const i of b.items) {
      register(i.id); const seen = new Set<string>();
      for (const o of i.orders) {
        register(o.id);
        if (!recipients.has(o.recipientId)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "代购记录引用了不存在的对象" });
        if (seen.has(o.recipientId)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "同一商品有重复的代购对象，请合并数量" }); seen.add(o.recipientId);
      }
    }
  }
  for (const day of ["1", "2", "3"] as const) {
    for (const target of data.routePlans?.[day]?.stops ?? []) {
      const valid = target.startsWith("hall:") ? HALLS.some(h => h.id === target.slice(5)) : target.startsWith("booth:") && data.booths.some(b => b.id === target.slice(6) && b.day === Number(day));
      if (!valid) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `DAY ${day} 路线包含失效或其他日期的目标` });
    }
  }
});
export type Booth = z.infer<typeof boothSchema>;
export type Item = z.infer<typeof itemSchema>;
export type Order = z.infer<typeof orderSchema>;
export type Recipient = z.infer<typeof recipientSchema>;
export type ImageAsset = z.infer<typeof imageSchema>;
export type AppData = z.infer<typeof dataSchema>;
export type View = "map" | "booths" | "shopping" | "recipients" | "roadmap";
export const uid = () => crypto.randomUUID();
export const yen = (value: number) => `¥${value.toLocaleString("ja-JP")}`;
export const hallName = (value: HallId) => HALLS.find(h => h.id === value)!.name;
export const address = (b: Booth) => isCorporate(b.hall) ? `${hallName(b.hall)} / 4F · 企業 ${b.space}` : `${hallName(b.hall)} · ${b.block}-${b.space}`;
export const fansLabel = (n: number | null) => n === null ? "粉丝数待补充" : `${n >= 10000 ? `${(n / 10000).toFixed(n % 10000 === 0 ? 0 : 1)}万` : n.toLocaleString()} 粉丝`;
export function itemTotal(item: Item) { return item.selfQuantity + item.orders.reduce((n, o) => n + o.quantity, 0); }
export function itemPurchased(item: Item) { return item.selfPurchased + item.orders.reduce((n, o) => n + o.purchased, 0); }
export function totals(booths: Booth[]) {
  return booths.flatMap(b => b.items).reduce((s, i) => ({ quantity: s.quantity + itemTotal(i), purchased: s.purchased + itemPurchased(i), proxy: s.proxy + i.orders.reduce((n, o) => n + o.quantity, 0), estimate: s.estimate + (i.price ?? 0) * itemTotal(i), spent: s.spent + (i.price ?? 0) * itemPurchased(i), unknown: s.unknown + (i.price === null ? itemTotal(i) : 0) }), { quantity: 0, purchased: 0, proxy: 0, estimate: 0, spent: 0, unknown: 0 });
}
export function emptyData(): AppData { return { version: 1, demo: false, updatedAt: new Date().toISOString(), booths: [], recipients: [], floorplans: {} }; }
export function newBooth(): Booth { return { id: uid(), circle: "", artist: "", day: 1, hall: "east1", block: "", space: "", fans: null, priority: "want", status: "pending", visit: "planned", x: null, y: null, xHandle: "", notes: "", images: [], items: [] }; }
export function newItem(): Item { return { id: uid(), name: "", kind: "本子", price: null, selfQuantity: 1, selfPurchased: 0, orders: [] }; }
export function csvText(rows: (string | number)[][]) { return "\uFEFF" + rows.map(row => row.map(cell => { const value = String(cell); return `"${(/^[\s]*[=+@-]/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`; }).join(",")).join("\r\n"); }
export function download(name: string, data: BlobPart, type: string) { const url = URL.createObjectURL(new Blob([data], { type })); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000); }
